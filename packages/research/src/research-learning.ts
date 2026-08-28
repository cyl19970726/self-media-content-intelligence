import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  ingestAnalysisRevisionSchema,
  researchConceptReadSchema,
  researchConceptRevisionSchema,
  researchConceptSchema,
  researchConditionSchema,
  researchDependentConclusionSchema,
  researchObservationSchema,
  researchSourceGateStateSchema,
  type IngestAnalysisRevision,
  type ResearchConcept,
  type ResearchConceptKind,
  type ResearchConceptRead,
  type ResearchConceptRevision,
  type ResearchConceptScope,
  type ResearchConceptStatus,
  type ResearchCondition,
  type ResearchDependentConclusion,
  type ResearchObservation
} from "../../contracts/index.js";

const emptyCondition: ResearchCondition = {
  tier: null,
  topic: null,
  format: null,
  era: null,
  audienceProblem: null,
  proofContext: null
};

export interface CreateResearchConceptInput {
  slug: string;
  kind: ResearchConceptKind;
  name: string;
  definition: string;
  exclusions: string[];
}

export interface RecordResearchObservationInput {
  conceptId: string;
  subjectType: "video" | "creator" | "comparison" | "practice_validation";
  subjectId: string;
  creatorId?: string | null;
  videoId?: string | null;
  relation: "confirm" | "qualify" | "contradict";
  condition?: Partial<ResearchCondition>;
  statement: string;
  evidenceRefs: string[];
  analysisRevisionId: string;
  confidence: "low" | "medium" | "high";
  sourceGateState: "ready" | "partial" | "not_ready" | "stale" | "invalid";
  deepReconstruction?: boolean;
  origin?: "external_research" | "first_party_practice";
}

export interface IngestAnalysisRevisionResult {
  analysisRevisionId: string;
  idempotent: boolean;
  sourceGateState: ResearchObservation["sourceGateState"];
  observations: ResearchObservation[];
}

export interface PromoteResearchConceptInput {
  targetScope: Exclude<ResearchConceptScope, "video_specific">;
  creatorId?: string;
  condition?: Partial<ResearchCondition>;
  comparableCreatorIds?: string[];
  decision: string;
}

interface Vote {
  observation: ResearchObservation;
  relation: ResearchObservation["relation"];
}

export interface PromotionEvaluation {
  ready: boolean;
  failures: string[];
  eligibleObservationIds: string[];
  excludedObservationIds: Array<{ id: string; reason: string }>;
  supportingVideos: number;
  supportingCreators: number;
  contradictionRate: number;
}

const persistedPromotionContextSchema = z.object({
  targetScope: z.enum(["creator_specific", "conditional", "track_wide"]),
  creatorId: z.string().optional(),
  condition: researchConditionSchema.partial().optional(),
  comparableCreatorIds: z.array(z.string()).optional(),
  decision: z.string()
});

export const researchLearningEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("concept_created"), concept: researchConceptSchema, revision: researchConceptRevisionSchema }),
  z.object({ type: z.literal("observation_recorded"), observation: researchObservationSchema }),
  z.object({
    type: z.literal("revision_appended"),
    concept: researchConceptSchema,
    revision: researchConceptRevisionSchema,
    promotionContext: persistedPromotionContextSchema.nullable()
  }),
  z.object({ type: z.literal("conclusion_registered"), conclusion: researchDependentConclusionSchema }),
  z.object({ type: z.literal("observation_invalidated"), observation: researchObservationSchema }),
  z.object({ type: z.literal("conclusion_updated"), conclusion: researchDependentConclusionSchema }),
  z.object({
    type: z.literal("analysis_ingested"),
    analysisRevisionId: z.string(),
    sourceGateState: researchSourceGateStateSchema,
    observationIds: z.array(z.string())
  })
]);

export type ResearchLearningEvent = z.infer<typeof researchLearningEventSchema>;

export interface ResearchLearningEventStore {
  append(event: ResearchLearningEvent): void;
  load(): ResearchLearningEvent[];
  transaction<T>(operation: () => T): T;
  close(): void;
}

