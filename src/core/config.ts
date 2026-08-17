import path from "node:path";
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
  xhsCli: "/Users/hhh0x/.codex/skills/xiaohongshu-skills/scripts/cli.py",
  twitterEnv: "/Users/hhh0x/Documents/ai/skills/twitter-mcp/.env",
  mediaTranscribe: "/Users/hhh0x/.agents/skills/media-use/scripts/transcribe.mjs"
} as const;

