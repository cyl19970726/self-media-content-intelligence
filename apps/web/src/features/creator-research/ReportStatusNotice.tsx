import type { VideoResearch } from "../../shared/contracts/core";

export function ReportStatusNotice({ data }: { data: VideoResearch }) {
  const incompatible = data.quality.evaluationState === "failed" && ["ready", "verified"].includes(data.quality.aggregateState);
  if (!incompatible && !data.sourceRevision) return null;
  return <aside className="report-coverage">
    <b>报告与评估状态</b>
    {data.sourceRevision && <p>当前显示源报告修订版：{data.sourceRevision}。当前评估状态以本修订版的审计记录为准。</p>}
    {incompatible && <p>当前页面未取得可用的三部分独立评估。Builder 结论仍按原文显示；完整记录可在研究审计中查看。</p>}
  </aside>;
}
