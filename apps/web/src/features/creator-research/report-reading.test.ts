import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { VideoResearch } from "../../shared/contracts/core";
import { VisualEditingReport } from "./VisualEditingReport";
import { DirectingStoryReport } from "./DirectingStoryReport";
import { ContentRestorationReport } from "./ContentRestorationReport";
import { ReportCard } from "./ReportDetails";
import { DepthEvidence, OpeningReport } from "./DepthReports";

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
  it("labels an untimed transcript reference as unknown rather than undefined seconds", () => {
    const untimed = { ...data, transcript: [{ id: "CUE-1", start: null, end: null, text: "原始转写" }] } as VideoResearch;
    const html = renderToStaticMarkup(createElement(DepthEvidence, { data: untimed, refs: ["CUE-1"] }));
    expect(html).toContain("时间未知");
    expect(html).not.toContain("undefineds");
  });
  it("reports an absent opening analysis without inventing replacement content", () => {
    const html = renderToStaticMarkup(createElement(OpeningReport, { data }));
    expect(html).toContain("Builder 未产出开头分析");
    expect(html).not.toContain("原始报告");
  });
  it("renders every directing field and keeps stage evidence beside the source stage", () => {
    const directing = { ...data, directingLogic: {
      packagingAnalysis: null,
      viewerBefore: "观看前状态", viewerAfter: "观看后状态", activatedQuestion: "激活问题", promise: "内容承诺", payoff: "最终回报", endingResolution: "结尾收束",
      stages: [{ label: "Hook", start: 1, end: 2, viewerQuestion: "阶段问题", function: "阶段作用", proof: "阶段证明", cognitiveChange: "认知变化", comprehensionLoad: "理解成本", payoff: "阶段回报", evidenceRefs: ["F1"] }],
      informationDesign: [{ kind: "信息种类", statement: "信息陈述", start: 2, end: 3, evidenceRefs: ["F2"] }],
      proofDesign: [{ proofType: "visible_proof", statement: "证明陈述", boundary: "证明边界", start: 2, end: 3, evidenceRefs: ["F3"] }],
      loadAndPayoff: { compression: "压缩方式", repetition: "重复方式", payoffDistance: "回报距离", comprehensionCosts: ["成本一"] },
      notes: ["Builder 原始说明"]
    }} as VideoResearch;
    const html = renderToStaticMarkup(createElement(DirectingStoryReport, { data: directing }));
    for (const value of ["观看前状态", "观看后状态", "激活问题", "内容承诺", "最终回报", "结尾收束", "阶段问题", "阶段作用", "阶段证明", "认知变化", "理解成本", "阶段回报", "信息陈述", "证明陈述", "证明边界", "压缩方式", "重复方式", "回报距离", "成本一", "Builder 原始说明"]) expect(html).toContain(value);
    expect(html.slice(html.indexOf('id="directing-stage-1"'), html.indexOf('id="directing-information"'))).toContain('href="/frame-1.jpg"');
  });
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
    const block = { id: "one", type: "text", title: "标题", body: "原文", start: 0, end: 1, evidenceRefs: [], steps: [], boundary: null, unresolvedVisuals: [],
      media: [{ ref: "F1", src: "/frame-1.jpg", label: "证据", time: 1, role: "evidence", focus: "细节", proves: "支持", cannotProve: "边界", crop: null }] } as VideoResearch["contentBlocks"][number];
    const html = renderToStaticMarkup(createElement(ContentRestorationReport, { blocks: [block, { ...block, id: "two" }] }));
    expect(html).toContain('href="/frame-1.jpg"');
    expect(html).toContain('id="content-two"');
  });
  it("renders a seven-column Markdown table between the original prose paragraphs", () => {
    const block = { id: "table", type: "text", title: "表格", start: 0, end: 1, evidenceRefs: [], steps: [], boundary: null, unresolvedVisuals: [], media: [],
      body: "表前原文。\n\n| 显卡型号 | 架构 | 应用领域 | 模型 | 精度 | 速度 | 价格 |\n| --- | --- | --- | --- | --- | --- | --- |\n| V100 32G | Volta | 推理 | 上下文推理 | FP16 | 22–28 | 4–6K |\n| RTX8000 48G | Turing | 工作站 | 文生视频（慢） | FP16 | 30–36 | 1.6–1.8W |\n\n表后原文。" } as VideoResearch["contentBlocks"][number];
    const html = renderToStaticMarkup(createElement(ContentRestorationReport, { blocks: [block] }));
    expect(html).toContain('class="content-markdown-table"');
    expect(html).toContain("<th scope=\"col\">显卡型号</th>");
    expect(html).toContain("<td>RTX8000 48G</td>");
    expect(html).toContain("表前原文。");
    expect(html).toContain("表后原文。");
  });
  it("keeps malformed Markdown table text as prose", () => {
    const body = "保留原文\n| 列一 | 列二 |\n| --- | 不是分隔行 |\n| 内容 | 不应转表 |";
    const block = { id: "malformed-table", type: "text", title: "原文", body, start: 0, end: 1, evidenceRefs: [], steps: [], boundary: null, unresolvedVisuals: [], media: [] } as VideoResearch["contentBlocks"][number];
    const html = renderToStaticMarkup(createElement(ContentRestorationReport, { blocks: [block] }));
    expect(html).not.toContain('class="content-markdown-table"');
    expect(html).toContain("| 列一 | 列二 |");
    expect(html).toContain("| --- | 不是分隔行 |");
  });
  it("deduplicates references and explicitly labels missing evidence", () => {
    const html = renderToStaticMarkup(createElement(DepthEvidence, { data, refs: ["F1", "F1", "absent"] }));
    expect(html.match(/href="\/frame-1.jpg"/g)).toHaveLength(1);
    expect(html).toContain("来源未解析");
  });
  it("preserves visual annotations and step references when images cannot be resolved", () => {
    const block: VideoResearch["contentBlocks"][number] = {
      id: "missing", type: "operation_sequence", title: "原始标题", body: "原始正文", start: 0, end: 1,
      evidenceRefs: [], media: [], boundary: null,
      unresolvedVisuals: [{ ref: "CROP-MISSING", role: "detail_crop", focus: "按钮文字", proves: "可见参数", cannotProve: "运行效果未知" }],
      steps: [{ label: "步骤", description: "原始步骤", media: [], unresolvedFrameRefs: ["STEP-MISSING"] }]
    };
    const html = renderToStaticMarkup(createElement(ContentRestorationReport, { blocks: [block] }));
    for (const text of ["按钮文字", "可见参数", "运行效果未知", "CROP-MISSING", "STEP-MISSING", "原始步骤"]) expect(html).toContain(text);
    expect(html).not.toContain("<img");
  });
  it("resolves an unresolved shot visual from its existing representative-frame artifact", () => {
    const shotData = { ...data,
      evidenceIndex: [{ id: "SHOT-004", kind: "shot", label: "9.533–12.933 秒镜头 · 代表帧 11.233 秒（非切点画面）", anchorId: null, artifactRef: "/shot-004.jpg" }]
    } as VideoResearch;
    const block: VideoResearch["contentBlocks"][number] = {
      id: "shot", type: "frame_strip", title: "镜头", body: "原始正文", start: 9, end: 13,
      evidenceRefs: [], media: [], boundary: null,
      unresolvedVisuals: [{ ref: "SHOT-004", role: "key_frame", focus: "宠物画面", proves: "画面", cannotProve: "连续动作" }],
      steps: []
    };
    const html = renderToStaticMarkup(createElement(ContentRestorationReport, { blocks: [block], data: shotData }));
    expect(html).toContain('<img src="/shot-004.jpg"');
    expect(html).toContain("镜头代表帧");
    expect(html).toContain("11.233 秒");
    expect(html).not.toContain("图片引用未解析");
  });
});

import { MemoryRouter } from "react-router-dom";
import { ReportOverview } from "./ReportOverview";
import { contentRangeGaps, overviewSourceTarget } from "./report-reading-utils";

describe("report compatibility", () => {
  it("keeps old reports readable without a generated overview", () => {
    const html = renderToStaticMarkup(createElement(MemoryRouter, {}, createElement(ReportOverview, { data })));
    expect(html).toBe("");
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
