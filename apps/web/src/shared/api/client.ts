import { creatorDiscoveryResultSchema, creatorResearchEventSchema, creatorResearchRunSchema, creatorRunOperationSchema, creatorSummarySchema, reportEnvelopeSchema, runSummarySchema, type CreatorAcquisitionAdapter, type CreatorDiscoveryResult, type CreatorResearchEvent, type CreatorResearchRun, type CreatorRunOperation, type CreatorRunOperationAction, type CreatorSummary, type ReportEnvelope, type RunSummary } from "../contracts/core";
import {
  creatorPortfolioAnalysisSchema, creatorSelectionSchema, creatorDetailCollectionSchema,
  deepMediaManifestSchema, videoReconstructionBatchSchema, creatorSynthesisGateSchema,
  creatorSynthesisSchema, type CreatorPortfolioAnalysis, type CreatorSelection,
  type CreatorDetailCollection, type DeepMediaManifest, type VideoReconstructionBatch,
  type CreatorSynthesis, type CreatorSynthesisGate
} from "../contracts/research";
import { comparisonProjectSchema, creatorComparisonSchema, type ComparisonCreatorSource, type ComparisonProject, type CreatorComparison } from "../contracts/research";
import { creatorDossierSchema, type CreatorDossier } from "../contracts/core";
import { videoResearchSchema, type VideoResearch } from "../contracts/core";
import { comparisonDossierSchema, type ComparisonDossier } from "../contracts/core";
import { z } from "zod";
import {
  knowledgeCompilationProposalSchema, knowledgeConceptViewSchema, knowledgeGapSchema, knowledgeInvalidationRecordSchema,
  creationHypothesisSchema, knowledgeBindingSchema, knowledgeContributionManifestSchema, knowledgeContributionSchema, practiceValidationSchema,
  type CreationHypothesis, type KnowledgeBinding, type KnowledgeCompilationProposal, type KnowledgeConceptView, type KnowledgeGap, type KnowledgeInvalidationRecord, type PracticeValidation
} from "../contracts/knowledge";
import { learningLoopRunSchema, type LearningLoopRun } from "../contracts/core";
import { creatorResearchPipelineSchema, type CreatorResearchPipeline } from "../contracts/core";
import {
  contentPackageSchema, contentPackageSnapshotSchema, platformVariantSchema, publicationEventSchema, publicationRunSchema,
  type ContentPackage, type ContentPackageSnapshot, type PlatformVariant, type PublicationEvent, type PublicationRun,
  type VariantInput
} from "../contracts/creation";
import {
  evidenceAccessProjectionSchema, evidenceCatalogPageSchema, workspaceOverviewSchema,
  type EvidenceAccessProjection, type EvidenceCatalogPage, type WorkspaceOverview
} from "../contracts/core";
import { contentPackageLineageSchema, type ContentPackageLineage } from "../contracts/content-lineage";

async function json<T>(response: Response, parse: (value: unknown) => T): Promise<T> {
  const value: unknown = await response.json();
  if (!response.ok) {
    const error = value && typeof value === "object" && "error" in value ? String(value.error) : "请求失败";
    throw new Error(error);
  }
  return parse(value);
}

export async function getEvidenceAccess(evidenceId: string): Promise<EvidenceAccessProjection> {
  return json(await fetch(`/api/v1/evidence/${encodeURIComponent(evidenceId)}`, { cache: "no-store" }),
    (value) => evidenceAccessProjectionSchema.parse(value));
}

export async function listEvidenceCatalog(input: { q?: string; classification?: string; offset?: number; limit?: number } = {}): Promise<EvidenceCatalogPage> {
  const query = new URLSearchParams();
  if (input.q) query.set("q", input.q);
  if (input.classification) query.set("classification", input.classification);
  if (input.offset) query.set("offset", String(input.offset));
  if (input.limit) query.set("limit", String(input.limit));
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return json(await fetch(`/api/v1/evidence${suffix}`, { cache: "no-store" }), (value) => evidenceCatalogPageSchema.parse(value));
}

export async function getWorkspaceOverview(): Promise<WorkspaceOverview> {
  return json(await fetch("/api/v1/workspace-overview", { cache: "no-store" }), (value) => workspaceOverviewSchema.parse(value));
}

export async function listRuns(): Promise<RunSummary[]> {
  return json(await fetch("/api/runs", { cache: "no-store" }), (value) => {
    const runs = value && typeof value === "object" && "runs" in value ? value.runs : [];
    return runSummarySchema.array().parse(runs);
  });
}

