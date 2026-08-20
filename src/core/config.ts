import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(moduleDir, "../..");

export function runtimeDir(): string {
  const configured = process.env.SELF_MEDIA_RUNTIME_DIR;
  return configured ? path.resolve(configured) : path.join(projectRoot, ".runtime");
}

export function databasePath(): string {
  return path.join(runtimeDir(), "self-media.sqlite");
}

export function runArtifactDir(runId: string): string {
  return path.join(runtimeDir(), "runs", runId);
}

export function apiPort(): number {
  const value = Number(process.env.SELF_MEDIA_PORT ?? "4310");
  return Number.isFinite(value) ? value : 4310;
}

export function webBaseUrl(): string {
  return process.env.SELF_MEDIA_WEB_URL ?? "http://127.0.0.1:5173";
}

export const externalSkills = {
  xhsCli: process.env.SELF_MEDIA_XHS_CLI ?? path.join(os.homedir(), ".codex", "skills", "xiaohongshu-skills", "scripts", "cli.py"),
  twitterEnv: process.env.SELF_MEDIA_TWITTER_ENV ?? path.join(os.homedir(), "Documents", "ai", "skills", "twitter-mcp", ".env"),
  mediaTranscribe: process.env.SELF_MEDIA_TRANSCRIBE_SCRIPT ?? path.join(os.homedir(), ".agents", "skills", "media-use", "scripts", "transcribe.mjs")
} as const;
