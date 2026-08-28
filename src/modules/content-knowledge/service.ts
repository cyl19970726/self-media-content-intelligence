import { createHash, randomUUID } from "node:crypto";
import type { ResearchLearningService } from "../../server/research-learning.js";
import {
  adjudicateSemanticEdgeInputSchema, compileKnowledgeInputSchema, createHypothesisInputSchema,
  createKnowledgeBindingInputSchema, createPracticeValidationInputSchema,
  knowledgeConceptViewSchema, practiceValidationSchema, submitPracticeValidationInputSchema,
  type CompileKnowledgeInput, type CreationHypothesis, type KnowledgeBinding,
  type KnowledgeConceptView, type KnowledgeContribution, type KnowledgeContributionManifest,
  type KnowledgeGap, type PracticeValidation, type SemanticEdge
} from "./contracts.js";
import type { ContentKnowledgeRepository } from "./repository.js";

function commandHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function maturityFor(scope: KnowledgeConceptView["research"]["concept"]["scope"]): KnowledgeConceptView["maturity"] {
  if (scope === "creator_specific") return "creator_pattern";
  if (scope === "conditional") return "conditional_pattern";
  if (scope === "track_wide") return "track_wide_pattern";
  return "single_post_observation";
}

export class ContentKnowledgeService {
  constructor(
    private readonly repository: ContentKnowledgeRepository,
    private readonly research: ResearchLearningService,
    private readonly makeId: () => string = randomUUID,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  listKnowledge(filters: { query?: string; scope?: string; status?: string } = {}): KnowledgeConceptView[] {
    const query = filters.query?.trim().toLocaleLowerCase();
    return this.research.list().filter((item) =>
      (!filters.scope || item.concept.scope === filters.scope)
      && (!filters.status || item.concept.status === filters.status)
      && (!query || `${item.concept.name} ${item.currentRevision.definition} ${item.currentRevision.exclusions.join(" ")}`.toLocaleLowerCase().includes(query))
    ).map((research) => knowledgeConceptViewSchema.parse({
      maturity: maturityFor(research.concept.scope), research,
      edges: this.repository.listEdges(research.concept.id),
      bindings: this.repository.listBindings(undefined, research.currentRevision.id)
    }));
  }

  getKnowledge(conceptId: string): KnowledgeConceptView | null {
    const research = this.research.get(conceptId);
    return research ? knowledgeConceptViewSchema.parse({
      maturity: maturityFor(research.concept.scope), research,
      edges: this.repository.listEdges(conceptId),
      bindings: this.repository.listBindings(undefined, research.currentRevision.id)
    }) : null;
  }

  compile(raw: CompileKnowledgeInput): { manifest: KnowledgeContributionManifest; contributions: KnowledgeContribution[]; idempotent: boolean } {
    const input = compileKnowledgeInputSchema.parse(raw);
    const prior = this.repository.getManifestByAnalysis(input.analysis.analysisRevisionId, input.compilerPolicyVersion);
    if (prior) return { manifest: prior, contributions: this.repository.listContributions(prior.id), idempotent: true };
    const ingested = this.research.ingestAnalysisRevision(input.analysis);
    const manifestId = this.makeId();
    const contributions: KnowledgeContribution[] = ingested.observations.map((observation, index) => ({
      id: this.makeId(), manifestId,
      disposition: observation.gateState === "eligible" ? observation.relation : "quarantined",
      targetConceptId: observation.conceptId,
      createdConceptId: index < input.analysis.observations.length && input.analysis.observations[index]?.concept ? observation.conceptId : null,
      observationId: observation.id,
      candidateStatement: observation.statement,
      evidenceRefs: observation.evidenceRefs,
      decisionReason: observation.gateState === "eligible" ? "Passed research evidence gates" : `Evidence gate: ${observation.gateState}`
    }));
    const quarantineReasons = ingested.observations.filter((item) => item.gateState !== "eligible")
      .map((item) => `${item.id}:${item.gateState}`);
    const manifest: KnowledgeContributionManifest = {
      id: manifestId,
      subjectType: input.analysis.subjectType,
      subjectId: input.analysis.subjectId,
      analysisRevisionId: input.analysis.analysisRevisionId,
      compilerPolicyVersion: input.compilerPolicyVersion,
      inputFingerprint: input.inputFingerprint,
      status: contributions.length === 0 ? "accepted_no_new_knowledge"
        : contributions.every((item) => item.disposition === "quarantined") ? "quarantined" : "accepted",
      contributionIds: contributions.map((item) => item.id),
      quarantineReasons,
      createdAt: this.now(),
      decidedAt: this.now()
    };
    const saved = this.repository.saveManifest(manifest, contributions, input.operationKey, commandHash(input));
    return { manifest: saved, contributions, idempotent: ingested.idempotent };
  }

  listContributions(subjectType?: string, subjectId?: string, analysisRevisionId?: string) {
    const manifests = this.repository.listManifests(subjectType, subjectId)
      .filter((item) => !analysisRevisionId || item.analysisRevisionId === analysisRevisionId);
    return manifests.map((manifest) => ({ manifest, contributions: this.repository.listContributions(manifest.id) }));
  }

  adjudicateEdge(raw: unknown): SemanticEdge {
    const input = adjudicateSemanticEdgeInputSchema.parse(raw);
    const source = this.research.get(input.sourceConceptId);
    const target = this.research.get(input.targetConceptId);
    if (!source || !target) throw new Error("knowledge concept not found");
    if (source.currentRevision.id !== input.sourceRevisionId || target.currentRevision.id !== input.targetRevisionId) {
      throw new Error("semantic edge must pin current concept revisions");
    }
    if (input.sourceConceptId === input.targetConceptId) throw new Error("semantic edge cannot be self-referential");
    const edge: SemanticEdge = { ...input, id: this.makeId(), createdAt: this.now() };
    return this.repository.saveEdge(edge, input.operationKey, commandHash(input));
  }

  createBinding(raw: unknown): KnowledgeBinding {
    const input = createKnowledgeBindingInputSchema.parse(raw);
    if (input.targetType === "concept_revision") {
      const exists = this.research.list().some((item) => item.revisions.some((revision) => revision.id === input.targetId));
      if (!exists) throw new Error("concept revision not found");
    }
    const binding: KnowledgeBinding = { ...input, id: this.makeId(), status: "current", createdAt: this.now() };
    return this.repository.saveBinding(binding, input.operationKey, commandHash(input));
  }

  listBindings(packageId: string): KnowledgeBinding[] { return this.repository.listBindings(packageId); }

  createHypothesis(raw: unknown): CreationHypothesis {
    const input = createHypothesisInputSchema.parse(raw);
    const bindings = new Set(this.repository.listBindings(input.contentPackageId).map((item) => item.id));
    if (input.linkedBindingIds.some((id) => !bindings.has(id))) throw new Error("hypothesis contains unresolved binding");
    const hypothesis: CreationHypothesis = { ...input, id: this.makeId(), createdAt: this.now() };
    return this.repository.saveHypothesis(hypothesis, input.operationKey, commandHash(input));
  }

  listHypotheses(packageId: string): CreationHypothesis[] { return this.repository.listHypotheses(packageId); }

  createValidation(raw: unknown): PracticeValidation {
    const input = createPracticeValidationInputSchema.parse(raw);
    const hypothesis = this.repository.getHypothesis(input.hypothesisId);
    if (!hypothesis || hypothesis.contentPackageId !== input.contentPackageId) throw new Error("hypothesis not found for package");
    const timestamp = this.now();
    const validation = practiceValidationSchema.parse({
      ...input, id: this.makeId(), status: input.observedSignals.length > 0 ? "evidence_ready" : "draft",
      proposedRelation: null, targetConceptId: null, decisionReason: null, promotedObservationId: null,
      createdAt: timestamp, updatedAt: timestamp
    });
    return this.repository.saveValidation(validation, input.operationKey, commandHash(input));
  }

  submitValidation(id: string, raw: unknown): PracticeValidation {
    const input = submitPracticeValidationInputSchema.parse(raw);
    const current = this.repository.getValidation(id);
    if (!current) throw new Error("practice validation not found");
    if (current.status !== "evidence_ready") throw new Error("practice validation is not evidence ready");
    if (input.proposedRelation !== "inconclusive" && !input.targetConceptId) throw new Error("conclusive validation requires target concept");
    if (input.targetConceptId && !this.research.get(input.targetConceptId)) throw new Error("target concept not found");
    const next = practiceValidationSchema.parse({
      ...current, status: "adjudication_pending", proposedRelation: input.proposedRelation,
      targetConceptId: input.targetConceptId, decisionReason: input.decisionReason, updatedAt: this.now()
    });
    return this.repository.saveValidation(next, input.operationKey, commandHash({ id, ...input }));
  }

  adjudicateValidation(id: string, raw: { operationKey: string; promote: boolean; reason: string }): PracticeValidation {
    const current = this.repository.getValidation(id);
    if (!current) throw new Error("practice validation not found");
    if (current.status !== "adjudication_pending") throw new Error("practice validation is not pending adjudication");
    let promotedObservationId: string | null = null;
    if (raw.promote) {
      if (!current.targetConceptId || !current.proposedRelation || current.proposedRelation === "inconclusive") {
        throw new Error("eligible first-party promotion requires a target concept and conclusive relation");
      }
      if (current.observedSignals.length === 0) throw new Error("eligible first-party promotion requires observed signals");
      const observation = this.research.recordObservation({
        conceptId: current.targetConceptId,
        subjectType: "practice_validation",
        subjectId: current.id,
        creatorId: null,
        videoId: null,
        relation: current.proposedRelation,
        statement: current.decisionReason ?? raw.reason,
        evidenceRefs: current.observedSignals.map((signal) => `practice:${current.id}:${signal.name}:${signal.source}:${signal.collectedAt}`),
        analysisRevisionId: `practice-validation:${current.id}`,
        confidence: "medium",
        sourceGateState: "ready",
        deepReconstruction: false,
        origin: "first_party_practice"
      });
      promotedObservationId = observation.id;
    }
    const next = practiceValidationSchema.parse({
      ...current, status: raw.promote ? "promoted" : "completed_no_promotion", decisionReason: raw.reason,
      promotedObservationId, updatedAt: this.now()
    });
    return this.repository.saveValidation(next, raw.operationKey, commandHash({ id, ...raw }));
  }

  getValidation(id: string): PracticeValidation | null { return this.repository.getValidation(id); }
  listValidations(runId?: string): PracticeValidation[] { return this.repository.listValidations(runId); }

  gaps(): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    for (const view of this.listKnowledge()) {
      if (view.research.currentRevision.exclusions.length === 0) gaps.push({ code: "missing-exclusions", severity: "attention", conceptId: view.research.concept.id, message: "概念缺少明确排除项" });
      if (view.research.counts.contradict > 0 && view.research.concept.status === "active") gaps.push({ code: "unresolved-contradiction", severity: "attention", conceptId: view.research.concept.id, message: "活跃概念存在尚未解决的反例" });
      if (view.research.observations.length === 0) gaps.push({ code: "orphan-concept", severity: "info", conceptId: view.research.concept.id, message: "概念尚无观察证据" });
    }
    return gaps;
  }

  close(): void { this.repository.close(); }
}
