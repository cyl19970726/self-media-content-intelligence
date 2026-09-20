import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { runFile } from "../../core/process.js";

type ExecuteFile = typeof runFile;
type OcrFrame = { frameId?: string; status?: string; error?: string | null; lines?: unknown[] };
type OcrArtifact = { frames?: OcrFrame[] };
type TargetedFrame = { id?: string; frame?: string };
type TargetedArtifact = { frames?: TargetedFrame[] };

export type HostOcrRecoveryReceipt = {
  schemaVersion: "video-ocr-host-recovery@1";
  attemptedAt: string;
  attemptKey: string;
  manifestSha256: string;
  frameSetSha256: string;
  before: { path: string | null; sha256: string | null; failed: number; processed: number; lines: number };
  after: { path: string | null; sha256: string | null; failed: number; processed: number; lines: number };
  status: "recovered_text" | "no_new_text" | "host_failed";
  error: string | null;
};

export type HostOcrRecoveryResult = {
  attempted: boolean;
  recoveredText: boolean;
  reason: string;
  receipt: HostOcrRecoveryReceipt | null;
};

function digest(value: string | Buffer): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readJson(file: string): unknown {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

function summary(value: unknown): { failed: number; processed: number; lines: number } {
  const frames = (value as OcrArtifact | null)?.frames ?? [];
  return {
    failed: frames.filter((frame) => frame.status === "failed").length,
    processed: frames.filter((frame) => frame.status === "processed").length,
    lines: frames.reduce((count, frame) => count + (Array.isArray(frame.lines)
      ? frame.lines.filter((line) => line && typeof line === "object" && "text" in line
        && typeof line.text === "string" && line.text.trim().length > 0).length : 0), 0)
  };
}

function lineKeys(value: unknown): Set<string> {
  const frames = (value as OcrArtifact | null)?.frames ?? [];
  return new Set(frames.flatMap((frame) => Array.isArray(frame.lines) ? frame.lines.flatMap((line) => {
    if (!line || typeof line !== "object" || !("text" in line) || typeof line.text !== "string") return [];
    const text = line.text.trim();
    if (!text) return [];
    const id = "id" in line && typeof line.id === "string" ? line.id : "";
    return [`${frame.frameId ?? ""}\u0000${id}\u0000${text}`];
  }) : []) ?? []);
}

function coversTargetedFrames(value: unknown, targeted: TargetedArtifact): boolean {
  const expected = new Set((targeted.frames ?? []).map((frame) => frame.id).filter(Boolean));
  const actual = new Set(((value as OcrArtifact | null)?.frames ?? []).map((frame) => frame.frameId).filter(Boolean));
  return expected.size > 0 && expected.size === actual.size && [...expected].every((id) => actual.has(id));
}

function retryableArtifact(ocr: unknown, targeted: TargetedArtifact): boolean {
  const expected = targeted.frames ?? [];
  const frames = (ocr as OcrArtifact | null)?.frames ?? [];
  if (expected.length === 0) return false;
  if (frames.length === 0) return true;
  const covered = new Set(frames.map((frame) => frame.frameId).filter(Boolean));
  if (expected.some((frame) => frame.id && !covered.has(frame.id))) return true;
  // A processed frame, including processed-with-no-text, is a completed OCR attempt.
  if (frames.some((frame) => frame.status === "processed")) return false;
  return frames.length === expected.length && frames.every((frame) =>
    frame.status === "failed" && frame.error === "nilError");
}

function frameSetFingerprint(targetedPath: string, targeted: TargetedArtifact): string {
  const root = path.dirname(targetedPath);
  const rows = (targeted.frames ?? []).map((frame) => {
    if (!frame.id || !frame.frame) throw new Error("HOST_OCR_TARGETED_FRAME_INVALID");
    const candidate = path.resolve(root, frame.frame);
    const relative = path.relative(root, candidate);
    if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      throw new Error(`HOST_OCR_FRAME_OUTSIDE_TARGETED_ROOT:${frame.frame}`);
    }
    return { id: frame.id, frame: frame.frame, sha256: digest(fs.readFileSync(candidate)) };
  });
  return digest(JSON.stringify(rows));
}

