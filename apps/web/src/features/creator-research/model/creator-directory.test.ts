import { describe, expect, it } from "vitest";
import type { CreatorResearchRun } from "../../../shared/contracts/core";
import { isCompletedResearch, splitCreatorResearch } from "./creator-directory";

function run(overrides: Partial<CreatorResearchRun> = {}): CreatorResearchRun {
  return { id: "a", creatorId: "creator", profileUrl: "https://www.xiaohongshu.com/user/profile/creator",
    createdAt: "2026-09-14T00:00:00Z", updatedAt: "2026-09-14T01:00:00Z", status: "collecting",
    synthesisArtifactRef: null, stages: [{ id: "synthesis", status: "pending" }], source: { kind: "live_collection" },
    coverage: { reconstructedPosts: 12 }, ...overrides } as CreatorResearchRun;
}
const finished = () => run({ status: "ready", synthesisArtifactRef: "synthesis.json", stages: [{ id: "synthesis", status: "complete" }] as CreatorResearchRun["stages"] });

describe("creator research directory", () => {
  it("does not equate built single posts or reviewable output with completed research", () => {
    expect(isCompletedResearch(run())).toBe(false);
    expect(isCompletedResearch(run({ status: "ready" }))).toBe(false);
    expect(isCompletedResearch({ ...finished(), status: "reviewable" })).toBe(false);
    expect(isCompletedResearch(finished())).toBe(true);
  });
  it("shows one latest active row while preserving the last completed result", () => {
    const newer = run({ id: "new", createdAt: "2026-09-15T00:00:00Z" });
    expect(splitCreatorResearch([finished(), newer])).toEqual({ active: [newer], completed: [finished()] });
  });
  it("does not resurrect older unfinished attempts after completion", () => {
    const older = run({ id: "old", createdAt: "2026-09-13T00:00:00Z", updatedAt: "2026-09-16T00:00:00Z" });
    expect(splitCreatorResearch([older, finished()])).toEqual({ active: [], completed: [finished()] });
  });
  it("keeps unidentified intake tasks visible and excludes standalone legacy imports", () => {
    const intake = run({ creatorId: null });
    const standalone = run({ creatorId: null, source: { kind: "legacy_import", sourceRefs: [], importedAt: null } });
    expect(splitCreatorResearch([intake, standalone]).active).toEqual([intake]);
  });
});
