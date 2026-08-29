import { createHash, randomUUID } from "node:crypto";
import type { KnowledgeResearchPort } from "./ports.js";
import {
  adjudicatePracticeValidationInputSchema, adjudicateSemanticEdgeInputSchema, compileKnowledgeInputSchema, createHypothesisInputSchema,
  createKnowledgeBindingInputSchema, createPracticeValidationInputSchema,
  knowledgeConceptViewSchema, knowledgeInvalidationCommandSchema, knowledgeInvalidationRecordSchema,
  legacyKnowledgeManifestInputSchema, practiceValidationSchema, submitPracticeValidationInputSchema,
  type CompileKnowledgeInput, type CreationHypothesis, type KnowledgeBinding,
  type KnowledgeConceptView, type KnowledgeContribution, type KnowledgeContributionManifest,
  type KnowledgeGap, type KnowledgeInvalidationRecord, type PracticeValidation, type SemanticEdge
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
      bindings: this.bindingsForConcept(research).map((binding) => this.resolveBindingStatus(binding)),
      contributions: this.contributionsForConcept(research.concept.id)
    }));
  }

  getKnowledge(conceptId: string): KnowledgeConceptView | null {
    const research = this.research.get(conceptId);
    return research ? knowledgeConceptViewSchema.parse({
      maturity: maturityFor(research.concept.scope), research,
      edges: this.repository.listEdges(conceptId).map((edge) => this.resolveEdgeStatus(edge)),
      bindings: this.bindingsForConcept(research).map((binding) => this.resolveBindingStatus(binding)),
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
    if ([source.concept.status, target.concept.status].some((status) => ["invalidated", "retired"].includes(status))) {
      throw new Error("semantic edge cannot use an inactive concept revision");
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
      const exists = this.repository.listManifests().some((manifest) => manifest.status !== "invalidated" &&
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

  invalidate(raw: unknown): KnowledgeInvalidationRecord {
    const input = knowledgeInvalidationCommandSchema.parse(raw);
    const prior = this.repository.getInvalidationByOperationKey(input.operationKey);
    if (prior) {
      if (commandHash(knowledgeInvalidationCommandSchema.parse(prior)) !== commandHash(input)) {
        throw new Error(`idempotency conflict for operation ${input.operationKey}`);
      }
      return prior;
    }
    const allManifests = this.repository.listManifests();
    const analysisIds = input.targetType === "analysis_revision"
      ? [input.targetId]
      : allManifests.filter((manifest) => this.repository.listContributions(manifest.id)
        .some((contribution) => contribution.evidenceRefs.includes(input.targetId)))
        .map((manifest) => manifest.analysisRevisionId);
    const affectedAnalysisRevisionIds = [...new Set(analysisIds)].sort();
    if (affectedAnalysisRevisionIds.length === 0) throw new Error(`${input.targetType} not found in accepted knowledge lineage`);
    const affectedManifests = allManifests.filter((manifest) => affectedAnalysisRevisionIds.includes(manifest.analysisRevisionId));
    const observationsBefore = this.research.list().flatMap((view) => view.observations)
      .filter((observation) => affectedAnalysisRevisionIds.includes(observation.analysisRevisionId));
    const affectedObservationIds = [...new Set(observationsBefore.map((item) => item.id))].sort();
    const affectedConceptIds = [...new Set(observationsBefore.map((item) => item.conceptId))].sort();
    if (affectedManifests.length === 0 && affectedObservationIds.length === 0) throw new Error(`${input.targetType} not found in accepted knowledge lineage`);
    const invalidateResearch = this.research.invalidateAnalysisRevision?.bind(this.research);
    if (!invalidateResearch) throw new Error("research invalidation port is unavailable");
    const recordId = this.makeId();
    const timestamp = this.now();

    try { return this.repository.transaction(() => {
      for (const manifest of affectedManifests) {
        if (manifest.status === "invalidated") continue;
        const next = { ...manifest, status: "invalidated" as const,
          quarantineReasons: [...new Set([...manifest.quarantineReasons, `hard-invalidation:${recordId}:${input.reason}`])], decidedAt: timestamp };
        this.repository.saveManifestState(next, `${input.operationKey}:manifest:${manifest.id}`, commandHash(next));
      }
      for (const analysisRevisionId of affectedAnalysisRevisionIds) {
        invalidateResearch(analysisRevisionId, input.reason);
      }
      this.repository.syncConceptProjection(this.research.list());
      const affectedEdges = this.repository.listEdges().filter((edge) =>
        (affectedConceptIds.includes(edge.sourceConceptId) || affectedConceptIds.includes(edge.targetConceptId)
          || (input.targetType === "evidence" && edge.provenanceRefs.includes(input.targetId)))
        && this.resolveEdgeStatus(edge).status === "invalidated");
      for (const edge of affectedEdges) {
        if (edge.status === "invalidated") continue;
        const next = { ...edge, status: "invalidated" as const };
        this.repository.saveEdgeState(next, `${input.operationKey}:edge:${edge.id}`, commandHash(next));
      }
      const affectedBindings = this.repository.listBindings().filter((binding) => {
        const resolved = this.resolveBindingStatus(binding);
        return resolved.status !== "current"
          && (binding.targetType === "concept_revision"
            ? affectedConceptIds.some((conceptId) => this.research.get(conceptId)?.revisions.some((revision) => revision.id === binding.targetId))
            : binding.targetType === "analysis_revision"
              ? affectedAnalysisRevisionIds.includes(binding.targetId)
              : input.targetType === "evidence" && binding.targetId === input.targetId);
      });
      const record = knowledgeInvalidationRecordSchema.parse({
        id: recordId, ...input, affectedAnalysisRevisionIds, affectedObservationIds, affectedConceptIds,
        affectedManifestIds: affectedManifests.map((item) => item.id).sort(),
        affectedEdgeIds: affectedEdges.map((item) => item.id).sort(),
        affectedBindingIds: affectedBindings.map((item) => item.id).sort(), createdAt: timestamp
      });
      return this.repository.saveInvalidation(record, input.operationKey, commandHash(input));
    }); } catch (error) {
      this.research.reload?.();
      throw error;
    }
  }

  listInvalidations(conceptId?: string): KnowledgeInvalidationRecord[] {
    return this.repository.listInvalidations().filter((item) => !conceptId || item.affectedConceptIds.includes(conceptId));
  }

  gaps(): KnowledgeGap[] {
    return this.lint();
  }

  lint(): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    const push = (item: Omit<KnowledgeGap, "id">) => gaps.push({ ...item, id: `${item.code}:${item.subjectType}:${item.subjectId}` });
    for (const view of this.listKnowledge()) {
      const conceptId = view.research.concept.id;
      if (view.research.currentRevision.exclusions.length === 0) push({ code: "missing-exclusions", severity: "attention", subjectType: "concept", subjectId: conceptId, conceptId, message: "概念缺少明确排除项", suggestedAction: "补充不适用边界并创建新的概念 revision。", lineageRefs: [view.research.currentRevision.id] });
      if (view.research.concept.scope === "conditional" && Object.values(view.research.currentRevision.condition).every((value) => value === null)) {
        push({ code: "missing-condition", severity: "attention", subjectType: "concept", subjectId: conceptId, conceptId, message: "条件规律尚未声明成立条件", suggestedAction: "补齐条件字段后提交人工裁决。", lineageRefs: [view.research.currentRevision.id] });
      }
      if (view.research.counts.contradict > 0 && !["invalidated", "retired"].includes(view.research.concept.status)) push({ code: "unresolved-contradiction", severity: "attention", subjectType: "concept", subjectId: conceptId, conceptId, message: "当前知识仍有尚未解决的反例", suggestedAction: "检查反例，选择限定、降级或失效该概念。", lineageRefs: view.research.observations.filter((item) => item.relation === "contradict" && item.gateState === "eligible").map((item) => item.id) });
      if (!view.research.observations.some((item) => item.gateState === "eligible")) push({ code: "orphan-concept", severity: "blocked", subjectType: "concept", subjectId: conceptId, conceptId, message: "概念已经没有可用观察证据", suggestedAction: "补充有效证据，或人工失效/退役该概念。", lineageRefs: view.research.observations.map((item) => item.id) });
    }
    for (const edge of this.repository.listEdges()) {
      if (this.resolveEdgeStatus(edge).status === "invalidated") {
        push({ code: "obsolete-semantic-edge", severity: "attention", subjectType: "semantic_edge", subjectId: edge.id, conceptId: edge.sourceConceptId, message: "语义关系固定在已过期的概念 revision", suggestedAction: "基于当前两端 revision 重新进行人工语义裁决。", lineageRefs: [edge.sourceRevisionId, edge.targetRevisionId] });
      }
    }
    for (const binding of this.repository.listBindings()) {
      const resolved = this.resolveBindingStatus(binding);
      if (resolved.status !== "current") push({ code: "affected-creation-binding", severity: resolved.status === "invalidated" ? "blocked" : "attention", subjectType: "knowledge_binding", subjectId: binding.id, conceptId: null, message: `内容包 ${binding.contentPackageId} 的知识依据已${resolved.status === "invalidated" ? "失效" : "更新"}`, suggestedAction: "保留冻结历史；在 working snapshot 中复核或替换知识依据。", lineageRefs: [binding.targetId, binding.contentPackageSnapshotId] });
    }
    const manifestAnalysisIds = new Set(this.repository.listManifests().map((item) => item.analysisRevisionId));
    const observedAnalysisIds = new Set(this.research.list().flatMap((view) => view.observations)
      .map((item) => item.analysisRevisionId).filter((id) => !id.startsWith("practice-validation:")));
    for (const analysisRevisionId of [...observedAnalysisIds].filter((id) => !manifestAnalysisIds.has(id)).sort()) {
      const conceptIds = this.research.list().filter((view) => view.observations.some((item) => item.analysisRevisionId === analysisRevisionId)).map((view) => view.concept.id);
      push({ code: "missing-contribution-manifest", severity: "blocked", subjectType: "analysis_revision", subjectId: analysisRevisionId, conceptId: conceptIds[0] ?? null, message: "研究观察缺少对应的知识贡献清单", suggestedAction: "补跑编译器或登记 legacy_unverified manifest，禁止静默补造知识。", lineageRefs: conceptIds });
    }
    const order = { blocked: 0, attention: 1, info: 2 } as const;
    return gaps.sort((left, right) => order[left.severity] - order[right.severity] || left.id.localeCompare(right.id));
  }

  private resolveBindingStatus(binding: KnowledgeBinding): KnowledgeBinding {
    if (binding.targetType === "concept_revision") {
      const owner = this.research.list().find((item) => item.revisions.some((revision) => revision.id === binding.targetId));
      if (!owner || ["invalidated", "retired"].includes(owner.concept.status)) return { ...binding, status: "invalidated" };
      return owner.currentRevision.id === binding.targetId ? { ...binding, status: "current" } : { ...binding, status: "stale_available" };
    }
    if (binding.targetType === "analysis_revision") {
      const manifests = this.repository.listManifests().filter((item) => item.analysisRevisionId === binding.targetId);
      return manifests.length > 0 && manifests.some((item) => item.status !== "invalidated") ? { ...binding, status: "current" } : { ...binding, status: "invalidated" };
    }
    const supportingManifests = this.repository.listManifests().filter((manifest) => this.repository.listContributions(manifest.id)
      .some((contribution) => contribution.evidenceRefs.includes(binding.targetId)));
    return supportingManifests.some((item) => item.status !== "invalidated") ? { ...binding, status: "current" } : { ...binding, status: "invalidated" };
  }

  private contributionsForConcept(conceptId: string) {
    return this.repository.listManifests().flatMap((manifest) => this.repository.listContributions(manifest.id)
      .filter((contribution) => contribution.targetConceptId === conceptId || contribution.createdConceptId === conceptId)
      .map((contribution) => ({ manifest, contribution })));
  }

  private bindingsForConcept(research: KnowledgeConceptView["research"]): KnowledgeBinding[] {
    const revisionIds = new Set(research.revisions.map((item) => item.id));
    const analysisIds = new Set(research.observations.map((item) => item.analysisRevisionId));
    const evidenceRefs = new Set(research.observations.flatMap((item) => item.evidenceRefs));
    return this.repository.listBindings().filter((binding) =>
      binding.targetType === "concept_revision" ? revisionIds.has(binding.targetId)
        : binding.targetType === "analysis_revision" ? analysisIds.has(binding.targetId)
          : evidenceRefs.has(binding.targetId));
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
