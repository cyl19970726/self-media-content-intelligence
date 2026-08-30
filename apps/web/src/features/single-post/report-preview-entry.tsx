import { renderToStaticMarkup } from "react-dom/server";
import { reportEnvelopeSchema } from "../../shared/contracts/core";
import { ReportV2 } from "./ReportV2";

export function renderReportPreview(value: unknown): string {
  const report = reportEnvelopeSchema.parse(value);
  return renderToStaticMarkup(<article className="dossier preview-dossier"><ReportV2 report={report}/></article>);
}
