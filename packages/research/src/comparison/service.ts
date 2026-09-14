import { randomUUID } from "node:crypto";
import type { CreatorArtifactStore, CreatorResearchService } from "../../index.js";
import type { ComparisonProjectRepository } from "./repository.js";
import { compareCreatorPortfolios } from "./analyzer.js";
import { comparisonProjectSchema, createComparisonProjectInputSchema, type ComparisonCreatorSource, type ComparisonProject } from "./project-contracts.js";
import { creatorComparisonSchema, type ComparisonResearchCompletionPort } from "./contracts.js";
import { type CreatorPortfolioAnalysis, type CreatorSelection, type CreatorSynthesis, type CreatorSynthesisGate } from "../../index.js";
import type { CreatorDossier } from "../../../contracts/index.js";

function now(): string { return new Date().toISOString(); }
function leaseUntil(): string { return new Date(Date.now() + 90_000).toISOString(); }

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
  provenance: "versioned_run";
};

type DossierLoader = (service: CreatorResearchService, id: string) => CreatorDossier | null;

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
