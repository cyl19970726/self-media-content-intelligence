import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  archiveRuntimeReviewArtifacts,
  decideReconstructionRepair,
  normalizeRuntimeLensEvidence,
  runCodex,
  shouldRefreshOcrEvidence
} from "./codex-video-reconstruction-executor.js";
import type { VideoReconstructionLifecycleEvent } from "../../modules/video-analysis/contracts.js";

const protocol = { captureActions: [{ mode: "ocr_review" }] };
const targeted = { frames: [{ id: "FRAME-1" }, { id: "FRAME-2" }] };

describe("video reconstruction OCR recovery", () => {
  it("retries a requested OCR pass when every frame failed", () => {
    expect(shouldRefreshOcrEvidence(protocol, targeted, {
      frames: [{ frameId: "FRAME-1", status: "failed" }, { frameId: "FRAME-2", status: "failed" }]
    })).toBe(true);
  });

  it("refreshes OCR when a repair adds targeted frames", () => {
    expect(shouldRefreshOcrEvidence(protocol, targeted, {
      frames: [{ frameId: "FRAME-1", status: "processed" }]
    })).toBe(true);
  });

  it("keeps a complete successful OCR artifact", () => {
    expect(shouldRefreshOcrEvidence(protocol, targeted, {
      frames: [{ frameId: "FRAME-1", status: "processed" }, { frameId: "FRAME-2", status: "processed" }]
    })).toBe(false);
  });

  it("does not invent an OCR requirement for a visual-only protocol", () => {
    expect(shouldRefreshOcrEvidence({ captureActions: [{ mode: "exact_times" }] }, targeted, null)).toBe(false);
  });
});

describe("runtime lens evidence normalization", () => {
  it("omits empty optional JSON pointers without changing real pointers", () => {
    expect(normalizeRuntimeLensEvidence([{ ruleId: "CR-01", evidenceRefs: [
      { refId: "artifact", jsonPointer: "" }, { refId: "unit", jsonPointer: "/knowledgeUnits/0" }
    ] }])).toEqual([{ ruleId: "CR-01", evidenceRefs: [
      { refId: "artifact" }, { refId: "unit", jsonPointer: "/knowledgeUnits/0" }
    ] }]);
  });
});

describe("runtime lens repair history", () => {
  it("keeps the runtime repair budget independent after generic repairs are exhausted", () => {
    expect(decideReconstructionRepair({
      genericReady: true,
      genericRepairsUsed: 2,
      runtimeReady: false,
      runtimeRepairsUsed: 0
    })).toBe("runtime_repair");
  });

  it("stops only after the runtime repair budget itself is exhausted", () => {
    expect(decideReconstructionRepair({
      genericReady: true,
      genericRepairsUsed: 2,
      runtimeReady: false,
      runtimeRepairsUsed: 2
    })).toBe("not_ready");
  });

  it("archives every evaluator-owned artifact while preserving the candidate", () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-lens-repair-"));
    try {
      fs.writeFileSync(path.join(outputDir, "reconstruction.json"), "candidate");
      for (const filename of [
        "evaluation.json", "evaluation.md", "gate-report.json",
        "runtime-three-lens-evaluation.json", "runtime-three-lens-gate-report.json",
        "evaluator-1-last-message.txt", "runtime-directing_logic-last-message.txt"
      ]) fs.writeFileSync(path.join(outputDir, filename), filename);
      fs.mkdirSync(path.join(outputDir, "runtime-three-lens"));
      fs.writeFileSync(path.join(outputDir, "runtime-three-lens/directing-logic.json"), "[]");

      const historyDir = archiveRuntimeReviewArtifacts(outputDir, 1);

      expect(fs.readFileSync(path.join(outputDir, "reconstruction.json"), "utf8")).toBe("candidate");
      expect(fs.existsSync(path.join(outputDir, "evaluation.json"))).toBe(false);
      expect(fs.existsSync(path.join(historyDir, "evaluation.json"))).toBe(true);
      expect(fs.existsSync(path.join(historyDir, "runtime-three-lens/directing-logic.json"))).toBe(true);
      expect(path.basename(historyDir)).toMatch(/^attempt-1-/);
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });
});

describe("child worker lifecycle", () => {
  it("reports started, stale, progress, and completed against one input revision", async () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "video-child-lifecycle-"));
    const binary = path.join(outputDir, "fake-codex.mjs");
    const previous = {
      binary: process.env.SELF_MEDIA_CODEX_BIN,
      stale: process.env.SELF_MEDIA_CHILD_STALE_MS,
      timeout: process.env.SELF_MEDIA_CHILD_TIMEOUT_MS
    };
    try {
      fs.writeFileSync(binary, `#!/usr/bin/env node\nsetTimeout(() => { process.stdout.write("working\\n"); setTimeout(() => process.exit(0), 30); }, 80);\n`);
      fs.chmodSync(binary, 0o755);
      process.env.SELF_MEDIA_CODEX_BIN = binary;
      process.env.SELF_MEDIA_CHILD_STALE_MS = "25";
      process.env.SELF_MEDIA_CHILD_TIMEOUT_MS = "5000";
      const events: VideoReconstructionLifecycleEvent[] = [];

      await runCodex("prompt", outputDir, "candidate", "source-revision-1", (event) => events.push(event));

      const statuses = events.map((event) => event.status);
      expect(statuses[0]).toBe("started");
      expect(statuses).toContain("stale");
      expect(statuses).toContain("progress");
      expect(statuses.at(-1)).toBe("completed");
      expect(statuses.indexOf("stale")).toBeLessThan(statuses.indexOf("progress"));
      expect(new Set(events.map((event) => event.childRunId)).size).toBe(1);
      expect(new Set(events.map((event) => event.inputRevision))).toEqual(new Set(["source-revision-1"]));
      expect(events.every((event) => event.role === "candidate")).toBe(true);
    } finally {
      if (previous.binary === undefined) delete process.env.SELF_MEDIA_CODEX_BIN;
      else process.env.SELF_MEDIA_CODEX_BIN = previous.binary;
      if (previous.stale === undefined) delete process.env.SELF_MEDIA_CHILD_STALE_MS;
      else process.env.SELF_MEDIA_CHILD_STALE_MS = previous.stale;
      if (previous.timeout === undefined) delete process.env.SELF_MEDIA_CHILD_TIMEOUT_MS;
      else process.env.SELF_MEDIA_CHILD_TIMEOUT_MS = previous.timeout;
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
  });
});
