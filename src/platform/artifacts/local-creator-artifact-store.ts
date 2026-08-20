import fs from "node:fs";
import path from "node:path";
import { artifactPath, artifactRef } from "../../core/artifacts.js";
import { runArtifactDir } from "../../core/config.js";
import type { CreatorArtifactStore } from "../../modules/creator-research/artifact-store.js";

export class LocalCreatorArtifactStore implements CreatorArtifactStore {
  write(runId: string, filename: string, value: unknown): string {
    const directory = runArtifactDir(runId);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, filename), JSON.stringify(value, null, 2), "utf8");
    return artifactRef(runId, filename);
  }

  read(reference: string): unknown {
    return JSON.parse(fs.readFileSync(artifactPath(reference), "utf8")) as unknown;
  }
}
