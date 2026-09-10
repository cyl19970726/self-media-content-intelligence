import { describe, it, expect } from "vitest";
import { buildPostPerformance } from "./post-performance.js";
describe("post performance observation", () => {
  it("excludes contamination and keeps per-metric denominators", () => {
    const sample = { likes: 10, isPinned: false, isOwn: false, mediaType: "video" };
    const result = buildPostPerformance({ externalId: "target", likes: 100, collections: 50, comments: 5 },[
      {...sample,externalId:"target",likes:100}, {...sample,externalId:"pinned",isPinned:true,likes:999},
      {...sample,externalId:"own",isOwn:true,likes:999}, {...sample,externalId:"a"}, {...sample,externalId:"b",likes:30},
      {...sample,externalId:"a"}, {...sample,externalId:"unknown",isOwn:null}, {...sample,externalId:"image",mediaType:"image"}
    ],"2026-09-06", "2026-09-05", "限定作者样本");
    expect(result.eligibleCount).toBe(2); expect(result.excluded).toHaveLength(6);
    expect(result.metrics[0]).toMatchObject({denominator:2,median:20,multiple:5});
    expect(result.metrics[1]).toMatchObject({denominator:0,median:null,multiple:null});
    expect(result.collectionLikeRatio).toBe(.5); expect(result.exposureInteractionRate).toBeNull(); expect(result.ageMatched).toBe(false);
  });
  it("does not turn missing or zero denominators into rates", () => {
    const result=buildPostPerformance({externalId:"x",likes:0,collections:null,comments:null},[],null,null,"未知");
    expect(result.collectionLikeRatio).toBeNull(); expect(result.metrics.every(row => row.median===null)).toBe(true);
  });
});
