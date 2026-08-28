import { describe, expect, it } from "vitest";
import type { KnowledgeBinding } from "../../knowledge/index.js";
import { InMemoryContentKnowledgeRepository } from "./in-memory-content-knowledge-repository.js";

const binding: KnowledgeBinding = {
  id: "00000000-0000-4000-8000-000000000001",
  contentPackageId: "00000000-0000-4000-8000-000000000002",
  contentPackageSnapshotId: "snapshot-1",
  targetType: "evidence",
  targetId: "evidence-1",
  usage: "test",
  rationale: "contract fixture",
  status: "current",
  createdAt: "2026-08-28T00:00:00.000Z"
};

describe("InMemoryContentKnowledgeRepository contract", () => {
  it("preserves idempotent results and rejects operation-key drift", () => {
    const repository = new InMemoryContentKnowledgeRepository();
    expect(repository.saveBinding(binding, "binding:1", "hash-a")).toEqual(binding);
    expect(repository.saveBinding({ ...binding, rationale: "ignored retry" }, "binding:1", "hash-a")).toEqual(binding);
    expect(() => repository.saveBinding(binding, "binding:1", "hash-b")).toThrow("idempotency conflict");
    expect(repository.listBindings(binding.contentPackageId)).toHaveLength(1);
  });
});
