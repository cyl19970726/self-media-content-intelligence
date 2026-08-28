import { randomUUID } from "node:crypto";
import type { CreatorBrowserExecutor } from "../../../packages/research/index.js";
import { videoConcurrency } from "../../core/config.js";
import { CreatorResearchService } from "./service.js";
import type { ResearchJobLane } from "./repository.js";

export class CreatorResearchWorker {
  private timer: NodeJS.Timeout | null = null;
  private serialActive = false;
  private readonly videoActive: boolean[];
  private idleWaiters: Array<() => void> = [];
  readonly workerId: string;

  constructor(
    private readonly service: CreatorResearchService,
    private readonly executor: CreatorBrowserExecutor,
    workerId = `creator-worker-${randomUUID().slice(0, 8)}`,
    readonly videoSlots = videoConcurrency()
  ) {
    this.workerId = workerId;
    this.videoSlots = Math.min(3, Math.max(1, Math.trunc(videoSlots)));
    this.videoActive = Array.from({ length: this.videoSlots }, () => false);
  }

  start(intervalMs = 1_500): void {
    if (this.timer) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), intervalMs);
  }

  async runOnce(): Promise<boolean> {
    return this.service.processNext(this.workerId, this.executor);
  }

  async runLane(lane: ResearchJobLane, slot = 0): Promise<boolean> {
    const suffix = lane === "video" ? `video-${slot + 1}` : "serial";
    return this.service.processNext(`${this.workerId}-${suffix}`, this.executor, lane);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async stopAndWait(): Promise<void> {
    this.stop();
    if (!this.isActive()) return;
    await new Promise<void>((resolve) => this.idleWaiters.push(resolve));
  }

  private async tick(): Promise<void> {
    if (!this.serialActive) {
      this.serialActive = true;
      void this.runLane("serial").finally(() => {
        this.serialActive = false;
        this.resolveIdleWaiters();
      });
    }
    for (let slot = 0; slot < this.videoActive.length; slot += 1) {
      if (this.videoActive[slot]) continue;
      this.videoActive[slot] = true;
      void this.runLane("video", slot).finally(() => {
        this.videoActive[slot] = false;
        this.resolveIdleWaiters();
      });
    }
  }

  private isActive(): boolean {
    return this.serialActive || this.videoActive.some(Boolean);
  }

  private resolveIdleWaiters(): void {
    if (this.isActive()) return;
    for (const resolve of this.idleWaiters.splice(0)) resolve();
  }
}
