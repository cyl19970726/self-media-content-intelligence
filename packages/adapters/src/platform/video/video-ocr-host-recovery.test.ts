import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { recoverHostOcr } from "./video-ocr-host-recovery.js";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });

function fixture(): { root: string; targeted: string; ocr: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "host-ocr-recovery-"));
  roots.push(root);
  fs.mkdirSync(path.join(root, "targeted-evidence/frames"), { recursive: true });
  fs.writeFileSync(path.join(root, "capture-protocol.json"), JSON.stringify({ captureActions: [{ mode: "ocr_review" }] }));
  fs.writeFileSync(path.join(root, "targeted-evidence/frames/a.jpg"), "immutable-frame-a");
  const targeted = path.join(root, "targeted-evidence/targeted-evidence.json");
  fs.writeFileSync(targeted, JSON.stringify({ frames: [{ id: "FRAME-1", actionId: "OCR", time: 1, frame: "frames/a.jpg" }] }));
  const ocr = path.join(root, "targeted-evidence/ocr-evidence.json");
  fs.writeFileSync(ocr, JSON.stringify({ frames: [{ frameId: "FRAME-1", status: "failed", error: "nilError", lines: [] }] }));
  return { root, targeted, ocr };
}

function digest(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

describe("host OCR recovery", () => {
  it("preserves failed evidence and publishes recovered text once for one immutable manifest", async () => {
    const item = fixture();
    const beforeSha = digest(item.ocr);
    let calls = 0;
    const executeFile = async (_file: string, args: string[]) => {
      calls += 1;
      const out = args[args.indexOf("--out") + 1]!;
      fs.writeFileSync(out, JSON.stringify({ frames: [{ frameId: "FRAME-1", status: "processed", error: null,
        lines: [{ id: "OCR-1", text: "readable", confidence: 0.9, boundingBox: [0, 0, 1, 1] }] }] }));
      return { stdout: "ok", stderr: "" };
    };
    const first = await recoverHostOcr({ outputDir: item.root, skillDir: "/skill", executeFile, now: () => new Date(0) });
    expect(first).toMatchObject({ attempted: true, recoveredText: true, reason: "recovered_text" });
    expect(first.receipt?.before.sha256).toBe(beforeSha);
    expect(first.receipt?.before.path && digest(first.receipt.before.path)).toBe(beforeSha);
    expect(first.receipt?.after.lines).toBe(1);
    expect(JSON.parse(fs.readFileSync(item.ocr, "utf8")).frames[0].lines[0].text).toBe("readable");

    const second = await recoverHostOcr({ outputDir: item.root, skillDir: "/skill", executeFile });
    expect(second).toMatchObject({ attempted: false, recoveredText: false, reason: "ocr_not_host_retryable" });
    expect(calls).toBe(1);
  });

  it("records a failed host attempt without replacing evidence or retrying the same frame revision", async () => {
    const item = fixture();
    const beforeSha = digest(item.ocr);
    let calls = 0;
    const executeFile = async () => { calls += 1; throw new Error("vision unavailable"); };
    const first = await recoverHostOcr({ outputDir: item.root, skillDir: "/skill", executeFile });
    expect(first).toMatchObject({ attempted: true, recoveredText: false, reason: "host_failed" });
    expect(digest(item.ocr)).toBe(beforeSha);
    expect(first.receipt).toMatchObject({ status: "host_failed", error: "vision unavailable" });

    const second = await recoverHostOcr({ outputDir: item.root, skillDir: "/skill", executeFile });
    expect(second).toMatchObject({ attempted: false, reason: "host_attempt_already_recorded" });
    expect(calls).toBe(1);
  });

  it("does not retry processed empty text", async () => {
    const item = fixture();
    fs.writeFileSync(item.ocr, JSON.stringify({ frames: [{ frameId: "FRAME-1", status: "processed", error: null, lines: [] }] }));
    const result = await recoverHostOcr({ outputDir: item.root, skillDir: "/skill",
      executeFile: async () => { throw new Error("must not run"); } });
    expect(result).toMatchObject({ attempted: false, reason: "ocr_not_host_retryable" });
  });

  it("publishes changed OCR text even when the non-empty line count stays equal", async () => {
    const item = fixture();
    fs.writeFileSync(item.ocr, JSON.stringify({ frames: [{ frameId: "FRAME-1", status: "failed", error: "nilError",
      lines: [{ id: "OCR-1", text: "wrong" }] }] }));
    const result = await recoverHostOcr({ outputDir: item.root, skillDir: "/skill", executeFile: async (_file, args) => {
      const out = args[args.indexOf("--out") + 1]!;
      fs.writeFileSync(out, JSON.stringify({ frames: [{ frameId: "FRAME-1", status: "processed", error: null,
        lines: [{ id: "OCR-1", text: "correct" }] }] }));
      return { stdout: "ok", stderr: "" };
    } });
    expect(result).toMatchObject({ recoveredText: true, reason: "recovered_text" });
  });
});
