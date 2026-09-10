import { contentRangeGaps } from "./report-reading-utils";
import type { VideoResearch } from "../../shared/contracts/core";
import { timestamp } from "./video-reader-utils";

export function ReportCoverageNotice({ data }: { data: VideoResearch }) {
  if (!data.contentBlocks.length) return null;
  const { outOfOrder, gaps } = contentRangeGaps(data.contentBlocks, data.visualEditing.analyzedDuration);
  if (!outOfOrder && !gaps.length) return null;
  return <aside className="report-coverage"><b>阅读提示 · 时间范围检查</b>
    {outOfOrder && <p>内容块未按时间先后排列，以下保留原报告顺序。</p>}
    {!!gaps.length && <p>以下时段没有内容块覆盖：{gaps.map(gap => `${timestamp(gap.start)}–${timestamp(gap.end)}`).join("、")}。这是已标注时间范围的缺口，是否遗漏内容需回看原视频确认。</p>}
  </aside>;
}
