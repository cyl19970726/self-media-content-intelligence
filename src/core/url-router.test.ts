import { describe, expect, it } from "vitest";
import { parseSourceUrl, UnsupportedUrlError } from "./url-router.js";

describe("parseSourceUrl", () => {
  it("routes X status links", () => {
    const parsed = parseSourceUrl("https://x.com/example/status/1234567890");
    expect(parsed).toMatchObject({ platform: "x", externalId: "1234567890", fixture: false });
  });

  it("preserves Xiaohongshu access token", () => {
    const parsed = parseSourceUrl("https://www.xiaohongshu.com/explore/abc123?xsec_token=token-value");
    expect(parsed).toMatchObject({ platform: "xiaohongshu", externalId: "abc123", xsecToken: "token-value" });
  });

  it("supports deterministic fixtures", () => {
    expect(parseSourceUrl("fixture://x/demo")).toMatchObject({ platform: "x", fixture: true });
  });

  it("accepts Xiaohongshu share copy with a short link", () => {
    const parsed = parseSourceUrl("如何用Codex自动化做视频？2分钟学会！ https://xhslink.cn/o/1IzRHlgkW0G 小伙伴复制一下");
    expect(parsed).toMatchObject({
      platform: "xiaohongshu", externalId: "1IzRHlgkW0G", shareTitle: "如何用Codex自动化做视频？2分钟学会", xsecToken: null
    });
  });

  it("rejects unrelated hosts", () => {
    expect(() => parseSourceUrl("https://example.com/post/1")).toThrow(UnsupportedUrlError);
  });
});
