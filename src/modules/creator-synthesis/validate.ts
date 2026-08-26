import { creatorSelectionSchema } from "../portfolio/contracts.js";
import { videoReconstructionBatchSchema } from "../video-analysis/batch-contracts.js";
import {
  creatorSynthesisGateSchema,
  creatorSynthesisSchema,
  type CreatorSynthesisGate,
  type CreatorSynthesisIndependentEvaluation
} from "./contracts.js";

const advicePattern = /(我们(应该|可以|下一条|要发)|可直接复制|需要改造|不能复制|前\s*(10|30)\s*条|标题公式|单变量实验|起号方案|建议我们)/i;

export function validateCreatorSynthesis(input: {
  creatorRunId: string;
  selection: unknown;
  batch: unknown;
  synthesis: unknown;
  checkedAt: string;
}): CreatorSynthesisGate {
  const selection = creatorSelectionSchema.parse(input.selection);
  const batch = videoReconstructionBatchSchema.parse(input.batch);
  const synthesis = creatorSynthesisSchema.parse(input.synthesis);
  const expected = new Set(selection.items.map((item) => item.externalId));
  const actual = new Set(synthesis.postAnalyses.map((item) => item.postExternalId));
  const deep = new Set(selection.items.filter((item) => item.deepCandidate).map((item) => item.externalId));
  const readyDeep = new Set(batch.items.filter((item) => item.state === "ready").map((item) => item.postExternalId));
  const deepRows = synthesis.postAnalyses.filter((item) => deep.has(item.postExternalId));
  const unavailableDeep = new Set(batch.items.filter((item) => item.state === "blocked"
    && item.failedGateIds.includes("media_verification")).map((item) => item.postExternalId));
  const policyGroups = new Map<string, number>();
  for (const item of batch.items.filter((candidate) => candidate.state === "ready")) {
    policyGroups.set(item.evaluationPolicy, (policyGroups.get(item.evaluationPolicy) ?? 0) + 1);
  }
  const policyBoundary = synthesis.boundaries.join(" ");
  const policyProvenanceReady = policyGroups.size < 2 || [...policyGroups.entries()].every(([policy, count]) =>
    policyBoundary.includes(policy) && policyBoundary.includes(String(count))
  );
  const requiredGroups = ["high", "median", "mean", "low"] as const;
  const groupCoverage = Object.fromEntries(requiredGroups.map((group) => [group,
    selection.items.filter((item) => item.deepGroups.includes(group)).length])) as Record<typeof requiredGroups[number], number>;
  const deepContractReady = selection.ruleVersion.startsWith("four-groups-")
    ? requiredGroups.every((group) => groupCoverage[group] >= 3)
    : deep.size === 9;
  const boundedMediaGap = batch.limitations.some((item) => item.startsWith("bounded_media_retry_once:"))
    && unavailableDeep.size > 0
    && batch.items.filter((item) => item.state !== "ready").every((item) => unavailableDeep.has(item.postExternalId));
  const readyGroupCoverage = Object.fromEntries(requiredGroups.map((group) => [group,
    selection.items.filter((item) => item.deepGroups.includes(group) && readyDeep.has(item.externalId)).length
  ])) as Record<typeof requiredGroups[number], number>;
  const boundedCoverageReady = boundedMediaGap && requiredGroups.every((group) => readyGroupCoverage[group] >= 1);
  const gates = [
    { id: "canonical_21_coverage", pass: expected.size === 21 && actual.size === 21 && [...expected].every((id) => actual.has(id)),
      message: "逐条分析必须与规范 21 条同集且无遗漏。" },
    { id: "deep_9_ready", pass: deepContractReady && ((readyDeep.size === deep.size && [...deep].every((id) => readyDeep.has(id))) || boundedCoverageReady),
      message: "历史 gate ID；四组各保留 3 个注册成员并允许重叠。全部可得媒体须完成单轮分析；仅当一次定向补取后仍不可得、四组各至少有 1 条已验证视频且缺口显式保留时，才允许带边界通过。" },
    { id: "deep_evidence_binding", pass: policyProvenanceReady && deepRows.length === deep.size && deepRows.every((item) =>
      readyDeep.has(item.postExternalId)
        ? item.evidenceStatus === "deep_validated" && item.evidenceRefs.some((ref) => ref.includes("video-reconstructions"))
        : unavailableDeep.has(item.postExternalId) && item.evidenceStatus === "surface_only"
          && item.unknowns.some((unknown) => /媒体|视频.*不可|无法.*视频/.test(unknown))),
      message: "可得视频必须绑定重建与 evaluator policy；媒体不可得成员只能使用 surface_only 证据并明确视频内容未知。" },
    { id: "three_tiers_present", pass: ["high", "base", "low"].every((tier) => synthesis.postAnalyses.some((item) => item.tier === tier)),
      message: "High / Base / Low 三档必须同时存在。" },
    { id: "evidence_classification", pass: JSON.stringify(synthesis).includes("factClass") && synthesis.postAnalyses.every((item) => item.evidenceRefs.length > 0),
      message: "账号级主张必须分事实类别，逐条判断必须有证据引用。" },
    { id: "research_creation_separation", pass: !advicePattern.test(JSON.stringify(synthesis)),
      message: "研究产物不得混入我们该复制什么或下一条怎么发。" },
    { id: "backend_metrics_unknown", pass: synthesis.boundaries.some((item) => /曝光|完播|转粉|投流|成交/.test(item)),
      message: "不可见后台指标必须保留未知边界。" }
  ];
  return creatorSynthesisGateSchema.parse({ schemaVersion: "1.0.0", creatorRunId: input.creatorRunId,
    ready: gates.every((gate) => gate.pass), gates, failedGateIds: gates.filter((gate) => !gate.pass).map((gate) => gate.id), checkedAt: input.checkedAt });
}

export function combineCreatorSynthesisGates(input: {
  deterministicGate: CreatorSynthesisGate;
  independentEvaluation: CreatorSynthesisIndependentEvaluation;
  candidateRevisionFingerprint: string;
  independentEvaluationArtifactRef: string;
  checkedAt: string;
}): CreatorSynthesisGate {
  if (input.independentEvaluation.candidateRevisionFingerprint !== input.candidateRevisionFingerprint) {
    throw new Error("independent_synthesis_revision_mismatch");
  }
  const independentById = new Map<string, CreatorSynthesisIndependentEvaluation["gates"][number]>(
    input.independentEvaluation.gates.map((gate) => [gate.id, gate])
  );
  const gates = input.deterministicGate.gates.map((gate) => {
    const independent = independentById.get(gate.id);
    return {
      id: gate.id,
      pass: gate.pass && independent?.pass === true,
      message: `${gate.message} 独立评估：${independent?.message ?? "缺失"}`
    };
  });
  return creatorSynthesisGateSchema.parse({
    schemaVersion: "1.1.0",
    creatorRunId: input.deterministicGate.creatorRunId,
    ready: gates.every((gate) => gate.pass),
    gates,
    failedGateIds: gates.filter((gate) => !gate.pass).map((gate) => gate.id),
    checkedAt: input.checkedAt,
    candidateRevisionFingerprint: input.candidateRevisionFingerprint,
    independentEvaluationArtifactRef: input.independentEvaluationArtifactRef,
    evaluator: {
      evaluatorRunId: input.independentEvaluation.evaluatorRunId,
      independentOfCandidate: true,
      evaluatedAt: input.independentEvaluation.evaluatedAt
    }
  });
}
