import { randomUUID } from "node:crypto";
import type { CreatorArtifactStore, CreatorResearchService } from "../../index.js";
import type { ComparisonProjectRepository } from "./repository.js";
import { compareCreatorPortfolios } from "./analyzer.js";
import { comparisonProjectSchema, createComparisonProjectInputSchema, type ComparisonCreatorSource, type ComparisonProject } from "./project-contracts.js";
import { creatorComparisonSchema, type ComparisonResearchCompletionPort } from "./contracts.js";
import { creatorPortfolioAnalysisSchema, creatorSelectionSchema, type CreatorPortfolioAnalysis, type CreatorSelection,
  type CreatorSynthesis, type CreatorSynthesisGate } from "../../index.js";
import type { CreatorDossier } from "../../../contracts/index.js";

function now(): string { return new Date().toISOString(); }
function leaseUntil(): string { return new Date(Date.now() + 90_000).toISOString(); }

const legacyComparisonMemberIds: Record<string, string> = {
  "ai-red-witch": "87d39505-7b34-4bc1-9344-487c3aa47e5a",
  "zhang-zala": "f115de23-22b4-42e4-9679-2537570ccef3",
  "human-director": "9897f92e-da3e-4548-a5df-99c9a3e57917"
};

type ResolvedComparableSource = {
  creatorRunId: string;
  creatorId: string;
  sourceRunId: string;
  revision: string;
  creatorName: string;
  analysis: CreatorPortfolioAnalysis;
  selection: CreatorSelection;
  synthesis: CreatorSynthesis | null;
  synthesisGate: CreatorSynthesisGate | null;
  synthesisArtifactRef: string | null;
  synthesisGateArtifactRef: string | null;
  provenance: "versioned_run" | "legacy_dossier";
};

type DossierLoader = (service: CreatorResearchService, id: string) => CreatorDossier | null;

function validUrl(value: string): string | null {
  try { return new URL(value).toString(); } catch { return null; }
}

/**
 * Adapts an already-published legacy dossier into the *same* numeric Portfolio
 * shape used by a Creator Run. Nulls are retained where the old dossier did
 * not preserve a statistic; this keeps old deep research comparable without
 * pretending it was collected by today's run pipeline.
 */
function legacySnapshot(dossier: CreatorDossier): ResolvedComparableSource {
  const creatorRunId = legacyComparisonMemberIds[dossier.canonicalId];
  if (!creatorRunId) throw new Error(`博主 ${dossier.canonicalId} 没有可审计的旧版比较投影`);
  const sourceRunId = `legacy:${dossier.canonicalId}`;
  const revision = dossier.lastGood.revisionLabel ?? dossier.generatedAt;
  const known = Math.min(dossier.corpus.likesKnown, dossier.corpus.postCount);
  const missing = Math.max(0, dossier.corpus.postCount - known);
  const selected = dossier.portfolio.items.map((item) => {
    const url = validUrl(item.sourceHref);
    if (!url) throw new Error(`${dossier.identity.name} 的「${item.title}」缺少可审计的来源链接，不能固定到比较项目。`);
    return {
      externalId: item.id,
      url,
      title: item.title,
      visibleText: item.coreContent,
      mediaType: item.format?.includes("图") ? "image" as const : "video" as const,
      likesLabel: item.likes === null ? null : String(item.likes),
      likes: item.likes,
      tier: item.tier,
      tierRank: item.tierRank,
      anchors: item.anchors,
      selectionReason: item.selectionReason,
      deepCandidate: item.deepSample,
      deepState: "pending" as const,
      confounds: []
    };
  });
  const tierCounts = (['high', 'base', 'low'] as const).reduce((counts, tier) => {
    counts[tier] = selected.filter((item) => item.tier === tier).length;
    return counts;
  }, { high: 0, base: 0, low: 0 });
  const medianNear = selected.find((item) => item.anchors.includes("median_near"))?.externalId ?? null;
  const meanNear = selected.find((item) => item.anchors.includes("mean_near"))?.externalId ?? null;
  const common = {
    median: dossier.corpus.medianLikes,
    mean: dossier.corpus.meanLikes,
    medianNearPostId: medianNear,
    meanNearPostId: meanNear,
    meanGap: false,
    meanGapReason: null
  };
  const sourceRef = `legacy-dossier:${dossier.canonicalId}:${revision}`;
  const selection = creatorSelectionSchema.parse({
    schemaVersion: "1.0.0", runId: creatorRunId, generatedAt: dossier.generatedAt,
    sourceCorpusArtifactRef: sourceRef, ruleVersion: "ranked-7x3-v1",
    rules: { targetPerTier: 7, deepCandidatesPerTier: 3, high: "legacy high", base: "legacy base", low: "legacy low", unknownMetricPolicy: "exclude_from_metric_tiering" },
    denominator: { discoveredPosts: dossier.corpus.postCount, eligiblePosts: known, selectedPosts: selected.length, excludedMissingLikes: missing },
    anchors: common, tierCounts, items: selected,
    limitations: ["此选择集由已发布旧版 Creator Dossier 固定投影；未迁移的分位统计保持未知。", ...dossier.boundaries]
  });
  const analysis = creatorPortfolioAnalysisSchema.parse({
    schemaVersion: "1.0.0", runId: creatorRunId, generatedAt: dossier.generatedAt,
    corpusArtifactRef: sourceRef, selectionArtifactRef: sourceRef,
    metricCoverage: { known, missing, rate: dossier.corpus.coverageRate },
    likes: { min: null, p25: dossier.corpus.percentiles.p25, median: dossier.corpus.medianLikes, mean: dossier.corpus.meanLikes, p75: dossier.corpus.percentiles.p75, max: dossier.corpus.maxLikes },
    tierCounts, anchors: common,
    interpretationBoundary: "来自已发布 legacy Creator Dossier 的固定投影；只比较其已记录公开指标。",
    unknowns: ["旧版投影未保留完整原始分位统计；缺失项保持 null。", ...dossier.boundaries]
  });
  return { creatorRunId, creatorId: dossier.canonicalId, sourceRunId, revision, creatorName: dossier.identity.name, analysis, selection,
    synthesis: null, synthesisGate: null, synthesisArtifactRef: null, synthesisGateArtifactRef: null, provenance: "legacy_dossier" };
}

