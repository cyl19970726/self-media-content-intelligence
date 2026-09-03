import type { VideoResearch } from "../../shared/contracts/core";
import { firstFrameForRange, framesForRefs, timestamp } from "./video-reader-utils";

export function VisualEditingReport({ data }: { data: VideoResearch }) {
  const visual = data.visualEditing;
  return <section className="reader-section visual-story" id="visual-editing" aria-labelledby="visual-title">
    <header><span>03</span><div><p>Builder · 画面与剪辑</p><h2 id="visual-title">画面不是装饰，它怎样承担信息</h2></div></header>
    <div id="visual-overview"><p className="visual-story__grammar">{visual.composition ?? "尚未形成可靠的画面语法结论。"}</p>
    <dl className="visual-facts"><div><dt>画幅</dt><dd>{visual.orientation ?? "未知"}</dd></div><div><dt>技术分段</dt><dd>{visual.shotCount ?? "—"}</dd></div><div><dt>每分钟变化</dt><dd>{visual.cutsPerMinute ?? "—"}</dd></div><div><dt>分析时长</dt><dd>{timestamp(visual.analyzedDuration)}</dd></div><div><dt>结果首次出现</dt><dd>{timestamp(visual.resultFirstAt)}</dd></div></dl>
    {visual.shotMetricBasis && <p className="metric-basis">统计口径：{visual.shotMetricBasis}</p>}</div>

    {visual.carriers.length > 0 && <div className="visual-carriers" id="visual-carriers"><header><span>画面载体</span></header>{visual.carriers.map((carrier, index) => <article key={`${carrier.name}-${index}`}><time>{timestamp(carrier.start)}–{timestamp(carrier.end)}</time><h3>{carrier.name}</h3><p>{carrier.roles.join(" · ")}</p></article>)}</div>}
    {visual.claims.length > 0 && <div className="visual-claims" id="visual-claims"><header><span>画面主张</span></header>{visual.claims.map((claim, index) => <article key={`${claim.statement}-${index}`}><time>{timestamp(claim.start)}–{timestamp(claim.end)}</time><h3>{claim.statement}</h3><p>{claim.function}</p></article>)}</div>}

    <div className="visual-sequence" id="visual-semantics">
      {visual.shotSemantics.map((shot, index) => {
        const frame = firstFrameForRange(data, shot.evidenceRefs, shot.start, shot.end);
        return <article key={`${shot.start}-${index}`}>
          {frame && <figure><img src={frame.src} loading="lazy" alt={`${shot.role}画面，${timestamp(frame.time)}`}/><figcaption>{timestamp(frame.time)}</figcaption></figure>}
          <div><time>{timestamp(shot.start)}–{timestamp(shot.end)}</time><span>{shot.carrier}</span><h3>{shot.role}</h3><p>{shot.meaningChange}</p></div>
        </article>;
      })}
    </div>

    {visual.uiProcedureStates.length > 0 && <div className="ui-procedure-states" id="visual-ui-states"><header><span>UI 操作状态</span><p>只陈述 Builder 记录的可见状态与连续性，不补写隐藏点击。</p></header>{visual.uiProcedureStates.map((state, index) => <article key={`${state.label}-${index}`}><time>{timestamp(state.start)}–{timestamp(state.end)}</time><h3>{state.label}</h3><dl><div><dt>之前</dt><dd>{state.before}</dd></div><div><dt>过程中</dt><dd>{state.during}</dd></div><div><dt>之后</dt><dd>{state.after}</dd></div>{state.input && <div><dt>输入</dt><dd>{state.input}</dd></div>}{state.parameters.length > 0 && <div><dt>参数</dt><dd>{state.parameters.join("；")}</dd></div>}{state.output && <div><dt>输出</dt><dd>{state.output}</dd></div>}<div><dt>连续性</dt><dd>{state.continuity}</dd></div></dl></article>)}</div>}

    {visual.transitions.length > 0 && <div className="transition-strip" id="visual-transitions"><header><span>关键转场</span><p>看清信息如何换挡，而不把剪辑后的相邻状态误当成连续操作。</p></header>{visual.transitions.map((transition, index) => {
      const frames = framesForRefs(data, transition.evidenceRefs, 2);
      const mechanism = transition.mechanism.replace(/[，。；、,.;\s]+$/u, "");
      return <article key={`${transition.start}-${index}`}><div><time>{timestamp(transition.start)}–{timestamp(transition.end)}</time><h3>{transition.from} → {transition.to}</h3><p>{mechanism}，{transition.function}</p></div><div className="transition-strip__frames">{frames.map((frame) => <figure key={frame.id}><img src={frame.src} loading="lazy" alt={`转场画面，${timestamp(frame.time)}`}/><figcaption>{timestamp(frame.time)}</figcaption></figure>)}</div></article>;
    })}</div>}

    {visual.rhythm.length > 0 && <div className="rhythm-line" id="visual-rhythm"><header><span>节奏</span><p>不是只报一个平均切换数，而是看每一段为什么快或慢。</p></header>{visual.rhythm.map((item, index) => <article key={`${item.start}-${index}`}><time>{timestamp(item.start)}–{timestamp(item.end)}</time><b>{item.pace}</b><span>{item.density}</span><p>{item.function}</p></article>)}</div>}

    {visual.missingBridges.length > 0 && <aside className="continuity-warning" id="visual-continuity"><span>被剪掉的桥接</span>{visual.missingBridges.map((bridge, index) => <p key={`${bridge.start}-${index}`}><time>{timestamp(bridge.start)}–{timestamp(bridge.end)}</time>{bridge.statement.replace(/[，。；、,.;\s]+$/u, "")}；因此{bridge.impact}</p>)}</aside>}
    <p className="audio-boundary" id="visual-audio"><b>声音：</b>{visual.audioRole ?? "没有获得可判断其叙事功能的非旁白音频证据。"}</p>
    {visual.notes.length > 0 && <aside className="builder-notes" id="visual-notes"><span>Builder 补充说明</span>{visual.notes.map((item) => <p key={item}>{item}</p>)}</aside>}
  </section>;
}