function conditionFrom(value?: Partial<ResearchCondition>): ResearchCondition {
  return researchConditionSchema.parse({ ...emptyCondition, ...value });
}

function conditionIsEmpty(value: ResearchCondition): boolean {
  return Object.values(value).every((item) => item === null);
}

function matchesCondition(observation: ResearchObservation, condition: ResearchCondition): boolean {
  return (Object.keys(condition) as Array<keyof ResearchCondition>)
    .every((key) => condition[key] === null || observation.condition[key] === condition[key]);
}

function relationPriority(value: ResearchObservation["relation"]): number {
  if (value === "contradict") return 3;
  if (value === "qualify") return 2;
  return 1;
}

function deduplicateVideoVotes(observations: ResearchObservation[]): Vote[] {
  const votes = new Map<string, Vote>();
  for (const observation of observations) {
    if (observation.origin === "first_party_practice" || !observation.videoId || !observation.creatorId) continue;
    const key = `${observation.creatorId}:${observation.videoId}`;
    const existing = votes.get(key);
    if (!existing || relationPriority(observation.relation) > relationPriority(existing.relation)) {
      votes.set(key, { observation, relation: observation.relation });
    }
  }
  return [...votes.values()];
}

export function evaluateResearchPromotion(
  observations: ResearchObservation[],
  input: PromoteResearchConceptInput
): PromotionEvaluation {
  const condition = conditionFrom(input.condition);
  const eligible = observations.filter((item) => item.gateState === "eligible");
  const considered = eligible.filter((item) => matchesCondition(item, condition));
  const votes = deduplicateVideoVotes(considered);
  const support = votes.filter((vote) => vote.relation !== "contradict");
  const contradictions = votes.filter((vote) => vote.relation === "contradict");
  const contradictionRate = votes.length === 0 ? 0 : contradictions.length / votes.length;
  const failures: string[] = [];
  const allowedCreators = new Set(input.comparableCreatorIds ?? []);
  const scopedSupport = input.targetScope === "creator_specific"
    ? support.filter((vote) => vote.observation.creatorId === input.creatorId)
    : input.targetScope === "track_wide" && allowedCreators.size > 0
      ? support.filter((vote) => vote.observation.creatorId && allowedCreators.has(vote.observation.creatorId))
      : support;
  const scopedContradictions = input.targetScope === "creator_specific"
    ? contradictions.filter((vote) => vote.observation.creatorId === input.creatorId)
    : input.targetScope === "track_wide" && allowedCreators.size > 0
      ? contradictions.filter((vote) => vote.observation.creatorId && allowedCreators.has(vote.observation.creatorId))
      : contradictions;
  const scopedVotes = [...scopedSupport, ...scopedContradictions];
  const scopedContradictionRate = scopedVotes.length === 0 ? 0 : scopedContradictions.length / scopedVotes.length;
  const creatorIds = new Set(scopedSupport.map((vote) => vote.observation.creatorId).filter((value): value is string => Boolean(value)));
  const tierCount = new Set(scopedSupport.map((vote) => vote.observation.condition.tier).filter(Boolean)).size;

  if (input.targetScope === "creator_specific") {
    if (!input.creatorId) failures.push("creator-id-required");
    if (scopedSupport.length < 3) failures.push("creator-requires-3-distinct-supporting-videos");
    if (!scopedSupport.some((vote) => vote.observation.deepReconstruction)) failures.push("creator-requires-deep-reconstruction");
    if (tierCount < 2 && condition.tier === null) failures.push("creator-requires-2-tiers-or-explicit-tier-condition");
    if (scopedContradictions.length > 0) failures.push("creator-has-unqualified-contradiction");
  } else if (input.targetScope === "conditional") {
    if (conditionIsEmpty(condition)) failures.push("conditional-scope-requires-condition");
    const supportByCreator = new Map<string, Vote[]>();
    for (const vote of scopedSupport) {
      const creatorId = vote.observation.creatorId;
      if (!creatorId) continue;
      supportByCreator.set(creatorId, [...(supportByCreator.get(creatorId) ?? []), vote]);
    }
    const qualifiedCreators = [...supportByCreator.values()].filter((creatorVotes) =>
      creatorVotes.length >= 3 && creatorVotes.some((vote) => vote.observation.deepReconstruction)
    );
    if (qualifiedCreators.length < 2) failures.push("conditional-requires-2-creator-specific-evidence-sets");
    if (scopedSupport.length < 6) failures.push("conditional-requires-6-distinct-supporting-videos");
  } else {
    if (allowedCreators.size < 3) failures.push("track-wide-requires-3-comparable-creators");
    const supportByCreator = new Map<string, Vote[]>();
    for (const vote of scopedSupport) {
      const creatorId = vote.observation.creatorId;
      if (!creatorId) continue;
      supportByCreator.set(creatorId, [...(supportByCreator.get(creatorId) ?? []), vote]);
    }
    for (const creatorId of allowedCreators) {
      const creatorVotes = supportByCreator.get(creatorId) ?? [];
      if (creatorVotes.length < 3) failures.push(`track-wide-requires-3-videos:${creatorId}`);
      if (!creatorVotes.some((vote) => vote.observation.deepReconstruction)) failures.push(`track-wide-requires-deep-reconstruction:${creatorId}`);
    }
    if (scopedSupport.length < 9) failures.push("track-wide-requires-9-distinct-supporting-videos");
    if (tierCount < 2 && condition.tier === null) failures.push("track-wide-requires-2-tiers-or-explicit-tier-condition");
    if (scopedContradictionRate > 0.2) failures.push("track-wide-contradiction-rate-exceeds-20-percent");
  }

  const consideredIds = new Set(scopedVotes.map((vote) => vote.observation.id));
  const excludedObservationIds = observations
    .filter((item) => !consideredIds.has(item.id))
    .map((item) => ({
      id: item.id,
      reason: item.gateState !== "eligible" ? `gate:${item.gateState}`
        : !matchesCondition(item, condition) ? "outside-condition"
          : item.videoId ? "duplicate-video-vote" : "not-a-video-observation"
    }));

  return {
    ready: failures.length === 0,
    failures,
    eligibleObservationIds: scopedVotes.map((vote) => vote.observation.id),
    excludedObservationIds,
    supportingVideos: scopedSupport.length,
    supportingCreators: creatorIds.size,
    contradictionRate: input.targetScope === "track_wide" ? scopedContradictionRate : contradictionRate
  };
}

