import type { VideoResearch } from "../../shared/contracts/core";
import { framesForRefs } from "./video-reader-utils";

export function DepthEvidence({ data, refs }: { data: VideoResearch; refs: string[] }) {
  refs = [...new Set(refs)];
  const knownFrames = framesForRefs(data, refs, refs.length);
  const frames = [...knownFrames, ...refs.filter(ref => !knownFrames.some(frame => frame.id === ref)).flatMap(ref => {
    const item = data.evidenceIndex.find(row => row.id === ref && (row.kind === "frame" || row.kind === "shot"));
    return item?.artifactRef ? [{ id: ref, src: item.artifactRef, time: null, reason: item.label }] : [];
  })];
  return <div className="depth-evidence">{frames.map(frame => <a key={frame.id} href={frame.src} target="_blank" rel="noreferrer"><img src={frame.src} loading="lazy" alt={`证据 ${frame.id}${frame.time === null ? " · 镜头或来源画面" : ` · ${frame.time.toFixed(2)} 秒`}`}/><small>{frame.time === null ? (data.evidenceIndex.some(item => item.id === frame.id && item.kind === "shot") ? "镜头代表帧" : "时间未知") : `${frame.time.toFixed(2)}s`} · {frame.id}</small>{frame.reason && <small>{frame.reason}</small>}</a>)}
    {refs.filter(ref => !frames.some(frame => frame.id === ref)).map(ref => {
      const cue = data.transcript.find(item => item.id === ref);
      const evidence = data.evidenceIndex.find(item => item.id === ref);
      const href = ref === "POST-COVER" ? data.sourceFacts.coverHref : evidence?.artifactRef;
      return <span key={ref}>{cue ? `${cue.start?.toFixed(2)}s · ${cue.text}` : href ? <a href={href} target="_blank" rel="noreferrer">{ref} · 查看来源</a> : `${ref} · 来源未解析`}</span>;
    })}</div>;
}
export function OpeningReport({ data }: { data: VideoResearch }) {
  const opening = data.visualEditing.openingAnalysis;
  return <div id="visual-opening" className="depth-report"><h3>前 10 秒 · 连续视听拆解</h3>{!opening ? <p>Builder 未产出前 10 秒深度分析；旧版报告需重新分析。</p> : <>
    <p>实际覆盖 0–{opening.duration.toFixed(2)} 秒 · {opening.inspectionBasis}</p>
    {opening.segments.map(segment => <article key={segment.id}><h4>{segment.timeRange.start.toFixed(2)}–{segment.timeRange.end.toFixed(2)}s · {segment.boundaryReason}</h4><dl>
      {([['spokenWords','口播原文 / 提案'],['burnedCaptions','烧录字幕'],['alignmentStatus','时间对齐'],['composition','构图'],['motion','动作与运动'],['audioRole','声音作用'],['evidenceArrival','证据出现'],['viewerQuestion','观众问题'],['meaningChange','意义变化']] as const).map(([key,label]) => <div key={key}><dt>{label}</dt><dd>{segment[key]}</dd></div>)}</dl>
      <DepthEvidence data={data} refs={[...new Set([...segment.frameRefs,...segment.evidenceRefs])]}/>{segment.unknowns.map(item => <p key={item}>未知：{item}</p>)}</article>)}
    {opening.unknowns.map(item => <p key={item}>边界：{item}</p>)}</>}</div>;
}
export function PackagingReport({ data }: { data: VideoResearch }) {
  const analysis = data.directingLogic.packagingAnalysis;
  return <div id="directing-packaging" className="depth-report"><h3>标题、独立封面与正文兑现</h3>{!analysis ? <p>Builder 未产出独立包装分析；不以首帧代替封面。</p> : <>
    {(['title','cover','firstFrame'] as const).map(key => { const surface = analysis[key]; return <article key={key}><h4>{{ title: '发布标题', cover: '独立发布封面', firstFrame: '视频首帧' }[key]} · {{available:'已取得',partial:'部分',missing:'缺失'}[surface.state]}</h4>
      {key === 'title' && <blockquote>{data.sourceFacts.title ?? '标题缺失'}</blockquote>}{key === 'cover' && data.sourceFacts.coverHref && <a href={data.sourceFacts.coverHref} target="_blank" rel="noreferrer"><img style={{width:180}} src={data.sourceFacts.coverHref} alt="独立发布封面，小尺寸预览"/></a>}
      <dl>{([['audience','受众'],['promise','承诺'],['tension','冲突'],['specificity','具体信息'],['searchTerms','搜索词'],['composition','构图'],['typeHierarchy','字号层级'],['smallSizeReadability','小尺寸可读性']] as const).map(([field,label]) => <div key={field}><dt>{label}</dt><dd>{surface[field] ?? '未产出 / 未知'}</dd></div>)}</dl><DepthEvidence data={data} refs={surface.evidenceRefs}/>{surface.unknowns.map(item => <p key={item}>{item}</p>)}</article>; })}
    {analysis.fulfillment.map((item,index) => <article key={index}><h4>{{title:'标题',cover:'封面',first_sentence:'首句'}[item.origin]} → 正文 · {{fulfilled:'已展示兑现',partial:'部分兑现',not_shown:'未展示',unknown:'未知'}[item.status]}</h4><p>{item.promise}</p><p>{item.explanation}</p><DepthEvidence data={data} refs={item.bodyEvidenceRefs}/></article>)}{analysis.unknowns.map(item => <p key={item}>{item}</p>)}</>}</div>;
}
