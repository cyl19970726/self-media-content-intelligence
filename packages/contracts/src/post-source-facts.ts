import { z } from "zod";

export const postSourceFieldStateSchema = z.enum(["available", "partial", "missing"]);
export type PostSourceFieldState = z.infer<typeof postSourceFieldStateSchema>;

const factMetricSchema = z.object({
  likes: z.number().nonnegative().nullable(),
  collections: z.number().nonnegative().nullable(),
  comments: z.number().nonnegative().nullable(),
  shares: z.number().nonnegative().nullable()
});

export const postSourceFactsSchema = z.object({
  schemaVersion: z.literal("post-source-facts@1"),
  sourceUrl: z.string(),
  capturedAt: z.string().nullable(),
  title: z.string().nullable(),
  caption: z.string().nullable(),
  coverHref: z.string().nullable(),
  mediaType: z.enum(["video", "image", "unknown"]),
  imageCount: z.number().int().nonnegative(),
  tags: z.array(z.string()),
  publishedLabel: z.string().nullable(),
  metrics: factMetricSchema,
  availability: z.object({
    title: postSourceFieldStateSchema,
    caption: postSourceFieldStateSchema,
    cover: postSourceFieldStateSchema,
    overall: postSourceFieldStateSchema
  }),
  sourceRefs: z.array(z.string())
});
export type PostSourceFacts = z.infer<typeof postSourceFactsSchema>;

export type PostSourceFactsInput = Omit<PostSourceFacts, "schemaVersion" | "availability">;

export const missingPostSourceFacts: PostSourceFacts = {
  schemaVersion: "post-source-facts@1",
  sourceUrl: "",
  capturedAt: null,
  title: null,
  caption: null,
  coverHref: null,
  mediaType: "unknown",
  imageCount: 0,
  tags: [],
  publishedLabel: null,
  metrics: { likes: null, collections: null, comments: null, shares: null },
  availability: { title: "missing", caption: "missing", cover: "missing", overall: "missing" },
  sourceRefs: []
};

function hasNarrativeCaption(value: string): boolean {
  const withoutTopics = value
    .replace(/#[^#\n]+\[话题\]#/gu, " ")
    .replace(/(?:^|\s)#[^\s#]+/gu, " ")
    .replace(/[\s#]/gu, "");
  return withoutTopics.length > 0;
}

function knownTitle(value: string | null): boolean {
  return Boolean(value?.trim() && !/^(标题未识别|无标题(?:笔记)?|小红书笔记)$/u.test(value.trim()));
}

export function extractPostSourceTags(value: string | null): string[] {
  if (!value) return [];
  const bracketTopics = [...value.matchAll(/#([^#\n]+)\[话题\]#/gu)].map((match) => match[1]?.trim());
  const withoutBracketTopics = value.replace(/#[^#\n]+\[话题\]#/gu, " ");
  const plainTopics = [...withoutBracketTopics.matchAll(/(?:^|\s)#([^\s#]+)/gu)].map((match) => match[1]?.trim());
  return [...new Set([...bracketTopics, ...plainTopics].filter((tag): tag is string => Boolean(tag)))];
}

export function buildPostSourceFacts(input: PostSourceFactsInput): PostSourceFacts {
  const title = knownTitle(input.title) ? "available" as const : "missing" as const;
  const caption = !input.caption?.trim() ? "missing" as const
    : hasNarrativeCaption(input.caption) ? "available" as const : "partial" as const;
  const cover = input.coverHref ? "available" as const : "missing" as const;
  const states = [title, caption, cover];
  const overall = states.every((state) => state === "available") ? "available" as const
    : states.some((state) => state !== "missing") ? "partial" as const : "missing" as const;
  const tags = input.tags.length ? input.tags : extractPostSourceTags(input.caption);
  return postSourceFactsSchema.parse({ ...input, tags, schemaVersion: "post-source-facts@1", availability: { title, caption, cover, overall } });
}
