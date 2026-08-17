import { benchmarkSchema, creatorConsoleSchema, creatorSummarySchema, reportEnvelopeSchema, runSummarySchema, videoEvidenceSchema, type Benchmark, type CreatorConsole, type CreatorSummary, type ReportEnvelope, type RunSummary, type VideoEvidence } from "../shared/schema";

async function json<T>(response: Response, parse: (value: unknown) => T): Promise<T> {
  const value: unknown = await response.json();
  if (!response.ok) {
    const error = value && typeof value === "object" && "error" in value ? String(value.error) : "请求失败";
    throw new Error(error);
  }
  return parse(value);
}

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

export async function listCreators(): Promise<CreatorSummary[]> {
  return json(await fetch("/api/creators", { cache: "no-store" }), (value) => {
    const creators = value && typeof value === "object" && "creators" in value ? value.creators : [];
    return creatorSummarySchema.array().parse(creators);
  });
}

export async function getCreatorConsole(id: string): Promise<CreatorConsole> {
  return json(await fetch(`/api/creators/${id}`, { cache: "no-store" }), (value) => creatorConsoleSchema.parse(value));
}

export async function getVideoEvidence(creatorId: string, videoId: string): Promise<VideoEvidence> {
  return json(await fetch(`/api/creators/${creatorId}/videos/${videoId}`, { cache: "no-store" }), (value) => videoEvidenceSchema.parse(value));
}

export async function getBenchmark(): Promise<Benchmark> {
  return json(await fetch("/api/benchmark", { cache: "no-store" }), (value) => benchmarkSchema.parse(value));
}
