import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assembleHostOwnedReconstruction } from "./video-reconstruction-host-assembler.js";

const fixtures = path.join(process.cwd(), ".agents", "skills", "video-content-reconstruction", "tests", "fixtures", "valid");

function createFixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "host-video-assembly-"));
  fs.mkdirSync(path.join(root, "evidence"), { recursive: true });
  fs.copyFileSync(path.join(fixtures, "evidence-pack.json"), path.join(root, "evidence/evidence-pack.json"));
  fs.copyFileSync(path.join(fixtures, "probe.json"), path.join(root, "probe.json"));
  fs.copyFileSync(path.join(fixtures, "reconstruction.json"), path.join(root, "reconstruction.json"));
  return root;
}

describe("Host-owned video reconstruction assembly", () => {
  it("restores frozen cue fields and normalizes mechanical carrier state without changing semantic units", () => {
    const root = createFixture();
    try {
      const reconstructionPath = path.join(root, "reconstruction.json");
      const reconstruction = JSON.parse(fs.readFileSync(reconstructionPath, "utf8"));
      const originalUnits = structuredClone(reconstruction.knowledgeUnits);
      reconstruction.transcript.cues[0].representativeFrame = "invented-frame-id";
      reconstruction.coverageMatrix.channels[0] = {
        ...reconstruction.coverageMatrix.channels[0], available: false, inspected: false,
        inspectionStatus: "checked_readable"
      };
      reconstruction.metaGate.question = "Localized display question";
      delete reconstruction.metaGate.questionId;
      fs.writeFileSync(reconstructionPath, JSON.stringify(reconstruction));

      const report = assembleHostOwnedReconstruction(root);
      const assembled = JSON.parse(fs.readFileSync(reconstructionPath, "utf8"));
      expect(report.transcriptCuesRestored).toBe(2);
      expect(assembled.transcript.cues[0].representativeFrame).toBe("frames/cues/cue-001.jpg");
      expect(assembled.coverageMatrix.channels[0]).toMatchObject({ available: true, inspected: true, inspectionStatus: "checked_readable" });
      expect(assembled.metaGate).toMatchObject({ questionId: "uncovered_information_audit", question: "Localized display question" });
      expect(assembled.knowledgeUnits).toEqual(originalUnits);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps invalid sweep provenance as a warning rather than deleting the candidate", () => {
    const root = createFixture();
    try {
      const probePath = path.join(root, "probe.json");
      const probe = JSON.parse(fs.readFileSync(probePath, "utf8"));
      probe.informationCarriers[0].discoveredIn = ["media-preparation.json"];
      fs.writeFileSync(probePath, JSON.stringify(probe));
      expect(assembleHostOwnedReconstruction(root).probeWarnings)
        .toContain("probe_carrier_sweep_trace:CAR-SPEECH");
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("synchronizes a matching Builder rationale into the probe without changing semantic units", () => {
    const root = createFixture();
    try {
      const probePath = path.join(root, "probe.json");
      const reconstructionPath = path.join(root, "reconstruction.json");
      const probe = JSON.parse(fs.readFileSync(probePath, "utf8"));
      const reconstruction = JSON.parse(fs.readFileSync(reconstructionPath, "utf8"));
      const originalUnits = structuredClone(reconstruction.knowledgeUnits);
      delete probe.informationCarriers[0].inspectionRationale;
      probe.informationCarriers[0].inspectionStatus = "unchecked";
      probe.informationCarriers[0].available = true;
      probe.informationCarriers[0].inspected = false;
      fs.writeFileSync(probePath, JSON.stringify(probe));

      const report = assembleHostOwnedReconstruction(root);
      const assembledProbe = JSON.parse(fs.readFileSync(probePath, "utf8"));
      const assembledReconstruction = JSON.parse(fs.readFileSync(reconstructionPath, "utf8"));
      expect(report.carrierRationalesSynchronized).toBe(1);
      expect(assembledProbe.informationCarriers[0]).toMatchObject({
        inspectionStatus: "checked_readable",
        available: true,
        inspected: true,
        inspectionRationale: "Transcript and cue timing were inspected."
      });
      expect(assembledReconstruction.knowledgeUnits).toEqual(originalUnits);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
