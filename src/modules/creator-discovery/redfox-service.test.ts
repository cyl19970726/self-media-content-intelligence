import { describe, expect, it } from "vitest";
import { RedFoxClient } from "../../platform/redfox/redfox-client.js";
import { RedFoxCreatorDiscoveryService } from "./redfox-service.js";

describe("RedFoxCreatorDiscoveryService", () => {
  it("deduplicates authors and returns explainable bounded ranking", async () => {
    const responses = [
      { workList: [{ authorUid: "u1", authorName: "AI 一号", noteId: "n1", noteTitle: "AI 工具",
        noteUrl: "https://www.xiaohongshu.com/explore/n1", noteType: "video", thumbCount: 100,
        favoriteCount: 20, replyCount: 5, forwardCount: 2 }] },
      { workList: [{ authorUid: "u1", authorName: "AI 一号", noteId: "n2", noteTitle: "AIGC 教程",
        noteUrl: "https://www.xiaohongshu.com/explore/n2", noteType: "normal", thumbCount: 50,
        favoriteCount: 10, replyCount: 3, forwardCount: 1 },
        { authorUid: "u2", authorName: "AI 二号", noteId: "n3", noteTitle: "AI 绘画",
          noteUrl: "https://www.xiaohongshu.com/explore/n3", noteType: "normal", thumbCount: 10,
          favoriteCount: 1, replyCount: 0, forwardCount: 0 }] }
    ];
    const client = new RedFoxClient({ apiKey: "test", fetchImpl: async () => new Response(JSON.stringify(responses.shift()),
      { status: 200, headers: { "Content-Type": "application/json" } }) });
    const result = await new RedFoxCreatorDiscoveryService(client).discover({ keywords: ["AI工具", "AIGC"], pagesPerKeyword: 1, limit: 1 });
    expect(result.requestsUsed).toBe(2);
    expect(result.estimatedCostCny).toBe(0.12);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({ creatorId: "u1", observedNotes: 2, observedLikes: 150, videoNotes: 1 });
    expect(result.candidates[0]?.matchedKeywords).toEqual(["AIGC", "AI工具"]);
  });
});