export async function listKnowledge(filters: { q?: string; scope?: string; status?: string } = {}): Promise<KnowledgeConceptView[]> {
  const query = new URLSearchParams();
  if (filters.q) query.set("q", filters.q);
  if (filters.scope) query.set("scope", filters.scope);
  if (filters.status) query.set("status", filters.status);
  const suffix = query.size > 0 ? `?${query.toString()}` : "";
  return json(await fetch(`/api/v1/knowledge${suffix}`, { cache: "no-store" }), (value) => {
    const concepts = value && typeof value === "object" && "concepts" in value ? value.concepts : [];
    return knowledgeConceptViewSchema.array().parse(concepts);
  });
}

export async function getKnowledge(conceptId: string): Promise<KnowledgeConceptView> {
  return json(await fetch(`/api/v1/knowledge/${encodeURIComponent(conceptId)}`, { cache: "no-store" }),
    (value) => knowledgeConceptViewSchema.parse(value));
}

export async function listKnowledgeGaps(): Promise<KnowledgeGap[]> {
  return json(await fetch("/api/v1/knowledge/lint", { cache: "no-store" }), (value) => {
    const gaps = value && typeof value === "object" && "items" in value ? value.items : [];
    return knowledgeGapSchema.array().parse(gaps);
  });
}

export async function listKnowledgeInvalidations(conceptId?: string): Promise<KnowledgeInvalidationRecord[]> {
  const suffix = conceptId ? `?conceptId=${encodeURIComponent(conceptId)}` : "";
  return json(await fetch(`/api/v1/knowledge/invalidations${suffix}`, { cache: "no-store" }), (value) => {
    const items = value && typeof value === "object" && "invalidations" in value ? value.invalidations : [];
    return knowledgeInvalidationRecordSchema.array().parse(items);
  });
}

export async function listKnowledgeContributions(subjectType: "video" | "creator" | "comparison", subjectId: string) {
  const query = new URLSearchParams({ subjectType, subjectId });
  return json(await fetch(`/api/v1/knowledge/contributions?${query.toString()}`, { cache: "no-store" }), (value) => {
    const items = value && typeof value === "object" && "manifests" in value ? value.manifests : [];
    return z.array(z.object({ manifest: knowledgeContributionManifestSchema, contributions: z.array(knowledgeContributionSchema) })).parse(items);
  });
}

export async function listKnowledgeProposals(status?: string): Promise<KnowledgeCompilationProposal[]> {
  const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
  return json(await fetch(`/api/v1/knowledge/proposals${suffix}`, { cache: "no-store" }), (value) => {
    const items = value && typeof value === "object" && "proposals" in value ? value.proposals : [];
    return knowledgeCompilationProposalSchema.array().parse(items);
  });
}

export async function getKnowledgeActivationPlan(): Promise<{
  totals: { stage: number; already_recorded: number; await_evidence: number; reject: number };
  items: Array<{ subjectType: "video" | "creator" | "comparison"; subjectId: string; label: string; action: string }>;
}> {
  return json(await fetch("/api/v1/knowledge/activation-plan", { cache: "no-store" }), (value) => z.object({
    totals: z.object({ stage: z.number(), already_recorded: z.number(), await_evidence: z.number(), reject: z.number() }),
    items: z.array(z.object({ subjectType: z.enum(["video", "creator", "comparison"]), subjectId: z.string(), label: z.string(), action: z.string() }))
  }).parse(value));
}

export async function adjudicateKnowledgeProposal(
  proposal: KnowledgeCompilationProposal,
  decision: "apply" | "retain_local" | "await_evidence" | "reject",
  reason: string
): Promise<KnowledgeCompilationProposal> {
  return json(await fetch(`/api/v1/knowledge/proposals/${encodeURIComponent(proposal.id)}/adjudicate`, {
    method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operationKey: `knowledge-review:${proposal.id}:${decision}`, expectedFingerprint: proposal.inputFingerprint,
      decision, reason, reviewerId: "signal-room-operator" })
  }), (value) => {
    if (!value || typeof value !== "object" || !("proposal" in value)) throw new Error("知识提案裁决响应无效");
    return knowledgeCompilationProposalSchema.parse(value.proposal);
  });
}

export async function getPackageKnowledge(packageId: string, snapshotId?: string): Promise<{ bindings: KnowledgeBinding[]; hypotheses: CreationHypothesis[] }> {
  const route = snapshotId
    ? `/api/v1/content-packages/${encodeURIComponent(packageId)}/snapshots/${encodeURIComponent(snapshotId)}/knowledge-bindings`
    : `/api/v1/content-packages/${encodeURIComponent(packageId)}/knowledge-bindings`;
  return json(await fetch(route, { cache: "no-store" }), (value) => {
    if (!value || typeof value !== "object" || !("bindings" in value) || !("hypotheses" in value)) throw new Error("创作知识上下文无效");
    return { bindings: knowledgeBindingSchema.array().parse(value.bindings), hypotheses: creationHypothesisSchema.array().parse(value.hypotheses) };
  });
}

