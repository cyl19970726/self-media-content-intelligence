import "dotenv/config";
import type { Server } from "node:http";
import { apiPort } from "../../../src/core/config.js";
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
  shutdownPromise = closeServer(server).finally(() => composition.close());
  return shutdownPromise;
}

server.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
  void shutdown().catch((shutdownError) => console.error(shutdownError));
});

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
