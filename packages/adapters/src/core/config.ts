import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

function isProjectRoot(directory: string): boolean {
  const manifestPath = path.join(directory, "package.json");
  if (!fs.existsSync(manifestPath)) return false;
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as { name?: string };
    return manifest.name === "self-media-intelligence";
  } catch {
    return false;
  }
}

function discoverProjectRoot(start: string): string {
  let directory = path.resolve(start);
  while (true) {
    if (isProjectRoot(directory)) return directory;
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  throw new Error(`Unable to locate Signal Room project root from ${start}`);
}

export const projectRoot = process.env.SELF_MEDIA_PROJECT_ROOT
  ? path.resolve(process.env.SELF_MEDIA_PROJECT_ROOT)
  : discoverProjectRoot(moduleDir);

export function runtimeDir(): string {
  const configured = process.env.SELF_MEDIA_RUNTIME_DIR;
  return configured ? path.resolve(configured) : path.join(projectRoot, ".runtime");
}

export function evidenceStoreRoot(): string | null {
  const configured = process.env.SIGNAL_ROOM_EVIDENCE_ROOT?.trim();
  return configured ? path.resolve(configured) : null;
}

export function evidenceArtifactsRoot(): string {
  const store = evidenceStoreRoot();
  return store ? path.join(store, "view", "artifacts") : path.join(projectRoot, "artifacts");
}

export function evidenceResearchRoot(): string {
  return path.join(evidenceArtifactsRoot(), "creator-research");
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

export type CreatorWorkerConcurrencyConfig = {
  redfox: number;
  "ego-browser": number;
  portfolio: number;
  video: number;
  synthesis: number;
};

function concurrency(name: string, fallback: number, maximum: number): number {
  const configured = Number(process.env[name] ?? String(fallback));
  if (!Number.isFinite(configured)) return fallback;
  return Math.min(maximum, Math.max(1, Math.trunc(configured)));
}

export function creatorWorkerConcurrency(): CreatorWorkerConcurrencyConfig {
  return {
    redfox: concurrency("SELF_MEDIA_REDFOX_CONCURRENCY", 4, 8),
    "ego-browser": concurrency("SELF_MEDIA_EGO_BROWSER_CONCURRENCY", 1, 2),
    portfolio: concurrency("SELF_MEDIA_PORTFOLIO_CONCURRENCY", 1, 4),
    video: concurrency("SELF_MEDIA_VIDEO_CONCURRENCY", 3, 3),
    synthesis: concurrency("SELF_MEDIA_SYNTHESIS_CONCURRENCY", 2, 4)
  };
}

export function videoConcurrency(): number {
  return creatorWorkerConcurrency().video;
}

export function webBaseUrl(): string {
  return process.env.SELF_MEDIA_WEB_URL ?? "http://127.0.0.1:5173";
}

export const externalSkills = {
  xhsCli: process.env.SELF_MEDIA_XHS_CLI ?? path.join(os.homedir(), ".codex", "skills", "xiaohongshu-skills", "scripts", "cli.py"),
  twitterEnv: process.env.SELF_MEDIA_TWITTER_ENV ?? path.join(os.homedir(), "Documents", "ai", "skills", "twitter-mcp", ".env"),
  mediaTranscribe: process.env.SELF_MEDIA_TRANSCRIBE_SCRIPT ?? path.join(os.homedir(), ".agents", "skills", "media-use", "scripts", "transcribe.mjs")
} as const;
