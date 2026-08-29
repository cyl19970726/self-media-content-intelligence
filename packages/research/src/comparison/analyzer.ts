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
  const contentValidated = members.every((member) => member.synthesis && member.synthesisGate?.ready
    && member.synthesisGate.evaluator?.independentOfCandidate);
  const contentPatterns: CreatorComparison["contentPatterns"] = [];
  const exceptions: CreatorComparison["exceptions"] = [];
  const gaps: string[] = [];
  if (contentValidated) {
    const roles = new Map<string, Array<{ member: ComparisonMemberInput; post: NonNullable<ComparisonMemberInput["synthesis"]>["postAnalyses"][number] }>>();
    for (const member of members) for (const post of member.synthesis!.postAnalyses) {
      const key = post.contentRole.normalize("NFKC").trim().toLocaleLowerCase();
      roles.set(key, [...(roles.get(key) ?? []), { member, post }]);
    }
    for (const [, supportRows] of [...roles.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      const byCreator = new Map<string, typeof supportRows>();
      for (const row of supportRows) byCreator.set(row.member.creatorId, [...(byCreator.get(row.member.creatorId) ?? []), row]);
      const creatorIds = [...byCreator.keys()];
      const role = supportRows[0]!.post.contentRole;
      if (creatorIds.length < 2) {
        exceptions.push({ creatorId: creatorIds[0]!, role, reason: "该角色只出现在一个已固定博主综合中。" });
        continue;
      }
      const qualified = creatorIds.every((creatorId) => {
        const creatorRows = byCreator.get(creatorId)!;
        return creatorRows.length >= 3 && creatorRows.some((row) => row.post.evidenceStatus === "deep_validated");
      });
      if (!qualified) { gaps.push(`角色「${role}」缺少每位博主至少 3 条、其中 1 条深证据的支持集。`); continue; }
      const commonFormats = supportRows[0]!.post.contentForm.filter((format) =>
        creatorIds.every((creatorId) => byCreator.get(creatorId)!.some((row) => row.post.contentForm.includes(format))));
      const classification = creatorIds.length >= 3 ? "track_wide" as const : "conditional" as const;
      if (classification === "conditional" && commonFormats.length === 0) {
        gaps.push(`角色「${role}」跨两个博主出现，但没有可声明的共同适用条件。`); continue;
      }
      contentPatterns.push({
        role, classification,
        statement: `${creatorIds.length} 个已独立评估的博主综合均出现「${role}」。`,
        boundary: "只陈述固定样本中的共同内容角色；不证明该角色造成公开表现差异。",
        creatorIds,
        condition: { format: commonFormats[0] ?? null },
        support: supportRows.map(({ member, post }) => ({ creatorRunId: member.creatorRunId, creatorId: member.creatorId,
          creatorName: member.creatorName, postExternalId: post.postExternalId, tier: post.tier,
          evidenceStatus: post.evidenceStatus, contentForm: post.contentForm, evidenceRefs: post.evidenceRefs }))
      });
    }
  } else {
    gaps.push("至少一个比较成员缺少已独立评估且 ready 的博主综合；内容机制保持未知。");
  }
  return creatorComparisonSchema.parse({
    schemaVersion: "1.0.0",
    generatedAt,
    readiness: contentValidated ? "content_validated" : "portfolio_only",
    members: rows,
    observations,
    contentPatterns,
    exceptions,
    gaps,
    limitations: [
      "当前比较只使用各账号内部公开表现，不把粉丝规模、账号年龄和发布时间窗口假定为相同。",
      "主题、形式、价值与机制比较必须等待各账号的内容证据通过验证。",
      "本研究对象不生成发帖建议、复制方案或下一条选题。"
    ]
  });
}
