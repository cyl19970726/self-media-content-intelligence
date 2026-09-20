import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  assertOcrRecoveryInputsUnchanged,
  immutableOcrRecoveryFingerprints,
  recoverHostOcr,
  type HostOcrRecoveryResult
} from "./video-ocr-host-recovery.js";

function fileSha256(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

type ContinuationReceipt = {
  schemaVersion: "video-ocr-builder-continuation@1";
  ocrSha256: string;
  hostAttemptKey: string;
  status: "pending" | "completed" | "failed";
  inputCandidateSha256: string;
  afterCandidateSha256: string | null;
  error: string | null;
};

function readJson(file: string): unknown {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return null; }
}

function writePrivate(file: string, value: unknown): void {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(file, 0o600);
}

export function ocrRecoveryRepairPrompt(videoPath: string, outputDir: string): string {
  return `
You are the Builder OCR-recovery role. Read the existing candidate at ${outputDir} and source video ${videoPath}.
The Host reran OCR outside the restricted child environment for the same immutable targeted manifest and recovered new text.
Read targeted-evidence/ocr-host-recovery.json, its before artifact, the current targeted-evidence/ocr-evidence.json,
probe.json, capture-protocol.json, reconstruction.json, and only the cited frames needed to verify consequential OCR lines.

Repair only report conclusions, unknowns, evidence bindings, and content blocks materially affected by the newly available OCR.
Do not assume a predefined answer and do not rewrite unaffected analysis. Modify only reconstruction.json and, only when needed,
the matching OCR/UI carrier rationale in probe.json. Do not modify post-source-input.json, media-preparation.json, evidence/,
capture-protocol.json, targeted-evidence/, frames, OCR artifacts, article.md, or evaluator artifacts. Do not rerun OCR or capture.
Preserve source boundaries and mark any still-unreadable text unknown. Run the canonical schema validator once before finishing.
Do not create article.md or any independent evaluation/report artifact. Your only allowed writes are reconstruction.json and,
when newly recovered OCR changes its OCR/UI carrier rationale, those specific fields in probe.json.
`;
}

export async function recoverOcrWithBuilderContinuation(options: {
  outputDir: string;
  videoPath: string;
  skillDir: string;
  recover?: () => Promise<HostOcrRecoveryResult>;
  continueBuilder: (prompt: string, label: string) => Promise<unknown>;
}): Promise<HostOcrRecoveryResult> {
  const ocrPath = path.join(options.outputDir, "targeted-evidence/ocr-evidence.json");
  const candidatePath = path.join(options.outputDir, "reconstruction.json");
  const receiptPath = path.join(options.outputDir, "ocr-builder-continuation.json");
  const prior = readJson(receiptPath) as ContinuationReceipt | null;
  const currentOcrSha = fs.existsSync(ocrPath) ? fileSha256(ocrPath) : null;
  if (prior?.schemaVersion === "video-ocr-builder-continuation@1" && prior.ocrSha256 === currentOcrSha) {
    if (prior.status === "completed") {
      return { attempted: false, recoveredText: true, reason: "continuation_already_completed", receipt: null };
    }
    throw new Error(`OCR_RECOVERY_CONTINUATION_${prior.status.toUpperCase()}_REQUIRES_NEW_OCR_REVISION`);
  }
  const recovery = await (options.recover ?? (() => recoverHostOcr({
    outputDir: options.outputDir,
    skillDir: options.skillDir
  })))();
  if (!recovery.recoveredText) return recovery;

  const immutable = immutableOcrRecoveryFingerprints(options.outputDir);
  const sourceSha256 = fileSha256(options.videoPath);
  const receipt: ContinuationReceipt = {
    schemaVersion: "video-ocr-builder-continuation@1",
    ocrSha256: fileSha256(ocrPath),
    hostAttemptKey: recovery.receipt?.attemptKey ?? "injected-recovery",
    status: "pending",
    inputCandidateSha256: fileSha256(candidatePath),
    afterCandidateSha256: null,
    error: null
  };
  writePrivate(receiptPath, receipt);
  try {
    await options.continueBuilder(ocrRecoveryRepairPrompt(options.videoPath, options.outputDir), "repair-ocr-evidence");
    assertOcrRecoveryInputsUnchanged(immutable, options.outputDir);
    if (fileSha256(options.videoPath) !== sourceSha256) throw new Error("OCR_RECOVERY_SOURCE_VIDEO_MUTATED");
    receipt.status = "completed";
    receipt.afterCandidateSha256 = fileSha256(candidatePath);
    writePrivate(receiptPath, receipt);
  } catch (caught) {
    receipt.status = "failed";
    receipt.afterCandidateSha256 = fs.existsSync(candidatePath) ? fileSha256(candidatePath) : null;
    receipt.error = caught instanceof Error ? caught.message : String(caught);
    writePrivate(receiptPath, receipt);
    throw caught;
  }
  return recovery;
}
