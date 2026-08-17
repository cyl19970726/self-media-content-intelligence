import fs from "node:fs";
import { externalSkills } from "../config.js";
import { runFile } from "../process.js";
import { emptyContext, type Comment, type ComparablePost, type MediaItem, type Metrics, type ParsedSource, type SourceSnapshot } from "../../shared/schema.js";
import type { CollectionResult, PlatformAdapter } from "./types.js";

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): JsonRecord => value && typeof value === "object" ? value as JsonRecord : {};
const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value : null;
const number = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value);
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "");
    const unit = normalized.endsWith("万") ? 10_000 : 1;
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? Math.max(0, parsed * unit) : null;
  }
  return null;
};

function locateNote(payload: unknown): JsonRecord {
  const root = record(payload);
  const data = record(root.data);
  return record(root.note ?? root.note_card ?? data.note ?? data.note_card ?? data);
}

function feedItems(payload: unknown): unknown[] {
  const root = record(payload);
  const data = record(root.data);
  for (const candidate of [root.feeds, root.notes, data.feeds, data.notes, data.items]) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function searchCandidate(payload: unknown, expectedTitle: string): { id: string; token: string } | null {
  const normalizedExpected = expectedTitle.replace(/\s+/g, "").toLowerCase();
  const candidates = feedItems(payload).map((entry) => {
    const wrapper = record(entry);
    const note = record(wrapper.note_card ?? wrapper.noteCard ?? wrapper);
    const id = text(wrapper.id ?? wrapper.note_id ?? note.note_id ?? note.id);
    const token = text(wrapper.xsec_token ?? wrapper.xsecToken ?? note.xsec_token ?? note.xsecToken);
    const title = text(note.title ?? note.desc) ?? "";
    const normalizedTitle = title.replace(/\s+/g, "").toLowerCase();
    const score = normalizedTitle === normalizedExpected ? 3
      : normalizedTitle.includes(normalizedExpected) || normalizedExpected.includes(normalizedTitle) ? 2 : 0;
    return { id, token, score };
  }).filter((item): item is { id: string; token: string; score: number } => Boolean(item.id && item.token));
  const best = candidates.sort((a, b) => b.score - a.score)[0];
  return best && best.score > 0 ? { id: best.id, token: best.token } : null;
}

function comparable(entry: unknown, source: "author" | "topic", index: number): ComparablePost {
  const wrapper = record(entry);
  const note = record(wrapper.note_card ?? wrapper.noteCard ?? wrapper);
  const user = record(note.user ?? note.author);
  const interact = record(note.interact_info ?? note.interactInfo ?? note.metrics);
  const id = text(wrapper.id ?? wrapper.note_id ?? note.note_id ?? note.id) ?? `${source}-${index + 1}`;
  return {
    id,
    title: text(note.title ?? note.desc) ?? "无标题笔记",
    authorName: text(user.nickname ?? user.name) ?? "未知作者",
    sourceUrl: null,
    publishedAt: text(note.time ?? note.published_at),
    source,
    metrics: {
      views: number(interact.view_count),
      likes: number(interact.liked_count ?? interact.like_count),
      comments: number(interact.comment_count),
      shares: number(interact.share_count),
      bookmarks: number(interact.collected_count ?? interact.collect_count),
      quotes: null,
      followers: number(user.followers ?? user.fans)
    }
  };
}

function normalize(parsed: ParsedSource, payload: unknown): SourceSnapshot {
  const note = locateNote(payload);
  const author = record(note.user ?? note.author);
  const interact = record(note.interact_info ?? note.metrics);
  const images = Array.isArray(note.image_list) ? note.image_list : [];
  const media: MediaItem[] = images.map((entry) => {
    const image = record(entry);
    return { kind: "image", url: text(image.url_default ?? image.url), localPath: null, mimeType: "image/jpeg" };
  });
  const video = record(note.video);
  const videoUrl = text(video.url ?? record(video.media).url);
  if (videoUrl) media.unshift({ kind: "video", url: videoUrl, localPath: null, mimeType: "video/mp4" });
  const commentsRaw = Array.isArray(note.comments) ? note.comments : [];
  const comments: Comment[] = commentsRaw.slice(0, 12).map((entry, index) => {
    const comment = record(entry);
    const user = record(comment.user);
    return {
      id: text(comment.id ?? comment.comment_id) ?? `comment-${index + 1}`,
      author: text(user.nickname ?? user.name),
      text: text(comment.content ?? comment.text) ?? "",
      likes: number(comment.like_count)
    };
  }).filter((comment) => comment.text);
  const description = text(note.desc ?? note.description) ?? "";
  const metrics: Metrics = {
    views: number(interact.view_count ?? note.view_count),
    likes: number(interact.liked_count ?? interact.like_count),
    comments: number(interact.comment_count),
    shares: number(interact.share_count),
    bookmarks: number(interact.collected_count ?? interact.collect_count),
    quotes: null,
    followers: number(author.followers ?? author.fans)
  };
  return {
    platform: "xiaohongshu", sourceUrl: parsed.sourceUrl, externalId: parsed.externalId,
    retrievedAt: new Date().toISOString(),
    author: {
      id: text(author.user_id ?? author.id), handle: text(author.red_id),
      name: text(author.nickname ?? author.name) ?? "未知作者", followers: metrics.followers,
      avatarUrl: text(author.avatar)
    },
    title: text(note.title) ?? (description.slice(0, 44) || "小红书笔记"),
    text: description,
    publishedAt: text(note.time ?? note.published_at),
    tags: Array.from(description.matchAll(/#([^\s#]+)/g)).map((match) => match[1]).filter((tag): tag is string => Boolean(tag)),
    metrics, media, comments, rawArtifactRef: null
  };
}

export const xiaohongshuAdapter: PlatformAdapter = {
  async collect(parsed): Promise<CollectionResult> {
    if (!fs.existsSync(externalSkills.xhsCli)) return {
      state: "blocked", source: null, localVideoPath: null, rawPayload: null,
      context: emptyContext(),
      message: "未找到本机小红书采集 Skill。"
    };
    try {
      let resolved = parsed;
      let resolutionPayload: unknown = null;
      if (!resolved.xsecToken && resolved.shareTitle) {
        const search = await runFile("python3", [externalSkills.xhsCli, "search-feeds", "--keyword", resolved.shareTitle], { timeout: 90_000 });
        resolutionPayload = JSON.parse(search.stdout);
        const candidate = searchCandidate(resolutionPayload, resolved.shareTitle);
        if (candidate) resolved = { ...resolved, externalId: candidate.id, xsecToken: candidate.token };
      }
      if (!resolved.xsecToken) return {
        state: "blocked", source: null, localVideoPath: null, rawPayload: { resolution: resolutionPayload }, context: emptyContext(),
        message: parsed.shareTitle
          ? "已搜索分享标题，但没有定位到带访问令牌的匹配笔记。请确认 Chrome 已登录并连接小红书扩展。"
          : "短链需要连同小红书分享标题一起粘贴，或提供包含 xsec_token 的完整笔记链接。"
      };
      const result = await runFile("python3", [externalSkills.xhsCli, "get-feed-detail", "--feed-id", resolved.externalId, "--xsec-token", resolved.xsecToken, "--load-all-comments", "--max-comment-items", "50"], { timeout: 120_000 });
      const rawPayload: unknown = JSON.parse(result.stdout);
      const source = normalize(resolved, rawPayload);
      const query = source.tags[0] ?? source.title.replace(/[：:，。！？!?\d]/g, " ").split(/\s+/).filter((part) => part.length >= 2).slice(0, 2).join(" ");
      let profilePayload: unknown = null;
      let searchPayload: unknown = null;
      const notes: string[] = [];
      if (source.author.id) {
        try {
          const profile = await runFile("python3", [externalSkills.xhsCli, "user-profile", "--user-id", source.author.id, "--xsec-token", resolved.xsecToken], { timeout: 90_000 });
          profilePayload = JSON.parse(profile.stdout);
        } catch { notes.push("作者主页基线未取得。") }
      } else notes.push("帖子未返回作者 ID，无法采集作者基线。");
      if (query) {
        try {
          const search = await runFile("python3", [externalSkills.xhsCli, "search-feeds", "--keyword", query, "--sort-by", "最多点赞"], { timeout: 90_000 });
          searchPayload = JSON.parse(search.stdout);
        } catch { notes.push("同题材搜索基线未取得。") }
      }
      const authorPosts = feedItems(profilePayload).filter((entry) => text(record(entry).id ?? record(entry).note_id) !== parsed.externalId)
        .slice(0, 20).map((entry, index) => comparable(entry, "author", index));
      const topicPosts = feedItems(searchPayload).filter((entry) => text(record(entry).id ?? record(entry).note_id) !== parsed.externalId)
        .slice(0, 20).map((entry, index) => comparable(entry, "topic", index));
      const context = {
        status: authorPosts.length >= 3 && topicPosts.length >= 3 ? "ready" as const : authorPosts.length || topicPosts.length ? "partial" as const : "unavailable" as const,
        query: query || null, authorPosts, topicPosts, notes, rawArtifactRefs: []
      };
      return { state: "ready", source, localVideoPath: null, message: null, context, rawPayload: { resolution: resolutionPayload, post: rawPayload, profile: profilePayload, search: searchPayload } };
    } catch (error) {
      return {
        state: "blocked", source: null, localVideoPath: null,
        rawPayload: { error: error instanceof Error ? error.message : "unknown" },
        context: emptyContext(),
        message: "小红书采集未完成。请确认 Chrome 已登录小红书并保持浏览器连接可用。"
      };
    }
  }
};
