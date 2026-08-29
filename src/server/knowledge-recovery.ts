import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { projectRoot } from "../../packages/adapters/index.js";
import { createDurableKnowledgeSystem } from "./content-knowledge.js";

const KNOWLEDGE_DATABASE_FILES = ["content-knowledge.sqlite", "self-media.sqlite", "research-learning.sqlite"] as const;
const RESTORE_CONFIRMATION = "RESTORE KNOWLEDGE";

const backupEntrySchema = z.object({ file: z.enum(KNOWLEDGE_DATABASE_FILES), bytes: z.number().int().nonnegative(), sha256: z.string().regex(/^[0-9a-f]{64}$/u) });
export const knowledgeBackupManifestSchema = z.object({
  schemaVersion: z.literal("knowledge-runtime-backup@1"),
  createdAt: z.string().datetime(),
  sourceRuntimeDir: z.string().min(1),
  files: z.array(backupEntrySchema).min(1)
});

export type KnowledgeBackupManifest = z.infer<typeof knowledgeBackupManifestSchema>;

function hashFile(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function assertRegularFile(filePath: string): fs.Stats {
  const stat = fs.lstatSync(filePath);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`knowledge recovery requires a regular file: ${filePath}`);
  return stat;
}

function assertNarrowDirectory(directory: string, label: string): string {
  const resolved = path.resolve(directory);
  if ([path.parse(resolved).root, path.resolve(os.homedir()), path.resolve(projectRoot)].includes(resolved)) {
    throw new Error(`refusing broad ${label} directory: ${resolved}`);
  }
  return resolved;
}

function assertOffline(runtimeDirectory: string): void {
  for (const file of KNOWLEDGE_DATABASE_FILES) {
    for (const suffix of ["-wal", "-shm"]) {
      const companion = path.join(runtimeDirectory, `${file}${suffix}`);
      if (fs.existsSync(companion)) throw new Error(`runtime is not at a clean offline boundary; found ${path.basename(companion)}`);
    }
  }
}

export function assertKnowledgeRuntimeOffline(runtimeDirectory: string): void {
  assertOffline(assertNarrowDirectory(runtimeDirectory, "runtime"));
}

function timestampSegment(value: string): string {
  return value.replaceAll(":", "-").replaceAll(".", "-");
}

