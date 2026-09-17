import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { projectRoot } from "../../core/config.js";

export const sourceDigest = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");

export type ReportSourceRevision = {
  text: string;
  revision: string | null;
  originalSha256: string;
  revisedSha256: string | null;
  manifestPath: string | null;
};

/** Resolve a saved, hash-bound source revision without changing the original artifact. */
export function resolveReportSource(file: string): ReportSourceRevision {
  const original = fs.readFileSync(file);
  const digest = sourceDigest(original);
  const root = process.env.SELF_MEDIA_REPORT_REVISIONS_DIR ?? path.join(projectRoot, ".runtime", "report-revisions");
  const directory = path.join(root, digest);
  const manifestPath = path.join(directory, "revision.json");
  if (!fs.existsSync(manifestPath)) return {
    text: original.toString("utf8"), revision: null, originalSha256: digest,
    revisedSha256: null, manifestPath: null
  };
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
  if (manifest.schemaVersion !== "report-source-revision@1" || manifest.originalSha256 !== digest ||
      typeof manifest.revisionId !== "string" || typeof manifest.reason !== "string" ||
      typeof manifest.revisedSha256 !== "string") throw new Error("报告修订清单无效");
  const revised = fs.readFileSync(path.join(directory, "revised-source"));
  if (sourceDigest(revised) !== manifest.revisedSha256) throw new Error("报告修订内容校验失败");
  return {
    text: revised.toString("utf8"), revision: `${manifest.revisionId}：${manifest.reason}`,
    originalSha256: digest, revisedSha256: manifest.revisedSha256, manifestPath
  };
}

export function readReportSource(file: string): { text: string; revision: string | null } {
  const { text, revision } = resolveReportSource(file);
  return { text, revision };
}
