import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { reportEnvelopeSchema, type ReportEnvelope } from "../shared/schema.js";
import type { ContentKnowledgeService, KnowledgeContributionManifest } from "../../packages/knowledge/index.js";
import { isResolvableReportEvidenceRef, proposeSinglePostKnowledge } from "./analysis-knowledge-compiler.js";

export interface HistoricalReportSource {
  listReports(limit?: number): ReportEnvelope[];
}

export interface HistoricalReportArtifactVerifier {
  verify(report: ReportEnvelope): { available: boolean; reason: string };
}

export class LocalHistoricalReportArtifactVerifier implements HistoricalReportArtifactVerifier {
  constructor(private readonly runtimeDirectory: string) {}

  verify(report: ReportEnvelope): { available: boolean; reason: string } {
    const artifactPath = path.join(this.runtimeDirectory, "runs", report.id, "report.json");
    if (!fs.existsSync(artifactPath)) return { available: false, reason: "canonical report artifact is missing" };
    const stat = fs.lstatSync(artifactPath);
    if (!stat.isFile() || stat.isSymbolicLink()) return { available: false, reason: "canonical report artifact is not a regular file" };
    try {
      const artifact = reportEnvelopeSchema.parse(JSON.parse(fs.readFileSync(artifactPath, "utf8")) as unknown);
      return JSON.stringify(artifact) === JSON.stringify(report)
        ? { available: true, reason: "canonical report artifact matches the run database revision" }
        : { available: false, reason: "canonical report artifact differs from the run database revision" };
    } catch {
      return { available: false, reason: "canonical report artifact is unreadable or invalid" };
    }
  }
}

export const knowledgeBackfillItemSchema = z.object({
  runId: z.string().uuid(),
  action: z.enum(["verified_compile", "legacy_unverified", "skip"]),
  reason: z.string().min(1),
  analysisRevisionId: z.string().min(1).nullable(),
  inputFingerprint: z.string().min(1).nullable(),
  evidenceRefs: z.array(z.string().min(1)),
  existingManifestStatus: z.string().nullable()
});

export const knowledgeBackfillPlanSchema = z.object({
  schemaVersion: z.literal("knowledge-backfill-plan@1"),
  dryRun: z.boolean(),
  existingStateChecked: z.boolean(),
  artifactStateChecked: z.boolean(),
  totals: z.object({
    reports: z.number().int().nonnegative(),
    verifiedCompile: z.number().int().nonnegative(),
    legacyUnverified: z.number().int().nonnegative(),
    skipped: z.number().int().nonnegative(),
    alreadyRecorded: z.number().int().nonnegative()
  }),
  items: z.array(knowledgeBackfillItemSchema)
});

export const knowledgeBackfillResultSchema = knowledgeBackfillPlanSchema.extend({
  dryRun: z.literal(false),
  applied: z.array(z.object({
    runId: z.string().uuid(),
    action: z.enum(["verified_compile", "legacy_unverified"]),
    manifestId: z.string().uuid(),
    manifestStatus: z.string().min(1)
  }))
});

export type KnowledgeBackfillItem = z.infer<typeof knowledgeBackfillItemSchema>;
export type KnowledgeBackfillPlan = z.infer<typeof knowledgeBackfillPlanSchema>;
export type KnowledgeBackfillResult = z.infer<typeof knowledgeBackfillResultSchema>;

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function legacyIdentity(report: ReportEnvelope): { analysisRevisionId: string; inputFingerprint: string } {
  const fingerprint = hash(report);
  return {
    analysisRevisionId: `legacy:single-post:${report.id}:${fingerprint.slice(0, 16)}`,
    inputFingerprint: `sha256:${fingerprint}`
  };
}

export class HistoricalKnowledgeBackfillService {
  constructor(
    private readonly reports: HistoricalReportSource,
    private readonly knowledge: ContentKnowledgeService | null = null,
    private readonly artifacts: HistoricalReportArtifactVerifier | null = null
  ) {}

  plan(limit = 10_000): KnowledgeBackfillPlan {
    const items = this.reports.listReports(limit).map((report) => this.inspect(report));
    return knowledgeBackfillPlanSchema.parse({
      schemaVersion: "knowledge-backfill-plan@1", dryRun: true,
      existingStateChecked: this.knowledge !== null,
      artifactStateChecked: this.artifacts !== null,
      totals: this.totals(items), items
    });
  }

