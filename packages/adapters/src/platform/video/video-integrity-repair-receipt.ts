import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export type IntegrityRepairTraceIdentity = {
  childRunId?: string;
  traceDir?: string;
};

export type IntegrityRepairReceipt = {
  schemaVersion: "video-integrity-repair-receipt@1";
  attempt: 1 | 2;
  status: "pending" | "completed" | "failed";
  startedAt: string;
  finishedAt: string | null;
  triggeringFailure: string;
  before: { path: string; sha256: string };
  after: { path: string | null; sha256: string | null };
  callbackTraceIdentity: IntegrityRepairTraceIdentity | null;
  error: string | null;
  incident: string | null;
};

function sha256(bytes: Buffer): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function writeExclusivePrivate(file: string, bytes: Buffer): void {
  const fd = fs.openSync(file, "wx", 0o600);
  try {
    fs.writeFileSync(fd, bytes);
    fs.fchmodSync(fd, 0o400);
  } finally {
    fs.closeSync(fd);
  }
}

function writeReceipt(file: string, receipt: IntegrityRepairReceipt): void {
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(receipt, null, 2)}\n`, { flag: "wx", mode: 0o600 });
  fs.chmodSync(temporary, 0o600);
  fs.renameSync(temporary, file);
  fs.chmodSync(file, 0o600);
}

/** Records byte-exact inputs and outputs around a caller-owned repair callback.
 * `completed` records callback completion only; it makes no claim about validation or approval.
 */
export async function withIntegrityRepairReceipt<T extends { childRunId?: string; traceDir?: string } | undefined>(options: {
  outputDir: string;
  attempt: 1 | 2;
  triggeringFailure: string;
  run: () => Promise<T>;
  now?: () => Date;
}): Promise<T> {
  const reportPath = path.join(options.outputDir, "reconstruction.json");
  const beforeBytes = fs.readFileSync(reportPath);
  const beforeSha = sha256(beforeBytes);
  const root = path.join(options.outputDir, "integrity-repairs");
  fs.mkdirSync(root, { recursive: true, mode: 0o700 });
  fs.chmodSync(root, 0o700);
  const attemptDir = path.join(root, `attempt-${options.attempt}-${crypto.randomUUID()}`);
  fs.mkdirSync(attemptDir, { mode: 0o700 });
  const relative = (name: string) => path.relative(options.outputDir, path.join(attemptDir, name));
  const beforeRelative = relative("reconstruction.before.json");
  const beforeCopy = path.join(options.outputDir, beforeRelative);
  writeExclusivePrivate(beforeCopy, beforeBytes);
  const receiptPath = path.join(attemptDir, "receipt.json");
  const receipt: IntegrityRepairReceipt = {
    schemaVersion: "video-integrity-repair-receipt@1",
    attempt: options.attempt,
    status: "pending",
    startedAt: (options.now ?? (() => new Date()))().toISOString(),
    finishedAt: null,
    triggeringFailure: options.triggeringFailure,
    before: { path: beforeRelative, sha256: beforeSha },
    after: { path: null, sha256: null },
    callbackTraceIdentity: null,
    error: null,
    incident: null
  };
  writeReceipt(receiptPath, receipt);

  const recordAfter = (): void => {
    if (!fs.existsSync(reportPath)) return;
    const bytes = fs.readFileSync(reportPath);
    const digest = sha256(bytes);
    const outputRelative = relative("reconstruction.after.json");
    writeExclusivePrivate(path.join(options.outputDir, outputRelative), bytes);
    receipt.after = { path: outputRelative, sha256: digest };
  };

  try {
    const identity = await options.run();
    const backupTampered = !fs.existsSync(beforeCopy) || sha256(fs.readFileSync(beforeCopy)) !== beforeSha;
    if (backupTampered) {
      if (fs.existsSync(beforeCopy)) fs.chmodSync(beforeCopy, 0o600);
      fs.writeFileSync(beforeCopy, beforeBytes, { flag: "w", mode: 0o600 });
      fs.chmodSync(beforeCopy, 0o400);
      receipt.incident = "INTEGRITY_REPAIR_BEFORE_SNAPSHOT_MUTATED";
    }
    if (receipt.after.path === null) recordAfter();
    receipt.callbackTraceIdentity = identity ? {
      ...(identity.childRunId ? { childRunId: identity.childRunId } : {}),
      ...(identity.traceDir ? { traceDir: identity.traceDir } : {})
    } : null;
    receipt.status = backupTampered ? "failed" : "completed";
    receipt.error = backupTampered ? receipt.incident : null;
    receipt.finishedAt = (options.now ?? (() => new Date()))().toISOString();
    writeReceipt(receiptPath, receipt);
    if (backupTampered) throw new Error(receipt.incident!);
    return identity;
  } catch (caught) {
    const backupTampered = !fs.existsSync(beforeCopy) || sha256(fs.readFileSync(beforeCopy)) !== beforeSha;
    if (backupTampered) {
      if (fs.existsSync(beforeCopy)) fs.chmodSync(beforeCopy, 0o600);
      fs.writeFileSync(beforeCopy, beforeBytes, { flag: "w", mode: 0o600 });
      fs.chmodSync(beforeCopy, 0o400);
      receipt.incident = "INTEGRITY_REPAIR_BEFORE_SNAPSHOT_MUTATED";
    }
    if (receipt.after.path === null) recordAfter();
    receipt.status = "failed";
    receipt.error = errorText(caught);
    receipt.finishedAt = (options.now ?? (() => new Date()))().toISOString();
    writeReceipt(receiptPath, receipt);
    if (backupTampered && errorText(caught) !== receipt.incident) {
      throw new AggregateError([caught, new Error(receipt.incident!)], `${errorText(caught)}; ${receipt.incident}`);
    }
    throw caught;
  }
}
