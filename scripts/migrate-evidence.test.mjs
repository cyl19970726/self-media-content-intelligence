import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assertSafeTarget, classification, evidenceId, mediaType, migrateOne, readManifest, shouldMigrate, verifyEntry, writeManifestDirectory } from "./migrate-evidence.mjs";

const roots = [];
afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });

describe("Evidence migration tooling", () => {
  it("classifies the single curated example separately from research Evidence", () => {
    expect(classification("artifacts/content-concepts/example.json")).toBe("example");
    expect(shouldMigrate("artifacts/content-concepts/example.json")).toBe(false);
    expect(shouldMigrate("artifacts/creator-research/frame.jpg")).toBe(true);
    expect(evidenceId("artifacts/creator-research/frame.jpg")).toBe("creator-research/frame.jpg");
    expect(mediaType("artifacts/creator-research/frame.jpg")).toBe("image/jpeg");
  });

  it("rejects repository-contained and broad targets", () => {
    const repository = path.join(os.tmpdir(), "signal-room-repository");
    expect(() => assertSafeTarget(repository, repository)).toThrow(/broad Evidence target/u);
    expect(() => assertSafeTarget(path.join(repository, "evidence"), repository)).toThrow(/independent/u);
    expect(() => assertSafeTarget(os.homedir(), repository)).toThrow(/broad Evidence target/u);
  });

  it("copies into CAS, creates a hard-linked compatibility view, and verifies both", async () => {
    const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "signal-room-source-"));
    const targetRoot = fs.mkdtempSync(path.join(os.tmpdir(), "signal-room-target-"));
    roots.push(sourceRoot, targetRoot);
    const originalPath = "artifacts/creator-research/demo/frame.jpg";
    const source = path.join(sourceRoot, originalPath);
    fs.mkdirSync(path.dirname(source), { recursive: true });
    fs.writeFileSync(source, "evidence bytes", "utf8");
    const entry = await migrateOne({ originalPath, bytes: 14, gitBlob: "fixture" }, targetRoot, sourceRoot);
    await expect(verifyEntry(entry, targetRoot)).resolves.toBeUndefined();
    const object = path.join(targetRoot, "sha256", entry.content.sha256.slice(0, 2), entry.content.sha256);
    const view = path.join(targetRoot, "view", originalPath);
    expect(fs.statSync(object).ino).toBe(fs.statSync(view).ino);
  });

  it("writes hash-indexed Manifest shards and verifies them on read", async () => {
    const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "signal-room-manifest-source-"));
    const targetRoot = fs.mkdtempSync(path.join(os.tmpdir(), "signal-room-manifest-target-"));
    roots.push(sourceRoot, targetRoot);
    const entries = [];
    for (const name of ["one.jpg", "two.jpg"]) {
      const originalPath = `artifacts/creator-research/demo/${name}`;
      const source = path.join(sourceRoot, originalPath);
      fs.mkdirSync(path.dirname(source), { recursive: true });
      fs.writeFileSync(source, name, "utf8");
      entries.push(await migrateOne({ originalPath, bytes: Buffer.byteLength(name), gitBlob: "fixture" }, targetRoot, sourceRoot));
    }
    const manifest = path.join(targetRoot, "manifest");
    const index = writeManifestDirectory(manifest, entries, { artifactTree: "fixture", chunkSize: 1 });
    expect(index.shards).toHaveLength(2);
    expect(readManifest(manifest)).toEqual(entries);
    fs.appendFileSync(path.join(manifest, "part-0001.jsonl"), "corruption");
    expect(() => readManifest(manifest)).toThrow(/shard hash mismatch/u);
  });
});
