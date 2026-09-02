import { parsedSourceSchema, type ParsedSource } from "../shared/schema.js";
import { createHash } from "node:crypto";

export class UnsupportedUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedUrlError";
  }
}

export function parseSourceUrl(input: string): ParsedSource {
  const rawInput = input.trim();
  const urlMatch = rawInput.match(/https?:\/\/[^\s，。；;]+/);
  const candidate = urlMatch?.[0] ?? rawInput;
  const shareTitle = urlMatch?.index && urlMatch.index > 0
    ? rawInput.slice(0, urlMatch.index).trim().split(/\n+/).at(-1)?.replace(/[。！!]+$/, "").trim().slice(0, 100) || null
    : null;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new UnsupportedUrlError("请输入完整的公开链接，例如 https://x.com/... 或 https://www.xiaohongshu.com/...");
  }

  if (url.protocol === "fixture:") {
    const fixturePlatform = url.hostname === "x" ? "x"
      : url.hostname === "wechat_channels" ? "wechat_channels" : "xiaohongshu";
    return parsedSourceSchema.parse({
      platform: fixturePlatform,
      sourceUrl: url.toString(),
      externalId: url.pathname.replace(/^\//, "") || "demo",
      xsecToken: null,
      shareTitle: null,
      fixture: true
    });
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if ((host === "weixin.qq.com" || host.endsWith(".weixin.qq.com")) && url.pathname.includes("/sph/")) {
    const slug = url.pathname.match(/\/sph\/([^/?#]+)/)?.[1];
    if (!slug) throw new UnsupportedUrlError("无法从视频号分享链接中识别作品 ID");
    return parsedSourceSchema.parse({
      platform: "wechat_channels", sourceUrl: url.toString(), externalId: slug,
      xsecToken: null, shareTitle, fixture: false
    });
  }

  if (host === "channels.weixin.qq.com" || host.endsWith(".channels.weixin.qq.com")) {
    const explicitId = url.searchParams.get("video_id") ?? url.searchParams.get("videoId") ?? url.searchParams.get("id");
    const lastPathSegment = url.pathname.split("/").filter(Boolean).at(-1);
    const externalId = explicitId ?? lastPathSegment
      ?? createHash("sha256").update(url.toString()).digest("hex").slice(0, 20);
    return parsedSourceSchema.parse({
      platform: "wechat_channels", sourceUrl: url.toString(), externalId,
      xsecToken: null, shareTitle, fixture: false
    });
  }
  if (host === "x.com" || host === "twitter.com" || host.endsWith(".x.com")) {
    const match = url.pathname.match(/\/status\/(\d+)/);
    if (!match?.[1]) {
      throw new UnsupportedUrlError("当前仅支持包含 /status/<tweet-id> 的 X 链接");
    }
    return parsedSourceSchema.parse({
      platform: "x",
      sourceUrl: url.toString(),
      externalId: match[1],
      xsecToken: null,
      shareTitle: null,
      fixture: url.searchParams.get("fixture") === "1"
    });
  }

  if (host === "xiaohongshu.com" || host.endsWith(".xiaohongshu.com")) {
    const match = url.pathname.match(/\/(?:explore|discovery\/item)\/([a-zA-Z0-9]+)/);
    if (!match?.[1]) {
      throw new UnsupportedUrlError("无法从小红书链接中识别笔记 ID");
    }
    return parsedSourceSchema.parse({
      platform: "xiaohongshu",
      sourceUrl: url.toString(),
      externalId: match[1],
      xsecToken: url.searchParams.get("xsec_token"),
      shareTitle,
      fixture: url.searchParams.get("fixture") === "1"
    });
  }

  if (host === "xhslink.cn" || host.endsWith(".xhslink.cn")) {
    const slug = url.pathname.split("/").filter(Boolean).at(-1);
    if (!slug) throw new UnsupportedUrlError("无法从小红书短链中识别分享 ID");
    return parsedSourceSchema.parse({
      platform: "xiaohongshu", sourceUrl: url.toString(), externalId: slug,
      xsecToken: null, shareTitle, fixture: false
    });
  }

  throw new UnsupportedUrlError("当前支持小红书、微信视频号和 X/Twitter 公开链接");
}
