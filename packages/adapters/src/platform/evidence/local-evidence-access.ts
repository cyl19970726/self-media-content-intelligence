import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { finished } from "node:stream/promises";
import {
  evidenceAccessProjectionSchema,
  evidenceManifestEntrySchema,
  type EvidenceAccessPort,
  type EvidenceAccessProjection,
  type EvidenceManifestEntry
} from "../../../../contracts/index.js";
import { projectRoot } from "../../core/config.js";

export interface LocalEvidenceAccessOptions {
  manifestPath?: string;
  storeRoot?: string | null;
  now?: () => Date;
}

function loadManifest(manifestPath: string): Map<string, EvidenceManifestEntry> {
  if (!fs.existsSync(manifestPath)) return new Map();
  const entries = new Map<string, EvidenceManifestEntry>();
  const lines = fs.readFileSync(manifestPath, "utf8").split(/\r?\n/u).filter((line) => line.trim().length > 0);
  for (const [index, line] of lines.entries()) {
    const entry = evidenceManifestEntrySchema.parse(JSON.parse(line) as unknown);
    if (entries.has(entry.evidenceId)) throw new Error(`duplicate evidenceId at manifest line ${index + 1}: ${entry.evidenceId}`);
    entries.set(entry.evidenceId, entry);
  }
  return entries;
}

async function sha256(filePath: string): Promise<string> {
  const hash = createHash("sha256");
  const stream = fs.createReadStream(filePath);
  stream.on("data", (chunk) => hash.update(chunk));
  await finished(stream);
  return hash.digest("hex");
}

export class LocalEvidenceAccess implements EvidenceAccessPort {
  private readonly entries: Map<string, EvidenceManifestEntry>;
  private readonly storeRoot: string | null;
  private readonly now: () => Date;

  constructor(options: LocalEvidenceAccessOptions = {}) {
    this.entries = loadManifest(path.resolve(options.manifestPath ?? path.join(projectRoot, "evidence", "manifest.jsonl")));
    const configuredRoot = options.storeRoot === undefined ? process.env.SIGNAL_ROOM_EVIDENCE_ROOT : options.storeRoot;
    this.storeRoot = configuredRoot ? path.resolve(configuredRoot) : null;
    this.now = options.now ?? (() => new Date());
  }

  async resolve(evidenceId: string): Promise<EvidenceAccessProjection | null> {
    const entry = this.entries.get(evidenceId);
    if (!entry) return null;
    const common = {
      evidenceId: entry.evidenceId,
      classification: entry.classification,
      content: entry.content,
      storageUri: entry.storage.uri,
      originalPath: entry.provenance.originalPath,
      checkedAt: this.now().toISOString()
    };
    if (entry.storage.availability !== "available") {
      return evidenceAccessProjectionSchema.parse({ ...common, availability: entry.storage.availability, reason: "manifest_state" });
    }
    if (!this.storeRoot) {
      return evidenceAccessProjectionSchema.parse({ ...common, availability: "pending_retrieval", reason: "not_materialized" });
    }

    const filePath = path.join(this.storeRoot, "sha256", entry.content.sha256.slice(0, 2), entry.content.sha256);
    try {
      const stat = fs.lstatSync(filePath);
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size !== entry.content.bytes) {
        return evidenceAccessProjectionSchema.parse({ ...common, availability: "integrity_failed", reason: "hash_or_size_mismatch" });
      }
      if (await sha256(filePath) !== entry.content.sha256) {
        return evidenceAccessProjectionSchema.parse({ ...common, availability: "integrity_failed", reason: "hash_or_size_mismatch" });
      }
      return evidenceAccessProjectionSchema.parse({ ...common, availability: "available", reason: "verified" });
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : null;
      if (code === "ENOENT") return evidenceAccessProjectionSchema.parse({ ...common, availability: "missing", reason: "object_missing" });
      if (code === "EACCES" || code === "EPERM") return evidenceAccessProjectionSchema.parse({ ...common, availability: "unauthorized", reason: "access_denied" });
      throw error;
    }
  }
}
