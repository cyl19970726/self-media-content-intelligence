import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { carrierInspectionStatus, validateBuilderIntegrity } from "./video-builder-integrity.js";

const fixtureRoot = path.join(process.cwd(), ".agents", "skills", "video-content-reconstruction", "tests", "fixtures", "valid");

function sha256(file: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "builder-integrity-"));
  const videoPath = path.join(root, "source-video.mp4");
  fs.writeFileSync(videoPath, "video");
  fs.mkdirSync(path.join(root, "evidence"), { recursive: true });
  fs.mkdirSync(path.join(root, "targeted-evidence"), { recursive: true });
  fs.copyFileSync(path.join(fixtureRoot, "evidence-pack.json"), path.join(root, "evidence/evidence-pack.json"));
  fs.copyFileSync(path.join(fixtureRoot, "targeted-evidence.json"), path.join(root, "targeted-evidence/targeted-evidence.json"));
  fs.copyFileSync(path.join(fixtureRoot, "probe.json"), path.join(root, "probe.json"));
  fs.copyFileSync(path.join(fixtureRoot, "reconstruction.json"), path.join(root, "reconstruction.json"));
  const evidencePath = path.join(root, "evidence/evidence-pack.json");
  fs.writeFileSync(path.join(root, "media-preparation.json"), JSON.stringify({
    sourceMedia: { fingerprint: sha256(videoPath) },
    transcript: { path: null, fingerprint: null },
    evidencePack: { path: evidencePath, fingerprint: sha256(evidencePath) }
  }));
  return { root, videoPath };
}

