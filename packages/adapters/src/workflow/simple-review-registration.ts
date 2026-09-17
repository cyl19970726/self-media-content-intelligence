import type { CreatorArtifactStore, CreatorResearchRepository, CreatorSynthesisOutcome,
  CreatorSynthesisWorkflowStartInput, PostWorkflowStartInput, RepositoryResearchVersionRegistrar,
  SimpleRegistrationInput, VideoReconstructionOutcome } from "../../../research/index.js";
import { artifactPayloadSha256, type ArtifactRef } from "../../../workflow/index.js";
import type { SQLiteWorkflowRunStore } from "./sqlite-run-store.js";
import { artifactPath } from "../core/artifacts.js";
import { assertPinnedResearchInput, fileDigest, type PinnedResearchInput } from "./research-inputs.js";

type Candidate = { reportArtifactRef: string; reportSha256: string; outcome: unknown };

/** Review metadata accompanies the selected candidate; it never substitutes an old evaluated outcome. */
export function simpleReviewRegistration(store: SQLiteWorkflowRunStore, artifacts: CreatorArtifactStore,
  registrar: RepositoryResearchVersionRegistrar, repository: CreatorResearchRepository) {
  return async (input: SimpleRegistrationInput) => {
    const evidence = "evidence" in input.source ? input.source.evidence : input.source.frozenInputs;
    const frozen = await store.getArtifactPayload(evidence.id) as PinnedResearchInput;
    assertPinnedResearchInput(frozen);
    const selected = await store.getArtifact(input.candidate.id);
    if (!selected || selected.sha256 !== input.candidate.sha256 || selected.revision !== input.candidate.revision) {
      throw new Error("SELECTED_CANDIDATE_REVISION_MISMATCH");
    }
    const candidate = await store.getArtifactPayload(selected.id) as Candidate;
    if (await artifactPayloadSha256(input.candidateReceipt.artifact) !== selected.sha256
      || await artifactPayloadSha256(candidate) !== selected.sha256
      || fileDigest(artifactPath(candidate.reportArtifactRef)) !== candidate.reportSha256) {
      throw new Error("SELECTED_CANDIDATE_RECEIPT_MISMATCH");
    }
    const persist = async (ref: ArtifactRef | undefined, name: string, dependencies: string[]) => {
      if (!ref) return null;
      const actual = await store.getArtifact(ref.id);
      if (!actual || actual.sha256 !== ref.sha256 || actual.revision !== ref.revision) throw new Error("REVIEW_REGISTRATION_REVISION_MISMATCH");
      return artifacts.write(input.source.creatorRunId, `${name}-${ref.id}.json`, await store.getArtifactPayload(ref.id), dependencies);
    };
    // A repair's review is about its predecessor, so the dependency must name that report.
    let reviewedReport = candidate.reportArtifactRef;
    if (input.review) {
      const review = await store.getArtifactPayload(input.review.id) as { candidate: Pick<ArtifactRef, "id" | "revision" | "sha256"> };
      const reviewed = await store.getArtifact(review.candidate.id);
      if (!reviewed || reviewed.sha256 !== review.candidate.sha256 || reviewed.revision !== review.candidate.revision) {
        throw new Error("REVIEW_REGISTRATION_CANDIDATE_MISMATCH");
      }
      reviewedReport = (await store.getArtifactPayload(reviewed.id) as Candidate).reportArtifactRef;
    }
    const reviewArtifactRef = await persist(input.review, "research-review", [reviewedReport]);
    const revisionRecordArtifactRef = await persist(input.revisionRecord, "research-revision",
      [candidate.reportArtifactRef, ...(reviewArtifactRef ? [reviewArtifactRef] : [])]);
    const researchReview = { schemaVersion: "research-review-state@1" as const,
      reviewStatus: input.reviewStatus, candidateStatus: input.candidateStatus,
      reviewArtifactRef, revisionRecordArtifactRef, candidateReportSha256: candidate.reportSha256 };
    if (frozen.kind === "post") {
      const source = frozen.source as PostWorkflowStartInput;
      return registrar.registerPostVersion({ creatorRunId: source.creatorRunId, postExternalId: source.postExternalId,
        source: { reconstructionBatchArtifactRef: source.reconstructionBatchArtifactRef,
          selectionArtifactRef: source.selectionArtifactRef, detailArtifactRef: source.detailArtifactRef,
          mediaManifestArtifactRef: source.mediaManifestArtifactRef, sourceMediaArtifactRef: source.sourceMediaArtifactRef },
        candidate: candidate.outcome as VideoReconstructionOutcome, researchReview, registeredBy: input.registeredBy });
    }
    const source = frozen.source as CreatorSynthesisWorkflowStartInput;
    // The registrar verifies the frozen source against the current run inside its transaction.
    if (!repository.get(source.creatorRunId)) throw new Error("CREATOR_RESEARCH_RUN_NOT_FOUND");
    return registrar.registerCreatorVersion({ creatorRunId: source.creatorRunId,
      source: { reconstructionBatchArtifactRef: source.reconstructionBatchArtifactRef,
        portfolioArtifactRef: source.portfolioArtifactRef, portfolioAnnotationsArtifactRef: source.portfolioAnnotationsArtifactRef,
        selectionArtifactRef: source.selectionArtifactRef, detailArtifactRef: source.detailArtifactRef,
        previousSynthesisArtifactRef: source.previousSynthesisArtifactRef ?? null,
        previousSynthesisGateArtifactRef: source.previousSynthesisGateArtifactRef ?? null },
      candidate: candidate.outcome as CreatorSynthesisOutcome, researchReview, registeredBy: input.registeredBy });
  };
}
