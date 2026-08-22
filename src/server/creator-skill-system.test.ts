import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const workspace = process.cwd();
const validator = path.join(workspace, "scripts", "validate-creator-skill-system.mjs");
const canonicalPath = path.join(workspace, "skills", "creator-skill-system.json");
const temporaryDirectories: string[] = [];

function validate(graph: unknown) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "creator-skill-system-"));
  temporaryDirectories.push(directory);
  const graphPath = path.join(directory, "graph.json");
  fs.writeFileSync(graphPath, JSON.stringify(graph));
  try {
    const output = execFileSync(process.execPath, [validator, "--root", workspace, "--skills-root", path.join(workspace, "skills"), "--graph", graphPath], { encoding: "utf8" });
    return { status: 0, report: JSON.parse(output) as { pass: boolean; failures: string[] } };
  } catch (error) {
    const failure = error as { status?: number; stdout?: Buffer | string };
    const stdout = typeof failure.stdout === "string" ? failure.stdout : failure.stdout?.toString("utf8") ?? "{}";
    return { status: failure.status ?? 1, report: JSON.parse(stdout) as { pass: boolean; failures: string[] } };
  }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) fs.rmSync(directory, { recursive: true, force: true });
});

describe("Creator Analysis OS Skill graph", () => {
  const canonical = JSON.parse(fs.readFileSync(canonicalPath, "utf8")) as {
    skills: Array<{ id: string; dependencies: string[]; owns: string[] }>;
    entrySkills: string[];
    internalCapabilities: string[];
  };

  it("accepts the canonical four-entry, six-capability graph", () => {
    const result = validate(canonical);
    expect(result.status).toBe(0);
    expect(result.report).toMatchObject({ pass: true, failures: [] });
  });

  it("rejects a missing canonical node", () => {
    const graph = structuredClone(canonical);
    graph.skills = graph.skills.filter((skill) => skill.id !== "creator-research-synthesis");
    const result = validate(graph);
    expect(result.status).toBe(1);
    expect(result.report.failures.some((failure) => failure.startsWith("skills must equal"))).toBe(true);
  });

  it("rejects duplicate artifact ownership", () => {
    const graph = structuredClone(canonical);
    graph.skills.find((skill) => skill.id === "compare-creators")?.owns.push("creator-analysis");
    const result = validate(graph);
    expect(result.status).toBe(1);
    expect(result.report.failures).toContain("creator-analysis has multiple owners: creator-research-synthesis, compare-creators");
  });

  it("rejects dependency cycles", () => {
    const graph = structuredClone(canonical);
    graph.skills.find((skill) => skill.id === "xiaohongshu-creator-acquisition")?.dependencies.push("analyze-creator-videos");
    const result = validate(graph);
    expect(result.status).toBe(1);
    expect(result.report.failures.some((failure) => failure.startsWith("dependency cycle:"))).toBe(true);
  });

  it("keeps creation strategy out of neutral creator research", () => {
    const graph = structuredClone(canonical);
    graph.skills.find((skill) => skill.id === "analyze-creator-videos")?.dependencies.push("content-strategy-workbench");
    const result = validate(graph);
    expect(result.status).toBe(1);
    expect(result.report.failures).toContain("analyze-creator-videos must not depend on content-strategy-workbench");
  });
});
