import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { withIntegrityRepairReceipt } from "./video-integrity-repair-receipt.js";

const roots: string[] = [];
function makeOutput(initial: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "integrity-repair-"));
  roots.push(root);
  fs.writeFileSync(path.join(root, "reconstruction.json"), initial);
  return root;
}

function digest(bytes: Buffer): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("withIntegrityRepairReceipt", () => {
  it("keeps each attempt's exact before and after report bytes", async () => {
    const outputDir = makeOutput('{"revision":0}\n');
    const revisions = ['{"revision":1}\n', '{"revision":2}\n'];
    for (const attempt of [1, 2] as const) {
      const trace = await withIntegrityRepairReceipt({
        outputDir,
        attempt,
        triggeringFailure: `failure-${attempt}`,
        run: async () => {
          fs.writeFileSync(path.join(outputDir, "reconstruction.json"), revisions[attempt - 1]!);
          return { childRunId: `child-${attempt}` };
        }
      });
      expect(trace).toEqual({ childRunId: `child-${attempt}` });
    }

    const attempts = fs.readdirSync(path.join(outputDir, "integrity-repairs")).sort();
    expect(attempts).toHaveLength(2);
    const beforeExpected = ['{"revision":0}\n', '{"revision":1}\n'];
    const afterExpected = ['{"revision":1}\n', '{"revision":2}\n'];
    attempts.forEach((attemptDir, index) => {
      const dir = path.join(outputDir, "integrity-repairs", attemptDir);
      const receipt = JSON.parse(fs.readFileSync(path.join(dir, "receipt.json"), "utf8"));
      const before = fs.readFileSync(path.join(outputDir, receipt.before.path));
      const after = fs.readFileSync(path.join(outputDir, receipt.after.path));
      expect(before.toString()).toBe(beforeExpected[index]);
      expect(after.toString()).toBe(afterExpected[index]);
      expect(receipt.before.sha256).toBe(digest(before));
      expect(receipt.after.sha256).toBe(digest(after));
      expect(receipt.status).toBe("completed");
      expect(receipt.callbackTraceIdentity).toEqual({ childRunId: `child-${index + 1}` });
      expect(receipt).not.toHaveProperty("validated");
      expect(receipt).not.toHaveProperty("approved");
    });
  });

  it("records a failed callback and its partial report while preserving the before bytes", async () => {
    const original = '{"revision":"trusted"}\n';
    const partial = '{"revision":"partial"}\n';
    const outputDir = makeOutput(original);
    const failure = new Error("repair interrupted");
    await expect(withIntegrityRepairReceipt({
      outputDir,
      attempt: 1,
      triggeringFailure: "schema failure",
      run: async () => {
        fs.writeFileSync(path.join(outputDir, "reconstruction.json"), partial);
        throw failure;
      }
    })).rejects.toBe(failure);

    const [attemptDir] = fs.readdirSync(path.join(outputDir, "integrity-repairs"));
    const dir = path.join(outputDir, "integrity-repairs", attemptDir!);
    const receipt = JSON.parse(fs.readFileSync(path.join(dir, "receipt.json"), "utf8"));
    expect(fs.readFileSync(path.join(outputDir, receipt.before.path), "utf8")).toBe(original);
    expect(fs.readFileSync(path.join(outputDir, receipt.after.path), "utf8")).toBe(partial);
    expect(receipt.status).toBe("failed");
    expect(receipt.error).toBe("repair interrupted");
    expect(receipt.triggeringFailure).toBe("schema failure");
  });

  it("restores a tampered before snapshot and reports the integrity incident", async () => {
    const original = '{"revision":"trusted"}\n';
    const outputDir = makeOutput(original);
    await expect(withIntegrityRepairReceipt({
      outputDir,
      attempt: 1,
      triggeringFailure: "integrity failure",
      run: async () => {
        const [attemptDir] = fs.readdirSync(path.join(outputDir, "integrity-repairs"));
        const snapshot = path.join(outputDir, "integrity-repairs", attemptDir!, "reconstruction.before.json");
        fs.chmodSync(snapshot, 0o600);
        fs.writeFileSync(snapshot, "tampered");
        return { childRunId: "child-1" };
      }
    })).rejects.toThrow("INTEGRITY_REPAIR_BEFORE_SNAPSHOT_MUTATED");

    const [attemptDir] = fs.readdirSync(path.join(outputDir, "integrity-repairs"));
    const dir = path.join(outputDir, "integrity-repairs", attemptDir!);
    const receipt = JSON.parse(fs.readFileSync(path.join(dir, "receipt.json"), "utf8"));
    expect(fs.readFileSync(path.join(outputDir, receipt.before.path), "utf8")).toBe(original);
    expect(receipt.incident).toBe("INTEGRITY_REPAIR_BEFORE_SNAPSHOT_MUTATED");
    expect(receipt.status).toBe("failed");
  });
});
