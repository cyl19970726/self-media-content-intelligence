import { randomUUID } from "node:crypto";
import { fixtureAdapter } from "./adapters/fixture.js";
import { xAdapter } from "./adapters/x.js";
import { xiaohongshuAdapter } from "./adapters/xiaohongshu.js";
import type { PlatformAdapter } from "./adapters/types.js";
import { writeArtifact } from "../../packages/adapters/index.js";
import { analyzeMedia, resolveVideo } from "./media.js";
import { buildAnalysis } from "./report.js";
import { RunStore } from "./store.js";
import { parseSourceUrl } from "./url-router.js";
import { emptyReportV2, type ParsedSource, type ReportEnvelope } from "../shared/schema.js";

export interface AnalysisCompletionPort {
  publish(report: ReportEnvelope): void;
}

function now(): string {
  return new Date().toISOString();
}

function initialReport(parsed: ParsedSource): ReportEnvelope {
  const timestamp = now();
  return {
    ...emptyReportV2(),
    schemaVersion: "2.0.0", id: randomUUID(), sourceUrl: parsed.sourceUrl, shareTitle: parsed.shareTitle,
    platform: parsed.platform, status: "queued", currentStage: "等待采集",
    createdAt: timestamp, updatedAt: timestamp,
    stages: [
      { id: "collect", label: "采集", status: "pending", startedAt: null, finishedAt: null, message: null, artifactRefs: [] },
      { id: "media", label: "拉片", status: "pending", startedAt: null, finishedAt: null, message: null, artifactRefs: [] },
      { id: "analyze", label: "分析", status: "pending", startedAt: null, finishedAt: null, message: null, artifactRefs: [] }
    ],
    source: null, mediaBreakdown: null,
    derivedMetrics: { engagementRate: null, deepValueRate: null, conversationRate: null, amplificationRate: null },
    executiveSummary: "等待采集与分析。", findings: [], limitations: []
  };
}

function stage(report: ReportEnvelope, id: "collect" | "media" | "analyze") {
  const value = report.stages.find((entry) => entry.id === id);
  if (!value) throw new Error(`missing stage ${id}`);
  return value;
}

export class AnalysisService {
  constructor(private readonly store: RunStore, private readonly completion?: AnalysisCompletionPort) {}

  create(inputUrl: string): ReportEnvelope {
    const report = initialReport(parseSourceUrl(inputUrl));
    this.store.save(report);
    return report;
  }

  async createAndRun(inputUrl: string, localVideoPath?: string): Promise<ReportEnvelope> {
    const report = this.create(inputUrl);
    return this.run(report.id, localVideoPath);
  }

  async run(id: string, localVideoPath?: string): Promise<ReportEnvelope> {
    const report = this.store.get(id);
    if (!report) throw new Error("分析任务不存在");
    const parsed = { ...parseSourceUrl(report.sourceUrl), shareTitle: report.shareTitle };
    report.status = "running";
    report.updatedAt = now();
    report.currentStage = "正在采集";
    const collectStage = stage(report, "collect");
    collectStage.status = "running";
    collectStage.startedAt = now();
    this.store.save(report);
    try {
      const adapter: PlatformAdapter = parsed.fixture
        ? fixtureAdapter : parsed.platform === "x" ? xAdapter : xiaohongshuAdapter;
      const collected = await adapter.collect(parsed, id);
      const rawRef = writeArtifact(id, "source-raw.json", collected.rawPayload);
      collectStage.artifactRefs = [rawRef];
      collectStage.finishedAt = now();
      collectStage.message = collected.message;
      collectStage.status = collected.state === "ready" ? "complete" : collected.state;
      report.source = collected.source;
      report.context = collected.context;
      report.context.rawArtifactRefs = [rawRef];
      if (report.source) report.source.rawArtifactRef = rawRef;
      report.updatedAt = now();

      if (!report.source) {
        report.status = "blocked";
        report.currentStage = "采集受阻";
        const mediaStage = stage(report, "media");
        mediaStage.status = "blocked";
        mediaStage.message = "等待采集完成后才能拉片。";
        const analyzeStage = stage(report, "analyze");
        analyzeStage.status = "blocked";
        analyzeStage.message = "没有可验证的源数据，未生成推测性报告。";
        report.executiveSummary = collected.message ?? "采集受阻。";
        report.limitations = [report.executiveSummary];
        this.store.save(report);
        return report;
      }

      report.currentStage = "正在拉片";
      const mediaStage = stage(report, "media");
      mediaStage.status = "running";
      mediaStage.startedAt = now();
      this.store.save(report);
      const videoPath = await resolveVideo(id, report.source, localVideoPath ?? collected.localVideoPath);
      if (videoPath) {
        report.mediaBreakdown = await analyzeMedia(id, videoPath);
        mediaStage.status = "complete";
        mediaStage.message = report.mediaBreakdown.hasAudio === false ? "已完成画面拉片；素材无音轨。" : "已完成媒体探测、抽帧与转录尝试。";
        mediaStage.artifactRefs = [report.mediaBreakdown.contactSheetRef].filter((value): value is string => Boolean(value));
      } else {
        mediaStage.status = "partial";
        mediaStage.message = "帖子数据已采集，但未获得可读取的视频文件。";
      }
      mediaStage.finishedAt = now();

      report.currentStage = "正在生成报告";
      const analyzeStage = stage(report, "analyze");
      analyzeStage.status = "running";
      analyzeStage.startedAt = now();
      this.store.save(report);
      Object.assign(report, buildAnalysis(report.source, report.mediaBreakdown, report.context));
      report.schemaVersion = "2.0.0";
      const reportRef = writeArtifact(id, "report.json", report);
      analyzeStage.status = "complete";
      analyzeStage.finishedAt = now();
      analyzeStage.message = "报告已基于采集证据生成。";
      analyzeStage.artifactRefs = [reportRef];
      report.status = collectStage.status === "complete" && mediaStage.status === "complete" ? "complete" : "partial";
      report.currentStage = report.status === "complete" ? "分析完成" : "部分完成";
      report.updatedAt = now();
      this.store.save(report);
      writeArtifact(id, "report.json", report);
      try {
        this.completion?.publish(report);
      } catch (error) {
        const reason = error instanceof Error ? error.message : "未知错误";
        analyzeStage.message = `报告完成；知识贡献写入失败：${reason}`;
        report.limitations = [...report.limitations, `知识贡献未写入：${reason}`];
        report.updatedAt = now();
        this.store.save(report);
        writeArtifact(id, "report.json", report);
      }
      return report;
    } catch (error) {
      report.status = "failed";
      report.currentStage = "分析失败";
      report.updatedAt = now();
      const active = report.stages.find((entry) => entry.status === "running");
      if (active) {
        active.status = "failed";
        active.finishedAt = now();
        active.message = error instanceof Error ? error.message : "未知错误";
      }
      report.executiveSummary = error instanceof Error ? error.message : "分析失败";
      report.limitations = ["本次运行失败，报告没有被补造。请检查阶段错误后重试。"];
      this.store.save(report);
      return report;
    }
  }

  get(id: string) { return this.store.get(id); }
  list(limit?: number) { return this.store.list(limit); }
  close() { this.store.close(); }
}
