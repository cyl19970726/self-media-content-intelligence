import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function command(commandName, args) {
  return execFileSync(commandName, args, { cwd: root, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).trim();
}

function trackedArtifacts() {
  const output = command("git", ["ls-tree", "-rl", "HEAD", "artifacts"]);
  if (!output) return [];
  return output.split("\n").map((line) => {
    const match = line.match(/^\d+\s+blob\s+([0-9a-f]+)\s+(\d+)\t(.+)$/u);
    if (!match) throw new Error(`cannot parse git tree entry: ${line}`);
    const [, gitBlob, bytes, filePath] = match;
    return { path: filePath, gitBlob, bytes: Number(bytes) };
  });
}

function classification(filePath) {
  return filePath.startsWith("artifacts/content-concepts/") ? "example_candidate" : "research_evidence";
}

function extension(filePath) {
  const value = path.extname(filePath).toLowerCase();
  return value || "[none]";
}

function knownConsumers() {
  try {
    return command("rg", ["-l", "artifacts/", "apps", "packages", "src", "scripts", "docs", "skills", "README.md", "--glob", "!**/*.test.ts"])
      .split("\n").filter(Boolean).sort();
  } catch (error) {
    if (error && typeof error === "object" && "status" in error && error.status === 1) return [];
    throw error;
  }
}

function addBucket(map, key, entry) {
  const current = map.get(key) ?? { files: 0, bytes: 0 };
  current.files += 1;
  current.bytes += entry.bytes;
  map.set(key, current);
}

const entries = trackedArtifacts();
const byCollection = new Map();
const byClassification = new Map();
const byExtension = new Map();
for (const entry of entries) {
  const collection = entry.path.slice("artifacts/".length).split("/", 1)[0] ?? "[root]";
  addBucket(byCollection, collection, entry);
  addBucket(byClassification, classification(entry.path), entry);
  addBucket(byExtension, extension(entry.path), entry);
}

const sortedObject = (map) => Object.fromEntries([...map.entries()].sort(([left], [right]) => left.localeCompare(right)));
const inventory = {
  schemaVersion: "1.0.0",
  artifactTree: entries.length > 0 ? command("git", ["rev-parse", "HEAD:artifacts"]) : null,
  totals: {
    files: entries.length,
    bytes: entries.reduce((sum, entry) => sum + entry.bytes, 0),
    over1MiB: entries.filter((entry) => entry.bytes > 1024 * 1024).length,
    over5MiB: entries.filter((entry) => entry.bytes > 5 * 1024 * 1024).length
  },
  byCollection: sortedObject(byCollection),
  byClassification: sortedObject(byClassification),
  byExtension: sortedObject(byExtension),
  knownConsumers: knownConsumers(),
  largestFiles: [...entries].sort((left, right) => right.bytes - left.bytes || left.path.localeCompare(right.path)).slice(0, 10)
};

const serialized = `${JSON.stringify(inventory, null, 2)}\n`;
const checkIndex = process.argv.indexOf("--check");
if (checkIndex !== -1) {
  const target = process.argv[checkIndex + 1];
  if (!target) throw new Error("--check requires an inventory path");
  const current = JSON.parse(fs.readFileSync(path.resolve(root, target), "utf8"));
  if (JSON.stringify(current) !== JSON.stringify(inventory)) {
    console.error(`Artifact inventory is stale. Regenerate ${target} with npm run inventory:artifacts.`);
    process.exit(1);
  }
  console.log("Artifact inventory matches the tracked Evidence tree.");
} else {
  process.stdout.write(serialized);
}
