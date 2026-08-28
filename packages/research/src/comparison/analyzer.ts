import { creatorComparisonSchema, comparisonMemberInputSchema, type ComparisonMemberInput, type CreatorComparison } from "./contracts.js";

function ratio(numerator: number | null, denominator: number | null): number | null {
  return numerator === null || denominator === null || denominator === 0 ? null : numerator / denominator;
}

export function compareCreatorPortfolios(inputs: unknown[], generatedAt: string): CreatorComparison {
  const members: ComparisonMemberInput[] = inputs.map((input) => comparisonMemberInputSchema.parse(input));
  const rows = members.map((member) => ({
    creatorRunId: member.creatorRunId,
    creatorId: member.creatorId,
    sourceRunId: member.sourceRunId,
    revision: member.revision,
    creatorName: member.creatorName,
    portfolioRevision: member.portfolioRevision,
    discoveredPosts: member.analysis.metricCoverage.known + member.analysis.metricCoverage.missing,
    likesCoverage: member.analysis.metricCoverage.rate,
    medianLikes: member.analysis.likes.median,
    meanLikes: member.analysis.likes.mean,
    maxLikes: member.analysis.likes.max,
    headToMedianRatio: ratio(member.analysis.likes.max, member.analysis.likes.median),
    meanToMedianRatio: ratio(member.analysis.likes.mean, member.analysis.likes.median),
    selectedCounts: member.selection.tierCounts
  }));
  const evidenceIds = rows.map((row) => row.creatorRunId);
  const observations: CreatorComparison["observations"] = [];
  if (rows.length >= 2 && rows.every((row) => row.headToMedianRatio !== null)) {
    observations.push({
      classification: "track_wide",
      text: "这些账号的最高点赞都显著高于各自中位数，比较时必须同时展示基本盘与头部极值。",
      evidenceCreatorRunIds: evidenceIds,
      boundary: "这里只证明账号内部存在头部偏斜，不证明相同内容机制导致偏斜。"
    });
  }
  for (const row of rows) {
    if ((row.likesCoverage ?? 0) < 0.8) observations.push({
      classification: "creator_specific",
      text: `${row.creatorName} 的公开点赞覆盖不足 80%，与其他账号的数值比较需要降级。`,
      evidenceCreatorRunIds: [row.creatorRunId],
      boundary: "缺失点赞不按 0 处理。"
    });
  }
  return creatorComparisonSchema.parse({
    schemaVersion: "1.0.0",
    generatedAt,
    readiness: "portfolio_only",
    members: rows,
    observations,
    limitations: [
      "当前比较只使用各账号内部公开表现，不把粉丝规模、账号年龄和发布时间窗口假定为相同。",
      "主题、形式、价值与机制比较必须等待各账号的内容证据通过验证。",
      "本研究对象不生成发帖建议、复制方案或下一条选题。"
    ]
  });
}
