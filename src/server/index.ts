import "dotenv/config";
import { apiPort } from "../core/config.js";
import { AnalysisService } from "../core/service.js";
import { CreatorResearchService } from "../modules/creator-research/service.js";
import { CreatorResearchWorker } from "../modules/creator-research/worker.js";
import { ComparisonProjectService } from "../modules/comparison/service.js";
import { ComparisonProjectWorker } from "../modules/comparison/worker.js";
import { PublishingService } from "../modules/publishing/service.js";
import { PublicationWorker } from "../modules/publishing/worker.js";
import { EgoBrowserCreatorExecutor } from "../platform/browser/ego-browser-creator-executor.js";
import { RedFoxCreatorExecutor } from "../platform/redfox/redfox-creator-executor.js";
import { CreatorProviderRouter } from "../platform/creator-provider/creator-provider-router.js";
import { createEgoBrowserPublishers } from "../platform/publishing/ego-browser-publisher.js";
import { createApp } from "./app.js";
import { createDurableResearchLearningService } from "./research-learning.js";
import { createDurableLearningLoopControlPlane, seedInitialProductBlindAudit, seedProductBlindRegressionV2 } from "./learning-loop.js";

const port = apiPort();
const analysisService = new AnalysisService();
const creatorResearchService = new CreatorResearchService();
const creatorWorker = new CreatorResearchWorker(creatorResearchService, new CreatorProviderRouter({
  "ego-browser": new EgoBrowserCreatorExecutor(),
  redfox: new RedFoxCreatorExecutor()
}));
const comparisonProjectService = new ComparisonProjectService(creatorResearchService);
const comparisonWorker = new ComparisonProjectWorker(comparisonProjectService);
const researchLearningService = createDurableResearchLearningService();
const learningLoopControlPlane = createDurableLearningLoopControlPlane();
const publishingService = new PublishingService(undefined, createEgoBrowserPublishers());
const publicationWorker = new PublicationWorker(publishingService);
seedInitialProductBlindAudit(learningLoopControlPlane);
seedProductBlindRegressionV2(learningLoopControlPlane);
const app = createApp(analysisService, creatorResearchService, comparisonProjectService, researchLearningService, learningLoopControlPlane, publishingService);
creatorWorker.start();
comparisonWorker.start();
publicationWorker.start();

const server = app.listen(port, "127.0.0.1", () => {
  console.log(`Self Media Intelligence API: http://127.0.0.1:${port}`);
});

server.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});

let shuttingDown = false;
function shutdown(): void {
  if (shuttingDown) return;
  shuttingDown = true;
  creatorWorker.stop();
  comparisonWorker.stop();
  publicationWorker.stop();
  server.close(async () => {
    await creatorWorker.stopAndWait();
    await comparisonWorker.stopAndWait();
    await publicationWorker.stopAndWait();
    analysisService.close();
    creatorResearchService.close();
    comparisonProjectService.close();
    researchLearningService.close();
    learningLoopControlPlane.close();
    publishingService.close();
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
