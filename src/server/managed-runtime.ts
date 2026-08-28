export interface ManagedWorker {
  start(): void;
  stop(): void;
  stopAndWait(): Promise<void>;
}

export interface ManagedResource {
  close(): void;
}

export class ManagedRuntime {
  private workersStarted = false;
  private closePromise: Promise<void> | null = null;

  constructor(
    private readonly workers: ManagedWorker[],
    private readonly resources: ManagedResource[]
  ) {}

  startWorkers(): void {
    if (this.closePromise) throw new Error("Signal Room runtime is closing");
    if (this.workersStarted) return;
    this.workersStarted = true;
    for (const worker of this.workers) worker.start();
  }

  close(): Promise<void> {
    if (this.closePromise) return this.closePromise;
    this.closePromise = (async () => {
      for (const worker of this.workers) worker.stop();
      const workerResults = await Promise.allSettled(this.workers.map((worker) => worker.stopAndWait()));
      const errors = workerResults.flatMap((result) => result.status === "rejected" ? [result.reason] : []);
      for (const resource of [...this.resources].reverse()) {
        try { resource.close(); }
        catch (error) { errors.push(error); }
      }
      if (errors.length > 0) throw new AggregateError(errors, "Signal Room runtime shutdown failed");
    })();
    return this.closePromise;
  }
}
