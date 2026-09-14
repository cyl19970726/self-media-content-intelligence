import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import type { CreatorResearchBatch } from "../../../../contracts/index.js";
import { CreatorResearchBatchService, CreatorResearchService, type CreatorArtifactStore,
  type DeepMediaResolver, type VideoReconstructionExecutor, type CreatorSynthesisExecutor } from "../../../../research/index.js";
import { SQLiteCreatorResearchRepository } from "./sqlite-creator-research-repository.js";
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
  it("does not invoke intake again after another connection creates the operation", () => {
    const file = databaseFile();
    const first = new SQLiteCreatorResearchBatchRepository(file);
    const second = new SQLiteCreatorResearchBatchRepository(file);
    expect(second.getByOperationKey("race", "hash")).toBeNull();
    const original = first.create(batch(), "race", "hash");
    let calls = 0;
    expect(second.create(() => { calls++; return batch(); }, "race", "hash")).toEqual(original);
    expect(calls).toBe(0);
    first.close(); second.close();
  });

  it("rolls intake writes back with a failed batch and lets the same operation retry", () => {
    const db = new DatabaseSync(databaseFile());
    const repository = new SQLiteCreatorResearchBatchRepository(db);
    db.exec("CREATE TABLE intake_probe (id TEXT PRIMARY KEY)");
    expect(() => repository.create(() => {
      db.prepare("INSERT INTO intake_probe VALUES (?)").run("queued-run");
      throw new Error("intake interrupted");
    }, "retry", "hash")).toThrow("intake interrupted");
    expect(db.prepare("SELECT * FROM intake_probe").all()).toEqual([]);
    expect(repository.getByOperationKey("retry", "hash")).toBeNull();
    const expected = batch();
    expect(repository.create(() => expected, "retry", "hash")).toEqual(expected);
    repository.close();
    expect(db.prepare("SELECT * FROM intake_probe").all()).toEqual([]);
    db.close();
  });

  it("rolls back real run, queue and event creation if a later creator intake fails", () => {
    const db = new DatabaseSync(databaseFile());
    const runs = new SQLiteCreatorResearchRepository(db);
    const batches = new SQLiteCreatorResearchBatchRepository(db);
    const intake = new CreatorResearchService(runs, {} as CreatorArtifactStore, {} as DeepMediaResolver,
      {} as VideoReconstructionExecutor, {} as CreatorSynthesisExecutor, 3);
    let interrupted = true;
    const service = new CreatorResearchBatchService(batches, { create: (url, adapter) => {
      if (interrupted && url.endsWith("second")) throw new Error("second intake failed");
      return intake.create(url, adapter);
    } }, runs);
    const input = { operationKey: "real-rollback", name: "隔离回归", creators: ["first", "second"].map(id => ({
      profileUrl: `https://www.xiaohongshu.com/user/profile/${id}`
    })) };
    expect(() => service.create(input)).toThrow("second intake failed");
    expect(runs.list()).toEqual([]);
    expect(db.prepare("SELECT * FROM research_jobs").all()).toEqual([]);
    expect(db.prepare("SELECT * FROM research_events").all()).toEqual([]);
    expect(batches.list()).toEqual([]);
    interrupted = false;
    const result = service.create(input);
    expect(result.totalRuns).toBe(2);
    expect(service.create(input).batch.id).toBe(result.batch.id);
    expect(runs.list()).toHaveLength(2);
    intake.close(); batches.close(); db.close();
  });

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
