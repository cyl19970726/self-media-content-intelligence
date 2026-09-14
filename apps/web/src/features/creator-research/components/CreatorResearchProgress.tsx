import type { ReactNode } from "react";
import type { CreatorDossier } from "../../../shared/contracts/core";
import { creatorProgress } from "../model/creator-progress";

export function CreatorResearchProgress({ data, children }: { data: CreatorDossier; children?: ReactNode }) {
  const progress = creatorProgress(data);
  return <section className="creator-progress-reading" aria-labelledby="research-progress-title">
    <header><span>研究进度</span><h2 id="research-progress-title">{progress.headline}</h2><p>{progress.detail}</p></header>
    <ol className="creator-progress-steps">{progress.rows.map((row, index) => <li key={row.id} aria-current={row.current ? "step" : undefined}>
      <span className="creator-progress-number">{String(index + 1).padStart(2, "0")}</span>
      <strong>{row.label}</strong><span className="creator-progress-state">{row.state}</span><p>{row.detail}</p>
    </li>)}</ol>
    {children}
  </section>;
}

const stateLabels = { pending: "未开始", running: "执行中", partial: "尚未齐全", complete: "已完成", blocked: "需要处理", failed: "失败", stale: "需要更新" } as const;
export function CreatorTechnicalChecks({ data }: { data: CreatorDossier }) {
  if (!data.pipeline) return null;
  return <details className="creator-technical-checks"><summary>查看检查明细与证据</summary>
    <p>以下是资料完整性和分析质量检查，不能用通过数量代表研究完成度。</p>
    <table><thead><tr><th>检查项</th><th>结果</th><th>记录与缺口</th></tr></thead><tbody>{data.pipeline.stages.map(stage => <tr key={stage.id}>
      <th scope="row">{stage.label}</th><td>{stateLabels[stage.state]}</td><td><p>{stage.message}</p>
        {stage.missingInputs.length > 0 && <p>仍缺：{stage.missingInputs.join("；")}</p>}
        {stage.artifactRefs.length > 0 && <details><summary>证据记录</summary>{stage.artifactRefs.map(ref => <p key={ref}><code>{ref}</code></p>)}</details>}
      </td></tr>)}</tbody></table>
  </details>;
}
