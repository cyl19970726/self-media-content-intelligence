import { describe, expect, it } from "vitest";
import type { CreatorResearchService } from "../creator-research/service.js";
import type { CreatorArtifactStore } from "../creator-research/artifact-store.js";
import type { ComparisonProject } from "./project-contracts.js";
import type { ComparisonProjectRepository } from "./repository.js";
import { ComparisonProjectService } from "./service.js";

const ids = ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"];

function portfolio(runId: string, name: string, median: number) {
  const selection = {
    schemaVersion: "1.0.0" as const, runId, generatedAt: "2026-08-20T00:00:00Z",
    sourceCorpusArtifactRef: `/artifacts/${runId}/corpus.json`, ruleVersion: "ranked-7x3-v1" as const,
    rules: { targetPerTier: 7 as const, deepCandidatesPerTier: 3 as const, high: "h", base: "b", low: "l", unknownMetricPolicy: "exclude_from_metric_tiering" as const },
    denominator: { discoveredPosts: 21, eligiblePosts: 21, selectedPosts: 21, excludedMissingLikes: 0 },
    anchors: { median, mean: median * 2, medianNearPostId: "m", meanNearPostId: "a", meanGap: false, meanGapReason: null },
    tierCounts: { high: 7, base: 7, low: 7 }, items: [], limitations: []
  };
  const analysis = {
    schemaVersion: "1.0.0" as const, runId, generatedAt: "2026-08-20T00:00:00Z",
    corpusArtifactRef: `/artifacts/${runId}/corpus.json`, selectionArtifactRef: `/artifacts/${runId}/selection.json`,
    metricCoverage: { known: 21, missing: 0, rate: 1 },
    likes: { min: 1, p25: 10, median, mean: median * 2, p75: median * 3, max: median * 20 },
    tierCounts: { high: 7, base: 7, low: 7 }, anchors: selection.anchors,
    interpretationBoundary: "只解释公开分布", unknowns: []
  };
  return {
    run: { id: runId, creatorName: name, portfolioArtifactRef: `/artifacts/${runId}/portfolio.json`, selectionArtifactRef: `/artifacts/${runId}/selection.json` },
    analysis, selection
  };
}

class MemoryRepository implements ComparisonProjectRepository {
  values = new Map<string, ComparisonProject>();
  save(project: ComparisonProject) { this.values.set(project.id, structuredClone(project)); }
  get(id: string) { const value = this.values.get(id); return value ? structuredClone(value) : null; }
  list() { return [...this.values.values()].map((value) => structuredClone(value)); }
  claimNext(workerId: string, at: string, leaseExpiresAt: string) {
    const project = this.list().find((value) => value.status === "queued") ?? null;
    if (!project) return null;
    project.status = "running";
    project.job = { state: "running", attempt: project.job.attempt + 1, leaseOwner: workerId, leaseExpiresAt, lastHeartbeatAt: at };
    this.save(project);
    return project;
  }
  heartbeat() { return true; }
  close() {}
}

describe("ComparisonProjectService", () => {
  it("pins exact creator revisions before the background comparison runs", () => {
    const snapshots = new Map([
      [ids[0]!, portfolio(ids[0]!, "甲", 100)],
      [ids[1]!, portfolio(ids[1]!, "乙", 200)]
    ]);
    const creators = { portfolio: (id: string) => snapshots.get(id) ?? null } as unknown as CreatorResearchService;
    const values = new Map<string, unknown>();
    const artifacts: CreatorArtifactStore = {
      write(runId, filename, value) { const ref = `/artifacts/${runId}/${filename}`; values.set(ref, structuredClone(value)); return ref; },
      read(reference) { const value = values.get(reference); if (!value) throw new Error("missing artifact"); return structuredClone(value); }
    };
    const repository = new MemoryRepository();
    const service = new ComparisonProjectService(creators, repository, artifacts);
    const project = service.create({ name: "AI 博主对照", creatorRunIds: ids });

    expect(project.status).toBe("queued");
    expect(project.members.map((member) => member.portfolioArtifactRef)).toEqual([
      `/artifacts/${ids[0]}/portfolio.json`, `/artifacts/${ids[1]}/portfolio.json`
    ]);
    expect(service.processNext("comparison-test")).toBe(true);
    const completed = service.get(project.id);
    expect(completed?.project.status).toBe("ready");
    expect(completed?.comparison?.members).toHaveLength(2);
    expect(completed?.comparison?.readiness).toBe("portfolio_only");
  });
});
