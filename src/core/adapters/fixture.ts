import fs from "node:fs";
import path from "node:path";
import { fixtureCollection } from "../fixtures.js";
import { runArtifactDir } from "../config.js";
import { runFile } from "../process.js";
import type { PlatformAdapter } from "./types.js";

async function ensureFixtureVideo(runId: string): Promise<string> {
  const directory = runArtifactDir(runId);
  const output = path.join(directory, "fixture-video.mp4");
  fs.mkdirSync(directory, { recursive: true });
  if (fs.existsSync(output)) return output;

  await runFile("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", "color=c=#176B67:s=720x1280:d=3:r=25",
    "-f", "lavfi", "-i", "color=c=#F2EFE7:s=720x1280:d=3:r=25",
    "-f", "lavfi", "-i", "color=c=#D9522B:s=720x1280:d=3:r=25",
    "-filter_complex", "[0:v][1:v][2:v]concat=n=3:v=1:a=0,format=yuv420p[v]",
    "-map", "[v]", "-movflags", "+faststart", output
  ], { timeout: 90_000 });
  return output;
}

export const fixtureAdapter: PlatformAdapter = {
  async collect(parsed, runId) {
    const result = fixtureCollection(parsed);
    result.localVideoPath = await ensureFixtureVideo(runId);
    if (result.source) {
      result.source.media = [{
        kind: "video",
        url: null,
        localPath: result.localVideoPath,
        mimeType: "video/mp4"
      }];
    }
    return result;
  }
};
