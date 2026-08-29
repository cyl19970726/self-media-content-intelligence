import type {
  ContentKnowledgeRepository, CreationHypothesis, KnowledgeBinding, KnowledgeContribution,
  KnowledgeContributionManifest, KnowledgeInvalidationRecord, PracticeValidation, SemanticEdge
} from "../../knowledge/index.js";

export class InMemoryContentKnowledgeRepository implements ContentKnowledgeRepository {
  private manifests: KnowledgeContributionManifest[] = [];
  private contributions: KnowledgeContribution[] = [];
  private edges: SemanticEdge[] = [];
  private bindings: KnowledgeBinding[] = [];
  private hypotheses: CreationHypothesis[] = [];
  private validations: PracticeValidation[] = [];
  private invalidations: KnowledgeInvalidationRecord[] = [];
  private operations = new Map<string, { commandHash: string; value: unknown }>();
  private conceptSearch = new Map<string, string>();

  transaction<T>(operation: () => T): T { return operation(); }

  getManifestByAnalysis(analysisRevisionId: string, compilerPolicyVersion: string) { return this.manifests.find((item) => item.analysisRevisionId === analysisRevisionId && item.compilerPolicyVersion === compilerPolicyVersion) ?? null; }
  saveManifest(manifest: KnowledgeContributionManifest, contributions: KnowledgeContribution[], operationKey: string, commandHash: string) { return this.write(operationKey, commandHash, manifest, () => { this.manifests.push(manifest); this.contributions.push(...contributions); }); }
  saveManifestState(manifest: KnowledgeContributionManifest, operationKey: string, commandHash: string) { return this.write(operationKey, commandHash, manifest, () => { const index = this.manifests.findIndex((item) => item.id === manifest.id); if (index !== -1) this.manifests[index] = manifest; }); }
  listManifests(subjectType?: string, subjectId?: string) { return this.manifests.filter((item) => (!subjectType || item.subjectType === subjectType) && (!subjectId || item.subjectId === subjectId)); }
  listContributions(manifestId: string) { return this.contributions.filter((item) => item.manifestId === manifestId); }
  saveEdge(edge: SemanticEdge, operationKey: string, commandHash: string) { return this.write(operationKey, commandHash, edge, () => this.edges.push(edge)); }
  saveEdgeState(edge: SemanticEdge, operationKey: string, commandHash: string) { return this.write(operationKey, commandHash, edge, () => { const index = this.edges.findIndex((item) => item.id === edge.id); if (index !== -1) this.edges[index] = edge; }); }
  listEdges(conceptId?: string) { return this.edges.filter((item) => !conceptId || item.sourceConceptId === conceptId || item.targetConceptId === conceptId); }
  saveBinding(binding: KnowledgeBinding, operationKey: string, commandHash: string) { return this.write(operationKey, commandHash, binding, () => this.bindings.push(binding)); }
  listBindings(contentPackageId?: string, conceptRevisionId?: string) { return this.bindings.filter((item) => (!contentPackageId || item.contentPackageId === contentPackageId) && (!conceptRevisionId || item.targetId === conceptRevisionId)); }
  saveHypothesis(hypothesis: CreationHypothesis, operationKey: string, commandHash: string) { return this.write(operationKey, commandHash, hypothesis, () => this.hypotheses.push(hypothesis)); }
  getHypothesis(id: string) { return this.hypotheses.find((item) => item.id === id) ?? null; }
  listHypotheses(contentPackageId: string) { return this.hypotheses.filter((item) => item.contentPackageId === contentPackageId); }
  saveValidation(validation: PracticeValidation, operationKey: string, commandHash: string) { return this.write(operationKey, commandHash, validation, () => { const index = this.validations.findIndex((item) => item.id === validation.id); if (index === -1) this.validations.push(validation); else this.validations[index] = validation; }); }
  getValidation(id: string) { return this.validations.find((item) => item.id === id) ?? null; }
  listValidations(publicationRunId?: string) { return this.validations.filter((item) => !publicationRunId || item.publicationRunId === publicationRunId); }
  saveInvalidation(record: KnowledgeInvalidationRecord, operationKey: string, commandHash: string) { return this.write(operationKey, commandHash, record, () => this.invalidations.push(record)); }
  getInvalidationByOperationKey(operationKey: string) { return this.invalidations.find((item) => item.operationKey === operationKey) ?? null; }
  listInvalidations() { return [...this.invalidations].reverse(); }
  syncConceptProjection(concepts: import("../../contracts/index.js").ResearchConceptRead[]) { this.conceptSearch = new Map(concepts.map((item) => [item.concept.id, `${item.concept.name} ${item.currentRevision.definition} ${item.currentRevision.exclusions.join(" ")}`.toLocaleLowerCase()])); }
  searchConceptIds(query: string) { const needle = query.toLocaleLowerCase(); return [...this.conceptSearch].filter(([, value]) => value.includes(needle)).map(([id]) => id); }
  rebuildProjections() { return this.projectionParity(); }
  projectionParity() { return { eventCount: this.operations.size, manifestCount: this.manifests.length, contributionCount: this.contributions.length, edgeCount: this.edges.length, bindingCount: this.bindings.length, hypothesisCount: this.hypotheses.length, validationCount: this.validations.length, invalidationCount: this.invalidations.length }; }
  close(): void { /* no resources */ }

  private write<T>(operationKey: string, commandHash: string, value: T, persist: () => void): T {
    const prior = this.operations.get(operationKey);
    if (prior) {
      if (prior.commandHash !== commandHash) throw new Error(`idempotency conflict for operation ${operationKey}`);
      return prior.value as T;
    }
    persist(); this.operations.set(operationKey, { commandHash, value }); return value;
  }
}
