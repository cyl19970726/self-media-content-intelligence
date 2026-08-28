import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { artifactPath, artifactRef } from "../../core/artifacts.js";
import { runArtifactDir } from "../../core/config.js";
import type { CreatorArtifactStore } from "../../../../research/index.js";

type ArtifactRegistry = {
  schemaVersion: "1.0.0";
  runId: string;
  artifacts: Array<{
    ref: string;
    logicalName: string;
    sha256: string;
    bytes: number;
    dependencies: string[];
    createdAt: string;
  }>;
};

function versionedFilename(filename: string, sha256: string): string {
  const extension = path.extname(filename);
  const stem = extension ? filename.slice(0, -extension.length) : filename;
  return `${stem}.${sha256.slice(0, 12)}${extension}`;
}

export class LocalCreatorArtifactStore implements CreatorArtifactStore {
  write(runId: string, filename: string, value: unknown, dependencies: string[] = []): string {
    const directory = runArtifactDir(runId);
    fs.mkdirSync(directory, { recursive: true });
    const serialized = `${JSON.stringify(value, null, 2)}\n`;
    const sha256 = createHash("sha256").update(serialized).digest("hex");
    const physicalName = versionedFilename(filename, sha256);
    const reference = artifactRef(runId, physicalName);
    const target = path.join(directory, physicalName);
    if (!fs.existsSync(target)) fs.writeFileSync(target, serialized, "utf8");

    const registryPath = path.join(directory, "artifact-registry.json");
    let registry: ArtifactRegistry = { schemaVersion: "1.0.0", runId, artifacts: [] };
    try {
      registry = JSON.parse(fs.readFileSync(registryPath, "utf8")) as ArtifactRegistry;
    } catch {
      // The registry is derived control-plane state and can be rebuilt by later writes.
    }
    if (!registry.artifacts.some((entry) => entry.ref === reference)) {
      registry.artifacts.push({
        ref: reference,
        logicalName: filename,
        sha256,
        bytes: Buffer.byteLength(serialized),
        dependencies: [...new Set(dependencies)],
        createdAt: new Date().toISOString()
      });
      fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
    }
    return reference;
  }

  read(reference: string): unknown {
    const target = artifactPath(reference);
    const serialized = fs.readFileSync(target, "utf8");
    const directory = path.dirname(target);
    const registryPath = path.join(directory, "artifact-registry.json");
    if (fs.existsSync(registryPath)) {
      const registry = JSON.parse(fs.readFileSync(registryPath, "utf8")) as ArtifactRegistry;
      const entry = registry.artifacts.find((candidate) => candidate.ref === reference);
      if (!entry) throw new Error(`artifact 未登记: ${reference}`);
      const actual = createHash("sha256").update(serialized).digest("hex");
      if (actual !== entry.sha256) throw new Error(`artifact 内容校验失败: ${reference}`);
    }
    return JSON.parse(serialized) as unknown;
  }

  archiveReconstructionEvaluations(runId: string, postExternalId: string, revision: number, archiveId: string): void {
    const outputDirectory = path.join(runArtifactDir(runId), "video-reconstructions", postExternalId);
    const historyDirectory = path.join(outputDirectory, "pipeline-retry-history", `revision-${revision}-${archiveId}`);
    const evaluatorOwned = [
      "evaluation.json", "evaluation.md", "gate-report.json",
      "runtime-three-lens-evaluation.json", "runtime-three-lens-gate-report.json"
    ];
    const present = evaluatorOwned.filter((filename) => fs.existsSync(path.join(outputDirectory, filename)));
    if (present.length === 0) return;
    fs.mkdirSync(historyDirectory, { recursive: true });
    for (const filename of present) {
      fs.renameSync(path.join(outputDirectory, filename), path.join(historyDirectory, filename));
    }
  }

  reconstructionProgress(runId: string, postExternalId: string): string {
    const root = path.join(runArtifactDir(runId), "video-reconstructions", postExternalId);
    const stages = [
      ["gate-report.json", "gate_report"],
      ["evaluation.json", "independent_evaluation"],
      ["reconstruction.json", "structured_reconstruction"],
      [path.join("targeted-evidence", "targeted-evidence.json"), "targeted_capture"],
      ["capture-protocol.json", "capture_protocol"],
      ["probe.json", "round_one_probe"],
      [path.join("evidence", "evidence-pack.json"), "evidence_pack"]
    ] as const;
    return stages.find(([filename]) => fs.existsSync(path.join(root, filename)))?.[1] ?? "runner_start";
  }
}
