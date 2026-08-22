import { creatorResearchEventSchema, creatorResearchRunSchema, creatorSummarySchema, reportEnvelopeSchema, runSummarySchema, type CreatorResearchEvent, type CreatorResearchRun, type CreatorSummary, type ReportEnvelope, type RunSummary } from "../shared/schema";
import { creatorPortfolioAnalysisSchema, creatorSelectionSchema, type CreatorPortfolioAnalysis, type CreatorSelection } from "../modules/portfolio/contracts";
import { creatorDetailCollectionSchema, type CreatorDetailCollection } from "../modules/creator-detail/contracts";
import { deepMediaManifestSchema, type DeepMediaManifest } from "../modules/media-resolution/contracts";
import { videoReconstructionBatchSchema, type VideoReconstructionBatch } from "../modules/video-analysis/batch-contracts";
import { creatorSynthesisGateSchema, creatorSynthesisSchema, type CreatorSynthesis, type CreatorSynthesisGate } from "../modules/creator-synthesis/contracts";
import { comparisonProjectSchema, type ComparisonCreatorSource, type ComparisonProject } from "../modules/comparison/project-contracts";
import { creatorComparisonSchema, type CreatorComparison } from "../modules/comparison/contracts";
import { creatorDossierSchema, type CreatorDossier } from "../shared/creator-dossier";
import { videoResearchSchema, type VideoResearch } from "../shared/video-research";
import { comparisonDossierSchema, type ComparisonDossier } from "../shared/comparison-dossier";
import { z } from "zod";
import { learningLoopRunSchema, type LearningLoopRun } from "../shared/learning-loop";
import { creatorResearchPipelineSchema, type CreatorResearchPipeline } from "../shared/creator-pipeline";

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

export async function listCreatorResearchRuns(): Promise<CreatorResearchRun[]> {
  return json(await fetch("/api/creator-runs", { cache: "no-store" }), (value) => {
    const runs = value && typeof value === "object" && "runs" in value ? value.runs : [];
    return creatorResearchRunSchema.array().parse(runs);
  });
}

export async function createCreatorResearchRun(profileUrl: string): Promise<CreatorResearchRun> {
  return json(await fetch("/api/creator-runs", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileUrl })
  }), (value) => creatorResearchRunSchema.parse(value));
}

export async function resumeCreatorResearchRun(id: string): Promise<CreatorResearchRun> {
  return json(await fetch(`/api/creator-runs/${id}/resume`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  }), (value) => creatorResearchRunSchema.parse(value));
}

export async function listCreatorResearchEvents(id: string, after = 0): Promise<CreatorResearchEvent[]> {
  return json(await fetch(`/api/creator-runs/${id}/events?after=${after}`, { cache: "no-store" }), (value) => {
    const events = value && typeof value === "object" && "events" in value ? value.events : [];
    return creatorResearchEventSchema.array().parse(events);
  });
}

export type CreatorResearchPortfolio = {
  run: CreatorResearchRun;
  pipeline: CreatorResearchPipeline;
  analysis: CreatorPortfolioAnalysis | null;
  selection: CreatorSelection | null;
  details: CreatorDetailCollection | null;
  mediaManifest: DeepMediaManifest | null;
  reconstructionBatch: VideoReconstructionBatch | null;
  synthesis: CreatorSynthesis | null;
  synthesisGate: CreatorSynthesisGate | null;
};

export async function getCreatorResearchPortfolio(id: string): Promise<CreatorResearchPortfolio> {
  return json(await fetch(`/api/creator-runs/${id}/portfolio`, { cache: "no-store" }), (value) => {
    if (!value || typeof value !== "object" || !("run" in value)) throw new Error("博主 Portfolio 结构无效");
    const candidate = value as Record<string, unknown>;
    return {
      run: creatorResearchRunSchema.parse(candidate.run),
      pipeline: creatorResearchPipelineSchema.parse(candidate.pipeline),
      analysis: candidate.analysis === null ? null : creatorPortfolioAnalysisSchema.parse(candidate.analysis),
      selection: candidate.selection === null ? null : creatorSelectionSchema.parse(candidate.selection),
      details: candidate.details === null ? null : creatorDetailCollectionSchema.parse(candidate.details),
      mediaManifest: candidate.mediaManifest === null ? null : deepMediaManifestSchema.parse(candidate.mediaManifest),
      reconstructionBatch: candidate.reconstructionBatch === null ? null : videoReconstructionBatchSchema.parse(candidate.reconstructionBatch),
      synthesis: candidate.synthesis === null ? null : creatorSynthesisSchema.parse(candidate.synthesis),
      synthesisGate: candidate.synthesisGate === null ? null : creatorSynthesisGateSchema.parse(candidate.synthesisGate)
    };
  });
}

