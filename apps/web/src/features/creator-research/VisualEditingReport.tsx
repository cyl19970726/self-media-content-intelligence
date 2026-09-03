import type { VideoResearch } from "../../shared/contracts/core";
import { firstFrameForRange, framesForRefs, timestamp } from "./video-reader-utils";

export function VisualEditingReport({ data }: { data: VideoResearch }) {
  const visual = data.visualEditing;
  return <section className="reader-section visual-story" id="visual-editing" aria-labelledby="visual-title">
    <header><span>04</span><div><p>画面与剪辑</p><h2 id="visual-title">画面不是装饰，它怎样承担信息</h2></div></header>
    <p className="visual-story__grammar">{visual.composition ?? "尚未形成可靠的画面语法结论。"}</p>
    <dl className="visual-facts"><div><dt>画幅</dt><dd>{visual.orientation ?? "未知"}</dd></div><div><dt>技术分段</dt><dd>{visual.shotCount ?? "—"}</dd></div><div><dt>每分钟变化</dt><dd>{visual.cutsPerMinute ?? "—"}</dd></div><div><dt>结果首次出现</dt><dd>{timestamp(visual.resultFirstAt)}</dd></div></dl>

    <div className="visual-sequence">
      {visual.shotSemantics.map((shot, index) => {
        const frame = firstFrameForRange(data, shot.evidenceRefs, shot.start, shot.end);
        return <article key={`${shot.start}-${index}`}>
          {frame && <figure><img src={frame.src} loading="lazy" alt={`${shot.role}画面，${timestamp(frame.time)}`}/><figcaption>{timestamp(frame.time)}</figcaption></figure>}
          <div><time>{timestamp(shot.start)}–{timestamp(shot.end)}</time><span>{shot.carrier}</span><h3>{shot.role}</h3><p>{shot.meaningChange}</p></div>
        </article>;
      })}
    </div>

    {visual.transitions.length > 0 && <div className="transition-strip"><header><span>关键转场</span><p>看清信息如何换挡，而不把剪辑后的相邻状态误当成连续操作。</p></header>{visual.transitions.map((transition, index) => {
      const frames = framesForRefs(data, transition.evidenceRefs, 2);
      const mechanism = transition.mechanism.replace(/[，。；、,.;\s]+$/u, "");
      return <article key={`${transition.start}-${index}`}><div><time>{timestamp(transition.start)}–{timestamp(transition.end)}</time><h3>{transition.from} → {transition.to}</h3><p>{mechanism}，{transition.function}</p></div><div className="transition-strip__frames">{frames.map((frame) => <figure key={frame.id}><img src={frame.src} loading="lazy" alt={`转场画面，${timestamp(frame.time)}`}/><figcaption>{timestamp(frame.time)}</figcaption></figure>)}</div></article>;
    })}</div>}

    {visual.rhythm.length > 0 && <div className="rhythm-line"><header><span>节奏</span><p>不是只报一个平均切换数，而是看每一段为什么快或慢。</p></header>{visual.rhythm.map((item, index) => <article key={`${item.start}-${index}`}><time>{timestamp(item.start)}–{timestamp(item.end)}</time><b>{item.pace}</b><span>{item.density}</span><p>{item.function}</p></article>)}</div>}

    {visual.missingBridges.length > 0 && <aside className="continuity-warning"><span>被剪掉的桥接</span>{visual.missingBridges.map((bridge, index) => <p key={`${bridge.start}-${index}`}><time>{timestamp(bridge.start)}–{timestamp(bridge.end)}</time>{bridge.statement.replace(/[，。；、,.;\s]+$/u, "")}；因此{bridge.impact}</p>)}</aside>}
    <p className="audio-boundary"><b>声音：</b>{visual.audioRole ?? "没有获得可判断其叙事功能的非旁白音频证据。"}</p>
  </section>;
}
