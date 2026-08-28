import fs from "node:fs";
import path from "node:path";
import { projectRoot } from "../../packages/adapters/index.js";

/**
 * Shared artifact readers + per-creator metadata.
 * Single source for creators.ts (overview cards) and console.ts (research
 * console) so positioning strings and derived counts live exactly once.
 */

export const researchDir = path.join(projectRoot, "artifacts", "creator-research");

export function readJson(relativePath: string): Record<string, unknown> | null {
  const file = path.join(researchDir, relativePath);
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

export function asStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function formatCount(value: number | null): string {
  if (value === null) return "—";
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}万`;
  return String(value);
}

/** One-sentence positioning per creator — lives here exactly once. */
export const positioningOf = {
  "ai-red-witch": "AI 工具实操型博主：把抽象 AI 能力翻译成具体任务、结果与用途",
  "human-director": "编导能力模型拆解：成绩证明、平台趋势、垂直教程与价值观转粉四种样本"
} as const;

/** Number of per-video evidence reports, computed from artifacts (not hardcoded). */
export function videoEvidenceCount(creatorId: string): number {
  if (creatorId === "ai-red-witch") {
    const reportsDir = path.join(researchDir, "ai-red-witch", "video-library", "reports");
    try {
      return fs.readdirSync(reportsDir).filter((name) => /^[0-9a-f]+$/.test(name)).length;
    } catch {
      return 0;
    }
  }
  if (creatorId === "human-director") {
    const analysis = readJson("human-director/analysis.json");
    return Array.isArray(analysis?.videos) ? (analysis.videos as unknown[]).length : 0;
  }
  return 0;
}

/** Number of tiered sample videos for the red witch (focus set, 21). */
export function redWitchFocusCount(): number {
  const focus = readJson("ai-red-witch/selected-high-like/focus-reconstruction.json");
  if (!focus) return 0;
  const taxonomy = asRecord(focus.taxonomy);
  return (["high", "median", "low"] as const).reduce((sum, tier) => {
    const types = Array.isArray(asRecord(taxonomy[tier]).types)
      ? asRecord(taxonomy[tier]).types as Record<string, unknown>[] : [];
    return sum + types.reduce((n, type) => {
      return n + (Array.isArray(type.videos) ? (type.videos as unknown[]).length : 0);
    }, 0);
  }, 0);
}
