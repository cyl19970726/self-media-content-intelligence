import { describe, expect, it } from "vitest";
import { loadCreatorSummaries } from "./creators.js";

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
