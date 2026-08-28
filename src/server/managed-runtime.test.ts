import { describe, expect, it, vi } from "vitest";
import { ManagedRuntime, type ManagedResource, type ManagedWorker } from "./managed-runtime.js";

function worker(): ManagedWorker {
  return { start: vi.fn(), stop: vi.fn(), stopAndWait: vi.fn(async () => undefined) };
}

function resource(name: string, closed: string[]): ManagedResource {
  return { close: vi.fn(() => closed.push(name)) };
}

describe("ManagedRuntime", () => {
  it("starts workers once and closes resources in reverse construction order", async () => {
    const firstWorker = worker();
    const secondWorker = worker();
    const closed: string[] = [];
    const runtime = new ManagedRuntime(
      [firstWorker, secondWorker],
      [resource("analysis", closed), resource("knowledge", closed)]
    );

    runtime.startWorkers();
    runtime.startWorkers();
    expect(firstWorker.start).toHaveBeenCalledTimes(1);
    expect(secondWorker.start).toHaveBeenCalledTimes(1);

    const firstClose = runtime.close();
    const secondClose = runtime.close();
    expect(secondClose).toBe(firstClose);
    await firstClose;

    expect(firstWorker.stop).toHaveBeenCalledTimes(1);
    expect(secondWorker.stopAndWait).toHaveBeenCalledTimes(1);
    expect(closed).toEqual(["knowledge", "analysis"]);
    expect(() => runtime.startWorkers()).toThrow("runtime is closing");
  });

  it("closes every resource and reports aggregated shutdown failures", async () => {
    const failingWorker = worker();
    vi.mocked(failingWorker.stopAndWait).mockRejectedValue(new Error("worker failed"));
    const lastResource = { close: vi.fn(() => { throw new Error("resource failed"); }) };
    const firstResource = { close: vi.fn() };
    const runtime = new ManagedRuntime([failingWorker], [firstResource, lastResource]);

    await expect(runtime.close()).rejects.toThrow("runtime shutdown failed");
    expect(lastResource.close).toHaveBeenCalledOnce();
    expect(firstResource.close).toHaveBeenCalledOnce();
  });
});
