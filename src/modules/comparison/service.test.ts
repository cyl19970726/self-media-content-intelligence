import { describe, expect, it } from "vitest";
import type { CreatorResearchService } from "../creator-research/service.js";
import type { CreatorArtifactStore } from "../creator-research/artifact-store.js";
import type { ComparisonProject } from "./project-contracts.js";
import type { ComparisonProjectRepository } from "./repository.js";
import { ComparisonProjectService } from "./service.js";
import { loadCreatorDossier } from "../../server/creator-dossier.js";

class MemoryRepository implements ComparisonProjectRepository {
  values = new Map<string, ComparisonProject>();
  save(project: ComparisonProject) { this.values.set(project.id, structuredClone(project)); }
  get(id: string) { const value = this.values.get(id); return value ? structuredClone(value) : null; }
  list() { return [...this.values.values()].map((value) => structuredClone(value)); }
  claimNext(workerId: string, at: string, leaseExpiresAt: string) {
    const project = this.list().find((value) => value.status === "queued") ?? null;
    if (!project) return null;
    project.status = "running";
    project.job = { state: "running", attempt: project.job.attempt + 1, leaseOwner: workerId, leaseExpiresAt, lastHeartbeatAt: at };
    this.save(project);
    return project;
  }
  heartbeat() { return true; }
  close() {}
}

describe("ComparisonProjectService", () => {
  it("pins existing Creator Dossier projections with an auditable source and revision", () => {
    const creators = { list: () => [], get: () => null, portfolio: () => null } as unknown as CreatorResearchService;
    const values = new Map<string, unknown>();
    const artifacts: CreatorArtifactStore = {
      write(runId, filename, value) { const ref = `/artifacts/${runId}/${filename}`; values.set(ref, structuredClone(value)); return ref; },
      read(reference) { const value = values.get(reference); if (!value) throw new Error("missing artifact"); return structuredClone(value); }
    };
    const repository = new MemoryRepository();
    const service = new ComparisonProjectService(creators, repository, artifacts, loadCreatorDossier);
    const sources = ["ai-red-witch", "zhang-zala"].map((creatorId) => {
      const dossier = loadCreatorDossier(creators, creatorId);
      expect(dossier).not.toBeNull();
      return { creatorId, sourceRunId: `legacy:${creatorId}`, revision: dossier!.lastGood.revisionLabel ?? dossier!.generatedAt };
    });
    const project = service.create({ name: "AI 博主对照", creatorSources: sources });

    expect(project.status).toBe("queued");
    expect(project.members.map((member) => member.sourceRunId)).toEqual(["legacy:ai-red-witch", "legacy:zhang-zala"]);
    expect(project.members.map((member) => member.revision)).toEqual(sources.map((source) => source.revision));
    expect(project.members.every((member) => member.portfolioArtifactRef === member.selectionArtifactRef)).toBe(true);
    expect(() => service.create({ name: "过期版本", creatorSources: [
      { ...sources[0]!, revision: "stale-revision" }, sources[1]!
    ] })).toThrow(/已更新/);
    expect(service.processNext("comparison-test")).toBe(true);
    const completed = service.get(project.id);
    expect(completed?.project.status).toBe("ready");
    expect(completed?.comparison?.members).toHaveLength(2);
    expect(completed?.comparison?.readiness).toBe("portfolio_only");
  });
});
