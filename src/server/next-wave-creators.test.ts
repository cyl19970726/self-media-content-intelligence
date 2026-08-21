import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadNextWaveCreatorSummaries } from "./next-wave-creators.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

function fixture(overrides?: { status?: string; anchors?: number; duplicateAnchors?: boolean; items?: number; corpusItems?: number; statusItems?: number }) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "next-wave-creators-"));
  roots.push(root);
  const directory = path.join(root, "sample-creator");
  fs.mkdirSync(directory);
  const itemCount = overrides?.items ?? 2;
  const creator = {
    id: "stable-creator-id",
    name: "样本博主",
    profileUrl: "https://www.xiaohongshu.com/user/profile/stable-creator-id",
    bio: "公开简介",
    identityStatus: overrides?.status ?? "confirmed",
    identityAnchors: Array.from({ length: overrides?.anchors ?? 2 }, (_, index) => ({
      kind: overrides?.duplicateAnchors ? "anchor" : `anchor-${index}`,
      value: overrides?.duplicateAnchors ? "value" : `value-${index}`,
      source: "visible_dom"
    })),
    publicStats: { followers: 20_400, likesAndCollections: 43_500, displayedPostCount: 3 }
  };
  const items = Array.from({ length: itemCount }, (_, index) => ({ id: `post-${index}` }));
  fs.writeFileSync(path.join(directory, "collection-inventory.json"), JSON.stringify({ creator, items }));
  fs.writeFileSync(path.join(directory, "collection-status.json"), JSON.stringify({
    creator: { id: creator.id, name: creator.name, identityStatus: creator.identityStatus, displayedPostCount: 3 },
    counts: { items: overrides?.statusItems ?? itemCount }, readiness: "partial",
    blockers: ["displayed_count_reconciled:3 vs 2", "detail_enrichment:pending"], missingness: { publishedAt: 2 }
  }));
  fs.writeFileSync(path.join(directory, "creator-corpus.json"), JSON.stringify({
    creator: { ...creator, platform: "xiaohongshu" },
    posts: Array.from({ length: overrides?.corpusItems ?? itemCount }, (_, index) => ({ id: `post-${index}` })),
    statistics: { knownLikesCount: itemCount, meanLikes: 120, medianLikes: 100, maxLikes: 200, minLikes: 40 },
    collectionStatus: { readiness: "partial", reason: "3 displayed vs 2 observed" }
  }));
  return { root, directory };
}

describe("loadNextWaveCreatorSummaries", () => {
  it("registers a verified partial corpus without claiming it is complete", () => {
    const { root } = fixture();
    const summaries = loadNextWaveCreatorSummaries(root);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({ id: "sample-creator", name: "样本博主" });
    expect(summaries[0]?.summary).toContain("已观察 2/3");
    expect(summaries[0]?.summary).toContain("仍有 1 条未观察到");
    expect(summaries[0]?.stats).toContainEqual({ label: "最高点赞", value: "200" });
    expect(summaries[0]?.positioning).toContain("等待详情证据");
  });

  it.each([
    ["unverified identity", { status: "candidate" }],
    ["fewer than two identity anchors", { anchors: 1 }],
    ["two duplicate identity anchors", { duplicateAnchors: true }],
    ["empty inventory", { items: 0 }],
    ["mismatched corpus count", { corpusItems: 1 }],
    ["mismatched status count", { statusItems: 1 }]
  ])("rejects %s", (_label, overrides) => {
    const { root } = fixture(overrides);
    expect(loadNextWaveCreatorSummaries(root)).toEqual([]);
  });

  it("does not traverse a symlinked creator directory", () => {
    const external = fixture();
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "next-wave-root-"));
    roots.push(root);
    fs.symlinkSync(external.directory, path.join(root, "linked-creator"), "dir");
    expect(loadNextWaveCreatorSummaries(root)).toEqual([]);
  });

  it("rejects a symlinked required artifact", () => {
    const { root, directory } = fixture();
    const inventory = path.join(directory, "collection-inventory.json");
    const outside = path.join(root, "outside.json");
    fs.renameSync(inventory, outside);
    fs.symlinkSync(outside, inventory);
    expect(loadNextWaveCreatorSummaries(root)).toEqual([]);
  });
});
