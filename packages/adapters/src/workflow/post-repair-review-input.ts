import fs from "node:fs";
import path from "node:path";
import type { ArtifactRef } from "@signal-room/workflow";
import { artifactPath } from "../core/artifacts.js";
import { fileDigest } from "./research-inputs.js";

export type BoundReviewInput = { evaluation: ArtifactRef; payload: Record<string, unknown>; outcome: Record<string, unknown>;
  parentRunId: string; reviewStepId: string };

const predecessorEntries = ["evaluation.json", "evaluation.md", "gate-report.json", "evaluator-run.json",
  "evaluator-1-last-message.txt", "evaluator-1-trace.json", "evaluator-evidence", "runtime-three-lens",
  "runtime-three-lens-evaluation.json", "runtime-three-lens-gate-report.json"] as const;

export function archivePredecessorEvaluation(directory: string, sourceArtifactRef: string): void {
  const present = predecessorEntries.filter((entry) => fs.existsSync(path.join(directory, entry)));
  if (!present.length) return;
  const archiveRoot = path.join(directory, "predecessor-evaluation");
  const archive = path.join(archiveRoot, "immediate-predecessor");
  // A copied repair candidate can already carry the evaluation of its own
  // predecessor. Preserve that lineage before installing this candidate as the
  // new immediate predecessor; otherwise a directory such as
  // evaluator-evidence makes renameSync fail with ENOTEMPTY.
  if (fs.existsSync(archive)) {
    const earlierPredecessors = path.join(archiveRoot, "earlier-predecessors");
    fs.mkdirSync(earlierPredecessors, { recursive: true });
    let generation = 1;
    let destination = path.join(earlierPredecessors, `generation-${String(generation).padStart(4, "0")}`);
    while (fs.existsSync(destination)) {
      generation += 1;
      destination = path.join(earlierPredecessors, `generation-${String(generation).padStart(4, "0")}`);
    }
    fs.renameSync(archive, destination);
  }
  fs.mkdirSync(archive, { recursive: true });
  for (const entry of present) fs.renameSync(path.join(directory, entry), path.join(archive, entry));
  fs.writeFileSync(path.join(archive, "provenance.json"), JSON.stringify({ schemaVersion: "predecessor-evaluation-provenance@1",
    sourceCandidateArtifactRef: sourceArtifactRef, archivedEntries: present }, null, 2));
}

export function materializeBoundReview(directory: string, bound: BoundReviewInput): Record<string, unknown> {
  const reviewDirectory = path.join(directory, "review-input");
  fs.mkdirSync(reviewDirectory, { recursive: true });
  const assets: Record<string, string> = {};
  const fingerprints: Record<string, string> = {};
  const refs = { evaluation: bound.outcome.evaluationArtifactRef, gateReport: bound.outcome.gateReportArtifactRef,
    runtimeThreeLensEvaluation: bound.outcome.threeLensEvaluationArtifactRef,
    runtimeThreeLensGateReport: bound.outcome.threeLensGateReportArtifactRef };
  for (const [name, ref] of Object.entries(refs)) {
    if (typeof ref !== "string") continue;
    const source = artifactPath(ref);
    if (!fs.existsSync(source)) throw new Error(`POST_REPAIR_REVIEW_ASSET_MISSING:${name}`);
    const destination = path.join(reviewDirectory, path.basename(source));
    fs.copyFileSync(source, destination); assets[name] = destination; fingerprints[name] = fileDigest(source);
  }
  const evaluationSource = typeof refs.evaluation === "string" ? artifactPath(refs.evaluation) : null;
  if (!evaluationSource) throw new Error("POST_REPAIR_REVIEW_ASSET_MISSING:evaluation");
  const sourceBase = path.dirname(evaluationSource);
  for (const name of ["evaluation.md", "evaluator-run.json", "evaluator-1-last-message.txt", "evaluator-1-trace.json", "evaluator-evidence"] as const) {
    const source = path.join(sourceBase, name);
    if (!fs.existsSync(source)) continue;
    const destination = path.join(reviewDirectory, name);
    fs.cpSync(source, destination, { recursive: true }); assets[name] = destination;
    if (fs.statSync(source).isFile()) fingerprints[name] = fileDigest(source);
    else for (const file of fs.readdirSync(source, { recursive: true }).map(String).sort()) {
      const absolute = path.join(source, file);
      if (fs.statSync(absolute).isFile()) fingerprints[`${name}/${file}`] = fileDigest(absolute);
    }
  }
  const evaluation = bound.payload.evaluation;
  if (assets.evaluation && JSON.stringify(JSON.parse(fs.readFileSync(assets.evaluation, "utf8"))) !== JSON.stringify(evaluation)) {
    throw new Error("POST_REPAIR_EVALUATION_BYTES_MISMATCH");
  }
  const provenancePath = path.join(reviewDirectory, "provenance.json");
  fs.writeFileSync(provenancePath, JSON.stringify({ schemaVersion: "post-repair-review-input@1", parentRunId: bound.parentRunId,
    reviewStepId: bound.reviewStepId, evaluationArtifact: { id: bound.evaluation.id, revision: bound.evaluation.revision,
      sha256: bound.evaluation.sha256 }, sourceBase, assets, fingerprints }, null, 2));
  return { evaluationArtifact: bound.evaluation, evaluation, outcome: bound.outcome, assets, provenancePath };
}
