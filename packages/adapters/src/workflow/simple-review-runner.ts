import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { AgentRunRequest, AgentRunResult, AgentRunner, ArtifactRef } from "@signal-room/workflow";
import { attachVerifiedSkillSnapshots, CodexSdkRunner } from "./codex-sdk-runner.js";
import { artifactPath } from "../core/artifacts.js";
import { runtimeDir } from "../core/config.js";

export type SimpleReviewFinding = {
  id: string;
  location: string;
  issue: string;
  evidenceRefs: string[];
  suggestedChange: string;
  priority: "minor" | "major";
  kind: "content" | "missing_evidence";
};

export type SimpleReview = {
  schemaVersion: "research-review@1";
  kind: "post" | "creator";
  candidate: { id: string; revision: string; sha256: string };
  candidateReportSha256: string;
  summary: string;
  findings: SimpleReviewFinding[];
};

export type SimpleReviewCandidate = {
  kind: "post" | "creator";
  report: unknown;
  reportArtifactRef: string;
  reportSha256: string;
};

const jsonPointerPattern = "^(?:/(?:[^~/]|~[01])*)+$";

export const reviewOutputSchema = {
  type: "object", additionalProperties: false,
  required: ["schemaVersion", "kind", "candidate", "candidateReportSha256", "summary", "findings"],
  properties: {
    schemaVersion: { type: "string", const: "research-review@1" },
    kind: { type: "string", enum: ["post", "creator"] },
    candidate: { type: "object", additionalProperties: false, required: ["id", "revision", "sha256"], properties: {
      id: { type: "string" }, revision: { type: "string" }, sha256: { type: "string" }
    } },
    candidateReportSha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    summary: { type: "string", minLength: 1 },
    findings: { type: "array", items: { type: "object", additionalProperties: false,
      required: ["id", "location", "issue", "evidenceRefs", "suggestedChange", "priority", "kind"], properties: {
        id: { type: "string", minLength: 1 }, location: { type: "string", minLength: 1, pattern: jsonPointerPattern },
        issue: { type: "string", minLength: 1 }, evidenceRefs: { type: "array", items: { type: "string", minLength: 1 } },
        suggestedChange: { type: "string", minLength: 1 }, priority: { type: "string", enum: ["minor", "major"] },
        kind: { type: "string", enum: ["content", "missing_evidence"] }
      } }
    }
  }
} as const;

function digestFile(file: string): string {
  return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function safeSegment(value: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)) throw new Error(`SIMPLE_REVIEW_UNSAFE_RUNTIME_SEGMENT:${value}`);
  return value;
}

function pointerExists(root: unknown, pointer: string): boolean {
  const normalized = pointer.startsWith("#") ? pointer.slice(1) : pointer;
  if (!normalized.startsWith("/")) return false;
  let current: unknown = root;
  for (const encoded of normalized.slice(1).split("/")) {
    const key = encoded.replace(/~1/g, "/").replace(/~0/g, "~");
    if (Array.isArray(current) && /^\d+$/.test(key) && Number(key) < current.length) current = current[Number(key)];
    else if (current && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, key)) {
      current = (current as Record<string, unknown>)[key];
    } else return false;
  }
  return current !== undefined;
}

function canonicalEvidenceIds(value: unknown, found = new Set<string>(), field = ""): Set<string> {
  if (typeof value === "string" && value.length > 0 && /^(?:id|refId|frameId|evidenceRef|artifactRef)$/i.test(field)) found.add(value);
  else if (Array.isArray(value)) {
    if (/^(?:evidenceRefs|artifactRefs)$/i.test(field)) {
      value.forEach((item) => { if (typeof item === "string" && item.length > 0) found.add(item); });
    }
    value.forEach((item) => canonicalEvidenceIds(item, found));
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) => canonicalEvidenceIds(item, found, key));
  }
  return found;
}

