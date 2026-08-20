import { randomUUID } from "node:crypto";
import type { CreatorBrowserExecutor } from "../orchestration/contracts.js";
import { CreatorResearchService } from "./service.js";

export class CreatorResearchWorker {
  private timer: NodeJS.Timeout | null = null;
  private active = false;
  private idleWaiters: Array<() => void> = [];
  readonly workerId: string;

  constructor(
    private readonly service: CreatorResearchService,
    private readonly executor: CreatorBrowserExecutor,
    workerId = `creator-worker-${randomUUID().slice(0, 8)}`
  ) {
    this.workerId = workerId;
  }

  start(intervalMs = 1_500): void {
    if (this.timer) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), intervalMs);
  }

  async runOnce(): Promise<boolean> {
    return this.service.processNext(this.workerId, this.executor);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async stopAndWait(): Promise<void> {
    this.stop();
    if (!this.active) return;
    await new Promise<void>((resolve) => this.idleWaiters.push(resolve));
  }

  private async tick(): Promise<void> {
    if (this.active) return;
    this.active = true;
    try {
      await this.runOnce();
    } finally {
      this.active = false;
      for (const resolve of this.idleWaiters.splice(0)) resolve();
    }
  }
}
