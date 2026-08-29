import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SQLiteContentKnowledgeRepository } from "../../packages/adapters/index.js";
import { ContentKnowledgeService } from "../../packages/knowledge/index.js";
import { ResearchLearningService } from "../../packages/research/index.js";
import { buildAnalysis } from "../core/report.js";
import { fixtureCollection } from "../core/fixtures.js";
import { RunStore } from "../core/store.js";
import { parseSourceUrl } from "../core/url-router.js";
import { reportEnvelopeSchema, type ReportEnvelope } from "../shared/schema.js";
import { HistoricalKnowledgeBackfillService, LocalHistoricalReportArtifactVerifier } from "./knowledge-backfill.js";

const directories: string[] = [];
afterEach(() => { for (const directory of directories.splice(0)) fs.rmSync(directory, { recursive: true, force: true }); });

function report(id: string, status: ReportEnvelope["status"] = "complete"): ReportEnvelope {
  const fixture = fixtureCollection(parseSourceUrl(`fixture://xiaohongshu/${id}`));
  if (!fixture.source) throw new Error("fixture source missing");
  const now = "2026-08-29T00:00:00.000Z";
  return reportEnvelopeSchema.parse({
    schemaVersion: "2.0.0", id, sourceUrl: fixture.source.sourceUrl, platform: fixture.source.platform,
    status, currentStage: status === "complete" ? "分析完成" : status, createdAt: now, updatedAt: now,
    stages: [], source: fixture.source, mediaBreakdown: null,
    ...buildAnalysis(fixture.source, null, fixture.context)
  });
}

describe("historical Knowledge backfill", () => {
  it("requires the canonical report artifact to match the run database revision when artifact verification is enabled", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "knowledge-backfill-artifact-"));
    directories.push(directory);
    const value = report("10000000-0000-4000-8000-000000000011");
    const artifactDirectory = path.join(directory, "runs", value.id);
    fs.mkdirSync(artifactDirectory, { recursive: true });
    fs.writeFileSync(path.join(artifactDirectory, "report.json"), JSON.stringify(value));
    const source = { listReports: () => [value] };
    const verifier = new LocalHistoricalReportArtifactVerifier(directory);
    expect(new HistoricalKnowledgeBackfillService(source, null, verifier).plan()).toMatchObject({ artifactStateChecked: true, items: [{ action: "verified_compile" }] });
    fs.writeFileSync(path.join(artifactDirectory, "report.json"), "{}", { flag: "w" });
    expect(new HistoricalKnowledgeBackfillService(source, null, verifier).plan().items[0]).toMatchObject({ action: "legacy_unverified", reason: "canonical report artifact is unreadable or invalid" });
  });

  it("can produce a dry-run plan from a read-only run database without creating Knowledge state", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "knowledge-backfill-dry-"));
    directories.push(directory);
    const runPath = path.join(directory, "self-media.sqlite");
    const writable = new RunStore(runPath);
    writable.save(report("10000000-0000-4000-8000-000000000010"));
    writable.close();
    const before = fs.statSync(runPath);
    const readOnly = new RunStore(runPath, { readOnly: true });
    const plan = new HistoricalKnowledgeBackfillService(readOnly).plan();
    readOnly.close();
    expect(plan).toMatchObject({ dryRun: true, totals: { reports: 1, verifiedCompile: 1 } });
    expect(fs.existsSync(path.join(directory, "content-knowledge.sqlite"))).toBe(false);
    expect(fs.statSync(runPath).size).toBe(before.size);
  });

  it("plans read-only, compiles resolvable reports, records unsupported lineage, skips non-final runs, and reruns idempotently", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "knowledge-backfill-"));
    directories.push(directory);
    const reports = new RunStore(path.join(directory, "self-media.sqlite"));
    const verified = report("10000000-0000-4000-8000-000000000001");
    const legacyBase = report("10000000-0000-4000-8000-000000000002", "partial");
    const legacy = reportEnvelopeSchema.parse({ ...legacyBase, findings: legacyBase.findings.map((finding, index) =>
      index === 0 ? { ...finding, evidenceRefs: ["missing.report.path"] } : finding) });
    const queued = report("10000000-0000-4000-8000-000000000003", "queued");
    for (const item of [verified, legacy, queued]) reports.save(item);

    const repository = new SQLiteContentKnowledgeRepository(path.join(directory, "content-knowledge.sqlite"));
    const research = new ResearchLearningService(undefined, undefined, repository);
    const knowledge = new ContentKnowledgeService(repository, research);
    const backfill = new HistoricalKnowledgeBackfillService(reports, knowledge);

    const plan = backfill.plan();
    expect(plan.dryRun).toBe(true);
    expect(plan.totals).toEqual({ reports: 3, verifiedCompile: 1, legacyUnverified: 1, skipped: 1, alreadyRecorded: 0 });
    expect(knowledge.projectionParity()).toMatchObject({ eventCount: 0, manifestCount: 0 });
    expect(plan.items.find((item) => item.runId === verified.id)).toMatchObject({ action: "verified_compile", evidenceRefs: expect.arrayContaining([expect.stringContaining(`run:${verified.id}:report.json#`)]) });
    expect(plan.items.find((item) => item.runId === legacy.id)).toMatchObject({ action: "legacy_unverified", evidenceRefs: [] });
    expect(plan.items.find((item) => item.runId === queued.id)).toMatchObject({ action: "skip", analysisRevisionId: null });

    const first = backfill.apply();
    expect(first.applied).toHaveLength(2);
    const legacyManifest = knowledge.listContributions("video", legacy.id)[0]!;
    expect(legacyManifest.manifest.status).toBe("legacy_unverified");
    expect(legacyManifest.contributions).toEqual([]);
    expect(knowledge.listContributions("video", verified.id)[0]?.manifest.status).toBe("quarantined");
    const beforeRerun = knowledge.projectionParity();
    const observationCount = knowledge.listKnowledge().flatMap((item) => item.research.observations).length;

    const second = backfill.apply();
    expect(second.applied.map((item) => item.manifestId)).toEqual(first.applied.map((item) => item.manifestId));
    expect(knowledge.projectionParity()).toEqual(beforeRerun);
    expect(knowledge.listKnowledge().flatMap((item) => item.research.observations)).toHaveLength(observationCount);
    expect(backfill.plan().totals.alreadyRecorded).toBe(2);

    reports.close();
    knowledge.close();
  });
});
