import type { ComparisonProjectService } from "./service.js";

export class ComparisonProjectWorker {
  private timer: NodeJS.Timeout | null = null;
  private active: Promise<void> | null = null;
  private stopped = false;

  constructor(private readonly service: ComparisonProjectService, private readonly intervalMs = 1_000) {}

  start(): void {
    this.stopped = false;
    const tick = () => {
      if (this.stopped || this.active) return;
      this.active = Promise.resolve().then(() => { this.service.processNext(`comparison-worker-${process.pid}`); })
        .finally(() => { this.active = null; });
    };
    tick();
    this.timer = setInterval(tick, this.intervalMs);
  }

  stop(): void { this.stopped = true; if (this.timer) clearInterval(this.timer); this.timer = null; }
  async stopAndWait(): Promise<void> { this.stop(); await this.active; }
}
