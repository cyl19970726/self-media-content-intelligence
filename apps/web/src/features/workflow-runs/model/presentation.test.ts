import { expect, it } from "vitest";
import { artifactLabel, attemptPresentation, emptyArtifactMessage, eventSummary, isKnownArtifactType, stepCanRetry, stepLabel, workflowStateLabel } from "./presentation";

it("keeps execution completion distinct from research review", () => {
  expect(workflowStateLabel("succeeded")).toBe("执行完成");
  expect(workflowStateLabel("waiting")).toBe("等待子流程");
  expect(workflowStateLabel("needs_review")).toBe("待处理");
  expect(artifactLabel({ type: "post-candidate", schemaVersion: "1", review: "pending", validation: "valid" } as never)).toContain("结构校验通过");
expect(artifactLabel({ type: "post-candidate", schemaVersion: "1", review: "passed", validation: "valid" } as never)).toContain("研究复核通过");
  expect(artifactLabel({ type: "post-review", schemaVersion: "research-review@1", review: "passed", validation: "valid" } as never)).toContain("审阅完成 · 无意见");
  expect(artifactLabel({ type: "creator-review", schemaVersion: "research-review@1", review: "findings", validation: "valid" } as never)).toContain("审阅完成 · 有意见");
  expect(artifactLabel({ type: "research-revision", schemaVersion: "research-revision@1", review: "findings", validation: "valid" } as never)).toContain("已修订 · 尚未再次独立审阅");
  const sourceCheckLabel = artifactLabel({ type: "post-source-check", schemaVersion: "post-source-consistency@1", review: "passed", validation: "valid" } as never);
  expect(sourceCheckLabel).toContain("单帖来源检查");
  expect(sourceCheckLabel).toContain("来源核对结果");
  expect(sourceCheckLabel).not.toContain("研究复核通过");
  expect(isKnownArtifactType("post-source-check")).toBe(true);
});

it("summarizes trace events without exposing their raw payload", () => {
  expect(eventSummary({ type: "decision_recorded", data: { decision: "repair_evaluation", trace: { secret: "raw" } } } as never)).toBe("repair_evaluation");
});

it("names lifecycle, delegation and copied-candidate events without promoting planned work", () => {
  expect(eventSummary({ type: "agent.lifecycle", data: { role: "candidate", status: "progress", childRunId: "child-1" } } as never)).toBe("构建候选报告：处理中 · 子执行 child-1");
  expect(eventSummary({ type: "agent.delegate", data: { role: "generic_evaluator", model: "gpt-5.6-luna" } } as never)).toContain("不代表已完成");
  expect(eventSummary({ type: "agent.started", data: { agentId: "post-reviewer", model: "gpt-5.6-luna" } } as never)).toBe("独立评估已启动 · gpt-5.6-luna");
  expect(eventSummary({ type: "candidate.copied", data: { reason: "targeted_repair" } } as never)).toContain("定向修订");
  expect(stepLabel("review:0")).toBe("独立评估（第 1 轮）");
  expect(stepLabel("build")).toBe("构建候选");
  expect(stepLabel("repair-evaluation:1")).toBe("定向修复评估第 2 轮");
  expect(stepLabel("candidate-check")).toBe("候选结构校验");
  expect(stepLabel("register-version")).toBe("登记工作台版本");
  expect(stepLabel("route:1")).toBe("决定后续步骤");
});

it("directs a parent run to its child assets when it has no assets of its own", () => {
  expect(emptyArtifactMessage(2)).toBe("成果保存在上述子流程中；打开构建或复核子流程查看对应资产。");
  expect(emptyArtifactMessage(0)).toBe("这个运行尚未登记输出资产。");
});

it("shows recorded usage and leaves absent usage unknown", () => {
  const attempt = { id: "a", state: "running" } as never;
  expect(attemptPresentation(attempt, [
    { id: "delegate", attemptId: "a", type: "agent.delegate", data: { model: "gpt-5.6-terra" } },
    { id: "usage-a-old", attemptId: "a", type: "agent.usage", data: { childRunId: "child-a", model: "gpt-5.6-terra", usage: { inputTokens: 1, cachedInputTokens: 2, outputTokens: 3, reasoningOutputTokens: 4 } } },
    { id: "usage-a", attemptId: "a", type: "agent.usage", data: { childRunId: "child-a", model: "gpt-5.6-terra", usage: { inputTokens: 10, cachedInputTokens: 1, outputTokens: 2, reasoningOutputTokens: null } } },
    { id: "usage-b", attemptId: "a", type: "agent.usage", data: { childRunId: "child-b", model: "gpt-5.6-luna", usage: { inputTokens: 20, cachedInputTokens: null, outputTokens: 4, reasoningOutputTokens: 7 } } },
  ] as never)).toMatchObject({ model: "计划模型：gpt-5.6-terra", actualModel: "实际模型：gpt-5.6-terra、gpt-5.6-luna", usage: "用量：输入 30，缓存 1（部分未记录），输出 6，推理 7（部分未记录）" });
  expect(attemptPresentation(attempt, []).usage).toBe("用量未记录");
  expect(attemptPresentation(attempt, [
    { id: "started", attemptId: "a", type: "agent.started", data: { agentId: "post-reviewer", model: "gpt-5.6-luna" } },
    { id: "completed", attemptId: "a", type: "agent.completed", data: { threadId: "thread-a", usage: { inputTokens: 8, cachedInputTokens: 2, outputTokens: 3, reasoningOutputTokens: 1 } } },
  ] as never)).toMatchObject({ model: "计划模型：gpt-5.6-luna", actualModel: "实际模型：gpt-5.6-luna", usage: "用量：输入 8，缓存 2，输出 3，推理 1" });
});

it("only offers a retry the queue service can accept", () => {
  expect(stepCanRetry("failed", { state: "failed", validation: "pending" })).toBe(true);
  expect(stepCanRetry("needs_review", { state: "succeeded", validation: "invalid" })).toBe(true);
  expect(stepCanRetry("blocked", { state: "failed", validation: "pending" })).toBe(false);
});
