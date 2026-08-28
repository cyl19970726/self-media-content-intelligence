import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SQLiteContentKnowledgeRepository } from "../../packages/adapters/index.js";
import { ContentKnowledgeService } from "../../packages/knowledge/index.js";
import { ResearchLearningService } from "../../packages/research/index.js";
import { SinglePostKnowledgeCompiler } from "./analysis-knowledge-compiler.js";
import { AnalysisService } from "../core/service.js";
import { RunStore } from "../core/store.js";

const directories: string[] = [];
afterEach(() => { for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true }); });

describe("single-post knowledge compiler", () => {
  it("automatically emits one idempotent manifest after analysis completion", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "single-post-knowledge-"));
    directories.push(directory);
    const repository = new SQLiteContentKnowledgeRepository(path.join(directory, "knowledge.sqlite"));
    const research = new ResearchLearningService(undefined, undefined, repository);
    const knowledge = new ContentKnowledgeService(repository, research);
    const service = new AnalysisService(new RunStore(path.join(directory, "runs.sqlite")), new SinglePostKnowledgeCompiler(knowledge));
    const report = await service.createAndRun("fixture://xiaohongshu/three-layer-demo");
    const first = knowledge.listContributions("video", report.id);
    expect(first).toHaveLength(1);
    expect(first[0]?.manifest.compilerPolicyVersion).toBe("single-post-report-v1");
    expect(first[0]?.contributions.length).toBeGreaterThan(0);
    new SinglePostKnowledgeCompiler(knowledge).publish(report);
    expect(knowledge.listContributions("video", report.id)).toHaveLength(1);
    expect(knowledge.listKnowledge().length).toBeGreaterThan(0);
    service.close(); knowledge.close();
  });
});
