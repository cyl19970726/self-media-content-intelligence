import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { creatorWorkerConcurrency, projectRoot } from "./config.js";

const concurrencyKeys = [
  "SELF_MEDIA_REDFOX_CONCURRENCY",
  "SELF_MEDIA_EGO_BROWSER_CONCURRENCY",
  "SELF_MEDIA_PORTFOLIO_CONCURRENCY",
  "SELF_MEDIA_VIDEO_CONCURRENCY",
  "SELF_MEDIA_SYNTHESIS_CONCURRENCY"
] as const;

afterEach(() => {
  for (const key of concurrencyKeys) delete process.env[key];
});

describe("projectRoot", () => {
  it("resolves the repository manifest independently of source or build depth", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8")) as { name?: string };
    expect(manifest.name).toBe("self-media-intelligence");
  });
});

describe("creatorWorkerConcurrency", () => {
  it("uses the Pipeline V2 pool defaults", () => {
    for (const key of concurrencyKeys) delete process.env[key];
    expect(creatorWorkerConcurrency()).toEqual({
      redfox: 4, "ego-browser": 1, portfolio: 1, video: 3, synthesis: 2
    });
  });

  it("accepts integer environment overrides and clamps unsafe values", () => {
    process.env.SELF_MEDIA_REDFOX_CONCURRENCY = "50";
    process.env.SELF_MEDIA_EGO_BROWSER_CONCURRENCY = "0";
    process.env.SELF_MEDIA_PORTFOLIO_CONCURRENCY = "2.9";
    process.env.SELF_MEDIA_VIDEO_CONCURRENCY = "invalid";
    process.env.SELF_MEDIA_SYNTHESIS_CONCURRENCY = "3";
    expect(creatorWorkerConcurrency()).toEqual({
      redfox: 8, "ego-browser": 1, portfolio: 2, video: 3, synthesis: 3
    });
  });
});
