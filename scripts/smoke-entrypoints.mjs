import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const root = process.cwd();
const runtime = fs.mkdtempSync(path.join(os.tmpdir(), "signal-room-entrypoint-smoke-"));

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("Cannot allocate smoke-test port"));
      server.close((error) => error ? reject(error) : resolve(address.port));
    });
  });
}

function waitForOutput(child, expected, label, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => reject(new Error(`${label} did not become ready.\n${output}`)), timeoutMs);
    const inspect = (chunk) => {
      output += chunk.toString();
      if (expected.test(output)) {
        clearTimeout(timeout);
        resolve(output);
      }
    };
    child.stdout.on("data", inspect);
    child.stderr.on("data", inspect);
    child.once("exit", (code) => {
      clearTimeout(timeout);
      reject(new Error(`${label} exited before readiness with ${code}.\n${output}`));
    });
  });
}

function stop(child, label, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    if (child.exitCode !== null) return resolve();
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${label} did not stop after SIGTERM`));
    }, timeoutMs);
    child.once("exit", (code, signal) => {
      clearTimeout(timeout);
      if (code === 0 || signal === "SIGTERM") resolve();
      else reject(new Error(`${label} stopped with exit code ${code}`));
    });
    child.kill("SIGTERM");
  });
}

try {
  const cli = spawnSync(process.execPath, ["dist-server/apps/cli/src/main.js", "--help"], {
    cwd: root,
    env: { ...process.env, SELF_MEDIA_RUNTIME_DIR: runtime },
    encoding: "utf8"
  });
  if (cli.status !== 0 || !cli.stdout.includes("Commands:")) {
    throw new Error(`Compiled CLI smoke failed.\n${cli.stdout}\n${cli.stderr}`);
  }

  const port = await freePort();
  const api = spawn(process.execPath, ["dist-server/apps/api/src/main.js"], {
    cwd: root,
    env: {
      ...process.env,
      SELF_MEDIA_RUNTIME_DIR: runtime,
      SELF_MEDIA_PORT: String(port),
      SELF_MEDIA_EMBED_WORKERS: "false"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  await waitForOutput(api, /Self Media Intelligence API:/u, "Compiled API");
  const health = await fetch(`http://127.0.0.1:${port}/api/health`);
  if (!health.ok || (await health.json()).ok !== true) throw new Error("Compiled API health check failed");
  const html = await fetch(`http://127.0.0.1:${port}/`).then((response) => response.text());
  if (!html.includes("<title>Content Dossier</title>")) throw new Error("Compiled API did not serve the Web build");
  await stop(api, "Compiled API");

  const worker = spawn(process.execPath, ["dist-server/apps/worker/src/main.js"], {
    cwd: root,
    env: { ...process.env, SELF_MEDIA_RUNTIME_DIR: runtime },
    stdio: ["ignore", "pipe", "pipe"]
  });
  await waitForOutput(worker, /background workers started/u, "Compiled Worker");
  await stop(worker, "Compiled Worker");

  console.log("Compiled Web, API, Worker, and CLI entrypoints are operational.");
} finally {
  fs.rmSync(runtime, { recursive: true, force: true });
}