function within(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function evidenceRefExists(report: unknown, reportPath: string, ref: string, exactEvidenceIds: ReadonlySet<string>,
  sourcePaths: readonly string[]): boolean {
  if (ref.startsWith("#/") && pointerExists(report, ref)) return true;
  const [fileRef = "", pointer] = ref.split("#", 2);
  const artifactReference = fileRef.startsWith("/artifacts/");
  const file = artifactReference ? (() => { try { return artifactPath(fileRef); } catch { return ""; } })()
    : path.isAbsolute(fileRef) ? fileRef : path.resolve(path.dirname(reportPath), fileRef);
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  const candidateRoot = path.dirname(reportPath);
  const inCandidateEvidence = [path.join(candidateRoot, "evidence"), path.join(candidateRoot, "targeted-evidence")]
    .some((root) => within(root, file));
  const declaredSource = sourcePaths.some((source) => path.resolve(source) === path.resolve(file));
  const declaredArtifact = artifactReference && [...exactEvidenceIds].some((id) => id.split("#", 1)[0] === fileRef);
  if (!declaredSource && !declaredArtifact && !inCandidateEvidence) return false;
  if (!pointer) return true;
  try { return pointerExists(JSON.parse(fs.readFileSync(file, "utf8")), `/${pointer.replace(/^\//, "")}`); }
  catch { return false; }
}

function assertReview(value: unknown, candidateRef: ArtifactRef, candidate: SimpleReviewCandidate,
  reportPath: string, sourcePaths: readonly string[]): SimpleReview {
  if (!value || typeof value !== "object") throw new Error("SIMPLE_REVIEW_OUTPUT_INVALID");
  const review = value as Partial<SimpleReview>;
  if (review.schemaVersion !== "research-review@1" || review.kind !== candidate.kind || !review.summary?.trim()
    || !Array.isArray(review.findings)) throw new Error("SIMPLE_REVIEW_OUTPUT_INVALID");
  if (review.candidate?.id !== candidateRef.id || review.candidate.revision !== candidateRef.revision
    || review.candidate.sha256 !== candidateRef.sha256 || review.candidateReportSha256 !== candidate.reportSha256) {
    throw new Error("SIMPLE_REVIEW_CANDIDATE_MISMATCH");
  }
  const exactEvidenceIds = canonicalEvidenceIds(candidate.report);
  for (const sourcePath of sourcePaths) {
    if (!sourcePath.endsWith(".json")) continue;
    try { canonicalEvidenceIds(JSON.parse(fs.readFileSync(sourcePath, "utf8")), exactEvidenceIds); } catch { /* binary/non-JSON source */ }
  }
  const ids = new Set<string>();
  for (const finding of review.findings) {
    if (!finding?.id || ids.has(finding.id) || !finding.issue?.trim() || !finding.suggestedChange?.trim()
      || !["minor", "major"].includes(finding.priority) || !["content", "missing_evidence"].includes(finding.kind)
      || !Array.isArray(finding.evidenceRefs)) throw new Error("SIMPLE_REVIEW_FINDING_INVALID");
    ids.add(finding.id);
    if (!pointerExists(candidate.report, finding.location)) throw new Error(`SIMPLE_REVIEW_LOCATION_MISSING:${finding.id}`);
    for (const ref of finding.evidenceRefs) {
      if (!exactEvidenceIds.has(ref) && !evidenceRefExists(candidate.report, reportPath, ref, exactEvidenceIds, sourcePaths)) {
        throw new Error(`SIMPLE_REVIEW_EVIDENCE_MISSING:${finding.id}:${ref}`);
      }
    }
  }
  return review as SimpleReview;
}

export async function runSimpleReview<Input>(options: {
  request: AgentRunRequest<Input>;
  candidateRef: ArtifactRef;
  candidate: SimpleReviewCandidate;
  reportPath: string;
  reviewerOperatorPath: string;
  sourcePaths: string[];
  sourceMappings?: Array<{ ref: string; path: string }>;
  /** Deterministic rejection from the preceding attempt, supplied to the retry only. */
  retryFeedback?: string;
  runner?: AgentRunner;
}): Promise<SimpleReview> {
  for (const sourcePath of [options.reportPath, ...options.sourcePaths]) {
    if (!fs.existsSync(sourcePath)) throw new Error(`SIMPLE_REVIEW_SOURCE_MISSING:${sourcePath}`);
  }
  const watched = [...new Set([options.reportPath, ...options.sourcePaths])];
  const before = new Map(watched.map((file) => [file, digestFile(file)]));
  if (before.get(options.reportPath) !== options.candidate.reportSha256) throw new Error("CANDIDATE_REVISION_CHANGED");
  const candidateIdentity = { id: options.candidateRef.id, revision: options.candidateRef.revision, sha256: options.candidateRef.sha256 };
  const outputDirectory = path.join(runtimeDir(), "workflow-reviews", safeSegment(options.request.runId),
    safeSegment(options.request.stepRunId), safeSegment(options.request.attemptId));
  const attached = attachVerifiedSkillSnapshots(
    `You are the Reviewer operator. Activate only the verified Reviewer operator snapshot; the staged package is reference material.
Review the immutable candidate for substantive content errors and missing evidence. Return only the requested research-review@1 JSON. Do not modify any file.
Each finding.location must be exactly one RFC 6901 JSON Pointer into the candidate report, beginning with /. If one issue concerns multiple locations, emit separate findings instead of joining paths with separators or prose. A semicolon is valid only when it is part of an actual JSON object member name.
${options.retryFeedback?.trim() ? `The previous review attempt was rejected by deterministic validation. Correct this specific error: ${options.retryFeedback.trim()}
A validation-format error does not make a substantive concern invalid. Independently re-check the candidate and retain any supported finding; do not return empty findings merely to avoid the prior validation error.
` : ""}Candidate identity: ${JSON.stringify(candidateIdentity)}
Candidate report SHA-256: ${options.candidate.reportSha256}
Candidate report: ${options.reportPath}
Artifact reference to local-path mappings:
${(options.sourceMappings ?? []).map((item) => `${item.ref} => ${item.path}`).join("\n")}
Readable source inputs:
${options.sourcePaths.join("\n")}`,
    [options.reviewerOperatorPath], { outputDirectory });
  fs.mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
  fs.writeFileSync(path.join(outputDirectory, "reviewer-skill-load.json"), `${JSON.stringify(attached.receipt, null, 2)}\n`, { mode: 0o600 });
  const definition = {
    ...options.request.definition,
    config: {
      prompt: attached.prompt,
      skills: [],
      outputSchema: reviewOutputSchema,
      outputDirectory,
      threadOptions: { sandboxMode: "read-only", approvalPolicy: "never" },
      timeoutMs: 10 * 60_000
    }
  };
  const outcome = await (options.runner ?? new CodexSdkRunner()).run({ ...options.request, definition })
    .then((result) => ({ ok: true as const, result }), (error: unknown) => ({ ok: false as const, error }));
  // Check immutable inputs on both success and failure without throwing from finally.
  for (const [file, digest] of before) {
    if (!fs.existsSync(file) || digestFile(file) !== digest) throw new Error(`SIMPLE_REVIEW_MUTATED_SOURCE:${file}`);
  }
  if (!outcome.ok) throw outcome.error;
  return assertReview(outcome.result.output, options.candidateRef, options.candidate, options.reportPath, options.sourcePaths);
}

export function simpleReviewReceipt(review: SimpleReview, candidate: ArtifactRef): AgentRunResult<unknown>["output"] {
  return {
    artifact: review,
    route: review.findings.length === 0 ? "deliver" : review.kind === "post" ? "repair_post" : "repair",
    findings: review.findings,
    candidateRevisionSha256: review.candidateReportSha256,
    candidate
  };
}
