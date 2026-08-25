import { creatorSelectionSchema } from "../portfolio/contracts.js";
import { videoReconstructionBatchSchema } from "../video-analysis/batch-contracts.js";
import { creatorSynthesisGateSchema, creatorSynthesisSchema, type CreatorSynthesisGate } from "./contracts.js";

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
  const requiredGroups = ["high", "median", "mean", "low"] as const;
  const groupCoverage = Object.fromEntries(requiredGroups.map((group) => [group,
    selection.items.filter((item) => item.deepGroups.includes(group)).length])) as Record<typeof requiredGroups[number], number>;
  const deepContractReady = selection.ruleVersion.startsWith("four-groups-")
    ? requiredGroups.every((group) => groupCoverage[group] >= 3)
    : deep.size === 9;
  const gates = [
    { id: "canonical_21_coverage", pass: expected.size === 21 && actual.size === 21 && [...expected].every((id) => actual.has(id)),
      message: "逐条分析必须与规范 21 条同集且无遗漏。" },
    { id: "deep_9_ready", pass: deepContractReady && readyDeep.size === deep.size && [...deep].every((id) => readyDeep.has(id)),
      message: "深度候选必须覆盖高表现、中位数附近、均值附近、低表现各 3 条，并全部通过视频硬闸。" },
    { id: "deep_evidence_binding", pass: deepRows.length === deep.size && deepRows.every((item) => item.evidenceStatus === "deep_validated" && item.evidenceRefs.some((ref) => ref.includes("video-reconstructions"))),
      message: "深度结论必须绑定已验证重建，不得只引用标题或详情页。" },
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
