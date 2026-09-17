import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Codex, type CodexOptions, type Input, type Thread, type ThreadEvent, type ThreadOptions } from "@openai/codex-sdk";
import type { AgentDefinition, AgentRunRequest, AgentRunResult, AgentRunner } from "../../../workflow/index.js";
import { projectRoot, runtimeDir } from "../core/config.js";

const require = createRequire(import.meta.url);
const reasoningEfforts = new Set([
  "minimal", "low", "medium", "high", "xhigh", "max", "ultra", "persistent"
] as const);
type SupportedReasoningEffort = typeof reasoningEfforts extends Set<infer Value> ? Value : never;

function installedPackageVersion(packageName: string): string {
  try {
    const workspaceManifest = path.join(projectRoot, "node_modules", ...packageName.split("/"), "package.json");
    if (fs.existsSync(workspaceManifest)) {
      const manifest = JSON.parse(fs.readFileSync(workspaceManifest, "utf8")) as { name?: unknown; version?: unknown };
      if (manifest.name === packageName && typeof manifest.version === "string") return manifest.version;
    }
    try {
      const manifest = JSON.parse(fs.readFileSync(require.resolve(`${packageName}/package.json`), "utf8")) as { name?: unknown; version?: unknown };
      if (manifest.name === packageName && typeof manifest.version === "string") return manifest.version;
    } catch {
      // Some packages intentionally do not export package.json; locate it from their entry point below.
    }
    let entry: string;
    try { entry = require.resolve(packageName); }
    catch { entry = fileURLToPath(import.meta.resolve(packageName)); }
    let directory = path.dirname(entry);
    let manifestPath = path.join(directory, "package.json");
    while (!fs.existsSync(manifestPath) && path.dirname(directory) !== directory) {
      directory = path.dirname(directory);
      manifestPath = path.join(directory, "package.json");
    }
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { name?: unknown; version?: unknown };
    if (manifest.name !== packageName) return "unknown";
    return typeof manifest.version === "string" ? manifest.version : "unknown";
  } catch {
    return "unknown";
  }
}

function installedCliVersion(binary = process.env.SELF_MEDIA_CODEX_BIN ?? "codex"): string {
  try {
    const output = execFileSync(binary, ["--version"], { encoding: "utf8", timeout: 2_000, stdio: ["ignore", "pipe", "ignore"] }).trim();
    return output || "unknown";
  } catch {
    return "unknown";
  }
}

/** The SDK package and selected executable are recorded independently. */
export function codexInstalledVersions(): { sdkVersion: string; codexRuntimeVersion: string } {
  return { sdkVersion: installedPackageVersion("@openai/codex-sdk"), codexRuntimeVersion: installedCliVersion() };
}

function reasoningEffort(value: string): SupportedReasoningEffort {
  if (!reasoningEfforts.has(value as SupportedReasoningEffort)) {
    throw new Error(`Unsupported Codex model reasoning effort: ${value}`);
  }
  return value as SupportedReasoningEffort;
}

export type CodexSdkFactory = {
  create(options?: CodexOptions): Pick<Codex, "startThread" | "resumeThread">;
};

export const defaultCodexSdkFactory: CodexSdkFactory = {
  create: (options) => new Codex(options)
};

export type CodexSdkSkillSnapshot = {
  path: string;
  content?: string;
};

/**
 * Evidence that the exact required method files were provided to a child.
 * We deliberately embed their bytes in the prompt: an isolated SDK cwd cannot
 * prove that a model followed an out-of-directory path instruction.
 */
export type SkillLoadReceipt = {
  loading: "effective_prompt_snapshot";
  files: Array<{ path: string; sha256: string; bytes: number; promptAnchor: string }>;
  effectivePromptSha256: string;
};

