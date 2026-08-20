import fs from "node:fs";
import path from "node:path";
import { runArtifactDir } from "./config.js";

export function artifactRef(runId: string, filename: string): string {
  return `/artifacts/${runId}/${filename}`;
}

export function artifactPath(reference: string): string {
  const match = reference.match(/^\/artifacts\/([0-9a-f-]+)\/(.+)$/i);
  if (!match?.[1] || !match[2]) throw new Error(`无法解析 artifact reference: ${reference}`);
  const root = path.resolve(runArtifactDir(match[1]));
  const resolved = path.resolve(root, match[2]);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("artifact reference 超出运行目录");
  }
  return resolved;
}

export function writeArtifact(runId: string, filename: string, value: unknown): string {
  const directory = runArtifactDir(runId);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, filename), JSON.stringify(value, null, 2), "utf8");
  return artifactRef(runId, filename);
}
