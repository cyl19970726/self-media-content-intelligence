import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { finished } from "node:stream/promises";
import {
  evidenceAccessProjectionSchema,
  evidenceCatalogPageSchema,
  evidenceCatalogSummarySchema,
  evidenceManifestEntrySchema,
  type EvidenceAccessPort,
  type EvidenceAccessProjection,
  type EvidenceCatalogPage,
  type EvidenceCatalogQuery,
  type EvidenceCatalogSummary,
  type EvidenceManifestEntry
} from "../../../../contracts/index.js";
import { evidenceStoreRoot, projectRoot } from "../../core/config.js";

export interface LocalEvidenceAccessOptions {
  manifestPath?: string;
  storeRoot?: string | null;
  now?: () => Date;
}

function loadManifest(manifestPath: string): Map<string, EvidenceManifestEntry> {
  if (!fs.existsSync(manifestPath)) return new Map();
  const entries = new Map<string, EvidenceManifestEntry>();
  const files = fs.statSync(manifestPath).isDirectory()
    ? (() => {
      const index = JSON.parse(fs.readFileSync(path.join(manifestPath, "index.json"), "utf8")) as { shards?: Array<{ file?: unknown; sha256?: unknown }> };
      if (!Array.isArray(index.shards)) throw new Error("Evidence Manifest index has no shards");
      return index.shards.map((shard) => {
        if (typeof shard.file !== "string" || path.basename(shard.file) !== shard.file || typeof shard.sha256 !== "string") {
          throw new Error("Evidence Manifest index contains an invalid shard");
        }
        const filePath = path.join(manifestPath, shard.file);
        const serialized = fs.readFileSync(filePath, "utf8");
        if (createHash("sha256").update(serialized).digest("hex") !== shard.sha256) throw new Error(`Evidence Manifest shard hash mismatch: ${shard.file}`);
        return serialized;
      });
    })()
    : [fs.readFileSync(manifestPath, "utf8")];
  const lines = files.flatMap((serialized) => serialized.split(/\r?\n/u).filter((line) => line.trim().length > 0));
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
  private readonly catalogEntries: EvidenceManifestEntry[];
  private readonly storeRoot: string | null;
  private readonly now: () => Date;

  constructor(options: LocalEvidenceAccessOptions = {}) {
    this.entries = loadManifest(path.resolve(options.manifestPath ?? path.join(projectRoot, "evidence", "manifest")));
    this.catalogEntries = [...this.entries.values()].sort((left, right) => left.evidenceId.localeCompare(right.evidenceId));
    const configuredRoot = options.storeRoot === undefined ? evidenceStoreRoot() : options.storeRoot;
    this.storeRoot = configuredRoot ? path.resolve(configuredRoot) : null;
    this.now = options.now ?? (() => new Date());
  }

  summary(): EvidenceCatalogSummary {
    const countBy = (select: (entry: EvidenceManifestEntry) => string) => this.catalogEntries.reduce<Record<string, number>>((counts, entry) => {
      const key = select(entry);
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
    let storeReadable = false;
    if (this.storeRoot) {
      try {
        fs.accessSync(path.join(this.storeRoot, "sha256"), fs.constants.R_OK);
        storeReadable = true;
      } catch { storeReadable = false; }
    }
    return evidenceCatalogSummarySchema.parse({
      manifestEntries: this.catalogEntries.length,
      storeConfigured: this.storeRoot !== null,
      storeReadable,
      classifications: countBy((entry) => entry.classification),
      declaredAvailability: countBy((entry) => entry.storage.availability)
    });
  }

  list(query: EvidenceCatalogQuery = {}): EvidenceCatalogPage {
    const needle = query.query?.trim().toLocaleLowerCase() ?? "";
    const offset = Math.max(0, Math.trunc(query.offset ?? 0));
    const limit = Math.min(100, Math.max(1, Math.trunc(query.limit ?? 30)));
    const matches = this.catalogEntries.filter((entry) => {
      if (query.classification && entry.classification !== query.classification) return false;
      if (!needle) return true;
      return [entry.evidenceId, entry.provenance.originalPath, entry.content.mediaType]
        .some((value) => value.toLocaleLowerCase().includes(needle));
    });
    return evidenceCatalogPageSchema.parse({
      entries: matches.slice(offset, offset + limit), total: matches.length, offset, limit, summary: this.summary()
    });
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
