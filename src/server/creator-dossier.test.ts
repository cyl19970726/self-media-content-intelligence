import { describe, expect, it } from "vitest";
import type { CreatorResearchRun } from "../../packages/contracts/index.js";
import type { CreatorResearchService } from "../../packages/research/index.js";
import { loadCreatorDossier } from "./creator-dossier.js";

const runId = "00000000-0000-4000-8000-000000000071";

function run(): CreatorResearchRun {
  return {
    schemaVersion: "1.3.0", id: runId, platform: "xiaohongshu", profileUrl: "https://example.com/creator", status: "reviewable",
    currentStage: "dashboard", createdAt: "2026-09-14T00:00:00.000Z", updatedAt: "2026-09-14T00:00:00.000Z",
    creatorId: "fixture-creator", creatorName: "Fixture creator", dashboardPath: null,
    source: { kind: "live_collection", sourceRefs: [], importedAt: null }, canonicalSlug: "fixture-creator",
    publicProfile: { bio: null, followers: null, likesAndCollections: null, displayedPostCount: 5, identityAnchors: [] },
    stages: [], coverage: { discoveredPosts: 5, enrichedPosts: 0, comparisonPosts: 2, reconstructedPosts: 0 },
    collectionPolicy: { adapter: "redfox", browserProfile: null, readOnly: true, incremental: true, bypassChallenges: false,
      cacheTtlHours: 24, budgets: { maxScrollRounds: 30, maxDetailOpens: 24, maxMediaDownloads: 12 } },
    blockers: [], nextAction: "完成", lastSnapshotAt: "2026-09-14T00:00:00.000Z",
    worker: { state: "succeeded", attempt: 1, jobId: null, workerId: null, lastHeartbeatAt: null },
    videoWork: { concurrencyLimit: 3, activePostExternalIds: [], queuedPosts: 0, analyzedPosts: 0, failedPosts: 0 },
    inventoryArtifactRef: `/artifacts/${runId}/inventory.json`, portfolioArtifactRef: `/artifacts/${runId}/analysis.json`,
    selectionArtifactRef: `/artifacts/${runId}/selection.json`, detailArtifactRef: null, mediaManifestArtifactRef: `/artifacts/${runId}/media.json`,
    reconstructionBatchArtifactRef: null, synthesisArtifactRef: null, synthesisGateArtifactRef: null, portfolioAnnotationsArtifactRef: `/artifacts/${runId}/annotations.json`,
    browserTaskSpaceId: null
  };
}

function annotation(postExternalId: string, likes: number | null, mediaType: "video" | "image", topic: string, format: string) {
  return {
    postExternalId, likes, mediaType, classification: "classified", sourceUrl: `https://example.com/${postExternalId}`,
    title: topic, confidence: "medium", evidenceScope: ["title"], audienceProblems: [], promises: [], values: [], proofModes: [],
    visualSignals: [], contentArchitectureSignals: [], conflicts: [], unknowns: ["正文未知"],
    topics: [{ value: topic, evidenceRefs: [`inventory#/records/${postExternalId}/title`] }],
    formats: [{ value: format, evidenceRefs: [`inventory#/records/${postExternalId}/title`] }]
  };
}

function service() {
  const currentRun = run();
  return {
    get: (id: string) => id === runId ? currentRun : null,
    list: () => [currentRun],
    portfolio: () => ({
      analysis: {
        metricCoverage: { known: 4, missing: 1, rate: 0.8 }, likes: { median: 25, mean: 25, max: 40, p25: 17.5, p75: 32.5 },
        interpretationBoundary: "公开点赞只描述已观察表现。", unknowns: [], stopReason: "explicit_end", corpusCompleteness: "observed_converged"
      },
      annotations: {
        denominator: { observedPosts: 5, annotatedPosts: 5, classifiedPosts: 5, unclassifiedPosts: 0, parity: true },
        rows: [
          annotation("ready-video", 10, "video", "Agent", "教程"),
          annotation("missing-video", 20, "video", "Agent", "教程"),
          annotation("image", 30, "image", "工具", "对比"),
          annotation("another-video", 40, "video", "工具", "对比"),
          annotation("unknown", null, "image", "未归类主题", "图文（内容形式未知）")
        ]
      },
      selection: { items: [
        { externalId: "ready-video", title: "已就绪视频", url: "https://example.com/ready", mediaType: "video", likes: 10, tier: "high", tierRank: 1, anchors: [], deepCandidate: true, selectionReason: "fixture" },
        { externalId: "missing-video", title: "缺失视频", url: "https://example.com/missing", mediaType: "video", likes: 20, tier: "base", tierRank: 1, anchors: [], deepCandidate: true, selectionReason: "fixture" }
      ] },
      details: { posts: [] }, reconstructionBatch: null, synthesis: null,
      mediaManifest: { items: [
        { externalId: "ready-video", state: "verified_complete", videoArtifactRef: `/artifacts/${runId}/deep-media/ready-video/source-video.mp4`, coverArtifactRef: null, durationSeconds: 12 },
        { externalId: "missing-video", state: "missing", videoArtifactRef: null, coverArtifactRef: null, durationSeconds: null }
      ] }
    })
  } as unknown as CreatorResearchService;
}

describe("creator dossier projection", () => {
  it("projects deterministic corpus statistics and annotation clusters", () => {
    const dossier = loadCreatorDossier(service(), runId)!;
    expect(dossier.corpus).toMatchObject({ videoCount: 3, percentiles: { p25: 17.5, p75: 32.5 } });
    expect(dossier.corpus.distribution).toEqual([
      { label: "低于 P25", count: 1, share: 0.25 }, { label: "P25–P75", count: 2, share: 0.5 }, { label: "高于 P75", count: 1, share: 0.25 }
    ]);
    expect(dossier.contentSystem.topicClusters).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "Agent", count: 2, share: 0.4, measuredCount: 2, medianLikes: 15, highCount: null })
    ]));
    expect(dossier.contentSystem.formatClusters).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "教程", count: 2, meanLikes: 15 })
    ]));
  });

  it("only exposes a verified, run-local source-video artifact", () => {
    const dossier = loadCreatorDossier(service(), runId)!;
    expect(dossier.portfolio.items.find((item) => item.id === "ready-video")?.localVideoHref)
      .toBe(`/artifacts/${runId}/deep-media/ready-video/source-video.mp4`);
    expect(dossier.portfolio.items.find((item) => item.id === "missing-video")?.localVideoHref).toBeNull();
  });
});