  apply(limit = 10_000): KnowledgeBackfillResult {
    if (!this.knowledge) throw new Error("knowledge backfill apply requires a canonical Knowledge service");
    const plan = this.plan(limit);
    const reports = new Map(this.reports.listReports(limit).map((report) => [report.id, report]));
    const applied: KnowledgeBackfillResult["applied"] = [];
    for (const item of plan.items) {
      if (item.action === "skip") continue;
      const report = reports.get(item.runId);
      if (!report) throw new Error(`backfill report disappeared during apply: ${item.runId}`);
      let manifest: KnowledgeContributionManifest;
      if (item.action === "verified_compile") {
        const proposal = proposeSinglePostKnowledge(report);
        if (proposal.analysis.analysisRevisionId !== item.analysisRevisionId || proposal.inputFingerprint !== item.inputFingerprint) {
          throw new Error(`backfill report changed after planning: ${item.runId}`);
        }
        manifest = this.knowledge.compile(proposal).manifest;
      } else {
        if (!item.analysisRevisionId || !item.inputFingerprint) throw new Error(`legacy backfill identity is missing: ${item.runId}`);
        const identity = legacyIdentity(report);
        if (identity.analysisRevisionId !== item.analysisRevisionId || identity.inputFingerprint !== item.inputFingerprint) {
          throw new Error(`backfill report changed after planning: ${item.runId}`);
        }
        manifest = this.knowledge.recordLegacyUnverified({
          operationKey: `knowledge-backfill:legacy:${item.analysisRevisionId}`,
          subjectType: "video", subjectId: item.runId,
          analysisRevisionId: item.analysisRevisionId, inputFingerprint: item.inputFingerprint,
          reason: item.reason
        });
      }
      applied.push({ runId: item.runId, action: item.action, manifestId: manifest.id, manifestStatus: manifest.status });
    }
    return knowledgeBackfillResultSchema.parse({ ...plan, dryRun: false, applied });
  }

  private inspect(report: ReportEnvelope): KnowledgeBackfillItem {
    if (!["complete", "partial"].includes(report.status)) {
      return { runId: report.id, action: "skip", reason: `run status ${report.status} is not a final analyzable report`,
        analysisRevisionId: null, inputFingerprint: null, evidenceRefs: [], existingManifestStatus: null };
    }
    const artifact = this.artifacts?.verify(report);
    if (artifact && !artifact.available) return this.legacy(report, artifact.reason);
    if (!report.source) return this.legacy(report, "final report has no frozen source snapshot");
    const eligible = report.findings.filter((finding) => finding.grade !== "inference");
    const unresolved = eligible.flatMap((finding) => finding.evidenceRefs.filter((reference) => !isResolvableReportEvidenceRef(report, reference)));
    if (eligible.some((finding) => finding.evidenceRefs.length === 0)) unresolved.push("eligible-finding-without-evidence-ref");
    if (unresolved.length > 0) return this.legacy(report, `unresolved report evidence refs: ${[...new Set(unresolved)].sort().join(", ")}`);
    const proposal = proposeSinglePostKnowledge(report);
    const existing = this.existingManifest(proposal.analysis.analysisRevisionId);
    return {
      runId: report.id, action: "verified_compile",
      reason: eligible.length === 0 ? "final report reviewed with no eligible knowledge findings" : "frozen report revision and all eligible evidence refs resolve",
      analysisRevisionId: proposal.analysis.analysisRevisionId,
      inputFingerprint: proposal.inputFingerprint,
      evidenceRefs: [...new Set(proposal.analysis.observations.flatMap((item) => item.evidenceRefs))].sort(),
      existingManifestStatus: existing?.status ?? null
    };
  }

  private legacy(report: ReportEnvelope, reason: string): KnowledgeBackfillItem {
    const identity = legacyIdentity(report);
    const existing = this.existingManifest(identity.analysisRevisionId);
    return { runId: report.id, action: "legacy_unverified", reason, ...identity,
      evidenceRefs: [], existingManifestStatus: existing?.status ?? null };
  }

  private existingManifest(analysisRevisionId: string): KnowledgeContributionManifest | null {
    return this.knowledge?.listContributions(undefined, undefined, analysisRevisionId)[0]?.manifest ?? null;
  }

  private totals(items: KnowledgeBackfillItem[]): KnowledgeBackfillPlan["totals"] {
    return {
      reports: items.length,
      verifiedCompile: items.filter((item) => item.action === "verified_compile").length,
      legacyUnverified: items.filter((item) => item.action === "legacy_unverified").length,
      skipped: items.filter((item) => item.action === "skip").length,
      alreadyRecorded: items.filter((item) => item.existingManifestStatus !== null).length
    };
  }
}
