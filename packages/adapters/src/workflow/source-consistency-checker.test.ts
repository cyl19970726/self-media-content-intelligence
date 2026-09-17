import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { artifactRef, writeArtifact } from "../core/artifacts.js";
import { runArtifactDir, runtimeDir } from "../core/config.js";
import type { InvokeCodexSdkRequest } from "./codex-sdk-runner.js";
import type { PinnedResearchInput } from "./research-inputs.js";
import { runSourceConsistencyCheck } from "./source-consistency-checker.js";
import type { AgentRunRequest } from "../../../workflow/index.js";

const creatorRunId = "11111111-1111-4111-8111-111111111111";
const workflowRunId = "22222222-2222-4222-8222-222222222222";
const postExternalId = "post-1";
const previousRuntime = process.env.SELF_MEDIA_RUNTIME_DIR;
let temporaryRoot: string;
let pinned: PinnedResearchInput;

type Invoke = NonNullable<Parameters<typeof runSourceConsistencyCheck>[2]>["invoke"];

function request(attemptId = crypto.randomUUID(), emit: AgentRunRequest<unknown>["emit"] = async () => undefined): AgentRunRequest<unknown> {
  return {
    runId: workflowRunId,
    stepRunId: "33333333-3333-4333-8333-333333333333",
    attemptId,
    definition: { id: "source-check", revision: "1", model: "gpt-5.6-luna", reasoningEffort: "medium",
      promptRevision: "1", skillsRevision: "1", permissionsRevision: "1" },
    input: {},
    signal: new AbortController().signal,
    emit
  };
}

function outputDirectory(attemptId: string): string {
  return path.join(runArtifactDir(creatorRunId), "workflow-source-checks", workflowRunId, attemptId, postExternalId);
}

function modelResponse(_invocation: InvokeCodexSdkRequest, overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schemaVersion: "post-source-consistency@2",
    verdict: "consistent",
    summary: "标题与抽帧中的产品主体一致。",
    comparisons: [{ postClaim: "帖子介绍同一产品", bearing: "identity", relation: "supports", evidenceRefs: ["frames/sample-1.jpg"],
      reason: "抽帧显示同一可见主体。" }],
    ...overrides
  });
}

function sequenceInvoke(responses: Array<Record<string, unknown>>): { invoke: Invoke; calls: InvokeCodexSdkRequest[] } {
  const calls: InvokeCodexSdkRequest[] = [];
  const invoke: Invoke = async (_factory, invocation) => {
    const index = calls.length;
    calls.push(invocation);
    invocation.observer?.({ type: "item.completed", item: { id: `message-${index + 1}`, type: "agent_message", text: "done" } });
    return { threadId: `source-thread-round-${index + 1}`, finalResponse: modelResponse(invocation, responses[index] ?? {}),
      usage: { inputTokens: 10 + index, cachedInputTokens: 2, outputTokens: 5, reasoningOutputTokens: 1 } };
  };
  return { invoke, calls };
}

function fakeInvoke(action?: (invocation: InvokeCodexSdkRequest) => void, overrides: Record<string, unknown> = {}): Invoke {
  return async (_factory, invocation) => {
    action?.(invocation);
    invocation.observer?.({ type: "item.completed", item: { id: "message-1", type: "agent_message", text: "done" } });
    return { threadId: "44444444-4444-4444-8444-444444444444", finalResponse: modelResponse(invocation, overrides),
      usage: { inputTokens: 10, cachedInputTokens: 2, outputTokens: 5, reasoningOutputTokens: 1 } };
  };
}

function assertEnumAndConstNodesDeclareType(value: unknown, location = "$"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertEnumAndConstNodesDeclareType(item, `${location}[${index}]`));
    return;
  }
  if (value === null || typeof value !== "object") return;
  const node = value as Record<string, unknown>;
  if (("enum" in node || "const" in node) && typeof node.type !== "string") {
    throw new Error(`schema node ${location} uses enum/const without an explicit type`);
  }
  for (const [key, child] of Object.entries(node)) {
    assertEnumAndConstNodesDeclareType(child, `${location}.${key}`);
  }
}

