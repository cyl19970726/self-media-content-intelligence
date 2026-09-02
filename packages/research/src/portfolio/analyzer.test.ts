import { describe, expect, it } from "vitest";
import {
  buildCreatorPortfolio,
  refineDeepSelectionForVerifiedMedia,
  refineDeepSelectionForVerifiedVideos
} from "./analyzer.js";

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
  it("builds one canonical 21-record selection with four three-item deep groups", () => {
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
    for (const group of ["high", "median", "mean", "low"] as const) {
      expect(selection.items.filter((item) => item.deepGroups.includes(group))).toHaveLength(3);
    }
    expect(selection.items.some((item) => item.anchors.includes("median_near"))).toBe(true);
    expect(selection.items.some((item) => item.anchors.includes("mean_near"))).toBe(true);
  });

  it("keeps median and arithmetic-mean groups separate when the distribution is skewed", () => {
    const values = [...Array.from({ length: 24 }, (_, index) => (index + 1) * 10), 1000, 1100, 1200, 1300, 1400, 1500];
    const { selection } = buildCreatorPortfolio(inventory(values),
      "/artifacts/11111111-1111-4111-8111-111111111111/creator-inventory.json", "2026-08-20T01:00:00.000Z");
    expect(selection.items.filter((item) => item.deepCandidate)).toHaveLength(12);
    expect(new Set(selection.items.filter((item) => item.deepGroups.includes("median")).map((item) => item.externalId)))
      .not.toEqual(new Set(selection.items.filter((item) => item.deepGroups.includes("mean")).map((item) => item.externalId)));
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

  it("removes image posts from the deep video set after detail verification", () => {
    const values = [...Array.from({ length: 24 }, (_, index) => (index + 1) * 10), 1000, 1100, 1200, 1300, 1400, 1500];
    const { selection } = buildCreatorPortfolio(inventory(values),
      "/artifacts/11111111-1111-4111-8111-111111111111/creator-inventory.json", "2026-08-20T01:00:00.000Z");
    const formerLow = selection.items.find((item) => item.deepGroups.includes("low"));
    expect(formerLow).toBeDefined();
    const mediaTypes = new Map<string, "video" | "image" | "unknown">(
      selection.items.map((item) => [item.externalId, "video" as const])
    );
    mediaTypes.set(formerLow!.externalId, "image");
    const refined = refineDeepSelectionForVerifiedVideos(selection, mediaTypes, "2026-08-20T02:00:00.000Z");
    expect(refined.ruleVersion).toBe("four-groups-video-refined-v3");
    expect(refined.items.find((item) => item.externalId === formerLow!.externalId)?.deepCandidate).toBe(false);
    expect(refined.items.find((item) => item.externalId === formerLow!.externalId)?.mediaType).toBe("image");
    expect(refined.items.filter((item) => item.deepCandidate).every((item) => item.mediaType === "video")).toBe(true);
    expect(refined.items.filter((item) => item.deepGroups.includes("low"))).toHaveLength(3);
  });

  it("uses image posts as the four-group deep carrier for an image-only portfolio", () => {
    const values = Array.from({ length: 30 }, (_, index) => (index + 1) * 100);
    const { selection } = buildCreatorPortfolio(inventory(values),
      "/artifacts/11111111-1111-4111-8111-111111111111/creator-inventory.json", "2026-08-20T01:00:00.000Z");
    const mediaTypes = new Map<string, "video" | "image" | "unknown">(
      selection.items.map((item) => [item.externalId, "image" as const])
    );
    const refined = refineDeepSelectionForVerifiedMedia(selection, mediaTypes, "2026-08-20T02:00:00.000Z");
    expect(refined.ruleVersion).toBe("four-groups-media-refined-v4");
    expect(refined.items.filter((item) => item.deepCandidate).every((item) => item.mediaType === "image")).toBe(true);
    for (const group of ["high", "median", "mean", "low"] as const) {
      expect(refined.items.filter((item) => item.deepGroups.includes(group))).toHaveLength(3);
    }
  });
});
