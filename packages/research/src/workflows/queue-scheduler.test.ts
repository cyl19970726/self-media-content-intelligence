import { describe, expect, it } from "vitest";
import type { ResearchJob } from "../orchestration/contracts.js";
import type { CreatorResearchRepository } from "../creator-research/repository.js";
import { CreatorResearchWorkflowScheduler } from "./queue-scheduler.js";

describe("CreatorResearchWorkflowScheduler", () => {
  it("uses the existing queue and a caller-supplied stable wake key", () => {
    const jobs = new Map<string, ResearchJob>();
    const events: unknown[] = [];
    const repository = {
      enqueue(job: ResearchJob) {
        const existing = jobs.get(job.idempotencyKey);
        if (existing) return existing;
        jobs.set(job.idempotencyKey, job);
        return job;
      },
      appendEvent(event: unknown) { events.push(event); return event; },
    } as unknown as CreatorResearchRepository;
    const scheduler = new CreatorResearchWorkflowScheduler(repository);
    const request = { creatorRunId: crypto.randomUUID(), workflowRunId: crypto.randomUUID(), workflowId: "post.analyze",
      workflowRevision: "v2", generation: 1,
      idempotencyKey: "wake:child:1:succeeded" };
    const first = scheduler.enqueue(request);
    const duplicate = scheduler.enqueue(request);
    expect(duplicate.id).toBe(first.id);
    expect(first.nodeKey).toBe("workflow.advance");
    expect(first.payload).toEqual({ workflowRunId: request.workflowRunId, workflowId: "post.analyze",
      workflowRevision: "v2", generation: 1 });
    expect(jobs).toHaveLength(1);
    expect(events).toHaveLength(1);
  });
});
