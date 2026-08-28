import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { artifactRef } from "../../core/artifacts.js";
import { projectRoot, runArtifactDir } from "../../core/config.js";
import { runFile } from "../../core/process.js";
import { deepMediaManifestSchema, type DeepMediaManifest, type DeepMediaResolver } from "../../../packages/research/index.js";
import { systemHttpsProxy } from "../network/system-proxy.js";

type Verification = { status: string; transport: { sha256: string; bytes: number }; container: {
  durationSec: number; streams: Array<{ codecType: string; width: number | null; height: number | null }> } };

async function download(url: string, target: string, limit: number): Promise<Buffer> {
  const proxy = await systemHttpsProxy();
  const args = ["--location", "--fail", "--silent", "--show-error", "--remove-on-error",
    "--max-time", "120", "--max-filesize", String(limit), "--user-agent",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/138 Safari/537.36",
    "--referer", "https://www.xiaohongshu.com/", "--output", target];
  if (proxy) args.push("--proxy", proxy);
  args.push(url);
  try { await runFile("curl", args, { timeout: 150_000 }); }
  catch { throw new Error(proxy ? "媒体传输经系统代理失败。" : "媒体传输失败，且未检测到启用的 HTTPS 系统代理。"); }
  const buffer = fs.readFileSync(target);
  if (buffer.byteLength === 0 || buffer.byteLength > limit) throw new Error("媒体为空或超过大小上限");
  return buffer;
}

export class LocalDeepMediaResolver implements DeepMediaResolver {
  async resolve(input: { runId: string; posts: Array<{ externalId: string; videoCandidateUrl: string | null; coverCandidateUrl: string | null; downloadVideo: boolean }> }): Promise<DeepMediaManifest> {
    const root = path.join(runArtifactDir(input.runId), "deep-media");
    fs.mkdirSync(root, { recursive: true });
    const items: DeepMediaManifest["items"] = [];
    for (const post of input.posts) {
      const directory = path.join(root, post.externalId);
      fs.mkdirSync(directory, { recursive: true });
      let coverArtifactRef: string | null = null;
      let coverState: "ready" | "missing" | "download_failed" = post.coverCandidateUrl ? "download_failed" : "missing";
      let coverMessage = post.coverCandidateUrl ? "封面下载尚未完成。" : "页面没有受信的封面候选。";
      if (post.coverCandidateUrl) {
        try {
          await download(post.coverCandidateUrl, path.join(directory, "cover.webp"), 20 * 1024 * 1024);
          coverArtifactRef = artifactRef(input.runId, `deep-media/${post.externalId}/cover.webp`);
          coverState = "ready";
          coverMessage = "封面已下载到本地证据仓。";
        } catch (error) { coverArtifactRef = null; coverMessage = error instanceof Error ? error.message : "封面下载失败"; }
      }
      if (!post.downloadVideo) {
        items.push({ externalId: post.externalId, videoRequested: false, state: "not_requested", coverState, coverMessage,
          videoArtifactRef: null, coverArtifactRef, sha256: null, bytes: null, durationSeconds: null,
          width: null, height: null, hasAudio: null, message: "封面按统一比较集获取；该记录不在四组深度视频下载集。" });
        continue;
      }
      if (!post.videoCandidateUrl) {
        items.push({ externalId: post.externalId, videoRequested: true, state: "missing", coverState, coverMessage,
          videoArtifactRef: null, coverArtifactRef,
          sha256: null, bytes: null, durationSeconds: null, width: null, height: null, hasAudio: null,
          message: "详情页没有解析到可下载的视频候选。" });
        continue;
      }
      const videoPath = path.join(directory, "source-video.mp4");
      let video: Buffer;
      try {
        video = await download(post.videoCandidateUrl, videoPath, 250 * 1024 * 1024);
      } catch (error) {
        items.push({ externalId: post.externalId, videoRequested: true, state: "download_failed", coverState, coverMessage,
          videoArtifactRef: null, coverArtifactRef,
          sha256: null, bytes: null, durationSeconds: null, width: null, height: null, hasAudio: null,
          message: error instanceof Error ? error.message : "视频下载失败" });
        continue;
      }
      try {
        const verificationPath = path.join(directory, "media-verification.json");
        await runFile(process.execPath, [path.join(projectRoot, "scripts", "verify-media.mjs"), "--input", videoPath, "--out", verificationPath], { timeout: 15 * 60_000 });
        const verification = JSON.parse(fs.readFileSync(verificationPath, "utf8")) as Verification;
        if (verification.status !== "verified_complete") throw new Error(`媒体完整性硬闸未通过：${verification.status}`);
        const stream = verification.container.streams.find((entry) => entry.codecType === "video");
        if (!stream) throw new Error("媒体完整性报告未确认视频流");
        items.push({ externalId: post.externalId, videoRequested: true, state: "verified_complete", coverState, coverMessage,
          videoArtifactRef: artifactRef(input.runId, `deep-media/${post.externalId}/source-video.mp4`), coverArtifactRef,
          verificationArtifactRef: artifactRef(input.runId, `deep-media/${post.externalId}/media-verification.json`),
          sha256: verification.transport.sha256, bytes: verification.transport.bytes,
          durationSeconds: verification.container.durationSec, width: stream.width, height: stream.height,
          hasAudio: verification.container.streams.some((entry) => entry.codecType === "audio"),
          message: "下载、全流解码、时间轴抽帧与尾段连续性硬闸通过。" });
      } catch (error) {
        items.push({ externalId: post.externalId, videoRequested: true, state: "verification_failed", coverState, coverMessage,
          videoArtifactRef: null, coverArtifactRef,
          sha256: createHash("sha256").update(video).digest("hex"), bytes: video.byteLength,
          durationSeconds: null, width: null, height: null, hasAudio: null,
          message: error instanceof Error ? error.message : "媒体验证失败" });
      }
    }
    return deepMediaManifestSchema.parse({ schemaVersion: "1.0.0", runId: input.runId, generatedAt: new Date().toISOString(),
      requestedPosts: input.posts.filter((post) => post.downloadVideo).length,
      readyPosts: items.filter((item) => item.state === "verified_complete").length,
      requestedCovers: input.posts.length, readyCovers: items.filter((item) => item.coverState === "ready").length, items,
      unknowns: ["下载成功不证明平台原始母版、版权、人物授权或商业使用权。"] });
  }
}