export class ResearchLearningService {
  private readonly concepts = new Map<string, ResearchConcept>();
  private readonly revisions = new Map<string, ResearchConceptRevision[]>();
  private readonly observations = new Map<string, ResearchObservation[]>();
  private readonly conclusions = new Map<string, ResearchDependentConclusion>();
  private readonly promotionContexts = new Map<string, PromoteResearchConceptInput>();
  private readonly ingestions = new Map<string, { sourceGateState: ResearchObservation["sourceGateState"]; observationIds: string[] }>();

  constructor(
    private readonly makeId: () => string = randomUUID,
    private readonly now: () => string = () => new Date().toISOString(),
    private readonly eventStore: ResearchLearningEventStore | null = null
  ) {
    for (const event of eventStore?.load() ?? []) this.replay(event);
  }

  createConcept(input: CreateResearchConceptInput): ResearchConceptRead {
    if ([...this.concepts.values()].some((item) => item.slug === input.slug && item.kind === input.kind)) {
      throw new Error(`ResearchConcept already exists: ${input.kind}/${input.slug}`);
    }
    const id = this.makeId();
    const revisionId = this.makeId();
    const createdAt = this.now();
    const revision = researchConceptRevisionSchema.parse({
      id: revisionId,
      conceptId: id,
      revision: 1,
      parentRevisionId: null,
      changeType: "create",
      definition: input.definition,
      exclusions: input.exclusions,
      condition: emptyCondition,
      decision: "Initial video-specific research concept",
      eligibleObservationIds: [],
      excludedObservationIds: [],
      scopeBefore: null,
      scopeAfter: "video_specific",
      statusAfter: "candidate",
      createdAt
    });
    const concept = researchConceptSchema.parse({
      id,
      slug: input.slug,
      kind: input.kind,
      name: input.name,
      scope: "video_specific",
      status: "candidate",
      currentRevisionId: revisionId,
      createdAt
    });
    this.eventStore?.append({ type: "concept_created", concept, revision });
    this.concepts.set(id, concept);
    this.revisions.set(id, [revision]);
    this.observations.set(id, []);
    return this.get(id)!;
  }

