import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { projectRoot } from "./config.js";

describe("projectRoot", () => {
  it("resolves the repository manifest independently of source or build depth", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")) as { name?: string };
    expect(manifest.name).toBe("self-media-intelligence");
  });
});
