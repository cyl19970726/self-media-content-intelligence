# Discrepancies：690ac8730000000004014f67

本文件只记录目标视频的新独立审计与本次 skill-run 候选之间的差异；未使用旧报告、旧分析库或其他视频的 evaluation。

## D-01｜Critical｜非语音音频通道被错误计为已检查

- **候选**：`probe.json` 将 `CAR-08` 标成 `available=true, inspected=true`；`reconstruction.json` 的 coverage matrix 也将其计为已检查，并据此自报 `metaGate.pass=true`。
- **实际证据**：`ACT-AUDIO` 使用 `exact_times`，捕获结果是 `TARGET-0098` 至 `TARGET-0103` 六张静态视频帧；`audio-metadata.json` 只确认 AAC、44.1kHz、双声道和时长。
- **差异**：静态帧和媒体元数据不能检查音乐、音效、停顿、节拍或其叙事作用。把“知道音轨存在”写成“音频载体已检查”是一个假位 GATE。
- **影响**：`uncheckedChannels` 不为零，独立 meta-gate 必须 FAIL。

## D-02｜High｜候选的 meta-gate 使用自身声明证明自身覆盖

- **候选**：meta rationale 说非语音音频“不是未检查，而是经媒体探测后因工具证据不足明确保持 unknown”。
- **独立判定**：unknown discipline 与 carrier inspection 是两件事。承认“不知道音频内容”是正确克制，但不能据此证明内容通道已经检查。
- **影响**：候选的 `metaGate.pass=true` 与独立 metaAudit 的 `pass=false` 冲突。

## D-03｜Medium｜targeted-evidence 与最终 capture protocol 不同步

- **最终协议**：`ACT-LOGO` 的原因是捕获 3.10–3.45 秒 Lovart 短卡，并把 Lovart—Logo 的编辑映射与真实生成因果分开。
- **捕获清单**：`TARGET-0011` 至 `TARGET-0016` 的 carrier/reason 仍写“确认 1.9–3.1 秒没有新工具卡”“即梦持续指代”。这与帧中实际出现的 Lovart 卡、最终协议及重建相矛盾。
- **影响**：帧本身仍能支持 Lovart 结论，所以内容 GATE 未失败；但协议→捕获→重建的可追溯性不闭合，显示 capture manifest 来自旧版协议或未随协议更新。

## D-04｜Low｜“五段”旧措辞残留

- **候选残留**：`targeted-evidence.json` 的 `ACT-STRUCTURE` reason 写“比较五个卡片—结果段”；`capture-protocol.json` 的 `parallel_not_pipeline_relation` reason 也写“五段互相重置”。
- **独立审计**：视频是六张工具卡、六类结果、六段并列映射。
- **影响**：最终 `reconstruction.json` 和 `article.md` 已正确写成六段，故不降低关键问题召回，但应视为协议版本一致性缺陷。

## 无内容差异的审计重点

以下高风险点候选均与独立审计一致：

- 即梦—豆包水印冲突被明确保留；
- Lovart 副文案未扩写；
- PPT、UI、3D、网页计数单位准确；
- 六段没有被误写成工作流；
- 所有工具—示例真实生成因果、输入、过程、文件和采用条件均保持未知。
