import type { ComparisonProjectService, CreatorComparison } from "../../packages/research/index.js";
import type { CreatorResearchService } from "../../packages/research/index.js";
import { comparisonDossierSchema, type ComparisonDossier } from "../shared/comparison-dossier.js";
import { loadCreatorDossier } from "./creator-dossier.js";
import type { ResearchStatement } from "../../packages/contracts/index.js";

export function loadComparisonDossier(
  comparisons: ComparisonProjectService,
  creators: CreatorResearchService,
  id: string
): ComparisonDossier | null {
  const stored = comparisons.get(id);
  if (!stored) return null;
  const pinnedInputArtifactRef = stored.project.inputArtifactRef;
  const dossiers = stored.project.members.map((member) => ({ member, dossier: loadCreatorDossier(creators, member.creatorId) }));
  const creatorIdsByRun = new Map(stored.project.members.map((member) => [member.creatorRunId, member.creatorId]));
  const rowsByRun = new Map(stored.comparison?.members?.map((row) => [row.creatorRunId, row]) ?? []);
  const profilesByRun = new Map(stored.comparison?.creatorProfiles?.map((profile) => [profile.creatorRunId, profile]) ?? []);
  const unknown = (statement: string): ResearchStatement => ({ statement, factClass: "unknown", confidence: "low", evidenceRefs: [pinnedInputArtifactRef], caveat: "固定比较输入未包含这一维度。" });
  const cells = (
    selectProfile: (profile: CreatorComparison["creatorProfiles"][number]) => ResearchStatement[],
    selectDossier: (dossier: NonNullable<(typeof dossiers)[number]["dossier"]>) => ResearchStatement[]
  ) => stored.project.members.map((member) => {
    const profile = profilesByRun.get(member.creatorRunId);
    const dossier = dossiers.find((item) => item.member.creatorRunId === member.creatorRunId)?.dossier;
    return { creatorId: member.creatorId, creatorName: member.creatorName,
      statements: profile ? selectProfile(profile) : dossier ? selectDossier(dossier) : [unknown("当前固定版本未记录这一维度。")] };
  });
  const warnings = [
    "比较使用各博主自身中位数与档位，不以原始点赞直接排名。",
    "当前项目固定成员版本；账号年龄、粉丝规模、投流和商业内容差异仍可能混杂。",
    ...(stored.comparison?.comparability?.warnings ?? []),
    ...dossiers.filter(({ dossier }) => dossier && dossier.corpus.health.status !== "full").map(({ dossier }) => `${dossier!.identity.name} 的全量基本盘为${dossier!.corpus.health.status === "partial" ? "部分覆盖" : "未覆盖"}。`)
  ];
  const members = stored.project.members.map((member) => {
    const dossier = dossiers.find((item) => item.member.creatorRunId === member.creatorRunId)?.dossier;
    const row = rowsByRun.get(member.creatorRunId);
    const profile = profilesByRun.get(member.creatorRunId);
    const selectedCounts = row?.selectedCounts ?? { high: 0, base: 0, low: 0 };
    return {
      creatorId: member.creatorId, creatorRunId: member.creatorRunId, name: member.creatorName,
      href: `/creators/${encodeURIComponent(member.creatorId)}?comparison=${encodeURIComponent(id)}`,
      postCount: row?.discoveredPosts ?? dossier?.corpus.postCount ?? 0, coverageRate: row?.likesCoverage ?? dossier?.corpus.coverageRate ?? 0,
      medianLikes: row?.medianLikes ?? null, meanLikes: row?.meanLikes ?? null, maxLikes: row?.maxLikes ?? null,
      meanMedianMultiple: row?.meanToMedianRatio ?? null, maxMedianMultiple: row?.headToMedianRatio ?? null, selectedCounts,
      positioning: profile?.positioning ?? dossier?.identity.positioning ?? unknown("当前固定版本没有定位结论。"),
      values: profile?.values ?? dossier?.identity.valuesProvided ?? [unknown("当前固定版本没有价值结论。")],
      lifecycle: profile?.lifecycle ?? dossier?.identity.lifecycle ?? unknown("当前固定版本没有生命周期结论。")
    };
  });
  const creatorHref = (creatorId: string) => `/creators/${encodeURIComponent(creatorId)}?comparison=${encodeURIComponent(id)}`;
  const observationLedger = stored.comparison?.observations?.map((observation) => ({
    classification: observation.classification, statement: observation.text, boundary: observation.boundary,
    creatorHrefs: observation.evidenceCreatorRunIds.map((runId) => creatorIdsByRun.get(runId)).filter((value): value is string => Boolean(value)).map(creatorHref)
  })) ?? [];
  const patternLedger = stored.comparison?.contentPatterns?.map((pattern) => ({ classification: pattern.classification,
    statement: pattern.statement, boundary: pattern.boundary, creatorHrefs: pattern.creatorIds.map(creatorHref) })) ?? [];
  const exceptionLedger = stored.comparison?.exceptions?.map((exception) => ({ classification: "creator_specific" as const,
    statement: `${exception.creatorId} / ${exception.role}：${exception.reason}`, boundary: "博主特有项不会自动外推。", creatorHrefs: [creatorHref(exception.creatorId)] })) ?? [];
  const gapLedger = stored.comparison?.gaps?.map((gap) => ({ classification: "unknown" as const, statement: gap,
    boundary: "证据不足时保持未知。", creatorHrefs: [] })) ?? [];
  const ledger = [...observationLedger, ...patternLedger, ...exceptionLedger, ...gapLedger];
  return comparisonDossierSchema.parse({
    schemaVersion: "1.0.0", id: stored.project.id, name: stored.project.name, status: stored.project.status, generatedAt: stored.project.updatedAt,
    scope: { platform: stored.comparison?.comparability?.platform ?? "小红书", windowLabel: stored.comparison?.comparability?.timeWindowAligned ? "固定任务快照；发布时间窗已对齐" : "固定任务快照；尚未对齐统一发布时间窗", memberCount: stored.project.members.length,
      comparability: stored.project.members.length < 2 ? "blocked" : warnings.length > 2 ? "partial" : "aligned", warnings },
    members,
    matrices: {
      values: cells((profile) => profile.values, (dossier) => dossier.identity.valuesProvided),
      topics: cells((profile) => profile.topics, (dossier) => dossier.contentSystem.topics),
      formats: cells((profile) => profile.formats, (dossier) => dossier.contentSystem.formats)
    },
    tiers: (["high", "base", "low"] as const).map((tier) => ({ id: tier, label: tier === "high" ? "高表现" : tier === "base" ? "基本盘" : "低表现",
      cells: cells((profile) => profile[tier === "base" ? "baseline" : tier], (dossier) => dossier.tiers.find((item) => item.id === tier)?.conclusion ?? []) })),
    dimensions: {
      structure: cells((profile) => [...profile.visualLanguage, ...profile.recurringStructures], (dossier) => [...dossier.contentSystem.visualLanguage, ...dossier.contentSystem.recurringStructures]),
      audience: cells((profile) => profile.audience, (dossier) => dossier.audienceDemand.statements),
      rhythm: cells(() => [unknown("固定综合未形成可跨账号比较的发布节奏结论。")], (dossier) => dossier.rhythm.statements),
      business: cells((profile) => profile.commercialPaths, (dossier) => dossier.businessPath.statements)
    },
    ledger,
    limitations: [...(stored.comparison?.limitations ?? []), ...warnings, ...(stored.project.error ? [stored.project.error] : [])]
  });
}
