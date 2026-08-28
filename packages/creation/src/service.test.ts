import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SQLitePublishingRepository } from "../../../src/platform/database/sqlite-publishing-repository.js";
import type {
  BrowserCancelResult, BrowserPrepareResult, BrowserPublicationInput,
  BrowserPublisher, BrowserSubmitResult, PlatformVariant
} from "./contracts.js";
import { PublishingService, type PlatformPublishers } from "./service.js";

const directories: string[] = [];
const services: PublishingService[] = [];

afterEach(() => {
  services.splice(0).forEach((service) => service.close());
  directories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

class FixturePublisher implements BrowserPublisher {
  submitResult: BrowserSubmitResult = {
    state: "published", taskSpaceId: 7,
    receipt: { externalId: "post-1", externalUrl: "https://example.com/post-1", platformState: "submitted", verifiedAt: new Date().toISOString() }
  };
  prepareCalls = 0;
  submitCalls = 0;

  async prepare(input: BrowserPublicationInput): Promise<BrowserPrepareResult> {
    this.prepareCalls += 1;
    return { state: "preview_ready", taskSpaceId: 7, preview: {
      url: "https://example.com/preview", pageTitle: "发布页", preparedTitle: input.variant.title,
      preparedBody: input.variant.body, mediaCount: input.variant.media.length, capturedAt: new Date().toISOString()
    } };
  }
  async submit(): Promise<BrowserSubmitResult> { this.submitCalls += 1; return this.submitResult; }
  async cancel(input: BrowserPublicationInput): Promise<BrowserCancelResult> {
    return { state: "canceled", taskSpaceId: input.taskSpaceId, draftSaved: input.variant.platform === "xiaohongshu" };
  }
}

function fixture(): { service: PublishingService; repository: SQLitePublishingRepository; publisher: FixturePublisher; mediaPath: string; dbPath: string } {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "publishing-service-"));
  directories.push(directory);
  const mediaPath = path.join(directory, "video.mp4");
  fs.writeFileSync(mediaPath, "fixture");
  const dbPath = path.join(directory, "publishing.sqlite");
  const publisher = new FixturePublisher();
  const publishers: PlatformPublishers = {
    xiaohongshu: publisher,
    douyin: publisher,
    wechat_channels: publisher,
    wechat_official_account: publisher,
    bilibili: publisher
  };
  const repository = new SQLitePublishingRepository(dbPath);
  const service = new PublishingService(repository, { exists: fs.existsSync }, publishers);
  services.push(service);
  return { service, repository, publisher, mediaPath, dbPath };
}

function variant(service: PublishingService, mediaPath: string): PlatformVariant {
  const contentPackage = service.createPackage({ name: "发布闭环", brief: "fixture", sourceRefs: [] });
  return service.createVariant(contentPackage.id, {
    platform: "douyin", title: "可靠发布测试", body: "正文", contentType: "video",
    media: [{ kind: "video", localPath: mediaPath, mimeType: "video/mp4" }], tags: ["测试"], visibility: "private", scheduledAt: null,
    platformOptions: { douyin: { declaration: "self_made" } }
  });
}

