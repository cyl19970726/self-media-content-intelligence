import "dotenv/config";
import { createSignalRoomComposition } from "../../../src/server/composition-root.js";

const composition = createSignalRoomComposition();
composition.startWorkers();
console.log("Signal Room background workers started.");

process.once("SIGINT", () => void composition.close());
process.once("SIGTERM", () => void composition.close());
