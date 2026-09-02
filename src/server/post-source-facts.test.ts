import { describe, expect, it } from "vitest";
import { creatorDossierItemSchema, videoResearchSchema } from "../../packages/contracts/index.js";
import { projectPostSourceFacts } from "./post-source-facts.js";

describe("post source facts", () => {
  const base = {
    sourceUrl: "https://www.xiaohongshu.com/explore/note-1",
    capturedAt: "2026-09-02T00:00:00.000Z",
    title: "真实标题",
    coverHref: "/artifacts/run/cover.webp",
    mediaType: "video" as const,
    publishedLabel: "2026-09-01",
    likes: 12
  };

  it("marks a complete narrative caption and cover as available", () => {
    const facts = projectPostSourceFacts({ ...base, caption: "先说结论，再展示完整过程。 #AI工具[话题]#" });
    expect(facts.availability).toEqual({ title: "available", caption: "available", cover: "available", overall: "available" });
    expect(facts.tags).toEqual(["AI工具"]);
  });

  it("keeps topic-only descriptions partial instead of calling them full text", () => {
    const facts = projectPostSourceFacts({ ...base, caption: "#AI工具[话题]# #内容创作[话题]#" });
    expect(facts.availability.caption).toBe("partial");
    expect(facts.tags).toEqual(["AI工具", "内容创作"]);
  });

  it("keeps absent cover and caption explicitly missing", () => {
    const facts = projectPostSourceFacts({ ...base, caption: null, coverHref: null });
    expect(facts.availability).toMatchObject({ caption: "missing", cover: "missing", overall: "partial" });
  });

  it("defaults legacy creator and video projections to explicit missing facts", () => {
    const creatorFacts = creatorDossierItemSchema.shape.sourceFacts.parse(undefined);
    const videoFacts = videoResearchSchema.shape.sourceFacts.parse(undefined);
    expect(creatorFacts).toEqual(videoFacts);
    expect(creatorFacts.availability.overall).toBe("missing");
  });
});
