import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it, vi } from "vitest";
import { runWorkflow, workflow, type AgentRunner } from "@signal-room/workflow";
import type { CreatorArtifactStore, CreatorResearchRepository, RepositoryResearchVersionRegistrar,
  SimpleRegistrationInput } from "../../../research/index.js";
import { SQLiteWorkflowRunStore } from "./sqlite-run-store.js";
import { fileDigest } from "./research-inputs.js";
import { simpleReviewRegistration } from "./simple-review-registration.js";

describe("selected candidate registration binding", () => {
  it("rejects mismatched receipt bytes and registers the exact persisted candidate", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "simple-register-"));
    const previous = process.env.SELF_MEDIA_RUNTIME_DIR;
    process.env.SELF_MEDIA_RUNTIME_DIR = root;
    const db = new DatabaseSync(":memory:");
    try {
      const store = new SQLiteWorkflowRunStore(db);
      const creatorRunId = "11111111-1111-4111-8111-111111111111";
      const directory = path.join(root, "runs", creatorRunId);
      fs.mkdirSync(directory, { recursive: true });
      const report = path.join(directory, "reconstruction.json");
      fs.writeFileSync(report, JSON.stringify({ body: "preserved" }));
      const reportArtifactRef = `/artifacts/${creatorRunId}/reconstruction.json`;
      const receipt = { artifact: { reportArtifactRef, reportSha256: fileDigest(report),
        outcome: { state: "built_unevaluated", reconstructionArtifactRef: reportArtifactRef } } };
      const definition = workflow("register-fixture", { revision: "1" }, async (ctx) => {
        const evidence = await ctx.publish("evidence", "post-evidence", { kind: "post", files: [], methods: [],
          source: { creatorRunId, postExternalId: "post", reconstructionBatchArtifactRef: "batch",
            selectionArtifactRef: "selection", detailArtifactRef: "details", mediaManifestArtifactRef: "media", sourceMediaArtifactRef: "source" } });
        const candidate = await ctx.publish("candidate", "post-candidate", receipt.artifact);
        return { evidence, candidate };
      });
      const seeded = await runWorkflow({ workflow: definition, input: null, store, agentRunner: {} as AgentRunner });
      const registerPostVersion = vi.fn(async () => ({ state: "registered" }));
      const callback = simpleReviewRegistration(store, {} as CreatorArtifactStore,
        { registerPostVersion } as unknown as RepositoryResearchVersionRegistrar, {} as CreatorResearchRepository);
      const input: SimpleRegistrationInput = { registrationKey: "key", registeredBy: { workflowRunId: "w", stepRunId: "s", attemptId: "a" },
        source: { creatorRunId, postExternalId: "post", evidence: seeded.output!.evidence },
        candidate: seeded.output!.candidate, candidateReceipt: receipt, reviewStatus: "failed", candidateStatus: "review_incomplete" };
      await expect(callback({ ...input, candidateReceipt: { artifact: { ...receipt.artifact, reportArtifactRef: "wrong" } } }))
        .rejects.toThrow("SELECTED_CANDIDATE_RECEIPT_MISMATCH");
      expect(registerPostVersion).not.toHaveBeenCalled();
      await callback(input);
      expect(registerPostVersion).toHaveBeenCalledWith(expect.objectContaining({ candidate: receipt.artifact.outcome,
        researchReview: expect.objectContaining({ reviewStatus: "failed", candidateReportSha256: receipt.artifact.reportSha256 }) }));
    } finally {
      db.close(); fs.rmSync(root, { recursive: true, force: true });
      if (previous === undefined) delete process.env.SELF_MEDIA_RUNTIME_DIR; else process.env.SELF_MEDIA_RUNTIME_DIR = previous;
    }
  });
});
