import { describe, expect, it } from "vitest";
import { loadCreatorSummaries } from "./creators.js";

describe("loadCreatorSummaries", () => {
  it("loads the three active creators from repo artifacts", () => {
    const summaries = loadCreatorSummaries();
    expect(summaries.map((summary) => summary.id)).toEqual(["ai-red-witch", "zhang-zala", "human-director"]);
  });

  it("every summary satisfies the card contract", () => {
    for (const summary of loadCreatorSummaries()) {
      expect(summary.name.length).toBeGreaterThan(0);
      expect(summary.positioning.length).toBeGreaterThan(0);
      expect(summary.summary.length).toBeGreaterThan(0);
      expect(summary.tags.length).toBeGreaterThan(0);
      expect(summary.stats.length).toBeGreaterThan(0);
      expect(summary.entries.length).toBeGreaterThan(0);
      for (const entry of summary.entries) {
        expect(entry.href).toMatch(/^\/research\//);
      }
    }
  });
});
