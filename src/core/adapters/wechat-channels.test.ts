import { describe, expect, it } from "vitest";
import { RedFoxClient } from "../../../packages/adapters/index.js";
import { createWechatChannelsAdapter, redFoxWechatChannelsEndpoints } from "./wechat-channels.js";
import { parseSourceUrl } from "../url-router.js";

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
}

describe("WeChat Channels RedFox adapter", () => {
  it("normalizes link detail, downloadable media and comparison baselines", async () => {
    const requests: Array<{ endpoint: string; body: Record<string, unknown> }> = [];
    const responses = [
      { code: 2000, data: {
        videoId: "video-1", description: "三步讲清楚 Agent 工作流 #AI工具", nickname: "内容实验室",
        finderUserId: "finder-1", headUrl: "https://example.com/avatar.jpg", likeCount: 1200,
        commentCount: 80, forwardCount: 150, favCount: 420, playCount: 9800,
        publishTime: "2026-08-30 12:30:00", coverUrl: "https://example.com/cover.jpg"
      } },
      { code: 2000, data: { videoUrl: "https://example.com/source.mp4" } },
      { code: 2000, data: { list: [
        { videoId: "video-2", description: "作者旧作", nickname: "内容实验室", likeCount: 300 },
        { videoId: "video-3", description: "作者旧作 2", nickname: "内容实验室", likeCount: 500 },
        { videoId: "video-4", description: "作者旧作 3", nickname: "内容实验室", likeCount: 700 }
      ] } },
      { code: 2000, data: { list: [
        { videoId: "topic-1", description: "AI 工具案例", nickname: "同行 A", likeCount: 400 },
        { videoId: "topic-2", description: "AI 工具教程", nickname: "同行 B", likeCount: 600 },
        { videoId: "topic-3", description: "AI 工具复盘", nickname: "同行 C", likeCount: 900 }
      ] } }
    ];
    const client = new RedFoxClient({ apiKey: "test", fetchImpl: async (input, init) => {
      requests.push({
        endpoint: new URL(input instanceof Request ? input.url : String(input)).pathname,
        body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>
      });
      return json(responses.shift());
    } });
    const result = await createWechatChannelsAdapter(client).collect(
      parseSourceUrl("https://weixin.qq.com/sph/share-token"), "run-1");

    expect(result.state).toBe("ready");
    expect(result.source).toMatchObject({
      platform: "wechat_channels", externalId: "video-1", title: "三步讲清楚 Agent 工作流 #AI工具",
      author: { id: "finder-1", name: "内容实验室" },
      metrics: { views: 9800, likes: 1200, comments: 80, shares: 150, bookmarks: 420 },
      media: [
        { kind: "video", url: "https://example.com/source.mp4" },
        { kind: "image", url: "https://example.com/cover.jpg" }
      ]
    });
    expect(result.source?.tags).toContain("AI工具");
    expect(result.context).toMatchObject({ status: "ready", query: "AI工具" });
    expect(result.context.authorPosts).toHaveLength(3);
    expect(result.context.topicPosts).toHaveLength(3);
    expect(requests.map((request) => request.endpoint)).toEqual([
      redFoxWechatChannelsEndpoints.detailByLink,
      redFoxWechatChannelsEndpoints.download,
      redFoxWechatChannelsEndpoints.userWorks,
      redFoxWechatChannelsEndpoints.search
    ]);
    expect(requests[0]?.body).toEqual({ url: "https://weixin.qq.com/sph/share-token" });
  });

  it("keeps public metadata when media resolution is unavailable", async () => {
    let request = 0;
    const client = new RedFoxClient({ apiKey: "test", fetchImpl: async () => {
      request += 1;
      if (request === 1) return json({ data: { videoId: "video-1", description: "只有元数据", nickname: "作者" } });
      if (request === 2) return json({ code: 5000, msg: "暂未解析到视频" });
      return json({ data: { list: [] } });
    } });
    const result = await createWechatChannelsAdapter(client).collect(
      parseSourceUrl("https://weixin.qq.com/sph/share-token"), "run-2");

    expect(result).toMatchObject({ state: "ready", message: "帖子公开数据已采集，但视频媒体暂不可用。" });
    expect(result.source?.media).toEqual([]);
    expect(result.context.notes[0]).toContain("视频媒体未取得");
  });

  it("blocks without silently falling back when RedFox authentication fails", async () => {
    const client = new RedFoxClient({ apiKey: "test", fetchImpl: async () => json({}, 403) });
    const result = await createWechatChannelsAdapter(client).collect(
      parseSourceUrl("https://weixin.qq.com/sph/share-token"), "run-3");
    expect(result).toMatchObject({ state: "blocked", source: null });
    expect(result.message).toContain("凭证无效");
  });
});
