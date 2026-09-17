#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const valid = join(here, "fixtures/valid");
const invalid = join(here, "fixtures/invalid");
const validator = join(root, "scripts/validate-reconstruction.mjs");
const schemaValidator = join(root, "scripts/validate-schemas.py");
const outputDir = mkdtempSync(join(tmpdir(), "video-reconstruction-skill-test-"));
const validReportPath = join(outputDir, "valid-gate-report.json");
const invalidReportPath = join(outputDir, "invalid-gate-report.json");
process.on("exit", () => rmSync(outputDir, { recursive: true, force: true }));

for (const dir of [join(root, "schemas"), valid, invalid]) {
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".json"))) JSON.parse(readFileSync(join(dir, file), "utf8"));
}

const common = [
  validator,
  "--evidence", join(valid, "evidence-pack.json"),
  "--targeted", join(valid, "targeted-evidence.json"),
  "--probe", join(valid, "probe.json"),
  "--protocol", join(valid, "capture-protocol.json"),
  "--evaluation", join(valid, "evaluation.json"),
  "--ocr", join(valid, "ocr-evidence.json")
];

const validSchemaRun = spawnSync("python3", [schemaValidator,
  "--probe", join(valid, "probe.json"),
  "--protocol", join(valid, "capture-protocol.json"),
  "--reconstruction", join(valid, "reconstruction.json"),
  "--evaluation", join(valid, "evaluation.json"),
  "--ocr", join(valid, "ocr-evidence.json")
], { encoding: "utf8" });
if (validSchemaRun.status !== 0) throw new Error(`valid schema fixture failed\n${validSchemaRun.stdout}\n${validSchemaRun.stderr}`);

const v2Protocol = JSON.parse(readFileSync(join(valid, "capture-protocol.json"), "utf8"));
v2Protocol.schemaVersion = "capture-protocol-2.0";
for (const action of v2Protocol.captureActions) {
  action.consumers = ["content_restoration", "directing_logic", "visual_editing"];
  action.presentationIntent = "single_frame";
}
const v2Reconstruction = JSON.parse(readFileSync(join(valid, "reconstruction.json"), "utf8"));
v2Reconstruction.schemaVersion = "video-reconstruction-2.0";
v2Reconstruction.builderLenses = JSON.parse(readFileSync(join(valid, "builder-lenses-v2.json"), "utf8"));
const v2ProtocolPath = join(outputDir, "capture-protocol-v2.json");
const v2ReconstructionPath = join(outputDir, "reconstruction-v2.json");
writeFileSync(v2ProtocolPath, JSON.stringify(v2Protocol));
writeFileSync(v2ReconstructionPath, JSON.stringify(v2Reconstruction));
const v2SchemaRun = spawnSync("python3", [schemaValidator,
  "--probe", join(valid, "probe.json"), "--protocol", v2ProtocolPath, "--reconstruction", v2ReconstructionPath
], { encoding: "utf8" });
if (v2SchemaRun.status !== 0) throw new Error(`valid V2 schema fixture failed\n${v2SchemaRun.stdout}\n${v2SchemaRun.stderr}`);

const invalidSchemaRun = spawnSync("python3", [schemaValidator,
  "--probe", join(valid, "probe.json"),
  "--protocol", join(valid, "capture-protocol.json"),
  "--reconstruction", join(invalid, "reconstruction.json")
], { encoding: "utf8" });
if (invalidSchemaRun.status !== 2) throw new Error(`invalid schema fixture did not fail as expected\n${invalidSchemaRun.stdout}\n${invalidSchemaRun.stderr}`);

const validRun = spawnSync(process.execPath, [...common, "--reconstruction", join(valid, "reconstruction.json"), "--out", validReportPath], { encoding: "utf8" });
if (validRun.status !== 0) throw new Error(`valid fixture failed\n${validRun.stdout}\n${validRun.stderr}`);

