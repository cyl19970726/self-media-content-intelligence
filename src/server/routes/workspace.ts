import type express from "express";
import { workspaceOverviewSchema, type EvidenceAccessPort } from "../../../packages/contracts/index.js";
import type { AnalysisService } from "../../core/service.js";
import type { CreatorResearchService, ComparisonProjectService } from "../../../packages/research/index.js";
import type { PublishingService } from "../../../packages/creation/index.js";
import type { LearningLoopControlPlane } from "../learning-loop.js";

type WorkspaceDependencies = {
  analysis: AnalysisService;
  creators: CreatorResearchService;
  comparisons: ComparisonProjectService;
  learningLoop: LearningLoopControlPlane;
  knowledgeConcepts: () => Array<{ research: { concept: { status: string } } }>;
  publishing: PublishingService;
  evidence: EvidenceAccessPort;
};

function statusCounts(items: Array<{ status?: string }>): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    const status = item.status ?? "unknown";
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});
}

export function registerWorkspaceRoutes(app: express.Express, dependencies: WorkspaceDependencies): void {
  app.get("/api/v1/workspace-overview", (_request, response) => {
    const postRuns = dependencies.analysis.list(200);
    const creatorRuns = dependencies.creators.list(200);
    const comparisons = dependencies.comparisons.list(100);
    const learningLoops = dependencies.learningLoop.list(100);
    const concepts = dependencies.knowledgeConcepts();
    const contentPackages = dependencies.publishing.listPackages(200);
    const publications = dependencies.publishing.listRuns(200);
    const evidence = dependencies.evidence.summary();
    const recent = [
      ...postRuns.slice(0, 4).map((item) => ({ id: item.id, kind: "post" as const, title: item.title,
        meta: `${item.platform === "x" ? "X" : "小红书"} · ${item.authorName}`, status: item.status,
        updatedAt: item.updatedAt, href: `/runs/${item.id}` })),
      ...creatorRuns.slice(0, 4).map((item) => ({ id: item.id, kind: "creator" as const, title: item.creatorName ?? "等待识别博主",
        meta: `${item.coverage.discoveredPosts} 条作品 · ${item.coverage.reconstructedPosts} 条深度视频`, status: item.status,
        updatedAt: item.updatedAt, href: `/creators/${encodeURIComponent(item.creatorId ?? item.id)}` })),
      ...comparisons.slice(0, 2).map((item) => ({ id: item.id, kind: "comparison" as const, title: item.name,
        meta: `${item.members.length} 位博主`, status: item.status, updatedAt: item.updatedAt, href: `/comparisons/${item.id}` })),
      ...learningLoops.slice(0, 2).map((item) => ({ id: item.id, kind: "learning_loop" as const, title: item.policyVersion,
        meta: `${item.targetCreatorIds.length} 个目标`, status: item.status, updatedAt: item.updatedAt, href: `/learning-loop/${item.id}` }))
    ].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 8);
    return response.json(workspaceOverviewSchema.parse({
      generatedAt: new Date().toISOString(),
      evidence: { manifestEntries: evidence.manifestEntries, storeConfigured: evidence.storeConfigured, storeReadable: evidence.storeReadable },
      assets: {
        postRuns: { total: postRuns.length, statuses: statusCounts(postRuns) },
        creatorRuns: { total: creatorRuns.length, statuses: statusCounts(creatorRuns),
          discoveredPosts: creatorRuns.reduce((sum, item) => sum + item.coverage.discoveredPosts, 0),
          comparisonPosts: creatorRuns.reduce((sum, item) => sum + item.coverage.comparisonPosts, 0),
          reconstructedPosts: creatorRuns.reduce((sum, item) => sum + item.coverage.reconstructedPosts, 0) },
        comparisons: { total: comparisons.length, statuses: statusCounts(comparisons) },
        learningLoops: { total: learningLoops.length, statuses: statusCounts(learningLoops) },
        knowledge: { total: concepts.length, statuses: statusCounts(concepts.map((item) => ({ status: item.research.concept.status }))) },
        contentPackages: { total: contentPackages.length, statuses: {} },
        publications: { total: publications.length, statuses: statusCounts(publications) }
      }, recent
    }));
  });
}
