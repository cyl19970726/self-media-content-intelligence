import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { archivePredecessorEvaluation } from "./post-repair-review-input.js";

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });

function writeEvaluation(directory: string, generation: string): void {
  fs.writeFileSync(path.join(directory, "evaluation.json"), JSON.stringify({ generation }));
  fs.mkdirSync(path.join(directory, "evaluator-evidence", "frames"), { recursive: true });
  fs.writeFileSync(path.join(directory, "evaluator-evidence", "frames", `${generation}.jpg`), `${generation}-evidence`);
}

describe("archivePredecessorEvaluation", () => {
  it("keeps every inherited predecessor while replacing the immediate predecessor across repair generations", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "post-repair-predecessors-"));
    roots.push(directory);
    const predecessor = path.join(directory, "predecessor-evaluation", "immediate-predecessor");
    fs.mkdirSync(path.join(predecessor, "evaluator-evidence", "frames"), { recursive: true });
    fs.writeFileSync(path.join(predecessor, "evaluation.json"), JSON.stringify({ generation: "one" }));
    fs.writeFileSync(path.join(predecessor, "evaluator-evidence", "frames", "one.jpg"), "one-evidence");
    fs.writeFileSync(path.join(predecessor, "provenance.json"), JSON.stringify({ sourceCandidateArtifactRef: "/artifacts/run/candidate-one/reconstruction.json" }));

    writeEvaluation(directory, "two");
    archivePredecessorEvaluation(directory, "/artifacts/run/candidate-two/reconstruction.json");
    writeEvaluation(directory, "three");
    archivePredecessorEvaluation(directory, "/artifacts/run/candidate-three/reconstruction.json");

    const archiveRoot = path.join(directory, "predecessor-evaluation");
    expect(JSON.parse(fs.readFileSync(path.join(archiveRoot, "immediate-predecessor", "evaluation.json"), "utf8"))).toEqual({ generation: "three" });
    expect(fs.readFileSync(path.join(archiveRoot, "immediate-predecessor", "evaluator-evidence", "frames", "three.jpg"), "utf8")).toBe("three-evidence");
    expect(JSON.parse(fs.readFileSync(path.join(archiveRoot, "immediate-predecessor", "provenance.json"), "utf8"))).toMatchObject({
      sourceCandidateArtifactRef: "/artifacts/run/candidate-three/reconstruction.json",
    });

    const earlier = path.join(archiveRoot, "earlier-predecessors");
    expect(JSON.parse(fs.readFileSync(path.join(earlier, "generation-0001", "evaluation.json"), "utf8"))).toEqual({ generation: "one" });
    expect(fs.readFileSync(path.join(earlier, "generation-0001", "evaluator-evidence", "frames", "one.jpg"), "utf8")).toBe("one-evidence");
    expect(JSON.parse(fs.readFileSync(path.join(earlier, "generation-0001", "provenance.json"), "utf8"))).toMatchObject({
      sourceCandidateArtifactRef: "/artifacts/run/candidate-one/reconstruction.json",
    });
    expect(JSON.parse(fs.readFileSync(path.join(earlier, "generation-0002", "evaluation.json"), "utf8"))).toEqual({ generation: "two" });
    expect(fs.readFileSync(path.join(earlier, "generation-0002", "evaluator-evidence", "frames", "two.jpg"), "utf8")).toBe("two-evidence");
    expect(JSON.parse(fs.readFileSync(path.join(earlier, "generation-0002", "provenance.json"), "utf8"))).toMatchObject({
      sourceCandidateArtifactRef: "/artifacts/run/candidate-two/reconstruction.json",
    });
  });
});
