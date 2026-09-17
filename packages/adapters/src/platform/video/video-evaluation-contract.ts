import fs from "node:fs";
import path from "node:path";
import { projectRoot } from "../../core/config.js";
import { runFile } from "../../core/process.js";

const skillDir = process.env.SELF_MEDIA_VIDEO_RECONSTRUCTION_SKILL_DIR ??
  path.join(projectRoot, ".agents", "skills", "video-content-reconstruction");
export type GateReport = { ready?: boolean; gates?: Array<{ id?: string; pass?: boolean }>; failedGateIds?: string[] };
const exists = (file: string) => fs.existsSync(file) && fs.statSync(file).isFile();

/** Validates an evaluator output against an immutable Builder candidate without modifying that candidate. */
export async function validateEvaluationArtifacts(candidateDir: string, evaluationDir: string): Promise<GateReport> {
  const evaluationPath = path.join(evaluationDir, "evaluation.json");
  const gatePath = path.join(evaluationDir, "gate-report.json");
  const args = [path.join(skillDir, "scripts/validate-reconstruction.mjs"),
    "--evidence", path.join(candidateDir, "evidence/evidence-pack.json"),
    "--targeted", path.join(candidateDir, "targeted-evidence/targeted-evidence.json"),
    "--probe", path.join(candidateDir, "probe.json"), "--protocol", path.join(candidateDir, "capture-protocol.json"),
    "--reconstruction", path.join(candidateDir, "reconstruction.json"), "--evaluation", evaluationPath, "--out", gatePath];
  const ocrPath = path.join(candidateDir, "targeted-evidence/ocr-evidence.json");
  if (exists(ocrPath)) args.splice(args.length - 2, 0, "--ocr", ocrPath);
  try { await runFile(process.execPath, args, { cwd: evaluationDir, timeout: 10 * 60_000 }); }
  catch { if (!exists(gatePath)) throw new Error("DETERMINISTIC_VALIDATOR_FAILED"); }
  return JSON.parse(fs.readFileSync(gatePath, "utf8")) as GateReport;
}
