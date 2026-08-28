import "dotenv/config";
import { createSignalRoomComposition } from "../../../src/server/composition-root.js";

const composition = createSignalRoomComposition();
composition.startWorkers();
console.log("Signal Room background workers started.");

let shutdownPromise: Promise<void> | null = null;
function shutdown(): Promise<void> {
  if (!shutdownPromise) shutdownPromise = composition.close();
  return shutdownPromise;
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
