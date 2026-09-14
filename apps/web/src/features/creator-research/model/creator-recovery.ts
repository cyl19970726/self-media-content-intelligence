import type { CreatorResearchRun, CreatorRunOperation, CreatorRunOperationAction } from "../../../shared/contracts/core";

export type CreatorRecoveryPresentation = {
  action: CreatorRunOperationAction;
  label: string;
  help: string;
};

export function creatorRecoveryPresentation(
  run: CreatorResearchRun,
  operation: CreatorRunOperation | null
): CreatorRecoveryPresentation | null {
  if (!operation) return null;
  if (operation.resolutionState === "waiting_external") return {
    action: "resume",
    label: "采集服务已恢复，继续",
    help: "只在采集服务连接或配置已经修复后点击；继续会重新请求采集，并复用已有证据。"
  };
  if (operation.action === "none") return null;
  return {
    action: operation.action,
    label: operation.actionLabel ?? "继续任务",
    help: run.status === "needs_user"
      ? "在已交接的小红书页面完成提示动作后，再从这里恢复同一任务。"
      : operation.action === "retry_failed_videos"
        ? `复用 ${run.videoWork.analyzedPosts} 条已构建结果，只重试未通过视频。`
        : "从当前失败或退避节点继续，已有证据不会被覆盖。"
  };
}
