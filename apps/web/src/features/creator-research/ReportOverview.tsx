import { overviewSourceTarget } from "./report-reading-utils";
import { Link, useSearchParams } from "react-router-dom";
import type { VideoResearch } from "../../shared/contracts/core";

export function ReportOverview({ data }: { data: VideoResearch }) {
  const [search] = useSearchParams();
  const projection = data.overview;
  const overview = projection?.overview;
  const available = projection?.state === "ready" && overview?.status === "ready";
  const messages = { missing: "该报告尚未生成综合总览，可继续阅读已有报告。", stale: "原报告已更新，综合总览待重新生成。", invalid: "综合总览校验失败，暂不展示；已有报告仍可阅读。", ready: "综合总览未能生成，已有报告仍可阅读。" };
  return <section className="report-overview" aria-labelledby="report-overview-title">
    <header><h2 id="report-overview-title">整篇总览</h2><span>下游综合分析</span></header>
    {available ? overview.paragraphs.map((paragraph, index) => <div key={index}><p>{paragraph.text}</p><div className="overview-sources">{[...new Set(paragraph.sourcePaths)].map(pointer => {
      const target = overviewSourceTarget(pointer, data); const params = new URLSearchParams(search); params.set("lens", target.lens);
      return <Link key={pointer} to={`?${params}#${target.anchor}`} title={pointer}>查看依据 · {target.label}</Link>;
    })}</div></div>) : <p className="report-overview__empty">{messages[projection?.state ?? "missing"]}</p>}
  </section>;
}
