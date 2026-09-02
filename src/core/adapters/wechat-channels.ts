import {
  RedFoxClient,
  RedFoxError,
  asNonnegativeInteger,
  asString,
  firstRecord,
  isRecord,
  recordArray,
  unwrapRedFoxData
} from "../../../packages/adapters/index.js";
import {
  emptyContext,
  type Comment,
  type ComparablePost,
  type ContextSnapshot,
  type MediaItem,
  type Metrics,
  type ParsedSource,
  type SourceSnapshot
} from "../../shared/schema.js";
import type { CollectionResult, PlatformAdapter } from "./types.js";

const endpoints = {
  detailByLink: "/story/api/sph/ability/workLinkDetail",
  download: "/story/api/parseWork/videoDownload/sph",
  search: "/story/api/sphAllData/searchWork",
  userWorks: "/story/api/sphAllData/queryWorkList"
} as const;

type JsonRecord = Record<string, unknown>;

function nested(record: JsonRecord, ...keys: string[]): JsonRecord {
  for (const key of keys) if (isRecord(record[key])) return record[key];
  return {};
}

function safeHttpUrl(value: unknown): string | null {
  const text = asString(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function firstUrl(record: JsonRecord, keys: string[]): string | null {
  for (const key of keys) {
    const direct = safeHttpUrl(record[key]);
    if (direct) return direct;
  }
  for (const key of ["videoInfo", "media", "video", "result", "work"]) {
    const child = nested(record, key);
    for (const candidate of keys) {
      const value = safeHttpUrl(child[candidate]);
      if (value) return value;
    }
  }
  return null;
}

function downloadUrl(payload: unknown): string | null {
  const value = unwrapRedFoxData(payload);
  const direct = safeHttpUrl(value);
  if (direct) return direct;
  if (!isRecord(value)) return null;
  return firstUrl(value, ["downloadUrl", "videoUrl", "playUrl", "url", "sourceUrl", "originUrl"]);
}

function timestamp(value: unknown): string | null {
  const direct = asString(value);
  if (direct && !/^\d+$/.test(direct)) return direct;
  const numeric = typeof value === "number" ? value : direct ? Number(direct) : Number.NaN;
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  const milliseconds = numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  const date = new Date(milliseconds);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function topics(value: unknown, description: string): string[] {
  let values: unknown[] = [];
  if (Array.isArray(value)) values = value;
  else if (typeof value === "string" && value.trim()) {
    try {
      const parsed: unknown = JSON.parse(value);
      values = Array.isArray(parsed) ? parsed : value.split(/[,，]/u);
    } catch {
      values = value.split(/[,，]/u);
    }
  }
  const supplied = values.flatMap((entry) => {
    if (typeof entry === "string") return [entry];
    if (isRecord(entry)) return [entry.name, entry.title, entry.topic].filter((item): item is string => typeof item === "string");
    return [];
  });
  const inline = Array.from(description.matchAll(/#([^\s#]+)/gu)).map((match) => match[1] ?? "");
  return [...new Set([...supplied, ...inline].map((item) => item.replace(/^#/u, "").trim()).filter(Boolean))];
}

function metrics(record: JsonRecord, author: JsonRecord = {}): Metrics {
  return {
    views: asNonnegativeInteger(record.playCount ?? record.readCount ?? record.viewCount),
    likes: asNonnegativeInteger(record.likeCount ?? record.thumbCount),
    comments: asNonnegativeInteger(record.commentCount ?? record.replyCount),
    shares: asNonnegativeInteger(record.forwardCount ?? record.shareCount),
    bookmarks: asNonnegativeInteger(record.favCount ?? record.favoriteCount ?? record.collectCount),
    quotes: null,
    followers: asNonnegativeInteger(author.fansCount ?? author.followers ?? record.fansCount)
  };
}

function comparable(entry: JsonRecord, source: "author" | "topic", index: number): ComparablePost {
  const author = nested(entry, "author", "userInfo", "user");
  const description = asString(entry.description ?? entry.title ?? entry.content) ?? "无标题视频";
  return {
    id: asString(entry.videoId ?? entry.workId ?? entry.objectId ?? entry.id) ?? `${source}-${index + 1}`,
    title: description.slice(0, 80),
    authorName: asString(entry.nickname ?? entry.userName ?? author.nickname ?? author.name) ?? "未知作者",
    sourceUrl: safeHttpUrl(entry.workUrl ?? entry.shareUrl ?? entry.videoUrl),
    publishedAt: timestamp(entry.publishTime ?? entry.releaseTime ?? entry.createTime),
    source,
    metrics: metrics(entry, author)
  };
}

function queryFrom(source: SourceSnapshot): string {
  return source.tags[0] ?? source.title.replace(/[：:，。！？!?\d]/gu, " ")
    .split(/\s+/u).filter((part) => part.length >= 2).slice(0, 2).join(" ");
}

function normalizeSource(parsed: ParsedSource, detail: JsonRecord, resolvedVideoUrl: string | null): SourceSnapshot {
  const author = nested(detail, "author", "userInfo", "user");
  const description = asString(detail.description ?? detail.content ?? detail.desc ?? detail.title) ?? "";
  const title = asString(detail.title ?? detail.workTitle) ?? description.split(/\r?\n/u)[0]?.slice(0, 80) ?? "视频号作品";
  const publicMetrics = metrics(detail, author);
  const coverUrl = firstUrl(detail, ["coverUrl", "coverImage", "coverImageUrl", "cover"]);
  const media: MediaItem[] = [
    ...(resolvedVideoUrl ? [{ kind: "video" as const, url: resolvedVideoUrl, localPath: null, mimeType: "video/mp4" }] : []),
    ...(coverUrl ? [{ kind: "image" as const, url: coverUrl, localPath: null, mimeType: "image/jpeg" }] : [])
  ];
  const commentsRaw = Array.isArray(detail.comments) ? detail.comments.filter(isRecord) : [];
  const comments: Comment[] = commentsRaw.slice(0, 12).flatMap((comment, index) => {
    const text = asString(comment.content ?? comment.text);
    if (!text) return [];
    const user = nested(comment, "user", "author");
    return [{
      id: asString(comment.commentId ?? comment.id) ?? `comment-${index + 1}`,
      author: asString(comment.nickname ?? user.nickname ?? user.name), text,
      likes: asNonnegativeInteger(comment.likeCount ?? comment.thumbCount)
    }];
  });
  return {
    platform: "wechat_channels",
    sourceUrl: parsed.sourceUrl,
    externalId: asString(detail.videoId ?? detail.workId ?? detail.objectId ?? detail.id) ?? parsed.externalId,
    retrievedAt: new Date().toISOString(),
    author: {
      id: asString(detail.finderUserId ?? detail.userId ?? author.userId ?? author.id),
      handle: asString(detail.wxId ?? detail.finderUsername ?? author.wxId),
      name: asString(detail.nickname ?? detail.userName ?? author.nickname ?? author.name) ?? "未知视频号作者",
      followers: publicMetrics.followers,
      avatarUrl: safeHttpUrl(detail.headUrl ?? detail.avatarUrl ?? author.headUrl ?? author.avatarUrl)
    },
    title: title || "视频号作品",
    text: description,
    publishedAt: timestamp(detail.publishTime ?? detail.releaseTime ?? detail.createTime ?? detail.createTimestamp),
    tags: topics(detail.topic ?? detail.topics ?? detail.type, description),
    metrics: publicMetrics,
    media,
    comments,
    rawArtifactRef: null
  };
}

function providerMessage(error: unknown): string {
  if (error instanceof RedFoxError) return error.message;
  return error instanceof Error ? error.message : "红狐视频号采集发生未知错误。";
}

export function createWechatChannelsAdapter(client = new RedFoxClient()): PlatformAdapter {
  return {
    async collect(parsed): Promise<CollectionResult> {
      try {
        const detailRaw = await client.post(endpoints.detailByLink, { url: parsed.sourceUrl });
        const detail = firstRecord(detailRaw, ["workDetail", "work", "item"]);
        if (!detail) throw new RedFoxError("invalid_response", "红狐视频号详情缺少作品数据对象。");

        let downloadRaw: unknown = null;
        let resolvedVideoUrl: string | null = null;
        const notes: string[] = [];
        try {
          downloadRaw = await client.post(endpoints.download, { url: parsed.sourceUrl });
          resolvedVideoUrl = downloadUrl(downloadRaw);
          if (!resolvedVideoUrl) notes.push("红狐下载接口未返回可读取的视频地址。");
        } catch (error) {
          notes.push(`视频媒体未取得：${providerMessage(error)}`);
        }

        const source = normalizeSource(parsed, detail, resolvedVideoUrl);
        const query = queryFrom(source);
        let authorRaw: unknown = null;
        let searchRaw: unknown = null;
        if (source.author.name !== "未知视频号作者") {
          try {
            authorRaw = await client.post(endpoints.userWorks, { nickname: source.author.name, page: 1, size: 20 });
          } catch (error) {
            notes.push(`作者基线未取得：${providerMessage(error)}`);
          }
        }
        if (query) {
          try {
            searchRaw = await client.post(endpoints.search, { keyword: query, sort: "最多点赞", page: 1, size: 20 });
          } catch (error) {
            notes.push(`同题材基线未取得：${providerMessage(error)}`);
          }
        }
        const authorPosts = recordArray(authorRaw, ["workList", "list", "items"])
          .map((item, index) => comparable(item, "author", index))
          .filter((item) => item.id !== source.externalId).slice(0, 20);
        const topicPosts = recordArray(searchRaw, ["workList", "list", "items"])
          .map((item, index) => comparable(item, "topic", index))
          .filter((item) => item.id !== source.externalId).slice(0, 20);
        const context: ContextSnapshot = {
          status: authorPosts.length >= 3 && topicPosts.length >= 3 ? "ready"
            : authorPosts.length > 0 || topicPosts.length > 0 ? "partial" : "unavailable",
          query: query || null, authorPosts, topicPosts, notes, rawArtifactRefs: []
        };
        return {
          state: "ready", source, localVideoPath: null,
          message: resolvedVideoUrl ? null : "帖子公开数据已采集，但视频媒体暂不可用。",
          context,
          rawPayload: { detail: detailRaw, download: downloadRaw, authorWorks: authorRaw, search: searchRaw }
        };
      } catch (error) {
        return {
          state: "blocked", source: null, localVideoPath: null, context: emptyContext(),
          rawPayload: { error: providerMessage(error) },
          message: `视频号采集未完成：${providerMessage(error)}`
        };
      }
    }
  };
}

export const wechatChannelsAdapter = createWechatChannelsAdapter();
export { endpoints as redFoxWechatChannelsEndpoints };
