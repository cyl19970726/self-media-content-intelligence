import { describe, expect, it } from "vitest";
import type { CreatorResearchService } from "../../packages/research/index.js";
import { loadCreatorSummaries } from "./creators.js";

describe("latest creator catalog", () => {
  it("lists the newest versioned run per creator, including pending runs, without historical report links", () => {
    const runs = [
      { id: "redfox-first", creatorId: "redfox", canonicalSlug: "redfox", creatorName: "RedFox", status: "collecting" },
      { id: "current", creatorId: "creator", canonicalSlug: "creator", creatorName: "Current", status: "ready" },
      { id: "superseded", creatorId: "creator", canonicalSlug: "creator", creatorName: "Old", status: "ready" }
    ].map((run) => ({
      ...run, profileUrl: `https://example.com/${run.creatorId}`, publicProfile: { followers: null, likesAndCollections: null },
      coverage: { discoveredPosts: 1, comparisonPosts: 1, reconstructedPosts: run.id === "current" ? 1 : 0 },
      lastSnapshotAt: null, createdAt: "2026-09-14T00:00:00Z", nextAction: "继续"
    }));
    const service = { list: () => runs } as unknown as CreatorResearchService;
    const summaries = loadCreatorSummaries(service);
    expect(summaries.map((item) => item.id)).toEqual(["redfox", "creator"]);
    expect(summaries[0]?.entries[0]?.href).toContain("run=redfox-first");
    expect(summaries.flatMap((item) => item.entries).every((entry) => !entry.href.startsWith("/research/"))).toBe(true);
  });

  it("does not resurrect static evidence when no versioned service is supplied", () => {
    expect(loadCreatorSummaries()).toEqual([]);
  });
});