const audioEvidence = JSON.parse(readFileSync(join(valid, "evidence-pack.json"), "utf8"));
audioEvidence.media.hasAudio = true;
const audioEvidencePath = join(outputDir, "audio-evidence-pack.json");
writeFileSync(audioEvidencePath, JSON.stringify(audioEvidence));
const runAudioCarrierCase = (name, carrier) => {
  const audioProbe = JSON.parse(readFileSync(join(valid, "probe.json"), "utf8"));
  audioProbe.informationCarriers.push({
    id: "CAR-AUDIO-NONSEMANTIC", name: "非语音音频", modalityKeys: ["audio"],
    discoveredIn: ["SWEEP-001", "SWEEP-002"], roles: ["环境与节奏载体"], intervals: [{ start: 0, end: 10 }],
    omissionImpact: "无法判断非语音音频是否承载意义", ...carrier
  });
  const probePath = join(outputDir, `${name}-probe.json`);
  const reportPath = join(outputDir, `${name}-gate-report.json`);
  writeFileSync(probePath, JSON.stringify(audioProbe));
  spawnSync(process.execPath, [validator, "--evidence", audioEvidencePath, "--targeted", join(valid, "targeted-evidence.json"),
    "--probe", probePath, "--protocol", join(valid, "capture-protocol.json"), "--evaluation", join(valid, "evaluation.json"),
    "--ocr", join(valid, "ocr-evidence.json"), "--reconstruction", join(valid, "reconstruction.json"), "--out", reportPath], { encoding: "utf8" });
  return JSON.parse(readFileSync(reportPath, "utf8")).gates.find((gate) => gate.id === "full_timeline_carrier_sweep");
};
const chineseUnreadableAudio = runAudioCarrierCase("chinese-unreadable-audio", {
  available: true, inspected: true, inspectionStatus: "checked_unreadable",
  inspectionRationale: "已检查 AAC 技术元数据，但没有可读的非语音音频语义证据。"
});
if (!chineseUnreadableAudio.pass) throw new Error(`Chinese checked-unreadable audio carrier was not recognized: ${JSON.stringify(chineseUnreadableAudio)}`);
for (const [name, carrier] of [
  ["absent-audio", { available: false, inspected: false, inspectionStatus: "absent", inspectionRationale: "未发现非语音音频载体。" }],
  ["unchecked-audio", { available: true, inspected: false, inspectionStatus: "unchecked", inspectionRationale: "尚未检查非语音音频。" }],
  ["generic-audio", { id: "CAR-AUDIO", name: "audio", available: true, inspected: true, inspectionStatus: "checked_readable", inspectionRationale: "只检查了通用音轨。" }]
]) {
  const gate = runAudioCarrierCase(name, carrier);
  if (gate.pass || !gate.examples.includes("non_speech_audio:not_explicitly_inspected")) {
    throw new Error(`${name} incorrectly closed non-speech audio: ${JSON.stringify(gate)}`);
  }
}

const validV2ReportPath = join(outputDir, "valid-v2-gate-report.json");
const validV2Run = spawnSync(process.execPath, [
  validator,
  "--evidence", join(valid, "evidence-pack.json"),
  "--targeted", join(valid, "targeted-evidence.json"),
  "--probe", join(valid, "probe.json"),
  "--protocol", v2ProtocolPath,
  "--evaluation", join(valid, "evaluation.json"),
  "--ocr", join(valid, "ocr-evidence.json"),
  "--reconstruction", v2ReconstructionPath,
  "--out", validV2ReportPath
], { encoding: "utf8" });
if (validV2Run.status !== 0) throw new Error(`valid V2 gate fixture failed\n${validV2Run.stdout}\n${validV2Run.stderr}`);

const invalidRun = spawnSync(process.execPath, [...common, "--reconstruction", join(invalid, "reconstruction.json"), "--out", invalidReportPath], { encoding: "utf8" });
if (invalidRun.status !== 2) throw new Error(`invalid fixture did not fail as expected\n${invalidRun.stdout}\n${invalidRun.stderr}`);

const invalidReport = JSON.parse(readFileSync(invalidReportPath, "utf8"));
const expectedFailures = ["no_global_completeness_score", "verbatim_transcript_and_overlap", "core_evidence_references", "internal_unsupported_inference", "internal_timestamp_bounds", "coverage_matrix", "internal_meta_gate"];
for (const id of expectedFailures) if (!invalidReport.failedGateIds.includes(id)) throw new Error(`missing expected failure ${id}`);

process.stdout.write(JSON.stringify({ pass: true, validGateCount: JSON.parse(readFileSync(validReportPath, "utf8")).gates.length, invalidCaught: expectedFailures }) + "\n");
