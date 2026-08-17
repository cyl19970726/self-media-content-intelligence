# Deep Content Director — Final Static Review V3

审查范围严格限于最新 `deep-content-director/` 全目录、冻结 `v0-method.md`、`static-review-v2.md` 与允许读取的 `trigger-score.json`。未读取任何 holdout reconstruction、article、generalization、result、delta 或其他 holdout 产物。

## 最终结论

**NOT READY。**

V3 已经接近可发布：V2 的 14 个已知 false-pass 全部关闭，builder draft、五种 mode、五种 format、安全 blocker、全局 ID、panel/custom refs、覆盖写入、dependency 降级与 package 清洁均有真实实现和测试。现有结果：

- `87 validator/builder/package tests passed`；
- `skill-creator quick_validate`: `Skill is valid!`；
- 25 个 `mode × format` builder 输出全部 `structuralReady=true` 且 `completionReady=false`，均含 `artifact_is_draft`；
- V2 的 14 个错误 PASS 经独立 mutation 复测全部被拒绝或转为 completion blocker；
- `trigger-score.json`: 40/40，false positive 0，false negative 0，且 labels 对 classifier 隐藏；
- 缺少 `jsonschema` 时无 traceback，返回 actionable install command；
- Skill 包当前无 `__pycache__` 或 `.pyc`。

仍不能 READY 的原因，是测试外仍能构造多个**机器可判定、却得到 `completionReady=true`** 的未完成/非法输入。语义 reviewer 当然可能抓住它们，但 `completionReady` 自己承诺的是“无未解决 required slots、无 machine-detectable blocker”；下列反例违反了该承诺。

## V2 14 项 false-pass 复测

| V2 反例 | V3 结果 |
| --- | --- |
| `none known` | `structuralReady=false`, `placeholder` |
| carousel panel dangling asset | `structuralReady=false`, `dangling_ref` |
| duplicate panel order | `structuralReady=false`, `panel_order_not_contiguous` |
| carousel 混入 beats/shots | `structuralReady=false`, format branch rejected |
| video 混入 panels | `structuralReady=false`, format branch rejected |
| `single/other` 无 carrier | `structuralReady=false`, required custom carrier |
| carousel opening=`first_frame` | `structuralReady=false`, `schema.const` |
| high-risk claim 无 platform check | structural valid but completion blocked，正确 |
| blocked asset 仍被 execution graph 使用 | `structuralReady=false`, `blocked_asset_referenced` |
| safety check 明确 blocked | structural valid but completion blocked，正确 |
| asset/claim ID 冲突 | `structuralReady=false`, `global_duplicate_id` |
| `unknown + verified` claim | `structuralReady=false`, claim/status matrix rejected |
| account 混入 reviewPlan | `structuralReady=false`, mode branch rejected |
| portfolio share 不等于 1 | `structuralReady=false`, `portfolio_share_not_one` |

这部分可以视为已修，不应回退。

## P0 — 最后四个发布阻断项

### P0-1：`completionReady` 仍可接受 builder 的明文未完成槽位

builder 已改成 `artifactStatus=draft`，rights、claims、owner、实验窗口也不再凭空伪造成 known；这是正确修复。直接把 draft 改成 complete 也会因 structured unknown 被 `required_slot_unknown` 拦住。

但许多 required slot 仍是普通字符串，而非 structured unknown，例如：

- `Define target person`；
- `Choose one primary job before completion`；
- `Define click promise`；
- `Supply exact artifact and version`；
- `Select one change after diagnosis`。

独立实测：把完成态 golden 的 `singlePlan.audience.person` 改成 `Define target person`，validator 返回 `structuralReady=true, completionReady=true`。同样，`decision={"status":"known","value":"unknown"}` 也通过 completion。

这不是标题/正文是否好看的语义问题，而是 builder 自己定义的未填槽位被完成检查漏掉。

**必须修改：**

