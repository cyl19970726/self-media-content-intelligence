import type { VideoResearch } from "../../shared/contracts/core";

export function ReportFormatNotice({ data }: { data: VideoResearch }) {
  const legacy = data.reportFormat === 'legacy_report';
  const incompatible = data.quality.evaluationState === 'failed' && ['ready', 'verified'].includes(data.quality.aggregateState);
  if (!legacy && !incompatible && !data.sourceRevision) return null;
  return <aside className="report-coverage">
    <b>{legacy ? '历史格式 · 原始报告可阅读' : '报告与评估状态'}</b>
    {data.sourceRevision && <p>当前显示源报告修订版：{data.sourceRevision}。旧版与原评估保留；旧评估不构成本修订的验证。</p>}
    {legacy && <p>正文保留历史原文。编导与画面入口展示已保存的分析；未产出的当前字段不会自动补写。</p>}
    {incompatible && <p>原任务记录为“已通过”，但当前页面未取得可用的三部分独立评估。原任务记录不能替代当前三部分评估；这里保留原结论，当前评估不可用不表示旧评估判定失败。完整记录可在研究审计中查看。</p>}
    {legacy && data.quality.aggregateState === 'legacy_projection' && <p>这是历史材料的兼容显示。各部分原有评审范围与版本见研究审计；不等同于当前格式的完整评估。</p>}
  </aside>;
}
