import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { AnalysisService } from "./service.js";
import { RunStore } from "./store.js";

describe("AnalysisService vertical slice", () => {
  let runtime: string;

  beforeAll(() => {
    runtime = fs.mkdtempSync(path.join(os.tmpdir(), "self-media-test-"));
    process.env.SELF_MEDIA_RUNTIME_DIR = runtime;
  });

  it("completes collection, media breakdown, and evidence report", async () => {
    const store = new RunStore(path.join(runtime, "test.sqlite"));
    const service = new AnalysisService(store);
    const report = await service.createAndRun("fixture://xiaohongshu/vertical-slice");
    expect(report.schemaVersion).toBe("2.0.0");
    expect(report.status).toBe("complete");
    expect(report.stages.every((stage) => stage.status === "complete")).toBe(true);
    expect(report.mediaBreakdown?.shots).toHaveLength(3);
    expect(report.mediaBreakdown?.contactSheetRef).toContain(report.id);
    expect(report.findings.some((finding) => finding.grade === "fact")).toBe(true);
    expect(report.findings.some((finding) => finding.grade === "inference")).toBe(true);
    expect(report.benchmark.status).toBe("ready");
    expect(report.dataAnalysis.status).toBe("ready");
    expect(report.dataAnalysis.indicators.length).toBeGreaterThanOrEqual(6);
    expect(report.evidenceCoverage.percent).toBeGreaterThan(50);
    expect(report.mediaBreakdown?.sceneDetectionMethod).toContain("scene-change");
    expect(report.audienceAnalysis.themes.length).toBeGreaterThan(2);
    expect(service.get(report.id)?.source?.rawArtifactRef).toContain("source-raw.json");
    service.close();
  }, 30_000);
});
