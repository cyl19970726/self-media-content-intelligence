import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  archiveRuntimeReviewArtifacts,
  decideReconstructionRepair,
  normalizeRuntimeLensEvidence,
  shouldRefreshOcrEvidence
} from "./codex-video-reconstruction-executor.js";

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
