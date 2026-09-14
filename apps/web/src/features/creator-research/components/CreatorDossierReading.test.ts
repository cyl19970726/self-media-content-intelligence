import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { CreatorDossier } from "../../../shared/contracts/core";
import { CreatorDossierOverview } from "./CreatorDossierOverview";
import { CreatorPortfolioLibrary } from "./CreatorPortfolioLibrary";

const sourceFacts = {
  schemaVersion: "post-source-facts@1", sourceUrl: "https://example.com/post", capturedAt: null, title: "实拍",
  caption: "博主原文", coverHref: null, mediaType: "video", imageCount: 0, tags: [], publishedLabel: "2026-09-03T08:00:00Z",
  metrics: { likes: 200, collections: null, comments: null, shares: null }, availability: { title: "available", caption: "available", cover: "missing", overall: "partial" }, sourceRefs: []
} as const;

function dossier(): CreatorDossier {
  return {
    identity: { name: "骑着单车去酒吧", profileHref: "https://example.com/profile" }, corpus: { postCount: 56, medianLikes: 100 },
    run: { status: "reviewable", publicProfile: { bio: "省钱不踩坑，科技更有趣", followers: 1234, likesAndCollections: 5678, displayedPostCount: 56 }, coverage: { enrichedPosts: 21 }, videoWork: { activePostExternalIds: [], queuedPosts: 12, analyzedPosts: 0 } },
    portfolio: { items: [{ id: "p1", title: "实拍", sourceHref: "https://example.com/post", evidenceHref: null, coverHref: null, localVideoHref: "/media/p1.mp4", tier: "base", tierRank: 1, anchors: [], deepSample: true, likes: 200, collections: null, comments: null, shares: null, percentileRank: null, publishedLabel: "2026-09-03", durationSeconds: 65, topic: "科技", format: "实测", coreContent: null, contentArchitecture: [], mechanismHypothesis: null, selectionReason: "中位附近", evidenceStatus: "deep_built", sourceFacts }], health: {} }
  } as unknown as CreatorDossier;
}

describe("博主档案阅读组件", () => {
  it("展示博主主页来源事实", () => {
    const html = renderToStaticMarkup(createElement(CreatorDossierOverview, { data: dossier() }));
    expect(html).toContain("省钱不踩坑，科技更有趣");
    expect(html).toContain("博主主页来源事实");
  });

  it("作品列表显示中文日期、视频标签、本地素材和比较指标", () => {
    const data = dossier();
    const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(CreatorPortfolioLibrary, {
      data, items: data.portfolio.items, view: "list", tier: "all", topic: "all", format: "all", evidence: "all",
      topicOptions: [], formatOptions: [], setOption: () => undefined, itemHref: (item) => item.sourceHref
    })));
    expect(html).toContain("2026年9月3日 · 视频 · 1分5秒");
    expect(html).toContain("200 赞 · 2.00×");
    expect(html).toContain("查看已采集资料");
    expect(html).toContain('preload="none"');
    expect(html).toContain("博主原文");
  });

  it("图库保留点赞、比较指标和已产出的作品分析", () => {
    const data = dossier();
    Object.assign(data.portfolio.items[0]!, { coreContent: "实测本地部署", contentArchitecture: ["提出问题", "实测验证"], mechanismHypothesis: "用可见结果建立信任" });
    const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(CreatorPortfolioLibrary, {
      data, items: data.portfolio.items, view: "gallery", tier: "all", topic: "all", format: "all", evidence: "all",
      topicOptions: [], formatOptions: [], setOption: () => undefined, itemHref: (item) => item.sourceHref
    })));
    expect(html).toContain("200 赞 · 2.00×中位");
    expect(html).toContain("查看作品分析");
    expect(html).toContain("实测本地部署");
    expect(html).toContain("提出问题 → 实测验证");
    expect(html).toContain("用可见结果建立信任");
  });
});