describe("Builder deterministic integrity gate", () => {
  it("treats checked_unreadable as closed without claiming semantic readability", () => {
    expect(carrierInspectionStatus({
      id: "CAR-AUDIO", available: true, inspected: true,
      inspectionStatus: "checked_unreadable", inspectionRationale: "Only technical stream presence is model-readable."
    })).toBe("checked_unreadable");
  });

  it("binds every transcript cue, unit relation, evidence reference, channel, and media revision", () => {
    const item = createFixture();
    try {
      expect(validateBuilderIntegrity(item.root, item.videoPath)).toMatchObject({
        transcriptCues: 2,
        accountableCues: 2,
        knowledgeUnits: 2,
        coreUnits: 2
      });
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("rejects a plausible reconstruction that silently changes one cue", () => {
    const item = createFixture();
    try {
      const file = path.join(item.root, "reconstruction.json");
      const reconstruction = JSON.parse(fs.readFileSync(file, "utf8"));
      reconstruction.transcript.cues[0].text = "被悄悄改写的字幕";
      fs.writeFileSync(file, JSON.stringify(reconstruction));
      expect(() => validateBuilderIntegrity(item.root, item.videoPath)).toThrow("BUILDER_INTEGRITY_CUE_DRIFT");
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("requires OCR evidence to reference a recognized OCR line rather than its TARGET frame", () => {
    const item = createFixture();
    try {
      fs.writeFileSync(path.join(item.root, "targeted-evidence/ocr-evidence.json"), JSON.stringify({
        frames: [{ frameId: "TARGET-0001", time: 0.5, status: "processed", lines: [{ id: "OCR-00001" }] }]
      }));
      const file = path.join(item.root, "reconstruction.json");
      const reconstruction = JSON.parse(fs.readFileSync(file, "utf8"));
      reconstruction.knowledgeUnits[0].evidence.push({ refType: "ocr", ref: "TARGET-0001", supports: "invalid alias" });
      fs.writeFileSync(file, JSON.stringify(reconstruction));
      expect(() => validateBuilderIntegrity(item.root, item.videoPath))
        .toThrow("BUILDER_INTEGRITY_DANGLING_REFERENCE:ocr:TARGET-0001");
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("requires source evidence to use a registered derivedSources ID instead of a path", () => {
    const item = createFixture();
    try {
      const file = path.join(item.root, "reconstruction.json");
      const reconstruction = JSON.parse(fs.readFileSync(file, "utf8"));
      reconstruction.knowledgeUnits[0].evidence.push({
        refType: "source", ref: "media-preparation.json#audio", supports: "technical stream presence"
      });
      fs.writeFileSync(file, JSON.stringify(reconstruction));
      expect(() => validateBuilderIntegrity(item.root, item.videoPath))
        .toThrow("BUILDER_INTEGRITY_DANGLING_REFERENCE:source:media-preparation.json#audio");

      reconstruction.derivedSources.push({ id: "SRC-MEDIA-PREP", path: "media-preparation.json" });
      reconstruction.knowledgeUnits[0].evidence.at(-1).ref = "SRC-MEDIA-PREP";
      fs.writeFileSync(file, JSON.stringify(reconstruction));
      expect(() => validateBuilderIntegrity(item.root, item.videoPath)).not.toThrow();
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("rejects frame evidence outside its knowledge-unit time range", () => {
    const item = createFixture();
    try {
      const file = path.join(item.root, "reconstruction.json");
      const reconstruction = JSON.parse(fs.readFileSync(file, "utf8"));
      reconstruction.knowledgeUnits[0].evidence.push({
        refType: "targeted_frame", ref: "TARGET-0004", supports: "outside the unit"
      });
      fs.writeFileSync(file, JSON.stringify(reconstruction));
      expect(() => validateBuilderIntegrity(item.root, item.videoPath))
        .toThrow("BUILDER_INTEGRITY_EVIDENCE_TIME_RANGE:KU-001:TARGET-0004");
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("reports every out-of-range frame reference in one repairable failure", () => {
    const item = createFixture();
    try {
      const file = path.join(item.root, "reconstruction.json");
      const reconstruction = JSON.parse(fs.readFileSync(file, "utf8"));
      reconstruction.knowledgeUnits[0].timeRange.end = 2;
      reconstruction.knowledgeUnits[0].evidence.push(
        { refType: "targeted_frame", ref: "TARGET-0003", supports: "outside the unit" },
        { refType: "targeted_frame", ref: "TARGET-0004", supports: "outside the unit" }
      );
      fs.writeFileSync(file, JSON.stringify(reconstruction));
      expect(() => validateBuilderIntegrity(item.root, item.videoPath)).toThrow(
        "BUILDER_INTEGRITY_EVIDENCE_TIME_RANGE:KU-001:TARGET-0003,KU-001:TARGET-0004"
      );
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("rejects an inspection status that contradicts compatibility booleans", () => {
    const item = createFixture();
    try {
      const file = path.join(item.root, "reconstruction.json");
      const reconstruction = JSON.parse(fs.readFileSync(file, "utf8"));
      reconstruction.coverageMatrix.channels.push({
        id: "CAR-AUDIO", available: true, inspected: false,
        inspectionStatus: "checked_unreadable", inspectionRationale: "technical stream only"
      });
      fs.writeFileSync(file, JSON.stringify(reconstruction));
      expect(() => validateBuilderIntegrity(item.root, item.videoPath))
        .toThrow("BUILDER_INTEGRITY_CARRIER_STATUS:reconstruction:CAR-AUDIO");
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("reports every invalid carrier in one repairable failure", () => {
    const item = createFixture();
    try {
      const file = path.join(item.root, "reconstruction.json");
      const reconstruction = JSON.parse(fs.readFileSync(file, "utf8"));
      reconstruction.coverageMatrix.channels.push(
        { id: "CAR-AUDIO", available: true, inspected: true, inspectionStatus: "checked_readable", inspectionRationale: null },
        { id: "CAR-UI", available: true, inspected: true, inspectionStatus: "checked_readable", inspectionRationale: "" }
      );
      fs.writeFileSync(file, JSON.stringify(reconstruction));
      expect(() => validateBuilderIntegrity(item.root, item.videoPath))
        .toThrow("BUILDER_INTEGRITY_CARRIER_STATUS:reconstruction:CAR-AUDIO,reconstruction:CAR-UI");
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("rejects a probe carrier whose explicit inspection state lacks a rationale", () => {
    const item = createFixture();
    try {
      const file = path.join(item.root, "probe.json");
      const probe = JSON.parse(fs.readFileSync(file, "utf8"));
      delete probe.informationCarriers[0].inspectionRationale;
      fs.writeFileSync(file, JSON.stringify(probe));
      expect(() => validateBuilderIntegrity(item.root, item.videoPath))
        .toThrow("BUILDER_INTEGRITY_CARRIER_STATUS:probe:CAR-SPEECH");
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

});
