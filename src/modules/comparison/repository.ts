import type { ComparisonProject } from "./project-contracts.js";

export interface ComparisonProjectRepository {
  save(project: ComparisonProject): void;
  get(id: string): ComparisonProject | null;
  list(limit?: number): ComparisonProject[];
  claimNext(workerId: string, at: string, leaseExpiresAt: string): ComparisonProject | null;
  heartbeat(id: string, workerId: string, at: string, leaseExpiresAt: string): boolean;
  close(): void;
}
