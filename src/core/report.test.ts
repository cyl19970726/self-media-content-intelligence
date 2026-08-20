import { describe, expect, it } from "vitest";
import { buildAnalysis, deriveMetrics } from "./report.js";
import { fixtureCollection } from "./fixtures.js";
import { parseSourceUrl } from "./url-router.js";
import { emptyContext } from "../shared/schema.js";

describe("deriveMetrics", () => {
  it("normalizes engagement and deep value by views", () => {
    const value = deriveMetrics({
      views: 1000, likes: 100, comments: 20, shares: 30, bookmarks: 50, quotes: 10, followers: 500
    });
    expect(value.engagementRate).toBe(21);
    expect(value.deepValueRate).toBe(8);
    expect(value.conversationRate).toBe(2);
    expect(value.amplificationRate).toBe(4);
  });

  it("does not invent ratios without views", () => {
    const value = deriveMetrics({
      views: null, likes: 100, comments: null, shares: null, bookmarks: null, quotes: null, followers: null
    });
    expect(value.engagementRate).toBeNull();
  });

  it("builds benchmark, script, audience, and causal evidence", () => {
    const fixture = fixtureCollection(parseSourceUrl("fixture://xiaohongshu/report-v2"));
    if (!fixture.source) throw new Error("fixture source missing");
    const report = buildAnalysis(fixture.source, null, fixture.context);
    expect(report.benchmark.status).toBe("ready");
    expect(report.benchmark.metrics.find((metric) => metric.key === "likes")?.topicPercentile).toBe(100);
    expect(report.dataAnalysis.totalInteractions).toBe(64_570);
    expect(report.dataAnalysis.highIntentInteractions).toBe(23_290);
    expect(report.dataAnalysis.completenessPercent).toBe(100);
    expect(report.dataAnalysis.interactionMix.find((metric) => metric.key === "likes")?.sharePercent).toBeCloseTo(60.55, 1);
    expect(report.dataAnalysis.indicators.find((metric) => metric.id === "engagement-rate")?.value).toBeCloseTo(8.87, 2);
    expect(report.dataAnalysis.indicators.find((metric) => metric.id === "save-like")?.formula).toBe("收藏 ÷ 点赞");
    expect(report.scriptAnalysis.segments.length).toBeGreaterThanOrEqual(3);
    expect(report.audienceAnalysis.sampleSize).toBe(12);
    expect(report.audienceAnalysis.themes.some((theme) => theme.intent === "follow-up")).toBe(true);
    expect(report.causalModel.some((node) => node.status === "unknown")).toBe(true);
    expect(report.causalModel.find((node) => node.id === "packaging-entry")?.status).toBe("plausible");
    expect(report.trafficQuality.verdict).toBe("大流量、深度互动倾向较强，但真实流量质量尚未闭环。");
    expect(report.trafficQuality.ratioBenchmarks.find((metric) => metric.id === "save-like")).toMatchObject({
      subject: 44.5, authorMedian: 31, topicMedian: 26, liftVsAuthorPercent: 43.5, liftVsTopicPercent: 71.2, status: "strong"
    });
    expect(report.trafficQuality.ratioBenchmarks.find((metric) => metric.id === "share-like")).toMatchObject({
      subject: 15.06, authorMedian: 11, topicMedian: 9.5, status: "strong"
    });
    expect(report.trafficQuality.dimensions.find((dimension) => dimension.id === "scale")?.status).toBe("strong");
    expect(report.trafficQuality.dimensions.find((dimension) => dimension.id === "depth")?.status).toBe("strong");
    expect(report.trafficQuality.dimensions.find((dimension) => dimension.id === "conversion")?.status).toBe("unknown");
    expect(report.trafficQuality.objectiveProfiles.find((profile) => profile.id === "authority")?.verdict).toContain("不能闭环");
    expect(report.creatorAnalysis).toMatchObject({ sampleSize: 8, status: "ready", stability: "mixed", hitRatePercent: 25 });
    expect(report.creatorAnalysis.topTwentySharePercent).toBeCloseTo(42.9, 1);
    expect(report.creatorAnalysis.repeatableSignals[0]).toContain("组合分布相对均衡");
  });

  it("keeps normalized quality unknown when comparison and owner data are absent", () => {
    const fixture = fixtureCollection(parseSourceUrl("fixture://xiaohongshu/report-v2"));
    if (!fixture.source) throw new Error("fixture source missing");
    const report = buildAnalysis(fixture.source, null, emptyContext());
    expect(report.trafficQuality.ratioBenchmarks.every((metric) => metric.status === "unknown")).toBe(true);
    expect(report.trafficQuality.dimensions.find((dimension) => dimension.id === "depth")?.status).toBe("unknown");
    expect(report.trafficQuality.dimensions.find((dimension) => dimension.id === "source")?.missing).toContain("各来源曝光占比");
    expect(report.creatorAnalysis.status).toBe("unavailable");
  });
});
