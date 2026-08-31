import { randomUUID } from "node:crypto";
import type { CreatorBrowserExecutor } from "../../index.js";
import { CreatorResearchService } from "./service.js";
import type { ResearchJobLane } from "./repository.js";

export type CreatorResearchWorkerPoolConfig = {
  redfox: number;
  "ego-browser": number;
  portfolio: number;
  video: number;
  synthesis: number;
};

const defaultPoolConfig: CreatorResearchWorkerPoolConfig = {
  redfox: 4,
  "ego-browser": 1,
  portfolio: 1,
  video: 3,
  synthesis: 2
};

const poolMaximums: CreatorResearchWorkerPoolConfig = {
  redfox: 8,
  "ego-browser": 2,
  portfolio: 4,
  video: 3,
  synthesis: 4
};

const lanes = ["redfox", "ego-browser", "portfolio", "video", "synthesis"] as const;
type WorkerLane = (typeof lanes)[number];

function clampPoolSize(lane: WorkerLane, value: number | undefined): number {
  const configured = Number.isFinite(value) ? Math.trunc(value as number) : defaultPoolConfig[lane];
  return Math.min(poolMaximums[lane], Math.max(1, configured));
}

export class CreatorResearchWorker {
  private timer: NodeJS.Timeout | null = null;
  private readonly active: Record<WorkerLane, boolean[]>;
  private idleWaiters: Array<() => void> = [];
  readonly workerId: string;
  readonly poolSizes: CreatorResearchWorkerPoolConfig;

  constructor(
    private readonly service: CreatorResearchService,
    private readonly executor: CreatorBrowserExecutor,
    workerId = `creator-worker-${randomUUID().slice(0, 8)}`,
    poolConfig: Partial<CreatorResearchWorkerPoolConfig> | number = defaultPoolConfig
  ) {
    this.workerId = workerId;
    const configured = typeof poolConfig === "number" ? { video: poolConfig } : poolConfig;
    this.poolSizes = {
      redfox: clampPoolSize("redfox", configured.redfox),
      "ego-browser": clampPoolSize("ego-browser", configured["ego-browser"]),
      portfolio: clampPoolSize("portfolio", configured.portfolio),
      video: clampPoolSize("video", configured.video),
      synthesis: clampPoolSize("synthesis", configured.synthesis)
    };
    this.active = {
      redfox: this.slots("redfox"),
      "ego-browser": this.slots("ego-browser"),
      portfolio: this.slots("portfolio"),
      video: this.slots("video"),
      synthesis: this.slots("synthesis")
    };
  }

  get videoSlots(): number { return this.poolSizes.video; }

  start(intervalMs = 1_500): void {
    if (this.timer) return;
    void this.tick();
    this.timer = setInterval(() => void this.tick(), intervalMs);
  }

  async runOnce(): Promise<boolean> {
    return this.service.processNext(this.workerId, this.executor);
  }

  async runLane(lane: ResearchJobLane, slot = 0): Promise<boolean> {
    return this.service.processNext(`${this.workerId}-${lane}-${slot + 1}`, this.executor, lane);
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

  private slots(lane: WorkerLane): boolean[] {
    return Array.from({ length: this.poolSizes[lane] }, () => false);
  }

  private async tick(): Promise<void> {
    for (const lane of lanes) {
      for (let slot = 0; slot < this.active[lane].length; slot += 1) {
        if (this.active[lane][slot]) continue;
        this.active[lane][slot] = true;
        void this.runLane(lane, slot).finally(() => {
          this.active[lane][slot] = false;
          this.resolveIdleWaiters();
        });
      }
    }
  }

  private isActive(): boolean {
    return lanes.some((lane) => this.active[lane].some(Boolean));
  }

  private resolveIdleWaiters(): void {
    if (this.isActive()) return;
    for (const resolve of this.idleWaiters.splice(0)) resolve();
  }
}
