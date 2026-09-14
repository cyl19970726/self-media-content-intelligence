#!/usr/bin/env node
import "dotenv/config";
import { startSignalRoomServer } from "../../../src/server/http-runtime.js";
import path from "node:path";
import { Command } from "commander";
import { apiPort, runtimeDir } from "../../../packages/adapters/index.js";
import { createSignalRoomComposition } from "../../../src/server/composition-root.js";
import {
  KNOWLEDGE_RESTORE_CONFIRMATION, assertKnowledgeRuntimeOffline, backupKnowledgeRuntime,
  rebuildAndVerifyKnowledgeProjection, restoreKnowledgeRuntime
} from "../../../src/server/knowledge-recovery.js";

const program = new Command();
program.name("selfmedia").description("小红书 / X 内容证据分析工作台").version("0.1.0");

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
    assertKnowledgeRuntimeOffline(directory);
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
    startSignalRoomServer(composition, port);
  });

await program.parseAsync();
