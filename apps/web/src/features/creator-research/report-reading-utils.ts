import type { VideoResearch } from "../../shared/contracts/core";
import { stageReadingLabel } from "./video-reader-utils";

export function overviewSourceTarget(pointer: string, data: VideoResearch): { lens: string; anchor: string; label: string } {
  const parts = pointer.split("/");
  const index = /^\d+$/.test(parts[4] ?? "") ? Number(parts[4]) : null;
  if (parts[2] === "contentRestoration") {
    const block = index !== null && parts[3] === "blocks" ? data.contentBlocks[index] : null;
    return { lens: "content", anchor: block ? `content-${block.id}` : parts[3] === "unknowns" ? "content-unknowns" : "content-summary", label: block?.title ?? "内容还原" };
  }
  if (parts[3] === "openingAnalysis") return { lens: "opening", anchor: "visual-opening", label: "开头拆解" };
  if (parts[3] === "packagingAnalysis") return { lens: "opening", anchor: "directing-packaging", label: "标题、封面与兑现" };
  if (parts[2] === "directingLogic") {
    const anchors: Record<string, string> = { viewerBefore: "journey", viewerAfter: "journey", informationDesign: "information", proofDesign: "proof", loadAndPayoff: "load", notes: "notes" };
    return { lens: "directing", anchor: parts[3] === "stages" && index !== null ? `directing-stage-${index + 1}` : `directing-${anchors[parts[3] ?? ""] ?? "overview"}`, label: parts[3] === "stages" && index !== null && data.directingLogic.stages[index] ? stageReadingLabel(data.directingLogic.stages[index]!.label) : "编导结构" };
  }
  const anchors: Record<string, string> = { carriers: "carriers", claims: "claims", shotSemantics: "semantics", uiProcedureStates: "ui-states", transitions: "transitions", rhythm: "rhythm", missingBridges: "continuity", audioRole: "audio", notes: "notes" };
  return { lens: "visual", anchor: `visual-${anchors[parts[3] ?? ""] ?? "overview"}`, label: ({ carriers: "画面载体", claims: "画面主张", shotSemantics: "镜头语义", uiProcedureStates: "界面操作状态", transitions: "关键转场", rhythm: "节奏与信息密度", missingBridges: "连续性缺口", audioRole: "声音", notes: "分析说明" } as Record<string, string>)[parts[3] ?? ""] ?? "画面与剪辑" };
}


export function contentRangeGaps(blocks: VideoResearch["contentBlocks"], duration: number | null) {
  const ranges = blocks.filter(block => block.type !== "unknown" && block.start !== null && block.end !== null).map(block => ({ start: block.start!, end: block.end! }));
  const outOfOrder = ranges.some((range, index) => index > 0 && range.start < ranges[index - 1]!.start);
  let cursor = 0;
  const gaps: Array<{ start: number; end: number }> = [];
  for (const range of [...ranges].sort((a, b) => a.start - b.start)) {
    if (range.start - cursor > 0.5) gaps.push({ start: cursor, end: range.start });
    cursor = Math.max(cursor, range.end);
  }
  if (duration !== null && duration - cursor > 0.5) gaps.push({ start: cursor, end: duration });
  return { outOfOrder, gaps };
}
