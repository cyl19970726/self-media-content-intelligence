import { DatabaseSync } from "node:sqlite";
import { CreatorResearchBatchService, CreatorResearchService, CreatorResearchWorker } from "../../packages/research/index.js";
import { ComparisonProjectService, ComparisonProjectWorker } from "../../packages/research/index.js";
import { PublishingService, PublicationWorker, type PlatformPublishers } from "../../packages/creation/index.js";
import {
  SQLiteWorkflowRunStore,
  createProductionResearchWorkflow,
  databasePath,
  creatorWorkerConcurrency,
  videoConcurrency,
  EgoBrowserCreatorExecutor,
  RedFoxCreatorExecutor,
  CreatorProviderRouter,
  createEgoBrowserPublishers,
  SQLitePublishingRepository,
  SQLiteCreatorResearchRepository,
  SQLiteCreatorResearchBatchRepository,
  SQLiteComparisonProjectRepository,
  LocalCreatorArtifactStore,
  LocalDeepMediaResolver,
  LocalPublicationMediaAccess,
  CodexVideoReconstructionExecutor,
  CodexImagePostReconstructionExecutor,
  CodexCreatorSynthesisExecutor
} from "../../packages/adapters/index.js";
import { LocalEvidenceAccess } from "../../packages/adapters/index.js";
import { RedFoxCreatorDiscoveryService } from "../../packages/adapters/index.js";
import { createApp } from "./app.js";
import type { WorkflowHttpService } from "./routes/workflow-runs.js";
import { type ResearchLearningService } from "./research-learning.js";
import { createDurableKnowledgeSystem } from "./content-knowledge.js";
import {
  createDurableLearningLoopControlPlane,
  seedInitialProductBlindAudit,
  seedProductBlindRegressionV2,
  type LearningLoopControlPlane
} from "./learning-loop.js";
import type { ContentKnowledgeService } from "../../packages/knowledge/index.js";
import { ManagedRuntime, type ManagedResource, type ManagedWorker } from "../../packages/runtime/index.js";
import { loadCreatorDossier } from "./creator-dossier.js";
import { loadWorkflowArtifactReader } from "./workflow-artifact-reader.js";
import { ComparisonKnowledgeCompiler, CreatorKnowledgeCompiler } from "./research-knowledge-compiler.js";

export interface SignalRoomServices {
  workflows: WorkflowHttpService;
  creatorResearch: CreatorResearchService;
  creatorResearchBatches: CreatorResearchBatchService;
  comparisons: ComparisonProjectService;
  researchLearning: ResearchLearningService;
  learningLoop: LearningLoopControlPlane;
  publishing: PublishingService;
  creatorDiscovery: RedFoxCreatorDiscoveryService;
  contentKnowledge: ContentKnowledgeService;
  evidence: LocalEvidenceAccess;
}

export interface SignalRoomCompositionOptions {
  publishers?: PlatformPublishers | null;
}

export class SignalRoomComposition {
  readonly app;
  private readonly runtime;

  constructor(
    readonly services: SignalRoomServices,
    workers: ManagedWorker[],
    resources: ManagedResource[]
  ) {
    this.app = createApp(services);
    this.runtime = new ManagedRuntime(workers, resources);
  }

  startWorkers(): void { this.runtime.startWorkers(); }

  close(): Promise<void> { return this.runtime.close(); }
}

