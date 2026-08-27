import type {
  CreatorAcquisitionResult,
  CreatorBrowserExecutor,
  CreatorDetailResult,
  CreatorNavigationDiagnostic
} from "../../modules/orchestration/contracts.js";
import {
  RedFoxClient,
  RedFoxError,
  asNonnegativeInteger,
  asString,
  firstRecord,
  isRecord,
  recordArray
} from "./redfox-client.js";

const endpoints = {
  account: "/story/api/xhs/ability/accountDetail",
  inventory: "/story/api/xhs/ability/userWorkList",
  detail: "/story/api/xhs/ability/noteDetail"
} as const;

function creatorIdFromProfile(profileUrl: string): string | null {
  try {
    return new URL(profileUrl).pathname.match(/^\/user\/profile\/([^/?#]+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

function mediaType(value: unknown): "video" | "image" | "unknown" {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "video" || normalized === "2") return "video";
  if (["normal", "image", "images", "1"].includes(normalized)) return "image";
  return "unknown";
}

function safeMediaUrl(value: unknown): string | null {
  const text = asString(value);
  if (!text) return null;
  try {
    const url = new URL(text);
    const allowed = url.hostname.endsWith("xhscdn.com") || url.hostname.endsWith("rednotecdn.com")
      || url.hostname.endsWith("xiaohongshu.com");
    if (!allowed || !["http:", "https:"].includes(url.protocol)) return null;
    url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}

function nestedRecord(record: Record<string, unknown>, key: string): Record<string, unknown> | null {
  return isRecord(record[key]) ? record[key] : null;
}

function firstMediaCandidate(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const direct = safeMediaUrl(record[key]);
    if (direct) return direct;
  }
  const videoInfo = nestedRecord(record, "videoInfo");
  if (videoInfo) for (const key of keys) {
    const nested = safeMediaUrl(videoInfo[key]);
    if (nested) return nested;
  }
  return null;
}

function errorResult(error: unknown, profileUrl: string, noteId: string | null = null): Extract<CreatorAcquisitionResult, { state: "blocked" }> {
  const providerError = error instanceof RedFoxError ? error : new RedFoxError("unavailable", "红狐采集发生未知错误。");
  const code = providerError.kind === "authentication" || providerError.kind === "configuration"
    ? "provider_authentication_failed"
    : providerError.kind === "rate_limit" ? "provider_rate_limited"
      : providerError.kind === "invalid_response" ? "provider_response_invalid" : "provider_unavailable";
  const navigationDiagnostic: CreatorNavigationDiagnostic | undefined = noteId ? {
    postExternalId: noteId, inputUrl: `https://www.xiaohongshu.com/explore/${noteId}`,
    canonicalUrl: `https://www.xiaohongshu.com/explore/${noteId}`,
    failureClass: "navigation_redirect", challengeType: null, phase: "redfox_detail", fallbackAttempted: false
  } : undefined;
  return { state: "blocked", finalUrl: profileUrl, taskSpaceId: null, code,
    message: providerError.message, retryable: !["authentication", "configuration", "invalid_response"].includes(providerError.kind),
    navigationDiagnostic };
}

export class RedFoxCreatorExecutor implements CreatorBrowserExecutor {
  private workByRun = new Map<string, Map<string, Record<string, unknown>>>();

  constructor(private readonly client = new RedFoxClient()) {}

  async acquire(input: { adapter: "redfox"; runId: string; profileUrl: string; maxScrollRounds: number; taskSpaceId: number | null }): Promise<CreatorAcquisitionResult> {
    const inputCreatorId = creatorIdFromProfile(input.profileUrl);
    if (!inputCreatorId) return { state: "blocked", finalUrl: input.profileUrl, taskSpaceId: null,
      code: "identity_ambiguous", message: "红狐 Provider 需要包含稳定 userId 的小红书博主主页链接。", retryable: false };
    try {
      const accountRaw = await this.client.post(endpoints.account, { userId: inputCreatorId });
      const account = firstRecord(accountRaw);
      if (!account) throw new RedFoxError("invalid_response", "红狐账号详情缺少数据对象。");
      const creatorId = asString(account.uid) ?? inputCreatorId;
      const creatorName = asString(account.nickname);
      const canonicalProfile = asString(account.url) ?? `https://www.xiaohongshu.com/user/profile/${creatorId}`;
      const maxPages = Math.min(20, Math.max(1, input.maxScrollRounds));
      const rawById = new Map<string, Record<string, unknown>>();
      let offset = "";
      let explicitEnd = false;
      for (let page = 0; page < maxPages; page += 1) {
        const raw = await this.client.post(endpoints.inventory, { userId: creatorId, offset });
        const rows = recordArray(raw, ["workList", "list", "items"]);
        if (rows.length === 0) { explicitEnd = true; break; }
        for (const row of rows) {
          const noteId = asString(row.noteId);
          if (noteId) rawById.set(noteId, row);
        }
        const last = rows.at(-1);
        const nextOffset = last ? asString(last.offset) ?? asString(last.noteId) : null;
        const hasNext = rows.some((row) => row.hasNextPage === true);
        if (!hasNext || !nextOffset || nextOffset === offset) { explicitEnd = true; break; }
        offset = nextOffset;
      }
      this.workByRun.set(input.runId, rawById);
      const posts = [...rawById].map(([noteId, row]) => {
        const title = asString(row.noteTitle);
        const likes = asNonnegativeInteger(row.thumbCount);
        const releaseTime = asString(row.releaseTime);
        return {
          externalId: noteId,
          url: `https://www.xiaohongshu.com/explore/${noteId}`,
          title,
          visibleText: [title, releaseTime].filter(Boolean).join("\n") || null,
          mediaType: mediaType(row.noteType),
          likesLabel: likes === null ? null : String(likes),
          likes
        };
      });
      const anchors = [
        { kind: "stable_id", value: creatorId, source: "redfox:accountDetail.uid" },
        ...(creatorName ? [{ kind: "display_name", value: creatorName, source: "redfox:accountDetail.nickname" }] : []),
        ...(asString(account.redId) ? [{ kind: "red_id", value: asString(account.redId)!, source: "redfox:accountDetail.redId" }] : [])
      ];
      if (anchors.length < 2) return { state: "blocked", finalUrl: canonicalProfile, taskSpaceId: null,
        code: "identity_ambiguous", message: "红狐账号详情不足两个独立公开身份锚点。", retryable: false };
      return {
        state: "ready", provider: "redfox", finalUrl: canonicalProfile, creatorId, creatorName, taskSpaceId: null,
        stopReason: explicitEnd ? "explicit_end" : "budget_reached", posts,
        warnings: explicitEnd ? [] : [`redfox_page_budget_reached:${maxPages}`],
        sourceRefs: [`redfox:${endpoints.account}`, `redfox:${endpoints.inventory}`],
        publicProfile: {
          bio: asString(account.introduction), followers: asNonnegativeInteger(account.fansCount),
          likesAndCollections: asNonnegativeInteger(account.likeCollectCount),
          displayedPostCount: asNonnegativeInteger(account.workCount), identityAnchors: anchors
        }
      };
    } catch (error) {
      return errorResult(error, input.profileUrl);
    }
  }

  async enrich(input: { adapter: "redfox"; runId: string; profileUrl: string; creatorName?: string | null;
    posts: Array<{ externalId: string; url: string; title?: string | null; resolveMedia: boolean }>;
    taskSpaceId: number | null; closeWhenDone?: boolean }): Promise<CreatorDetailResult> {
    const output: Extract<CreatorDetailResult, { state: "ready" }> ["posts"] = [];
    try {
      for (const post of input.posts) {
        const raw = await this.client.post(endpoints.detail, { noteId: post.externalId });
        const detail = firstRecord(raw, ["noteDetail", "item"]);
        if (!detail) throw new RedFoxError("invalid_response", `红狐详情缺少作品 ${post.externalId}。`);
        const cached = this.workByRun.get(input.runId)?.get(post.externalId) ?? {};
        const combined = { ...cached, ...detail };
        const type = mediaType(combined.noteType ?? combined.mediaType ?? combined.type);
        const picList = Array.isArray(combined.picList) ? combined.picList.filter(isRecord) : [];
        const firstPic = picList[0];
        const cover = firstMediaCandidate(combined, ["coverImage", "thumbnail", "coverImageUri"])
          ?? (firstPic ? firstMediaCandidate(firstPic, ["defaultUrl", "hdUrl", "previewUrl", "sourceUrl"]) : null);
        const video = post.resolveMedia && type === "video"
          ? firstMediaCandidate(combined, ["videoUrl", "mediaUrl", "masterUrl", "originVideoUrl"])
          : null;
        output.push({
          externalId: post.externalId,
          finalUrl: `https://www.xiaohongshu.com/explore/${post.externalId}`,
          title: asString(combined.noteTitle) ?? post.title ?? null,
          description: asString(combined.contentDesc) ?? asString(combined.content),
          publishedLabel: asString(combined.releaseTime) ?? asString(combined.publishDate)
            ?? (asNonnegativeInteger(combined.releaseTimestamp) !== null
              ? new Date(asNonnegativeInteger(combined.releaseTimestamp)! * 1000).toISOString() : null),
          mediaType: type,
          videoCandidateUrl: video,
          coverCandidateUrl: cover,
          inspectedAt: new Date().toISOString(),
          warnings: [
            "source:redfox:noteDetail",
            ...(post.resolveMedia && type === "video" && !video ? ["redfox_video_candidate_missing"] : [])
          ]
        });
      }
      return { state: "ready", provider: "redfox", taskSpaceId: null, posts: output, warnings: [] };
    } catch (error) {
      return errorResult(error, input.profileUrl, input.posts[output.length]?.externalId ?? null);
    }
  }
}

export { endpoints as redFoxCreatorEndpoints };
