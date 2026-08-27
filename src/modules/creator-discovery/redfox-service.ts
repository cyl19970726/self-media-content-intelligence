import {
  creatorDiscoveryResultSchema,
  type CreatorDiscoveryCandidate,
  type CreatorDiscoveryResult
} from "../../shared/schema.js";
import { RedFoxClient, asNonnegativeInteger, asString, recordArray } from "../../platform/redfox/redfox-client.js";

const searchEndpoint = "/story/api/xhs/ability/searchWork";
export const defaultAiCreatorKeywords = ["AI工具", "AIGC", "AI视频", "AI绘画", "人工智能"] as const;

type CandidateAccumulator = {
  creatorId: string;
  creatorName: string;
  avatarUrl: string | null;
  keywords: Set<string>;
  notes: Map<string, CreatorDiscoveryCandidate["representativeNotes"][number]>;
};

function safeHttpUrl(value: unknown): string | null {
  const text = asString(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    url.protocol = "https:";
    return url.toString();
  } catch { return null; }
}

function noteType(value: unknown): "video" | "image" | "unknown" {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "video") return "video";
  if (["normal", "image", "images"].includes(normalized)) return "image";
  return "unknown";
}

function sum(items: number[]): number { return items.reduce((total, value) => total + value, 0); }

export class RedFoxCreatorDiscoveryService {
  constructor(private readonly client = new RedFoxClient()) {}

  async discover(input: { keywords: string[]; pagesPerKeyword: number; limit: number }): Promise<CreatorDiscoveryResult> {
    const startedRequests = this.client.requestCount();
    const accumulators = new Map<string, CandidateAccumulator>();
    for (const keyword of input.keywords) {
      for (let page = 1; page <= input.pagesPerKeyword; page += 1) {
        const raw = await this.client.post(searchEndpoint, {
          note_type: "不限", noteTime: "不限", page, sort: "最多点赞", keyword
        });
        for (const row of recordArray(raw, ["workList", "list", "items"])) {
          const creatorId = asString(row.authorUid) ?? asString(row.authorId);
          const creatorName = asString(row.authorName);
          const noteId = asString(row.noteId);
          if (!creatorId || !creatorName || !noteId) continue;
          const candidate = accumulators.get(creatorId) ?? {
            creatorId, creatorName, avatarUrl: safeHttpUrl(row.authorAvatar), keywords: new Set(), notes: new Map()
          };
          candidate.keywords.add(keyword);
          if (!candidate.avatarUrl) candidate.avatarUrl = safeHttpUrl(row.authorAvatar);
          candidate.notes.set(noteId, {
            noteId, title: asString(row.noteTitle),
            url: safeHttpUrl(row.noteUrl) ?? `https://www.xiaohongshu.com/explore/${noteId}`,
            keyword, likes: asNonnegativeInteger(row.thumbCount) ?? 0,
            collections: asNonnegativeInteger(row.favoriteCount) ?? 0,
            comments: asNonnegativeInteger(row.replyCount) ?? 0,
            forwards: asNonnegativeInteger(row.forwardCount) ?? 0,
            mediaType: noteType(row.noteType)
          });
          accumulators.set(creatorId, candidate);
        }
      }
    }
    const candidates = [...accumulators.values()].map((candidate): CreatorDiscoveryCandidate => {
      const notes = [...candidate.notes.values()];
      const likes = sum(notes.map((note) => note.likes));
      const collections = sum(notes.map((note) => note.collections));
      const comments = sum(notes.map((note) => note.comments));
      const forwards = sum(notes.map((note) => note.forwards));
      const videos = notes.filter((note) => note.mediaType === "video").length;
      const engagement = likes + collections * 2 + comments * 3 + forwards * 2;
      const score = Number((candidate.keywords.size * 18 + Math.min(24, notes.length * 6)
        + Math.min(48, Math.log10(engagement + 1) * 10) + Math.min(10, videos * 2)).toFixed(2));
      return {
        creatorId: candidate.creatorId, creatorName: candidate.creatorName,
        profileUrl: `https://www.xiaohongshu.com/user/profile/${candidate.creatorId}`,
        avatarUrl: candidate.avatarUrl, matchedKeywords: [...candidate.keywords].sort(),
        observedNotes: notes.length, observedLikes: likes, observedCollections: collections,
        observedComments: comments, observedForwards: forwards, videoNotes: videos, score,
        scoreExplanation: [`关键词覆盖 ${candidate.keywords.size} 个`, `搜索样本 ${notes.length} 篇`,
          `样本公开互动加权 ${engagement}`, `视频样本 ${videos} 篇`],
        representativeNotes: notes.sort((a, b) => (b.likes + b.collections * 2 + b.comments * 3 + b.forwards * 2)
          - (a.likes + a.collections * 2 + a.comments * 3 + a.forwards * 2)).slice(0, 3)
      };
    }).sort((a, b) => b.score - a.score || b.observedLikes - a.observedLikes).slice(0, input.limit);
    const requestsUsed = this.client.requestCount() - startedRequests;
    return creatorDiscoveryResultSchema.parse({
      provider: "redfox", capturedAt: new Date().toISOString(), keywords: input.keywords,
      requestsUsed, estimatedCostCny: Number((requestsUsed * 0.06).toFixed(2)), candidates,
      limitations: [
        "排名只反映本次关键词搜索返回的公开样本，不代表账号质量、播放、转化或商业价值。",
        "实时接口按请求计费；估算采用当前 0–1000 次档位 ¥0.06/次，实际以红狐账户账单为准。"
      ]
    });
  }
}

export { searchEndpoint as redFoxSearchEndpoint };
