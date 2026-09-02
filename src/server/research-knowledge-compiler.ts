import { createHash } from "node:crypto";
import type {
  CreatorResearchCompletion,
  CreatorResearchCompletionPort,
  ComparisonResearchCompletion,
  ComparisonResearchCompletionPort
} from "../../packages/research/index.js";
import type { CompileKnowledgeInput, ContentKnowledgeService, KnowledgeCompilerPort } from "../../packages/knowledge/index.js";

const CREATOR_POLICY = "creator-synthesis-recurring-structure-v3";
const COMPARISON_POLICY = "creator-comparison-v1";

function sha(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function token(value: string): string {
  const normalized = value.normalize("NFKC").trim().toLocaleLowerCase();
  const ascii = normalized.replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-+|-+$/gu, "");
  return ascii.slice(0, 72) || sha(normalized).slice(0, 16);
}

function creatorPatternSlug(creatorId: string, statement: string): string {
  return `creator-${token(creatorId).slice(0, 32)}-pattern-${sha(statement).slice(0, 16)}`;
}

function refSupportsPost(reference: string, postExternalId: string): boolean {
  return reference.includes(`/${postExternalId}/`) || reference.endsWith(`#${postExternalId}`)
    || reference.includes(`#${postExternalId}:`);
}

function patternName(statement: string): string {
  const first = statement.split(/[：；。]/u)[0]?.trim() || statement.trim();
  return first.length > 54 ? `${first.slice(0, 53)}…` : first;
}

export function proposeCreatorKnowledge(completion: Readonly<CreatorResearchCompletion>): CompileKnowledgeInput {
  if (!completion.gate.ready || !completion.gate.evaluator?.independentOfCandidate) {
    throw new Error("creator knowledge requires a ready independent synthesis gate");
  }
  const fingerprint = sha({ synthesis: completion.synthesis, gate: completion.gate,
    synthesisArtifactRef: completion.synthesisArtifactRef, gateArtifactRef: completion.gateArtifactRef });
  const patterns = completion.synthesis.contentSystem.recurringStructure.slice(0, 12).map((claim) => ({
    claim,
    posts: completion.synthesis.postAnalyses.filter((post) =>
      claim.evidenceRefs.some((reference) => refSupportsPost(reference, post.postExternalId)))
  })).filter((pattern) => pattern.posts.length > 0);
  return {
    operationKey: `knowledge-compile:creator:${completion.creatorRunId}:${fingerprint}:${CREATOR_POLICY}`,
    compilerPolicyVersion: CREATOR_POLICY,
    inputFingerprint: `sha256:${fingerprint}`,
    evidenceGate: [completion.synthesisArtifactRef, completion.gateArtifactRef].map((ref) => ({ ref, availability: "available" as const })),
    promotionRequests: patterns.map(({ claim, posts }) => ({
      conceptSlug: creatorPatternSlug(completion.creatorId, claim.statement),
      targetScope: "creator_specific" as const,
      creatorId: completion.creatorId,
      condition: new Set(posts.map((post) => post.tier)).size === 1 ? { tier: posts[0]!.tier } : undefined,
      decision: `Deterministic creator-specific gate passed for independently evaluated creator run ${completion.creatorRunId}.`
    })),
    analysis: {
      analysisRevisionId: `creator:${completion.creatorRunId}:${fingerprint.slice(0, 20)}:${CREATOR_POLICY}`,
      subjectType: "creator",
      subjectId: completion.creatorRunId,
      creatorId: completion.creatorId,
      videoId: null,
      deepReconstruction: false,
      lensGates: { contentRestoration: "ready", directingLogic: "ready", visualEditingLogic: "ready" },
      observations: patterns.flatMap(({ claim, posts }) => posts.map((post) => ({
        creatorId: completion.creatorId,
        videoId: post.postExternalId,
        deepReconstruction: post.evidenceStatus === "deep_validated",
        concept: {
          slug: creatorPatternSlug(completion.creatorId, claim.statement),
          kind: "content_mechanism" as const,
          name: patternName(claim.statement),
          definition: claim.statement,
          exclusions: [...new Set([
            "不外推为其他博主或赛道的通用规律。",
            "不把公开表现相关性表述为因果关系。",
            ...completion.synthesis.boundaries.slice(0, 3)
          ])]
        },
        relation: "confirm" as const,
        condition: { tier: post.tier, format: post.contentForm[0] },
        statement: `重复结构证据｜${post.contentRole}｜${post.performanceInterpretation}`,
        evidenceRefs: [...new Set([...claim.evidenceRefs, ...post.evidenceRefs, completion.synthesisArtifactRef, completion.gateArtifactRef])],
        confidence: claim.confidence === "low" || post.evidenceStatus !== "deep_validated" ? "medium" as const : "high" as const
      })) )
    }
  };
}

export class CreatorKnowledgeCompiler implements CreatorResearchCompletionPort, KnowledgeCompilerPort<CreatorResearchCompletion> {
  constructor(private readonly knowledge: ContentKnowledgeService) {}
  publish(completion: Readonly<CreatorResearchCompletion>): void { this.knowledge.stage(this.propose(completion)); }
  propose(completion: Readonly<CreatorResearchCompletion>): CompileKnowledgeInput { return proposeCreatorKnowledge(completion); }
}

export class ComparisonKnowledgeCompiler implements ComparisonResearchCompletionPort, KnowledgeCompilerPort<ComparisonResearchCompletion> {
  constructor(private readonly knowledge: ContentKnowledgeService) {}
  publish(completion: Readonly<ComparisonResearchCompletion>): void { this.knowledge.stage(this.propose(completion)); }
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
