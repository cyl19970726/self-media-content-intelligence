import express from "express";
import { once } from "node:events";
import { get } from "node:http";
import { expect, it, vi } from "vitest";
import { startSignalRoomServer } from "./http-runtime.js";

it("stops the composition before an open response drains and shuts down only once", async () => {
  const app = express();
  let finishResponse: () => void = () => {};
  let requestArrived: () => void = () => {};
  const arrived = new Promise<void>(resolve => { requestArrived = resolve; });
  app.get("/held", (_request, response) => {
    finishResponse = () => response.end("done");
    requestArrived();
  });
  const close = vi.fn(async () => {});
  const runtime = startSignalRoomServer({ app, close }, 0);
  await once(runtime.server, "listening");
  const address = runtime.server.address();
  if (!address || typeof address === "string") throw new Error("Missing test address");
  const request = get(`http://127.0.0.1:${address.port}/held`, response => response.resume());
  try {
    await arrived;
    const closing = runtime.shutdown();
    expect(close).toHaveBeenCalledOnce();
    expect(runtime.shutdown()).toBe(closing);
    finishResponse();
    await closing;
  } finally {
    finishResponse(); request.destroy(); await runtime.shutdown();
  }
});
