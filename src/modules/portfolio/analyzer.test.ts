import { describe, expect, it } from "vitest";
import { buildCreatorPortfolio } from "./analyzer.js";

function inventory(likes: Array<number | null>) {
  return {
    schemaVersion: "1.1.0",
    runId: "11111111-1111-4111-8111-111111111111",
    capturedAt: "2026-08-20T00:00:00.000Z",
    sourceUrl: "https://www.xiaohongshu.com/user/profile/test",
    finalUrl: "https://www.xiaohongshu.com/user/profile/test",
    creatorId: "test",
    creatorName: "测试博主",
    stopReason: "quiescent_incomplete",
    posts: likes.map((value, index) => ({
      externalId: `post-${String(index + 1).padStart(2, "0")}`,
      url: `https://www.xiaohongshu.com/explore/post-${index + 1}`,
      title: `作品 ${index + 1}`,
      visibleText: value === null ? `作品 ${index + 1}` : `作品 ${index + 1}\n${value}`,
      mediaType: index % 4 === 0 ? "unknown" : "video",
      likesLabel: value === null ? null : String(value),
      likes: value
    })),
    warnings: []
  };
}

describe("buildCreatorPortfolio", () => {
  it("builds one canonical 21-record selection with 9 deep candidates", () => {
    const values = Array.from({ length: 30 }, (_, index) => (index + 1) * 100);
    const { corpus, selection } = buildCreatorPortfolio(
      inventory(values),
      "/artifacts/11111111-1111-4111-8111-111111111111/creator-inventory.json",
      "2026-08-20T01:00:00.000Z"
    );

    expect(corpus.likes.median).toBe(1550);
    expect(corpus.likes.mean).toBe(1550);
    expect(corpus.likes.max).toBe(3000);
    expect(selection.items).toHaveLength(21);
    expect(new Set(selection.items.map((item) => item.externalId)).size).toBe(21);
    expect(selection.tierCounts).toEqual({ high: 7, base: 7, low: 7 });
    expect(selection.items.filter((item) => item.deepCandidate)).toHaveLength(9);
    expect(selection.items.some((item) => item.anchors.includes("median_near"))).toBe(true);
    expect(selection.items.some((item) => item.anchors.includes("mean_near"))).toBe(true);
  });

  it("keeps missing public likes unknown instead of coercing them to zero", () => {
    const { corpus, selection } = buildCreatorPortfolio(
      inventory([null, 10, 20, 30, null, 40, 50, 60, 70]),
      "/artifacts/11111111-1111-4111-8111-111111111111/creator-inventory.json",
      "2026-08-20T01:00:00.000Z"
    );

    expect(corpus.denominator.likesMissing).toBe(2);
    expect(corpus.likes.min).toBe(10);
    expect(selection.denominator.excludedMissingLikes).toBe(2);
    expect(selection.items.some((item) => item.likes === null)).toBe(false);
    expect(corpus.unknowns.join(" ")).toMatch(/未按 0/);
  });

  it("declares a mean gap when head outliers make the mean non-representative", () => {
    const { selection } = buildCreatorPortfolio(
      inventory([10, 11, 12, 13, 14, 15, 16, 10_000]),
      "/artifacts/11111111-1111-4111-8111-111111111111/creator-inventory.json",
      "2026-08-20T01:00:00.000Z"
    );

    expect(selection.anchors.meanGap).toBe(true);
    expect(selection.anchors.meanNearPostId).toBeNull();
    expect(selection.anchors.meanGapReason).toMatch(/极值/);
  });
});
