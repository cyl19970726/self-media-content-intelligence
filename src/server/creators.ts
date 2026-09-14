import { formatCount } from "./creator-meta.js";
import type { CreatorSummary } from "../shared/schema.js";
import type { CreatorResearchService } from "../../packages/research/index.js";

function versionedRunSummaries(service: CreatorResearchService): CreatorSummary[] {
  const newestByCreator = new Map<string, ReturnType<CreatorResearchService["list"]>[number]>();
  for (const run of service.list(100)) {
    const id = run.creatorId;
    if (!id || !run.creatorName || newestByCreator.has(id)) continue;
    newestByCreator.set(id, run);
  }
  return [...newestByCreator.values()].map((run): CreatorSummary => ({
    id: run.canonicalSlug ?? run.creatorId as string,
    name: run.creatorName as string,
    followers: formatCount(run.publicProfile.followers),
    likesAndCollections: formatCount(run.publicProfile.likesAndCollections),
    profileUrl: run.profileUrl,
    positioning: run.status === "ready"
      ? "版本化研究已通过博主级硬闸。"
      : "公开基本盘已进入版本化任务；账号定位与内容机制等待深度证据闭环。",
    summary: `${run.coverage.discoveredPosts} 条作品已登记；${run.coverage.comparisonPosts} 条进入比较；${run.coverage.reconstructedPosts} 条已构建单帖（独立评估另计）。当前状态：${run.status}。`,
    tags: ["版本化 Run", "Artifact 已登记", ({ ready: "原研究评估通过", reviewable: "报告可审阅", failed: "任务失败", stale: "需刷新", needs_user: "等待人工恢复", queued: "等待执行", backoff: "等待重试", preflight: "预检中", collecting: "执行中" })[run.status]],
    stats: [
      { label: "已登记作品", value: String(run.coverage.discoveredPosts) },
      { label: "比较样本", value: String(run.coverage.comparisonPosts) },
      { label: "已构建单帖", value: String(run.coverage.reconstructedPosts) }
    ],
    entries: [{ label: "查看当前研究批次", href: `/creators/${run.canonicalSlug ?? run.creatorId}?run=${encodeURIComponent(run.id)}`, note: `${run.lastSnapshotAt ?? run.createdAt} · ${run.nextAction}` }]
  }));
}

export function loadCreatorSummaries(service?: CreatorResearchService): CreatorSummary[] {
  return service ? versionedRunSummaries(service) : [];
}
