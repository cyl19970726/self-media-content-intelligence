import { describe, expect, it } from "vitest";
import { ContentKnowledgeService } from "../../packages/knowledge/index.js";
import { ResearchLearningService, type CreatorResearchCompletion, type ComparisonResearchCompletion } from "../../packages/research/index.js";
import { InMemoryContentKnowledgeRepository } from "../../packages/testkit/index.js";
import { ComparisonKnowledgeCompiler, CreatorKnowledgeCompiler } from "./research-knowledge-compiler.js";

function system() {
  let id = 0;
  const research = new ResearchLearningService(() => `research-${++id}`, () => "2026-08-30T00:00:00.000Z");
  const repository = new InMemoryContentKnowledgeRepository();
  const knowledge = new ContentKnowledgeService(repository, research,
    () => `00000000-0000-4000-8000-${String(++id).padStart(12, "0")}`,
    () => "2026-08-30T00:00:00.000Z");
  return { knowledge, research };
}

function creatorCompletion(): CreatorResearchCompletion {
  const runId = "11111111-1111-4111-8111-111111111111";
  return {
    creatorRunId: runId, creatorId: "creator-a", creatorName: "甲",
    synthesisArtifactRef: "artifact:creator-a:synthesis", gateArtifactRef: "artifact:creator-a:gate",
    gate: { schemaVersion: "1.1.0", creatorRunId: runId, ready: true, gates: [], failedGateIds: [], checkedAt: "2026-08-30T00:00:00Z",
      candidateRevisionFingerprint: "a".repeat(64), independentEvaluationArtifactRef: "artifact:creator-a:evaluation",
      evaluator: { evaluatorRunId: "22222222-2222-4222-8222-222222222222", independentOfCandidate: true, evaluatedAt: "2026-08-30T00:00:00Z" } },
    synthesis: {
      schemaVersion: "1.0.0", creatorRunId: runId, generatedAt: "2026-08-30T00:00:00Z",
      inputs: { portfolioArtifactRef: "p", selectionArtifactRef: "s", detailArtifactRef: "d", reconstructionBatchArtifactRef: "r" },
      identity: {} as never, contentSystem: {} as never, performance: {} as never,
      postAnalyses: Array.from({ length: 21 }, (_, index) => ({ postExternalId: `post-${index + 1}`,
        tier: index < 7 ? "high" as const : index < 14 ? "base" as const : "low" as const, tierRank: index % 7 + 1,
        title: null, evidenceStatus: index % 3 === 0 ? "deep_validated" as const : "surface_only" as const,
        contentRole: "先展示结果", contentForm: ["口播"], performanceInterpretation: `样本 ${index + 1} 的可核验解释`,
        evidenceRefs: [`evidence:creator-a:post-${index + 1}`], unknowns: [] })),
      boundaries: ["只适用于当前固定样本。"]
    }
  };
}

