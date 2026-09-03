import { ArrowRight } from "lucide-react";
import type { VideoResearch } from "../../shared/contracts/core";
import { firstFrameForRange, timestamp } from "./video-reader-utils";

export function DirectingStoryReport({ data }: { data: VideoResearch }) {
  const logic = data.directingLogic;
  return <section className="reader-section directing-story" id="directing" aria-labelledby="directing-title">
    <header><span>03</span><div><p>编导逻辑</p><h2 id="directing-title">观众是怎样被一步步带过去的</h2></div></header>
    <div className="viewer-journey">
      <article><span>观看前</span><p>{logic.viewerBefore ?? "现有证据未登记"}</p></article>
      <ArrowRight aria-hidden="true"/>
      <article><span>观看后</span><p>{logic.viewerAfter ?? "现有证据未登记"}</p></article>
    </div>
    <div className="story-spine">
      {logic.stages.map((stage, index) => {
        const frame = firstFrameForRange(data, stage.evidenceRefs, stage.start, stage.end);
        return <article key={`${stage.label}-${index}`}>
          <div className="story-spine__time"><b>{String(index + 1).padStart(2, "0")}</b><time>{timestamp(stage.start)}–{timestamp(stage.end)}</time></div>
          <div className="story-spine__copy"><h3>{stage.label}</h3>{stage.viewerQuestion && <strong>{stage.viewerQuestion}</strong>}<p>{stage.function}</p>{stage.cognitiveChange && <small>认知变化：{stage.cognitiveChange}</small>}</div>
          {frame && <figure><img src={frame.src} loading="lazy" alt={`${stage.label}阶段，${timestamp(frame.time)}`}/><figcaption>{stage.label} · {timestamp(frame.time)}</figcaption></figure>}
        </article>;
      })}
    </div>
    <div className="reader-callout"><span>编导判断</span><p>{logic.loadAndPayoff.compression}</p><p>{logic.loadAndPayoff.payoffDistance}</p></div>
  </section>;
}
