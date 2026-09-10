import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { reportOverviewSchema, type ReportOverviewProjection } from "../../packages/contracts/index.js";

function pointerExists(source: unknown, pointer: string): boolean {
  let current = source;
  for (const encoded of pointer.slice(1).split("/")) {
    const token = encoded.replace(/~1/gu, "/").replace(/~0/gu, "~");
    if (current === null || typeof current !== "object" || !Object.hasOwn(current, token)) return false;
    if (Array.isArray(current) && !/^(0|[1-9]\d*)$/u.test(token)) return false;
    current = (current as Record<string, unknown>)[token];
  }
  return true;
}

/** Validate an artifact against the exact source bytes, without rewriting either report. */
export function validateReportOverview(value: unknown, sourceBytes: Uint8Array): ReportOverviewProjection {
  const parsed = reportOverviewSchema.safeParse(value);
  if (!parsed.success) return { state: "invalid", overview: null };
  if (parsed.data.sourceSha256 !== createHash("sha256").update(sourceBytes).digest("hex")) {
    return { state: "stale", overview: null };
  }
  try {
    const source: unknown = JSON.parse(Buffer.from(sourceBytes).toString("utf8"));
    if (!parsed.data.paragraphs.every((paragraph) => paragraph.sourcePaths.every((pointer) => pointerExists(source, pointer)))) {
      return { state: "invalid", overview: null };
    }
    return { state: "ready", overview: parsed.data };
  } catch {
    return { state: "invalid", overview: null };
  }
}

export function loadReportOverview(reconstructionPath: string): ReportOverviewProjection {
  if (!path.isAbsolute(reconstructionPath)) return { state: "invalid", overview: null };
  let overviewBytes: Buffer;
  try {
    overviewBytes = readFileSync(path.join(path.dirname(reconstructionPath), "report-overview.json"));
  } catch (error) {
    return { state: (error as NodeJS.ErrnoException).code === "ENOENT" ? "missing" : "invalid", overview: null };
  }
  try {
    return validateReportOverview(JSON.parse(overviewBytes.toString("utf8")), readFileSync(reconstructionPath));
  } catch {
    return { state: "invalid", overview: null };
  }
}
