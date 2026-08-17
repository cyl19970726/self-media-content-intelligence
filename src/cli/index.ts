#!/usr/bin/env node
import { Command } from "commander";
import { createApp } from "../server/app.js";
import { AnalysisService } from "../core/service.js";
import { apiPort, webBaseUrl } from "../core/config.js";
import { runFile } from "../core/process.js";

const program = new Command();
program.name("selfmedia").description("小红书 / X 内容证据分析工作台").version("0.1.0");

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
  .argument("<url>", "小红书或 X 链接")
  .option("--video <path>", "本地视频文件，用于补充拉片")
  .option("--open", "完成后打开 Dashboard")
  .action(async (url: string, options: { video?: string; open?: boolean }) => {
    const service = new AnalysisService();
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
    const service = new AnalysisService();
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
    const service = new AnalysisService();
    try { console.log(JSON.stringify(service.list(Number(options.limit)), null, 2)); }
    finally { service.close(); }
  });

program.command("retry")
  .description("重试已有分析")
  .argument("<id>")
  .option("--video <path>")
  .action(async (id: string, options: { video?: string }) => {
    const service = new AnalysisService();
    try { printReport(await service.run(id, options.video)); }
    finally { service.close(); }
  });

program.command("serve")
  .description("启动本地 API")
  .option("--port <number>", "端口")
  .action((options: { port?: string }) => {
    const port = Number(options.port ?? apiPort());
    createApp().listen(port, "127.0.0.1", () => {
      console.log(`Self Media Intelligence API: http://127.0.0.1:${port}`);
    });
  });

await program.parseAsync();