export async function getCreatorDossier(id: string): Promise<CreatorDossier> {
  return json(await fetch(`/api/v1/creators/${encodeURIComponent(id)}`, { cache: "no-store" }),
    (value) => creatorDossierSchema.parse(value));
}

export async function getVideoResearch(creatorId: string, videoId: string, runId?: string): Promise<VideoResearch> {
  const query = runId ? `?run=${encodeURIComponent(runId)}` : "";
  return json(await fetch(`/api/v1/creators/${encodeURIComponent(creatorId)}/videos/${encodeURIComponent(videoId)}${query}`, { cache: "no-store" }),
    (value) => videoResearchSchema.parse(value));
}

export async function listComparisonProjects(): Promise<ComparisonProject[]> {
  return json(await fetch("/api/v1/comparisons", { cache: "no-store" }), (value) => {
    const projects = value && typeof value === "object" && "projects" in value ? value.projects : [];
    return comparisonProjectSchema.array().parse(projects);
  });
}

export async function createComparisonProject(name: string, creatorSources: ComparisonCreatorSource[]): Promise<ComparisonProject> {
  return json(await fetch("/api/v1/comparisons", { method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, creatorSources }) }),
  (value) => comparisonProjectSchema.parse(value));
}

export async function getComparisonProject(id: string): Promise<{ project: ComparisonProject; comparison: CreatorComparison | null }> {
  return json(await fetch(`/api/v1/comparisons/${id}`, { cache: "no-store" }), (value) => {
    if (!value || typeof value !== "object" || !("project" in value)) throw new Error("比较项目结构无效");
    const candidate = value as Record<string, unknown>;
    return { project: comparisonProjectSchema.parse(candidate.project),
      comparison: candidate.comparison === null ? null : creatorComparisonSchema.parse(candidate.comparison) };
  });
}

export async function getComparisonDossier(id: string): Promise<ComparisonDossier> {
  return json(await fetch(`/api/v1/comparisons/${encodeURIComponent(id)}/dossier`, { cache: "no-store" }),
    (value) => comparisonDossierSchema.parse(value));
}

export type LearningLoopEventView = {
  sequence: number;
  runId: string;
  operationKey: string;
  fromStatus: string | null;
  toStatus: string;
  revision: number;
  createdAt: string;
};

export type LearningLoopLineageView = {
  runId: string;
  nodes: Array<{ id: string; caseId: string | null; kind: string; uri: string; sha256: string; createdAt: string }>;
  edges: Array<{ from: string; to: string }>;
};

const learningLoopEventViewSchema = z.object({
  sequence: z.number().int().positive(), runId: z.string(), operationKey: z.string(),
  fromStatus: z.string().nullable(), toStatus: z.string(), revision: z.number().int().nonnegative(), createdAt: z.string()
});
const learningLoopLineageViewSchema = z.object({
  runId: z.string(),
  nodes: z.array(z.object({ id: z.string(), caseId: z.string().nullable(), kind: z.string(), uri: z.string(), sha256: z.string(), createdAt: z.string() })),
  edges: z.array(z.object({ from: z.string(), to: z.string() }))
});

export async function listLearningLoops(): Promise<LearningLoopRun[]> {
  return json(await fetch("/api/v1/learning-loops", { cache: "no-store" }), (value) => {
    const runs = value && typeof value === "object" && "runs" in value ? value.runs : [];
    return learningLoopRunSchema.array().parse(runs);
  });
}

export async function getLearningLoop(id: string): Promise<LearningLoopRun> {
  return json(await fetch(`/api/v1/learning-loops/${encodeURIComponent(id)}`, { cache: "no-store" }),
    (value) => learningLoopRunSchema.parse(value));
}

export async function getLearningLoopEvents(id: string): Promise<LearningLoopEventView[]> {
  return json(await fetch(`/api/v1/learning-loops/${encodeURIComponent(id)}/events`, { cache: "no-store" }), (value) => {
    const events = value && typeof value === "object" && "events" in value ? value.events : [];
    return learningLoopEventViewSchema.array().parse(events);
  });
}

export async function getLearningLoopLineage(id: string): Promise<LearningLoopLineageView> {
  return json(await fetch(`/api/v1/learning-loops/${encodeURIComponent(id)}/lineage`, { cache: "no-store" }),
    (value) => learningLoopLineageViewSchema.parse(value));
}
