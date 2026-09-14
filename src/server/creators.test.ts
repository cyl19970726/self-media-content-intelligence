import { describe, expect, it } from "vitest";
import { mergeCreatorSummaries, loadCreatorSummaries } from "./creators.js";

const hasExternalEvidence = Boolean(process.env.SIGNAL_ROOM_EVIDENCE_ROOT);
const describeWithExternalEvidence = hasExternalEvidence ? describe : describe.skip;
const describeWithoutExternalEvidence = hasExternalEvidence ? describe.skip : describe;

describeWithExternalEvidence("loadCreatorSummaries", () => {
  it("keeps the three established creators first and registers verified next-wave artifacts", () => {
    const summaries = loadCreatorSummaries();
    expect(summaries.slice(0, 3).map((summary) => summary.id)).toEqual(["ai-red-witch", "zhang-zala", "human-director"]);
    expect(summaries.map((summary) => summary.id)).toContain("xiaohui-doctor");
    expect(summaries.find((summary) => summary.id === "xiaohui-doctor")?.summary).toContain("240/251");
  });

  it("every summary satisfies the card contract", () => {
    for (const summary of loadCreatorSummaries()) {
      expect(summary.name.length).toBeGreaterThan(0);
      expect(summary.positioning.length).toBeGreaterThan(0);
      expect(summary.summary.length).toBeGreaterThan(0);
      expect(summary.tags.length).toBeGreaterThan(0);
      expect(summary.stats.length).toBeGreaterThan(0);
      expect(summary.entries.length).toBeGreaterThan(0);
      for (const entry of summary.entries) expect(entry.href).toMatch(/^\/(research|creators)\//);
    }
  });
});

describeWithoutExternalEvidence("loadCreatorSummaries without an external Evidence store", () => {
  it("degrades to an empty creator catalog instead of inventing research projections", () => {
    expect(loadCreatorSummaries()).toEqual([]);
  });
});

it("uses one current profile entry and retains a separate historical sample link", () => {
  const base = { name: "同一博主", followers: "未知", likesAndCollections: "未知", positioning: "待核对",
    summary: "历史62条", tags: ["历史"], stats: [{ label: "作品", value: "62" }],
    entries: [{ label: "旧报告", href: "/creators/old-slug", note: "原始样本" }] };
  const legacy = { ...base, id: "old-slug", profileUrl: "https://www.xiaohongshu.com/user/profile/abc/?source=old" };
  const current = { ...base, id: "abc", profileUrl: "https://xiaohongshu.com/user/profile/abc",
    entries: [{ label: "当前批次", href: "/creators/abc?run=current-run", note: "194条" }] };
  const result = mergeCreatorSummaries([legacy], [current]);
  expect(result).toHaveLength(1);
  expect(result[0]?.entries.map(entry => entry.href)).toEqual(["/creators/abc?run=current-run", "/creators/old-slug"]);
  expect(result[0]?.entries[1]?.label).toContain("62");
});
