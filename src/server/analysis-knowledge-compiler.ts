import { createHash } from "node:crypto";
import type { AnalysisCompletionPort } from "../core/service.js";
import type { Finding, ReportEnvelope } from "../shared/schema.js";
import type { ContentKnowledgeService, KnowledgeCompilerPort } from "../../packages/knowledge/index.js";
import type { CompileKnowledgeInput } from "../../packages/knowledge/index.js";
import type { ResearchConceptKind } from "../../packages/contracts/index.js";

const POLICY_VERSION = "single-post-report-v1";

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function kindFor(finding: Finding): ResearchConceptKind {
  if (/proof|evidence|audience-demand/u.test(finding.id)) return "proof_mode";
  if (/visual|shot|edit/u.test(finding.id)) return "visual_grammar";
  if (/packaging|hook|script/u.test(finding.id)) return "directing_device";
  return "content_mechanism";
}

function slugFor(finding: Finding): string {
  return `single-post-${finding.id}`.toLocaleLowerCase().replace(/[^a-z0-9-]+/gu, "-").replace(/-+/gu, "-");
}

function evidenceValueExists(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function directEvidenceValue(root: unknown, segments: string[]): unknown {
  let current = root;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) return undefined;
      current = current[index];
    } else if (current && typeof current === "object" && segment in current) {
      current = (current as Record<string, unknown>)[segment];
    } else return undefined;
  }
  return current;
}

export function isResolvableReportEvidenceRef(report: Readonly<ReportEnvelope>, reference: string): boolean {
  const segments = reference.split(".").filter(Boolean);
  if (segments.length === 0) return false;
  if (segments[0] === "source" && segments[1] === "comments" && segments[2]) {
    return Boolean(report.source?.comments.some((comment) => comment.id === segments[2]));
  }
  if (segments[0] === "source" && segments[1] === "text" && segments[2] === "sentence" && segments[3]) {
    const index = Number(segments[3]);
    const sentences = report.source?.text.split(/(?<=[。！？!?；;])|\n+/u).map((item) => item.trim()).filter(Boolean) ?? [];
    return Number.isInteger(index) && index >= 0 && index < sentences.length;
  }
  if (segments[0] === "benchmark" && segments[1] === "metrics" && segments[2]) {
    return Boolean(report.benchmark.metrics.some((metric) => metric.key === segments[2]));
  }
  return evidenceValueExists(directEvidenceValue(report, segments));
}

export function proposeSinglePostKnowledge(report: Readonly<ReportEnvelope>): CompileKnowledgeInput {
  if (!report.source) throw new Error("single-post compilation requires a frozen source snapshot");
  const source = report.source;
  const eligible = report.findings.filter((finding) => finding.grade !== "inference" && finding.evidenceRefs.length > 0);
  const fingerprint = hash({ source: report.source, findings: report.findings, media: report.mediaBreakdown, schemaVersion: report.schemaVersion });
  const analysisRevisionId = `single-post:${report.id}:${fingerprint.slice(0, 16)}`;
  const creatorId = source.author.id ?? source.author.handle ?? `author:${hash(source.author.name).slice(0, 16)}`;
  const visualGate = report.mediaBreakdown ? "ready" as const : "partial" as const;
  return {
    operationKey: `knowledge-compile:${analysisRevisionId}:${POLICY_VERSION}`,
    compilerPolicyVersion: POLICY_VERSION,
    inputFingerprint: `sha256:${fingerprint}`,
    evidenceGate: eligible.flatMap((finding) => finding.evidenceRefs.map((reference) => ({ ref: `run:${report.id}:report.json#${reference}`, availability: "available" as const }))),
    analysis: {
      analysisRevisionId,
      subjectType: "video",
      subjectId: report.id,
      creatorId,
      videoId: source.externalId,
      deepReconstruction: Boolean(report.mediaBreakdown?.shots.length),
      lensGates: { contentRestoration: "ready", directingLogic: "ready", visualEditingLogic: visualGate },
      observations: eligible.map((finding) => ({
        concept: {
          slug: slugFor(finding), kind: kindFor(finding), name: finding.title,
          definition: finding.statement,
          exclusions: Array.from(new Set([
            "缺少原帖、报告 revision 或可定位 evidence ref 的同名判断。",
            ...report.limitations.slice(0, 3)
          ]))
        },
        relation: "confirm",
        condition: {
          topic: source.tags[0] ?? undefined,
          format: source.media.some((item) => item.kind === "video") ? "video" : "post"
        },
        statement: finding.statement,
        evidenceRefs: finding.evidenceRefs.map((reference) => `run:${report.id}:report.json#${reference}`),
        confidence: finding.confidence
      }))
    }
  };
}

export class SinglePostKnowledgeCompiler implements AnalysisCompletionPort, KnowledgeCompilerPort<ReportEnvelope> {
  constructor(private readonly knowledge: ContentKnowledgeService) {}

  publish(report: ReportEnvelope): void {
    if (!report.source || !["complete", "partial"].includes(report.status)) return;
    this.knowledge.compile(this.propose(report));
  }

  propose(report: Readonly<ReportEnvelope>): CompileKnowledgeInput {
    return proposeSinglePostKnowledge(report);
  }
}
