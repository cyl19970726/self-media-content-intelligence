import { describe, expect, it } from "vitest";
import { comparisonSetLabel, comparisonSetNote, deepSetNote } from "./creator-sample-copy";

describe("creator dossier comparison-set copy", () => {
  it("keeps the canonical 21-record copy for a complete set", () => {
    expect(comparisonSetLabel(21)).toBe("统一 21 条内容库");
    expect(comparisonSetNote(21, 9)).toContain("同一组 21 条记录");
    expect(deepSetNote(21, 9)).toContain("9 条展示");
  });

  it("states the actual count when the corpus is smaller than capacity", () => {
    expect(comparisonSetLabel(19)).toBe("统一内容库（最多 21 条比较位，当前 19 条）");
    expect(comparisonSetNote(19, 8)).toContain("当前 19 条记录");
    expect(comparisonSetNote(19, 8)).toContain("最多 21 条比较位");
    expect(deepSetNote(19, 8)).toBe("深度样本仍属于上面的同一组当前 19 条统一选择集（最多 21 条比较位）；这里只汇总覆盖，不再复制一份 8 条展示。");
  });
});
