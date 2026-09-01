import { describe, expect, it } from "vitest";
import { buildCreatorPortfolioAnnotations } from "./annotations.js";

const runId = "11111111-1111-4111-8111-111111111111";

describe("buildCreatorPortfolioAnnotations", () => {
  it("keeps strict ID parity and preserves unknowns for weak surface evidence", () => {
    const result = buildCreatorPortfolioAnnotations({
      schemaVersion: "1.0.0", runId, generatedAt: "2026-09-02T00:00:00.000Z", sourceArtifactRef: "inventory",
      denominator: { discoveredPosts: 2, likesKnown: 1, likesMissing: 1, likesCoverage: 0.5,
        stopReason: "budget_reached", corpusCompleteness: "bounded_partial" },
      likes: { min: 3, p25: 3, median: 3, mean: 3, p75: 3, max: 3 }, mediaTypes: { video: 2 },
      records: [
        { externalId: "a", url: "https://www.xiaohongshu.com/explore/a", title: "5分钟讲清楚 Model 和 Harness 的区别", visibleText: "same", mediaType: "video", likesLabel: "3", likes: 3 },
        { externalId: "b", url: "https://www.xiaohongshu.com/explore/b", title: "周末随手记", visibleText: "same", mediaType: "video", likesLabel: null, likes: null }
      ], unknowns: []
    }, "/artifacts/run/corpus.json", "2026-09-02T00:01:00.000Z");
    expect(result.denominator).toEqual({ observedPosts: 2, annotatedPosts: 2, classifiedPosts: 1, unclassifiedPosts: 1, parity: true });
    expect(new Set(result.rows.map((row) => row.postExternalId)).size).toBe(2);
    expect(result.rows[0]?.topics.map((field) => field.value)).toContain("AI 编程与开发");
    expect(result.rows[1]?.topics[0]?.value).toBe("未归类主题");
    expect(result.rows.every((row) => row.unknowns.length > 0)).toBe(true);
  });
});
