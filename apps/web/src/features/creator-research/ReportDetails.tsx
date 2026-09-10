import type { ReactNode } from "react";
import type { VideoResearch } from "../../shared/contracts/core";
import { DepthEvidence } from "./DepthReports";
import { timestamp } from "./video-reader-utils";

export function ReportFields({ fields }: { fields: Array<[string, ReactNode]> }) {
  return <dl className="report-fields">{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value === null || value === undefined || value === "" ? "未产出 / 未知" : value}</dd></div>)}</dl>;
}

export function ReportCard({ id, title, start, end, data, refs = [], children }: {
  id?: string; title: string; start: number | null; end: number | null;
  data: VideoResearch; refs?: string[]; children: ReactNode;
}) {
  const shortRange = start !== null && end !== null && end - start < 1;
  const range = shortRange ? `${start.toFixed(3)}–${end.toFixed(3)} 秒` : `${timestamp(start)}–${timestamp(end)}`;
  return <article id={id} className="report-card">
    <header><time>{range}</time><h3>{title}</h3></header>
    {children}
    <DepthEvidence data={data} refs={refs}/>
  </article>;
}
