import { ArrowRight } from "lucide-react";
import type { VideoResearch } from "../../shared/contracts/core";
import { firstFrameForRange, timestamp } from "./video-reader-utils";

export function DirectingStoryReport({ data }: { data: VideoResearch }) {
  const logic = data.directingLogic;
  return <section className="reader-section directing-story" id="directing" aria-labelledby="directing-title">
    <header><span>02</span><div><p>Builder · 编导逻辑</p><h2 id="directing-title">观众是怎样被一步步带过去的</h2></div></header>
    <div className="viewer-journey" id="directing-journey">
      <article><span>观看前</span><p>{logic.viewerBefore ?? "现有证据未登记"}</p></article>
      <ArrowRight aria-hidden="true"/>
      <article><span>观看后</span><p>{logic.viewerAfter ?? "现有证据未登记"}</p></article>
    </div>
    <dl className="directing-overview" id="directing-overview">
      <div><dt>激活问题</dt><dd>{logic.activatedQuestion ?? "Builder 未产出"}</dd></div>
      <div><dt>内容承诺</dt><dd>{logic.promise ?? "Builder 未产出"}</dd></div>
      <div><dt>最终回报</dt><dd>{logic.payoff ?? "Builder 未产出"}</dd></div>
      <div><dt>结尾收束</dt><dd>{logic.endingResolution ?? "Builder 未产出"}</dd></div>
    </dl>
    <div className="story-spine">
      {logic.stages.map((stage, index) => {
        const frame = firstFrameForRange(data, stage.evidenceRefs, stage.start, stage.end);
        return <article id={`directing-stage-${index + 1}`} key={`${stage.label}-${index}`}>
          <div className="story-spine__time"><b>{String(index + 1).padStart(2, "0")}</b><time>{timestamp(stage.start)}–{timestamp(stage.end)}</time></div>
          <div className="story-spine__copy"><h3>{stage.label}</h3>{stage.viewerQuestion && <strong>{stage.viewerQuestion}</strong>}<p>{stage.function}</p><dl className="stage-details">{stage.proof && <div><dt>证明</dt><dd>{stage.proof}</dd></div>}{stage.cognitiveChange && <div><dt>认知变化</dt><dd>{stage.cognitiveChange}</dd></div>}{stage.comprehensionLoad && <div><dt>理解成本</dt><dd>{stage.comprehensionLoad}</dd></div>}{stage.payoff && <div><dt>阶段回报</dt><dd>{stage.payoff}</dd></div>}</dl></div>
          {frame && <figure><img src={frame.src} loading="lazy" alt={`${stage.label}阶段，${timestamp(frame.time)}`}/><figcaption>{stage.label} · {timestamp(frame.time)}</figcaption></figure>}
        </article>;
      })}
    </div>
    {logic.informationDesign.length > 0 && <div className="builder-statement-list" id="directing-information"><header><span>信息设计</span></header>{logic.informationDesign.map((item, index) => <article key={`${item.kind}-${index}`}><time>{timestamp(item.start)}–{timestamp(item.end)}</time><b>{item.kind}</b><p>{item.statement}</p></article>)}</div>}
    {logic.proofDesign.length > 0 && <div className="builder-statement-list" id="directing-proof"><header><span>证明设计</span></header>{logic.proofDesign.map((item, index) => <article key={`${item.proofType}-${index}`}><time>{timestamp(item.start)}–{timestamp(item.end)}</time><b>{item.proofType}</b><p>{item.statement}</p><small>边界：{item.boundary}</small></article>)}</div>}
    <div className="reader-callout" id="directing-load"><span>信息负荷与回报</span><p><b>压缩：</b>{logic.loadAndPayoff.compression}</p><p><b>重复：</b>{logic.loadAndPayoff.repetition}</p><p><b>回报距离：</b>{logic.loadAndPayoff.payoffDistance}</p>{logic.loadAndPayoff.comprehensionCosts.map((item) => <p key={item}><b>理解成本：</b>{item}</p>)}</div>
    {logic.notes.length > 0 && <aside className="builder-notes" id="directing-notes"><span>Builder 补充说明</span>{logic.notes.map((item) => <p key={item}>{item}</p>)}</aside>}
  </section>;
}
