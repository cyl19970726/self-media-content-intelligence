import type { Server } from "node:http";
import type { SignalRoomComposition } from "./composition-root.js";

/** Both HTTP entrypoints share startup errors and the same draining lifecycle. */
export function startSignalRoomServer(composition: Pick<SignalRoomComposition, "app" | "close">, port: number) {
  const server: Server = composition.app.listen(port, "127.0.0.1", () => {
    console.log(`Self Media Intelligence API: http://127.0.0.1:${port}`);
  });
  let shutdownPromise: Promise<void> | null = null;
  function shutdown(): Promise<void> {
    if (shutdownPromise) return shutdownPromise;
    const listenerClosed = server.listening
      ? new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
      : Promise.resolve();
    // Stop leasing immediately, while existing HTTP connections finish draining.
    shutdownPromise = Promise.allSettled([listenerClosed, composition.close()]).then(results => {
      const errors = results.flatMap(result => result.status === "rejected" ? [result.reason] : []);
      if (errors.length) throw new AggregateError(errors, "Signal Room shutdown failed");
    });
    return shutdownPromise;
  }
  const stop = () => void shutdown().catch(error => { console.error(error); process.exitCode = 1; });
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  server.once("close", () => {
    process.removeListener("SIGINT", stop);
    process.removeListener("SIGTERM", stop);
  });
  server.on("error", error => { console.error(error); process.exitCode = 1; stop(); });
  return { server, shutdown };
}
