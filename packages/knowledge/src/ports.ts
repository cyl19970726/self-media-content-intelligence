import type {
  IngestAnalysisRevision,
  ResearchConceptRead,
  ResearchObservation
} from "../../contracts/index.js";
import type { CompileKnowledgeInput } from "./contracts.js";

export interface KnowledgeCompilerPort<TFrozenAnalysis> {
  propose(input: Readonly<TFrozenAnalysis>): CompileKnowledgeInput;
}

export interface KnowledgeResearchObservationInput {
  conceptId: string;
  subjectType: "video" | "creator" | "comparison" | "practice_validation";
  subjectId: string;
  creatorId?: string | null;
  videoId?: string | null;
  relation: "confirm" | "qualify" | "contradict";
  statement: string;
  evidenceRefs: string[];
  analysisRevisionId: string;
  confidence: "low" | "medium" | "high";
  sourceGateState: "ready" | "partial" | "not_ready" | "stale" | "invalid";
  deepReconstruction?: boolean;
  origin?: "external_research" | "first_party_practice";
}

export interface KnowledgeResearchPort {
  list(): ResearchConceptRead[];
  get(id: string): ResearchConceptRead | null;
  ingestAnalysisRevision(input: IngestAnalysisRevision): {
    analysisRevisionId: string;
    idempotent: boolean;
    sourceGateState: ResearchObservation["sourceGateState"];
    observations: ResearchObservation[];
  };
  recordObservation(input: KnowledgeResearchObservationInput): ResearchObservation;
  reload?(): void;
}
