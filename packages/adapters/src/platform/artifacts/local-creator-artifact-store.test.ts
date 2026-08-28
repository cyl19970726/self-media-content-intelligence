import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { LocalCreatorArtifactStore } from "./local-creator-artifact-store.js";

const roots: string[] = [];
const originalRuntime = process.env.SELF_MEDIA_RUNTIME_DIR;

afterEach(() => {
  if (originalRuntime === undefined) delete process.env.SELF_MEDIA_RUNTIME_DIR;
  else process.env.SELF_MEDIA_RUNTIME_DIR = originalRuntime;
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("LocalCreatorArtifactStore", () => {
  it("writes immutable hash-versioned artifacts and registers dependency edges", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "creator-artifacts-"));
    roots.push(root);
    process.env.SELF_MEDIA_RUNTIME_DIR = root;
    const runId = randomUUID();
    const store = new LocalCreatorArtifactStore();
    const first = store.write(runId, "creator-corpus.json", { revision: 1 }, ["legacy:snapshot#sha256=abc"]);
    const second = store.write(runId, "creator-corpus.json", { revision: 2 }, [first]);

    expect(first).not.toBe(second);
    expect(first).toMatch(/creator-corpus\.[a-f0-9]{12}\.json$/);
    expect(store.read(first)).toEqual({ revision: 1 });
    expect(store.read(second)).toEqual({ revision: 2 });
    const registry = JSON.parse(fs.readFileSync(path.join(root, "runs", runId, "artifact-registry.json"), "utf8")) as {
      artifacts: Array<{ ref: string; dependencies: string[] }>;
    };
    expect(registry.artifacts.find((entry) => entry.ref === second)?.dependencies).toEqual([first]);
  });
});
