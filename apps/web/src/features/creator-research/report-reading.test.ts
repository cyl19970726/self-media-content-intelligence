import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { VideoResearch } from "../../shared/contracts/core";
import { VisualEditingReport } from "./VisualEditingReport";
import { ContentRestorationReport } from "./ContentRestorationReport";
import { ReportCard } from "./ReportDetails";
import { DepthEvidence } from "./DepthReports";

const frames = [1, 2, 3].map(n => ({ id: `F${n}`, src: `/frame-${n}.jpg`, time: n, reason: null }));
const data = {
  frames: { dense: frames, sparse: [] }, transcript: [], evidenceIndex: [],
  sourceFacts: { coverHref: null },
  visualEditing: {
    openingAnalysis: null, orientation: null, composition: null, shotCount: null, cutsPerMinute: null,
    resultFirstAt: null, analyzedDuration: null, carriers: [], claims: [], shotSemantics: [], notes: [],
    transitions: [{ start: 1, end: 3, from: "前", to: "后", mechanism: "原始机制。", function: "原始作用", evidenceRefs: ["F1", "F2", "F3"] }],
    uiProcedureStates: [{ label: "操作", before: "前", during: "中", after: "后", input: null, output: null, parameters: [], continuity: "未知", start: 1, end: 2, evidenceRefs: ["F2"] }],
    missingBridges: [{ statement: "原始缺口。", impact: "原始影响", start: 1, end: 2, evidenceRefs: ["F3"] }], rhythm: []
  }
} as unknown as VideoResearch;

describe("report reading", () => {
  it("renders all transition references and keeps source statements intact", () => {
    const html = renderToStaticMarkup(createElement(VisualEditingReport, { data }));
    expect(html).toContain('href="/frame-3.jpg"');
    expect(html).toContain("原始机制。");
    expect(html).toContain("原始缺口。");
  });
  it("attaches evidence to UI states and continuity gaps", () => {
    const html = renderToStaticMarkup(createElement(VisualEditingReport, { data }));
    expect(html.slice(html.indexOf('id="visual-ui-states"'), html.indexOf('id="visual-transitions"'))).toContain('href="/frame-2.jpg"');
    expect(html.slice(html.indexOf('id="visual-continuity"'))).toContain('href="/frame-3.jpg"');
  });
  it("opens content evidence and keeps all content blocks in the document", () => {
    const block = { id: "one", type: "text", title: "标题", body: "原文", start: 0, end: 1, evidenceRefs: [], steps: [], boundary: null,
      media: [{ ref: "F1", src: "/frame-1.jpg", label: "证据", time: 1, role: "evidence", focus: "细节", proves: "支持", cannotProve: "边界", crop: null }] } as VideoResearch["contentBlocks"][number];
    const html = renderToStaticMarkup(createElement(ContentRestorationReport, { blocks: [block, { ...block, id: "two" }] }));
    expect(html).toContain('href="/frame-1.jpg"');
    expect(html).toContain('id="content-two"');
  });
  it("deduplicates references and explicitly labels missing evidence", () => {
    const html = renderToStaticMarkup(createElement(DepthEvidence, { data, refs: ["F1", "F1", "absent"] }));
    expect(html.match(/href="\/frame-1.jpg"/g)).toHaveLength(1);
    expect(html).toContain("来源未解析");
  });
});

import { MemoryRouter } from "react-router-dom";
import { ReportOverview } from "./ReportOverview";
import { contentRangeGaps, overviewSourceTarget } from "./report-reading-utils";

describe("report compatibility", () => {
  it("keeps old reports readable without a generated overview", () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(ReportOverview, { data })));
    expect(html).toContain("尚未生成综合总览");
  });
  it("does not display stale synthesized text", () => {
    const stale = { ...data, overview: { state: "stale", overview: null } } as VideoResearch;
    const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(ReportOverview, { data: stale })));
    expect(html).toContain("原报告已更新");
  });
  it("routes overview references to the exact content block and opening workspace", () => {
    const withBlocks = { ...data, contentBlocks: [{ id: "block-2", title: "原段落" }] } as VideoResearch;
    expect(overviewSourceTarget("/builderLenses/contentRestoration/blocks/0/body", withBlocks).anchor).toBe("content-block-2");
    expect(overviewSourceTarget("/builderLenses/visualEditing/openingAnalysis/segments/0", withBlocks).lens).toBe("opening");
  });
  it("reports time-range gaps without sorting or modifying source blocks", () => {
    const blocks = [{ start: 5, end: 10 }, { start: 0, end: 2 }] as VideoResearch["contentBlocks"];
    expect(contentRangeGaps(blocks, 12)).toEqual({ outOfOrder: true, gaps: [{ start: 2, end: 5 }, { start: 10, end: 12 }] });
    expect(blocks[0]?.start).toBe(5);
  });
});

describe("short transitions", () => {
  it("does not round a sub-second interval into the same start and end", () => {
    const html = renderToStaticMarkup(createElement(ReportCard, { data, title: "转场", start: 21.433, end: 21.5, children: "原文" }));
    expect(html).toContain("21.433–21.500 秒");
  });
});
