import { describe, expect, it } from "vitest";
import { friendlyArticleHeading, withoutEmbeddedTranscript } from "./video-evidence-copy";

describe("video evidence reader-facing copy", () => {
  it("replaces internal transcript terminology in generated reports", () => {
    expect(friendlyArticleHeading("完整机器逐字稿与证据映射")).toBe("逐句字幕与画面依据");
    expect(friendlyArticleHeading("机器逐字稿与烧录字幕冲突")).toBe("自动字幕与画面字幕的差异");
  });

  it("keeps normal content headings unchanged", () => {
    expect(friendlyArticleHeading("核心内容")).toBe("核心内容");
  });

  it("removes the duplicated transcript table from the readable article", () => {
    const report = "## 核心内容\n\n正文\n\n## 完整机器逐字稿与证据映射\n\n| Cue | 时间 |\n| --- | --- |\n| CUE-001 | 0:00 |";
    expect(withoutEmbeddedTranscript(report)).toBe("## 核心内容\n\n正文");
  });
});
