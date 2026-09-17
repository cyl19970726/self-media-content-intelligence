import { expect, it } from "vitest";
import { projectArtifactPayload, projectWorkflowEvent } from "./workflow-public-projection.js";

const artifact = { id: "source-check", type: "post-source-check", schemaVersion: "post-source-consistency@1" } as never;
const sha256 = "a".repeat(64);

it("allowlists SDK lifecycle model and usage without exposing runtime internals", () => {
  const started = projectWorkflowEvent({ id: "started", runId: "run", seq: 1, type: "agent.started", timestamp: "2026-09-17T00:00:00Z",
    data: { agentId: "post-reviewer", model: "gpt-5.6-luna", reasoningEffort: "medium", sdkVersion: "1.2.3",
      codexRuntimeVersion: "4.5.6", fingerprint: "private", outputDirectory: "/Users/private" } } as never);
  const completed = projectWorkflowEvent({ id: "completed", runId: "run", seq: 2, type: "agent.completed", timestamp: "2026-09-17T00:01:00Z",
    data: { threadId: "thread-123", usage: { inputTokens: 10, cachedInputTokens: 2, outputTokens: 3, reasoningOutputTokens: 1 },
      receipts: [{ path: "/Users/private" }], finalResponse: "secret" } } as never);
  expect(started).toMatchObject({ type: "agent.started", data: { agentId: "post-reviewer", model: "gpt-5.6-luna", reasoningEffort: "medium" } });
  expect(completed).toMatchObject({ type: "agent.completed", data: { threadId: "thread-123",
    usage: { inputTokens: 10, cachedInputTokens: 2, outputTokens: 3, reasoningOutputTokens: 1 } } });
  expect(JSON.stringify([started, completed])).not.toContain("private");
  expect(JSON.stringify([started, completed])).not.toContain("secret");
});

it("projects the source-check contract and omits raw fields", () => {
  const result = projectArtifactPayload(artifact, {
    schemaVersion: "post-source-consistency@1", inputSha256: sha256, verdict: "conflict", summary: "字幕与画面不一致。",
    comparisons: [{ postClaim: "原帖称已经上线", relation: "contradicts", evidenceRefs: ["/artifacts/creator/workflow-source-checks/run/attempt/post/frame-1.jpg"], reason: "画面仍显示预告。" }],
    provenance: { model: "gpt-5.6-luna", reasoningEffort: "medium", methodSha256: sha256, threadId: null },
    rawPrompt: "secret-token", absolutePath: "/Users/private/video.mp4"
  });
  expect(result).toEqual({
    kind: "post-source-check", schemaVersion: "post-source-consistency@1", inputSha256: sha256, verdict: "conflict", summary: "字幕与画面不一致。",
    comparisons: [{ postClaim: "原帖称已经上线", relation: "contradicts", evidenceRefs: ["/artifacts/creator/workflow-source-checks/run/attempt/post/frame-1.jpg"], reason: "画面仍显示预告。" }],
    provenance: { model: "gpt-5.6-luna", reasoningEffort: "medium", methodSha256: sha256, threadId: null }
  });
  expect(JSON.stringify(result)).not.toContain("secret-token");
  expect(JSON.stringify(result)).not.toContain("/Users/private");
});

it("projects v2 comparison bearings without treating a detail conflict as an identity verdict", () => {
  const result = projectArtifactPayload(artifact, {
    schemaVersion: "post-source-consistency@2", inputSha256: sha256, verdict: "consistent", summary: "来源身份一致，金额口径不同。",
    comparisons: [
      { postClaim: "原帖视频与该作者一致", bearing: "identity", relation: "supports", evidenceRefs: ["/artifacts/creator/check/identity.jpg"], reason: "画面和账号信息对应。" },
      { postClaim: "总投入 80 亿", bearing: "claim_detail", relation: "contradicts", evidenceRefs: ["/artifacts/creator/check/detail.jpg"], reason: "视频说的是 45 亿现金。" }
    ],
    provenance: { model: "gpt-5.6-luna", reasoningEffort: "medium", methodSha256: sha256, threadId: null }, rawTrace: "secret-token"
  });
  expect(result).toMatchObject({ schemaVersion: "post-source-consistency@2", verdict: "consistent", comparisons: [
    { bearing: "identity", relation: "supports" }, { bearing: "claim_detail", relation: "contradicts" }
  ] });
  expect(JSON.stringify(result)).not.toContain("secret-token");
});

it("withholds malformed or non-public source checks without claiming a verdict", () => {
  const malformed = projectArtifactPayload(artifact, { schemaVersion: "post-source-consistency@1", verdict: "consistent" });
  const unsafeEvidence = projectArtifactPayload(artifact, {
    schemaVersion: "post-source-consistency@1", inputSha256: sha256, verdict: "consistent", summary: "原始结果。",
    comparisons: [{ postClaim: "说法", relation: "supports", evidenceRefs: ["/artifacts/../private/frame.jpg"], reason: "理由" }],
    provenance: { model: "gpt-5.6-luna", reasoningEffort: "medium", methodSha256: sha256, threadId: "thread" }
  });
  expect(malformed).toEqual({ kind: "post-source-check", message: "来源检查载荷未通过公开业务合同校验；未展示未经核验的结论。" });
  expect(unsafeEvidence).toEqual({ kind: "post-source-check", message: "来源检查载荷未通过公开业务合同校验；未展示未经核验的结论。" });
});

it("projects simple research findings and strips private review fields", () => {
  const result = projectArtifactPayload({ id: "post-review", type: "post-review", schemaVersion: "research-review@1" } as never, {
    schemaVersion: "research-review@1", kind: "post",
    candidate: { id: "candidate", revision: "1", sha256 }, candidateReportSha256: sha256,
    summary: "有一处关键证据缺口。", findings: [{ id: "finding-1", location: "内容还原/结论",
      issue: "结论没有绑定画面证据。", evidenceRefs: ["frame:12"], suggestedChange: "补上对应帧引用。",
      priority: "major", kind: "missing_evidence" }], rawPrompt: "secret-token"
  });
  expect(result).toMatchObject({ kind: "research-review", subjectKind: "post", summary: "有一处关键证据缺口。",
    findings: [{ id: "finding-1", priority: "major", kind: "missing_evidence" }] });
  expect(JSON.stringify(result)).not.toContain("secret-token");
});

it("projects only the public disposition fields from research revisions", () => {
  const ref = (id: string) => ({ id, type: "post-candidate", schemaVersion: "candidate@1", revision: "1", sha256,
    uri: "/Users/private/report.json", producedBy: { workflowRunId: "run", stepRunId: "step", attemptId: "attempt" },
    dependsOn: [], validation: "valid", review: "pending" });
  const result = projectArtifactPayload({ id: "research-revision", type: "research-revision", schemaVersion: "research-revision@1" } as never, {
    schemaVersion: "research-revision@1", baseCandidate: ref("base"), review: ref("review"), candidate: ref("revised"),
    dispositions: [{ id: "finding-1", status: "changed", reason: "已补证据。", privateTrace: "secret-token" }],
    validation: { valid: true }, command: "private"
  });
  expect(result).toEqual({ kind: "research-revision", schemaVersion: "research-revision@1",
    baseCandidate: { id: "base", type: "post-candidate", revision: "1", sha256 },
    review: { id: "review", type: "post-candidate", revision: "1", sha256 },
    candidate: { id: "revised", type: "post-candidate", revision: "1", sha256 },
    dispositions: [{ id: "finding-1", status: "changed", reason: "已补证据。" }], validation: { valid: true } });
  expect(JSON.stringify(result)).not.toContain("/Users/private");
});
