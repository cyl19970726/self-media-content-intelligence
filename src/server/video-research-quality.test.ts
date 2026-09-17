import { describe, expect, it } from "vitest";
import { projectPostQualityStates, readerStatusLabel } from "./video-research.js";

describe("projectPostQualityStates", () => {
  it("keeps Builder-only work provisional", () => {
    expect(projectPostQualityStates("built_unevaluated", false)).toEqual({
      buildState: "built", evaluationState: "skipped", promotionState: "provisional"
    });
  });

  it("does not trust a stale ready label without a valid evaluator artifact", () => {
    expect(projectPostQualityStates("ready", false)).toEqual({
      buildState: "built", evaluationState: "failed", promotionState: "provisional"
    });
  });

  it("promotes only a ready state backed by a valid evaluator artifact", () => {
    expect(projectPostQualityStates("verified", true)).toEqual({
      buildState: "built", evaluationState: "verified", promotionState: "wiki_eligible"
    });
  });

  it("labels current Reviewer results without presenting them as legacy verification", () => {
    const built = projectPostQualityStates("built_unevaluated", false);
    expect(readerStatusLabel("provisional", built, { reviewStatus: "completed_no_findings", candidateStatus: "original_reviewed" }))
      .toBe("Reviewer 已完成·无意见");
    expect(readerStatusLabel("provisional", built, { reviewStatus: "completed_with_findings", candidateStatus: "revised_unverified" }))
      .toBe("已按意见修订·未再次独立复核");
    expect(readerStatusLabel("provisional", built, { reviewStatus: "failed", candidateStatus: "review_incomplete" }))
      .toBe("Reviewer 技术失败·待处理");
    expect(readerStatusLabel("provisional", built)).toBe("分析已生成 · 尚未独立评估");
  });
});
