import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SQLiteContentKnowledgeRepository, SQLitePublishingRepository } from "../../packages/adapters/index.js";
import { ContentKnowledgeService } from "../../packages/knowledge/index.js";
import { ResearchLearningService } from "../../packages/research/index.js";
import { seedTask13ReleaseFixture } from "../../scripts/task13-release-fixture.js";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe("Task 13 release fixture", () => {
  it("builds the full Knowledge to Practice lineage only inside a disposable runtime", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "signal-room-task13-"));
    directories.push(directory);
    const manifest = await seedTask13ReleaseFixture({ runtimeDirectory: directory });

    expect(fs.existsSync(path.join(directory, "task13-fixture-manifest.json"))).toBe(true);
    const repository = new SQLiteContentKnowledgeRepository(path.join(directory, "content-knowledge.sqlite"));
    const research = new ResearchLearningService(undefined, undefined, repository);
    const knowledge = new ContentKnowledgeService(repository, research);
    const publishing = new SQLitePublishingRepository(path.join(directory, "self-media.sqlite"));
    try {
      expect(knowledge.getKnowledge(manifest.currentConceptId)?.research.counts.byOrigin.firstPartyPractice.confirm).toBe(1);
      expect(knowledge.getKnowledge(manifest.staleConceptId)?.research.concept.status).toBe("invalidated");
      expect(knowledge.listInvalidations(manifest.staleConceptId)).toHaveLength(1);
      expect(knowledge.listValidations(manifest.publicationRunId).map((item) => item.status)).toEqual(["promoted"]);
      expect(publishing.getRun(manifest.publicationRunId)).toMatchObject({
        status: "published",
        contentPackageSnapshotId: manifest.frozenSnapshotId,
        receipt: { platformState: "fixture_published" }
      });
    } finally {
      publishing.close();
      knowledge.close();
    }
  });

  it("refuses ordinary paths and a non-empty temporary runtime", async () => {
    const ordinary = fs.mkdtempSync(path.join(os.tmpdir(), "ordinary-runtime-"));
    directories.push(ordinary);
    await expect(seedTask13ReleaseFixture({ runtimeDirectory: ordinary })).rejects.toThrow("OS temporary directory");

    const nonEmpty = fs.mkdtempSync(path.join(os.tmpdir(), "signal-room-task13-"));
    directories.push(nonEmpty);
    fs.writeFileSync(path.join(nonEmpty, "keep.txt"), "do not overwrite");
    await expect(seedTask13ReleaseFixture({ runtimeDirectory: nonEmpty })).rejects.toThrow("must start empty");
    expect(fs.readFileSync(path.join(nonEmpty, "keep.txt"), "utf8")).toBe("do not overwrite");

    const outsideTemporaryRoot = path.join(process.cwd(), `signal-room-task13-${Date.now()}`);
    fs.mkdirSync(outsideTemporaryRoot);
    directories.push(outsideTemporaryRoot);
    await expect(seedTask13ReleaseFixture({ runtimeDirectory: outsideTemporaryRoot })).rejects.toThrow("must be inside");
  });
});
