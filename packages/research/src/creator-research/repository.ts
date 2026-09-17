import type { CreatorAcquisitionAdapter, CreatorResearchEvent, CreatorResearchRun } from "../../../contracts/index.js";
import type { ResearchJob, ResearchJobStatus } from "../../index.js";

export type AppendEventInput = Omit<CreatorResearchEvent, "sequence">;
export type ResearchJobLane = "any" | "redfox" | "ego-browser" | "portfolio" | "video" | "synthesis";

export interface CreatorResearchRepository {
  save(run: CreatorResearchRun): void;
  get(id: string): CreatorResearchRun | null;
  list(limit?: number): CreatorResearchRun[];
  findLatestByProfileUrl(profileUrl: string): CreatorResearchRun | null;
  findLatestByProfileUrlAndAdapter(profileUrl: string, adapter: CreatorAcquisitionAdapter): CreatorResearchRun | null;
  enqueue(job: ResearchJob): ResearchJob;
  cancelWorkflowJobs?(runId: string, workflowRunId: string, updatedAt: string): number;
  requeueRun(runId: string, availableAt: string): ResearchJob | null;
  claimNext(workerId: string, now: string, leaseExpiresAt: string, lane?: ResearchJobLane,
    runId?: string): ResearchJob | null;
  activeVideoPostExternalIds(runId: string, at: string): string[];
  updateJobStatus(input: {
    jobId: string;
    status: ResearchJobStatus;
    updatedAt: string;
    lastError?: string | null;
  }): void;
  heartbeat(jobId: string, workerId: string, at: string, leaseExpiresAt: string): boolean;
  appendEvent(event: AppendEventInput): CreatorResearchEvent;
  listEvents(runId: string, afterSequence?: number): CreatorResearchEvent[];
  close(): void;
}
