import { buildPostSourceFacts, type PostSourceFacts } from "../shared/schema.js";

export type PostSourceFactProjectionInput = {
  sourceUrl: string;
  capturedAt: string | null;
  title: string | null;
  caption: string | null;
  coverHref: string | null;
  mediaType: "video" | "image" | "unknown";
  imageCount?: number | null;
  publishedLabel: string | null;
  likes?: number | null;
  collections?: number | null;
  comments?: number | null;
  shares?: number | null;
  sourceRefs?: Array<string | null | undefined>;
};

export function projectPostSourceFacts(input: PostSourceFactProjectionInput): PostSourceFacts {
  return buildPostSourceFacts({
    sourceUrl: input.sourceUrl,
    capturedAt: input.capturedAt,
    title: input.title,
    caption: input.caption,
    coverHref: input.coverHref,
    mediaType: input.mediaType,
    imageCount: input.imageCount ?? 0,
    tags: [],
    publishedLabel: input.publishedLabel,
    metrics: {
      likes: input.likes ?? null,
      collections: input.collections ?? null,
      comments: input.comments ?? null,
      shares: input.shares ?? null
    },
    sourceRefs: [...new Set((input.sourceRefs ?? []).filter((value): value is string => Boolean(value)))]
  });
}
