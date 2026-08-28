import fs from "node:fs";
import dotenv from "dotenv";
import { externalSkills } from "../../../packages/adapters/index.js";
import { emptyContext, type Comment, type ComparablePost, type MediaItem, type Metrics, type ParsedSource, type SourceSnapshot } from "../../shared/schema.js";
import type { CollectionResult, PlatformAdapter } from "./types.js";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" ? value as JsonRecord : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : null;
}

function twitterKey(): string | null {
  if (process.env.TWITTER_API_KEY) return process.env.TWITTER_API_KEY;
  if (!fs.existsSync(externalSkills.twitterEnv)) return null;
  const parsed = dotenv.parse(fs.readFileSync(externalSkills.twitterEnv));
  return parsed.TWITTER_API_KEY ?? null;
}

function pickTweet(payload: unknown): JsonRecord {
  const root = record(payload);
  const candidates = [root.tweets, root.data, root.results];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate[0]) return record(candidate[0]);
  }
  if (root.tweet) return record(root.tweet);
  return root;
}

function arrayFromPayload(payload: unknown): unknown[] {
  const root = record(payload);
  for (const candidate of [root.tweets, root.data, root.results]) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function comparable(entry: unknown, source: "author" | "topic", index: number): ComparablePost {
  const tweet = record(entry);
  const author = record(tweet.author ?? tweet.user);
  const publicMetrics = record(tweet.public_metrics);
  const body = text(tweet.text ?? tweet.full_text) ?? "";
  return {
    id: text(tweet.id ?? tweet.id_str) ?? `${source}-${index + 1}`,
    title: body.split(/\n/)[0]?.slice(0, 88) || "无标题帖子",
    authorName: text(author.name ?? author.userName ?? author.screen_name) ?? "未知作者",
    sourceUrl: text(tweet.url),
    publishedAt: text(tweet.createdAt ?? tweet.created_at),
    source,
    metrics: {
      views: number(tweet.viewCount ?? tweet.views ?? publicMetrics.impression_count),
      likes: number(tweet.likeCount ?? tweet.favorite_count ?? publicMetrics.like_count),
      comments: number(tweet.replyCount ?? tweet.reply_count ?? publicMetrics.reply_count),
      shares: number(tweet.retweetCount ?? tweet.retweet_count ?? publicMetrics.retweet_count),
      bookmarks: number(tweet.bookmarkCount ?? tweet.bookmark_count ?? publicMetrics.bookmark_count),
      quotes: number(tweet.quoteCount ?? tweet.quote_count ?? publicMetrics.quote_count),
      followers: number(author.followers ?? author.followers_count)
    }
  };
}

async function fetchTwitter(key: string, endpoint: string, params: Record<string, string>): Promise<unknown> {
  const url = new URL(`https://api.twitterapi.io${endpoint}`);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const response = await fetch(url, { headers: { "X-API-Key": key } });
  if (!response.ok) throw new Error(`X context endpoint ${response.status}`);
  return response.json() as Promise<unknown>;
}

function normalizeMedia(tweet: JsonRecord): MediaItem[] {
  const extended = record(tweet.extendedEntities ?? tweet.extended_entities);
  const values = Array.isArray(extended.media)
    ? extended.media
    : Array.isArray(tweet.media) ? tweet.media : [];
  return values.map((entry): MediaItem => {
    const item = record(entry);
    const variants = Array.isArray(record(item.video_info).variants)
      ? record(item.video_info).variants as unknown[] : [];
    const mp4 = variants.map(record).filter((variant) => text(variant.content_type) === "video/mp4")
      .sort((a, b) => (number(b.bitrate) ?? 0) - (number(a.bitrate) ?? 0))[0];
    const videoUrl = mp4 ? text(mp4.url) : null;
    return {
      kind: videoUrl || text(item.type) === "video" ? "video" : "image",
      url: videoUrl ?? text(item.media_url_https) ?? text(item.url),
      localPath: null,
      mimeType: videoUrl ? "video/mp4" : null
    };
  });
}

function normalizeTweet(parsed: ParsedSource, payload: unknown): SourceSnapshot {
  const tweet = pickTweet(payload);
  const author = record(tweet.author ?? tweet.user);
  const body = text(tweet.text ?? tweet.full_text) ?? "";
  const publicMetrics = record(tweet.public_metrics);
  const metrics: Metrics = {
    views: number(tweet.viewCount ?? tweet.views ?? publicMetrics.impression_count),
    likes: number(tweet.likeCount ?? tweet.favorite_count ?? publicMetrics.like_count),
    comments: number(tweet.replyCount ?? tweet.reply_count ?? publicMetrics.reply_count),
    shares: number(tweet.retweetCount ?? tweet.retweet_count ?? publicMetrics.retweet_count),
    bookmarks: number(tweet.bookmarkCount ?? tweet.bookmark_count ?? publicMetrics.bookmark_count),
    quotes: number(tweet.quoteCount ?? tweet.quote_count ?? publicMetrics.quote_count),
    followers: number(author.followers ?? author.followers_count)
  };
  const commentsRaw = Array.isArray(tweet.replies) ? tweet.replies : [];
  const comments: Comment[] = commentsRaw.slice(0, 12).map((entry, index) => {
    const reply = record(entry);
    const replyAuthor = record(reply.author ?? reply.user);
    return {
      id: text(reply.id ?? reply.id_str) ?? `reply-${index + 1}`,
      author: text(replyAuthor.userName ?? replyAuthor.screen_name ?? replyAuthor.name),
      text: text(reply.text ?? reply.full_text) ?? "",
      likes: number(reply.likeCount ?? reply.favorite_count)
    };
  }).filter((comment) => comment.text);

  return {
    platform: "x",
    sourceUrl: parsed.sourceUrl,
    externalId: parsed.externalId,
    retrievedAt: new Date().toISOString(),
    author: {
      id: text(author.id ?? author.id_str),
      handle: text(author.userName ?? author.screen_name ?? author.username),
      name: text(author.name) ?? "未知作者",
      followers: metrics.followers,
      avatarUrl: text(author.profilePicture ?? author.profile_image_url_https)
    },
    title: body.split(/\n/)[0]?.slice(0, 88) || "X 帖子",
    text: body,
    publishedAt: text(tweet.createdAt ?? tweet.created_at),
    tags: Array.from(body.matchAll(/#([^\s#]+)/g)).map((match) => match[1]).filter((tag): tag is string => Boolean(tag)),
    metrics,
    media: normalizeMedia(tweet),
    comments,
    rawArtifactRef: null
  };
}

export const xAdapter: PlatformAdapter = {
  async collect(parsed): Promise<CollectionResult> {
    const key = twitterKey();
    if (!key) return {
      state: "blocked", source: null, localVideoPath: null, rawPayload: null,
      context: emptyContext(),
      message: "未找到只读 X API 凭据。请在 TWITTER_API_KEY 或既有 twitter-mcp 配置中设置。"
    };
    const response = await fetch(`https://api.twitterapi.io/twitter/tweets?tweet_ids=${encodeURIComponent(parsed.externalId)}`, {
      headers: { "X-API-Key": key }
    });
    if (!response.ok) {
      return {
        state: "blocked", source: null, localVideoPath: null,
        rawPayload: { status: response.status },
        context: emptyContext(),
        message: `X 只读接口返回 ${response.status}，请检查额度或链接可访问性。`
      };
    }
    const rawPayload: unknown = await response.json();
    const source = normalizeTweet(parsed, rawPayload);
    const query = source.tags[0] ?? source.text.split(/[\s，。！？,.!?]+/).filter((part) => part.length > 1).slice(0, 2).join(" ");
    const [timelineResult, repliesResult, searchResult] = await Promise.allSettled([
      source.author.handle ? fetchTwitter(key, "/twitter/user/tweets", { userName: source.author.handle, includeReplies: "false" }) : Promise.reject(new Error("missing handle")),
      fetchTwitter(key, "/twitter/tweet/replies", { tweetId: parsed.externalId }),
      query ? fetchTwitter(key, "/twitter/tweet/advanced_search", { query, queryType: "Top" }) : Promise.reject(new Error("missing query"))
    ]);
    const timeline = timelineResult.status === "fulfilled" ? timelineResult.value : null;
    const replies = repliesResult.status === "fulfilled" ? repliesResult.value : null;
    const search = searchResult.status === "fulfilled" ? searchResult.value : null;
    if (replies) {
      source.comments = arrayFromPayload(replies).slice(0, 50).map((entry, index) => {
        const reply = record(entry);
        const author = record(reply.author ?? reply.user);
        return {
          id: text(reply.id ?? reply.id_str) ?? `reply-${index + 1}`,
          author: text(author.userName ?? author.screen_name ?? author.name),
          text: text(reply.text ?? reply.full_text) ?? "",
          likes: number(reply.likeCount ?? reply.favorite_count)
        };
      }).filter((comment) => comment.text);
    }
    const authorPosts = arrayFromPayload(timeline).filter((entry) => text(record(entry).id ?? record(entry).id_str) !== parsed.externalId)
      .slice(0, 20).map((entry, index) => comparable(entry, "author", index));
    const topicPosts = arrayFromPayload(search).filter((entry) => text(record(entry).id ?? record(entry).id_str) !== parsed.externalId)
      .slice(0, 20).map((entry, index) => comparable(entry, "topic", index));
    const context = {
      status: authorPosts.length >= 3 && topicPosts.length >= 3 ? "ready" as const : authorPosts.length || topicPosts.length ? "partial" as const : "unavailable" as const,
      query: query || null,
      authorPosts,
      topicPosts,
      notes: [
        ...(timelineResult.status === "rejected" ? ["作者时间线未取得。"] : []),
        ...(searchResult.status === "rejected" ? ["同主题搜索未取得。"] : []),
        ...(repliesResult.status === "rejected" ? ["回复样本未取得。"] : [])
      ],
      rawArtifactRefs: []
    };
    return { state: "ready", source, localVideoPath: null, message: null, context, rawPayload: { post: rawPayload, timeline, replies, search } };
  }
};
