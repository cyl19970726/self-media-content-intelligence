import { stageReadingLabel } from "./video-reader-utils";
import type { VideoResearch } from "../../shared/contracts/core";
import { ReportCard, ReportFields } from "./ReportDetails";

const proofLabels = { visible_proof: "可见证据", creator_claim: "作者陈述", system_inference: "分析推断" };
export function DirectingStoryReport({ data }: { data: VideoResearch }) {
  const logic = data.directingLogic;
  return <section className="reader-section directing-story" id="directing" aria-labelledby="directing-title">
    <header><span>02</span><div><p>编导结构</p><h2 id="directing-title">内容怎样一步步展开</h2></div></header>
    {data.reportFormat === "legacy_report" && <aside className="report-coverage"><p>以下为历史编导投影，保留原始记录的措辞与已有评审。规范名称和转写冲突需结合原文与画面核对；缺失字段未补写。</p></aside>}
    <div className="report-card" id="directing-journey"><h3>观众的观看前后</h3><ReportFields fields={[["观看前", logic.viewerBefore], ["观看后", logic.viewerAfter]]}/></div>
    <div className="report-card" id="directing-overview"><h3>问题、承诺与回报</h3><ReportFields fields={[["激活问题", logic.activatedQuestion], ["内容承诺", logic.promise], ["最终回报", logic.payoff], ["结尾收束", logic.endingResolution]]}/></div>
    <div className="report-sequence">{logic.stages.map((stage, index) => <ReportCard key={index} id={`directing-stage-${index + 1}`} title={stageReadingLabel(stage.label)} start={stage.start} end={stage.end} data={data} refs={stage.evidenceRefs}>
      {stageReadingLabel(stage.label) !== stage.label && <small className="report-source-label">原阶段名：{stage.label}</small>}
      <ReportFields fields={[["观众问题", stage.viewerQuestion], ["编导作用", stage.function], ["证明方式", stage.proof], ["认知变化", stage.cognitiveChange], ["理解成本", stage.comprehensionLoad], ["阶段回报", stage.payoff]]}/>
    </ReportCard>)}{!logic.stages.length && <p className="reader-empty">该报告未产出编导阶段。</p>}</div>
    <div id="directing-information" className="report-group"><h3>信息设计</h3>{logic.informationDesign.map((item, index) => <ReportCard key={index} title={item.kind} start={item.start} end={item.end} data={data} refs={item.evidenceRefs}><p>{item.statement}</p></ReportCard>)}{!logic.informationDesign.length && <p>未产出信息设计分析。</p>}</div>
    <div id="directing-proof" className="report-group"><h3>证明设计</h3>{logic.proofDesign.map((item, index) => <ReportCard key={index} title={proofLabels[item.proofType]} start={item.start} end={item.end} data={data} refs={item.evidenceRefs}><p>{item.statement}</p><p className="report-boundary">证据边界：{item.boundary}</p></ReportCard>)}{!logic.proofDesign.length && <p>未产出证明设计分析。</p>}</div>
    <div className="report-card" id="directing-load"><h3>信息负荷与回报</h3><ReportFields fields={[["压缩", logic.loadAndPayoff.compression], ["重复", logic.loadAndPayoff.repetition], ["回报距离", logic.loadAndPayoff.payoffDistance], ["理解成本", logic.loadAndPayoff.comprehensionCosts.length ? <ul>{logic.loadAndPayoff.comprehensionCosts.map((item, index) => <li key={index}>{item}</li>)}</ul> : null]]}/></div>
    {logic.notes.length > 0 && <aside className="report-card" id="directing-notes"><h3>分析补充说明</h3>{logic.notes.map((item, index) => <p key={index}>{item}</p>)}</aside>}
  </section>;
}
