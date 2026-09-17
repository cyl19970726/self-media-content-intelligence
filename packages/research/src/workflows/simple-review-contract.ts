import type { ArtifactRef } from "@signal-room/workflow";
import { z } from "zod";

const artifactBindingSchema = z.object({
  id: z.string().min(1), revision: z.string().min(1), sha256: z.string().min(1),
});

export const simpleReviewFindingSchema = z.object({
  id: z.string().min(1),
  location: z.string().min(1),
  issue: z.string().min(1),
  evidenceRefs: z.array(z.string().min(1)),
  suggestedChange: z.string().min(1),
  priority: z.enum(["minor", "major"]),
  kind: z.enum(["content", "missing_evidence"]),
});

/** The deliberately small reviewer contract. An empty findings array is an explicit, valid pass. */
export const researchReviewReceiptSchema = z.object({
  schemaVersion: z.literal("research-review@1"),
  kind: z.enum(["post", "creator"]),
  candidate: artifactBindingSchema,
  candidateReportSha256: z.string().min(1),
  summary: z.string().min(1),
  findings: z.array(simpleReviewFindingSchema).superRefine((findings, context) => {
    const ids = new Set<string>();
    findings.forEach((finding, index) => {
      if (ids.has(finding.id)) context.addIssue({ code: "custom", path: [index, "id"], message: "finding ids must be unique" });
      ids.add(finding.id);
    });
  }),
});

export type ResearchReviewReceipt = z.infer<typeof researchReviewReceiptSchema>;
export type SimpleReviewFinding = z.infer<typeof simpleReviewFindingSchema>;
export type ReviewStatus = "completed_no_findings" | "completed_with_findings" | "failed";
export type CandidateStatus = "original_reviewed" | "revised_unverified" | "review_incomplete";

export const revisionResponseSchema = z.array(z.object({
  id: z.string().min(1),
  status: z.enum(["changed", "disputed", "missing_evidence"]),
  reason: z.string().min(1),
})).min(1);

export type RevisionResponse = z.infer<typeof revisionResponseSchema>;

export type RevisionRecord = {
  schemaVersion: "research-revision@1";
  baseCandidate: ArtifactRef;
  review: ArtifactRef;
  candidate: ArtifactRef;
  dispositions: RevisionResponse;
  validation: { valid: true };
};
