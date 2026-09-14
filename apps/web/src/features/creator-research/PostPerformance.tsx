import type { VideoResearch } from "../../shared/contracts/core";
export function PostPerformance({ data }: { data: VideoResearch }) {
  const view = data.performanceContext.observation;
  return <details className="depth-report"><summary>公开表现与样本口径 · 下游统计</summary>{!view ? <p>缺少可复算观察；旧报告的相对表现未用于本次分析。</p> : <>
    <p>本帖观察：{view.observedAt ?? '未知'} · 样本观察：{view.sampleObservedAt ?? '未知'}</p>
    <p>{view.scope} · 观察 {view.observedCount} 条，纳入 {view.eligibleCount} 条 · 题材样本 {view.topicSampleSize} 条</p>
    <table><thead><tr><th>指标</th><th>本帖</th><th>有效分母</th><th>作者中位</th><th>中位倍数</th></tr></thead><tbody>{view.metrics.map(row => <tr key={row.key}><th>{{likes:'点赞',collections:'收藏',comments:'评论'}[row.key]}</th><td>{row.subject ?? '未知'}</td><td>{row.denominator}</td><td>{row.median ?? '未知'}</td><td>{row.multiple?.toFixed(2) ?? '未知'}</td></tr>)}</tbody></table>
    <p>收藏 / 点赞：{view.collectionLikeRatio?.toFixed(3) ?? '未知'} · 曝光互动率：未知 · 留存：未知 · 发布时间匹配：{view.ageMatched ? '已匹配' : '未匹配'}</p>
    {view.limitations.map(item => <p key={item}>{item}</p>)}{view.excluded.length > 0 && <details><summary>排除记录（{view.excluded.length}）</summary>{view.excluded.map((row,i) => <p key={i}>{row.id}：{row.reason}</p>)}</details>}</>}</details>;
}
