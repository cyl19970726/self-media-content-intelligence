import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { VideoResearch } from "../../shared/contracts/core";
import { ContentRestorationReport } from "./ContentRestorationReport";
import { DirectingStoryReport } from "./DirectingStoryReport";
import { OpeningReport, PackagingReport } from "./DepthReports";
import { ReportCoverageNotice } from "./ReportCoverageNotice";
import { VisualEditingReport } from "./VisualEditingReport";
import "./video-reader-report.css";

type Lens = "content" | "directing" | "visual";

export function WorkflowPostReader({ data }: { data: VideoResearch }) {
  const [lens, setLens] = useState<Lens>("content");
  const [search] = useSearchParams();
  const requestedReturnTo = search.get("returnTo");
  const returnTo = requestedReturnTo?.startsWith("/workflow-runs/") ? requestedReturnTo : null;
  return <section className="workflow-post-reader">
    {returnTo && <nav className="reader-breadcrumb"><Link to={returnTo}><ArrowLeft size={14}/> 返回冻结综合候选</Link><span>单帖候选</span></nav>}
    <header><span>POST CANDIDATE</span><h3>Builder 三部分报告</h3><p>本页固定展示这一版单帖候选。独立复核与正式登记状态请查看工作流中的审阅资产和登记记录。</p></header>
    <nav className="reader-navigation" aria-label="候选报告章节">
      {(["content", "directing", "visual"] as const).map((item) => <button key={item} type="button" onClick={() => setLens(item)} aria-current={lens === item ? "page" : undefined}>{({ content: "内容还原", directing: "编导逻辑", visual: "画面与剪辑" })[item]}</button>)}
    </nav>
    {lens === "content" && <section className="reader-section content-story"><header><span>01</span><div><p>Builder · 内容还原</p><h2>它到底讲了什么、展示了什么</h2></div></header><p className="builder-lens-summary">{data.thesis}</p><ReportCoverageNotice data={data}/>{data.contentBlocks.length ? <ContentRestorationReport blocks={data.contentBlocks} data={data}/> : <p className="reader-empty">Builder 未产出内容还原块。</p>}{data.contentUnknowns.length > 0 && <aside className="builder-unknowns"><span>Builder 保留的未知项</span>{data.contentUnknowns.map((item) => <p key={item}>{item}</p>)}</aside>}</section>}
    {lens === "directing" && <><section className="reader-section"><header><span>02</span><div><p>Builder · 开头与包装</p><h2>怎样建立期待，又如何兑现</h2></div></header><OpeningReport data={data}/><PackagingReport data={data}/></section><DirectingStoryReport data={data}/></>}
    {lens === "visual" && <VisualEditingReport data={data}/>}
  </section>;
}