export async function getContentPackageLineage(packageId: string, snapshotId: string): Promise<ContentPackageLineage> {
  return json(await fetch(`/api/v1/content-packages/${encodeURIComponent(packageId)}/snapshots/${encodeURIComponent(snapshotId)}/lineage`, {
    cache: "no-store"
  }), (value) => contentPackageLineageSchema.parse(value));
}

export async function createKnowledgeBinding(packageId: string, input: Omit<KnowledgeBinding, "id" | "contentPackageId" | "status" | "createdAt"> & { operationKey: string }): Promise<KnowledgeBinding> {
  return json(await fetch(`/api/v1/content-packages/${encodeURIComponent(packageId)}/snapshots/${encodeURIComponent(input.contentPackageSnapshotId)}/knowledge-bindings`, {
    method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input)
  }), (value) => knowledgeBindingSchema.parse(value));
}

export async function createCreationHypothesis(packageId: string, input: Omit<CreationHypothesis, "id" | "contentPackageId" | "createdAt"> & { operationKey: string }): Promise<CreationHypothesis> {
  return json(await fetch(`/api/v1/content-packages/${encodeURIComponent(packageId)}/snapshots/${encodeURIComponent(input.contentPackageSnapshotId)}/hypotheses`, {
    method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input)
  }), (value) => creationHypothesisSchema.parse(value));
}

export async function listPracticeValidations(runId: string): Promise<PracticeValidation[]> {
  return json(await fetch(`/api/v1/publications/${encodeURIComponent(runId)}/practice-validations`, { cache: "no-store" }), (value) => {
    const items = value && typeof value === "object" && "validations" in value ? value.validations : [];
    return practiceValidationSchema.array().parse(items);
  });
}

export async function createPracticeValidation(runId: string, input: object): Promise<PracticeValidation> {
  return json(await fetch(`/api/v1/publications/${encodeURIComponent(runId)}/practice-validations`, {
    method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input)
  }), (value) => practiceValidationSchema.parse(value));
}

export async function submitPracticeValidation(id: string, input: object): Promise<PracticeValidation> {
  return json(await fetch(`/api/v1/practice-validations/${encodeURIComponent(id)}/submit`, {
    method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input)
  }), (value) => practiceValidationSchema.parse(value));
}

export async function adjudicatePracticeValidation(id: string, input: object): Promise<PracticeValidation> {
  return json(await fetch(`/api/v1/practice-validations/${encodeURIComponent(id)}/adjudicate`, {
    method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input)
  }), (value) => practiceValidationSchema.parse(value));
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

export async function listContentPackages(): Promise<ContentPackage[]> {
  return json(await fetch("/api/v1/content-packages", { cache: "no-store" }), (value) => {
    const items = value && typeof value === "object" && "packages" in value ? value.packages : [];
    return contentPackageSchema.array().parse(items);
  });
}

export async function createContentPackage(input: { name: string; brief: string; sourceRefs: string[] }): Promise<ContentPackage> {
  return json(await fetch("/api/v1/content-packages", { method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }),
  (value) => contentPackageSchema.parse(value));
}

export async function getContentPackage(id: string): Promise<{ package: ContentPackage; variants: PlatformVariant[]; snapshots: ContentPackageSnapshot[] }> {
  return json(await fetch(`/api/v1/content-packages/${encodeURIComponent(id)}`, { cache: "no-store" }), (value) => {
    if (!value || typeof value !== "object" || !("package" in value) || !("variants" in value)) throw new Error("内容包结构无效");
    const snapshots = "snapshots" in value ? value.snapshots : [];
    return { package: contentPackageSchema.parse(value.package), variants: platformVariantSchema.array().parse(value.variants),
      snapshots: contentPackageSnapshotSchema.array().parse(snapshots) };
  });
}

export async function listContentPackageSnapshots(packageId: string): Promise<ContentPackageSnapshot[]> {
  return json(await fetch(`/api/v1/content-packages/${encodeURIComponent(packageId)}/snapshots`, { cache: "no-store" }), (value) => {
    const items = value && typeof value === "object" && "snapshots" in value ? value.snapshots : [];
    return contentPackageSnapshotSchema.array().parse(items);
  });
}

