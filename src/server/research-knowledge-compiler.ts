import { createHash } from "node:crypto";
import type {
  CreatorResearchCompletion,
  CreatorResearchCompletionPort,
  ComparisonResearchCompletion,
  ComparisonResearchCompletionPort
} from "../../packages/research/index.js";
import type { CompileKnowledgeInput, ContentKnowledgeService, KnowledgeCompilerPort } from "../../packages/knowledge/index.js";

const CREATOR_POLICY = "creator-synthesis-v1";
const COMPARISON_POLICY = "creator-comparison-v1";

function sha(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function token(value: string): string {
  const normalized = value.normalize("NFKC").trim().toLocaleLowerCase();
  const ascii = normalized.replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-+|-+$/gu, "");
  return ascii.slice(0, 72) || sha(normalized).slice(0, 16);
}

function creatorRoleSlug(creatorId: string, role: string): string {
  return `creator-${token(creatorId)}-${token(role)}`;
}

export function proposeCreatorKnowledge(completion: Readonly<CreatorResearchCompletion>): CompileKnowledgeInput {
  if (!completion.gate.ready || !completion.gate.evaluator?.independentOfCandidate) {
    throw new Error("creator knowledge requires a ready independent synthesis gate");
  }
  const fingerprint = sha({ synthesis: completion.synthesis, gate: completion.gate,
    synthesisArtifactRef: completion.synthesisArtifactRef, gateArtifactRef: completion.gateArtifactRef });
  const groups = new Map<string, typeof completion.synthesis.postAnalyses>();
  for (const post of completion.synthesis.postAnalyses) {
    const key = post.contentRole.normalize("NFKC").trim().toLocaleLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), post]);
  }
  const bounded = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, 12);
  return {
    operationKey: `knowledge-compile:creator:${completion.creatorRunId}:${fingerprint}:${CREATOR_POLICY}`,
    compilerPolicyVersion: CREATOR_POLICY,
    inputFingerprint: `sha256:${fingerprint}`,
    evidenceGate: [completion.synthesisArtifactRef, completion.gateArtifactRef].map((ref) => ({ ref, availability: "available" as const })),
    promotionRequests: bounded.map(([role]) => ({
      conceptSlug: creatorRoleSlug(completion.creatorId, role),
      targetScope: "creator_specific" as const,
      creatorId: completion.creatorId,
      decision: `Deterministic creator-specific gate passed for independently evaluated creator run ${completion.creatorRunId}.`
    })),
    analysis: {
      analysisRevisionId: `creator:${completion.creatorRunId}:${fingerprint.slice(0, 20)}`,
      subjectType: "creator",
      subjectId: completion.creatorRunId,
      creatorId: completion.creatorId,
      videoId: null,
      deepReconstruction: false,
      lensGates: { contentRestoration: "ready", directingLogic: "ready", visualEditingLogic: "ready" },
      observations: bounded.flatMap(([role, posts]) => posts.map((post) => ({
        creatorId: completion.creatorId,
        videoId: post.postExternalId,
        deepReconstruction: post.evidenceStatus === "deep_validated",
        concept: {
          slug: creatorRoleSlug(completion.creatorId, role),
          kind: "content_mechanism" as const,
          name: post.contentRole,
          definition: `该博主反复使用「${post.contentRole}」承担稳定的内容角色。`,
          exclusions: [...new Set([
            "不外推为其他博主或赛道的通用规律。",
            "不把公开表现相关性表述为因果关系。",
            ...completion.synthesis.boundaries.slice(0, 3)
          ])]
        },
        relation: "confirm" as const,
        condition: { tier: post.tier, format: post.contentForm[0] },
        statement: `${post.contentRole}：${post.performanceInterpretation}`,
        evidenceRefs: [...new Set([...post.evidenceRefs, completion.synthesisArtifactRef, completion.gateArtifactRef])],
        confidence: post.evidenceStatus === "deep_validated" ? "high" as const : "medium" as const
      })) )
    }
  };
}

export class CreatorKnowledgeCompiler implements CreatorResearchCompletionPort, KnowledgeCompilerPort<CreatorResearchCompletion> {
  constructor(private readonly knowledge: ContentKnowledgeService) {}
  publish(completion: Readonly<CreatorResearchCompletion>): void { this.knowledge.compile(this.propose(completion)); }
  propose(completion: Readonly<CreatorResearchCompletion>): CompileKnowledgeInput { return proposeCreatorKnowledge(completion); }
}

export class ComparisonKnowledgeCompiler implements ComparisonResearchCompletionPort, KnowledgeCompilerPort<ComparisonResearchCompletion> {
  constructor(private readonly knowledge: ContentKnowledgeService) {}
  publish(completion: Readonly<ComparisonResearchCompletion>): void { this.knowledge.compile(this.propose(completion)); }
  propose(completion: Readonly<ComparisonResearchCompletion>): CompileKnowledgeInput {
    const fingerprint = sha(completion);
    const patterns = completion.comparison.contentPatterns;
    return {
      operationKey: `knowledge-compile:comparison:${completion.comparisonProjectId}:${fingerprint}:${COMPARISON_POLICY}`,
      compilerPolicyVersion: COMPARISON_POLICY,
      inputFingerprint: `sha256:${fingerprint}`,
      evidenceGate: [completion.comparisonArtifactRef, ...completion.sourceArtifactRefs]
        .map((ref) => ({ ref, availability: "available" as const })),
      promotionRequests: patterns.map((pattern) => ({
        conceptSlug: `comparison-${token(pattern.role)}`,
        targetScope: pattern.classification,
        condition: pattern.condition,
        comparableCreatorIds: pattern.creatorIds,
        decision: `Deterministic ${pattern.classification} gate passed for pinned comparison ${completion.comparisonProjectId}.`
      })),
      analysis: {
        analysisRevisionId: `comparison:${completion.comparisonProjectId}:${fingerprint.slice(0, 20)}`,
        subjectType: "comparison",
        subjectId: completion.comparisonProjectId,
        creatorId: null,
        videoId: null,
        deepReconstruction: false,
        lensGates: { contentRestoration: completion.comparison.readiness === "content_validated" ? "ready" : "partial",
          directingLogic: completion.comparison.readiness === "content_validated" ? "ready" : "partial",
          visualEditingLogic: completion.comparison.readiness === "content_validated" ? "ready" : "partial" },
        observations: patterns.flatMap((pattern) => pattern.support.map((row) => ({
          creatorId: row.creatorId,
          videoId: row.postExternalId,
          deepReconstruction: row.evidenceStatus === "deep_validated",
          concept: { slug: `comparison-${token(pattern.role)}`, kind: "content_mechanism" as const,
            name: pattern.role, definition: pattern.statement,
            exclusions: [...new Set([pattern.boundary, "不把公开表现相关性表述为因果关系。"]) ] },
          relation: "confirm" as const,
          condition: { ...pattern.condition, tier: row.tier, format: pattern.condition.format ?? row.contentForm[0] },
          statement: `${pattern.role}｜${row.creatorName}｜${row.postExternalId}`,
          evidenceRefs: [...new Set([...row.evidenceRefs, completion.comparisonArtifactRef])],
          confidence: row.evidenceStatus === "deep_validated" ? "high" as const : "medium" as const
        })))
      }
    };
  }
}
