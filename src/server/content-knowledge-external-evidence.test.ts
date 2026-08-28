import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { LocalEvidenceAccess, SQLiteContentKnowledgeRepository } from "../../packages/adapters/index.js";
import { ContentKnowledgeService } from "../../packages/knowledge/index.js";
import { ResearchLearningService } from "../../packages/research/index.js";

const describeWithEvidence = process.env.SIGNAL_ROOM_EVIDENCE_ROOT ? describe : describe.skip;
const directories: string[] = [];
afterEach(() => { for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true }); });

describeWithEvidence("real Evidence to revisioned Knowledge", () => {
  it("verifies immutable bytes, compiles twice idempotently, reopens and rebuilds with parity", async () => {
    const evidenceId = "real-breakdown/6a6b25970000000025006eaf/analysis.json";
    const evidence = new LocalEvidenceAccess();
    const resolved = await evidence.resolve(evidenceId);
    expect(resolved?.availability).toBe("available");
    expect(resolved?.reason).toBe("verified");
    const analysisPath = path.join(process.env.SIGNAL_ROOM_EVIDENCE_ROOT!, "view", "artifacts", evidenceId);
    const analysis = JSON.parse(fs.readFileSync(analysisPath, "utf8")) as { findings: Array<{ id: string; findingType: string; confidence: "low" | "medium" | "high"; statement: string; scope: string }> };
    const finding = analysis.findings.find((item) => item.id === "F-HOOK-001")!;
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "knowledge-real-evidence-"));
    directories.push(directory);
    const databasePath = path.join(directory, "knowledge.sqlite");
    const repository = new SQLiteContentKnowledgeRepository(databasePath);
    const research = new ResearchLearningService(undefined, undefined, repository);
    const knowledge = new ContentKnowledgeService(repository, research);
    const input = {
      operationKey: "real-evidence:F-HOOK-001", compilerPolicyVersion: "real-evidence-v1",
      inputFingerprint: `sha256:${resolved!.content.sha256}`,
      evidenceGate: [{ ref: `evidence:${evidenceId}`, availability: resolved!.availability }],
      analysis: { analysisRevisionId: `real-analysis:${resolved!.content.sha256}`, subjectType: "video" as const, subjectId: "6a6b25970000000025006eaf", creatorId: "real-breakdown", videoId: "6a6b25970000000025006eaf", deepReconstruction: true,
        lensGates: { contentRestoration: "ready" as const, directingLogic: "ready" as const, visualEditingLogic: "ready" as const },
        observations: [{ concept: { slug: "visible-result-within-hook", kind: "directing_device" as const, name: "承诺后快速兑现可见结果", definition: finding.statement, exclusions: [finding.scope] }, relation: "confirm" as const, statement: finding.statement, evidenceRefs: [`evidence:${evidenceId}`], confidence: finding.confidence }] }
    };
    const first = knowledge.compile(input);
    const second = knowledge.compile(input);
    expect(second.manifest.id).toBe(first.manifest.id);
    expect(second.idempotent).toBe(true);
    const before = knowledge.projectionParity();
    knowledge.close();

    const reopenedRepository = new SQLiteContentKnowledgeRepository(databasePath);
    const reopenedResearch = new ResearchLearningService(undefined, undefined, reopenedRepository);
    const reopened = new ContentKnowledgeService(reopenedRepository, reopenedResearch);
    expect(reopened.listKnowledge({ query: "可见结果" })).toHaveLength(1);
    expect(reopened.rebuildProjections()).toEqual(before);
    expect(reopened.listContributions("video", "6a6b25970000000025006eaf")).toHaveLength(1);
    reopened.close();
  });
});