  recordObservation(input: RecordResearchObservationInput): ResearchObservation {
    const concept = this.requireConcept(input.conceptId);
    const gateState = input.sourceGateState === "ready" ? "eligible"
      : input.sourceGateState === "invalid" ? "invalid" : "quarantined";
    const observation = researchObservationSchema.parse({
      id: this.makeId(),
      conceptId: concept.id,
      conceptRevisionId: concept.currentRevisionId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      creatorId: input.creatorId ?? null,
      videoId: input.videoId ?? null,
      relation: input.relation,
      condition: conditionFrom(input.condition),
      statement: input.statement,
      evidenceRefs: input.evidenceRefs,
      analysisRevisionId: input.analysisRevisionId,
      confidence: input.confidence,
      sourceGateState: input.sourceGateState,
      gateState,
      deepReconstruction: input.deepReconstruction ?? false,
      origin: input.origin ?? "external_research",
      createdAt: this.now()
    });
    this.eventStore?.append({ type: "observation_recorded", observation });
    this.observations.get(concept.id)!.push(observation);
    if (observation.gateState === "eligible" && observation.relation === "contradict") {
      this.applyContradictionIfThresholdFails(concept.id);
    }
    return observation;
  }

  promote(conceptId: string, input: PromoteResearchConceptInput): ResearchConceptRead {
    const concept = this.requireConcept(conceptId);
    if (concept.status === "invalidated" || concept.status === "retired") throw new Error(`Cannot promote ${concept.status} concept`);
    const evaluation = evaluateResearchPromotion(this.observations.get(conceptId) ?? [], input);
    if (!evaluation.ready) throw new Error(`Promotion gate failed: ${evaluation.failures.join(", ")}`);
    const status: ResearchConceptStatus = input.targetScope === "conditional" ? "qualified" : "active";
    this.appendRevision(concept, {
      changeType: "promote",
      scopeAfter: input.targetScope,
      statusAfter: status,
      condition: conditionFrom(input.condition),
      decision: input.decision,
      eligibleObservationIds: evaluation.eligibleObservationIds,
      excludedObservationIds: evaluation.excludedObservationIds,
      promotionContext: input
    });
    return this.get(conceptId)!;
  }

  ingestAnalysisRevision(rawInput: IngestAnalysisRevision): IngestAnalysisRevisionResult {
    const input = ingestAnalysisRevisionSchema.parse(rawInput);
    const previous = this.ingestions.get(input.analysisRevisionId);
    if (previous) {
      return {
        analysisRevisionId: input.analysisRevisionId,
        idempotent: true,
        sourceGateState: previous.sourceGateState,
        observations: this.observationsByIds(previous.observationIds)
      };
    }

    const ingest = () => this.ingestNewAnalysisRevision(input);
    return this.eventStore ? this.eventStore.transaction(ingest) : ingest();
  }

