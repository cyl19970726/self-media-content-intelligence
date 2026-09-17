import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { WorkflowCreatorProgress } from "./WorkflowCreatorProgress";

it("shows a synthesis-only workflow with a Chinese waiting label", () => {
  const html = renderToStaticMarkup(WorkflowCreatorProgress({ value: { creatorRunId: "creator", posts: [],
    counts: { total: 0, queued: 0, running: 0, built: 0, reviewed: 0, revised: 0, needsReview: 0, failed: 0, canceled: 0 }, activeSlots: 0,
    synthesis: { state: "waiting", workflowRunId: "synthesis", currentNode: null } } }));
  expect(html).toContain("博主综合：等待子任务");
  expect(html).not.toContain("单帖：");
});

it("translates source checks, build, review and repair nodes", () => {
  for (const [currentNode, expected] of [["post.source-check", "来源核对"], ["creator.build", "构建中"], ["creator.review", "独立复核中"], ["creator.repair", "定向修订中"]] as const) {
    const html = renderToStaticMarkup(WorkflowCreatorProgress({ compact: true, value: { creatorRunId: "creator", posts: [],
      counts: { total: 0, queued: 0, running: 0, built: 0, reviewed: 0, revised: 0, needsReview: 0, failed: 0, canceled: 0 }, activeSlots: 0,
      synthesis: { state: "running", workflowRunId: "synthesis", currentNode } } }))
    expect(html).toContain(expected);
  }
});

it("does not present a registered revised candidate as an active review", () => {
  const html = renderToStaticMarkup(WorkflowCreatorProgress({ compact: true, value: { creatorRunId: "creator", posts: [],
    counts: { total: 0, queued: 0, running: 0, built: 0, reviewed: 0, revised: 0, needsReview: 0, failed: 0, canceled: 0 }, activeSlots: 0,
    synthesis: { state: "succeeded", workflowRunId: "repair", currentNode: "creator.review", terminalStatus: "revised_unverified" } } }));
  expect(html).toContain("修订已完成·未再次独立复核");
  expect(html).not.toContain("独立复核中");
});

it("labels revised posts separately from independently reviewed posts", () => {
  const html = renderToStaticMarkup(WorkflowCreatorProgress({ compact: true, value: { creatorRunId: "creator", posts: [],
    counts: { total: 2, queued: 0, running: 0, built: 2, reviewed: 1, revised: 1, needsReview: 0, failed: 0, canceled: 0 }, activeSlots: 0,
    synthesis: null } }));
  expect(html).toContain("1 已复核");
  expect(html).toContain("1 已按意见修订·未再次独立复核");
});