export function attachVerifiedSkillSnapshots(prompt: string, requiredPaths: readonly string[]): {
  prompt: string;
  receipt: SkillLoadReceipt;
} {
  if (requiredPaths.length === 0) {
    return { prompt, receipt: { loading: "effective_prompt_snapshot" as const, files: [], effectivePromptSha256: sha256(prompt) } };
  }
  const files = requiredPaths.map((requestedPath, index) => {
    const absolute = path.resolve(requestedPath);
    let content: string;
    try { content = fs.readFileSync(absolute, "utf8"); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error(`CODEX_SKILL_REQUIRED_FILE_MISSING:${absolute}`);
      throw error;
    }
    if (!content.trim()) throw new Error(`CODEX_SKILL_REQUIRED_FILE_EMPTY:${absolute}`);
    const promptAnchor = `skill-snapshot-${index + 1}:${sha256(content)}`;
    return { path: absolute, content, sha256: sha256(content), bytes: Buffer.byteLength(content), promptAnchor };
  });
  const effectivePrompt = `${prompt}

## Verified required method snapshots
${files.map((file) =>
    `<!-- ${file.promptAnchor} -->
Path: ${file.path}
SHA-256: ${file.sha256}
\`\`\`text
${file.content}
\`\`\``
  ).join("\n\n")}`;
  return { prompt: effectivePrompt, receipt: {
    loading: "effective_prompt_snapshot",
    files: files.map(({ path: filePath, sha256: digest, bytes, promptAnchor }) => ({ path: filePath, sha256: digest, bytes, promptAnchor })),
    effectivePromptSha256: sha256(effectivePrompt)
  } };
}

/**
 * The runner persists these inputs verbatim enough for an operator to reproduce
 * an attempt. `receiptFiles` are only file observations: business schema and
 * evidence validation remain the workflow's explicit validate step.
 */
export type CodexSdkAgentConfig = {
  prompt: string;
  skills?: readonly CodexSdkSkillSnapshot[];
  outputSchema?: unknown;
  receiptFiles?: readonly string[];
  outputDirectory?: string;
  timeoutMs?: number;
  threadOptions?: Omit<ThreadOptions, "model" | "modelReasoningEffort" | "workingDirectory">;
  resume?: {
    requested: true;
    threadId: string;
    role: string;
    fingerprint: string;
  };
};

export type CodexSdkRunObserver = (event: ThreadEvent) => void | Promise<void>;

export type InvokeCodexSdkRequest = {
  prompt: Input;
  imagePaths?: readonly string[];
  outputDir: string;
  role: string;
  model: string;
  reasoningEffort: string;
  outputSchema?: unknown;
  lastMessage?: string;
  signal: AbortSignal;
  timeoutMs?: number;
  observer?: CodexSdkRunObserver;
  codexOptions?: CodexOptions;
  threadOptions?: Omit<ThreadOptions, "model" | "modelReasoningEffort" | "workingDirectory">;
  resume?: { requested: true; threadId: string };
};

export type InvokeCodexSdkResult = {
  threadId: string | null;
  finalResponse: string;
  usage: { inputTokens: number; cachedInputTokens: number; outputTokens: number; reasoningOutputTokens: number } | null;
};

function sha256(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function stableJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(",")}}`;
}

