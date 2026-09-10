import { describe, it, expect } from "vitest";
import { validateVideoDepth } from "./video-depth-integrity.js";
function fixture(duration = 10) {
  const missing = { state: "missing", sourceRef: null, audience: null, promise: null, tension: null, specificity: null,
    searchTerms: null, composition: null, typeHierarchy: null, smallSizeReadability: null, evidenceRefs: [], unknowns: ["来源未取得"] };
  return { depthContractVersion: "single-post-depth@1", builderLenses: {
    visualEditing: { openingAnalysis: { duration, inspectionBasis: "逐帧核对；声音无法语义读取", unknowns: ["音乐未知"],
      segments: [{ id: "a", timeRange: { start: 0, end: duration }, boundaryReason: "连续固定镜头",
        spokenWords: "ASR提案保留", burnedCaptions: "未见字幕", composition: "近景", motion: "静止",
        audioRole: "未知，只有音轨存在信息", evidenceArrival: "未见结果", viewerQuestion: "是什么？",
        meaningChange: "提出问题", alignmentStatus: "ASR错时，未静默修正", evidenceRefs: ["CUE-1"], frameRefs: Array.from({length: Math.floor(duration*2)+1},(_,i)=>`FRAME-${i}`), unknowns: ["口播错时"] }] } },
    directingLogic: { packagingAnalysis: { title: {...missing}, cover: {...missing}, firstFrame: {...missing}, fulfillment: [], unknowns: [] } } } };
}
const frames = new Map(Array.from({length:21},(_,i)=>[`FRAME-${i}`,i*.5] as const));
const ids = new Set([...frames.keys(), "CUE-1", "POST-COVER"]);
const source = { facts: { title: null, coverHref: null }, cover: null };
const check = (input: unknown, duration = 83) => validateVideoDepth(input, duration, ids, frames, source);
describe("single-post depth integrity", () => {
  it("accepts explicit missing source/audio and ASR conflict without inventing certainty", () => expect(() => check(fixture())).not.toThrow());
  it("covers actual short duration", () => expect(() => check(fixture(1.2), 1.2)).not.toThrow());
  it("rejects fabricated ten seconds for a short video", () => expect(() => check(fixture(), 1.2)).toThrow("DURATION"));
  it("rejects an uncovered opening", () => { const input = fixture(); input.builderLenses.visualEditing.openingAnalysis.segments[0]!.timeRange.start = 0.3; expect(() => check(input)).toThrow("COVERAGE"); });
  it("rejects a frame outside the segment", () => expect(() => validateVideoDepth(fixture(), 83, ids, new Map([["FRAME-1",20]]), source)).toThrow("FRAME_"));
  it("rejects a midpoint masquerading as a continuous strip", () => { const input=fixture(); input.builderLenses.visualEditing.openingAnalysis.segments[0]!.frameRefs=["FRAME-10"]; expect(() => check(input)).toThrow("FRAME_STRIP_COVERAGE"); });
  it("rejects missing source with generated conclusions", () => { const input = fixture(); Object.assign(input.builderLenses.directingLogic.packagingAnalysis.cover,{promise:"带你省钱"}); expect(() => check(input)).toThrow("MISSING_SOURCE_CLAIM"); });
  it("rejects using the first video frame as independent cover", () => { const input = fixture(); Object.assign(input.builderLenses.directingLogic.packagingAnalysis.cover,{state:"available",sourceRef:"FRAME-1",evidenceRefs:["FRAME-1"]}); expect(() => check(input)).toThrow("INDEPENDENT_COVER"); });
  it("legacy artifacts cannot pass a new depth run", () => expect(() => check({})).toThrow("CONTRACT_MISSING"));
  it("legacy integrity stays compatible without depth inputs", () => expect(() => validateVideoDepth({},83,ids,frames,null)).not.toThrow());
});
