import { buildPostSourceFacts, type PostSourceFacts, type SourceSnapshot } from "../../shared/contracts/core";

export function sourceSnapshotFacts(source: SourceSnapshot): PostSourceFacts {
  const images = source.media.filter((item) => item.kind === "image");
  const cover = images.find((item) => item.localPath || item.url);
  const mediaType = source.media.some((item) => item.kind === "video") ? "video" as const
    : images.length > 0 ? "image" as const : "unknown" as const;
  return buildPostSourceFacts({
    sourceUrl: source.sourceUrl,
    capturedAt: source.retrievedAt,
    title: source.title,
    caption: source.text,
    coverHref: cover?.localPath ?? cover?.url ?? null,
    mediaType,
    imageCount: images.length,
    tags: source.tags,
    publishedLabel: source.publishedAt,
    metrics: {
      likes: source.metrics.likes,
      collections: source.metrics.bookmarks,
      comments: source.metrics.comments,
      shares: source.metrics.shares
    },
    sourceRefs: source.rawArtifactRef ? [source.rawArtifactRef] : []
  });
}
