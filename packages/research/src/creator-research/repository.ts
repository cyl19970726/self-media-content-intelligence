import type { CreatorResearchEvent, CreatorResearchRun } from "../../../contracts/index.js";
import type { ResearchJob, ResearchJobStatus } from "../../index.js";

export type AppendEventInput = Omit<CreatorResearchEvent, "sequence">;
export type ResearchJobLane = "any" | "serial" | "video";

export interface CreatorResearchRepository {
  save(run: CreatorResearchRun): void;
  get(id: string): CreatorResearchRun | null;
  list(limit?: number): CreatorResearchRun[];
  findLatestByProfileUrl(profileUrl: string): CreatorResearchRun | null;
  enqueue(job: ResearchJob): ResearchJob;
  requeueRun(runId: string, availableAt: string): ResearchJob | null;
  claimNext(workerId: string, now: string, leaseExpiresAt: string, lane?: ResearchJobLane): ResearchJob | null;
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
