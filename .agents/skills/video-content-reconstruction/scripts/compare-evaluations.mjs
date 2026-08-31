#!/usr/bin/env node
import { parseArgs, ratio, readJson, requireArg, writeJson } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const skillPath = requireArg(args, "skill");
const baselinePath = requireArg(args, "baseline");
const out = requireArg(args, "out");
const skill = readJson(skillPath);
const baseline = readJson(baselinePath);

const metrics = [
  ["criticalQuestionRecall", "higher", (item) => ratio(item.numerator, item.denominator)],
  ["evidenceCoverage", "higher", (item) => ratio(item.numerator, item.denominator)],
  ["unsupportedInference", "lower", (item) => ratio(item.errors, item.total)],
  ["timestampAccuracy", "higher", (item) => ratio(item.numerator, item.denominator)],
  ["unknownDiscipline", "higher", (item) => ratio(item.numerator, item.denominator)]
];
const comparison = metrics.map(([name, direction, compute]) => {
  const skillValue = compute(skill.gates[name]);
  const baselineValue = compute(baseline.gates[name]);
  const delta = direction === "higher" ? skillValue - baselineValue : baselineValue - skillValue;
  return { name, direction, skill: skillValue, baseline: baselineValue, skillAdvantage: delta };
});
writeJson(out, { schemaVersion: "reconstruction-comparison-1.0", skill: skillPath, baseline: baselinePath, comparison });
process.stdout.write(`${JSON.stringify({ out, comparison })}\n`);