export function backupKnowledgeRuntime(options: {
  runtimeDirectory: string;
  backupRoot: string;
  now?: () => string;
}): { backupDirectory: string; manifest: KnowledgeBackupManifest } {
  const runtimeDirectory = assertNarrowDirectory(options.runtimeDirectory, "runtime");
  const backupRoot = assertNarrowDirectory(options.backupRoot, "backup");
  if (backupRoot === runtimeDirectory || backupRoot.startsWith(`${runtimeDirectory}${path.sep}`)) {
    throw new Error("knowledge backup must be outside the runtime directory");
  }
  if (backupRoot === path.resolve(projectRoot) || backupRoot.startsWith(`${path.resolve(projectRoot)}${path.sep}`)) {
    throw new Error("knowledge backup must be outside the repository");
  }
  assertOffline(runtimeDirectory);
  const createdAt = (options.now ?? (() => new Date().toISOString()))();
  const backupDirectory = path.join(backupRoot, `knowledge-${timestampSegment(createdAt)}`);
  if (fs.existsSync(backupDirectory)) throw new Error(`knowledge backup already exists: ${backupDirectory}`);
  const sources = KNOWLEDGE_DATABASE_FILES.map((file) => ({ file, source: path.join(runtimeDirectory, file) }))
    .filter((item) => fs.existsSync(item.source));
  if (!sources.some((item) => item.file === "content-knowledge.sqlite")) throw new Error("canonical content-knowledge.sqlite does not exist");
  fs.mkdirSync(backupDirectory, { recursive: true });
  try {
    const files = sources.map(({ file, source }) => {
      const stat = assertRegularFile(source);
      const target = path.join(backupDirectory, file);
      fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
      return { file, bytes: stat.size, sha256: hashFile(target) };
    });
    const manifest = knowledgeBackupManifestSchema.parse({ schemaVersion: "knowledge-runtime-backup@1", createdAt, sourceRuntimeDir: runtimeDirectory, files });
    fs.writeFileSync(path.join(backupDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    return { backupDirectory, manifest };
  } catch (error) {
    fs.rmSync(backupDirectory, { recursive: true, force: true });
    throw error;
  }
}

export function verifyKnowledgeBackup(backupDirectory: string): KnowledgeBackupManifest {
  const resolved = assertNarrowDirectory(backupDirectory, "backup");
  const manifestPath = path.join(resolved, "manifest.json");
  const manifest = knowledgeBackupManifestSchema.parse(JSON.parse(fs.readFileSync(manifestPath, "utf8")) as unknown);
  for (const entry of manifest.files) {
    const source = path.join(resolved, entry.file);
    const stat = assertRegularFile(source);
    if (stat.size !== entry.bytes || hashFile(source) !== entry.sha256) throw new Error(`knowledge backup verification failed: ${entry.file}`);
  }
  return manifest;
}

export function restoreKnowledgeRuntime(options: {
  backupDirectory: string;
  runtimeDirectory: string;
  confirmation: string;
  now?: () => string;
}): { restoredFiles: string[]; displacedDirectory: string | null } {
  if (options.confirmation !== RESTORE_CONFIRMATION) throw new Error(`restore requires confirmation token: ${RESTORE_CONFIRMATION}`);
  const runtimeDirectory = assertNarrowDirectory(options.runtimeDirectory, "runtime");
  assertOffline(runtimeDirectory);
  const backupDirectory = path.resolve(options.backupDirectory);
  if (backupDirectory === runtimeDirectory || backupDirectory.startsWith(`${runtimeDirectory}${path.sep}`)) {
    throw new Error("knowledge restore source must be outside the runtime directory");
  }
  const manifest = verifyKnowledgeBackup(backupDirectory);
  fs.mkdirSync(runtimeDirectory, { recursive: true });
  const existing = KNOWLEDGE_DATABASE_FILES.filter((file) => fs.existsSync(path.join(runtimeDirectory, file)));
  const displacedDirectory = existing.length > 0
    ? path.join(path.dirname(runtimeDirectory), `${path.basename(runtimeDirectory)}.pre-restore-${timestampSegment((options.now ?? (() => new Date().toISOString()))())}`)
    : null;
  if (displacedDirectory && fs.existsSync(displacedDirectory)) throw new Error(`pre-restore directory already exists: ${displacedDirectory}`);
  const copied: string[] = [];
  try {
    if (displacedDirectory) {
      fs.mkdirSync(displacedDirectory, { recursive: true });
      for (const file of existing) fs.renameSync(path.join(runtimeDirectory, file), path.join(displacedDirectory, file));
    }
    for (const entry of manifest.files) {
      fs.copyFileSync(path.join(backupDirectory, entry.file), path.join(runtimeDirectory, entry.file), fs.constants.COPYFILE_EXCL);
      copied.push(entry.file);
    }
    return { restoredFiles: copied, displacedDirectory };
  } catch (error) {
    for (const file of copied) fs.rmSync(path.join(runtimeDirectory, file), { force: true });
    if (displacedDirectory && fs.existsSync(displacedDirectory)) {
      for (const file of existing) {
        const displaced = path.join(displacedDirectory, file);
        if (fs.existsSync(displaced)) fs.renameSync(displaced, path.join(runtimeDirectory, file));
      }
    }
    throw error;
  }
}

export function rebuildAndVerifyKnowledgeProjection(databasePath: string, legacyResearchPath: string): {
  before: ReturnType<ReturnType<typeof createDurableKnowledgeSystem>["contentKnowledge"]["projectionParity"]>;
  rebuilt: ReturnType<ReturnType<typeof createDurableKnowledgeSystem>["contentKnowledge"]["projectionParity"]>;
  reopened: ReturnType<ReturnType<typeof createDurableKnowledgeSystem>["contentKnowledge"]["projectionParity"]>;
  conceptCount: number;
  searchVerified: boolean;
} {
  const system = createDurableKnowledgeSystem(databasePath, legacyResearchPath);
  const before = system.contentKnowledge.projectionParity();
  const rebuilt = system.contentKnowledge.rebuildProjections();
  const concepts = system.contentKnowledge.listKnowledge();
  const searchVerified = concepts.length === 0 || system.contentKnowledge.listKnowledge({ query: concepts[0]!.research.concept.name }).some((item) => item.research.concept.id === concepts[0]!.research.concept.id);
  system.contentKnowledge.close();
  const reopenedSystem = createDurableKnowledgeSystem(databasePath, legacyResearchPath);
  const reopened = reopenedSystem.contentKnowledge.projectionParity();
  reopenedSystem.contentKnowledge.close();
  if (JSON.stringify(before) !== JSON.stringify(rebuilt) || JSON.stringify(rebuilt) !== JSON.stringify(reopened) || !searchVerified) {
    throw new Error("knowledge projection rebuild parity failed");
  }
  return { before, rebuilt, reopened, conceptCount: concepts.length, searchVerified };
}

export const KNOWLEDGE_RESTORE_CONFIRMATION = RESTORE_CONFIRMATION;
