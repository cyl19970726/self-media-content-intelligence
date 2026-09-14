import { describe, expect, it } from "vitest";
import { creatorRecoveryPresentation } from "./creator-recovery";

describe("creator recovery presentation", () => {
  it("offers an explicit manual resume when the external provider has recovered", () => {
    const run = { status: "failed", videoWork: { analyzedPosts: 3 } } as never;
    const operation = { action: "none", actionLabel: null, resolutionState: "waiting_external" } as never;
    expect(creatorRecoveryPresentation(run, operation)).toEqual({
      action: "resume",
      label: "采集服务已恢复，继续",
      help: "只在采集服务连接或配置已经修复后点击；继续会重新请求采集，并复用已有证据。"
    });
  });

  it("does not invent an action for other terminal none operations", () => {
    const run = { status: "failed", videoWork: { analyzedPosts: 0 } } as never;
    const operation = { action: "none", actionLabel: null, resolutionState: "failed_terminal" } as never;
    expect(creatorRecoveryPresentation(run, operation)).toBeNull();
  });
});
