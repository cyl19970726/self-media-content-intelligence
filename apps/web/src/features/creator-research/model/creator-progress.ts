import type { CreatorDossier, CreatorResearchRun } from "../../../shared/contracts/core";

export type CreatorProgressState = "已完成" | "已跳过" | "等待执行" | "执行中" | "失败" | "待处理" | "未开始";

export type CreatorProgressRow = {
  id: CreatorResearchRun["stages"][number]["id"];
  label: string;
  state: CreatorProgressState;
  detail: string;
  current: boolean;
};

export type CreatorProgressModel = {
  headline: string;
  detail: string;
  rows: CreatorProgressRow[];
};

const stages: Array<{ id: CreatorProgressRow["id"]; label: string }> = [
  { id: "preflight", label: "身份核验" },
  { id: "inventory", label: "作品采集" },
  { id: "tiering", label: "分层选样" },
  { id: "deep_capture", label: "单帖分析" },
  { id: "synthesis", label: "博主综合" },
  { id: "dashboard", label: "研究交付" }
];

function currentState(run: CreatorResearchRun, id: CreatorProgressRow["id"]): CreatorProgressState {
  const stage = run.stages.find((item) => item.id === id);
  if (stage?.status === "complete") return "已完成";
  if (stage?.status === "skipped") return "已跳过";
  if (stage?.status === "failed") return "失败";
  if (stage?.status === "blocked") return "待处理";
  if (id !== run.currentStage) return stage?.status === "running" ? "执行中" : "未开始";
  if (run.status === "failed" || run.worker.state === "failed") return "失败";
  if (run.status === "needs_user" || run.status === "backoff" || run.worker.state === "needs_user" || run.worker.state === "backoff") return "待处理";
  if (id === "deep_capture") {
    if (run.videoWork.activePostExternalIds.length > 0) return "执行中";
    if (run.videoWork.queuedPosts > 0 || run.worker.state === "queued" || run.worker.state === "leased") return "等待执行";
  }
  if (run.worker.state === "running" || stage?.status === "running") return "执行中";
  return "等待执行";
}

function stageDetail(run: CreatorResearchRun, id: CreatorProgressRow["id"]): string {
  if (id === "inventory") {
    return `已发现 ${run.coverage.discoveredPosts} 篇作品，已采集 ${run.coverage.enrichedPosts} 篇详情。`;
  }
  if (id === "tiering") {
    return `已选出 ${run.coverage.comparisonPosts} 篇作品进入分层比较。`;
  }
  if (id === "deep_capture") {
    const work = run.videoWork;
    return `${work.queuedPosts} 条等待执行，${work.activePostExternalIds.length} 条执行中，${work.analyzedPosts} 条已完成，${work.failedPosts} 条失败。`;
  }
  return ({
    preflight: "核对账号身份和主页访问条件。",
    synthesis: "汇总跨帖子、跨层级的博主研究结论。",
    dashboard: "整理并交付可阅读的博主研究。"
  } as const)[id];
}

function pipelineAssurance(data: CreatorDossier): string | null {
  const pipeline = data.pipeline;
  if (!pipeline) return null;
  const media = pipeline.stages.find((stage) => stage.id === "media_verification");
  const review = pipeline.stages.find((stage) => stage.id === "video_evaluation");
  const details: string[] = [];
  if (media?.state === "complete" && media.gateState === "passed") details.push("媒体核验已完成");
  else if (media?.state === "partial") details.push("媒体核验部分完成");
  else if (media?.state === "failed" || media?.state === "blocked") details.push("媒体核验存在阻塞");
  if (review?.state === "complete" && review.gateState === "passed") details.push("独立复核已完成");
  else if (review?.state === "running") details.push("独立复核正在进行");
  else if (review?.state === "failed" || review?.state === "blocked") details.push("独立复核存在待处理项");
  return details.length ? `${details.join("；")}。` : null;
}

export function creatorProgress(data: CreatorDossier): CreatorProgressModel {
  const run = data.run;
  if (!run) {
    return {
      headline: "尚无可追踪的研究任务",
      detail: "当前档案没有关联的研究运行记录，进度未知。",
      rows: stages.map((stage) => ({ ...stage, state: "未开始", detail: "未收到运行记录。", current: false }))
    };
  }

  const rows = stages.map((stage): CreatorProgressRow => ({
    ...stage,
    state: currentState(run, stage.id),
    detail: stageDetail(run, stage.id),
    current: stage.id === run.currentStage
  }));
  const failed = rows.find((row) => row.state === "失败");
  const current = rows.find((row) => row.current);
  const active = failed ?? current;
  const state = active?.state ?? "未开始";
  const headline = run.status === "ready"
    ? "研究已完成"
    : run.status === "reviewable"
      ? "研究结果待复核"
      : active
        ? state === "执行中" ? `正在${active.label}`
          : state === "失败" ? `停在${active.label}：执行失败`
            : state === "待处理" ? `停在${active.label}：等待处理`
              : state === "已完成" ? `${active.label}已完成，等待进入下一阶段`
                : `停在${active.label}：等待执行`
        : "研究进度未知";
  const blockers = run.blockers.map((blocker) => blocker.message).filter(Boolean);
  const assurance = pipelineAssurance(data);
  const failedMessage = failed
    ? run.stages.find((stage) => stage.id === failed.id)?.message
    : null;
  const currentDetail = !active ? "当前阶段未在运行记录中出现。"
    : state === "失败" ? blockers[0] ?? failedMessage ?? "当前阶段执行失败，尚未收到具体原因。"
      : state === "待处理" ? blockers[0] ?? "当前阶段需要处理后才能继续。"
        : run.currentStage === "deep_capture" && state === "等待执行" ? "等待执行单帖分析；完成后进入博主综合。"
          : run.currentStage === "deep_capture" && state === "执行中" ? "单帖分析正在执行；完成后进入博主综合。"
            : state === "已完成" && run.status === "ready" ? "全部研究阶段已完成并交付。"
              : `${active.label}${state}。`;
  const detail = [currentDetail, assurance].filter(Boolean).join(" ");
  return { headline, detail, rows };
}