beforeEach(() => {
  temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "source-consistency-checker-"));
  process.env.SELF_MEDIA_RUNTIME_DIR = temporaryRoot;
  const sourcePath = path.join(runArtifactDir(creatorRunId), "source.mp4");
  fs.mkdirSync(path.dirname(sourcePath), { recursive: true });
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i",
    "color=c=blue:s=64x64:d=15", "-pix_fmt", "yuv420p", sourcePath]);
  const detailArtifactRef = writeArtifact(creatorRunId, "details.json", { posts: [{ externalId: postExternalId,
    inspectedAt: "2026-09-16T00:00:00.000Z", title: "蓝色产品演示", description: "展示同一产品。", mediaType: "video", imageCount: 0 }] });
  const mediaManifestArtifactRef = writeArtifact(creatorRunId, "media.json", { items: [{ externalId: postExternalId,
    coverState: "missing", coverArtifactRef: null }] });
  const selectionArtifactRef = writeArtifact(creatorRunId, "selection.json", { items: [{ externalId: postExternalId,
    title: "蓝色产品演示", likes: 1, collections: 0, comments: 0, shares: 0 }] });
  const reconstructionBatchArtifactRef = writeArtifact(creatorRunId, "batch.json", { items: [] });
  pinned = { kind: "post", source: { creatorRunId, postExternalId, sourceUrl: "https://example.com/post-1",
    sourceMediaArtifactRef: artifactRef(creatorRunId, "source.mp4"), detailArtifactRef, mediaManifestArtifactRef,
    selectionArtifactRef, reconstructionBatchArtifactRef }, files: [], methods: [] };
});

afterEach(() => {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
  if (previousRuntime === undefined) delete process.env.SELF_MEDIA_RUNTIME_DIR;
  else process.env.SELF_MEDIA_RUNTIME_DIR = previousRuntime;
});

