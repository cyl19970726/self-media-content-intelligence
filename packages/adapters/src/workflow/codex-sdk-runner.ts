/**
 * Self Media compatibility facade for the reusable Codex workflow adapter.
 * Project paths and environment policy remain here; the shared package has no
 * knowledge of this application's configuration.
 */
import path from "node:path";
import {
  CodexSdkRunner as SharedCodexSdkRunner,
  defaultCodexSdkFactory,
  codexInstalledVersions as sharedCodexInstalledVersions,
  type CodexInstalledVersionsOptions,
  type CodexSdkFactory
} from "@signal-room/workflow-codex";
import { projectRoot, runtimeDir } from "../core/config.js";

export * from "@signal-room/workflow-codex";

function hostRuntimeOptions(options: CodexInstalledVersionsOptions = {}): CodexInstalledVersionsOptions {
  return {
    packageRoot: projectRoot,
    cliBinary: process.env.SELF_MEDIA_CODEX_BIN ?? "codex",
    ...options
  };
}

/** The SDK package and selected executable are recorded independently. */
export function codexInstalledVersions(options: CodexInstalledVersionsOptions = {}): {
  sdkVersion: string;
  codexRuntimeVersion: string;
} {
  return sharedCodexInstalledVersions(hostRuntimeOptions(options));
}

/**
 * Preserves the application defaults while allowing callers to inject a trace
 * root, SDK factory, or runtime-version lookup settings for tests and tools.
 */
export class CodexSdkRunner extends SharedCodexSdkRunner {
  constructor(
    factory: CodexSdkFactory = defaultCodexSdkFactory,
    traceRoot: string = path.join(runtimeDir(), "workflow-traces", "codex-sdk"),
    runtimeOptions: CodexInstalledVersionsOptions = {}
  ) {
    super(factory, traceRoot, hostRuntimeOptions(runtimeOptions));
  }
}
