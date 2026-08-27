import type { PublishingService } from "./service.js";

export class PublicationWorker {
  private timer: NodeJS.Timeout | null = null;
  private active: Promise<void> | null = null;
  private stopped = false;

  constructor(private readonly service: PublishingService, private readonly intervalMs = 1_200) {}

  start(): void {
    this.stopped = false;
    const tick = () => {
      if (this.stopped || this.active) return;
      this.active = this.service.processNext(`publication-worker-${process.pid}`).then(() => undefined)
        .finally(() => { this.active = null; });
    };
    tick();
    this.timer = setInterval(tick, this.intervalMs);
  }

  stop(): void { this.stopped = true; if (this.timer) clearInterval(this.timer); this.timer = null; }
  async stopAndWait(): Promise<void> { this.stop(); await this.active; }
}
