import { apiPort } from "../core/config.js";
import { AnalysisService } from "../core/service.js";
import { CreatorResearchService } from "../modules/creator-research/service.js";
import { CreatorResearchWorker } from "../modules/creator-research/worker.js";
import { ComparisonProjectService } from "../modules/comparison/service.js";
import { ComparisonProjectWorker } from "../modules/comparison/worker.js";
import { EgoBrowserCreatorExecutor } from "../platform/browser/ego-browser-creator-executor.js";
import { createApp } from "./app.js";
import { createDurableResearchLearningService } from "./research-learning.js";

const port = apiPort();
const analysisService = new AnalysisService();
const creatorResearchService = new CreatorResearchService();
const creatorWorker = new CreatorResearchWorker(creatorResearchService, new EgoBrowserCreatorExecutor());
const comparisonProjectService = new ComparisonProjectService(creatorResearchService);
const comparisonWorker = new ComparisonProjectWorker(comparisonProjectService);
const researchLearningService = createDurableResearchLearningService();
const app = createApp(analysisService, creatorResearchService, comparisonProjectService, researchLearningService);
creatorWorker.start();
comparisonWorker.start();

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
  server.close(async () => {
    await creatorWorker.stopAndWait();
    await comparisonWorker.stopAndWait();
    analysisService.close();
    creatorResearchService.close();
    comparisonProjectService.close();
    researchLearningService.close();
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