export function createSignalRoomComposition(
  options: SignalRoomCompositionOptions = {}
): SignalRoomComposition {
  const artifacts = new LocalCreatorArtifactStore();
  const { researchLearning, contentKnowledge } = createDurableKnowledgeSystem();
  const creatorKnowledgeCompiler = new CreatorKnowledgeCompiler(contentKnowledge);
  const comparisonKnowledgeCompiler = new ComparisonKnowledgeCompiler(contentKnowledge);
  const creatorDatabase = new DatabaseSync(databasePath());
  const creatorResearchRepository = new SQLiteCreatorResearchRepository(creatorDatabase);
  const workflowStore = new SQLiteWorkflowRunStore(creatorDatabase);
  const researchWorkflow = createProductionResearchWorkflow(creatorDatabase, workflowStore, artifacts, creatorResearchRepository);
  const creatorResearch = new CreatorResearchService(
    creatorResearchRepository,
    artifacts,
    new LocalDeepMediaResolver(),
    new CodexVideoReconstructionExecutor(),
    new CodexCreatorSynthesisExecutor(artifacts),
    videoConcurrency(),
    creatorKnowledgeCompiler,
    new CodexImagePostReconstructionExecutor(artifacts),
    researchWorkflow
  );
  const workflows: WorkflowHttpService = {
    store: workflowStore,
    registeredReview: (creatorRunId) => {
      const review = creatorResearch.get(creatorRunId)?.researchReview;
      return review ? { reviewStatus: review.reviewStatus, candidateStatus: review.candidateStatus } : null;
    },
    registeredPostReviews: (creatorRunId) => {
      const items = creatorResearch.portfolio(creatorRunId)?.reconstructionBatch?.items ?? [];
      return (postId) => {
        const review = items.find((item) => item.postExternalId === postId)?.researchReview;
        return review ? { reviewStatus: review.reviewStatus, candidateStatus: review.candidateStatus } : null;
      };
    },
    artifactPayload: (id) => workflowStore.getArtifactPayload(id),
    artifactReader: (runId, artifactId) => loadWorkflowArtifactReader(workflowStore,
      (id) => workflowStore.getArtifactPayload(id), creatorResearch, runId, artifactId),
    retry: (creatorRunId, workflowRunId, stepKey) => creatorResearch.retryWorkflowStep(creatorRunId, workflowRunId, stepKey),
    cancel: (creatorRunId, workflowRunId) => creatorResearch.cancelWorkflow(creatorRunId, workflowRunId),
    startPost: (creatorRunId, input) => {
      if (!input || typeof input !== "object" || !("postExternalId" in input) || typeof input.postExternalId !== "string") {
        throw new Error("请指定研究样本 postExternalId");
      }
      const evaluationMode = "evaluationMode" in input ? input.evaluationMode : undefined;
      if (evaluationMode !== undefined && evaluationMode !== "fresh" && evaluationMode !== "repair_existing_invalid") {
        throw new Error("evaluationMode 必须是 fresh 或 repair_existing_invalid");
      }
      const importedEvaluationArtifactRef = "importedEvaluationArtifactRef" in input ? input.importedEvaluationArtifactRef : undefined;
      if (importedEvaluationArtifactRef !== undefined && typeof importedEvaluationArtifactRef !== "string") {
        throw new Error("importedEvaluationArtifactRef 必须是 artifact reference 字符串");
      }
      if (importedEvaluationArtifactRef && evaluationMode !== "repair_existing_invalid") {
        throw new Error("importedEvaluationArtifactRef 仅能与 repair_existing_invalid 一起使用");
      }
      const candidateMode = "candidateMode" in input ? input.candidateMode : undefined;
      if (candidateMode !== undefined && candidateMode !== "rebuild" && candidateMode !== "reuse") {
        throw new Error("candidateMode 必须是 rebuild 或 reuse");
      }
      return creatorResearch.startPostWorkflow(creatorRunId, input.postExternalId, { evaluationMode, importedEvaluationArtifactRef, candidateMode });
    },
    startCreatorAnalysis: (creatorRunId, input) => {
      if (input !== undefined && (!input || typeof input !== "object" || Array.isArray(input))) {
        throw new Error("creator-analyze 请求体必须是对象");
      }
      const options = (input ?? {}) as Record<string, unknown>;
      const candidateMode = options.candidateMode;
      if (candidateMode !== undefined && candidateMode !== "rebuild" && candidateMode !== "reuse") {
        throw new Error("candidateMode 必须是 rebuild 或 reuse");
      }
      const scope = options.scope;
      if (scope !== undefined && scope !== "selected" && scope !== "available_deep") {
        throw new Error("scope 必须是 selected 或 available_deep");
      }
      return creatorResearch.startCreatorAnalysisWorkflow(creatorRunId, { candidateMode, scope });
    },
    startSynthesis: (creatorRunId) => creatorResearch.startCreatorSynthesisWorkflow(creatorRunId)
  };
  const creatorResearchBatchRepository = new SQLiteCreatorResearchBatchRepository(creatorDatabase);
  const creatorResearchBatches = new CreatorResearchBatchService(
    creatorResearchBatchRepository,
    creatorResearch,
    creatorResearch
  );
  const comparisons = new ComparisonProjectService(
    creatorResearch,
    new SQLiteComparisonProjectRepository(),
    artifacts,
    loadCreatorDossier,
    comparisonKnowledgeCompiler
  );
  const learningLoop = createDurableLearningLoopControlPlane();
  const publishers = options.publishers === undefined ? createEgoBrowserPublishers() : options.publishers;
  const publishing = new PublishingService(new SQLitePublishingRepository(), new LocalPublicationMediaAccess(), publishers);
  const creatorDiscovery = new RedFoxCreatorDiscoveryService();
  const evidence = new LocalEvidenceAccess();
  const creatorExecutor = new CreatorProviderRouter({
    "ego-browser": new EgoBrowserCreatorExecutor(),
    redfox: new RedFoxCreatorExecutor()
  });
  const workers: ManagedWorker[] = [
    new CreatorResearchWorker(creatorResearch, creatorExecutor, undefined, creatorWorkerConcurrency()),
    new ComparisonProjectWorker(comparisons),
    new PublicationWorker(publishing)
  ];

  seedInitialProductBlindAudit(learningLoop);
  seedProductBlindRegressionV2(learningLoop);

  return new SignalRoomComposition(
    { workflows, creatorResearch, creatorResearchBatches, comparisons, researchLearning, learningLoop, publishing, creatorDiscovery, contentKnowledge, evidence },
    workers,
    [{ close: () => creatorDatabase.close() }, creatorResearch, comparisons, researchLearning, learningLoop, publishing, contentKnowledge, creatorResearchBatchRepository]
  );
}
