import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import type { PostWorkflowReading } from "../../shared/contracts/post-workflow-reading";
import { PostWorkflowReadingPanel, workflowIsActive, workflowReviewLabel } from "./PostWorkflowReadingPanel";

const reading: PostWorkflowReading = {
  workflow: { rootRunId: "workflow-1", state: "running", workflowId: "post.analyze", workflowRevision: "v5", selectedFrom: "explicit" },
  phases: [
    { id: "source", title: "来源核对", state: "succeeded", purpose: "核对来源", usage: { attempts: 1, inputTokens: 5, outputTokens: 2, unknown: false } },
    { id: "build", title: "候选构建", state: "running", purpose: "构建候选", usage: { attempts: 1, inputTokens: null, outputTokens: null, unknown: true }, reusedCandidate: true },
    { id: "review", title: "独立复核", state: "queued", purpose: "复核候选", usage: { attempts: 0, inputTokens: null, outputTokens: null, unknown: true } }
  ],
  candidate: { ownerRunId: "child-1", artifactId: "artifact-1", artifactType: "post-candidate", revision: "1", sha256: "a".repeat(64), reviewStatus: "pending", revisionStatus: "revision_unverified", readerHref: "/api/workflow-runs/child-1/artifacts/artifact-1/reader" },
  baseCandidate: { ownerRunId: "child-0", artifactId: "artifact-0", readerHref: "/api/workflow-runs/child-0/artifacts/artifact-0/reader" },
  dispositions: [{ id: "finding-1", status: "changed", reason: "已修正对应的事实表述。" }]
};

it("shows step counts and the exact revision review state while keeping execution detail secondary", () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(PostWorkflowReadingPanel, { reading, creatorRunId: "creator-1", version: "candidate",
      wantsCandidate: true, onVersionChange: () => undefined, candidateReady: true, baseReady: true, candidateError: null, baseError: null })));
  expect(html).toContain("已登记 3 个阶段，其中 1 个完成；后续阶段数未知 · 当前第 2 步");
  expect(html).toContain("修订稿尚未再次独立审阅");
  expect(html).toContain("复用已有候选");
  expect(html).toContain("<details");
  expect(html).toContain("creatorRunId=creator-1");
  expect(html).not.toContain("输入 5");
});

it("labels original-report fallback honestly when candidate is still loading", () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(PostWorkflowReadingPanel, { reading, creatorRunId: "creator-1", version: "original",
      wantsCandidate: true, onVersionChange: () => undefined, candidateReady: false, baseReady: false, candidateError: null, baseError: null })));
  expect(html).toContain("候选版本正在载入；下方暂显示批次报告");
  expect(workflowReviewLabel({ ...reading, candidate: { ...reading.candidate!, revisionStatus: "revision_unverified" } })).toBe("修订稿尚未再次独立审阅");
  const baseLoading = renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(PostWorkflowReadingPanel, { reading, creatorRunId: "creator-1", version: "original",
      wantsCandidate: false, onVersionChange: () => undefined, candidateReady: false, baseReady: false,
      candidateError: null, baseError: null })));
  expect(baseLoading).toContain("修订前报告正在载入；下方暂显示批次报告");
});

it("does not call a failed run ready or completed", () => {
  const failed: PostWorkflowReading = { ...reading, workflow: { ...reading.workflow!, state: "failed" },
    phases: reading.phases.map((phase, index) => index === 1 ? { ...phase, state: "failed" } : phase) };
  const html = renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(PostWorkflowReadingPanel, { reading: failed, creatorRunId: "creator-1", version: "original",
      wantsCandidate: false, onVersionChange: () => undefined, candidateReady: false, baseReady: false, candidateError: null, baseError: null })));
  expect(html).toContain("本次研究未完成");
  expect(html).toContain("已登记 3 个阶段，其中 1 个完成；后续阶段数未知");
  expect(html).not.toContain("研究流程已结束");
});

it("uses an explicit closed plan only when the shared progress projection provides one", () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(PostWorkflowReadingPanel, { reading: { ...reading, progress: { registered: 3, completed: 1, planned: 4, closed: true } }, creatorRunId: "creator-1", version: "original",
      wantsCandidate: false, onVersionChange: () => undefined, candidateReady: false, baseReady: false, candidateError: null, baseError: null })));
  expect(html).toContain("1/4 个计划阶段完成");
  const unplanned = renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(PostWorkflowReadingPanel, { reading: { ...reading, progress: { registered: 3, completed: 1, closed: true } }, creatorRunId: "creator-1", version: "original",
      wantsCandidate: false, onVersionChange: () => undefined, candidateReady: false, baseReady: false, candidateError: null, baseError: null })));
  expect(unplanned).toContain("流程已结束，共登记 3 个阶段，其中 1 个完成");
  expect(unplanned).not.toContain("后续阶段数尚未确定");
});

it("does not imply a batch report exists in the empty-report state", () => {
  const empty: PostWorkflowReading = { ...reading, candidate: null, baseCandidate: null };
  const html = renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(PostWorkflowReadingPanel, { reading: empty, creatorRunId: "creator-1", version: "original",
      wantsCandidate: false, onVersionChange: () => undefined, candidateReady: false, baseReady: false,
      hasBatchReport: false, candidateError: null, baseError: null })));
  expect(html).toContain("候选报告尚未可读");
  expect(html).toContain("当前没有可读正文");
  expect(html).not.toContain("当前显示批次报告");
});

it("treats a parent waiting on a child as active execution and keeps fresh-start locked", () => {
  const waiting: PostWorkflowReading = { ...reading, workflow: { ...reading.workflow!, state: "waiting" },
    phases: reading.phases.map((phase, index) => index === 1 ? { ...phase, state: "waiting" } : phase) };
  const html = renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(PostWorkflowReadingPanel, { reading: waiting, creatorRunId: "creator-1", version: "original",
      wantsCandidate: false, onVersionChange: () => undefined, candidateReady: false, baseReady: false,
      candidateError: null, baseError: null })));
  expect(html).toContain("候选构建 · 子流程执行中");
  expect(html).not.toContain("等待下阶段");
  expect(workflowIsActive(waiting)).toBe(true);
  expect(workflowIsActive({ ...waiting, workflow: { ...waiting.workflow!, state: "succeeded" } })).toBe(false);
});


it("shows findings from an exact independent review of a revised candidate", () => {
  expect(workflowReviewLabel({ ...reading, candidate: { ...reading.candidate!, revisionStatus: "revision_recorded", reviewStatus: "findings" } })).toBe("独立复核发现问题");
});