function writePrivate(file: string, value: unknown): void {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

export async function recoverHostOcr(options: {
  outputDir: string;
  skillDir: string;
  executeFile?: ExecuteFile;
  now?: () => Date;
}): Promise<HostOcrRecoveryResult> {
  const protocolPath = path.join(options.outputDir, "capture-protocol.json");
  const targetedPath = path.join(options.outputDir, "targeted-evidence/targeted-evidence.json");
  const ocrPath = path.join(options.outputDir, "targeted-evidence/ocr-evidence.json");
  const receiptPath = path.join(options.outputDir, "targeted-evidence/ocr-host-recovery.json");
  const protocol = fs.existsSync(protocolPath) ? fs.readFileSync(protocolPath, "utf8") : "";
  if (!/"(?:ocr_review|ui_state_review)"/.test(protocol)) {
    return { attempted: false, recoveredText: false, reason: "protocol_does_not_request_ocr", receipt: null };
  }
  if (!fs.existsSync(targetedPath)) return { attempted: false, recoveredText: false, reason: "targeted_manifest_missing", receipt: null };
  const targeted = readJson(targetedPath) as TargetedArtifact | null;
  if (!targeted) return { attempted: false, recoveredText: false, reason: "targeted_manifest_invalid", receipt: null };
  const beforeValue = fs.existsSync(ocrPath) ? readJson(ocrPath) : null;
  if (!retryableArtifact(beforeValue, targeted)) {
    return { attempted: false, recoveredText: false, reason: "ocr_not_host_retryable", receipt: null };
  }

  const manifestSha256 = digest(fs.readFileSync(targetedPath));
  const frameSetSha256 = frameSetFingerprint(targetedPath, targeted);
  const attemptKey = digest(`${manifestSha256}:${frameSetSha256}`);
  const prior = readJson(receiptPath) as HostOcrRecoveryReceipt | null;
  if (prior?.schemaVersion === "video-ocr-host-recovery@1" && prior.attemptKey === attemptKey) {
    return { attempted: false, recoveredText: prior.status === "recovered_text", reason: "host_attempt_already_recorded", receipt: prior };
  }

  const beforeBytes = fs.existsSync(ocrPath) ? fs.readFileSync(ocrPath) : null;
  const beforeSha = beforeBytes ? digest(beforeBytes) : null;
  let beforeCopy: string | null = null;
  if (beforeBytes) {
    beforeCopy = path.join(options.outputDir, `targeted-evidence/ocr-evidence.before-host-${beforeSha!.slice(0, 12)}.json`);
    if (!fs.existsSync(beforeCopy)) fs.writeFileSync(beforeCopy, beforeBytes, { mode: 0o600 });
    fs.chmodSync(beforeCopy, 0o600);
  }
  const attemptOutput = path.join(options.outputDir, `targeted-evidence/ocr-evidence.host-${attemptKey.slice(0, 12)}.json`);
  let afterValue: unknown = null;
  let error: string | null = null;
  try {
    await (options.executeFile ?? runFile)(process.execPath, [path.join(options.skillDir, "scripts/run-ocr.mjs"),
      "--manifest", targetedPath, "--out", attemptOutput], { cwd: options.outputDir, timeout: 10 * 60_000 });
    afterValue = readJson(attemptOutput);
    if (!afterValue) throw new Error("HOST_OCR_OUTPUT_INVALID");
  } catch (caught) {
    error = caught instanceof Error ? caught.message : String(caught);
  }
  const beforeSummary = summary(beforeValue);
  const afterSummary = summary(afterValue);
  const beforeLines = lineKeys(beforeValue);
  const hasNewLine = [...lineKeys(afterValue)].some((line) => !beforeLines.has(line));
  const recoveredText = error === null && coversTargetedFrames(afterValue, targeted)
    && hasNewLine;
  if (recoveredText) {
    fs.renameSync(attemptOutput, ocrPath);
    fs.chmodSync(ocrPath, 0o600);
  }
  const effectiveAfterPath = recoveredText ? ocrPath : fs.existsSync(attemptOutput) ? attemptOutput : null;
  const effectiveAfterSha = effectiveAfterPath ? digest(fs.readFileSync(effectiveAfterPath)) : null;
  const receipt: HostOcrRecoveryReceipt = {
    schemaVersion: "video-ocr-host-recovery@1",
    attemptedAt: (options.now ?? (() => new Date()))().toISOString(), attemptKey, manifestSha256, frameSetSha256,
    before: { path: beforeCopy, sha256: beforeSha, ...beforeSummary },
    after: { path: effectiveAfterPath, sha256: effectiveAfterSha, ...afterSummary },
    status: error ? "host_failed" : recoveredText ? "recovered_text" : "no_new_text", error
  };
  writePrivate(receiptPath, receipt);
  return { attempted: true, recoveredText, reason: receipt.status, receipt };
}

export function immutableOcrRecoveryFingerprints(outputDir: string): Record<string, string> {
  const roots = ["post-source-input.json", "media-preparation.json", "evidence", "capture-protocol.json", "targeted-evidence"];
  const result: Record<string, string> = {};
  const visit = (relative: string): void => {
    const full = path.join(outputDir, relative);
    if (!fs.existsSync(full)) return;
    const stat = fs.lstatSync(full);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(full).sort()) visit(path.join(relative, name));
    } else if (stat.isFile()) result[relative.split(path.sep).join("/")] = digest(fs.readFileSync(full));
  };
  for (const root of roots) visit(root);
  return result;
}

export function assertOcrRecoveryInputsUnchanged(expected: Record<string, string>, outputDir: string): void {
  const actual = immutableOcrRecoveryFingerprints(outputDir);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("OCR_RECOVERY_IMMUTABLE_INPUT_MUTATED");
}
