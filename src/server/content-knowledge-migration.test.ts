import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SQLiteResearchLearningEventStore } from "../../packages/adapters/index.js";
import { ResearchLearningService } from "../../packages/research/index.js";
import { createDurableKnowledgeSystem } from "./content-knowledge.js";

const directories: string[] = [];
afterEach(() => { for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true }); });

describe("Research Learning compatibility migration", () => {
  it("copies the legacy append-only ledger without changing IDs, revisions, counts or conclusions", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "knowledge-migration-"));
    directories.push(directory);
    const legacyPath = path.join(directory, "research-learning.sqlite");
    const legacy = new ResearchLearningService(undefined, undefined, new SQLiteResearchLearningEventStore(legacyPath));
    const created = legacy.createConcept({ slug: "legacy-proof", kind: "proof_mode", name: "历史证据", definition: "保留原始事件语义。", exclusions: ["重写历史 ID。"] });
    legacy.recordObservation({ conceptId: created.concept.id, subjectType: "video", subjectId: "legacy-video", creatorId: "legacy-creator", videoId: "legacy-video", relation: "confirm", statement: "历史观察保持不变。", evidenceRefs: ["evidence:legacy"], analysisRevisionId: "legacy-analysis", confidence: "high", sourceGateState: "ready", deepReconstruction: true });
    legacy.registerDependentConclusion({ id: "legacy-conclusion", conceptIds: [created.concept.id], statement: "依赖结论保持可读。" });
    const before = legacy.get(created.concept.id)!;
    legacy.close();

    const system = createDurableKnowledgeSystem(path.join(directory, "content-knowledge.sqlite"), legacyPath);
    const after = system.researchLearning.get(created.concept.id)!;
    expect(after).toEqual(before);
    expect(system.contentKnowledge.listKnowledge()).toHaveLength(1);
    system.researchLearning.close(); system.contentKnowledge.close();
  });

  it("records prose-only history as legacy_unverified without inventing evidence", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "knowledge-legacy-"));
    directories.push(directory);
    const system = createDurableKnowledgeSystem(path.join(directory, "content-knowledge.sqlite"), path.join(directory, "missing.sqlite"));
    const manifest = system.contentKnowledge.recordLegacyUnverified({ operationKey: "legacy:prose", subjectType: "video", subjectId: "old-report", analysisRevisionId: "legacy:old-report", inputFingerprint: "sha256:old-report", reason: "prose-only report has no resolvable evidence lineage" });
    expect(manifest.status).toBe("legacy_unverified");
    expect(system.contentKnowledge.listContributions("video", "old-report")[0]?.contributions).toEqual([]);
    system.researchLearning.close(); system.contentKnowledge.close();
  });
});
