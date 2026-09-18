import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { expect, it } from "vitest";
import type { PostWorkflowReading } from "../../shared/contracts/post-workflow-reading";
import { PostWorkflowReadingPanel, workflowReviewLabel } from "./PostWorkflowReadingPanel";

const reading: PostWorkflowReading = {
  workflow: { rootRunId: "workflow-1", state: "running", workflowId: "post.analyze", workflowRevision: "v5", selectedFrom: "explicit" },
  phases: [
    { id: "source", title: "来源核对", state: "succeeded", purpose: "核对来源", usage: { attempts: 1, inputTokens: 5, outputTokens: 2, unknown: false } },
    { id: "build", title: "候选构建", state: "running", purpose: "构建候选", usage: { attempts: 1, inputTokens: null, outputTokens: null, unknown: true }, reusedCandidate: true },
    { id: "review", title: "独立复核", state: "queued", purpose: "复核候选", usage: { attempts: 0, inputTokens: null, outputTokens: null, unknown: true } }
  ],
  candidate: { ownerRunId: "child-1", artifactId: "artifact-1", artifactType: "post-candidate", revision: "1", sha256: "a".repeat(64), reviewStatus: "findings", revisionStatus: "revision_recorded", readerHref: "/api/workflow-runs/child-1/artifacts/artifact-1/reader" },
  baseCandidate: { ownerRunId: "child-0", artifactId: "artifact-0", readerHref: "/api/workflow-runs/child-0/artifacts/artifact-0/reader" },
  dispositions: [{ id: "finding-1", status: "changed", reason: "已修正对应的事实表述。" }]
};

it("shows step counts and the exact revision review state while keeping execution detail secondary", () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null,
    createElement(PostWorkflowReadingPanel, { reading, creatorRunId: "creator-1", version: "candidate",
      wantsCandidate: true, onVersionChange: () => undefined, candidateReady: true, baseReady: true, candidateError: null, baseError: null })));
  expect(html).toContain("1/3 步已完成 · 当前第 2 步");
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
  expect(html).toContain("1/3 步已完成");
  expect(html).not.toContain("研究流程已结束");
});
