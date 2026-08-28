import type { LearningLoopRun } from "../../../contracts/index.js";

export interface LearningLoopEvent {
  sequence: number;
  runId: string;
  operationKey: string;
  fromStatus: string | null;
  toStatus: string;
  revision: number;
  createdAt: string;
}
export interface LearningLoopRepository {
  create(run: LearningLoopRun, operationKey: string, commandHash: string): LearningLoopRun;
  get(runId: string): LearningLoopRun | null;
  list(limit?: number): LearningLoopRun[];
  mutate(runId: string, operationKey: string, commandHash: string, apply: (run: LearningLoopRun) => LearningLoopRun): LearningLoopRun;
  listEvents(runId: string): LearningLoopEvent[];
  close(): void;
}