describe("production research knowledge compilers", () => {
  it("compiles per-post creator evidence, promotes deterministically, and is idempotent", () => {
    const { knowledge } = system();
    const compiler = new CreatorKnowledgeCompiler(knowledge);
    const completion = creatorCompletion();
    compiler.publish(completion);
    compiler.publish(completion);
    const concepts = knowledge.listKnowledge();
    expect(concepts).toHaveLength(1);
    expect(concepts[0]?.research.concept.scope).toBe("creator_specific");
    expect(concepts[0]?.research.observations).toHaveLength(21);
    expect(new Set(concepts[0]?.research.observations.map((item) => item.videoId)).size).toBe(21);
    const manifests = knowledge.listContributions("creator", completion.creatorRunId);
    expect(manifests).toHaveLength(1);
    expect(manifests[0]?.manifest.promotionDecisions[0]?.status).toBe("promoted");
  });

  it("leaves insufficient creator support as a candidate with an explicit gate decision", () => {
    const { knowledge } = system();
    const completion = creatorCompletion();
    completion.synthesis.postAnalyses.forEach((post, index) => { post.contentRole = `role-${index}`; });
    new CreatorKnowledgeCompiler(knowledge).publish(completion);
    expect(knowledge.listKnowledge().every((item) => item.research.concept.scope === "video_specific")).toBe(true);
    const decisions = knowledge.listContributions("creator", completion.creatorRunId)[0]!.manifest.promotionDecisions;
    expect(decisions.every((item) => item.status === "gate_failed")).toBe(true);
    expect(decisions[0]?.reason).toMatch(/3-distinct-supporting-videos/);
  });

  it("promotes a pinned three-creator comparison and does not duplicate unchanged delivery", () => {
    const { knowledge } = system();
    const support = ["a", "b", "c"].flatMap((creator, creatorIndex) => Array.from({ length: 3 }, (_, index) => ({
      creatorRunId: `run-${creator}`, creatorId: `creator-${creator}`, creatorName: creator.toUpperCase(),
      postExternalId: `${creator}-post-${index + 1}`, tier: index === 0 ? "high" as const : index === 1 ? "base" as const : "low" as const,
      evidenceStatus: index === 0 ? "deep_validated" as const : "surface_only" as const,
      contentForm: ["口播"], evidenceRefs: [`evidence:${creatorIndex}:${index}`]
    })));
    const completion = {
      comparisonProjectId: "33333333-3333-4333-8333-333333333333", comparisonArtifactRef: "artifact:comparison",
      sourceArtifactRefs: ["artifact:a", "artifact:b", "artifact:c"],
      comparison: { schemaVersion: "1.0.0", generatedAt: "2026-08-30T00:00:00Z", readiness: "content_validated",
        members: [], comparability: { platform: "小红书", metricBasis: "公开点赞", timeWindowAligned: false, members: [], warnings: [] }, creatorProfiles: [], observations: [], limitations: [], exceptions: [], gaps: [],
        contentPatterns: [{ role: "先展示结果", classification: "track_wide", statement: "三个博主固定样本均出现该角色。",
          boundary: "不声明因果。", creatorIds: ["creator-a", "creator-b", "creator-c"], condition: { format: null }, support }] }
    } as ComparisonResearchCompletion;
    const compiler = new ComparisonKnowledgeCompiler(knowledge);
    compiler.publish(completion);
    compiler.publish(completion);
    const concept = knowledge.listKnowledge()[0]!;
    expect(concept.research.concept.scope).toBe("track_wide");
    expect(concept.research.counts.distinctEligibleCreators).toBe(3);
    expect(concept.research.counts.distinctEligibleVideos).toBe(9);
    expect(knowledge.listContributions("comparison", completion.comparisonProjectId)).toHaveLength(1);
  });

  it("promotes a two-creator comparison only when it carries a non-empty shared condition", () => {
    const { knowledge } = system();
    const support = ["a", "b"].flatMap((creator) => Array.from({ length: 3 }, (_, index) => ({
      creatorRunId: `run-${creator}`, creatorId: `creator-${creator}`, creatorName: creator.toUpperCase(),
      postExternalId: `${creator}-post-${index + 1}`, tier: index === 0 ? "high" as const : "base" as const,
      evidenceStatus: index === 0 ? "deep_validated" as const : "surface_only" as const,
      contentForm: ["口播"], evidenceRefs: [`evidence:${creator}:${index}`]
    })));
    const completion = { comparisonProjectId: "55555555-5555-4555-8555-555555555555", comparisonArtifactRef: "artifact:conditional",
      sourceArtifactRefs: ["artifact:a", "artifact:b"], comparison: { schemaVersion: "1.0.0", generatedAt: "2026-08-30T00:00:00Z",
        readiness: "content_validated", members: [], comparability: { platform: "小红书", metricBasis: "公开点赞", timeWindowAligned: false, members: [], warnings: [] }, creatorProfiles: [], observations: [], limitations: [], exceptions: [], gaps: [],
        contentPatterns: [{ role: "条件角色", classification: "conditional", statement: "两个博主在口播条件下出现共同角色。",
          boundary: "只适用于口播固定样本。", creatorIds: ["creator-a", "creator-b"], condition: { format: "口播" }, support }] } } as ComparisonResearchCompletion;
    new ComparisonKnowledgeCompiler(knowledge).publish(completion);
    const concept = knowledge.listKnowledge()[0]!;
    expect(concept.research.concept.scope).toBe("conditional");
    expect(concept.research.currentRevision.condition.format).toBe("口播");
    expect(knowledge.listContributions("comparison", completion.comparisonProjectId)[0]?.manifest.promotionDecisions[0]?.status).toBe("promoted");
  });
});
