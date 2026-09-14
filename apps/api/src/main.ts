import "dotenv/config";
import { startSignalRoomServer } from "../../../src/server/http-runtime.js";
import { apiPort } from "../../../packages/adapters/index.js";
import { createSignalRoomComposition } from "../../../src/server/composition-root.js";

const port = apiPort();
const composition = createSignalRoomComposition();
if (process.env.SELF_MEDIA_EMBED_WORKERS !== "false") composition.startWorkers();

startSignalRoomServer(composition, port);
