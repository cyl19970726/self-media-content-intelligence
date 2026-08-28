import { describe, expect, it } from "vitest";
import type { CreatorBrowserExecutor } from "../../../packages/research/index.js";
import type { ResearchJobLane } from "./repository.js";
import type { CreatorResearchService } from "./service.js";
import { CreatorResearchWorker } from "./worker.js";

const executor = {} as CreatorBrowserExecutor;

describe("CreatorResearchWorker video pool", () => {
  it("fills no more than three video slots and keeps a separate serial lane", async () => {
    let activeVideos = 0;
    let maxActiveVideos = 0;
    let serialCalls = 0;
    const releases: Array<() => void> = [];
    const service = {
      async processNext(_workerId: string, _executor: CreatorBrowserExecutor, lane: ResearchJobLane) {
        if (lane === "serial") {
          serialCalls += 1;
          return false;
        }
        activeVideos += 1;
        maxActiveVideos = Math.max(maxActiveVideos, activeVideos);
        await new Promise<void>((resolve) => releases.push(resolve));
        activeVideos -= 1;
        return true;
      }
    } as unknown as CreatorResearchService;
    const worker = new CreatorResearchWorker(service, executor, "pool-test", 3);

    worker.start(1_000);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(maxActiveVideos).toBe(3);
    expect(releases).toHaveLength(3);
    expect(serialCalls).toBe(1);

    worker.stop();
    const stopped = worker.stopAndWait();
    for (const release of releases) release();
    await stopped;
    expect(activeVideos).toBe(0);
  });

  it("clamps configured video slots to the supported one-to-three range", () => {
    const service = { processNext: async () => false } as unknown as CreatorResearchService;
    expect(new CreatorResearchWorker(service, executor, "low", 0).videoSlots).toBe(1);
    expect(new CreatorResearchWorker(service, executor, "high", 9).videoSlots).toBe(3);
  });
});
