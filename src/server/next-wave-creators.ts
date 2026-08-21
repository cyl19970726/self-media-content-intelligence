import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { CreatorSummary } from "../shared/schema.js";
import { researchDir } from "./creator-meta.js";

const nextWaveRoot = path.join(researchDir, "next-wave");
const safeSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const maxArtifactBytes = 5 * 1024 * 1024;

const identityAnchorSchema = z.object({
  kind: z.string().min(1),
  value: z.string().min(1),
  source: z.string().min(1)
});

const publicStatsSchema = z.object({
  followers: z.number().nonnegative().nullable().optional(),
  likesAndCollections: z.number().nonnegative().nullable().optional(),
  displayedPostCount: z.number().int().nonnegative().nullable().optional()
}).passthrough();

const creatorIdentitySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  profileUrl: z.string().url().refine((value) => {
    const url = new URL(value);
    return url.protocol === "https:"
      && (url.hostname === "xiaohongshu.com" || url.hostname.endsWith(".xiaohongshu.com"))
      && url.pathname.startsWith("/user/profile/");
  }),
  bio: z.string().optional(),
  identityStatus: z.literal("confirmed"),
  identityAnchors: z.array(identityAnchorSchema).min(2).refine(
    (anchors) => new Set(anchors.map((anchor) => `${anchor.kind}\u0000${anchor.value}`)).size >= 2,
    "identity requires two distinct anchors"
  ),
  publicStats: publicStatsSchema
}).passthrough();

const inventorySchema = z.object({
  creator: creatorIdentitySchema,
  items: z.array(z.object({ id: z.string().min(1) }).passthrough()).min(1).refine(
    (items) => new Set(items.map((item) => item.id)).size === items.length,
    "inventory item ids must be unique"
  )
}).passthrough();

const collectionStatusSchema = z.object({
  creator: z.object({
    id: z.string().min(1),
    name: z.string().trim().min(1),
    identityStatus: z.literal("confirmed"),
    displayedPostCount: z.number().int().nonnegative().nullable().optional()
  }).passthrough(),
  counts: z.object({ items: z.number().int().positive() }).passthrough(),
  readiness: z.enum(["partial", "ready", "full"]),
  blockers: z.array(z.string()),
  missingness: z.record(z.number().int().nonnegative()).optional()
}).passthrough();

const corpusSchema = z.object({
  creator: z.object({
    id: z.string().min(1),
    name: z.string().trim().min(1),
    platform: z.literal("xiaohongshu"),
    profileUrl: z.string().url(),
    publicStats: publicStatsSchema
  }).passthrough(),
  posts: z.array(z.object({ id: z.string().min(1) }).passthrough()).min(1),
  statistics: z.object({
    knownLikesCount: z.number().int().nonnegative(),
    meanLikes: z.number().nonnegative().nullable(),
    medianLikes: z.number().nonnegative().nullable(),
    maxLikes: z.number().nonnegative().nullable(),
    minLikes: z.number().nonnegative().nullable()
  }).passthrough(),
  collectionStatus: z.object({ readiness: z.string(), reason: z.string() }).passthrough()
}).passthrough();

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== "" && !relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative);
}

function readTrustedJson(directory: string, filename: string): unknown | null {
  const root = fs.realpathSync(directory);
  const candidate = path.join(root, filename);
  try {
    const stat = fs.lstatSync(candidate);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maxArtifactBytes) return null;
    const resolved = fs.realpathSync(candidate);
    if (!isInside(root, resolved)) return null;
    return JSON.parse(fs.readFileSync(resolved, "utf8")) as unknown;
  } catch {
    return null;
  }
}

