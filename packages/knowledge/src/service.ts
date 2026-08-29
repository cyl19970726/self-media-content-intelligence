import { createHash, randomUUID } from "node:crypto";
import type { KnowledgeResearchPort } from "./ports.js";
import {
  adjudicatePracticeValidationInputSchema, adjudicateSemanticEdgeInputSchema, compileKnowledgeInputSchema, createHypothesisInputSchema,
  createKnowledgeBindingInputSchema, createPracticeValidationInputSchema,
  knowledgeConceptViewSchema, legacyKnowledgeManifestInputSchema, practiceValidationSchema, submitPracticeValidationInputSchema,
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
    private readonly research: KnowledgeResearchPort,
    private readonly makeId: () => string = randomUUID,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  listKnowledge(filters: { query?: string; scope?: string; status?: string } = {}): KnowledgeConceptView[] {
    const query = filters.query?.trim().toLocaleLowerCase();
    const concepts = this.research.list();
    this.repository.syncConceptProjection(concepts);
    const matches = query ? new Set(this.repository.searchConceptIds(query)) : null;
    return concepts.filter((item) =>
      (!filters.scope || item.concept.scope === filters.scope)
      && (!filters.status || item.concept.status === filters.status)
      && (!matches || matches.has(item.concept.id))
    ).map((research) => knowledgeConceptViewSchema.parse({
      maturity: maturityFor(research.concept.scope), research,
      edges: this.repository.listEdges(research.concept.id).map((edge) => this.resolveEdgeStatus(edge)),
      bindings: this.repository.listBindings(undefined, research.currentRevision.id).map((binding) => this.resolveBindingStatus(binding)),
      contributions: this.contributionsForConcept(research.concept.id)
    }));
  }

  getKnowledge(conceptId: string): KnowledgeConceptView | null {
    const research = this.research.get(conceptId);
    return research ? knowledgeConceptViewSchema.parse({
      maturity: maturityFor(research.concept.scope), research,
      edges: this.repository.listEdges(conceptId).map((edge) => this.resolveEdgeStatus(edge)),
      bindings: this.repository.listBindings(undefined, research.currentRevision.id).map((binding) => this.resolveBindingStatus(binding)),
      contributions: this.contributionsForConcept(conceptId)
    }) : null;
  }

  compile(raw: CompileKnowledgeInput): { manifest: KnowledgeContributionManifest; contributions: KnowledgeContribution[]; idempotent: boolean } {
    const input = compileKnowledgeInputSchema.parse(raw);
    const prior = this.repository.getManifestByAnalysis(input.analysis.analysisRevisionId, input.compilerPolicyVersion);
    if (prior) return { manifest: prior, contributions: this.repository.listContributions(prior.id), idempotent: true };
    const unavailableEvidence = input.evidenceGate.filter((item) => item.availability !== "available");
    const existingConcepts = this.research.list();
    const novelObservations = input.analysis.observations.filter((candidate) => {
      const target = candidate.conceptId
        ? existingConcepts.find((item) => item.concept.id === candidate.conceptId)
        : existingConcepts.find((item) => item.concept.slug === candidate.concept?.slug && item.concept.kind === candidate.concept?.kind);
      return !target?.observations.some((item) => item.relation === candidate.relation && item.statement.trim() === candidate.statement.trim());
    });
    const evidenceInvalid = unavailableEvidence.some((item) => item.availability === "integrity_failed");
    const analysis = {
      ...input.analysis,
      observations: novelObservations,
      lensGates: unavailableEvidence.length === 0 ? input.analysis.lensGates : {
        contentRestoration: evidenceInvalid ? "invalid" as const : "partial" as const,
        directingLogic: evidenceInvalid ? "invalid" as const : "partial" as const,
        visualEditingLogic: evidenceInvalid ? "invalid" as const : "partial" as const
      }
    };
    try { return this.repository.transaction(() => {
    const ingested = this.research.ingestAnalysisRevision(analysis);
    const manifestId = this.makeId();
    const contributions: KnowledgeContribution[] = ingested.observations.map((observation, index) => ({
      id: this.makeId(), manifestId,
      disposition: observation.gateState === "eligible" ? observation.relation : "quarantined",
      targetConceptId: observation.conceptId,
      createdConceptId: index < analysis.observations.length && analysis.observations[index]?.concept ? observation.conceptId : null,
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
      quarantineReasons: [...unavailableEvidence.map((item) => `evidence:${item.availability}:${item.ref}`), ...quarantineReasons],
      createdAt: this.now(),
      decidedAt: this.now()
    };
    const saved = this.repository.saveManifest(manifest, contributions, input.operationKey, commandHash(input));
    this.repository.syncConceptProjection(this.research.list());
    return { manifest: saved, contributions, idempotent: ingested.idempotent };
    }); } catch (error) {
      this.research.reload?.();
      throw error;
    }
  }

  rebuildProjections() {
    const parity = this.repository.rebuildProjections();
    this.repository.syncConceptProjection(this.research.list());
    return parity;
  }

  projectionParity() { return this.repository.projectionParity(); }

  syncProjection(): void { this.repository.syncConceptProjection(this.research.list()); }

  listContributions(subjectType?: string, subjectId?: string, analysisRevisionId?: string) {
    const manifests = this.repository.listManifests(subjectType, subjectId)
      .filter((item) => !analysisRevisionId || item.analysisRevisionId === analysisRevisionId);
    return manifests.map((manifest) => ({ manifest, contributions: this.repository.listContributions(manifest.id) }));
  }

  recordLegacyUnverified(raw: unknown): KnowledgeContributionManifest {
    const input = legacyKnowledgeManifestInputSchema.parse(raw);
    const prior = this.repository.getManifestByAnalysis(input.analysisRevisionId, "legacy-import-v1");
    if (prior) return prior;
    const timestamp = this.now();
    const manifest: KnowledgeContributionManifest = {
      id: this.makeId(), subjectType: input.subjectType, subjectId: input.subjectId,
      analysisRevisionId: input.analysisRevisionId, compilerPolicyVersion: "legacy-import-v1",
      inputFingerprint: input.inputFingerprint, status: "legacy_unverified", contributionIds: [],
      quarantineReasons: [`legacy_unverified:${input.reason}`], createdAt: timestamp, decidedAt: timestamp
    };
    return this.repository.saveManifest(manifest, [], input.operationKey, commandHash(input));
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
    let status: KnowledgeBinding["status"] = "current";
    if (input.targetType === "concept_revision") {
      const owner = this.research.list().find((item) => item.revisions.some((revision) => revision.id === input.targetId));
      if (!owner) throw new Error("concept revision not found");
      if (["invalidated", "retired"].includes(owner.concept.status)) throw new Error("concept revision cannot be bound because its concept is inactive");
      status = owner.currentRevision.id === input.targetId ? "current" : "stale_available";
    } else if (input.targetType === "analysis_revision") {
      const exists = this.repository.listManifests().some((manifest) => manifest.analysisRevisionId === input.targetId && manifest.status !== "invalidated");
      if (!exists) throw new Error("analysis revision not found or inactive");
    } else {
      const exists = this.repository.listManifests().some((manifest) =>
        this.repository.listContributions(manifest.id).some((contribution) => contribution.evidenceRefs.includes(input.targetId))
      );
      if (!exists) throw new Error("evidence reference not found in accepted knowledge lineage");
    }
    const binding: KnowledgeBinding = { ...input, id: this.makeId(), status, createdAt: this.now() };
    return this.repository.saveBinding(binding, input.operationKey, commandHash(input));
  }

  listBindings(packageId: string): KnowledgeBinding[] {
    return this.repository.listBindings(packageId).map((binding) => this.resolveBindingStatus(binding));
  }

  createHypothesis(raw: unknown): CreationHypothesis {
    const input = createHypothesisInputSchema.parse(raw);
    const bindings = new Map(this.repository.listBindings(input.contentPackageId).map((item) => [item.id, item]));
    if (input.linkedBindingIds.some((id) => !bindings.has(id))) throw new Error("hypothesis contains unresolved binding");
    if (input.linkedBindingIds.some((id) => bindings.get(id)?.contentPackageSnapshotId !== input.contentPackageSnapshotId)) {
      throw new Error("hypothesis contains a binding from another content package snapshot");
    }
    const hypothesis: CreationHypothesis = { ...input, id: this.makeId(), createdAt: this.now() };
    return this.repository.saveHypothesis(hypothesis, input.operationKey, commandHash(input));
  }

  listHypotheses(packageId: string): CreationHypothesis[] { return this.repository.listHypotheses(packageId); }

  createValidation(raw: unknown): PracticeValidation {
    const input = createPracticeValidationInputSchema.parse(raw);
    const hypothesis = this.repository.getHypothesis(input.hypothesisId);
    if (!hypothesis || hypothesis.contentPackageId !== input.contentPackageId) throw new Error("hypothesis not found for package");
    if (hypothesis.contentPackageSnapshotId !== input.contentPackageSnapshotId) {
      throw new Error("hypothesis does not belong to publication content package snapshot");
    }
    if (!input.variantId || !input.executionSnapshot) throw new Error("practice validation requires a resolvable frozen publication execution");
    if (input.executionSnapshot.status !== "published" && input.executionSnapshot.status !== "draft_saved") {
      throw new Error("practice validation requires a published or verified draft execution");
    }
    if (!input.executionSnapshot.receipt) throw new Error("practice validation requires a verified publication receipt");
    const prior = this.repository.listValidations(input.publicationRunId).find((item) => item.hypothesisId === input.hypothesisId);
    if (prior) {
      const priorFingerprint = commandHash({
        publicationRunId: prior.publicationRunId, contentPackageId: prior.contentPackageId,
        contentPackageSnapshotId: prior.contentPackageSnapshotId, variantId: prior.variantId,
        variantRevision: prior.variantRevision, hypothesisId: prior.hypothesisId,
        executionSnapshot: prior.executionSnapshot, observedSignals: prior.observedSignals,
        unavailableMetrics: prior.unavailableMetrics, executionDeviations: prior.executionDeviations, confounders: prior.confounders
      });
      const inputFingerprint = commandHash({ ...input, operationKey: undefined });
      if (priorFingerprint !== inputFingerprint) throw new Error("practice validation already exists for publication hypothesis with different evidence");
      return prior;
    }
    const timestamp = this.now();
    const validation = practiceValidationSchema.parse({
      ...input, id: this.makeId(),
      hypothesisSnapshot: {
        statement: hypothesis.statement, expectedSignals: hypothesis.expectedSignals,
        unavailableSignals: hypothesis.unavailableSignals, baselineDeclaration: hypothesis.baselineDeclaration,
        confounders: hypothesis.confounders
      },
      status: input.observedSignals.length > 0 || input.unavailableMetrics.length > 0 ? "evidence_ready" : "draft",
      proposedRelation: null, targetConceptId: null, targetConceptRevisionId: null, decisionReason: null,
      submittedBy: null, submittedAt: null, adjudicationDecision: null, adjudicatedBy: null,
      adjudicationReason: null, adjudicatedAt: null, promotedObservationId: null,
      createdAt: timestamp, updatedAt: timestamp
    });
    return this.repository.saveValidation(validation, input.operationKey, commandHash(input));
  }

  submitValidation(id: string, raw: unknown): PracticeValidation {
    const input = submitPracticeValidationInputSchema.parse(raw);
    const current = this.repository.getValidation(id);
    if (!current) throw new Error("practice validation not found");
    const submitHash = commandHash({ id, ...input });
    if (current.status === "adjudication_pending" && current.proposedRelation === input.proposedRelation
      && current.targetConceptId === input.targetConceptId && current.decisionReason === input.decisionReason
      && current.submittedBy === input.submittedBy) {
      return this.repository.saveValidation(current, input.operationKey, submitHash);
    }
    if (current.status !== "evidence_ready") throw new Error("practice validation is not evidence ready");
    if (input.proposedRelation !== "inconclusive" && !input.targetConceptId) throw new Error("conclusive validation requires target concept");
    if (input.proposedRelation !== "inconclusive" && current.observedSignals.length === 0) {
      throw new Error("conclusive validation requires an observed signal");
    }
    const target = input.targetConceptId ? this.research.get(input.targetConceptId) : null;
    if (input.targetConceptId && !target) throw new Error("target concept not found");
    const next = practiceValidationSchema.parse({
      ...current, status: "adjudication_pending", proposedRelation: input.proposedRelation,
      targetConceptId: input.targetConceptId, targetConceptRevisionId: target?.currentRevision.id ?? null,
      decisionReason: input.decisionReason, submittedBy: input.submittedBy, submittedAt: this.now(), updatedAt: this.now()
    });
    return this.repository.saveValidation(next, input.operationKey, submitHash);
  }

  adjudicateValidation(id: string, raw: unknown): PracticeValidation {
    const input = adjudicatePracticeValidationInputSchema.parse(raw);
    const decision = input.decision ?? (input.promote ? "promote" : "complete_no_promotion");
    const adjudicationHash = commandHash({ id, ...input, decision });
    const current = this.repository.getValidation(id);
    if (!current) throw new Error("practice validation not found");
    if (current.adjudicationDecision === decision && current.adjudicatedBy === input.adjudicatorId
      && current.adjudicationReason === input.reason) {
      return this.repository.saveValidation(current, input.operationKey, adjudicationHash);
    }
    const invalidatable = new Set<PracticeValidation["status"]>(["adjudication_pending", "promoted", "completed_no_promotion", "blocked"]);
    if (decision === "invalidate" ? !invalidatable.has(current.status) : current.status !== "adjudication_pending") {
      throw new Error(decision === "invalidate" ? "practice validation cannot be invalidated from current state" : "practice validation is not pending adjudication");
    }
    if (!current.submittedBy) throw new Error("practice validation has no accountable submitter");
    if (current.submittedBy === input.adjudicatorId) throw new Error("practice validation requires an independent adjudicator");
    let promotedObservationId: string | null = null;
    if (decision === "promote") {
      if (!current.targetConceptId || !current.proposedRelation || current.proposedRelation === "inconclusive") {
        throw new Error("eligible first-party promotion requires a target concept and conclusive relation");
      }
      if (current.observedSignals.length === 0) throw new Error("eligible first-party promotion requires observed signals");
      const target = this.research.get(current.targetConceptId);
      if (!target || target.currentRevision.id !== current.targetConceptRevisionId) {
        throw new Error("target concept revision changed after validation submission");
      }
      const observation = this.research.recordObservation({
        conceptId: current.targetConceptId,
        subjectType: "practice_validation",
        subjectId: current.id,
        creatorId: null,
        videoId: null,
        relation: current.proposedRelation,
        statement: current.decisionReason ?? input.reason,
        evidenceRefs: current.observedSignals.map((signal) => `practice:${current.id}:${signal.name}:${signal.source}:${signal.collectedAt}`),
        analysisRevisionId: `practice-validation:${current.id}`,
        confidence: "medium",
        sourceGateState: "ready",
        deepReconstruction: false,
        origin: "first_party_practice"
      });
      promotedObservationId = observation.id;
    } else if (decision === "invalidate" && current.promotedObservationId) {
      this.research.invalidateAnalysisRevision?.(`practice-validation:${current.id}`, input.reason);
    }
    const nextStatus: PracticeValidation["status"] = decision === "promote" ? "promoted"
      : decision === "complete_no_promotion" ? "completed_no_promotion"
        : decision === "block" ? "blocked" : "invalidated";
    const next = practiceValidationSchema.parse({
      ...current, status: nextStatus, adjudicationDecision: decision, adjudicatedBy: input.adjudicatorId,
      adjudicationReason: input.reason, adjudicatedAt: this.now(),
      promotedObservationId: decision === "invalidate" ? current.promotedObservationId : promotedObservationId,
      updatedAt: this.now()
    });
    return this.repository.saveValidation(next, input.operationKey, adjudicationHash);
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
    for (const edge of this.repository.listEdges()) {
      if (this.resolveEdgeStatus(edge).status === "invalidated" && edge.status !== "invalidated") {
        gaps.push({ code: "obsolete-semantic-edge", severity: "attention", conceptId: edge.sourceConceptId, message: "语义关系固定在已过期的概念 revision，等待重新裁决" });
      }
    }
    for (const binding of this.repository.listBindings()) {
      const resolved = this.resolveBindingStatus(binding);
      if (resolved.status !== "current") gaps.push({ code: "affected-creation-binding", severity: resolved.status === "invalidated" ? "blocked" : "attention", conceptId: null, message: `内容包 ${binding.contentPackageId} 的知识依据已${resolved.status === "invalidated" ? "失效" : "更新"}` });
    }
    return gaps;
  }

  private resolveBindingStatus(binding: KnowledgeBinding): KnowledgeBinding {
    if (binding.targetType !== "concept_revision") return binding;
    const owner = this.research.list().find((item) => item.revisions.some((revision) => revision.id === binding.targetId));
    if (!owner) return { ...binding, status: "invalidated" };
    if (["invalidated", "retired"].includes(owner.concept.status)) return { ...binding, status: "invalidated" };
    return owner.currentRevision.id === binding.targetId ? binding : { ...binding, status: "stale_available" };
  }

  private contributionsForConcept(conceptId: string) {
    return this.repository.listManifests().flatMap((manifest) => this.repository.listContributions(manifest.id)
      .filter((contribution) => contribution.targetConceptId === conceptId || contribution.createdConceptId === conceptId)
      .map((contribution) => ({ manifest, contribution })));
  }

  private resolveEdgeStatus(edge: SemanticEdge): SemanticEdge {
    const source = this.research.get(edge.sourceConceptId);
    const target = this.research.get(edge.targetConceptId);
    if (!source || !target || source.currentRevision.id !== edge.sourceRevisionId || target.currentRevision.id !== edge.targetRevisionId
      || ["invalidated", "retired"].includes(source.concept.status) || ["invalidated", "retired"].includes(target.concept.status)) {
      return { ...edge, status: "invalidated" };
    }
    return edge;
  }

  close(): void { this.repository.close(); }
}
