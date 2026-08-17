# Discrepancies：6801c0750000000007037156

## D-00 — Coverage matrix 的 relationship evidence 引用不满足确定性契约

- 严重度：**Hard GATE**
- Candidate：`reconstruction.json` 的 `coverageMatrix.relationships[REL-01..REL-10].evidenceRefs` 同时放入了 `KU-*` 单元 ID 与直接证据引用。
- Canonical validator：该字段只接受 cue、shot、frame 或 source ref；`KU-*` 在这里不解析。确定性验证产生 21 个 `relationship_evidence:*:KU-*` 问题，使 `coverage_matrix` 失败。
- 判定：10/10 relationship rows 均不满足 coverage-matrix ref integrity。由于每行同时存在有效的 `CUE-*`、`TARGET-*` 等直接证据，这不是关系内容无证据，而是结构化覆盖矩阵契约不合规。
- 回闭包方向：保留 `unitIds` 只用于 schema 明确允许的映射字段；`coverageMatrix.relationships[].evidenceRefs` 仅放可直接解析的 evidence ref。不得由 evaluator 直接修改 candidate。

## D-01 — 非语音音频被“存在性确认”冒充为内容检查

- 严重度：**Hard GATE**
- Candidate：`probe.json` 的 `CAR-09` 标为 available/inspected；`capture-protocol.json` 没有执行音频听辨或分析动作；`reconstruction.json` 的 `KU-19` 只用 AAC 元数据证明音轨存在，并把内容与作用留作 unknown；内部 meta-gate 随后宣布没有 unchecked channel。
- Audit：`CAR-10` 与 `CQ-13` 记录了实际音轨观察——低音量配乐/氛围存在，但没有能独立证明发送、复制或粘贴的 UI 声音。
- 判定：unknown 不是对可访问载体跳过检查的许可证。该通道仍未闭合，触发 `uncheckedChannels` 与独立 meta-gate 失败。
- 回闭包方向：执行覆盖 0–29.067 秒的真实听辨/音频分析，记录语音外成分、时间范围、作用，以及是否存在步骤性声音证据；不能只依赖 `hasAudio=true`。

## D-02 — 隐私/数据处理边界未被明确保留

- 严重度：Minor
- Candidate：`KU-15` 与 article 枚举访问、价格、地区、账号、版本、文件扩展名、支持主体、风险提示与失败条件，但没有明确写“隐私提示/数据处理边界在完整时间线中未建立”。
- Audit：`NEG-02` 和 `CQ-10` 将隐私提示列为独立检查项并给出有界负证据。
- 判定：不造成 unknown-discipline 硬闸失败，但计为 1 个未充分命名的 unknown opportunity，故为 14/15。

## D-03 — 前后文本同一性仅被间接约束

- 严重度：Minor
- Candidate：通过“是否所有文字都完整粘贴”与“完整因果链未知”避免了强行认定逐字一致，但没有像 audit 那样明确写出：源回答、开场失败文档与最终文档在主题和四段结构上被剪辑成同一内容的前后对照，同时缺少逐字 diff。
- Audit：`REF-03`、`CQ-09`、`CAR-11` 将“四段结构相近但逐字同一性未知”单独建模。
- 判定：核心边界已被候选保守接住，因此不扣 critical-question recall 或 evidence coverage；这是关系表达精度问题。

## 不计为 discrepancy：WPS 身份

独立 audit 对目标应用保持“Word 类文字处理器”未知；candidate 依据 `TARGET-0036`、`TARGET-0055` 与 `probe-inspection/wps-ui-crop.jpg` 读到 `WPS AI`。目标帧足以支持“可见 WPS 文字处理界面”，同时 candidate 仍把完整版本、账号、文件名和扩展名留作 unknown，因此不计为不受支持推断。
