#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const valid = join(here, "fixtures/valid");
const invalid = join(here, "fixtures/invalid");
const validator = join(root, "scripts/validate-reconstruction.mjs");
const schemaValidator = join(root, "scripts/validate-schemas.py");

for (const dir of [join(root, "schemas"), valid, invalid]) {
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".json"))) JSON.parse(readFileSync(join(dir, file), "utf8"));
}

const common = [
  validator,
  "--evidence", join(valid, "evidence-pack.json"),
  "--targeted", join(valid, "targeted-evidence.json"),
  "--probe", join(valid, "probe.json"),
  "--protocol", join(valid, "capture-protocol.json"),
  "--evaluation", join(valid, "evaluation.json")
];

const validSchemaRun = spawnSync("python3", [schemaValidator,
  "--probe", join(valid, "probe.json"),
  "--protocol", join(valid, "capture-protocol.json"),
  "--reconstruction", join(valid, "reconstruction.json"),
  "--evaluation", join(valid, "evaluation.json")
], { encoding: "utf8" });
if (validSchemaRun.status !== 0) throw new Error(`valid schema fixture failed\n${validSchemaRun.stdout}\n${validSchemaRun.stderr}`);

const invalidSchemaRun = spawnSync("python3", [schemaValidator,
  "--probe", join(valid, "probe.json"),
  "--protocol", join(valid, "capture-protocol.json"),
  "--reconstruction", join(invalid, "reconstruction.json")
], { encoding: "utf8" });
if (invalidSchemaRun.status !== 2) throw new Error(`invalid schema fixture did not fail as expected\n${invalidSchemaRun.stdout}\n${invalidSchemaRun.stderr}`);

const validRun = spawnSync(process.execPath, [...common, "--reconstruction", join(valid, "reconstruction.json"), "--out", join(valid, "gate-report.json")], { encoding: "utf8" });
if (validRun.status !== 0) throw new Error(`valid fixture failed\n${validRun.stdout}\n${validRun.stderr}`);

const invalidRun = spawnSync(process.execPath, [...common, "--reconstruction", join(invalid, "reconstruction.json"), "--out", join(invalid, "gate-report.json")], { encoding: "utf8" });
if (invalidRun.status !== 2) throw new Error(`invalid fixture did not fail as expected\n${invalidRun.stdout}\n${invalidRun.stderr}`);

const invalidReport = JSON.parse(readFileSync(join(invalid, "gate-report.json"), "utf8"));
const expectedFailures = ["no_global_completeness_score", "verbatim_transcript_and_overlap", "core_evidence_references", "internal_unsupported_inference", "internal_timestamp_bounds", "coverage_matrix", "internal_meta_gate"];
for (const id of expectedFailures) if (!invalidReport.failedGateIds.includes(id)) throw new Error(`missing expected failure ${id}`);

process.stdout.write(JSON.stringify({ pass: true, validGateCount: JSON.parse(readFileSync(join(valid, "gate-report.json"), "utf8")).gates.length, invalidCaught: expectedFailures }) + "\n");