export class ComparisonProjectService {
  constructor(
    private readonly creators: CreatorResearchService,
    private readonly repository: ComparisonProjectRepository,
    private readonly artifacts: CreatorArtifactStore,
    private readonly dossierLoader: DossierLoader,
    private readonly completionPort?: ComparisonResearchCompletionPort
  ) {}

  private resolve(source: ComparisonCreatorSource): ResolvedComparableSource {
    const dossier = this.dossierLoader(this.creators, source.creatorId);
    if (!dossier) throw new Error(`博主 ${source.creatorId} 尚未形成可读研究档案，不能固定版本。`);
    if (dossier.source === "legacy_adapter") {
      const legacy = legacySnapshot(dossier);
      if (source.sourceRunId !== legacy.sourceRunId || source.revision !== legacy.revision) {
        throw new Error(`${dossier.identity.name} 的旧版研究已更新，请刷新页面后重新选择。`);
      }
      return legacy;
    }
    const run = dossier.run;
    if (!run?.portfolioArtifactRef || !run.selectionArtifactRef) {
      throw new Error(`${dossier.identity.name} 尚未形成可固定的全量基本盘和选择集。`);
    }
    const revision = `${run.portfolioArtifactRef}|${run.selectionArtifactRef}`;
    if (source.sourceRunId !== run.id || source.revision !== revision) {
      throw new Error(`${dossier.identity.name} 的研究版本已变化，请刷新页面后重新选择。`);
    }
    const snapshot = this.creators.portfolio(run.id);
    if (!snapshot?.analysis || !snapshot.selection) throw new Error(`${dossier.identity.name} 的固定版本读取失败。`);
    const contentReady = Boolean(snapshot.synthesis && snapshot.synthesisGate?.ready
      && snapshot.synthesisGate.evaluator?.independentOfCandidate);
    return { creatorRunId: run.id, creatorId: dossier.canonicalId, sourceRunId: run.id, revision,
      creatorName: dossier.identity.name, analysis: snapshot.analysis, selection: snapshot.selection,
      synthesis: contentReady ? snapshot.synthesis : null, synthesisGate: contentReady ? snapshot.synthesisGate : null,
      synthesisArtifactRef: contentReady ? run.synthesisArtifactRef : null,
      synthesisGateArtifactRef: contentReady ? run.synthesisGateArtifactRef : null,
      provenance: "versioned_run" };
  }

