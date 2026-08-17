# Skill run notes

## 输入与边界

本次只读取：

- `/Users/hhh0x/self-media/artifacts/creator-research/ai-red-witch/low-vs-high/media/66011c23000000000d00ed40.mp4`
- `/Users/hhh0x/self-media/artifacts/creator-research/ai-red-witch/low-vs-high/media/66011c23000000000d00ed40.srt`
- `/Users/hhh0x/self-media/artifacts/video-content-reconstruction-eval/dev-argument/evidence/evidence-pack.json`
- canonical Skill `/Users/hhh0x/.codex/skills/video-content-reconstruction/SKILL.md` 及其直接引用的 5 个 reference 文件、3 个 schema、定向取证脚本。

未读取任何既有 report、analysis、editorial notes 或其他 agent 输出；未做互联网或外部事实核验。唯一写入范围是本 `skill-run/` 目录。

## 实跑记录

1. 完整阅读 Skill、probe/evidence-policy/capture-protocol/reconstruction/evaluation 引用与 probe/protocol/reconstruction schema。
2. 从 evidence-pack 读取并完整检查 55 个逐字稿 cue、19 个 shot、92 个 2.5 秒 dense probe 索引和 cue↔frame↔shot 映射。
3. 从指定视频本身生成 4 张首轮联系表，检查持久标题、同步字幕、采访/报道/估算截图、样片、运动序列、反应蒙太奇和结尾反转；文件位于 `probe-frames/`。
4. 写入 `probe.json` 和由探测项逐项派生的 `capture-protocol.json`。
5. 按 Skill 脚本执行：

   `capture-protocol-evidence.mjs --video ... --protocol ... --out .../targeted-evidence`

   结果为 13 个 capture action、377 个 targeted frames。
6. 检查全部 action 的联系表；对海盗船正例与吹蜡烛反例额外检查 before/during/after 单帧。联系表位于 `targeted-evidence/contact-sheets/`。
7. 写入 `reconstruction.json`：19 个知识单元（15 core）、17 条结构化关系、11/11 meaning changes、10/10 critical questions 的答案/正确未知、逐 cue 完整 transcript、coverage matrix 和 meta-gate。
8. 从结构化重建生成 `article.md`，未加入下游传播分析或视频外知识。

## 自检结果

- JSON 语法：`probe.json`、`capture-protocol.json`、`targeted-evidence.json`、`reconstruction.json` 均可解析。
- Schema：probe、capture protocol、reconstruction 均通过本地 schema 约束检查。当前工作区 Ajv 不内置 draft-2020-12 metaschema，因此检查时移除 `$schema` 元字段并禁用 schema 自验证；字段、类型、required、enum、const 和内部 `$ref` 约束仍被执行。
- Transcript：55/55 cue 与 evidence-pack 在 `id/start/end/text/representativeFrame/overlappingShots` 六个字段上逐项、逐字符一致。
- Evidence refs：所有 knowledge unit 与 relation 的 cue/shot/frame/targeted_frame/source 引用均可在 evidence-pack 或 targeted manifest 中解析；无坏引用。
- Core evidence：15/15 core units 至少有一个有效证据引用。
- 运动证据：海盗船使用 TARGET-0289/0304/0319 的序列；吹蜡烛使用 TARGET-0333/0335/0337 的前/中/后状态，没有用中点单帧代替整个动作。
- 未知纪律：实际价格、失败率、开放日期、样片代表性、品牌设问答案、AGI 主张等均未补写。
- 元问题已逐字回答；runner 自检未发现未检查的可用载体、意义变化或关系。

## 仍需独立验收的问题

- `metaGate.pass=true` 是本次 Skill runner 的协议内自检，不是独立 meta auditor 结论。
- 本任务的指定交付清单没有要求 `evaluation.json` 或 `gate-report.json`，且 runner 不能独立证明自己的完整性，因此未运行依赖独立 evaluation 的 `validate-reconstruction.mjs`，也未使用 `READY_FOR_DOWNSTREAM_USE`。
- platform_srt 中存在 `索尔/sorry/siri/sura`、`纹身视频模型`、`Big swords` 等疑似转写问题；verbatim 层按合同完全保留，article 仅在可读层按上下文使用 Sora/OpenAI 等名称。
- platform_srt 与真实音轨是否逐字一致没有独立音频转写作为交叉验证。
- 报道/估算截图中的细小原文没有做外部 OCR 核验；重建只保留可见来源线索、同步字幕和作者转述。
- CAP-03/06/07 的 OCR review 模式由脚本自动扩展为高密度帧，导致 377 帧总量较大，但全部仍位于授权目录。

## 产物

- `probe.json`
- `capture-protocol.json`
- `targeted-evidence/targeted-evidence.json` 与 frames/contact-sheets
- `reconstruction.json`
- `article.md`
- `run-notes.md`

本记录不宣布 READY。
