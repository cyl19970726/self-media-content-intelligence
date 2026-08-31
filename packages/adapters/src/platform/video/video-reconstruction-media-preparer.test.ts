import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  prepareBuilderInputs,
  reusableSubtitleCandidates
} from "./video-reconstruction-media-preparer.js";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "video-media-prep-"));
  const inputDir = path.join(root, "input");
  const outputDir = path.join(root, "output");
  fs.mkdirSync(inputDir, { recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });
  const videoPath = path.join(inputDir, "source-video.mp4");
  fs.writeFileSync(videoPath, "video-revision-1");
  return { root, inputDir, outputDir, videoPath };
}

describe("video reconstruction media preparation", () => {
  it("reuses frozen subtitles and evidence without invoking a media process", async () => {
    const item = fixture();
    try {
      fs.writeFileSync(path.join(item.outputDir, "source-video.srt"), "1\n00:00:00,000 --> 00:00:01,000\n字幕\n");
      fs.mkdirSync(path.join(item.outputDir, "evidence"), { recursive: true });
      fs.writeFileSync(path.join(item.outputDir, "evidence/evidence-pack.json"), JSON.stringify({
        media: { duration: 1, streams: [{ codecType: "audio" }] }
      }));
      const manifest = await prepareBuilderInputs({
        videoPath: item.videoPath,
        outputDir: item.outputDir,
        skillDir: "/skill",
        executeFile: async () => { throw new Error("media process should not run"); },
        now: () => new Date("2026-08-31T00:00:00.000Z")
      });
      expect(manifest.transcript.origin).toBe("reused_subtitles");
      expect(manifest.evidencePack.reused).toBe(true);
      expect(manifest.sourceMedia.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("runs one bounded multilingual whisper.cpp job and publishes the evidence pack", async () => {
    const item = fixture();
    const calls: Array<{ file: string; args: string[] }> = [];
    try {
      const manifest = await prepareBuilderInputs({
        videoPath: item.videoPath,
        outputDir: item.outputDir,
        skillDir: "/skill",
        whisperCli: "whisper-cli-test",
        whisperModel: "/models/ggml-base.bin",
        language: "zh",
        executeFile: async (file, args) => {
          calls.push({ file, args });
          if (file === "ffprobe") return { stdout: JSON.stringify({
            format: { duration: "26.7" }, streams: [{ codec_type: "audio" }]
          }), stderr: "" };
          if (file === "ffmpeg") {
            fs.writeFileSync(args.at(-1) as string, "wav");
            return { stdout: "", stderr: "" };
          }
          if (file === "whisper-cli-test") {
            const prefix = args[args.indexOf("-of") + 1] as string;
            fs.writeFileSync(`${prefix}.srt`, "1\n00:00:00,000 --> 00:00:26,700\n(音乐)\n");
            return { stdout: "", stderr: "" };
          }
          if (file === process.execPath) {
            const out = args[args.indexOf("--out") + 1] as string;
            fs.mkdirSync(out, { recursive: true });
            fs.writeFileSync(path.join(out, "evidence-pack.json"), JSON.stringify({ media: { duration: 26.7 } }));
            return { stdout: "{}", stderr: "" };
          }
          throw new Error(`unexpected process: ${file}`);
        },
        now: () => new Date("2026-08-31T00:00:00.000Z")
      });
      expect(calls.map((call) => call.file)).toEqual([
        "ffprobe", "ffmpeg", "whisper-cli-test", process.execPath
      ]);
      expect(calls[2]?.args).toEqual(expect.arrayContaining(["-l", "zh", "-m", "/models/ggml-base.bin"]));
      expect(manifest.transcript).toMatchObject({
        origin: "machine_transcription",
        provider: "whisper.cpp:ggml-base.bin",
        language: "zh"
      });
      expect(fs.readFileSync(path.join(item.outputDir, "source-video.srt"), "utf8")).toContain("音乐");
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });

  it("includes a supplied subtitle next to the source video in the reusable candidates", () => {
    const item = fixture();
    try {
      expect(reusableSubtitleCandidates(item.videoPath, item.outputDir)).toContain(
        path.join(item.inputDir, "source-video.srt")
      );
    } finally {
      fs.rmSync(item.root, { recursive: true, force: true });
    }
  });
});
