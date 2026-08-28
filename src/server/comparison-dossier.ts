import type { ComparisonProjectService } from "../../packages/research/index.js";
import type { CreatorResearchService } from "../../packages/research/index.js";
import { comparisonDossierSchema, type ComparisonDossier } from "../shared/comparison-dossier.js";
import { loadCreatorDossier } from "./creator-dossier.js";

function multiple(value: number | null, median: number | null): number | null {
  return value !== null && median !== null && median > 0 ? value / median : null;
}

export function loadComparisonDossier(
  comparisons: ComparisonProjectService,
  creators: CreatorResearchService,
  id: string
): ComparisonDossier | null {
  const stored = comparisons.get(id);
  if (!stored) return null;
  // member.creatorRunId is an internal comparison key.  Legacy dossiers have
  // no Creator Run, so the canonical creator ID is the only safe route back to
  // the published evidence page.
  const dossiers = stored.project.members.map((member) => ({ member, dossier: loadCreatorDossier(creators, member.creatorId) })).filter((item) => item.dossier !== null);
  const creatorIdsByRun = new Map(dossiers.map(({ member, dossier }) => [member.creatorRunId, dossier!.canonicalId]));
  const cells = (select: (dossier: NonNullable<(typeof dossiers)[number]["dossier"]>) => NonNullable<(typeof dossiers)[number]["dossier"]>["identity"]["valuesProvided"]) =>
    dossiers.map(({ dossier }) => ({ creatorId: dossier!.canonicalId, creatorName: dossier!.identity.name, statements: select(dossier!) }));
  const warnings = [
    "比较使用各博主自身中位数与档位，不以原始点赞直接排名。",
    "当前项目固定成员版本；账号年龄、粉丝规模、投流和商业内容差异仍可能混杂。",
    ...dossiers.filter(({ dossier }) => dossier!.corpus.health.status !== "full").map(({ dossier }) => `${dossier!.identity.name} 的全量基本盘为${dossier!.corpus.health.status === "partial" ? "部分覆盖" : "未覆盖"}。`)
  ];
  const members = dossiers.map(({ member, dossier }) => {
    const selectedCounts = { high: 0, base: 0, low: 0 };
    dossier!.portfolio.items.forEach((item) => { selectedCounts[item.tier] += 1; });
    return {
      creatorId: dossier!.canonicalId, creatorRunId: member.creatorRunId, name: dossier!.identity.name,
      href: `/creators/${encodeURIComponent(dossier!.canonicalId)}?comparison=${encodeURIComponent(id)}`,
      postCount: dossier!.corpus.postCount, coverageRate: dossier!.corpus.coverageRate,
      medianLikes: dossier!.corpus.medianLikes, meanLikes: dossier!.corpus.meanLikes, maxLikes: dossier!.corpus.maxLikes,
      meanMedianMultiple: multiple(dossier!.corpus.meanLikes, dossier!.corpus.medianLikes),
      maxMedianMultiple: multiple(dossier!.corpus.maxLikes, dossier!.corpus.medianLikes), selectedCounts,
      positioning: dossier!.identity.positioning, values: dossier!.identity.valuesProvided, lifecycle: dossier!.identity.lifecycle
    };
  });
  const ledger = stored.comparison?.observations.map((observation) => ({
    classification: observation.classification, statement: observation.text, boundary: observation.boundary,
    creatorHrefs: observation.evidenceCreatorRunIds.map((runId) => creatorIdsByRun.get(runId)).filter((value): value is string => Boolean(value)).map((creatorId) => `/creators/${encodeURIComponent(creatorId)}?comparison=${encodeURIComponent(id)}`)
  })) ?? [];
  return comparisonDossierSchema.parse({
    schemaVersion: "1.0.0", id: stored.project.id, name: stored.project.name, status: stored.project.status, generatedAt: stored.project.updatedAt,
    scope: { platform: "小红书", windowLabel: "固定任务快照；尚未对齐统一发布时间窗", memberCount: members.length,
      comparability: members.length < 2 ? "blocked" : warnings.length > 2 ? "partial" : "aligned", warnings },
    members,
    matrices: { values: cells((dossier) => dossier.identity.valuesProvided), topics: cells((dossier) => dossier.contentSystem.topics), formats: cells((dossier) => dossier.contentSystem.formats) },
    tiers: (["high", "base", "low"] as const).map((tier) => ({ id: tier, label: tier === "high" ? "高表现" : tier === "base" ? "基本盘" : "低表现",
      cells: dossiers.map(({ dossier }) => ({ creatorId: dossier!.canonicalId, creatorName: dossier!.identity.name,
        statements: dossier!.tiers.find((item) => item.id === tier)?.conclusion ?? [] })) })),
    dimensions: {
      structure: cells((dossier) => [...dossier.contentSystem.visualLanguage, ...dossier.contentSystem.recurringStructures]),
      audience: cells((dossier) => dossier.audienceDemand.statements), rhythm: cells((dossier) => dossier.rhythm.statements), business: cells((dossier) => dossier.businessPath.statements)
    },
    ledger,
    limitations: [...(stored.comparison?.limitations ?? []), ...warnings, ...(stored.project.error ? [stored.project.error] : [])]
  });
}
