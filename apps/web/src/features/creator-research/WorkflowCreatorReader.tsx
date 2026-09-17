import { useLocation } from "react-router-dom";
import type { WorkflowCreatorReaderData } from "../../shared/contracts/workflow-reader";
import { CrossPostResearchReading, type CrossPostReadingData } from "./components/CrossPostResearchReading";
import "./components/cross-post-research.css";

export function WorkflowCreatorReader({ data }: { data: WorkflowCreatorReaderData }) {
  const location = useLocation();
  const readingData: CrossPostReadingData = {
    identity: { audience: data.audience },
    corpus: data.corpus,
    portfolio: { items: data.portfolio }
  };
  return <section className="workflow-creator-reader">
    <header><span>CREATOR CANDIDATE</span><h3>Builder 跨帖研究报告</h3><p>本页固定展示这一版综合候选。独立复核与正式登记状态请查看工作流中的审阅资产和登记记录。</p></header>
    {data.crossPostResearch
      ? <CrossPostResearchReading data={readingData} research={data.crossPostResearch} showCorpusLink={false} returnTo={`${location.pathname}${location.search}${location.hash}`}/>
      : <p className="workflow-empty">Builder 未产出跨帖研究章节；不会以其他版本或原始 JSON 补写候选结论。</p>}
  </section>;
}