1. builder 的所有未完成值都使用统一、不可歧义的 draft slot 结构；最佳方案是把这些字段也改成 `stateValue`，或新增 `draftSlots` 路径清单。
2. 若保留字符串，使用专用 sentinel，并在 complete 状态转为 `draft_slot_unresolved` blocker；不要只靠 TODO/TBD 正则。
3. 明确拒绝 `status=known` 且 value 为 `unknown / not decided / define later` 等状态伪装。优先从数据结构解决，而非扩展无穷关键词表。
4. 增加“逐一保留 builder 明文 slot、只解决 structured unknown”的 completion-bypass 回归测试。

### P0-2：CLI 接受非标准 JSON 数值，数值约束可被 `NaN` 绕过

Python `json.loads` 默认接受 `NaN`/`Infinity`。独立实测把 golden video 的 `targetDurationSeconds` 改成 `float('nan')`，validator 返回 `structuralReady=true, completionReady=true`。同类绕过可影响 share、denominator、time range 等所有数值约束；`abs(sum(shares)-1)>epsilon` 对 NaN 也为 false。

**必须修改：**

- CLI 解析使用 `parse_constant` 明确拒绝 `NaN/Infinity/-Infinity`；
- `validate(data)` 对所有 number 递归检查 `math.isfinite`，因为测试和库调用可绕过 CLI parser；
- 加入每个关键数值字段的 NaN、正负 Infinity 回归；报告使用独立 `non_finite_number` code。

### P0-3：carrier/referent 图仍有类型与层级漏洞

V2 的 claim→panel→asset、custom unit refs、panel asset refs 已修；但 carrier ledger 仍可错误 completion PASS：

- referent 的 `parentReferentId` 指向自己，形成 self-cycle；更长循环也未检测；
- `nonSpeechAudio.entries[kind="music"]` 可以把 `assetRef` 指向 `screen_recording`，只要 ID 存在；实测 completion PASS；
- carousel 的 referent 与 absence claim 只能填写秒数 `timeRange`。golden carousel 因此用 `0–1 seconds` 表示“第二页”和整篇 OCR，未真正链接 `panel_proof`；这与 reference 要求的“exact object, interval/panel”不一致。

**必须修改：**

1. referent graph 检查 self-parent 与任意 cycle；
2. audio entry 的 asset kind 必须与 music/audio/sound carrier 兼容；silence 如不需要独立 asset，给出明确 N/A/track reference 结构；
3. carrier locator 改为 `oneOf(timeRange, panelRef, customUnitRef, externalLocator)`，并校验 typed ref；carousel 不应伪造秒数；
4. 增加 self-cycle、two-node cycle、wrong asset kind、dangling panel locator 测试。

### P0-4：account mode 的 identity/series contract 尚未完全兑现自己的 reference

`directing-closures.md` 明确要求 account identity system 包含：可理解身份词、态度、可重复视觉/语言符号、scoped proof。当前 `accountPlan.identitySystem` 只有 audience/problem/proof/repeatedValue/personaBoundary，缺 identity word、attitude、repeatable symbols。

同一 reference 要求 account 的每个 `seriesContract` 包含 audience、repeatable transformation、future value、cadence、end/renew rule；当前 schema 只有 name/futureValue/cadence。

这是 mode closure 的文档—schema 缺口，不应留给 semantic reviewer猜测字段落在哪里。V0 P02/P05 也直接依赖这些节点。

**必须修改：** 补 `identityWord`、`attitude`、`repeatableSymbols`；series contract 补 `audience`、`repeatableTransformation`、`endRenewRule`。若允许明确 N/A，使用 state object 并由 semantic reviewer判断合理性。增加完成态 account golden，不只在测试函数内动态构造 cold account。

## 已确认修复的关键面

### Structural vs semantic

已正确分层：`structuralReady`、`completionReady`、`semanticReviewRequired` 三者语义明确；不存在总 `ready=true`。`semantic-review.md` 要求 fresh reviewer、G0–G7、hash、独立声明和 human approval，方向正确。