export async function createContentPackageSnapshot(packageId: string): Promise<ContentPackageSnapshot> {
  return json(await fetch(`/api/v1/content-packages/${encodeURIComponent(packageId)}/snapshots`, {
    method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: "{}"
  }), (value) => contentPackageSnapshotSchema.parse(value));
}

export async function createPlatformVariant(packageId: string, input: VariantInput): Promise<PlatformVariant> {
  return json(await fetch(`/api/v1/content-packages/${encodeURIComponent(packageId)}/variants`, { method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }),
  (value) => platformVariantSchema.parse(value));
}

export async function updatePlatformVariant(id: string, input: VariantInput): Promise<PlatformVariant> {
  return json(await fetch(`/api/v1/content-variants/${encodeURIComponent(id)}`, { method: "PUT", cache: "no-store",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }),
  (value) => platformVariantSchema.parse(value));
}

export async function listPublications(): Promise<PublicationRun[]> {
  return json(await fetch("/api/v1/publications", { cache: "no-store" }), (value) => {
    const items = value && typeof value === "object" && "publications" in value ? value.publications : [];
    return publicationRunSchema.array().parse(items);
  });
}

export async function createPublication(variantId: string): Promise<PublicationRun> {
  return json(await fetch("/api/v1/publications", { method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variantId }) }),
  (value) => publicationRunSchema.parse(value));
}

export async function getPublication(id: string): Promise<PublicationRun> {
  return json(await fetch(`/api/v1/publications/${encodeURIComponent(id)}`, { cache: "no-store" }),
    (value) => publicationRunSchema.parse(value));
}

export async function getPublicationEvents(id: string): Promise<PublicationEvent[]> {
  return json(await fetch(`/api/v1/publications/${encodeURIComponent(id)}/events`, { cache: "no-store" }), (value) => {
    const items = value && typeof value === "object" && "events" in value ? value.events : [];
    return publicationEventSchema.array().parse(items);
  });
}

async function publicationAction(id: string, action: "prepare" | "approve" | "cancel" | "resume", body: object = {}): Promise<PublicationRun> {
  return json(await fetch(`/api/v1/publications/${encodeURIComponent(id)}/${action}`, { method: "POST", cache: "no-store",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  (value) => publicationRunSchema.parse(value));
}

export const preparePublication = (id: string) => publicationAction(id, "prepare");
export const approvePublication = (id: string, revision: number) => publicationAction(id, "approve", { revision });
export const cancelPublication = (id: string) => publicationAction(id, "cancel");
export const resumePublication = (id: string) => publicationAction(id, "resume");

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

export async function listCreatorRunOperations(): Promise<CreatorRunOperation[]> {
  return json(await fetch("/api/creator-run-operations", { cache: "no-store" }), (value) => {
    const operations = value && typeof value === "object" && "operations" in value ? value.operations : [];
    return creatorRunOperationSchema.array().parse(operations);
  });
}

export async function runCreatorOperation(id: string, action: CreatorRunOperationAction): Promise<CreatorResearchRun> {
  const paths: Record<Exclude<CreatorRunOperationAction, "none">, string> = {
    resume: "resume",
    retry_failed_videos: "retry-failed-videos",
    continue_with_media_gaps: "continue-with-media-gaps",
    revalidate_synthesis: "revalidate-synthesis"
  };
  if (action === "none") throw new Error("当前任务没有可执行的恢复动作");
  return json(await fetch(`/api/creator-runs/${id}/${paths[action]}`, {
    method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: "{}"
  }), (value) => creatorResearchRunSchema.parse(value));
}

export async function createCreatorResearchRun(
  profileUrl: string,
  adapter: CreatorAcquisitionAdapter = "ego-browser"
): Promise<CreatorResearchRun> {
  return json(await fetch("/api/creator-runs", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profileUrl, adapter })
  }), (value) => creatorResearchRunSchema.parse(value));
}

export async function discoverAiCreators(): Promise<CreatorDiscoveryResult> {
  return json(await fetch("/api/creator-discovery/redfox", {
    method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: "{}"
  }), (value) => creatorDiscoveryResultSchema.parse(value));
}

export async function resumeCreatorResearchRun(id: string): Promise<CreatorResearchRun> {
  return json(await fetch(`/api/creator-runs/${id}/resume`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  }), (value) => creatorResearchRunSchema.parse(value));
}

export async function evaluateCreatorVideos(id: string, postExternalIds: string[]): Promise<CreatorResearchRun> {
  return json(await fetch(`/api/creator-runs/${id}/evaluate-videos`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postExternalIds })
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
