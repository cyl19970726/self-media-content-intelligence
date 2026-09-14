import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { LatestPostList, LegacyRunRetired } from "./LatestPostIndex";

describe("latest single-post index", () => {
  it("links only the supplied latest Builder reports without rendering legacy report content", () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(LatestPostList, { items: [{
      creatorId: "creator", creatorName: "作者", videoId: "video", title: "最新报告", runId: "run", href: "/creators/creator/videos/video?run=run"
    }] })));
    expect(html).toContain("最新报告");
    expect(html).toContain("三部分报告");
    expect(html).toContain('href="/creators/creator/videos/video?run=run"');
    expect(html).not.toContain("ReportV2");
  });

  it("retires old run URLs with a single route back to the latest index", () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(LegacyRunRetired)));
    expect(html).toContain("旧报告入口已退役");
    expect(html).toContain('href="/analyze"');
  });
});