function writePrivate(file: string, value: string): void {
  fs.writeFileSync(file, value, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function appendPrivate(file: string, value: string): void {
  fs.appendFileSync(file, value, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

function safeSegment(value: string): string {
  if (!/^[A-Za-z0-9._-]+$/.test(value)) throw new Error("Workflow attempt identifiers must be filesystem-safe");
  return value;
}

function configOf(definition: AgentDefinition<unknown, unknown>): CodexSdkAgentConfig {
  const config = definition.config as CodexSdkAgentConfig | undefined;
  if (!config || typeof config.prompt !== "string" || config.prompt.length === 0) {
    throw new Error(`Agent ${definition.id} requires config.prompt for the Codex SDK runner`);
  }
  return config;
}

function fileSnapshot(outputDir: string, receiptFiles: readonly string[]): Array<{ path: string; state: "present" | "missing"; sha256?: string; bytes?: number }> {
  return receiptFiles.map((relative) => {
    if (path.isAbsolute(relative) || relative.split(path.sep).includes("..")) throw new Error(`Receipt file must be relative to outputDirectory: ${relative}`);
    const target = path.join(outputDir, relative);
    try {
      const stat = fs.statSync(target);
      if (!stat.isFile()) return { path: relative, state: "missing" as const };
      const bytes = fs.readFileSync(target);
      return { path: relative, state: "present" as const, sha256: sha256(bytes), bytes: stat.size };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { path: relative, state: "missing" as const };
      throw error;
    }
  });
}

function combineSignal(parent: AbortSignal, timeoutMs: number | undefined): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  const abort = () => controller.abort(parent.reason);
  if (parent.aborted) abort();
  else parent.addEventListener("abort", abort, { once: true });
  const timer = timeoutMs === undefined ? undefined : setTimeout(() => controller.abort(new Error("CODEX_SDK_TIMEOUT")), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => {
      parent.removeEventListener("abort", abort);
      if (timer !== undefined) clearTimeout(timer);
    }
  };
}

function publicEvent(event: ThreadEvent): Record<string, unknown> {
  switch (event.type) {
    case "thread.started": return { type: event.type, threadId: event.thread_id };
    case "turn.completed": return { type: event.type, usage: {
      inputTokens: event.usage.input_tokens, cachedInputTokens: event.usage.cached_input_tokens,
      outputTokens: event.usage.output_tokens, reasoningOutputTokens: event.usage.reasoning_output_tokens
    } };
    case "turn.failed": return { type: event.type, error: event.error.message.slice(0, 1_000) };
    case "error": return { type: event.type, error: event.message.slice(0, 1_000) };
    case "item.started":
    case "item.updated":
    case "item.completed": return { type: event.type, itemType: event.item.type, itemId: event.item.id };
    default: return { type: event.type };
  }
}

/** Low-level streaming invocation for existing adapters that need the SDK without workflow persistence. */
export async function invokeCodexSdk(
  factory: CodexSdkFactory,
  request: InvokeCodexSdkRequest
): Promise<InvokeCodexSdkResult> {
  fs.mkdirSync(request.outputDir, { recursive: true, mode: 0o700 });
  const combined = combineSignal(request.signal, request.timeoutMs);
  try {
    const options: ThreadOptions = {
      ...request.threadOptions,
      model: request.model,
      modelReasoningEffort: reasoningEffort(request.reasoningEffort),
      workingDirectory: request.outputDir,
      skipGitRepoCheck: true,
      sandboxMode: request.threadOptions?.sandboxMode ?? "workspace-write",
      approvalPolicy: request.threadOptions?.approvalPolicy ?? "never"
    };
    const codex = factory.create(request.codexOptions);
    const thread: Thread = request.resume?.requested
      ? codex.resumeThread(request.resume.threadId, options)
      : codex.startThread(options);
    const input: Input = request.imagePaths?.length
      ? [{ type: "text", text: typeof request.prompt === "string" ? request.prompt : JSON.stringify(request.prompt) },
        ...request.imagePaths.map((imagePath) => ({ type: "local_image" as const, path: imagePath }))]
      : request.prompt;
    const streamed = await thread.runStreamed(input, { outputSchema: request.outputSchema, signal: combined.signal });
    let finalResponse = "";
    let usage: InvokeCodexSdkResult["usage"] = null;
    for await (const event of streamed.events) {
      await request.observer?.(event);
      if (event.type === "turn.failed") throw new Error(`CODEX_SDK_TURN_FAILED:${event.error.message}`);
      if (event.type === "error") throw new Error(`CODEX_SDK_STREAM_ERROR:${event.message}`);
      if (event.type === "item.completed" && event.item.type === "agent_message") finalResponse = event.item.text;
      if (event.type === "turn.completed") {
        usage = {
          inputTokens: event.usage.input_tokens,
          cachedInputTokens: event.usage.cached_input_tokens,
          outputTokens: event.usage.output_tokens,
          reasoningOutputTokens: event.usage.reasoning_output_tokens
        };
      }
    }
    if (request.lastMessage) writePrivate(request.lastMessage, finalResponse);
    return { threadId: thread.id, finalResponse, usage };
  } finally {
    combined.cleanup();
  }
}

export class CodexSdkRunner implements AgentRunner {
  constructor(
    private readonly factory: CodexSdkFactory = defaultCodexSdkFactory,
    private readonly traceRoot: string = path.join(runtimeDir(), "workflow-traces", "codex-sdk")
  ) {}

  async run<InputValue, Output>(request: AgentRunRequest<InputValue>): Promise<AgentRunResult<Output>> {
    const definition = request.definition as AgentDefinition<unknown, unknown>;
    const config = configOf(definition);
    const attemptDir = path.join(this.traceRoot, safeSegment(request.runId), safeSegment(request.stepRunId), safeSegment(request.attemptId));
    fs.mkdirSync(attemptDir, { recursive: true, mode: 0o700 });
    fs.chmodSync(attemptDir, 0o700);
    const outputDir = config.outputDirectory ? path.resolve(config.outputDirectory) : attemptDir;
    fs.mkdirSync(outputDir, { recursive: true, mode: 0o700 });

    const inputSnapshot = stableJson(request.input);
    const skills = (config.skills ?? []).map((skill) => ({ path: skill.path, content: skill.content ?? fs.readFileSync(skill.path, "utf8") }));
    const effectivePrompt = `${config.prompt}\n\n## Frozen workflow input\n${inputSnapshot}\n\n## Required skill snapshots\n${skills
      .map((skill) => `### ${skill.path}\n${skill.content}`).join("\n\n")}`;
    const skillLoad: SkillLoadReceipt = {
      loading: "effective_prompt_snapshot",
      files: skills.map((skill) => ({ path: skill.path, sha256: sha256(skill.content), bytes: Buffer.byteLength(skill.content),
        promptAnchor: `### ${skill.path}` })),
      effectivePromptSha256: sha256(effectivePrompt)
    };
    const fingerprint = sha256(stableJson({ role: definition.id, revision: definition.revision, model: definition.model,
      reasoningEffort: definition.reasoningEffort, prompt: effectivePrompt, skills, input: request.input,
      permissionsRevision: definition.permissionsRevision }));
    const runtime = {
      agent: { id: definition.id, revision: definition.revision }, runId: request.runId, stepRunId: request.stepRunId,
      attemptId: request.attemptId, model: definition.model, reasoningEffort: definition.reasoningEffort,
      ...codexInstalledVersions(), outputDirectory: outputDir,
      promptRevision: definition.promptRevision, skillsRevision: definition.skillsRevision,
      permissionsRevision: definition.permissionsRevision, fingerprint, skillLoad,
      resumed: Boolean(config.resume?.requested)
    };
    writePrivate(path.join(attemptDir, "runtime.json"), JSON.stringify(runtime, null, 2));
    writePrivate(path.join(attemptDir, "prompt.txt"), effectivePrompt);
    writePrivate(path.join(attemptDir, "input.json"), inputSnapshot);
    writePrivate(path.join(attemptDir, "skills.json"), JSON.stringify(skills, null, 2));
    writePrivate(path.join(attemptDir, "hashes.json"), JSON.stringify({ prompt: sha256(effectivePrompt), input: sha256(inputSnapshot), skills: sha256(stableJson(skills)) }, null, 2));
    writePrivate(path.join(attemptDir, "events.jsonl"), "");

    const resume = config.resume?.requested && config.resume.role === definition.id && config.resume.fingerprint === fingerprint
      ? { requested: true as const, threadId: config.resume.threadId }
      : undefined;
    if (config.resume?.requested && !resume) throw new Error("CODEX_SDK_RESUME_FINGERPRINT_MISMATCH");
    try {
      await request.emit("agent.started", {
        agentId: definition.id, agentRevision: definition.revision, model: definition.model,
        reasoningEffort: definition.reasoningEffort, fingerprint, sdkVersion: runtime.sdkVersion,
        codexRuntimeVersion: runtime.codexRuntimeVersion, resumed: Boolean(resume)
      });
      const result = await invokeCodexSdk(this.factory, {
        prompt: effectivePrompt, outputDir, role: definition.id, model: definition.model,
        reasoningEffort: definition.reasoningEffort, outputSchema: config.outputSchema, timeoutMs: config.timeoutMs,
        lastMessage: path.join(attemptDir, "last-message.txt"), signal: request.signal,
        threadOptions: config.threadOptions, resume,
        observer: async (event) => {
          appendPrivate(path.join(attemptDir, "events.jsonl"), `${JSON.stringify(event)}\n`);
          await request.emit("agent.event", publicEvent(event));
        }
      });
      let output: Output;
      try { output = JSON.parse(result.finalResponse) as Output; }
      catch { output = result.finalResponse as Output; }
      const receipts = fileSnapshot(outputDir, config.receiptFiles ?? []);
      writePrivate(path.join(attemptDir, "output-files.json"), JSON.stringify(receipts, null, 2));
      const metadata = { ...runtime, threadId: result.threadId, usage: result.usage, receipts,
        receiptValidation: "observed_only_workflow_validate_must_enforce_business_contract" };
      writePrivate(path.join(attemptDir, "result.json"), JSON.stringify({ finalResponse: result.finalResponse, metadata }, null, 2));
      await request.emit("agent.completed", { threadId: result.threadId, usage: result.usage,
        receipts: receipts.map((receipt) => ({ path: receipt.path, state: receipt.state, sha256: receipt.sha256 })) });
      return { output, metadata };
    } catch (error) {
      writePrivate(path.join(attemptDir, "failure.json"), JSON.stringify({ message: error instanceof Error ? error.message : "Unknown Codex SDK failure" }, null, 2));
      await request.emit("agent.failed", { error: error instanceof Error ? error.message.slice(0, 1_000) : "Unknown Codex SDK failure" });
      throw error;
    }
  }
}