  create(input: unknown): ComparisonProject {
    const request = createComparisonProjectInputSchema.parse(input);
    const timestamp = now();
    const id = randomUUID();
    const members = request.creatorSources.map((source, index) => {
      const resolved = this.resolve(source);
      const snapshotRef = this.artifacts.write(id, `comparison-source-${String(index + 1).padStart(2, "0")}-r1.json`, {
        schemaVersion: "1.0.0", comparisonProjectId: id, pinnedAt: timestamp,
        source: { creatorId: resolved.creatorId, sourceRunId: resolved.sourceRunId, revision: resolved.revision, provenance: resolved.provenance },
        analysis: resolved.analysis, selection: resolved.selection,
        synthesis: resolved.synthesis, synthesisGate: resolved.synthesisGate
      });
      return { ...resolved, portfolioArtifactRef: snapshotRef, selectionArtifactRef: snapshotRef, pinnedAt: timestamp };
    });
    const inputArtifactRef = this.artifacts.write(id, "comparison-input-r1.json", {
      schemaVersion: "1.0.0", comparisonProjectId: id, generatedAt: timestamp,
      members: members.map((member) => ({ creatorRunId: member.creatorRunId, creatorId: member.creatorId,
        sourceRunId: member.sourceRunId, revision: member.revision, creatorName: member.creatorName,
        portfolioRevision: member.revision, analysis: member.analysis, selection: member.selection,
        synthesis: member.synthesis, synthesisGate: member.synthesisGate }))
    });
    const project = comparisonProjectSchema.parse({
      schemaVersion: "1.0.0", id, name: request.name, status: "queued", createdAt: timestamp, updatedAt: timestamp,
      members: members.map(({ creatorRunId, creatorId, sourceRunId, revision, creatorName, portfolioArtifactRef, selectionArtifactRef,
        synthesisArtifactRef, synthesisGateArtifactRef, pinnedAt }) =>
        ({ creatorRunId, creatorId, sourceRunId, revision, creatorName, portfolioArtifactRef, selectionArtifactRef,
          synthesisArtifactRef, synthesisGateArtifactRef, pinnedAt })),
      inputArtifactRef, comparisonArtifactRef: null,
      knowledgeCompilation: null,
      job: { state: "queued", attempt: 0, leaseOwner: null, leaseExpiresAt: null, lastHeartbeatAt: null }, error: null
    });
    this.repository.save(project);
    return project;
  }

  get(id: string) {
    const project = this.repository.get(id);
    if (!project) return null;
    return { project, comparison: project.comparisonArtifactRef
      ? creatorComparisonSchema.parse(this.artifacts.read(project.comparisonArtifactRef)) : null };
  }

  list(limit?: number): ComparisonProject[] { return this.repository.list(limit); }

  processNext(workerId: string): boolean {
    const startedAt = now();
    const project = this.repository.claimNext(workerId, startedAt, leaseUntil());
    if (!project) return false;
    try {
      const input = this.artifacts.read(project.inputArtifactRef) as { members?: unknown[] };
      if (!Array.isArray(input.members)) throw new Error("比较项目缺少固定成员输入");
      const comparison = compareCreatorPortfolios(input.members, now());
      project.comparisonArtifactRef = this.artifacts.write(project.id, "comparison-r1.json", comparison);
      project.status = "ready";
      project.updatedAt = now();
      project.job = { ...project.job, state: "succeeded", leaseOwner: null, leaseExpiresAt: null, lastHeartbeatAt: project.updatedAt };
      project.error = null;
      this.repository.save(project);
      try {
        this.completionPort?.publish({ comparisonProjectId: project.id,
          comparisonArtifactRef: project.comparisonArtifactRef,
          sourceArtifactRefs: project.members.flatMap((member) => [member.portfolioArtifactRef, member.synthesisArtifactRef, member.synthesisGateArtifactRef]
            .filter((ref): ref is string => Boolean(ref))),
          comparison });
        if (this.completionPort) project.knowledgeCompilation = { status: "succeeded", message: "Comparison knowledge compilation completed." };
      } catch (error) {
        project.knowledgeCompilation = { status: "failed", message: error instanceof Error ? error.message : String(error) };
      }
      this.repository.save(project);
    } catch (error) {
      project.status = "failed";
      project.updatedAt = now();
      project.job = { ...project.job, state: "failed", leaseOwner: null, leaseExpiresAt: null, lastHeartbeatAt: project.updatedAt };
      project.error = error instanceof Error ? error.message : "比较 Worker 失败";
      this.repository.save(project);
    }
    return true;
  }

  close(): void { this.repository.close(); }
}
