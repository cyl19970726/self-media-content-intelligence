import type { CreatorAcquisitionAdapter, CreatorResearchRun, CreatorResearchStatus } from "../../../shared/contracts/core";

export type IntakeValidation =
  | { valid: true; normalizedUrl: string }
  | { valid: false; message: string };

export type TaskPhaseState = "pending" | "running" | "complete" | "blocked" | "failed";

export type TaskPhase = {
  id: "queue" | "collection" | "tiering" | "reconstruction" | "synthesis" | "completion";
  label: string;
  detail: string;
  state: TaskPhaseState;
};

const terminalStatuses: CreatorResearchStatus[] = ["ready", "reviewable", "failed", "needs_user"];

function canonicalUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    const supported = host === "xhslink.cn"
      ? url.pathname.length > 1
      : (host === "xiaohongshu.com" || host.endsWith(".xiaohongshu.com")) && url.pathname.startsWith("/user/profile/");
    if (!supported) return null;
    url.hostname = host;
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch {
    return null;
  }
}

export function validateCreatorProfileUrl(value: string): IntakeValidation {
  if (!value.trim()) return { valid: false, message: "请粘贴小红书博主主页链接。" };
  const normalizedUrl = canonicalUrl(value);
  return normalizedUrl
    ? { valid: true, normalizedUrl }
    : { valid: false, message: "请使用小红书博主主页链接，或 xhslink.cn 的主页分享链接。" };
}

export function findExistingCreatorRun(
  runs: CreatorResearchRun[] | null,
  profileUrl: string,
  adapter?: CreatorAcquisitionAdapter
): CreatorResearchRun | null {
  const validation = validateCreatorProfileUrl(profileUrl);
  if (!validation.valid) return null;
  return runs?.find((run) => canonicalUrl(run.profileUrl) === validation.normalizedUrl
    && (adapter === undefined || run.collectionPolicy.adapter === adapter)) ?? null;
}

function phaseState(run: CreatorResearchRun, stageIds: CreatorResearchRun["stages"][number]["id"][]): TaskPhaseState {
  const stages = run.stages.filter((stage) => stageIds.includes(stage.id));
  if (stages.some((stage) => stage.status === "failed")) return "failed";
  if (stages.some((stage) => stage.status === "blocked")) return "blocked";
  if (stages.some((stage) => stage.status === "running")) return "running";
  if (stages.length > 0 && stages.every((stage) => stage.status === "complete" || stage.status === "skipped")) return "complete";
  return "pending";
}

export function taskPhases(run: CreatorResearchRun): TaskPhase[] {
  const queueState: TaskPhaseState = run.status === "queued" && run.stages.every((stage) => stage.status === "pending")
    ? "running"
    : terminalStatuses.includes(run.status) || run.stages.some((stage) => stage.status !== "pending")
      ? "complete"
      : "pending";
  return [
    { id: "queue", label: "排队", detail: "持久队列等待或已被 Worker 接管", state: queueState },
    { id: "collection", label: "采集", detail: "身份/登录预检与公开作品清单", state: phaseState(run, ["preflight", "inventory"]) },
    { id: "tiering", label: "分层", detail: "全量统计与 High / Base / Low 选择集", state: phaseState(run, ["tiering"]) },
    { id: "reconstruction", label: "深度重建", detail: "选择集详情、媒体核验与重点视频还原", state: phaseState(run, ["deep_capture"]) },
    { id: "synthesis", label: "合成", detail: "账号定位、价值与内容系统归纳", state: phaseState(run, ["synthesis"]) },
    { id: "completion", label: "完成", detail: "发布到同一 Dashboard", state: phaseState(run, ["dashboard"]) }
  ];
}

export function taskEstimateLabel(): string {
  return "预计耗时：未知（当前任务接口未提供可验证的历史估算）。";
}

export function failureReason(run: CreatorResearchRun): string | null {
  if (!(["failed", "needs_user", "backoff", "reviewable"] as CreatorResearchStatus[]).includes(run.status)) return null;
  return run.blockers[0]?.message ?? (run.status === "reviewable" ? "任务未发布，但接口没有返回具体阻塞原因。" : "任务状态异常，但接口没有返回具体失败原因。");
}

export function completionNotice(run: CreatorResearchRun): string | null {
  const completion = taskPhases(run).find((phase) => phase.id === "completion");
  if (completion?.state === "complete" && run.status === "ready") return "研究已完成并发布到同一工作台。";
  if (run.status === "reviewable") return "任务进入可复核状态；尚未宣称研究已发布。";
  return null;
}
