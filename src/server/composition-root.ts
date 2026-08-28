import { AnalysisService } from "../core/service.js";
import { RunStore } from "../core/store.js";
import { CreatorResearchService } from "../modules/creator-research/service.js";
import { CreatorResearchWorker } from "../modules/creator-research/worker.js";
import { ComparisonProjectService } from "../modules/comparison/service.js";
import { ComparisonProjectWorker } from "../modules/comparison/worker.js";
import { PublishingService, PublicationWorker, type PlatformPublishers } from "../../packages/creation/index.js";
import { EgoBrowserCreatorExecutor } from "../platform/browser/ego-browser-creator-executor.js";
import { RedFoxCreatorExecutor } from "../platform/redfox/redfox-creator-executor.js";
import { CreatorProviderRouter } from "../platform/creator-provider/creator-provider-router.js";
import { createEgoBrowserPublishers } from "../platform/publishing/ego-browser-publisher.js";
import { SQLitePublishingRepository } from "../platform/database/sqlite-publishing-repository.js";
import { SQLiteCreatorResearchRepository } from "../platform/database/sqlite-creator-research-repository.js";
import { SQLiteComparisonProjectRepository } from "../platform/database/sqlite-comparison-project-repository.js";
import { LocalCreatorArtifactStore } from "../platform/artifacts/local-creator-artifact-store.js";
import { LocalDeepMediaResolver } from "../platform/media/local-deep-media-resolver.js";
import { LocalPublicationMediaAccess } from "../platform/media/local-publication-media-access.js";
import { CodexVideoReconstructionExecutor } from "../platform/video/codex-video-reconstruction-executor.js";
import { CodexCreatorSynthesisExecutor } from "../platform/synthesis/codex-creator-synthesis-executor.js";
import { RedFoxCreatorDiscoveryService } from "../modules/creator-discovery/redfox-service.js";
import { createApp } from "./app.js";
import { createDurableResearchLearningService, type ResearchLearningService } from "./research-learning.js";
import { createDurableContentKnowledgeService } from "./content-knowledge.js";
import {
  createDurableLearningLoopControlPlane,
  seedInitialProductBlindAudit,
  seedProductBlindRegressionV2,
  type LearningLoopControlPlane
} from "./learning-loop.js";
import type { ContentKnowledgeService } from "../../packages/knowledge/index.js";
import { ManagedRuntime, type ManagedResource, type ManagedWorker } from "../../packages/runtime/index.js";
import { loadCreatorDossier } from "./creator-dossier.js";

export interface SignalRoomServices {
  analysis: AnalysisService;
  creatorResearch: CreatorResearchService;
  comparisons: ComparisonProjectService;
  researchLearning: ResearchLearningService;
  learningLoop: LearningLoopControlPlane;
  publishing: PublishingService;
  creatorDiscovery: RedFoxCreatorDiscoveryService;
  contentKnowledge: ContentKnowledgeService;
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
  const analysis = new AnalysisService(new RunStore());
  const creatorResearch = new CreatorResearchService(
    new SQLiteCreatorResearchRepository(),
    artifacts,
    new LocalDeepMediaResolver(),
    new CodexVideoReconstructionExecutor(),
    new CodexCreatorSynthesisExecutor(artifacts)
  );
  const comparisons = new ComparisonProjectService(
    creatorResearch,
    new SQLiteComparisonProjectRepository(),
    artifacts,
    loadCreatorDossier
  );
  const researchLearning = createDurableResearchLearningService();
  const learningLoop = createDurableLearningLoopControlPlane();
  const publishers = options.publishers === undefined ? createEgoBrowserPublishers() : options.publishers;
  const publishing = new PublishingService(new SQLitePublishingRepository(), new LocalPublicationMediaAccess(), publishers);
  const creatorDiscovery = new RedFoxCreatorDiscoveryService();
  const contentKnowledge = createDurableContentKnowledgeService(researchLearning);
  const creatorExecutor = new CreatorProviderRouter({
    "ego-browser": new EgoBrowserCreatorExecutor(),
    redfox: new RedFoxCreatorExecutor()
  });
  const workers: ManagedWorker[] = [
    new CreatorResearchWorker(creatorResearch, creatorExecutor),
    new ComparisonProjectWorker(comparisons),
    new PublicationWorker(publishing)
  ];

  seedInitialProductBlindAudit(learningLoop);
  seedProductBlindRegressionV2(learningLoop);

  return new SignalRoomComposition(
    { analysis, creatorResearch, comparisons, researchLearning, learningLoop, publishing, creatorDiscovery, contentKnowledge },
    workers,
    [analysis, creatorResearch, comparisons, researchLearning, learningLoop, publishing, contentKnowledge]
  );
}