  private ingestNewAnalysisRevision(input: IngestAnalysisRevision): IngestAnalysisRevisionResult {

    const sourceGateState = this.sourceGateStateFor(input);
    const observations: ResearchObservation[] = [];
    for (const candidate of input.observations) {
      let conceptId = candidate.conceptId;
      if (!conceptId && candidate.concept) {
        const existing = [...this.concepts.values()].find((concept) =>
          concept.slug === candidate.concept!.slug && concept.kind === candidate.concept!.kind
        );
        conceptId = existing?.id ?? this.createConcept(candidate.concept).concept.id;
      }
      if (!conceptId) throw new Error("Analysis observation did not resolve a ResearchConcept");
      observations.push(this.recordObservation({
        conceptId,
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        creatorId: input.creatorId,
        videoId: input.videoId,
        relation: candidate.relation,
        condition: candidate.condition,
        statement: candidate.statement,
        evidenceRefs: candidate.evidenceRefs,
        analysisRevisionId: input.analysisRevisionId,
        confidence: candidate.confidence,
        sourceGateState,
        deepReconstruction: input.deepReconstruction
      }));
    }
    const ingestion = {
      sourceGateState,
      observationIds: observations.map((observation) => observation.id)
    };
    this.eventStore?.append({
      type: "analysis_ingested",
      analysisRevisionId: input.analysisRevisionId,
      ...ingestion
    });
    this.ingestions.set(input.analysisRevisionId, ingestion);
    return { analysisRevisionId: input.analysisRevisionId, idempotent: false, sourceGateState, observations };
  }

  registerDependentConclusion(input: Omit<ResearchDependentConclusion, "status" | "staleReason">): ResearchDependentConclusion {
    for (const conceptId of input.conceptIds) this.requireConcept(conceptId);
    const conclusion = researchDependentConclusionSchema.parse({ ...input, status: "current", staleReason: null });
    this.eventStore?.append({ type: "conclusion_registered", conclusion });
    this.conclusions.set(conclusion.id, conclusion);
    return conclusion;
  }

  invalidateAnalysisRevision(analysisRevisionId: string, reason: string): ResearchConceptRead[] {
    const affected: ResearchConceptRead[] = [];
    for (const [conceptId, observations] of this.observations) {
      let changed = false;
      for (let index = 0; index < observations.length; index += 1) {
        const observation = observations[index]!;
        if (observation.analysisRevisionId !== analysisRevisionId || observation.gateState === "invalid") continue;
        const invalidated = researchObservationSchema.parse({ ...observation, sourceGateState: "invalid", gateState: "invalid" });
        this.eventStore?.append({ type: "observation_invalidated", observation: invalidated });
        observations[index] = invalidated;
        changed = true;
      }
      if (!changed) continue;
      const concept = this.requireConcept(conceptId);
      const votes = deduplicateVideoVotes(observations.filter((item) => item.gateState === "eligible"));
      const support = votes.filter((vote) => vote.relation !== "contradict");
      if (support.length === 0) this.invalidateConcept(conceptId, reason);
      else if (concept.scope !== "video_specific") this.reevaluateAfterEvidenceLoss(concept, reason, support);
      affected.push(this.get(conceptId)!);
    }
    return affected;
  }

  invalidateConcept(conceptId: string, reason: string): ResearchConceptRead {
    const concept = this.requireConcept(conceptId);
    if (concept.status !== "invalidated") {
      const eligible = (this.observations.get(conceptId) ?? []).filter((item) => item.gateState === "eligible");
      this.appendRevision(concept, {
        changeType: "invalidate",
        scopeAfter: concept.scope,
        statusAfter: "invalidated",
        condition: this.currentRevision(conceptId).condition,
        decision: reason,
        eligibleObservationIds: eligible.map((item) => item.id),
        excludedObservationIds: [],
        promotionContext: null
      });
    }
    this.promotionContexts.delete(conceptId);
    this.staleDependentConclusions(conceptId, reason);
    return this.get(conceptId)!;
  }

  list(): ResearchConceptRead[] {
    return [...this.concepts.keys()].map((id) => this.get(id)!);
  }

  close(): void {
    this.eventStore?.close();
  }

  get(id: string): ResearchConceptRead | null {
    const concept = this.concepts.get(id);
    if (!concept) return null;
    const observations = this.observations.get(id) ?? [];
    const eligibleVotes = deduplicateVideoVotes(observations.filter((item) => item.gateState === "eligible"));
    return researchConceptReadSchema.parse({
      concept,
      currentRevision: this.currentRevision(id),
      revisions: this.revisions.get(id) ?? [],
      observations,
      counts: {
        confirm: eligibleVotes.filter((item) => item.relation === "confirm").length,
        qualify: eligibleVotes.filter((item) => item.relation === "qualify").length,
        contradict: eligibleVotes.filter((item) => item.relation === "contradict").length,
        quarantined: observations.filter((item) => item.gateState === "quarantined").length,
        invalid: observations.filter((item) => item.gateState === "invalid").length,
        distinctEligibleVideos: eligibleVotes.length,
        distinctEligibleCreators: new Set(eligibleVotes.map((item) => item.observation.creatorId).filter(Boolean)).size
      },
      dependentConclusions: [...this.conclusions.values()].filter((item) => item.conceptIds.includes(id))
    });
  }