function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}万`;
  return String(value);
}

function blockerLabel(blocker: string): string {
  if (blocker.startsWith("displayed_count_reconciled:")) return "主页展示数与已观察作品数存在差异";
  if (blocker.startsWith("detail_enrichment:")) return "详情、发布时间和非点赞指标尚未采集";
  return blocker;
}

/**
 * Narrow adapter for verified next-wave collection artifacts.
 * It intentionally projects collection truth only; it does not invent a
 * creator positioning or content mechanism before synthesis exists.
 */
export function loadNextWaveCreatorSummaries(root = nextWaveRoot): CreatorSummary[] {
  let canonicalRoot: string;
  try {
    canonicalRoot = fs.realpathSync(root);
  } catch {
    return [];
  }

  let directories: fs.Dirent[];
  try {
    directories = fs.readdirSync(canonicalRoot, { withFileTypes: true });
  } catch {
    return [];
  }

  return directories
    .filter((entry) => entry.isDirectory() && !entry.isSymbolicLink() && safeSlug.test(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry): CreatorSummary[] => {
      const directory = path.join(canonicalRoot, entry.name);
      let resolvedDirectory: string;
      try {
        resolvedDirectory = fs.realpathSync(directory);
      } catch {
        return [];
      }
      if (!isInside(canonicalRoot, resolvedDirectory)) return [];

      const inventory = inventorySchema.safeParse(readTrustedJson(resolvedDirectory, "collection-inventory.json"));
      const status = collectionStatusSchema.safeParse(readTrustedJson(resolvedDirectory, "collection-status.json"));
      const corpus = corpusSchema.safeParse(readTrustedJson(resolvedDirectory, "creator-corpus.json"));
      if (!inventory.success || !status.success || !corpus.success) return [];

      const identity = inventory.data.creator;
      const idsMatch = status.data.creator.id === identity.id && corpus.data.creator.id === identity.id;
      const namesMatch = status.data.creator.name === identity.name && corpus.data.creator.name === identity.name;
      const profileId = new URL(identity.profileUrl).pathname.split("/").filter(Boolean).at(-1);
      const profilesMatch = profileId === identity.id && corpus.data.creator.profileUrl === identity.profileUrl;
      const observed = inventory.data.items.length;
      const countsAgree = status.data.counts.items === observed && corpus.data.posts.length === observed;
      if (!idsMatch || !namesMatch || !profilesMatch || !countsAgree) return [];

      const displayed = identity.publicStats.displayedPostCount
        ?? status.data.creator.displayedPostCount
        ?? corpus.data.creator.publicStats.displayedPostCount
        ?? null;
      const coverageText = displayed === null
        ? `已观察 ${observed} 条公开作品；主页作品总数未知。`
        : `已观察 ${observed}/${displayed} 条主页公开作品${observed < displayed ? `，仍有 ${displayed - observed} 条未观察到` : ""}。`;
      const blockers = status.data.blockers.map(blockerLabel);
      const details = blockers.length > 0 ? ` ${blockers.join("；")}。` : "";
      const statistics = corpus.data.statistics;
      const readiness = status.data.readiness === "partial" ? "部分覆盖" : "基本盘可用";

      return [{
        id: entry.name,
        name: identity.name,
        followers: formatCount(identity.publicStats.followers),
        likesAndCollections: formatCount(identity.publicStats.likesAndCollections),
        profileUrl: identity.profileUrl,
        positioning: "公开作品基本盘已登记；账号定位与内容机制等待详情证据和深度重建。",
        summary: `${readiness}：${coverageText}${details}`,
        tags: [readiness, "身份已核验", "库存优先", statistics.knownLikesCount === observed ? "点赞全覆盖" : "点赞部分覆盖"],
        stats: [
          { label: "已观察作品", value: String(observed) },
          { label: "主页显示作品", value: displayed === null ? "—" : String(displayed) },
          { label: "点赞中位", value: formatCount(statistics.medianLikes) },
          { label: "点赞均值", value: formatCount(statistics.meanLikes) },
          { label: "最高点赞", value: formatCount(statistics.maxLikes) }
        ],
        entries: [{
          label: `${observed}${displayed === null ? "" : `/${displayed}`} 条公开作品基本盘`,
          href: `/creators/${entry.name}`,
          note: blockers.join("；")
        }]
      }];
    });
}
