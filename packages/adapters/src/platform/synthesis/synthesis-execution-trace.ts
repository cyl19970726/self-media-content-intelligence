import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { runtimeDir } from "../../core/config.js";

type TraceRuntime = {
  creatorRunId: string;
  childRunId: string;
  role: string;
  label: string;
  command: string;
  args: string[];
  inputRevision: string;
  startedAt: string;
  model: string;
  reasoningEffort: string;
  sessionMode: "ephemeral" | "retained";
  executionMode?: "cli" | "sdk";
  sdkVersion?: string;
  codexRuntimeVersion?: string;
  prompt: string;
  extra?: Record<string, unknown>;
};

export type SynthesisExecutionTrace = {
  traceDir: string;
  append(stream: "stdout" | "stderr", chunk: string): void;
  snapshotOutputs(): void;
  complete(completedAt: string): void;
  fail(completedAt: string, error: unknown): void;
};

export type TraceOutput = { name: string; sourcePath: string };

function sha256IfFile(file: string): string | null {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return null;
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function safeError(error: unknown): Record<string, string | null> {
  if (!(error instanceof Error)) return { name: "UnknownError", code: null, message: "unknown runner failure" };
  const code = "code" in error && typeof error.code === "string" ? error.code : null;
  // Process errors can include URLs or command output. Apply limited redaction
  // and bound the diagnostic; raw environments are never recorded here.
  const message = error.message
    .replace(/:\/\/[^\s/@]+:[^\s/@]+@/g, "://[redacted]@")
    .replace(/\b([A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|KEY))=\S+/g, "$1=[redacted]")
    .slice(0, 1_000);
  return { name: error.name, code, message };
}

/**
 * Private, local process evidence for a single Codex child. It deliberately
 * lives outside the artifact store: traces are useful for operator review but
 * are neither public research artifacts nor evidence citations.
 */
export function startSynthesisExecutionTrace(runtime: TraceRuntime, outputs: TraceOutput[]): SynthesisExecutionTrace {
  const traceDir = path.join(runtimeDir(), "executor-traces", "creator-synthesis", runtime.creatorRunId, runtime.childRunId);
  fs.mkdirSync(path.dirname(traceDir), { recursive: true, mode: 0o700 });
  // childRunId is the attempt identity. Do not silently reuse a collision.
  fs.mkdirSync(traceDir, { mode: 0o700 });
  fs.writeFileSync(path.join(traceDir, "prompt.txt"), runtime.prompt, { mode: 0o600 });
  fs.writeFileSync(path.join(traceDir, "events.jsonl"), "", { mode: 0o600 });
  fs.writeFileSync(path.join(traceDir, "stderr.log"), "", { mode: 0o600 });
  const extra = runtime.extra ?? {};
  const runtimeMetadata = Object.fromEntries(Object.entries(runtime).filter(([key]) => key !== "prompt"));
  fs.writeFileSync(path.join(traceDir, "runtime.json"), JSON.stringify({ ...runtimeMetadata, extra }, null, 2), { mode: 0o600 });
  const before = new Map(outputs.map((output) => [output.sourcePath, sha256IfFile(output.sourcePath)]));

  const terminal = (state: "completed" | "failed", completedAt: string, error?: unknown) => {
    fs.writeFileSync(path.join(traceDir, "terminal.json"), JSON.stringify({
      state, childRunId: runtime.childRunId, startedAt: runtime.startedAt, completedAt,
      ...(state === "failed" ? { error: safeError(error) } : {})
    }, null, 2), { mode: 0o600 });
  };
  return {
    traceDir,
    append(stream, chunk) {
      fs.appendFileSync(path.join(traceDir, stream === "stdout" ? "events.jsonl" : "stderr.log"), chunk, { mode: 0o600 });
    },
    snapshotOutputs() {
      const snapshotDir = path.join(traceDir, "outputs");
      const result = outputs.map((output) => {
        const beforeSha256 = before.get(output.sourcePath) ?? null;
        try {
          const afterSha256 = sha256IfFile(output.sourcePath);
          const state = afterSha256 === null ? "absent"
            : beforeSha256 === afterSha256 ? "unchanged"
              : beforeSha256 === null ? "created" : "changed";
          if (state === "created" || state === "changed") {
            fs.mkdirSync(snapshotDir, { recursive: true, mode: 0o700 });
            fs.copyFileSync(output.sourcePath, path.join(snapshotDir, output.name), fs.constants.COPYFILE_EXCL);
          }
          return { name: output.name, sourcePath: output.sourcePath, state, beforeSha256, afterSha256 };
        } catch (error) {
          return { name: output.name, sourcePath: output.sourcePath, state: "snapshot_error",
            beforeSha256, afterSha256: null, error: safeError(error) };
        }
      });
      try {
        fs.writeFileSync(path.join(traceDir, "output-snapshot.json"), JSON.stringify({ outputs: result }, null, 2), { mode: 0o600 });
      } catch {
        // A trace persistence problem must not change the child process outcome.
      }
    },
    complete(completedAt) { terminal("completed", completedAt); },
    fail(completedAt, error) { terminal("failed", completedAt, error); }
  };
}