  private requireConcept(id: string): ResearchConcept {
    const concept = this.concepts.get(id);
    if (!concept) throw new Error(`ResearchConcept not found: ${id}`);
    return concept;
  }

  private currentRevision(conceptId: string): ResearchConceptRevision {
    const revision = this.revisions.get(conceptId)?.at(-1);
    if (!revision) throw new Error(`ResearchConcept revision not found: ${conceptId}`);
    return revision;
  }

  private appendRevision(concept: ResearchConcept, input: {
    changeType: ResearchConceptRevision["changeType"];
    scopeAfter: ResearchConceptScope;
    statusAfter: ResearchConceptStatus;
    condition: ResearchCondition;
    decision: string;
    eligibleObservationIds: string[];
    excludedObservationIds: Array<{ id: string; reason: string }>;
    promotionContext?: PromoteResearchConceptInput | null;
  }): void {
    const previous = this.currentRevision(concept.id);
    const revision = researchConceptRevisionSchema.parse({
      id: this.makeId(),
      conceptId: concept.id,
      revision: previous.revision + 1,
      parentRevisionId: previous.id,
      changeType: input.changeType,
      definition: previous.definition,
      exclusions: previous.exclusions,
      condition: input.condition,
      decision: input.decision,
      eligibleObservationIds: input.eligibleObservationIds,
      excludedObservationIds: input.excludedObservationIds,
      scopeBefore: concept.scope,
      scopeAfter: input.scopeAfter,
      statusAfter: input.statusAfter,
      createdAt: this.now()
    });
    const nextConcept = researchConceptSchema.parse({
      ...concept,
      scope: input.scopeAfter,
      status: input.statusAfter,
      currentRevisionId: revision.id
    });
    const promotionContext = input.promotionContext === undefined
      ? this.promotionContexts.get(concept.id) ?? null
      : input.promotionContext;
    const normalizedContext = promotionContext ? {
      ...promotionContext,
      condition: conditionFrom(promotionContext.condition),
      comparableCreatorIds: promotionContext.comparableCreatorIds ? [...promotionContext.comparableCreatorIds] : undefined
    } : null;
    this.eventStore?.append({ type: "revision_appended", concept: nextConcept, revision, promotionContext: normalizedContext });
    this.revisions.get(concept.id)!.push(revision);
    this.concepts.set(concept.id, nextConcept);
    if (normalizedContext) this.promotionContexts.set(concept.id, normalizedContext);
    else this.promotionContexts.delete(concept.id);
  }

  private demoteAfterEvidenceLoss(concept: ResearchConcept, reason: string, support: Vote[]): void {
    this.appendRevision(concept, {
      changeType: "demote",
      scopeAfter: "video_specific",
      statusAfter: "candidate",
      condition: emptyCondition,
      decision: reason,
      eligibleObservationIds: support.map((item) => item.observation.id),
      excludedObservationIds: [],
      promotionContext: null
    });
    this.staleDependentConclusions(concept.id, reason);
  }

  private reevaluateAfterEvidenceLoss(concept: ResearchConcept, reason: string, support: Vote[]): void {
    const context = this.promotionContexts.get(concept.id);
    if (!context) {
      this.demoteAfterEvidenceLoss(concept, `${reason}; missing stored promotion context`, support);
      return;
    }
    const evaluation = evaluateResearchPromotion(this.observations.get(concept.id) ?? [], context);
    if (!evaluation.ready) {
      this.demoteAfterEvidenceLoss(concept, `${reason}; ${evaluation.failures.join(", ")}`, support);
      return;
    }
    this.appendRevision(concept, {
      changeType: "confirm",
      scopeAfter: concept.scope,
      statusAfter: concept.status,
      condition: conditionFrom(context.condition),
      decision: `${reason}; promotion threshold remains satisfied after re-evaluation`,
      eligibleObservationIds: evaluation.eligibleObservationIds,
      excludedObservationIds: evaluation.excludedObservationIds
    });
  }

