import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDurableKnowledgeSystem } from "./content-knowledge.js";
import {
  KNOWLEDGE_RESTORE_CONFIRMATION, backupKnowledgeRuntime, rebuildAndVerifyKnowledgeProjection,
  restoreKnowledgeRuntime, verifyKnowledgeBackup
} from "./knowledge-recovery.js";

const directories: string[] = [];
afterEach(() => { for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true }); });

function seedRuntime(runtimeDirectory: string): void {
  const system = createDurableKnowledgeSystem(path.join(runtimeDirectory, "content-knowledge.sqlite"), path.join(runtimeDirectory, "research-learning.sqlite"));
  system.contentKnowledge.compile({
    operationKey: "recovery:seed", compilerPolicyVersion: "recovery-v1", inputFingerprint: "sha256:recovery",
    analysis: { analysisRevisionId: "recovery-analysis", subjectType: "video", subjectId: "recovery-video",
      creatorId: "recovery-creator", videoId: "recovery-video", deepReconstruction: true,
      lensGates: { contentRestoration: "ready", directingLogic: "ready", visualEditingLogic: "ready" },
      observations: [{ concept: { slug: "recovery-proof", kind: "proof_mode", name: "可恢复知识", definition: "投影可以从裁决账本重建。", exclusions: ["只存在于临时缓存。"] },
        relation: "confirm", statement: "恢复后仍能检索。", evidenceRefs: ["evidence:recovery"], confidence: "high" }] }
  });
  system.contentKnowledge.close();
  fs.writeFileSync(path.join(runtimeDirectory, "self-media.sqlite"), "historical-run-input", { flag: "wx" });
}

describe("Knowledge runtime recovery", () => {
  it("backs up, restores with recoverable displacement, and proves rebuild/reopen parity", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "knowledge-recovery-"));
    directories.push(root);
    const runtimeDirectory = path.join(root, "runtime");
    const backupRoot = path.join(root, "backups");
    fs.mkdirSync(runtimeDirectory, { recursive: true });
    seedRuntime(runtimeDirectory);

    const backup = backupKnowledgeRuntime({ runtimeDirectory, backupRoot, now: () => "2026-08-29T01:02:03.000Z" });
    expect(verifyKnowledgeBackup(backup.backupDirectory).files.map((item) => item.file).sort()).toEqual(["content-knowledge.sqlite", "self-media.sqlite"]);
    fs.writeFileSync(path.join(runtimeDirectory, "content-knowledge.sqlite"), "corrupt-state");

    expect(() => restoreKnowledgeRuntime({ backupDirectory: backup.backupDirectory, runtimeDirectory, confirmation: "wrong" })).toThrow("confirmation token");
    const restored = restoreKnowledgeRuntime({ backupDirectory: backup.backupDirectory, runtimeDirectory,
      confirmation: KNOWLEDGE_RESTORE_CONFIRMATION, now: () => "2026-08-29T02:03:04.000Z" });
    expect(restored.restoredFiles.sort()).toEqual(["content-knowledge.sqlite", "self-media.sqlite"]);
    expect(restored.displacedDirectory).not.toBeNull();
    expect(fs.readFileSync(path.join(restored.displacedDirectory!, "content-knowledge.sqlite"), "utf8")).toBe("corrupt-state");

    const verification = rebuildAndVerifyKnowledgeProjection(path.join(runtimeDirectory, "content-knowledge.sqlite"), path.join(runtimeDirectory, "research-learning.sqlite"));
    expect(verification.before).toEqual(verification.rebuilt);
    expect(verification.rebuilt).toEqual(verification.reopened);
    expect(verification).toMatchObject({ conceptCount: 1, searchVerified: true });
  });

  it("rejects in-runtime backup targets, online WAL state, and tampered backup bytes before restore", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "knowledge-recovery-safety-"));
    directories.push(root);
    const runtimeDirectory = path.join(root, "runtime");
    fs.mkdirSync(runtimeDirectory, { recursive: true });
    seedRuntime(runtimeDirectory);
    expect(() => backupKnowledgeRuntime({ runtimeDirectory, backupRoot: path.join(runtimeDirectory, "backup") })).toThrow("outside the runtime");
    fs.writeFileSync(path.join(runtimeDirectory, "content-knowledge.sqlite-wal"), "active");
    expect(() => backupKnowledgeRuntime({ runtimeDirectory, backupRoot: path.join(root, "backups") })).toThrow("offline boundary");
    fs.rmSync(path.join(runtimeDirectory, "content-knowledge.sqlite-wal"));
    const backup = backupKnowledgeRuntime({ runtimeDirectory, backupRoot: path.join(root, "backups"), now: () => "2026-08-29T03:04:05.000Z" });
    fs.appendFileSync(path.join(backup.backupDirectory, "content-knowledge.sqlite"), "tamper");
    const before = fs.readFileSync(path.join(runtimeDirectory, "content-knowledge.sqlite"));
    expect(() => restoreKnowledgeRuntime({ backupDirectory: backup.backupDirectory, runtimeDirectory, confirmation: KNOWLEDGE_RESTORE_CONFIRMATION })).toThrow("verification failed");
    expect(fs.readFileSync(path.join(runtimeDirectory, "content-knowledge.sqlite"))).toEqual(before);
  });
});
