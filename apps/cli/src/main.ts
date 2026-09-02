#!/usr/bin/env node
import "dotenv/config";
import type { Server } from "node:http";
import path from "node:path";
import { Command } from "commander";
import { AnalysisService } from "../../../src/core/service.js";
import { RunStore } from "../../../src/core/store.js";
import { apiPort, runtimeDir, webBaseUrl, runFile } from "../../../packages/adapters/index.js";
import { createSignalRoomComposition } from "../../../src/server/composition-root.js";
import { createDurableKnowledgeSystem } from "../../../src/server/content-knowledge.js";
import { HistoricalKnowledgeBackfillService, LocalHistoricalReportArtifactVerifier } from "../../../src/server/knowledge-backfill.js";
import {
  KNOWLEDGE_RESTORE_CONFIRMATION, assertKnowledgeRuntimeOffline, backupKnowledgeRuntime,
  rebuildAndVerifyKnowledgeProjection, restoreKnowledgeRuntime
} from "../../../src/server/knowledge-recovery.js";

const program = new Command();
program.name("selfmedia").description("小红书 / 微信视频号 / X 内容证据分析工作台").version("0.1.0");

function createAnalysisService(): AnalysisService { return new AnalysisService(new RunStore()); }

function printReport(report: ReturnType<AnalysisService["get"]>): void {
  if (!report) throw new Error("分析任务不存在");
  console.log(JSON.stringify({
    id: report.id,
    status: report.status,
    stage: report.currentStage,
    platform: report.platform,
    title: report.source?.title ?? "等待采集",
    summary: report.executiveSummary,
    dashboard: `${webBaseUrl()}/runs/${report.id}`
  }, null, 2));
}

program.command("analyze")
  .description("分析一条公开链接")
  .argument("<url>", "小红书、微信视频号或 X 链接")
  .option("--video <path>", "本地视频文件，用于补充拉片")
  .option("--open", "完成后打开 Dashboard")
  .action(async (url: string, options: { video?: string; open?: boolean }) => {
    const service = createAnalysisService();
    try {
      const report = await service.createAndRun(url, options.video);
      printReport(report);
      if (options.open) await runFile("open", [`${webBaseUrl()}/runs/${report.id}`]);
      process.exitCode = report.status === "failed" ? 1 : 0;
    } finally {
      service.close();
    }
  });

program.command("report")
  .description("读取完整报告")
  .argument("<id>")
  .option("--json", "输出完整 JSON")
  .action((id: string, options: { json?: boolean }) => {
    const service = createAnalysisService();
    try {
      const report = service.get(id);
      if (!report) throw new Error("分析任务不存在");
      if (options.json) console.log(JSON.stringify(report, null, 2));
      else printReport(report);
    } finally {
      service.close();
    }
  });

program.command("list")
  .description("列出最近的分析")
  .option("--limit <number>", "数量", "20")
  .action((options: { limit: string }) => {
    const service = createAnalysisService();
    try { console.log(JSON.stringify(service.list(Number(options.limit)), null, 2)); }
    finally { service.close(); }
  });

program.command("retry")
  .description("重试已有分析")
  .argument("<id>")
  .option("--video <path>")
  .action(async (id: string, options: { video?: string }) => {
    const service = createAnalysisService();
    try { printReport(await service.run(id, options.video)); }
    finally { service.close(); }
  });

program.command("knowledge-backfill")
  .description("规划或执行历史单帖知识回填；默认只读预览")
  .option("--runtime-dir <path>", "隔离 runtime 目录")
  .option("--limit <number>", "最多检查的历史报告", "10000")
  .option("--apply", "显式执行回填")
  .action((options: { runtimeDir?: string; limit: string; apply?: boolean }) => {
    const directory = path.resolve(options.runtimeDir ?? runtimeDir());
    if (options.apply) assertKnowledgeRuntimeOffline(directory);
    const runs = new RunStore(path.join(directory, "self-media.sqlite"), { readOnly: !options.apply });
    const system = options.apply
      ? createDurableKnowledgeSystem(path.join(directory, "content-knowledge.sqlite"), path.join(directory, "research-learning.sqlite"))
      : null;
    try {
      const backfill = new HistoricalKnowledgeBackfillService(runs, system?.contentKnowledge ?? null, new LocalHistoricalReportArtifactVerifier(directory));
      console.log(JSON.stringify(options.apply ? backfill.apply(Number(options.limit)) : backfill.plan(Number(options.limit)), null, 2));
    } finally {
      runs.close();
      system?.contentKnowledge.close();
    }
  });

program.command("knowledge-backup")
  .description("在离线边界创建带哈希清单的 Knowledge runtime 备份")
  .requiredOption("--output <path>", "仓库和 runtime 之外的备份根目录")
  .option("--runtime-dir <path>", "隔离 runtime 目录")
  .action((options: { output: string; runtimeDir?: string }) => {
    console.log(JSON.stringify(backupKnowledgeRuntime({
      runtimeDirectory: path.resolve(options.runtimeDir ?? runtimeDir()), backupRoot: path.resolve(options.output)
    }), null, 2));
  });

program.command("knowledge-restore")
  .description("从已验证备份恢复 Knowledge runtime，并保留恢复前数据库")
  .argument("<backup-directory>")
  .requiredOption("--confirm <token>", `确认词：${KNOWLEDGE_RESTORE_CONFIRMATION}`)
  .option("--runtime-dir <path>", "隔离 runtime 目录")
  .action((backupDirectory: string, options: { confirm: string; runtimeDir?: string }) => {
    console.log(JSON.stringify(restoreKnowledgeRuntime({
      backupDirectory: path.resolve(backupDirectory), runtimeDirectory: path.resolve(options.runtimeDir ?? runtimeDir()), confirmation: options.confirm
    }), null, 2));
  });

program.command("knowledge-rebuild")
  .description("备份后重建并验证 Knowledge 投影")
  .requiredOption("--backup-root <path>", "仓库和 runtime 之外的备份根目录")
  .requiredOption("--apply", "确认执行投影重建")
  .option("--runtime-dir <path>", "隔离 runtime 目录")
  .action((options: { backupRoot: string; runtimeDir?: string; apply: boolean }) => {
    const directory = path.resolve(options.runtimeDir ?? runtimeDir());
    const backup = backupKnowledgeRuntime({ runtimeDirectory: directory, backupRoot: path.resolve(options.backupRoot) });
    const verification = rebuildAndVerifyKnowledgeProjection(path.join(directory, "content-knowledge.sqlite"), path.join(directory, "research-learning.sqlite"));
    console.log(JSON.stringify({ backup, verification }, null, 2));
  });

program.command("serve")
  .description("启动本地 API")
  .option("--port <number>", "端口")
  .action((options: { port?: string }) => {
    const port = Number(options.port ?? apiPort());
    const composition = createSignalRoomComposition();
    const server: Server = composition.app.listen(port, "127.0.0.1", () => {
      console.log(`Self Media Intelligence API: http://127.0.0.1:${port}`);
    });
    let closing = false;
    const shutdown = () => {
      if (closing) return;
      closing = true;
      server.close(() => void composition.close());
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  });

await program.parseAsync();
