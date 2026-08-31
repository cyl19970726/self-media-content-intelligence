import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import type { CreatorResearchBatch } from "../../../../contracts/index.js";
import { SQLiteCreatorResearchBatchRepository } from "./sqlite-creator-research-batch-repository.js";

const directories: string[] = [];

afterEach(() => {
  directories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

function databaseFile(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "creator-research-batches-"));
  directories.push(directory);
  return path.join(directory, "batches.sqlite");
}

function batch(overrides: Partial<CreatorResearchBatch> = {}): CreatorResearchBatch {
  return {
    schemaVersion: "creator-research-batch@1",
    id: randomUUID(),
    name: "20 位博主分析",
    runIds: [randomUUID(), randomUUID(), randomUUID()],
    createdAt: "2026-08-31T00:00:00.000Z",
    ...overrides
  };
}

describe("SQLiteCreatorResearchBatchRepository", () => {
  it("persists the batch and its stable item order across a reopen", () => {
    const filePath = databaseFile();
    const repository = new SQLiteCreatorResearchBatchRepository(filePath);
    const expected = batch();
    repository.create(expected, "operation:create:one", "hash-one");
    repository.close();

    const reopened = new SQLiteCreatorResearchBatchRepository(filePath);
    expect(reopened.get(expected.id)).toEqual(expected);
    expect(reopened.list()).toEqual([expected]);
    expect(reopened.getByOperationKey("operation:create:one", "hash-one")).toEqual(expected);
    reopened.close();
  });

  it("returns the original batch for an identical operation without duplicating items", () => {
    const repository = new SQLiteCreatorResearchBatchRepository(databaseFile());
    const original = batch();
    const duplicatePayload = batch({ name: "不会覆盖已有结果" });
    expect(repository.create(original, "operation:idempotent", "same-hash")).toEqual(original);
    expect(repository.create(duplicatePayload, "operation:idempotent", "same-hash")).toEqual(original);
    expect(repository.list()).toHaveLength(1);
    expect(repository.get(original.id)?.runIds).toEqual(original.runIds);
    repository.close();
  });

  it("rejects reuse of an operation key for another command", () => {
    const repository = new SQLiteCreatorResearchBatchRepository(databaseFile());
    repository.create(batch(), "operation:conflict", "first-hash");
    expect(() => repository.getByOperationKey("operation:conflict", "other-hash"))
      .toThrow("idempotency conflict for operation operation:conflict");
    expect(() => repository.create(batch(), "operation:conflict", "other-hash"))
      .toThrow("idempotency conflict for operation operation:conflict");
    repository.close();
  });

  it("lists newest batches first while preserving each batch's submitted order", () => {
    const repository = new SQLiteCreatorResearchBatchRepository(databaseFile());
    const older = batch({ createdAt: "2026-08-30T00:00:00.000Z" });
    const newer = batch({ createdAt: "2026-08-31T00:00:00.000Z" });
    repository.create(older, "operation:older", "older-hash");
    repository.create(newer, "operation:newer", "newer-hash");
    expect(repository.list(1)).toEqual([newer]);
    expect(repository.get(older.id)?.runIds).toEqual(older.runIds);
    repository.close();
  });
});
