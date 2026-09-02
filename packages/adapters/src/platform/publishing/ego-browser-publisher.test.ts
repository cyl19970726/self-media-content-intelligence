import { describe, expect, it } from "vitest";
import type { PlatformVariant, PublishingPlatform } from "../../../../creation/index.js";
import { buildCancelScript, buildPrepareScript, buildSubmitScript } from "./ego-browser-publisher.js";

function variant(platform: PublishingPlatform = "xiaohongshu"): PlatformVariant {
  return {
    id: "d58ef38c-e174-44db-96db-4ea060b626bf", packageId: "e390ee09-2337-44b9-a4bb-ec8b9b068381",
    contentPackageSnapshotId: null,
    platform, revision: 1, title: "标题", body: "正文", contentType: "video",
    media: [{ kind: "video", localPath: "/tmp/video.mp4", mimeType: "video/mp4" }], tags: ["测试"], visibility: "private",
    scheduledAt: null,
    platformOptions: {
      xiaohongshu: { location: null, allowDownload: true, allowCopy: true },
      douyin: { coverPath: null, declaration: "self_made", sourceUrl: null, location: null, allowDownload: true },
      wechat_channels: { coverPath: null, location: null, activity: null, linkUrl: null, original: true, allowDownload: true },
      bilibili: { coverPath: null, copyright: "original", sourceUrl: null, partition: "生活 / 日常", dynamicText: "", allowRepost: false },
      wechat_official_account: { author: "", digest: "", coverPath: null, bodyMode: "one_image", original: false, comments: "all", contentSourceUrl: null }
    },
    createdAt: "2026-08-27T00:00:00.000Z", updatedAt: "2026-08-27T00:00:00.000Z"
  };
}

describe("ego-browser publishing scripts", () => {
  const expectValidScript = (script: string) => expect(() => new Function(`return (async () => {${script}})()`)).not.toThrow();

  it("prepares in an isolated TaskSpace and hands off without a final submit marker", () => {
    const script = buildPrepareScript({ runId: "run-1", taskSpaceId: null, variant: variant() });
    expect(script).toContain("useOrCreateTaskSpace");
    expect(script).toContain("DOM.setFileInputFiles");
    expect(script).toContain("data-self-media-visibility");
    expect(script).toContain("handOffTaskSpace(task.id)");
    expect(script).not.toContain("data-self-media-final-submit");
  });

  it("uses the correct Ego Browser surface for Channels and Bilibili", () => {
    expect(buildPrepareScript({ runId: "run-2", taskSpaceId: null, variant: variant("wechat_channels") }))
      .toContain("channels.weixin.qq.com/platform");
    expect(buildPrepareScript({ runId: "run-2", taskSpaceId: null, variant: variant("wechat_channels") }))
      .toContain("Page.fileChooserOpened");
    const bilibili = buildSubmitScript({ runId: "run-3", taskSpaceId: 11, variant: variant("bilibili") });
    expect(bilibili).toContain("立即投稿");
    expect(bilibili).toContain("bilibili");
  });

  it("prepares an Official Account one-image article with G1/G2 gates and only saves a verified draft", () => {
    const official = { ...variant("wechat_official_account"), contentType: "article" as const,
      media: [{ kind: "image" as const, localPath: "/tmp/poster.png", mimeType: "image/png" }] };
    const prepare = buildPrepareScript({ runId: "run-4", taskSpaceId: null, variant: official });
    expect(prepare).toContain("appmsg_edit_v2");
    expect(prepare).toContain("js_appmsg_thumb_new");
    expect(prepare).toContain("data-self-media-wechat-image");
    expect(prepare).not.toContain("data-self-media-final-save-draft");
    const submit = buildSubmitScript({ runId: "run-4", taskSpaceId: 12, variant: official });
    expect(submit).toContain("保存为草稿");
    expect(submit).toContain("appmsgid");
    expect(submit).toContain("state: 'draft_saved'");
    expect(submit).not.toContain("确认发表");
  });

  it("submits only in the explicit takeover script and marks exactly the final control", () => {
    const script = buildSubmitScript({ runId: "run-1", taskSpaceId: 9, variant: variant("douyin") });
    expect(script).toContain("takeOverTaskSpace(9)");
    expect(script).toContain("data-self-media-final-submit");
    expect(script).toContain("submission_unknown");
    expect(script).toContain("系统不会自动重试");
  });

  it("uses a Xiaohongshu-specific browser-local draft verifier", () => {
    const script = buildCancelScript({ runId: "run-1", taskSpaceId: 9, variant: variant() });
    expect(script).toContain("暂存离开");
    expect(script).toContain("保存成功");
    expect(script).toContain("草稿箱(");
    expect(script).not.toContain("data-self-media-final-submit");
  });

  it("uses independent draft verification for Douyin, Channels, and Bilibili", () => {
    const douyin = buildCancelScript({ runId: "draft-douyin", taskSpaceId: 20, variant: variant("douyin") });
    expect(douyin).toContain("上次未发布");
    expect(douyin).toContain("scrollBy(900)");
    const channels = buildCancelScript({ runId: "draft-channels", taskSpaceId: 21, variant: variant("wechat_channels") });
    expect(channels).toContain("将此次编辑保留?");
    expect(channels).toContain("草稿箱 ");
    const bilibili = buildCancelScript({ runId: "draft-bilibili", taskSpaceId: 22, variant: variant("bilibili") });
    expect(bilibili).toContain("B站没有找到草稿保存按钮");
  });

  it("emits syntactically valid Ego Browser programs for every platform", () => {
    for (const platform of ["xiaohongshu", "douyin", "wechat_channels", "bilibili"] as const) {
      const value = variant(platform);
      expectValidScript(buildPrepareScript({ runId: `prepare-${platform}`, taskSpaceId: null, variant: value }));
      expectValidScript(buildSubmitScript({ runId: `submit-${platform}`, taskSpaceId: 18, variant: value }));
    }
    const official = { ...variant("wechat_official_account"), contentType: "article" as const,
      media: [{ kind: "image" as const, localPath: "/tmp/poster.png", mimeType: "image/png" }] };
    expectValidScript(buildPrepareScript({ runId: "prepare-official", taskSpaceId: null, variant: official }));
    expectValidScript(buildSubmitScript({ runId: "submit-official", taskSpaceId: 19, variant: official }));
  });

  it("emits the structured worker result before transferring TaskSpace ownership", () => {
    const expectResultBeforeEveryHandoff = (script: string) => {
      let previousHandoff = -1;
      for (const match of script.matchAll(/handOffTaskSpace\(task\.id\)/g)) {
        const handoff = match.index;
        const result = script.lastIndexOf("result(", handoff);
        expect(result).toBeGreaterThan(previousHandoff);
        previousHandoff = handoff;
      }
    };
    for (const platform of ["xiaohongshu", "douyin", "wechat_channels", "bilibili"] as const) {
      const value = variant(platform);
      expectResultBeforeEveryHandoff(buildPrepareScript({ runId: `prepare-order-${platform}`, taskSpaceId: null, variant: value }));
      expectResultBeforeEveryHandoff(buildSubmitScript({ runId: `submit-order-${platform}`, taskSpaceId: 31, variant: value }));
      expectResultBeforeEveryHandoff(buildCancelScript({ runId: `cancel-order-${platform}`, taskSpaceId: 31, variant: value }));
    }
  });
});
