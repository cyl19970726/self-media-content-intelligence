import fs from "node:fs";
import path from "node:path";
import { runArtifactDir } from "./config.js";

export function artifactRef(runId: string, filename: string): string {
  return `/artifacts/${runId}/${filename}`;
}

export function writeArtifact(runId: string, filename: string, value: unknown): string {
  const directory = runArtifactDir(runId);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, filename), JSON.stringify(value, null, 2), "utf8");
  return artifactRef(runId, filename);
}
