import type { CollectionResult } from "./adapters/types.js";
import type { ParsedSource } from "../shared/schema.js";

export function fixtureCollection(parsed: ParsedSource): CollectionResult {
  const isX = parsed.platform === "x";
  return {
    state: "ready",
    localVideoPath: null,
    message: null,
    rawPayload: { fixture: true, platform: parsed.platform },
    context: {
      status: "ready",
      query: isX ? "AI agents" : "内容创作",
      notes: ["演示样例包含 8 条作者基线与 8 条同题材基线。"],
      rawArtifactRefs: [],
      authorPosts: [2400, 3800, 5100, 7200, 8100, 9600, 11800, 15400].map((likes, index) => ({
        id: `author-${index + 1}`,
        title: `作者历史内容 ${index + 1}`,
        authorName: isX ? "Build in Public" : "内容实验室",
        sourceUrl: null,
        publishedAt: new Date(Date.UTC(2026, 6, 4 + index * 3)).toISOString(),
        source: "author" as const,
        metrics: {
          views: isX ? likes * 24 : null,
          likes,
          comments: Math.round(likes * 0.052),
          shares: Math.round(likes * 0.11),
          bookmarks: isX ? null : Math.round(likes * 0.31),
          quotes: isX ? Math.round(likes * 0.025) : null,
          followers: isX ? 48200 : 126000
        }
      })),
      topicPosts: [1800, 2900, 4200, 6800, 10300, 13700, 18200, 24600].map((likes, index) => ({
        id: `topic-${index + 1}`,
        title: `同题材内容 ${index + 1}`,
        authorName: `同题材作者 ${index + 1}`,
        sourceUrl: null,
        publishedAt: new Date(Date.UTC(2026, 6, 8 + index * 2)).toISOString(),
        source: "topic" as const,
        metrics: {
          views: isX ? likes * 22 : null,
          likes,
          comments: Math.round(likes * 0.045),
          shares: Math.round(likes * 0.095),
          bookmarks: isX ? null : Math.round(likes * 0.26),
          quotes: isX ? Math.round(likes * 0.02) : null,
          followers: null
        }
      }))
    },
    source: {
      platform: parsed.platform,
      sourceUrl: parsed.sourceUrl,
      externalId: parsed.externalId,
      retrievedAt: new Date().toISOString(),
      author: {
        id: "creator-001",
        handle: isX ? "buildinpublic" : "内容实验室",
        name: isX ? "Build in Public" : "内容实验室",
        followers: isX ? 48200 : 126000,
        avatarUrl: null
      },
      title: isX ? "我把 7 天的 Agent 实验压缩成了 1 张图" : "别再堆信息了：爆款解释视频只做这 3 层",
      text: isX
        ? "大多数 Agent 教程都在展示功能，却没有解释控制权到底在哪里。过去 7 天我拆了 12 个实现，最后发现只要看计划、状态和证据分别由谁持有，架构差异就清楚了。"
        : "同一个技术选题，为什么有人讲完观众还是听不懂？问题通常不在信息少，而在没有先建立一张心智地图。第一层讲冲突，第二层讲机制，第三层才给细节和证据。",
      publishedAt: "2026-08-08T12:30:00.000Z",
      tags: isX ? ["AI", "Agents", "BuildInPublic"] : ["AI工具", "内容创作", "知识博主"],
      metrics: {
        views: isX ? 386000 : 728000,
        likes: isX ? 12400 : 39100,
        comments: isX ? 864 : 2180,
        shares: isX ? 3310 : 5890,
        bookmarks: isX ? null : 17400,
        quotes: isX ? 640 : null,
        followers: isX ? 48200 : 126000
      },
      media: [],
      comments: [
        { id: "c1", author: "reader-a", text: "终于有人把计划和状态分开讲了", likes: 418 },
        { id: "c2", author: "reader-b", text: "能不能再做一期真实项目完整案例？", likes: 207 },
        { id: "c3", author: "reader-c", text: "收藏了，第三层证据具体怎么组织？", likes: 156 },
        { id: "c4", author: "reader-d", text: "如果是小团队没有数据看板也能这么做吗？", likes: 92 },
        { id: "c5", author: "reader-e", text: "框架很清楚，但案例还是有点少", likes: 81 },
        { id: "c6", author: "reader-f", text: "已经照着三层结构改了我的脚本", likes: 73 },
        { id: "c7", author: "reader-g", text: "求一个完整模板或者检查清单", likes: 69 },
        { id: "c8", author: "reader-h", text: "机制层和证据层的区别是什么？", likes: 55 },
        { id: "c9", author: "reader-i", text: "讲得很好，终于不只是罗列工具", likes: 41 },
        { id: "c10", author: "reader-j", text: "下一期可以拆一个失败案例吗？", likes: 37 },
        { id: "c11", author: "reader-k", text: "理论有用，不过不同平台应该不一样", likes: 28 },
        { id: "c12", author: "reader-l", text: "已收藏，准备周末实践", likes: 19 }
      ],
      rawArtifactRef: null
    }
  };
}
