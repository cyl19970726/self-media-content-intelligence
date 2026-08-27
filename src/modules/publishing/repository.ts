import type {
  ContentPackage, PlatformVariant, PublicationEvent, PublicationJob,
  PublicationJobStatus, PublicationRun
} from "./contracts.js";

export interface PublishingRepository {
  savePackage(value: ContentPackage): void;
  getPackage(id: string): ContentPackage | null;
  listPackages(limit?: number): ContentPackage[];
  saveVariant(value: PlatformVariant): void;
  getVariant(id: string): PlatformVariant | null;
  listVariants(packageId: string): PlatformVariant[];
  saveRun(value: PublicationRun): void;
  getRun(id: string): PublicationRun | null;
  listRuns(limit?: number): PublicationRun[];
  listRunsByVariant(variantId: string): PublicationRun[];
  enqueue(job: PublicationJob): PublicationJob;
  claimNext(workerId: string, now: string, leaseExpiresAt: string): PublicationJob | null;
  updateJobStatus(input: { jobId: string; status: PublicationJobStatus; updatedAt: string; lastError?: string | null }): void;
  appendEvent(input: Omit<PublicationEvent, "sequence">): PublicationEvent;
  listEvents(runId: string, afterSequence?: number): PublicationEvent[];
  close(): void;
}
