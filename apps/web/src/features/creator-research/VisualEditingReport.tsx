import type { VideoResearch } from "../../shared/contracts/core";
import { ReportCard, ReportFields } from "./ReportDetails";
import { timestamp } from "./video-reader-utils";

export function VisualEditingReport({ data }: { data: VideoResearch }) {
  const visual = data.visualEditing;
  return <section className="reader-section visual-story" id="visual-editing" aria-labelledby="visual-title">
    <header><span>04</span><div><p>画面与剪辑</p><h2 id="visual-title">画面和声音怎样传达信息</h2></div></header>
    <div className="report-card" id="visual-overview"><h3>视听总览</h3><p>{visual.composition ?? "未产出画面总览。"}</p><ReportFields fields={[["画幅", visual.orientation], ["技术分段", visual.shotCount ?? "未知"], ["每分钟变化", visual.cutsPerMinute ?? "未知"], ["分析时长", timestamp(visual.analyzedDuration)], ["结果首次出现", timestamp(visual.resultFirstAt)]]}/>{visual.shotMetricBasis && <p className="report-boundary">统计口径：{visual.shotMetricBasis}</p>}</div>
    <div id="visual-carriers" className="report-group"><h3>画面载体</h3>{visual.carriers.map((item, index) => <ReportCard key={index} title={item.name} start={item.start} end={item.end} data={data}><ReportFields fields={[["承担作用", item.roles.join(" · ")]]}/></ReportCard>)}{!visual.carriers.length && <p>未产出画面载体分析。</p>}</div>
    <div id="visual-claims" className="report-group"><h3>画面表达的主张</h3>{visual.claims.map((item, index) => <ReportCard key={index} title={item.statement} start={item.start} end={item.end} data={data} refs={item.evidenceRefs}><ReportFields fields={[["表达作用", item.function]]}/></ReportCard>)}{!visual.claims.length && <p>未产出画面主张。</p>}</div>
    <div id="visual-semantics" className="report-group"><h3>镜头怎样推进内容</h3>{visual.shotSemantics.map((shot, index) => <ReportCard id={`visual-shot-${index + 1}`} key={index} title={shot.role} start={shot.start} end={shot.end} data={data} refs={shot.evidenceRefs}><ReportFields fields={[["画面载体", shot.carrier], ["意义变化", shot.meaningChange]]}/></ReportCard>)}{!visual.shotSemantics.length && <p>未产出镜头语义分析。</p>}</div>
    <div id="visual-ui-states" className="report-group"><h3>界面操作与可见状态</h3>{visual.uiProcedureStates.map((state, index) => <ReportCard key={index} title={state.label} start={state.start} end={state.end} data={data} refs={state.evidenceRefs}><ReportFields fields={[["之前", state.before], ["过程中", state.during], ["之后", state.after], ["输入", state.input], ["参数", state.parameters.join("；")], ["输出", state.output], ["连续性", state.continuity]]}/></ReportCard>)}{!visual.uiProcedureStates.length && <p>该报告未产出界面操作状态；是否适用需结合原内容判断。</p>}</div>
    <div id="visual-transitions" className="report-group"><h3>关键转场</h3>{visual.transitions.map((item, index) => <ReportCard key={index} title={`${item.from} → ${item.to}`} start={item.start} end={item.end} data={data} refs={item.evidenceRefs}><ReportFields fields={[["转场方式", item.mechanism], ["表达作用", item.function]]}/></ReportCard>)}{!visual.transitions.length && <p>未产出转场分析。</p>}</div>
    <div id="visual-rhythm" className="report-group"><h3>节奏与信息密度</h3>{visual.rhythm.map((item, index) => <ReportCard key={index} title={item.pace} start={item.start} end={item.end} data={data} refs={item.evidenceRefs}><ReportFields fields={[["信息密度", item.density], ["节奏作用", item.function]]}/></ReportCard>)}{!visual.rhythm.length && <p>未产出节奏分析。</p>}</div>
    <div id="visual-continuity" className="report-group"><h3>连续性缺口</h3>{visual.missingBridges.map((item, index) => <ReportCard key={index} title="未展示的过程" start={item.start} end={item.end} data={data} refs={item.evidenceRefs}><ReportFields fields={[["缺口", item.statement], ["影响", item.impact]]}/></ReportCard>)}{!visual.missingBridges.length && <p>该报告未记录连续性缺口，不代表已验证全程连续。</p>}</div>
    <div className="report-card" id="visual-audio"><h3>声音</h3><p>{visual.audioRole ?? "未产出声音作用分析。"}</p></div>
    {!!visual.omissionRisks?.length && <aside className="report-card" id="visual-risks"><h3>重建时应避免的遗漏与误读</h3><p>原始探查记录列出的风险，以下文字不是推荐做法或已证实结论。</p>{visual.omissionRisks.map((item, index) => <p key={index}>{item}</p>)}</aside>}
    {visual.notes.length > 0 && <aside className="report-card" id="visual-notes"><h3>分析补充说明</h3>{visual.notes.map((item, index) => <p key={index}>{item}</p>)}</aside>}
  </section>;
}
