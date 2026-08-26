# 运行说明

## 输入与范围

- 仅读取：`reconstruction.json`、`probe.json`、`capture-protocol.json`。
- 输出：`article.md`（中文视频内容复原）与本文件。
- 未修改 `reconstruction.json` 或任何其他既有文件。

## 已用证据清单（由输入记录）

- 标准帧：174 张。
- 高分辨率帧：12 张。
- 标准 OCR：1,440 条。
- 高分辨率 OCR：277 条。
- 覆盖范围：0.00–29.80 秒；输入记录声明 13 种信息载体、10 个意义变化、10 个关系假设、13 个关键问题与 17 条原始 SRT cue 均已闭合或明确标注未知。

## Schema 状态

任务前提明确称 canonical `reconstruction.json` 已完整且 schema-valid；其 schema 版本标识为 `video-reconstruction-1.0`。本次仅按要求读取三份 JSON 并据此写作，未对源 JSON 作修改，也未额外运行独立 schema 校验。

## 写作排除与边界

- 未添加下游的传播性、爆款性、仿作或复制策略分析。
- 未把剪辑相邻关系写成已证实的生成或文件因果关系。
- 未补造上传、发送、生成、复制、保存、导出、浏览器打开或播放操作。
- 保留机器 SRT 与烧录字幕/OCR 的冲突边界；不静默校正原始 SRT。
- 保留 TTS 播放、卡通来源/生成关系、访问路径、版本、账号、价格、地区与支持条件为未建立信息。
- 未生成独立 evaluation 或 gate，也未作任何完成就绪声明。
