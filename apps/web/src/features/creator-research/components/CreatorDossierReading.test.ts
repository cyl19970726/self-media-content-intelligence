import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { CreatorDossier } from "../../../shared/contracts/core";
import { CreatorDossierOverview } from "./CreatorDossierOverview";
import { CreatorPortfolioLibrary } from "./CreatorPortfolioLibrary";
import { CrossPostResearchReading } from "./CrossPostResearchReading";

const sourceFacts = {
  schemaVersion: "post-source-facts@1", sourceUrl: "https://example.com/post", capturedAt: null, title: "实拍",
  caption: "博主原文", coverHref: null, mediaType: "video", imageCount: 0, tags: [], publishedLabel: "2026-09-03T08:00:00Z",
  metrics: { likes: 200, collections: null, comments: null, shares: null }, availability: { title: "available", caption: "available", cover: "missing", overall: "partial" }, sourceRefs: []
} as const;

function dossier(): CreatorDossier {
  return {
    identity: { name: "骑着单车去酒吧", profileHref: "https://example.com/profile" }, corpus: { postCount: 56, medianLikes: 100 },
    run: { status: "reviewable", publicProfile: { bio: "省钱不踩坑，科技更有趣", followers: 1234, likesAndCollections: 5678, displayedPostCount: 56 }, coverage: { enrichedPosts: 21 }, videoWork: { activePostExternalIds: [], queuedPosts: 12, analyzedPosts: 0 } },
    portfolio: { items: [{ id: "p1", title: "实拍", sourceHref: "https://example.com/post", evidenceHref: "/creators/creator/videos/p1?run=run-1", coverHref: null, localVideoHref: "/media/p1.mp4", tier: "base", tierRank: 1, anchors: [], deepSample: true, likes: 200, collections: null, comments: null, shares: null, percentileRank: null, publishedLabel: "2026-09-03", durationSeconds: 65, topic: "科技", format: "实测", coreContent: null, contentArchitecture: [], mechanismHypothesis: null, selectionReason: "中位附近", evidenceStatus: "deep_built", sourceFacts }], health: {} }
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

  it("归一化四舍五入后进位到整分钟的时长", () => {
    const data = dossier();
    data.portfolio.items[0]!.durationSeconds = 119.5;
    const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(CreatorPortfolioLibrary, {
      data, items: data.portfolio.items, view: "list", tier: "all", topic: "all", format: "all", evidence: "all",
      topicOptions: [], formatOptions: [], setOption: () => undefined, itemHref: (item) => item.sourceHref
    })));
    expect(html).toContain("2026年9月3日 · 视频 · 2分0秒");
    expect(html).not.toContain("1分60秒");
  });

  it("将已完成但有 findings 的独立评估与真正待评估的 Builder 结果分别标注", () => {
    const data = dossier();
    data.portfolio.items[0]!.evidenceStatus = "deep_evaluated_with_findings";
    data.portfolio.items.push({ ...data.portfolio.items[0]!, id: "p2", evidenceStatus: "deep_built" });
    const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(CreatorPortfolioLibrary, {
      data, items: data.portfolio.items, view: "list", tier: "all", topic: "all", format: "all", evidence: "all",
      topicOptions: [], formatOptions: [], setOption: () => undefined, itemHref: (item) => item.sourceHref
    })));
    expect(html).toContain("已评估·有待修复项");
    expect(html).toContain("Builder 已完成·待评估");
  });

  it("明确区分新版 Reviewer 的无意见、修订未再次独立复核和技术失败状态", () => {
    const data = dossier();
    data.portfolio.items[0]!.evidenceStatus = "deep_reviewed_no_findings";
    data.portfolio.items.push(
      { ...data.portfolio.items[0]!, id: "p2", evidenceStatus: "deep_revised_unverified" },
      { ...data.portfolio.items[0]!, id: "p3", evidenceStatus: "deep_review_failed" }
    );
    const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(CreatorPortfolioLibrary, {
      data, items: data.portfolio.items, view: "list", tier: "all", topic: "all", format: "all", evidence: "all",
      topicOptions: [], formatOptions: [], setOption: () => undefined, itemHref: (item) => item.sourceHref
    })));
    expect(html).toContain("Reviewer 已完成·无意见");
    expect(html).toContain("已按意见修订·未再次独立复核");
    expect(html).toContain("Reviewer 技术失败·待处理");
    expect(html).not.toContain("Reviewer 已完成·无意见通过");
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

  it("默认展示跨帖依据并仅折叠原始引用，保留原始结论、边界、问题和统计口径", () => {
    const data = dossier();
    data.crossPostResearch = { sections: [{ id: "performance", title: "表现", findings: [{
      id: "performance-1", statement: "原始表现结论", factClass: "inference", confidence: "medium",
      support: [{ postExternalId: "p1", observation: "原始支持观察", evidenceRefs: ["/research/p1.json"] }],
      counterexamples: [{ postExternalId: "absent", observation: "原始反例观察", evidenceRefs: ["/research/absent.json"] }],
      boundary: "原始边界", openQuestions: ["原始待答问题"]
    }] }] };
    data.synthesisSourceChanges = [{ postExternalId: "p1", note: "补全原证据中的知识" }];
    const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(CrossPostResearchReading, { data, research: data.crossPostResearch, returnTo: "/creators/creator?run=run-1&tier=base" })));
    for (const text of ["原始表现结论", "原始边界", "原始待答问题", "支持证据 · 1 条", "反例与不一致处 · 1 条", "实拍", "该帖未在当前作品集中", "56 条可见作品", "查看全量基本盘"]) expect(html).toContain(text);
    expect(html).toContain("<details");
    expect(html).toContain("原始支持观察");
    expect(html).toContain("原始反例观察");
    expect(html.indexOf("原始支持观察")).toBeLessThan(html.indexOf("原始边界"));
    expect(html.indexOf("原始反例观察")).toBeLessThan(html.indexOf("原始边界"));
    expect(html).toContain("本页综合仍基于修订前版本");
    expect(html).toContain("returnTo=%2Fcreators%2Fcreator%3Frun%3Drun-1%26tier%3Dbase%23performance");

    data.crossPostResearch.sections[0]!.findings[0]!.counterexamples = [];
    const singleColumnHtml = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(CrossPostResearchReading, { data, research: data.crossPostResearch, returnTo: "/creators/creator?run=run-1&tier=base" })));
    expect(singleColumnHtml).toContain("cross-post-research__evidence-groups--single");
    expect(singleColumnHtml).toContain("未提供反例。");
  });
});
