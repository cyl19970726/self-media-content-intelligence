import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { CreatorResearchService } from "../../packages/research/index.js";
import { evidenceResearchRoot } from "../../packages/adapters/index.js";

const safeSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const maxBytes = 5 * 1024 * 1024;

const identityAnchorSchema = z.object({ kind: z.string(), value: z.string(), source: z.string() });
const inventorySchema = z.object({
  creator: z.object({
    id: z.string(), name: z.string(), profileUrl: z.string().url(), bio: z.string().nullable().optional(),
    identityStatus: z.literal("confirmed"), identityAnchors: z.array(identityAnchorSchema).min(2),
    publicStats: z.object({ followers: z.number().int().nonnegative().nullable().optional(),
      likesAndCollections: z.number().int().nonnegative().nullable().optional(),
      displayedPostCount: z.number().int().nonnegative().nullable().optional() }).passthrough()
  }).passthrough(),
  items: z.array(z.object({ id: z.string() }).passthrough()).min(1)
}).passthrough();

const corpusSchema = z.object({
  snapshotAt: z.string(),
  creator: z.object({ id: z.string(), name: z.string(), profileUrl: z.string().url(), bio: z.string().nullable().optional(),
    publicStats: z.object({ followers: z.number().int().nonnegative().nullable().optional(),
      likesAndCollections: z.number().int().nonnegative().nullable().optional(),
      displayedPostCount: z.number().int().nonnegative().nullable().optional() }).passthrough() }),
  posts: z.array(z.object({
    id: z.string(), title: z.string().nullable(), sourceUrl: z.string().url(),
    mediaType: z.enum(["video", "image", "unknown"]),
    metrics: z.object({ likes: z.number().int().nonnegative().nullable() }),
    raw: z.object({ likesLabel: z.string().nullable().optional() }).passthrough().optional()
  }).passthrough()).min(1)
}).passthrough();

const statusSchema = z.object({
  crawl: z.object({ stopReason: z.string(), displayedCountDiscrepancy: z.object({ gap: z.number().int().nonnegative() }).optional() }).passthrough(),
  blockers: z.array(z.string())
}).passthrough();

function readRegisteredJson(directory: string, filename: string): { value: unknown; sourceRef: string } {
  const root = fs.realpathSync(directory);
  const candidate = path.join(root, filename);
  const stat = fs.lstatSync(candidate);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxBytes) throw new Error(`${filename} 不是可信快照文件`);
  const resolved = fs.realpathSync(candidate);
  const relative = path.relative(root, resolved);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error(`${filename} 超出快照目录`);
  const serialized = fs.readFileSync(resolved, "utf8");
  const sha256 = createHash("sha256").update(serialized).digest("hex");
  return { value: JSON.parse(serialized) as unknown, sourceRef: `legacy:next-wave/${path.basename(root)}/${filename}#sha256=${sha256}` };
}

export function importNextWaveCreatorSnapshot(service: CreatorResearchService, slug: string, taskSpaceId: number) {
  if (!safeSlug.test(slug)) throw new Error("快照标识无效");
  const directory = path.join(evidenceResearchRoot(), "next-wave", slug);
  const inventorySource = readRegisteredJson(directory, "collection-inventory.json");
  const corpusSource = readRegisteredJson(directory, "creator-corpus.json");
  const statusSource = readRegisteredJson(directory, "collection-status.json");
  const inventory = inventorySchema.parse(inventorySource.value);
  const corpus = corpusSchema.parse(corpusSource.value);
  const status = statusSchema.parse(statusSource.value);
  if (inventory.creator.id !== corpus.creator.id || inventory.creator.profileUrl !== corpus.creator.profileUrl) {
    throw new Error("快照身份字段不一致，拒绝导入");
  }
  if (new Set(corpus.posts.map((post) => post.id)).size !== corpus.posts.length) throw new Error("快照包含重复作品 ID");
  const inventoryIds = new Set(inventory.items.map((item) => item.id));
  if (corpus.posts.some((post) => !inventoryIds.has(post.id))) throw new Error("Corpus 含有未登记的作品 ID");
  const hasGap = (status.crawl.displayedCountDiscrepancy?.gap ?? 0) > 0;
  return service.importSnapshot({
    profileUrl: corpus.creator.profileUrl,
    creatorId: corpus.creator.id,
    creatorName: corpus.creator.name,
    canonicalSlug: slug,
    capturedAt: corpus.snapshotAt,
    taskSpaceId,
    stopReason: status.crawl.stopReason === "explicit_end" && !hasGap ? "explicit_end" : "quiescent_incomplete",
    posts: corpus.posts.map((post) => ({
      externalId: post.id,
      url: post.sourceUrl,
      title: post.title,
      visibleText: post.title,
      mediaType: post.mediaType,
      likesLabel: post.raw?.likesLabel ?? (post.metrics.likes === null ? null : String(post.metrics.likes)),
      likes: post.metrics.likes
    })),
    warnings: [...status.blockers, "legacy_snapshot_imported_without_reacquiring_inventory"],
    sourceRefs: [inventorySource.sourceRef, corpusSource.sourceRef, statusSource.sourceRef],
    publicProfile: {
      bio: corpus.creator.bio ?? inventory.creator.bio ?? null,
      followers: corpus.creator.publicStats.followers ?? inventory.creator.publicStats.followers ?? null,
      likesAndCollections: corpus.creator.publicStats.likesAndCollections ?? inventory.creator.publicStats.likesAndCollections ?? null,
      displayedPostCount: corpus.creator.publicStats.displayedPostCount ?? inventory.creator.publicStats.displayedPostCount ?? null,
      identityAnchors: inventory.creator.identityAnchors
    }
  });
}