  private applyContradictionIfThresholdFails(conceptId: string): void {
    const concept = this.requireConcept(conceptId);
    const context = this.promotionContexts.get(conceptId);
    if (!context || concept.scope === "video_specific" || concept.status === "contradicted") return;
    const evaluation = evaluateResearchPromotion(this.observations.get(conceptId) ?? [], context);
    const contradictionFailure = evaluation.failures.some((failure) =>
      failure === "creator-has-unqualified-contradiction"
      || failure === "track-wide-contradiction-rate-exceeds-20-percent"
    );
    if (!contradictionFailure) return;
    this.appendRevision(concept, {
      changeType: "contradict",
      scopeAfter: concept.scope,
      statusAfter: "contradicted",
      condition: conditionFrom(context.condition),
      decision: evaluation.failures.join(", "),
      eligibleObservationIds: evaluation.eligibleObservationIds,
      excludedObservationIds: evaluation.excludedObservationIds
    });
    this.staleDependentConclusions(conceptId, "New eligible contradiction exceeded the current scope threshold");
  }

  private staleDependentConclusions(conceptId: string, reason: string): void {
    for (const [id, conclusion] of this.conclusions) {
      if (!conclusion.conceptIds.includes(conceptId) || conclusion.status !== "current") continue;
      const updated = researchDependentConclusionSchema.parse({
        ...conclusion,
        status: "stale_available",
        staleReason: reason
      });
      this.eventStore?.append({ type: "conclusion_updated", conclusion: updated });
      this.conclusions.set(id, updated);
    }
  }

  private sourceGateStateFor(input: IngestAnalysisRevision): ResearchObservation["sourceGateState"] {
    const states = Object.values(input.lensGates);
    if (states.includes("invalid")) return "invalid";
    if (states.includes("stale")) return "stale";
    if (states.includes("partial")) return "partial";
    return "ready";
  }

  private observationsByIds(ids: string[]): ResearchObservation[] {
    const wanted = new Set(ids);
    return [...this.observations.values()].flat().filter((observation) => wanted.has(observation.id));
  }

  private replay(event: ResearchLearningEvent): void {
    if (event.type === "concept_created") {
      this.concepts.set(event.concept.id, event.concept);
      this.revisions.set(event.concept.id, [event.revision]);
      this.observations.set(event.concept.id, []);
      return;
    }
    if (event.type === "observation_recorded") {
      const observations = this.observations.get(event.observation.conceptId);
      if (!observations) throw new Error(`Durable observation references missing concept: ${event.observation.conceptId}`);
      observations.push(event.observation);
      return;
    }
    if (event.type === "revision_appended") {
      const revisions = this.revisions.get(event.concept.id);
      if (!revisions) throw new Error(`Durable revision references missing concept: ${event.concept.id}`);
      revisions.push(event.revision);
      this.concepts.set(event.concept.id, event.concept);
      if (event.promotionContext) this.promotionContexts.set(event.concept.id, event.promotionContext);
      else this.promotionContexts.delete(event.concept.id);
      return;
    }
    if (event.type === "conclusion_registered" || event.type === "conclusion_updated") {
      this.conclusions.set(event.conclusion.id, event.conclusion);
      return;
    }
    if (event.type === "observation_invalidated") {
      const observations = this.observations.get(event.observation.conceptId);
      const index = observations?.findIndex((observation) => observation.id === event.observation.id) ?? -1;
      if (!observations || index < 0) throw new Error(`Durable invalidation references missing observation: ${event.observation.id}`);
      observations[index] = event.observation;
      return;
    }
    this.ingestions.set(event.analysisRevisionId, {
      sourceGateState: event.sourceGateState,
      observationIds: event.observationIds
    });
  }
}
