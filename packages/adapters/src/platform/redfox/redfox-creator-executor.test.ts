import { describe, expect, it } from "vitest";
import { RedFoxClient } from "./redfox-client.js";
import { RedFoxCreatorExecutor } from "./redfox-creator-executor.js";

function json(value: unknown): Response {
  return new Response(JSON.stringify(value), { status: 200, headers: { "Content-Type": "application/json" } });
}

describe("RedFoxCreatorExecutor", () => {
  it("normalizes account, inventory, profile provenance, detail and media candidates", async () => {
    const responses = [
      { uid: "creator-1", nickname: "AI 研究员", redId: "ai-lab", introduction: "公开研究 AI 工具",
        fansCount: 1200, likeCollectCount: 5600, workCount: 1, url: "https://www.xiaohongshu.com/user/profile/creator-1" },
      [{ noteId: "note-1", noteTitle: "AI 视频工作流", noteType: "video", thumbCount: 88,
        releaseTime: "2026-08-01", mediaUrl: "http://sns-video.example.xhscdn.com/source.mp4", hasNextPage: false }],
      [{ noteId: "note-1", noteTitle: "AI 视频工作流", noteType: "video", contentDesc: "完整正文",
        releaseTimestamp: 1785542400, coverImage: "http://sns-webpic.example.xhscdn.com/cover.webp",
        videoUrl: "http://sns-video.example.xhscdn.com/source.mp4" }]
    ];
    const client = new RedFoxClient({ apiKey: "test", fetchImpl: async () => json(responses.shift()) });
    const executor = new RedFoxCreatorExecutor(client);
    const acquired = await executor.acquire({ adapter: "redfox", runId: "run-1",
      profileUrl: "https://www.xiaohongshu.com/user/profile/creator-1", maxScrollRounds: 3, taskSpaceId: null });
    expect(acquired).toMatchObject({ state: "ready", provider: "redfox", creatorName: "AI 研究员",
      taskSpaceId: null, stopReason: "explicit_end" });
    if (acquired.state !== "ready") throw new Error("expected ready");
    expect(acquired.publicProfile).toMatchObject({ followers: 1200, displayedPostCount: 1 });
    expect(acquired.publicProfile?.identityAnchors).toHaveLength(3);
    expect(acquired.posts[0]).toMatchObject({ externalId: "note-1", likes: 88, mediaType: "video" });

    const detailed = await executor.enrich({ adapter: "redfox", runId: "run-1", profileUrl: acquired.finalUrl,
      posts: [{ externalId: "note-1", url: acquired.posts[0]!.url, title: acquired.posts[0]!.title, resolveMedia: true }],
      taskSpaceId: null });
    expect(detailed).toMatchObject({ state: "ready", provider: "redfox", taskSpaceId: null });
    if (detailed.state !== "ready") throw new Error("expected ready");
    expect(detailed.posts[0]?.videoCandidateUrl).toBe("https://sns-video.example.xhscdn.com/source.mp4");
    expect(detailed.posts[0]?.coverCandidateUrl).toBe("https://sns-webpic.example.xhscdn.com/cover.webp");
  });

  it("does not silently fall back when RedFox authentication fails", async () => {
    const client = new RedFoxClient({ apiKey: "test", fetchImpl: async () => new Response("", { status: 403 }) });
    const result = await new RedFoxCreatorExecutor(client).acquire({ adapter: "redfox", runId: "run-2",
      profileUrl: "https://www.xiaohongshu.com/user/profile/creator-2", maxScrollRounds: 1, taskSpaceId: null });
    expect(result).toMatchObject({ state: "blocked", code: "provider_authentication_failed", retryable: false });
  });

  it("checkpoints successful detail items when a later RedFox request fails", async () => {
    let request = 0;
    const client = new RedFoxClient({ apiKey: "test", fetchImpl: async () => {
      request += 1;
      if (request === 2) throw new Error("provider connection interrupted");
      return json([{ noteId: "note-1", noteTitle: "已完成详情", noteType: "normal", contentDesc: "正文" }]);
    }});
    const result = await new RedFoxCreatorExecutor(client).enrich({
      adapter: "redfox",
      runId: "run-partial",
      profileUrl: "https://www.xiaohongshu.com/user/profile/creator-partial",
      posts: [
        { externalId: "note-1", url: "https://www.xiaohongshu.com/explore/note-1", resolveMedia: false },
        { externalId: "note-2", url: "https://www.xiaohongshu.com/explore/note-2", resolveMedia: false }
      ],
      taskSpaceId: null
    });

    expect(result).toMatchObject({
      state: "blocked",
      code: "provider_unavailable",
      partialPosts: [{ externalId: "note-1", description: "正文" }]
    });
    if (result.state !== "blocked") throw new Error("expected partial blocked result");
    expect(result.partialWarnings).toContain("redfox_partial_checkpoint:1/2");
  });
});