### Total function

原 malformed dict/list 崩溃均已关闭；type fuzz 返回稳定报告。最外层 catch 保证调用方不接 traceback。缺依赖也被捕获。

### Format/ref/safety

video/live、carousel、text-image、other 已互斥；单图 text-image 正确通过；`other` 强制 custom carrier；mixed-format series 可逐 episode 表达。全局 ID、panel order、claim carrier、blocked asset、mandatory privacy/platform checks 与 safety blocking 均已实装。

### Mode closures

single、series、research、review 的主要 V2 缺口已关闭：series 有 durable audience/problem/format/cadence 与 per-episode format；research 已按 O1–O6 命名且含 source locator 与 executable application；review 保留 execution/direction 分离；account 支持无 media asset 的完成态 audit、完整 portfolio role allocation/omission 和 quota sum。

### Triggering

metadata 的正负边界清楚；允许读取的 trigger summary 显示隔离分类 40/40，FP/FN 均为 0。静态层面通过。由于本轮被禁止读取 `trigger-results.json`，本审查只确认 score contract，不重新审阅逐项结果。

### Overwrite/package/dependency

默认拒绝覆盖，`--force` 原子替换；相关测试通过。包中无 bytecode cache，测试通过 `PYTHONDONTWRITEBYTECODE` 保持清洁。`jsonschema` 缺失时输出明确安装命令，而不是 import traceback。

## 剩余非阻断项

以下不阻止修完 P0 后进入 READY：

1. **Dependency 错误分类。** 缺 `jsonschema` 目前报告 `validator_internal_error` 且 CLI exit 2；更准确的是 `dependency_missing` 与环境错误 exit 3。还可显式校验 `jsonschema>=4.18`，而不是只验证符号可导入。
2. **Semantic review 只有文档合同。** `semantic-review.md` 很清楚，但没有 JSON Schema/validator；可后续增加，防止缺 G0–G7、hash 格式错误或作者自评被当成有效 review。
3. **主 Workflow 的候选步骤过于全局。** “Generate 3 candidates” 对 account/research/review 不是总适用；应标为 single/topic/positioning decision 的条件步骤，避免与 mode schema 冲突。
4. **V0 traceability 真实但不够细。** 当前矩阵没有 P01–P20 编号、mode/format applicability、schema constraint/test ID；claim carrier 行仍只写 beat/shot refs，未写 panel/custom unit。它没有造假到足以阻断，但应同步最新实现。
5. **Portfolio omissions 去重。** allocated role 会去重且 allocation/omission 冲突会报错，但 duplicate omitted roles 没有单独错误；set coverage 仍可能让重复项通过。加一个 `duplicate_omitted_role` 即可。
6. **CLI exit semantics。** draft 的 validator CLI 因结构合法返回 0，即使 completion blocked。文档已充分区分，但自动化消费者仍可能只看退出码；可增加 `--require-complete`，completion blocked 时返回非零。
7. **`skill-creator` 的 quick validation 仅证明 package/frontmatter 合法。** 不应在发布说明中把它描述为业务/方法验证；当前报告与 Skill 已基本遵守这一边界。

## READY 前最短清单

1. 关闭明文 draft slot 与 `known:"unknown"` 的 completion bypass；
2. 拒绝所有非有限数值；
3. 补 referent cycle、typed carrier asset 与 panel/custom locator；
4. 补 account identity word/attitude/symbol 与完整 series contract；
5. 新增上述回归后重跑 87 项、V2 14 项、25 路 draft matrix、dependency smoke 与 package manifest；
6. 再由 fresh semantic reviewer 对完成态 golden 和真实任务产物执行 G0–G7。

四个 P0 修完且新回归全绿后，本 Skill 可进入静态 READY；最终发布仍必须经过其自身规定的 independent semantic review 与人类发布责任人批准。
