import { describe, expect, it } from "vitest";
import { discussionContext, parseNotes } from "./notebook";

describe("research notebook persistence boundary", () => {
  it("rejects damaged storage rather than silently replacing it", () => {
    expect(parseNotes(null)).toEqual([]);
    expect(() => parseNotes('{')).toThrow();
    expect(() => parseNotes('[{"text":"valuable note"}]')).toThrow();
  });
  it("preserves distinct source positions and marks judgments as unverified in discussion exports", () => {
    const notes = [{ id: "1", kind: "insight" as const, text: "待验证判断", sourceUrl: "http://localhost/post?run=one#content-a", createdAt: "2026-09-14" }];
    expect(parseNotes(JSON.stringify(notes))).toEqual(notes);
    const context = discussionContext("作品", "http://localhost/creator", notes);
    expect(context).toContain(notes[0]!.sourceUrl);
    expect(context).toContain("不是已经验证的分析结论");
    expect(context).toContain("[我的判断] 待验证判断");
  });
});
