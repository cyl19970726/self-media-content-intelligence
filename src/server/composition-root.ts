import { AnalysisService } from "../core/service.js";
import { RunStore } from "../core/store.js";
import { CreatorResearchService, CreatorResearchWorker } from "../../packages/research/index.js";
import { ComparisonProjectService, ComparisonProjectWorker } from "../../packages/research/index.js";
import { PublishingService, PublicationWorker, type PlatformPublishers } from "../../packages/creation/index.js";
import {
  videoConcurrency,
  EgoBrowserCreatorExecutor,
  RedFoxCreatorExecutor,
  CreatorProviderRouter,
  createEgoBrowserPublishers,
  SQLitePublishingRepository,
  SQLiteCreatorResearchRepository,
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
  const creatorResearch = new CreatorResearchService(
    new SQLiteCreatorResearchRepository(),
    artifacts,
    new LocalDeepMediaResolver(),
    new CodexVideoReconstructionExecutor(),
    new CodexCreatorSynthesisExecutor(artifacts),
    videoConcurrency(),
    creatorKnowledgeCompiler
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
    new CreatorResearchWorker(creatorResearch, creatorExecutor, undefined, videoConcurrency()),
    new ComparisonProjectWorker(comparisons),
    new PublicationWorker(publishing)
  ];

  seedInitialProductBlindAudit(learningLoop);
  seedProductBlindRegressionV2(learningLoop);

  return new SignalRoomComposition(
    { analysis, creatorResearch, comparisons, researchLearning, learningLoop, publishing, creatorDiscovery, contentKnowledge, evidence },
    workers,
    [analysis, creatorResearch, comparisons, researchLearning, learningLoop, publishing, contentKnowledge]
  );
}
