import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createDurableLearningLoopControlPlane, seedInitialProductBlindAudit } from "../server/learning-loop.js";
import { deriveLearningLoopSummary, learningLoopStatusCopy as statusCopy } from "./learning-loop-view.js";

describe("learning loop non-technical view model", () => {
  it("shows a product-blind failure as repair work and never as promoted research", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "learning-loop-view-"));
    const control = createDurableLearningLoopControlPlane(path.join(directory, "loop.sqlite"));
    try {
      const run = seedInitialProductBlindAudit(control);
      const summary = deriveLearningLoopSummary(run);
      expect(statusCopy[run.status].label).toBe("等待修复回归");
      expect(summary.failedGateCount).toBe(1);
      expect(summary.blindTaskPassed).toBe(false);
      expect(summary.blindTestLabel).toBe("未完成闭环");
      expect(summary.researchPromotionLabel).toBe("禁止晋升");
    } finally {
      control.close();
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });

  it("does not call a draft with zero blind traces passed", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "learning-loop-view-draft-"));
    const control = createDurableLearningLoopControlPlane(path.join(directory, "loop.sqlite"));
    try {
      const run = seedInitialProductBlindAudit(control);
      const summary = deriveLearningLoopSummary({ ...run, status: "draft", gates: [], blindTraces: [] });
      expect(summary.blindTaskPassed).toBe(false);
      expect(summary.blindTestLabel).toBe("待执行");
    } finally {
      control.close();
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