describe("PublishingService", () => {
  it("prepares, freezes approval revision, and publishes through durable jobs", async () => {
    const { service, publisher, mediaPath } = fixture();
    const createdVariant = variant(service, mediaPath);
    const run = service.createRun(createdVariant.id);
    service.prepare(run.id);
    expect(await service.processNext("worker-1")).toBe(true);
    const preview = service.getRun(run.id);
    expect(preview?.status).toBe("preview_ready");
    expect(preview?.browserTaskSpaceId).toBe(7);

    service.approve(run.id, createdVariant.revision);
    expect(await service.processNext("worker-1")).toBe(true);
    const published = service.getRun(run.id);
    expect(published?.status).toBe("published");
    expect(published?.receipt?.externalId).toBe("post-1");
    expect(publisher.prepareCalls).toBe(1);
    expect(publisher.submitCalls).toBe(1);
    expect(service.events(run.id).map((event) => event.type)).toContain("publication.published");
  });

  it("invalidates a prepared run when its variant revision changes", async () => {
    const { service, mediaPath } = fixture();
    const createdVariant = variant(service, mediaPath);
    const run = service.createRun(createdVariant.id);
    service.prepare(run.id);
    await service.processNext("worker-1");
    service.updateVariant(createdVariant.id, {
      platform: "douyin", title: "已修改标题", body: "新正文", contentType: "video",
      media: [{ kind: "video", localPath: mediaPath, mimeType: "video/mp4" }], tags: [], visibility: "private", scheduledAt: null,
      platformOptions: { douyin: { declaration: "self_made" } }
    });
    expect(service.getRun(run.id)?.status).toBe("superseded");
    expect(() => service.approve(run.id, createdVariant.revision)).toThrow("发布页尚未准备好");
  });

  it("stops on an ambiguous submission and never retries it automatically", async () => {
    const { service, publisher, mediaPath } = fixture();
    const createdVariant = variant(service, mediaPath);
    const run = service.createRun(createdVariant.id);
    service.prepare(run.id);
    await service.processNext("worker-1");
    publisher.submitResult = { state: "submission_unknown", taskSpaceId: 7, code: "unverified", message: "无法验证" };
    service.approve(run.id, createdVariant.revision);
    await service.processNext("worker-1");
    expect(service.getRun(run.id)?.status).toBe("submission_unknown");
    expect(await service.processNext("worker-1")).toBe(false);
    expect(publisher.submitCalls).toBe(1);
  });

  it("never invokes submit again after a submitted job lease expires", async () => {
    const { service, repository, publisher, mediaPath } = fixture();
    const createdVariant = variant(service, mediaPath);
    const run = service.createRun(createdVariant.id);
    service.prepare(run.id);
    await service.processNext("worker-1");
    service.approve(run.id, createdVariant.revision);
    const leased = repository.claimNext("crashed-worker", new Date().toISOString(), "2000-01-01T00:00:00.000Z");
    expect(leased?.nodeKey).toBe("publication.submit");
    expect(await service.processNext("replacement-worker")).toBe(true);
    expect(service.getRun(run.id)?.status).toBe("submission_unknown");
    expect(service.getRun(run.id)?.blockerCode).toBe("attempts_exhausted");
    expect(publisher.submitCalls).toBe(0);
  });

  it("persists package, variant, run, and events across repository instances", () => {
    const { service, mediaPath, dbPath } = fixture();
    const createdVariant = variant(service, mediaPath);
    const run = service.createRun(createdVariant.id);
    service.close();
    services.splice(services.indexOf(service), 1);
    const reopened = new PublishingService(new SQLitePublishingRepository(dbPath), { exists: fs.existsSync });
    services.push(reopened);
    expect(reopened.listPackages()).toHaveLength(1);
    expect(reopened.getPackage(createdVariant.packageId)?.variants).toHaveLength(1);
    expect(reopened.getRun(run.id)?.variantRevision).toBe(1);
    expect(reopened.events(run.id)).toHaveLength(1);
  });

  it("rejects unsupported media combinations and missing files", () => {
    const { service, mediaPath } = fixture();
    const contentPackage = service.createPackage({ name: "校验", brief: "", sourceRefs: [] });
    expect(() => service.createVariant(contentPackage.id, {
      platform: "douyin", title: "错误图文", body: "", contentType: "image",
      media: [{ kind: "image", localPath: mediaPath, mimeType: "image/jpeg" }], tags: [], visibility: "public", scheduledAt: null
    })).toThrow("抖音首版只支持视频");
    const created = service.createVariant(contentPackage.id, {
      platform: "xiaohongshu", title: "合法标题", body: "", contentType: "video",
      media: [{ kind: "video", localPath: path.join(path.dirname(mediaPath), "missing.mp4"), mimeType: "video/mp4" }], tags: [], visibility: "public", scheduledAt: null,
      platformOptions: { xiaohongshu: {} }
    });
    expect(() => service.createRun(created.id)).toThrow("素材文件不存在");
  });

  it("enforces the media contract for Channels, Bilibili, and Official Account", () => {
    const { service, mediaPath } = fixture();
    const contentPackage = service.createPackage({ name: "多平台", brief: "", sourceRefs: [] });
    for (const platform of ["wechat_channels", "bilibili"] as const) {
      expect(() => service.createVariant(contentPackage.id, {
        platform, title: "错误图文", body: "", contentType: "image",
        media: [{ kind: "image", localPath: mediaPath, mimeType: "image/png" }], tags: [], visibility: "public", scheduledAt: null
      })).toThrow("首版只支持视频发布");
    }
    expect(() => service.createVariant(contentPackage.id, {
      platform: "wechat_official_account", title: "错误视频", body: "", contentType: "video",
      media: [{ kind: "video", localPath: mediaPath, mimeType: "video/mp4" }], tags: [], visibility: "public", scheduledAt: null
    })).toThrow("只支持一张图文章草稿");
    expect(service.createVariant(contentPackage.id, {
      platform: "wechat_official_account", title: "公众号一张图", body: "运营备注", contentType: "article",
      media: [{ kind: "image", localPath: mediaPath, mimeType: "image/png" }], tags: [], visibility: "public", scheduledAt: null,
      platformOptions: { wechat_official_account: { bodyMode: "one_image" } }
    }).contentType).toBe("article");
    expect(() => service.createVariant(contentPackage.id, {
      platform: "wechat_channels", title: "联调测试-勿发布", body: "", contentType: "video",
      media: [{ kind: "video", localPath: mediaPath, mimeType: "video/mp4" }], tags: [], visibility: "public", scheduledAt: null
    })).toThrow("短标题不支持连字符");
  });

  it("records a verified Official Account draft without claiming it was published", async () => {
    const { service, publisher, mediaPath } = fixture();
    const contentPackage = service.createPackage({ name: "公众号", brief: "", sourceRefs: [] });
    const createdVariant = service.createVariant(contentPackage.id, {
      platform: "wechat_official_account", title: "草稿测试", body: "", contentType: "article",
      media: [{ kind: "image", localPath: mediaPath, mimeType: "image/png" }], tags: [], visibility: "public", scheduledAt: null,
      platformOptions: { wechat_official_account: { bodyMode: "one_image" } }
    });
    const run = service.createRun(createdVariant.id);
    service.prepare(run.id);
    await service.processNext("worker-1");
    publisher.submitResult = {
      state: "draft_saved", taskSpaceId: 7,
      receipt: { externalId: "appmsg-1", externalUrl: "https://mp.weixin.qq.com/editor?appmsgid=appmsg-1", platformState: "draft_saved", verifiedAt: new Date().toISOString() }
    };
    service.approve(run.id, createdVariant.revision);
    await service.processNext("worker-1");
    expect(service.getRun(run.id)?.status).toBe("draft_saved");
    expect(service.events(run.id).map((event) => event.type)).toContain("publication.draft_saved");
  });
});
