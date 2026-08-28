import type {
  CreationHypothesis, KnowledgeBinding, KnowledgeContribution, KnowledgeContributionManifest,
  PracticeValidation, SemanticEdge
} from "./contracts.js";

export interface ContentKnowledgeRepository {
  getManifestByAnalysis(analysisRevisionId: string, compilerPolicyVersion: string): KnowledgeContributionManifest | null;
  saveManifest(manifest: KnowledgeContributionManifest, contributions: KnowledgeContribution[], operationKey: string, commandHash: string): KnowledgeContributionManifest;
  listManifests(subjectType?: string, subjectId?: string): KnowledgeContributionManifest[];
  listContributions(manifestId: string): KnowledgeContribution[];
  saveEdge(edge: SemanticEdge, operationKey: string, commandHash: string): SemanticEdge;
  listEdges(conceptId?: string): SemanticEdge[];
  saveBinding(binding: KnowledgeBinding, operationKey: string, commandHash: string): KnowledgeBinding;
  listBindings(contentPackageId?: string, conceptRevisionId?: string): KnowledgeBinding[];
  saveHypothesis(hypothesis: CreationHypothesis, operationKey: string, commandHash: string): CreationHypothesis;
  getHypothesis(id: string): CreationHypothesis | null;
  listHypotheses(contentPackageId: string): CreationHypothesis[];
  saveValidation(validation: PracticeValidation, operationKey: string, commandHash: string): PracticeValidation;
  getValidation(id: string): PracticeValidation | null;
  listValidations(publicationRunId?: string): PracticeValidation[];
  close(): void;
}
