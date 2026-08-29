import { describe, expect, it } from "vitest";
import type { CreatorArtifactStore, CreatorResearchService } from "../../index.js";
import type { ComparisonProject } from "./project-contracts.js";
import type { ComparisonProjectRepository } from "./repository.js";
import { ComparisonProjectService } from "./service.js";
import { loadCreatorDossier } from "../../../../src/server/creator-dossier.js";

const describeWithExternalEvidence = process.env.SIGNAL_ROOM_EVIDENCE_ROOT ? describe : describe.skip;

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

describeWithExternalEvidence("ComparisonProjectService", () => {
  it("pins existing Creator Dossier projections with an auditable source and revision", () => {
    const creators = { list: () => [], get: () => null, portfolio: () => null } as unknown as CreatorResearchService;
    const values = new Map<string, unknown>();
    const artifacts: CreatorArtifactStore = {
      write(runId, filename, value) { const ref = `/artifacts/${runId}/${filename}`; values.set(ref, structuredClone(value)); return ref; },
      read(reference) { const value = values.get(reference); if (!value) throw new Error("missing artifact"); return structuredClone(value); },
      archiveReconstructionEvaluations() { /* comparison fixture has no physical evaluations */ },
      reconstructionProgress() { return "runner_start"; }
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

describe("ComparisonProjectService production completion", () => {
  it("pins ready synthesis gates and publishes only after the comparison is persisted", () => {
    const values = new Map<string, unknown>();
    const artifacts: CreatorArtifactStore = {
      write(runId, filename, value) { const ref = `/artifacts/${runId}/${filename}`; values.set(ref, structuredClone(value)); return ref; },
      read(reference) { const value = values.get(reference); if (!value) throw new Error("missing artifact"); return structuredClone(value); },
      archiveReconstructionEvaluations() {}, reconstructionProgress() { return "runner_start"; }
    };
    const snapshots = new Map<string, ReturnType<typeof snapshot>>([snapshot("1", "甲"), snapshot("2", "乙")].map((item) => [item.run.id, item]));
    const creators = { portfolio: (id: string) => snapshots.get(id) ?? null } as unknown as CreatorResearchService;
    const dossiers = new Map([...snapshots.values()].map((item) => [item.run.creatorId!, {
      source: "versioned_run", canonicalId: item.run.creatorId, identity: { name: item.name }, run: item.run
    }]));
    const completed: string[] = [];
    const repository = new MemoryRepository();
    const service = new ComparisonProjectService(creators, repository, artifacts,
      ((_service: CreatorResearchService, id: string) => dossiers.get(id) ?? null) as never,
      { publish(value) { expect(repository.get(value.comparisonProjectId)?.status).toBe("ready"); completed.push(value.comparisonProjectId); } });
    const sources = [...snapshots.values()].map((item) => ({ creatorId: item.run.creatorId!, sourceRunId: item.run.id,
      revision: `${item.run.portfolioArtifactRef}|${item.run.selectionArtifactRef}` }));
    const project = service.create({ name: "内容比较", creatorSources: sources });
    expect(project.members.every((member) => member.synthesisArtifactRef && member.synthesisGateArtifactRef)).toBe(true);
    expect(service.processNext("worker")).toBe(true);
    expect(service.get(project.id)?.project.error).toBeNull();
    expect(service.get(project.id)?.comparison?.readiness).toBe("content_validated");
    expect(service.get(project.id)?.project.knowledgeCompilation?.status).toBe("succeeded");
    expect(completed).toEqual([project.id]);
  });
});

function snapshot(id: string, name: string) {
  const runId = `${id.repeat(8)}-${id.repeat(4)}-4${id.repeat(3)}-8${id.repeat(3)}-${id.repeat(12)}`;
  const portfolioArtifactRef = `/creator/${id}/portfolio.json`;
  const selectionArtifactRef = `/creator/${id}/selection.json`;
  const synthesisArtifactRef = `/creator/${id}/synthesis.json`;
  const synthesisGateArtifactRef = `/creator/${id}/gate.json`;
  const analysis = { schemaVersion: "1.0.0", runId, generatedAt: "2026-08-30T00:00:00Z", corpusArtifactRef: "corpus", selectionArtifactRef,
    metricCoverage: { known: 21, missing: 0, rate: 1 }, likes: { min: 1, p25: 2, median: 3, mean: 4, p75: 5, max: 10 },
    tierCounts: { high: 7, base: 7, low: 7 }, anchors: { median: 3, mean: 4, medianNearPostId: "m", meanNearPostId: "a", meanGap: false, meanGapReason: null },
    interpretationBoundary: "fixture", unknowns: [] };
  const selection = { schemaVersion: "1.0.0", runId, generatedAt: "2026-08-30T00:00:00Z", sourceCorpusArtifactRef: "corpus", ruleVersion: "ranked-7x3-v1",
    rules: { targetPerTier: 7, deepCandidatesPerTier: 3, high: "h", base: "b", low: "l", unknownMetricPolicy: "exclude_from_metric_tiering" },
    denominator: { discoveredPosts: 21, eligiblePosts: 21, selectedPosts: 21, excludedMissingLikes: 0 },
    anchors: analysis.anchors, tierCounts: analysis.tierCounts, items: [], limitations: [] };
  const claim = { statement: "fixture", factClass: "observed", confidence: "high", evidenceRefs: [`evidence:${id}`], caveat: null };
  const synthesis = { schemaVersion: "1.0.0", creatorRunId: runId, generatedAt: "2026-08-30T00:00:00Z",
    inputs: { portfolioArtifactRef, selectionArtifactRef, detailArtifactRef: "detail", reconstructionBatchArtifactRef: "batch" },
    identity: { positioning: claim, audience: [claim], problemsAddressed: [claim], valueProvided: [claim], trustSources: [claim], lifecycleStage: claim, commercialPaths: [] },
    contentSystem: { topicClusters: [claim], formatClusters: [claim], visualLanguage: [claim], publishingRhythm: [], recurringStructure: [claim] },
    performance: { baseline: [claim], high: [claim], low: [claim], timing: [], confounds: ["fixture"] },
    postAnalyses: Array.from({ length: 21 }, (_, index) => ({ postExternalId: `${id}-${index}`, tier: index < 7 ? "high" : index < 14 ? "base" : "low",
      tierRank: index % 7 + 1, title: null, evidenceStatus: index % 3 === 0 ? "deep_validated" : "surface_only", contentRole: index < 3 ? "共同角色" : `local-${id}-${index}`,
      contentForm: ["口播"], performanceInterpretation: "fixture", evidenceRefs: [`evidence:${id}:${index}`], unknowns: [] })), boundaries: ["fixture"] };
  const synthesisGate = { schemaVersion: "1.1.0", creatorRunId: runId, ready: true, gates: [], failedGateIds: [], checkedAt: "2026-08-30T00:00:00Z",
    candidateRevisionFingerprint: "a".repeat(64), independentEvaluationArtifactRef: `evaluation:${id}`,
    evaluator: { evaluatorRunId: runId, independentOfCandidate: true, evaluatedAt: "2026-08-30T00:00:00Z" } };
  return { name, run: { id: runId, creatorId: `creator-${id}`, portfolioArtifactRef, selectionArtifactRef, synthesisArtifactRef, synthesisGateArtifactRef },
    analysis, selection, synthesis, synthesisGate };
}
