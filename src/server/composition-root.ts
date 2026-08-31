import { AnalysisService } from "../core/service.js";
import { RunStore } from "../core/store.js";
import { CreatorResearchBatchService, CreatorResearchService, CreatorResearchWorker } from "../../packages/research/index.js";
import { ComparisonProjectService, ComparisonProjectWorker } from "../../packages/research/index.js";
import { PublishingService, PublicationWorker, type PlatformPublishers } from "../../packages/creation/index.js";
import {
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
  CodexCreatorSynthesisExecutor
} from "../../packages/adapters/index.js";
import { LocalEvidenceAccess } from "../../packages/adapters/index.js";
import { RedFoxCreatorDiscoveryService } from "../../packages/adapters/index.js";
import { createApp } from "./app.js";
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
import { SinglePostKnowledgeCompiler } from "./analysis-knowledge-compiler.js";
import { ComparisonKnowledgeCompiler, CreatorKnowledgeCompiler } from "./research-knowledge-compiler.js";

export interface SignalRoomServices {
  analysis: AnalysisService;
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
  const creatorResearchRepository = new SQLiteCreatorResearchRepository();
  const creatorResearch = new CreatorResearchService(
    creatorResearchRepository,
    artifacts,
    new LocalDeepMediaResolver(),
    new CodexVideoReconstructionExecutor(),
    new CodexCreatorSynthesisExecutor(artifacts),
    videoConcurrency(),
    creatorKnowledgeCompiler
  );
  const creatorResearchBatchRepository = new SQLiteCreatorResearchBatchRepository();
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
  const analysis = new AnalysisService(new RunStore(), new SinglePostKnowledgeCompiler(contentKnowledge));
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
    { analysis, creatorResearch, creatorResearchBatches, comparisons, researchLearning, learningLoop, publishing, creatorDiscovery, contentKnowledge, evidence },
    workers,
    [analysis, creatorResearch, comparisons, researchLearning, learningLoop, publishing, contentKnowledge, creatorResearchBatchRepository]
  );
}
