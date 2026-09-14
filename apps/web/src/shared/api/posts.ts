import { reportEnvelopeSchema, runSummarySchema, type ReportEnvelope, type RunSummary } from "../contracts/core";
import { json } from "./http";

export async function listRuns(): Promise<RunSummary[]> {
  return json(await fetch("/api/runs", { cache: "no-store" }), (value) => {
    const runs = value && typeof value === "object" && "runs" in value ? value.runs : [];
    return runSummarySchema.array().parse(runs);
  });
}

export async function getRun(id: string): Promise<ReportEnvelope> {
  return json(await fetch(`/api/runs/${id}`, { cache: "no-store" }), (value) => reportEnvelopeSchema.parse(value));
}

export async function createRun(url: string): Promise<ReportEnvelope> {
  return json(await fetch("/api/runs", {
    method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url })
  }), (value) => reportEnvelopeSchema.parse(value));
}

export async function retryRun(id: string): Promise<ReportEnvelope> {
  return json(await fetch(`/api/runs/${id}/retry`, {
    method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: "{}"
  }), (value) => reportEnvelopeSchema.parse(value));
}
