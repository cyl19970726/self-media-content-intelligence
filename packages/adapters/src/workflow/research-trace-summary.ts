import fs from "node:fs";
import path from "node:path";
import { runtimeDir } from "../core/config.js";

/** Whitelisted counters and runtime facts, not commands, prompts or tool output. */
export function researchTraceSummary(kind: "post" | "creator", creatorRunId: string, childRunId: string): Record<string, unknown> {
  if (!/^[a-f0-9-]{36}$/iu.test(childRunId) || !/^[a-f0-9-]{36}$/iu.test(creatorRunId)) return {};
  const directory = kind === "post" ? path.join(runtimeDir(), "worker-traces", childRunId)
    : path.join(runtimeDir(), "executor-traces", "creator-synthesis", creatorRunId, childRunId);
  let runtime: Record<string, unknown> = {};
  let usage: Record<string, number | null> | null = null;
  try { runtime = JSON.parse(fs.readFileSync(path.join(directory, "runtime.json"), "utf8")) as Record<string, unknown>; }
  catch { /* Older executions may lack runtime metadata; never infer a model. */ }
  try {
    for (const line of fs.readFileSync(path.join(directory, "events.jsonl"), "utf8").split("\n")) {
      if (!line.trim()) continue;
      let event: { type?: string; usage?: Record<string, unknown> };
      try { event = JSON.parse(line) as typeof event; } catch { continue; }
      if (event.type !== "turn.completed" || !event.usage) continue;
      const count = (key: string) => typeof event.usage?.[key] === "number" ? event.usage[key] as number : null;
      usage = { inputTokens: count("input_tokens"), cachedInputTokens: count("cached_input_tokens"),
        outputTokens: count("output_tokens"), reasoningOutputTokens: count("reasoning_output_tokens") };
    }
  } catch { /* A partial or missing trace has unknown usage, not zero. */ }
  return { childRunId, usage,
    ...(typeof runtime.model === "string" ? { model: runtime.model } : {}),
    ...(typeof runtime.reasoningEffort === "string" ? { reasoningEffort: runtime.reasoningEffort } : {}),
    ...(typeof runtime.sdkVersion === "string" ? { sdkVersion: runtime.sdkVersion } : {}),
    ...(typeof runtime.codexRuntimeVersion === "string" ? { codexRuntimeVersion: runtime.codexRuntimeVersion } : {}) };
}
