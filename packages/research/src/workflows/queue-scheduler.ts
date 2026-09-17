import { randomUUID } from "node:crypto";
import type { ResearchJob } from "../orchestration/contracts.js";
import type { CreatorResearchRepository } from "../creator-research/repository.js";

export type WorkflowAdvanceRequest = {
  creatorRunId: string;
  workflowRunId: string;
  workflowId: string;
  workflowRevision: string;
  generation: number;
  idempotencyKey: string;
};

/** The one adapter used by roots, children and wakeups to enter the existing leased queue. */
export class CreatorResearchWorkflowScheduler {
  constructor(private readonly repository: CreatorResearchRepository) {}

  enqueue(input: WorkflowAdvanceRequest): ResearchJob {
    const queuedAt = new Date().toISOString();
    const proposedId = randomUUID();
    const job = this.repository.enqueue({ id: proposedId, runId: input.creatorRunId,
      nodeKey: "workflow.advance", status: "queued", idempotencyKey: input.idempotencyKey,
      attempts: 0, maxAttempts: 2, availableAt: queuedAt, leaseOwner: null, leaseExpiresAt: null,
      heartbeatAt: null, payload: { workflowRunId: input.workflowRunId, workflowId: input.workflowId,
        workflowRevision: input.workflowRevision, generation: input.generation },
      lastError: null, createdAt: queuedAt, updatedAt: queuedAt });
    if (job.id === proposedId) {
      this.repository.appendEvent({ runId: input.creatorRunId, jobId: job.id, type: "job.queued", createdAt: queuedAt,
        message: "Workflow 已进入现有持久任务队列。",
        payload: { workflowRunId: input.workflowRunId, workflowId: input.workflowId, workflowRevision: input.workflowRevision,
          generation: input.generation, nodeKey: job.nodeKey,
          idempotencyKey: input.idempotencyKey } });
    }
    return job;
  }
}
