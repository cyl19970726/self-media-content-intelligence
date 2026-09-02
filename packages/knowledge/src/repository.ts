import type {
  CreationHypothesis, KnowledgeBinding, KnowledgeContribution, KnowledgeContributionManifest,
  KnowledgeCompilationProposal, KnowledgeInvalidationRecord, PracticeValidation, SemanticEdge
} from "./contracts.js";
import type { ResearchConceptRead } from "../../contracts/index.js";

export interface KnowledgeProjectionParity {
  eventCount: number;
  manifestCount: number;
  contributionCount: number;
  edgeCount: number;
  bindingCount: number;
  hypothesisCount: number;
  validationCount: number;
  invalidationCount: number;
}

export interface ContentKnowledgeRepository {
  transaction<T>(operation: () => T): T;
  getProposal(id: string): KnowledgeCompilationProposal | null;
  getProposalByAnalysis(analysisRevisionId: string, compilerPolicyVersion: string): KnowledgeCompilationProposal | null;
  saveProposal(proposal: KnowledgeCompilationProposal, operationKey: string, commandHash: string): KnowledgeCompilationProposal;
  saveProposalState(proposal: KnowledgeCompilationProposal, operationKey: string, commandHash: string): KnowledgeCompilationProposal;
  listProposals(subjectType?: string, subjectId?: string): KnowledgeCompilationProposal[];
  getManifestByAnalysis(analysisRevisionId: string, compilerPolicyVersion: string): KnowledgeContributionManifest | null;
  saveManifest(manifest: KnowledgeContributionManifest, contributions: KnowledgeContribution[], operationKey: string, commandHash: string): KnowledgeContributionManifest;
  saveManifestState(manifest: KnowledgeContributionManifest, operationKey: string, commandHash: string): KnowledgeContributionManifest;
  listManifests(subjectType?: string, subjectId?: string): KnowledgeContributionManifest[];
  listContributions(manifestId: string): KnowledgeContribution[];
  saveEdge(edge: SemanticEdge, operationKey: string, commandHash: string): SemanticEdge;
  saveEdgeState(edge: SemanticEdge, operationKey: string, commandHash: string): SemanticEdge;
  listEdges(conceptId?: string): SemanticEdge[];
  saveBinding(binding: KnowledgeBinding, operationKey: string, commandHash: string): KnowledgeBinding;
  listBindings(contentPackageId?: string, conceptRevisionId?: string): KnowledgeBinding[];
  saveHypothesis(hypothesis: CreationHypothesis, operationKey: string, commandHash: string): CreationHypothesis;
  getHypothesis(id: string): CreationHypothesis | null;
  listHypotheses(contentPackageId: string): CreationHypothesis[];
  saveValidation(validation: PracticeValidation, operationKey: string, commandHash: string): PracticeValidation;
  getValidation(id: string): PracticeValidation | null;
  listValidations(publicationRunId?: string): PracticeValidation[];
  saveInvalidation(record: KnowledgeInvalidationRecord, operationKey: string, commandHash: string): KnowledgeInvalidationRecord;
  getInvalidationByOperationKey(operationKey: string): KnowledgeInvalidationRecord | null;
  listInvalidations(): KnowledgeInvalidationRecord[];
  syncConceptProjection(concepts: ResearchConceptRead[]): void;
  searchConceptIds(query: string): string[];
  rebuildProjections(): KnowledgeProjectionParity;
  projectionParity(): KnowledgeProjectionParity;
  close(): void;
}
