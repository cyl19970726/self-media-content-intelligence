import { describe, expect, it } from "vitest";
import { creatorBatchSubmitLabel, parseCreatorBatchDraft } from "./creator-batch-intake";

describe("creator batch intake", () => {
  it("accepts labels, CRLF and removes harmless URL noise", () => {
    const draft = parseCreatorBatchDraft("阿柚：https://www.xiaohongshu.com/user/profile/ayu?xsec_token=secret\r\n\r\nhttps://xhslink.cn/m/abc#x", null);
    expect(draft.entries.map(({ label, normalizedUrl }) => ({ label, normalizedUrl }))).toEqual([
      { label: "阿柚", normalizedUrl: "https://www.xiaohongshu.com/user/profile/ayu" },
      { label: null, normalizedUrl: "https://xhslink.cn/m/abc" }
    ]);
    expect(draft.canSubmit).toBe(true);
  });

  it("separates invalid, duplicate and existing rows", () => {
    const existing = [{ id: "existing", profileUrl: "https://www.xiaohongshu.com/user/profile/old" }] as never;
    const draft = parseCreatorBatchDraft([
      "https://www.xiaohongshu.com/user/profile/new",
      "https://www.xiaohongshu.com/user/profile/new?xsec_token=another",
      "https://www.xiaohongshu.com/user/profile/old",
      "https://example.com/nope"
    ].join("\n"), existing);
    expect(draft.entries.map((entry) => entry.state)).toEqual(["valid", "duplicate_in_batch", "existing_run", "invalid"]);
    expect(draft).toMatchObject({ validCount: 1, duplicateCount: 1, existingCount: 1, invalidCount: 1, canSubmit: false });
  });

  it("allows at most twenty non-empty rows", () => {
    const twenty = Array.from({ length: 20 }, (_, index) => `https://www.xiaohongshu.com/user/profile/p${index}`).join("\n");
    expect(parseCreatorBatchDraft(twenty, null)).toMatchObject({ lineCount: 20, overLimit: false, canSubmit: true });
    expect(parseCreatorBatchDraft(`${twenty}\nhttps://www.xiaohongshu.com/user/profile/overflow`, null)).toMatchObject({ lineCount: 21, overLimit: true, canSubmit: false });
    expect(parseCreatorBatchDraft(" \n", null).canSubmit).toBe(false);
  });

  it("keeps an existing run eligible so the server can reuse it in the new batch", () => {
    const existing = [{ id: "existing", profileUrl: "https://www.xiaohongshu.com/user/profile/reused" }] as never;
    const draft = parseCreatorBatchDraft("https://www.xiaohongshu.com/user/profile/reused", existing);
    expect(draft).toMatchObject({ validCount: 0, existingCount: 1, canSubmit: true });
    expect(draft.entries[0]?.message).toContain("纳入这个批次");
  });

  it("names the final action by new and reused task counts", () => {
    expect(creatorBatchSubmitLabel({ validCount: 0, existingCount: 2 })).toBe("建立批次并复用 2 个现有任务");
    expect(creatorBatchSubmitLabel({ validCount: 3, existingCount: 0 })).toBe("新建并分析 3 个博主");
    expect(creatorBatchSubmitLabel({ validCount: 2, existingCount: 4 })).toBe("新建 2 个，复用 4 个");
  });
});
