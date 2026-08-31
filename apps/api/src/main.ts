import "dotenv/config";
import type { Server } from "node:http";
import { apiPort } from "../../../packages/adapters/index.js";
import { createSignalRoomComposition } from "../../../src/server/composition-root.js";

const port = apiPort();
const composition = createSignalRoomComposition();
if (process.env.SELF_MEDIA_EMBED_WORKERS !== "false") composition.startWorkers();

const server = composition.app.listen(port, "127.0.0.1", () => {
  console.log(`Self Media Intelligence API: http://127.0.0.1:${port}`);
});

let shutdownPromise: Promise<void> | null = null;

function closeServer(value: Server): Promise<void> {
  if (!value.listening) return Promise.resolve();
  return new Promise((resolve, reject) => value.close((error) => error ? reject(error) : resolve()));
}

function shutdown(): Promise<void> {
  if (shutdownPromise) return shutdownPromise;
  // Stop leasing work immediately while the HTTP listener drains existing keep-alive connections.
  // Waiting for the listener first lets a long-lived browser connection keep Workers replenishing forever.
  shutdownPromise = Promise.allSettled([closeServer(server), composition.close()]).then((results) => {
    const errors = results.flatMap((result) => result.status === "rejected" ? [result.reason] : []);
    if (errors.length > 0) throw new AggregateError(errors, "Signal Room shutdown failed");
  });
  return shutdownPromise;
}

server.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
  void shutdown().catch((shutdownError) => console.error(shutdownError));
});

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
