import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadReportOverview } from "./report-overview.js";

const directories: string[] = [];
const source = JSON.stringify({ builderLenses: { contentRestoration: { summary: "原始结论", "a/b~c": "转义字段" } } });
const overview = {
  schemaVersion: "report-overview@1", sourceSha256: createHash("sha256").update(source).digest("hex"),
  generatedAt: "2026-09-10T00:00:00.000Z", model: "gpt-5.6-terra", reasoningEffort: "medium",
  status: "ready", error: null,
  paragraphs: [{ text: "综合原文", sourcePaths: ["/builderLenses/contentRestoration/summary"] }]
};
async function fixture(value?: unknown) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "report-overview-test-"));
  directories.push(directory);
  const reconstructionPath = path.join(directory, "reconstruction.json");
  await writeFile(reconstructionPath, source);
  if (value !== undefined) await writeFile(path.join(directory, "report-overview.json"), JSON.stringify(value));
  return reconstructionPath;
}
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });

describe("report overview projection", () => {
  it("leaves older reports without an overview explicitly missing", async () => {
    expect(await loadReportOverview(await fixture())).toEqual({ state: "missing", overview: null });
  });
  it("returns valid paragraphs unchanged", async () => {
    expect(await loadReportOverview(await fixture(overview))).toEqual({ state: "ready", overview });
  });
  it("invalidates an overview after even whitespace changes to the raw source", async () => {
    const file = await fixture(overview);
    await writeFile(file, `${source}\n`);
    expect(await loadReportOverview(file)).toEqual({ state: "stale", overview: null });
  });
  it.each(["/builderLenses/contentRestoration/missing", "/source/title", "/builderLenses/contentRestoration/toString", "/builderLenses/contentRestoration/a~2b"])("rejects invalid or non-Builder pointer %s", async (pointer) => {
    const value = { ...overview, paragraphs: [{ text: "结论", sourcePaths: [pointer] }] };
    expect(await loadReportOverview(await fixture(value))).toEqual({ state: "invalid", overview: null });
  });
  it("resolves escaped JSON pointer tokens", async () => {
    const value = { ...overview, paragraphs: [{ text: "结论", sourcePaths: ["/builderLenses/contentRestoration/a~1b~0c"] }] };
    expect((await loadReportOverview(await fixture(value))).overview).toEqual(value);
  });
  it.each([{ ...overview, schemaVersion: "report-overview@0" }, { ...overview, paragraphs: [] }, { ...overview, paragraphs: [{ text: "结论", sourcePaths: [] }] }])("rejects incompatible or unsupported output", async (value) => {
    expect((await loadReportOverview(await fixture(value))).state).toBe("invalid");
  });
  it.each(["unknown", "failed"])("preserves an explicit %s result", async (status) => {
    const value = { ...overview, status, error: "原报告证据不足", paragraphs: [] };
    expect(await loadReportOverview(await fixture(value))).toEqual({ state: "ready", overview: value });
  });
  it("does not accept relative source paths", async () => {
    expect(await loadReportOverview("reconstruction.json")).toEqual({ state: "invalid", overview: null });
  });
});


describe("overview generator with a fake model process", () => {
  async function generate(file: string, output: unknown, changeSource = false, configuredModel?: string) {
    const expectedModel = configuredModel ?? "gpt-5.6-luna";
    const fakeBinary = path.join(path.dirname(file), "fake-codex.cjs");
    await writeFile(fakeBinary, `#!/usr/bin/env node
const fs = require("node:fs");
const args = process.argv.slice(2);
if (args[args.indexOf("-m") + 1] !== ${JSON.stringify(expectedModel)} || !args.includes('model_reasoning_effort="medium"') || !args.includes("read-only")) process.exit(9);
if (${JSON.stringify(changeSource)}) fs.appendFileSync(${JSON.stringify(file)}, " ");
process.stdin.resume();
process.stdin.on("end", () => fs.writeFileSync(args[args.indexOf("-o") + 1], ${JSON.stringify(JSON.stringify(output))}));
`, { mode: 0o700 });
    return promisify(execFile)(process.execPath, [path.resolve("node_modules/tsx/dist/cli.mjs"),
      path.resolve("scripts/generate-report-overview.ts"), "--reconstruction", file], {
      env: { ...process.env, SELF_MEDIA_CODEX_BIN: fakeBinary,
        ...(configuredModel ? { SELF_MEDIA_REPORT_OVERVIEW_MODEL: configuredModel } : { SELF_MEDIA_REPORT_OVERVIEW_MODEL: undefined }),
        SELF_MEDIA_REPORT_OVERVIEW_REASONING_EFFORT: "medium" }
    });
  }
  it("publishes validated model output while preserving the source bytes", async () => {
    const file = await fixture();
    await generate(file, { status: "ready", error: null, paragraphs: overview.paragraphs });
    expect(await readFile(file, "utf8")).toBe(source);
    expect(loadReportOverview(file).overview?.paragraphs).toEqual(overview.paragraphs);
  });
  it("uses Luna when no overview model is configured", async () => {
    const file = await fixture();
    await generate(file, { status: "ready", error: null, paragraphs: overview.paragraphs });
    expect(loadReportOverview(file).overview?.model).toBe("gpt-5.6-luna");
  });
  it("honors an explicitly configured overview model", async () => {
    const file = await fixture();
    await generate(file, { status: "ready", error: null, paragraphs: overview.paragraphs }, false, "gpt-5.6-terra");
    expect(loadReportOverview(file).overview?.model).toBe("gpt-5.6-terra");
  });
  it("refuses to publish when the source changes while generation runs", async () => {
    const file = await fixture();
    await expect(generate(file, { status: "ready", error: null, paragraphs: overview.paragraphs }, true)).rejects.toThrow("Source reconstruction changed");
    expect(loadReportOverview(file).state).toBe("missing");
  });
  it("records a failed result when the model invents a source pointer", async () => {
    const file = await fixture();
    await expect(generate(file, { status: "ready", error: null, paragraphs: [{ text: "失实", sourcePaths: ["/builderLenses/missing"] }] })).rejects.toThrow();
    expect(loadReportOverview(file).overview?.status).toBe("failed");
  });
});
