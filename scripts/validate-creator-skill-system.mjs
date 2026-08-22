#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const root = path.resolve(option("--root") ?? process.cwd());
const skillsRoot = path.resolve(option("--skills-root") ?? path.join(root, "skills"));
const graphPath = path.resolve(option("--graph") ?? path.join(skillsRoot, "creator-skill-system.json"));
const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
const failures = [];

if (graph.schemaVersion !== "creator-skill-system@1") failures.push("schemaVersion must be creator-skill-system@1");
const skills = Array.isArray(graph.skills) ? graph.skills : [];
const ids = skills.map((skill) => skill.id);
if (new Set(ids).size !== ids.length) failures.push("skill IDs must be unique");

const expectedEntries = ["video-content-reconstruction", "analyze-creator-videos", "compare-creators", "content-strategy-workbench"];
const expectedCapabilities = ["xiaohongshu-creator-acquisition", "creator-portfolio-annotation", "creator-sample-selection", "video-content-reconstruction", "creator-research-synthesis", "creator-research-evaluator"];

function exactSet(label, actual, expected) {
  const a = [...new Set(actual ?? [])].sort();
  const e = [...expected].sort();
  if (JSON.stringify(a) !== JSON.stringify(e)) failures.push(`${label} must equal ${e.join(", ")}`);
}

exactSet("entrySkills", graph.entrySkills, expectedEntries);
exactSet("internalCapabilities", graph.internalCapabilities, expectedCapabilities);
exactSet("skills", ids, [...new Set([...expectedEntries, ...expectedCapabilities])]);

const idSet = new Set(ids);
const owners = new Map();
for (const skill of skills) {
  const skillDir = path.join(skillsRoot, skill.id);
  if (!fs.existsSync(path.join(skillDir, "SKILL.md"))) failures.push(`${skill.id} is missing SKILL.md`);
  if (!fs.existsSync(path.join(skillDir, "agents", "openai.yaml"))) failures.push(`${skill.id} is missing agents/openai.yaml`);
  for (const dependency of skill.dependencies ?? []) {
    if (!idSet.has(dependency)) failures.push(`${skill.id} references unknown dependency ${dependency}`);
    if (dependency === skill.id) failures.push(`${skill.id} depends on itself`);
  }
  for (const artifact of skill.owns ?? []) {
    const prior = owners.get(artifact);
    if (prior) failures.push(`${artifact} has multiple owners: ${prior}, ${skill.id}`);
    owners.set(artifact, skill.id);
  }
}

const states = new Map();
function visit(id, stack = []) {
  if (states.get(id) === "done") return;
  if (states.get(id) === "visiting") {
    failures.push(`dependency cycle: ${[...stack, id].join(" -> ")}`);
    return;
  }
  states.set(id, "visiting");
  const skill = skills.find((item) => item.id === id);
  for (const dependency of skill?.dependencies ?? []) visit(dependency, [...stack, id]);
  states.set(id, "done");
}
for (const id of ids) visit(id);

const forbiddenCreatorResearchDependency = skills
  .find((skill) => skill.id === "analyze-creator-videos")
  ?.dependencies?.includes("content-strategy-workbench");
if (forbiddenCreatorResearchDependency) failures.push("analyze-creator-videos must not depend on content-strategy-workbench");

const report = {
  pass: failures.length === 0,
  graph: path.relative(root, graphPath),
  uniqueSkillCount: idSet.size,
  entrySkillCount: new Set(graph.entrySkills ?? []).size,
  internalCapabilityCount: new Set(graph.internalCapabilities ?? []).size,
  artifactOwnerCount: owners.size,
  failures
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (failures.length) process.exit(1);
