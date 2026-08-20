import { randomUUID } from "node:crypto";
import type { CreatorArtifactStore } from "../creator-research/artifact-store.js";
import { LocalCreatorArtifactStore } from "../../platform/artifacts/local-creator-artifact-store.js";
import { SQLiteComparisonProjectRepository } from "../../platform/database/sqlite-comparison-project-repository.js";
import type { CreatorResearchService } from "../creator-research/service.js";
import type { ComparisonProjectRepository } from "./repository.js";
import { compareCreatorPortfolios } from "./analyzer.js";
import { comparisonProjectSchema, createComparisonProjectInputSchema, type ComparisonProject } from "./project-contracts.js";
import { creatorComparisonSchema } from "./contracts.js";

function now(): string { return new Date().toISOString(); }
function leaseUntil(): string { return new Date(Date.now() + 90_000).toISOString(); }

export class ComparisonProjectService {
  constructor(
    private readonly creators: CreatorResearchService,
    private readonly repository: ComparisonProjectRepository = new SQLiteComparisonProjectRepository(),
    private readonly artifacts: CreatorArtifactStore = new LocalCreatorArtifactStore()
  ) {}

  create(input: unknown): ComparisonProject {
    const request = createComparisonProjectInputSchema.parse(input);
    const timestamp = now();
    const members = request.creatorRunIds.map((creatorRunId) => {
      const snapshot = this.creators.portfolio(creatorRunId);
      if (!snapshot?.analysis || !snapshot.selection || !snapshot.run.portfolioArtifactRef || !snapshot.run.selectionArtifactRef) {
        throw new Error(`博主任务 ${creatorRunId} 尚未形成可固定的 Portfolio`);
      }
      return {
        creatorRunId,
        creatorName: snapshot.run.creatorName ?? creatorRunId.slice(0, 8),
        portfolioArtifactRef: snapshot.run.portfolioArtifactRef,
        selectionArtifactRef: snapshot.run.selectionArtifactRef,
        pinnedAt: timestamp,
        analysis: snapshot.analysis,
        selection: snapshot.selection
      };
    });
    const id = randomUUID();
    const inputArtifactRef = this.artifacts.write(id, "comparison-input-r1.json", {
      schemaVersion: "1.0.0", comparisonProjectId: id, generatedAt: timestamp,
      members: members.map((member) => ({ creatorRunId: member.creatorRunId, creatorName: member.creatorName,
        portfolioRevision: member.portfolioArtifactRef, analysis: member.analysis, selection: member.selection }))
    });
    const project = comparisonProjectSchema.parse({
      schemaVersion: "1.0.0", id, name: request.name, status: "queued", createdAt: timestamp, updatedAt: timestamp,
      members: members.map(({ creatorRunId, creatorName, portfolioArtifactRef, selectionArtifactRef, pinnedAt }) =>
        ({ creatorRunId, creatorName, portfolioArtifactRef, selectionArtifactRef, pinnedAt })),
      inputArtifactRef, comparisonArtifactRef: null,
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
