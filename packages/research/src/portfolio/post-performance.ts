import { quantile } from "./analyzer.js";

type Sample = { externalId: string; likes: number | null; isPinned?: boolean | null; isOwn?: boolean | null;
  mediaType?: string; collections?: number | null; comments?: number | null };
export function buildPostPerformance(subject: { externalId: string; likes: number | null; collections: number | null; comments: number | null },
  samples: Sample[], observedAt: string | null, sampleObservedAt: string | null, scope: string) {
  const excluded: Array<{ id: string; reason: string }> = [], eligible: Sample[] = [], seen = new Set<string>();
  for (const sample of samples) {
    const reason = sample.externalId === subject.externalId ? "目标自身" : seen.has(sample.externalId) ? "重复"
      : sample.isPinned === true ? "置顶" : sample.isOwn === true ? "自有作品"
        : sample.isPinned !== false || sample.isOwn !== false ? "置顶 / 归属未核验"
          : sample.mediaType !== "video" ? "非视频或类型未知" : null;
    seen.add(sample.externalId);
    if (reason) excluded.push({ id: sample.externalId, reason }); else eligible.push(sample);
  }
  const metrics = (["likes", "collections", "comments"] as const).map(key => {
    const values = eligible.map(row => row[key]).filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0).sort((a,b) => a-b);
    const median = quantile(values, 0.5), value = subject[key];
    return { key, subject: value, denominator: values.length, median,
      multiple: value !== null && median !== null && median > 0 ? value / median : null };
  });
  return { observedAt, sampleObservedAt, scope, observedCount: samples.length, eligibleCount: eligible.length,
    excluded, metrics, topicSampleSize: 0, collectionLikeRatio: subject.collections !== null && subject.likes !== null && subject.likes > 0 ? subject.collections / subject.likes : null,
    exposureInteractionRate: null, retention: null, ageMatched: false,
    limitations: ["限定可见作者样本，未启动全量采集；题材基线未取得。", "收藏 / 点赞是公开计数比，不是曝光互动率。", "缺少曝光、留存、发布时间匹配、投流等条件；相对表现不能证明标题、封面或开头的因果效果。"] };
}
