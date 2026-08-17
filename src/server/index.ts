import { apiPort } from "../core/config.js";
import { createApp } from "./app.js";

const port = apiPort();
const app = createApp();

const server = app.listen(port, "127.0.0.1", () => {
  console.log(`Self Media Intelligence API: http://127.0.0.1:${port}`);
});

server.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
