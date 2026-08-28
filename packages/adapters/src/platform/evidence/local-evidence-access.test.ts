import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { EvidenceAvailability, EvidenceManifestEntry } from "../../../../contracts/index.js";
import { LocalEvidenceAccess } from "./local-evidence-access.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function fixture(availability: EvidenceAvailability = "available", stored = true, storedValue = "verified evidence") {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "signal-room-evidence-"));
  roots.push(root);
  const expected = Buffer.from("verified evidence");
  const hash = createHash("sha256").update(expected).digest("hex");
  const entry: EvidenceManifestEntry = {
    schemaVersion: "1.0.0",
    evidenceId: "creator/red-witch/frame-1",
    classification: "research_evidence",
    content: { sha256: hash, bytes: expected.byteLength, mediaType: "image/jpeg" },
    storage: { uri: `cas://sha256/${hash}`, availability },
    provenance: { originalPath: "artifacts/creator-research/red-witch/frame-1.jpg", capturedAt: null, producer: "migration-v1" }
  };
  const manifestPath = path.join(root, "manifest.jsonl");
  fs.writeFileSync(manifestPath, `${JSON.stringify(entry)}\n`, "utf8");
  if (stored) {
    const target = path.join(root, "store", "sha256", hash.slice(0, 2), hash);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, storedValue);
  }
  return { access: new LocalEvidenceAccess({ manifestPath, storeRoot: path.join(root, "store"), now: () => new Date("2026-08-28T00:00:00.000Z") }), entry, manifestPath };
}

describe("LocalEvidenceAccess", () => {
  it("verifies a content-addressed object before reporting it available", async () => {
    const { access } = fixture();
    await expect(access.resolve("creator/red-witch/frame-1")).resolves.toMatchObject({ availability: "available", reason: "verified" });
  });

  it("distinguishes missing, pending retrieval, and integrity failure", async () => {
    await expect(fixture("available", false).access.resolve("creator/red-witch/frame-1")).resolves.toMatchObject({ availability: "missing", reason: "object_missing" });
    await expect(fixture("pending_retrieval", false).access.resolve("creator/red-witch/frame-1")).resolves.toMatchObject({ availability: "pending_retrieval", reason: "manifest_state" });
    await expect(fixture("available", true, "corrupt evidence").access.resolve("creator/red-witch/frame-1")).resolves.toMatchObject({ availability: "integrity_failed", reason: "hash_or_size_mismatch" });
  });

  it("returns null for an ID that has no manifest entry", async () => {
    const { access } = fixture();
    await expect(access.resolve("unknown")).resolves.toBeNull();
  });

  it("reports a known object as pending retrieval when no Evidence store is configured", async () => {
    const { manifestPath } = fixture();
    const access = new LocalEvidenceAccess({ manifestPath, storeRoot: null, now: () => new Date("2026-08-28T00:00:00.000Z") });
    await expect(access.resolve("creator/red-witch/frame-1")).resolves.toMatchObject({
      availability: "pending_retrieval",
      reason: "not_materialized"
    });
  });

  it("rejects duplicate manifest ownership", () => {
    const { entry } = fixture();
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "signal-room-evidence-duplicate-"));
    roots.push(root);
    const manifestPath = path.join(root, "manifest.jsonl");
    fs.writeFileSync(manifestPath, `${JSON.stringify(entry)}\n${JSON.stringify(entry)}\n`, "utf8");
    expect(() => new LocalEvidenceAccess({ manifestPath, storeRoot: root })).toThrow(/duplicate evidenceId/u);
  });
});
