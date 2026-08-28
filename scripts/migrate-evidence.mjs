import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { finished, pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";

const projectRoot = process.cwd();
const producer = "signal-room-evidence-migration@1";

function git(args) {
  return execFileSync("git", args, { cwd: projectRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).trim();
}

export function classification(originalPath) {
  return originalPath.startsWith("artifacts/content-concepts/") ? "example" : "research_evidence";
}

export function shouldMigrate(originalPath) {
  return classification(originalPath) === "research_evidence";
}

export function evidenceId(originalPath) {
  if (!originalPath.startsWith("artifacts/")) throw new Error(`Evidence path must start with artifacts/: ${originalPath}`);
  return originalPath.slice("artifacts/".length);
}

export function mediaType(originalPath) {
  const types = new Map([
    [".css", "text/css"], [".html", "text/html"], [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"],
    [".js", "text/javascript"], [".json", "application/json"], [".jsonl", "application/x-ndjson"],
    [".md", "text/markdown"], [".mjs", "text/javascript"], [".ogg", "audio/ogg"], [".opus", "audio/opus"],
    [".png", "image/png"], [".py", "text/x-python"], [".srt", "application/x-subrip"],
    [".svg", "image/svg+xml"], [".ts", "text/typescript"], [".tsx", "text/typescript"],
    [".tsv", "text/tab-separated-values"], [".txt", "text/plain"], [".vtt", "text/vtt"],
    [".webp", "image/webp"], [".yaml", "application/yaml"], [".yml", "application/yaml"]
  ]);
  return types.get(path.extname(originalPath).toLowerCase()) ?? "application/octet-stream";
}

export function assertSafeTarget(target, root = projectRoot) {
  const resolved = path.resolve(target);
  const home = path.resolve(os.homedir());
  const repository = path.resolve(root);
  if (resolved === path.parse(resolved).root || resolved === home || resolved === repository) {
    throw new Error(`Refusing broad Evidence target: ${resolved}`);
  }
  if (resolved.startsWith(`${repository}${path.sep}`) || repository.startsWith(`${resolved}${path.sep}`)) {
    throw new Error(`Evidence target must be independent of the repository: ${resolved}`);
  }
  return resolved;
}

export function trackedEvidence() {
  const output = git(["ls-tree", "-rl", "HEAD", "artifacts"]);
  if (!output) return [];
  return output.split("\n").map((line) => {
    const match = line.match(/^\d+\s+blob\s+([0-9a-f]+)\s+(\d+)\t(.+)$/u);
    if (!match) throw new Error(`Cannot parse Git tree entry: ${line}`);
    return { gitBlob: match[1], bytes: Number(match[2]), originalPath: match[3] };
  });
}

async function hashFile(filePath) {
  const hash = createHash("sha256");
  const stream = fs.createReadStream(filePath);
  stream.on("data", (chunk) => hash.update(chunk));
  await finished(stream);
  return hash.digest("hex");
}

async function copyAndHash(source, temporary) {
  const hash = createHash("sha256");
  const input = fs.createReadStream(source);
  input.on("data", (chunk) => hash.update(chunk));
  await pipeline(input, fs.createWriteStream(temporary, { flags: "wx" }));
  return hash.digest("hex");
}

function manifestEntry(row, sha256) {
  return {
    schemaVersion: "1.0.0",
    evidenceId: evidenceId(row.originalPath),
    classification: "research_evidence",
    content: { sha256, bytes: row.bytes, mediaType: mediaType(row.originalPath) },
    storage: { uri: `cas://sha256/${sha256}`, availability: "available" },
    provenance: { originalPath: row.originalPath, capturedAt: null, producer }
  };
}

export async function migrateOne(row, targetRoot, sourceRoot = projectRoot) {
  const source = path.join(sourceRoot, row.originalPath);
  const stat = fs.lstatSync(source);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Refusing non-regular Evidence source: ${row.originalPath}`);
  if (stat.size !== row.bytes) throw new Error(`Source size differs from Git tree: ${row.originalPath}`);

  const temporaryDirectory = path.join(targetRoot, ".tmp");
  fs.mkdirSync(temporaryDirectory, { recursive: true });
  const temporary = path.join(temporaryDirectory, randomUUID());
  const sha256 = await copyAndHash(source, temporary);
  const object = path.join(targetRoot, "sha256", sha256.slice(0, 2), sha256);
  fs.mkdirSync(path.dirname(object), { recursive: true });
  if (fs.existsSync(object)) {
    const objectStat = fs.lstatSync(object);
    if (!objectStat.isFile() || objectStat.isSymbolicLink() || objectStat.size !== row.bytes || await hashFile(object) !== sha256) {
      throw new Error(`Existing content-addressed object failed verification: ${sha256}`);
    }
    fs.unlinkSync(temporary);
  } else {
    fs.renameSync(temporary, object);
  }

  const view = path.join(targetRoot, "view", row.originalPath);
  fs.mkdirSync(path.dirname(view), { recursive: true });
  if (fs.existsSync(view)) {
    const viewStat = fs.lstatSync(view);
    const objectStat = fs.lstatSync(object);
    if (!viewStat.isFile() || viewStat.isSymbolicLink() || viewStat.size !== row.bytes
      || viewStat.dev !== objectStat.dev || viewStat.ino !== objectStat.ino) {
      throw new Error(`Existing Evidence view is not the verified CAS object: ${row.originalPath}`);
    }
  } else {
    fs.linkSync(object, view);
  }
  return manifestEntry(row, sha256);
}

export async function verifyEntry(entry, targetRoot) {
  const object = path.join(targetRoot, "sha256", entry.content.sha256.slice(0, 2), entry.content.sha256);
  const view = path.join(targetRoot, "view", entry.provenance.originalPath);
  for (const candidate of [object, view]) {
    const stat = fs.lstatSync(candidate);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== entry.content.bytes) {
      throw new Error(`Evidence file metadata failed verification: ${candidate}`);
    }
  }
  const objectStat = fs.lstatSync(object);
  const viewStat = fs.lstatSync(view);
  if (objectStat.dev !== viewStat.dev || objectStat.ino !== viewStat.ino) {
    throw new Error(`Evidence view is not linked to CAS: ${entry.evidenceId}`);
  }
  if (await hashFile(object) !== entry.content.sha256) throw new Error(`Evidence hash mismatch: ${entry.evidenceId}`);
}

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function readManifest(manifestPath) {
  return fs.readFileSync(manifestPath, "utf8").split(/\r?\n/u).filter(Boolean).map((line) => JSON.parse(line));
}

function sample(entries, count) {
  if (count === null || count >= entries.length) return entries;
  if (count <= 0) throw new Error("--sample must be a positive integer");
  if (count === 1) return entries.slice(0, 1);
  return Array.from({ length: count }, (_, index) => entries[Math.round(index * (entries.length - 1) / (count - 1))]);
}

async function main() {
  const command = process.argv[2] ?? "plan";
  const rows = trackedEvidence();
  const migrate = rows.filter((row) => shouldMigrate(row.originalPath));
  const keep = rows.filter((row) => !shouldMigrate(row.originalPath));
  if (command === "plan") {
    console.log(JSON.stringify({
      schemaVersion: "1.0.0",
      artifactTree: rows.length > 0 ? git(["rev-parse", "HEAD:artifacts"]) : null,
      migrate: { files: migrate.length, bytes: migrate.reduce((sum, row) => sum + row.bytes, 0) },
      keepAsCuratedExample: { files: keep.length, bytes: keep.reduce((sum, row) => sum + row.bytes, 0), paths: keep.map((row) => row.originalPath) },
      requiresOwnerConfirmedTarget: true,
      deletesSourceFiles: false
    }, null, 2));
    return;
  }

  const targetValue = option("--target") ?? process.env.SIGNAL_ROOM_EVIDENCE_ROOT ?? null;
  if (!targetValue) throw new Error("--target or SIGNAL_ROOM_EVIDENCE_ROOT is required");
  const target = assertSafeTarget(targetValue);
  const manifest = path.resolve(option("--manifest") ?? path.join(projectRoot, "evidence", "manifest.jsonl"));

  if (command === "copy") {
    if (!process.argv.includes("--execute")) throw new Error("copy requires explicit --execute after owner confirms the target");
    const entries = [];
    for (const [index, row] of migrate.entries()) {
      entries.push(await migrateOne(row, target));
      if ((index + 1) % 500 === 0 || index + 1 === migrate.length) console.error(`copied and verified ${index + 1}/${migrate.length}`);
    }
    fs.mkdirSync(path.dirname(manifest), { recursive: true });
    const temporary = `${manifest}.${randomUUID()}.tmp`;
    fs.writeFileSync(temporary, `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`, { encoding: "utf8", flag: "wx" });
    fs.renameSync(temporary, manifest);
    console.log(JSON.stringify({ copied: entries.length, manifest, target, sourceFilesDeleted: 0 }, null, 2));
    return;
  }

  if (command === "verify") {
    const entries = readManifest(manifest);
    const sampleValue = option("--sample");
    const selected = sample(entries, sampleValue === null ? null : Number(sampleValue));
    for (const [index, entry] of selected.entries()) {
      await verifyEntry(entry, target);
      if ((index + 1) % 500 === 0 || index + 1 === selected.length) console.error(`verified ${index + 1}/${selected.length}`);
    }
    console.log(JSON.stringify({ manifestEntries: entries.length, verifiedEntries: selected.length, target }, null, 2));
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exit(1); });
