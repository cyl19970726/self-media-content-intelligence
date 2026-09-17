import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { Input, ThreadEvent, ThreadOptions, TurnOptions } from "@openai/codex-sdk";
import { CodexSdkRunner, invokeCodexSdk, type CodexSdkFactory } from "./codex-sdk-runner.js";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });

function temporaryRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "codex-sdk-runner-"));
  roots.push(root);
  return root;
}

function definition(config: Record<string, unknown>) {
  return {
    id: "post-builder", revision: "v1", model: "gpt-5.6-terra", reasoningEffort: "medium",
    promptRevision: "prompt-v1", skillsRevision: "skills-v1", permissionsRevision: "permissions-v1", config
  };
}

function request(config: Record<string, unknown>, signal = new AbortController().signal) {
  return {
    runId: "run-1", stepRunId: "step-1", attemptId: "attempt-1", definition: definition(config), input: { source: "frozen" }, signal,
    emit: async () => undefined
  };
}

describe("CodexSdkRunner", () => {
  it("attaches ordered local images to a low-level SDK turn", async () => {
    let received: Input | undefined;
    async function* events() { yield ({ type: "item.completed", item: { id: "m1", type: "agent_message", text: "{}" } } as ThreadEvent); }
    const factory: CodexSdkFactory = { create: () => ({ startThread: () => ({ id: "thread", runStreamed: async (input: Input) => {
      received = input; return { events: events() };
    } }), resumeThread: () => { throw new Error("unexpected resume"); } }) as never };
    await invokeCodexSdk(factory, { prompt: "inspect", imagePaths: ["/safe/a.jpg", "/safe/b.jpg"], outputDir: temporaryRoot(),
      role: "source", model: "gpt-5.6-luna", reasoningEffort: "medium", signal: new AbortController().signal });
    expect(received).toEqual([{ type: "text", text: "inspect" }, { type: "local_image", path: "/safe/a.jpg" },
      { type: "local_image", path: "/safe/b.jpg" }]);
  });
  it("records private snapshots, explicit model settings, streamed events, and observed receipts", async () => {
    const root = temporaryRoot();
    const output = path.join(root, "output");
    fs.mkdirSync(output);
    fs.writeFileSync(path.join(output, "report.json"), '{"saved":true}');
    const calls: unknown[] = [];
    const event: ThreadEvent = { type: "turn.completed", usage: {
      input_tokens: 11, cached_input_tokens: 2, cache_write_input_tokens: 0, output_tokens: 7, reasoning_output_tokens: 3
    } };
    async function* events() {
      yield event;
      yield ({ type: "item.completed", item: { id: "m1", type: "agent_message", text: '{"ok":true}' } } as ThreadEvent);
    }
    const thread = { id: "thread-1", runStreamed: async () => ({ events: events() }) };
    const factory: CodexSdkFactory = { create: () => ({
      startThread: (options: ThreadOptions) => { calls.push(options); return thread; },
      resumeThread: () => { throw new Error("unexpected resume"); }
    }) as never };
    const runner = new CodexSdkRunner(factory, path.join(root, "private-traces"));
    const result = await runner.run<{ source: string }, { ok: boolean }>(request({ prompt: "build", outputDirectory: output, receiptFiles: ["report.json"] }));

    expect(result.output).toEqual({ ok: true });
    expect(calls).toMatchObject([{ model: "gpt-5.6-terra", modelReasoningEffort: "medium", workingDirectory: output }]);
    const trace = path.join(root, "private-traces", "run-1", "step-1", "attempt-1");
    expect(fs.statSync(trace).mode & 0o777).toBe(0o700);
    expect(JSON.parse(fs.readFileSync(path.join(trace, "runtime.json"), "utf8"))).toMatchObject({ sdkVersion: "0.154.0" });
    expect(JSON.parse(fs.readFileSync(path.join(trace, "runtime.json"), "utf8")).codexRuntimeVersion).toMatch(/^(codex-cli 0\.154\.0|unknown)$/);
    expect(fs.readFileSync(path.join(trace, "events.jsonl"), "utf8")).toContain("turn.completed");
    expect(JSON.parse(fs.readFileSync(path.join(trace, "output-files.json"), "utf8"))).toMatchObject([{ path: "report.json", state: "present" }]);
    expect(result.metadata).toMatchObject({ receiptValidation: "observed_only_workflow_validate_must_enforce_business_contract" });
  });

  it("only resumes when explicitly requested with matching role and full fingerprint", async () => {
    const root = temporaryRoot();
    let resumed = false;
    async function* events() { yield ({ type: "item.completed", item: { id: "m1", type: "agent_message", text: "{}" } } as ThreadEvent); }
    const fresh = { id: "new", runStreamed: async () => ({ events: events() }) };
    const old = { id: "old", runStreamed: async () => ({ events: events() }) };
    const factory: CodexSdkFactory = { create: () => ({
      startThread: () => fresh,
      resumeThread: () => { resumed = true; return old; }
    }) as never };
    const runner = new CodexSdkRunner(factory, path.join(root, "traces"));
    await expect(runner.run(request({ prompt: "build", resume: { requested: true, threadId: "thread-old", role: "post-builder", fingerprint: "wrong" } })))
      .rejects.toThrow("CODEX_SDK_RESUME_FINGERPRINT_MISMATCH");
    expect(resumed).toBe(false);
  });

  it("passes a timeout-created abort signal to the actual streamed SDK turn", async () => {
    const root = temporaryRoot();
    let receivedSignal: AbortSignal | undefined;
    const factory: CodexSdkFactory = { create: () => ({ startThread: () => ({ id: "thread", runStreamed: async (_input: Input, options?: TurnOptions) => {
      receivedSignal = options?.signal;
      return { events: (async function* () {
        await new Promise<void>((resolve) => receivedSignal?.addEventListener("abort", () => resolve(), { once: true }));
        throw receivedSignal?.reason;
        yield ({ type: "turn.started" } as ThreadEvent);
      })() };
    } }), resumeThread: () => { throw new Error("unexpected resume"); } }) as never };
    const runner = new CodexSdkRunner(factory, path.join(root, "traces"));
    await expect(runner.run(request({ prompt: "build", timeoutMs: 1 }))).rejects.toThrow("CODEX_SDK_TIMEOUT");
    expect(receivedSignal?.aborted).toBe(true);
  });

  it("treats SDK turn failures as failures even when a stream ends cleanly", async () => {
    const root = temporaryRoot();
    async function* events() { yield ({ type: "turn.failed", error: { message: "denied" } } as ThreadEvent); }
    const factory: CodexSdkFactory = { create: () => ({
      startThread: () => ({ id: "thread", runStreamed: async () => ({ events: events() }) }),
      resumeThread: () => { throw new Error("unexpected resume"); }
    }) as never };
    const runner = new CodexSdkRunner(factory, path.join(root, "traces"));
    await expect(runner.run(request({ prompt: "build" }))).rejects.toThrow("CODEX_SDK_TURN_FAILED:denied");
  });
});
