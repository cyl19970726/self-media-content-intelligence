import type { CreatorResearchRun } from "../../../shared/contracts/core";
import { validateCreatorProfileUrl } from "./creator-task-state";

export const CREATOR_BATCH_LIMIT = 20;

export type CreatorBatchDraftState = "valid" | "invalid" | "duplicate_in_batch" | "existing_run";

export type CreatorBatchDraftEntry = {
  row: number;
  raw: string;
  label: string | null;
  normalizedUrl: string | null;
  state: CreatorBatchDraftState;
  message: string;
  existingRunId: string | null;
};

export type CreatorBatchDraft = {
  entries: CreatorBatchDraftEntry[];
  lineCount: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  existingCount: number;
  overLimit: boolean;
  canSubmit: boolean;
};

const urlPattern = /https:\/\/[^\s，,]+/iu;

function existingUrlMap(runs: CreatorResearchRun[] | null): Map<string, CreatorResearchRun> {
  const entries = (runs ?? []).flatMap((run) => {
    const validation = validateCreatorProfileUrl(run.profileUrl);
    return validation.valid ? [[validation.normalizedUrl, run] as const] : [];
  });
  return new Map(entries);
}

export function parseCreatorBatchDraft(input: string, runs: CreatorResearchRun[] | null): CreatorBatchDraft {
  const existing = existingUrlMap(runs);
  const seen = new Set<string>();
  const rows = input.split(/\r?\n/u).map((raw, index) => ({ raw: raw.trim(), row: index + 1 })).filter(({ raw }) => raw.length > 0);
  const overLimit = rows.length > CREATOR_BATCH_LIMIT;
  const entries = rows.map(({ raw, row }): CreatorBatchDraftEntry => {
    const match = raw.match(urlPattern);
    const candidate = match?.[0] ?? raw;
    const label = match && match.index !== undefined ? raw.slice(0, match.index).replace(/[：:，,|｜-]+$/u, "").trim() || null : null;
    const validation = validateCreatorProfileUrl(candidate);
    if (!validation.valid) return { row, raw, label, normalizedUrl: null, state: "invalid", message: validation.message, existingRunId: null };
    if (seen.has(validation.normalizedUrl)) return {
      row, raw, label, normalizedUrl: validation.normalizedUrl, state: "duplicate_in_batch", message: "与本批前面的主页重复，不会再次创建。", existingRunId: null
    };
    seen.add(validation.normalizedUrl);
    const existingRun = existing.get(validation.normalizedUrl);
    if (existingRun) return {
      row, raw, label, normalizedUrl: validation.normalizedUrl, state: "existing_run", message: "已有研究任务；服务端会复用它并纳入这个批次。", existingRunId: existingRun.id
    };
    return { row, raw, label, normalizedUrl: validation.normalizedUrl, state: "valid", message: "可以加入本批分析。", existingRunId: null };
  });
  const validCount = entries.filter((entry) => entry.state === "valid").length;
  const invalidCount = entries.filter((entry) => entry.state === "invalid").length;
  const duplicateCount = entries.filter((entry) => entry.state === "duplicate_in_batch").length;
  const existingCount = entries.filter((entry) => entry.state === "existing_run").length;
  return {
    entries, lineCount: rows.length, validCount, invalidCount, duplicateCount, existingCount, overLimit,
    canSubmit: validCount + existingCount > 0 && !overLimit && invalidCount === 0
  };
}
