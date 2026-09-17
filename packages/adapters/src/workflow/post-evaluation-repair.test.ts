import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import type { CodexSdkFactory } from "./codex-sdk-runner.js";
import { repairPostEvaluation } from "./post-evaluation-repair.js";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });
const digest = (file: string) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "post-evaluation-repair-"));
  roots.push(root);
  const candidate = path.join(root, "candidate");
  const repairs = path.join(root, "repairs");
  fs.mkdirSync(candidate, { recursive: true });
  const reconstruction = path.join(candidate, "reconstruction.json");
  const prior = path.join(root, "invalid-evaluation.json");
  fs.writeFileSync(reconstruction, '{"candidate":"fixed"}');
  fs.writeFileSync(prior, '{"relations":[{"evidenceType":"relation"}]}');
  return { root, candidate, repairs, reconstruction, prior };
}

describe("post evaluation repair", () => {
  it("uses a fresh Luna attempt, retains the invalid evaluation, and leaves a failing gate unpromoted", async () => {
    const item = fixture();
    const calls: unknown[] = [];
    const factory: CodexSdkFactory = { create: () => ({
      startThread: (options) => {
        if (!options) throw new Error("SDK thread options required");
        calls.push(options);
        return { id: "repair-thread", runStreamed: async () => {
          fs.writeFileSync(path.join(options.workingDirectory!, "evaluation.json"), '{"fixed":true}');
          async function* events() { yield { type: "turn.completed", usage: {
            input_tokens: 1, cached_input_tokens: 0, output_tokens: 1, reasoning_output_tokens: 0
          } } as never; }
          return { events: events() };
        } } as never;
      },
      resumeThread: () => { throw new Error("repair must start a fresh evaluator thread"); }
    }) };
    const before = digest(item.reconstruction);
    const result = await repairPostEvaluation({ candidateSha256: before, candidateDirectory: item.candidate,
      sourceVideoPath: "/source.mp4", invalidEvaluationPath: item.prior, validationDetails: { field: "relation" },
      source: "evaluation-schema", outputDirectory: item.repairs, signal: new AbortController().signal, sdkFactory: factory,
      validate: async (_candidate, output) => {
        fs.writeFileSync(path.join(output, "gate-report.json"), '{"ready":false,"failedGateIds":["relation"]}');
        return { ready: false, failedGateIds: ["relation"] };
      },
      buildRuntimeThreeLens: async (_candidate, output) => {
        fs.writeFileSync(path.join(output, "runtime-three-lens-evaluation.json"), "{}");
        fs.writeFileSync(path.join(output, "runtime-three-lens-gate-report.json"), "{}");
        return { ready: false, failedGateIds: ["relation"] };
      }
    });
    expect(calls).toMatchObject([{ model: "gpt-5.6-luna", modelReasoningEffort: "medium" }]);
    expect(result.state).toBe("valid");
    expect(result.route).toBe("repair_post");
    expect(fs.readFileSync(item.prior, "utf8")).toContain("relation");
    expect(fs.readFileSync(result.priorEvaluationPath!, "utf8")).toContain("relation");
    expect(digest(item.reconstruction)).toBe(before);
    expect(fs.readFileSync(path.join(result.privateTraceDirectory, "prompt.txt"), "utf8")).toContain("Repair only evaluator artifacts");
    expect(fs.readFileSync(path.join(result.privateTraceDirectory, "events.jsonl"), "utf8")).toContain("turn.completed");
  });

  it("rejects an evaluator that mutates the immutable candidate", async () => {
    const item = fixture();
    const expected = digest(item.reconstruction);
    const factory: CodexSdkFactory = { create: () => ({
      startThread: (options) => ({ id: "bad-thread", runStreamed: async () => {
        if (!options) throw new Error("SDK thread options required");
        fs.writeFileSync(item.reconstruction, "mutated");
        fs.writeFileSync(path.join(options.workingDirectory!, "evaluation.json"), "{}");
        async function* events() { yield { type: "turn.completed", usage: {
          input_tokens: 1, cached_input_tokens: 0, output_tokens: 1, reasoning_output_tokens: 0
        } } as never; }
        return { events: events() };
      } }) as never,
      resumeThread: () => { throw new Error("unexpected resume"); }
    }) };
    await expect(repairPostEvaluation({ candidateSha256: expected, candidateDirectory: item.candidate,
      sourceVideoPath: "/source.mp4", invalidEvaluationPath: item.prior, validationDetails: {}, source: "test",
      outputDirectory: item.repairs, signal: new AbortController().signal, sdkFactory: factory,
      validate: async () => ({ ready: true }), buildRuntimeThreeLens: async () => ({ ready: true })
    })).rejects.toThrow("POST_EVALUATION_REPAIR_MUTATED_CANDIDATE");
  });
});