describe("runSourceConsistencyCheck", () => {
  it("overwrites a model-supplied input hash with the Host-authoritative revision", async () => {
    const attemptId = crypto.randomUUID();
    const result = await runSourceConsistencyCheck(request(attemptId), pinned, { invoke: fakeInvoke(undefined, {
      inputSha256: "0".repeat(64)
    }) });
    const frozenInput = JSON.parse(fs.readFileSync(path.join(outputDirectory(attemptId),
      "source-consistency-input-round-1.json"), "utf8")) as { inputSha256: string };
    expect(result.artifact.inputSha256).toBe(frozenInput.inputSha256);
    expect(result.artifact.inputSha256).not.toBe("0".repeat(64));
  });

  it("rejects evidence references outside the frozen input", async () => {
    await expect(runSourceConsistencyCheck(request(), pinned, { invoke: fakeInvoke(undefined, {
      comparisons: [{ postClaim: "未知证据", bearing: "identity", relation: "supports", evidenceRefs: ["frames/invented.jpg"], reason: "不存在" }]
    }) })).rejects.toThrow("SOURCE_CONSISTENCY_EVIDENCE_REF_INVALID");
  });

  it.each([
    ["frozen source facts", (invocation: InvokeCodexSdkRequest) => fs.appendFileSync(path.join(invocation.outputDir, "post-source-input.json"), " ")],
    ["source video", () => fs.appendFileSync(path.join(runArtifactDir(creatorRunId), "source.mp4"), "mutated")]
  ])("rejects model-side mutation of %s", async (_label, mutate) => {
    await expect(runSourceConsistencyCheck(request(), pinned, { invoke: fakeInvoke(mutate) }))
      .rejects.toThrow("SOURCE_CONSISTENCY_INPUT_MUTATED");
  });

  it.each(["consistent", "conflict"])("requires a cited frame for a %s verdict", async (verdict) => {
    await expect(runSourceConsistencyCheck(request(), pinned, { invoke: fakeInvoke(undefined, {
      verdict,
      comparisons: [{ postClaim: "帖子身份", bearing: "identity", relation: verdict === "conflict" ? "contradicts" : "supports",
        evidenceRefs: ["post-source-input.json"], reason: "只引用元数据。" }]
    }) })).rejects.toThrow("SOURCE_CONSISTENCY_IMAGE_INSPECTION_MISSING");
  });

  it("rejects a consistent verdict that cites contradictory visual evidence", async () => {
    await expect(runSourceConsistencyCheck(request(), pinned, { invoke: fakeInvoke(undefined, {
      verdict: "consistent",
      comparisons: [{ postClaim: "帖子身份", bearing: "identity", relation: "contradicts", evidenceRefs: ["frames/sample-1.jpg"],
        reason: "抽帧与帖子身份冲突。" }]
    }) })).rejects.toThrow("consistent requires identity support and forbids identity contradiction");
  });

  it("rejects a conflict verdict when every visual comparison supports the source", async () => {
    await expect(runSourceConsistencyCheck(request(), pinned, { invoke: fakeInvoke(undefined, {
      verdict: "conflict",
      comparisons: [{ postClaim: "帖子身份", bearing: "identity", relation: "supports", evidenceRefs: ["frames/sample-1.jpg"],
        reason: "抽帧支持帖子身份。" }]
    }) })).rejects.toThrow("conflict requires identity contradiction");
  });

  it("accepts a first-round consistent result without requesting supplemental evidence", async () => {
    const mock = sequenceInvoke([{}]);
    const result = await runSourceConsistencyCheck(request(), pinned, { invoke: mock.invoke });
    expect(result.artifact.verdict).toBe("consistent");
    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0]?.imagePaths).toHaveLength(4);
  });

  it.each(["conflict", "uncertain"])("supplements a first-round %s result without anchoring the second round", async (verdict) => {
    const first = verdict === "conflict" ? {
      verdict,
      comparisons: [{ postClaim: "来源身份", bearing: "identity", relation: "contradicts",
        evidenceRefs: ["frames/sample-1.jpg"], reason: "首轮判断身份冲突。" }]
    } : {
      verdict,
      comparisons: [{ postClaim: "来源身份", bearing: "identity", relation: "insufficient",
        evidenceRefs: ["frames/sample-1.jpg"], reason: "首轮证据不足。" }]
    };
    const second = { verdict: "consistent", summary: "补证确认来源身份一致，但一处细节不符。",
      comparisons: [
        { postClaim: "来源身份", bearing: "identity", relation: "supports", evidenceRefs: ["contact-sheets/sheet-1.jpg"], reason: "连续帧支持身份。" },
        { postClaim: "型号细节", bearing: "claim_detail", relation: "contradicts", evidenceRefs: ["context/ctx-01.jpg"], reason: "细节与文案不符。" }
      ] };
    const mock = sequenceInvoke([first, second]);
    const attemptId = crypto.randomUUID();
    const result = await runSourceConsistencyCheck(request(attemptId), pinned, { invoke: mock.invoke });
    expect(mock.calls).toHaveLength(2);
    expect(mock.calls[1]?.imagePaths?.length).toBeGreaterThanOrEqual(1);
    expect(mock.calls[1]?.imagePaths?.length).toBeLessThanOrEqual(2);
    expect(mock.calls[1]?.imagePaths?.[0]).toContain("contact-sheets/sheet-1.jpg");
    expect(result.artifact).toMatchObject({ schemaVersion: "post-source-consistency@2", verdict: "consistent" });
    const secondInput = JSON.parse(fs.readFileSync(path.join(outputDirectory(attemptId),
      "source-consistency-input-round-2.json"), "utf8")) as { priorRound?: unknown;
        sourceMediaSha256: string; evidence: Array<{ ref: string }> };
    const firstInput = JSON.parse(fs.readFileSync(path.join(outputDirectory(attemptId),
      "source-consistency-input-round-1.json"), "utf8")) as { sourceMediaSha256: string };
    expect(secondInput).not.toHaveProperty("priorRound");
    expect(secondInput.evidence.some((item) => item.ref.startsWith("frames/"))).toBe(false);
    expect(secondInput.sourceMediaSha256).toBe(firstInput.sourceMediaSha256);
    expect(secondInput.evidence.some((item) => item.ref === "context/ctx-01.jpg")).toBe(true);
    const privateRoot = path.join(runtimeDir(), "source-check-traces", workflowRunId,
      "33333333-3333-4333-8333-333333333333", attemptId);
    const firstResult = JSON.parse(fs.readFileSync(path.join(privateRoot, "round-1/result.json"), "utf8")) as {
      artifact: { verdict: string };
    };
    expect(firstResult.artifact.verdict).toBe(verdict);
    expect(fs.existsSync(path.join(privateRoot, "round-2/result.json"))).toBe(true);
  });

  it("supplements a consistent identity result when claim details contradict, then keeps the distinction", async () => {
    const first = { verdict: "consistent", summary: "身份一致但细节冲突。", comparisons: [
      { postClaim: "来源身份", bearing: "identity", relation: "supports", evidenceRefs: ["frames/sample-1.jpg"], reason: "主体一致。" },
      { postClaim: "功能细节", bearing: "claim_detail", relation: "contradicts", evidenceRefs: ["frames/sample-2.jpg"], reason: "细节不符。" }
    ] };
    const second = { ...first, comparisons: [
      { ...first.comparisons[0], evidenceRefs: ["contact-sheets/sheet-1.jpg"] },
      { ...first.comparisons[1], evidenceRefs: ["context/ctx-01.jpg"] }
    ] };
    const mock = sequenceInvoke([first, second]);
    const result = await runSourceConsistencyCheck(request(), pinned, { invoke: mock.invoke });
    expect(mock.calls).toHaveLength(2);
    expect(result.artifact.verdict).toBe("consistent");
    expect(result.artifact.comparisons).toEqual(expect.arrayContaining([
      expect.objectContaining({ bearing: "claim_detail", relation: "contradicts" })
    ]));
  });

  it("fails closed as uncertain when supplemental evidence cannot be generated", async () => {
    const previousPath = process.env.PATH;
    const invoke = fakeInvoke(() => { process.env.PATH = "/nonexistent"; }, {
      verdict: "uncertain", comparisons: [{ postClaim: "来源身份", bearing: "identity", relation: "insufficient",
        evidenceRefs: ["frames/sample-1.jpg"], reason: "需要上下文。" }]
    });
    try {
      const result = await runSourceConsistencyCheck(request(), pinned, { invoke });
      expect(result.artifact).toMatchObject({ verdict: "uncertain", summary: "补充上下文证据生成失败，无法确认来源一致性。" });
    } finally {
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
    }
  });

  it("keeps an identity conflict after the bounded second round and emits separately attributable usage", async () => {
    const conflict = { verdict: "conflict", summary: "来源身份冲突。", comparisons: [
      { postClaim: "来源身份", bearing: "identity", relation: "contradicts", evidenceRefs: ["frames/sample-1.jpg"], reason: "主体不同。" }
    ] };
    const secondConflict = { ...conflict, comparisons: [
      { ...conflict.comparisons[0], evidenceRefs: ["contact-sheets/sheet-1.jpg"] }
    ] };
    const mock = sequenceInvoke([conflict, secondConflict]);
    const events: Array<{ type: string; data: unknown }> = [];
    const result = await runSourceConsistencyCheck(request(crypto.randomUUID(), async (type, data) => {
      events.push({ type, data });
    }), pinned, { invoke: mock.invoke });
    expect(result.artifact.verdict).toBe("conflict");
    expect(mock.calls).toHaveLength(2);
    expect(events).toHaveLength(2);
    expect(events.map((event) => (event.data as { childRunId: string }).childRunId))
      .toEqual(["source-thread-round-1", "source-thread-round-2"]);
    expect(events.map((event) => (event.data as { usage: { inputTokens: number } }).usage.inputTokens))
      .toEqual([10, 11]);
  });

  it("declares a type on every enum and const node in the SDK output schema", async () => {
    let outputSchema: unknown;
    await runSourceConsistencyCheck(request(), pinned, { invoke: fakeInvoke((invocation) => {
      outputSchema = invocation.outputSchema;
    }) });

    expect(outputSchema).toBeDefined();
    assertEnumAndConstNodesDeclareType(outputSchema);
  });

  it("returns uncertain without invoking the SDK when no frame can be extracted", async () => {
    fs.writeFileSync(path.join(runArtifactDir(creatorRunId), "source.mp4"), "not-a-video");
    let invoked = false;
    const events: Array<{ type: string; data: unknown }> = [];
    const result = await runSourceConsistencyCheck(request(crypto.randomUUID(), async (type, data) => {
      events.push({ type, data });
    }), pinned, { invoke: fakeInvoke(() => { invoked = true; }) });
    expect(invoked).toBe(false);
    expect(events).toEqual([]);
    expect(result.artifact).toMatchObject({ verdict: "uncertain", provenance: { threadId: null } });
    expect(result.artifact.comparisons[0]?.evidenceRefs[0]).toMatch(/^\/artifacts\//u);
  });

  it("attaches extracted images to the SDK input and keeps raw traces outside public artifacts", async () => {
    const attemptId = crypto.randomUUID();
    let captured: InvokeCodexSdkRequest | null = null;
    const events: Array<{ type: string; data: unknown }> = [];
    const result = await runSourceConsistencyCheck(request(attemptId, async (type, data) => {
      events.push({ type, data });
    }), pinned, { invoke: fakeInvoke((invocation) => {
      captured = invocation;
      expect(invocation.imagePaths).toHaveLength(4);
      for (const image of invocation.imagePaths ?? []) {
        expect(path.isAbsolute(image)).toBe(true);
        expect(fs.readFileSync(image).subarray(0, 2).toString("hex")).toBe("ffd8");
      }
    }) });

    expect(captured).not.toBeNull();
    expect(result.artifact.verdict).toBe("consistent");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "agent.usage", data: {
      childRunId: "44444444-4444-4444-8444-444444444444", model: "gpt-5.6-luna", reasoningEffort: "medium",
      usage: { inputTokens: 10, cachedInputTokens: 2, outputTokens: 5, reasoningOutputTokens: 1 }
    } });
    expect(JSON.stringify(result)).not.toContain("source-check-traces");
    expect(JSON.stringify(result)).not.toContain("sdk-events.jsonl");
    expect(fs.existsSync(path.join(outputDirectory(attemptId), "sdk-events.jsonl"))).toBe(false);
    const privateTrace = path.join(runtimeDir(), "source-check-traces", workflowRunId,
      "33333333-3333-4333-8333-333333333333", attemptId, "round-1/sdk-events.jsonl");
    expect(fs.existsSync(privateTrace)).toBe(true);
    expect(result.artifact.comparisons[0]?.evidenceRefs[0]).toMatch(/^\/artifacts\//u);
  });
});
