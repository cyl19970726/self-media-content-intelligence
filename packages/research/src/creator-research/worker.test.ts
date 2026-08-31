import { describe, expect, it } from "vitest";
import type { CreatorResearchRun } from "../../../contracts/index.js";
import type { CreatorBrowserExecutor } from "../../index.js";
import type { ResearchJobLane } from "./repository.js";
import { recoveredVideoWorkProjection, type CreatorResearchService } from "./service.js";
import { CreatorResearchWorker } from "./worker.js";

const executor = {} as CreatorBrowserExecutor;

describe("CreatorResearchWorker lane pools", () => {
  it("clears stale running projections before a local worker resumes leases", () => {
    const run = { videoWork: {
      concurrencyLimit: 3,
      activePostExternalIds: ["stale-a", "stale-b"],
      queuedPosts: 4,
      analyzedPosts: 3,
      failedPosts: 1
    } } as CreatorResearchRun;
    expect(recoveredVideoWorkProjection(run, null, 1)).toEqual({
      concurrencyLimit: 1,
      activePostExternalIds: [],
      queuedPosts: 6,
      analyzedPosts: 3,
      failedPosts: 1
    });
  });

  it("derives built progress for legacy batches that only stored ready states", () => {
    const run = { videoWork: {
      concurrencyLimit: 3, activePostExternalIds: ["stale"], queuedPosts: 0, analyzedPosts: 0, failedPosts: 0
    } } as CreatorResearchRun;
    const batch = {
      builtPosts: 0,
      items: [
        { state: "ready" },
        { state: "verified" },
        { state: "built_unevaluated" },
        { state: "queued" }
      ]
    } as Parameters<typeof recoveredVideoWorkProjection>[1];
    expect(recoveredVideoWorkProjection(run, batch, 3).analyzedPosts).toBe(3);
  });

  it("fills each independent lane to its configured capacity", async () => {
    const active = new Map<ResearchJobLane, number>();
    const maximum = new Map<ResearchJobLane, number>();
    const releases: Array<() => void> = [];
    const service = {
      async processNext(_workerId: string, _executor: CreatorBrowserExecutor, lane: ResearchJobLane) {
        const count = (active.get(lane) ?? 0) + 1;
        active.set(lane, count);
        maximum.set(lane, Math.max(maximum.get(lane) ?? 0, count));
        await new Promise<void>((resolve) => releases.push(resolve));
        active.set(lane, (active.get(lane) ?? 1) - 1);
        return true;
      }
    } as unknown as CreatorResearchService;
    const worker = new CreatorResearchWorker(service, executor, "pool-test", {
      redfox: 4, "ego-browser": 1, portfolio: 1, video: 3, synthesis: 2
    });

    worker.start(1_000);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(Object.fromEntries(maximum)).toEqual({
      redfox: 4, "ego-browser": 1, portfolio: 1, video: 3, synthesis: 2
    });
    expect(releases).toHaveLength(11);

    worker.stop();
    const stopped = worker.stopAndWait();
    for (const release of releases) release();
    await stopped;
    expect([...active.values()].every((count) => count === 0)).toBe(true);
  });

  it("uses V2 defaults and clamps every configured pool", () => {
    const service = { processNext: async () => false } as unknown as CreatorResearchService;
    expect(new CreatorResearchWorker(service, executor).poolSizes).toEqual({
      redfox: 4, "ego-browser": 1, portfolio: 1, video: 3, synthesis: 2
    });
    expect(new CreatorResearchWorker(service, executor, "clamped", {
      redfox: 99, "ego-browser": 0, portfolio: 99, video: 99, synthesis: 99
    }).poolSizes).toEqual({
      redfox: 8, "ego-browser": 1, portfolio: 4, video: 3, synthesis: 4
    });
  });

  it("keeps the old numeric constructor compatible as a video override", () => {
    const service = { processNext: async () => false } as unknown as CreatorResearchService;
    const worker = new CreatorResearchWorker(service, executor, "legacy", 1);
    expect(worker.videoSlots).toBe(1);
    expect(worker.poolSizes.redfox).toBe(4);
  });
});
