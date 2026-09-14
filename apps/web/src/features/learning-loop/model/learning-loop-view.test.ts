import { describe, expect, it } from "vitest";
import type { LearningLoopRun } from "../../../shared/contracts/core";
import { deriveLearningLoopSummary, learningLoopStatusCopy as statusCopy } from "./learning-loop-view.js";

function productBlindRun(): LearningLoopRun {
  return {
    status: "repair_queued",
    policyVersion: "product-blind/v1",
    gates: [{ pass: false }],
    blindTraces: [{ pass: false }]
  } as LearningLoopRun;
}

describe("learning loop non-technical view model", () => {
  it("shows a product-blind failure as repair work and never as promoted research", () => {
    const run = productBlindRun();
    const summary = deriveLearningLoopSummary(run);
    expect(statusCopy[run.status].label).toBe("等待修复回归");
    expect(summary.failedGateCount).toBe(1);
    expect(summary.blindTaskPassed).toBe(false);
    expect(summary.blindTestLabel).toBe("未完成闭环");
    expect(summary.researchPromotionLabel).toBe("禁止晋升");
  });

  it("does not call a draft with zero blind traces passed", () => {
    const summary = deriveLearningLoopSummary({ ...productBlindRun(), status: "draft", gates: [], blindTraces: [] });
    expect(summary.blindTaskPassed).toBe(false);
    expect(summary.blindTestLabel).toBe("待执行");
  });
});
