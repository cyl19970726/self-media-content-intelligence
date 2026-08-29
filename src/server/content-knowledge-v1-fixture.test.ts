import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { projectRoot } from "../../packages/adapters/index.js";
import { seedContentKnowledgeV1Fixture } from "../../scripts/content-knowledge-v1-fixture.js";

const directories: string[] = [];

function inventory(root: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const full = path.join(entry.parentPath, entry.name);
      const stat = fs.statSync(full);
      return `${path.relative(root, full)}:${stat.size}:${stat.mtimeMs}`;
    }).sort();
}

afterEach(() => directories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true })));

describe("Content Knowledge V1 isolated fixture", () => {
  it("proves creator → comparison → Knowledge → Creation → Practice without real runtime writes", async () => {
    const realRuntime = path.join(projectRoot, ".runtime");
    const before = inventory(realRuntime);
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "content-knowledge-v1-"));
    directories.push(directory);
    const manifest = await seedContentKnowledgeV1Fixture(directory);
    expect(manifest).toMatchObject({ creatorManifestCount: 3, comparisonManifestCount: 1, conceptScope: "track_wide",
      supportingCreators: 3, supportingVideos: 9, idempotentRetryProven: true, externalSubmission: false });
    expect(manifest.practiceObservationId).toBeTruthy();
    expect(fs.existsSync(path.join(directory, "content-knowledge-v1-manifest.json"))).toBe(true);
    const after = inventory(realRuntime);
    expect(before.every((entry) => after.includes(entry))).toBe(true);
    expect(after.filter((entry) => !before.includes(entry)).every((entry) =>
      !/content-knowledge-v1|fixture-creator|fixture-local-only/u.test(entry))).toBe(true);
  });
});
