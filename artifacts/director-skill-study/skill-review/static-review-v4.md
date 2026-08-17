# READY

审查范围严格限于最终 `/Users/hhh0x/.codex/skills/deep-content-director` 全目录、`skill-creator` 规范、本 reviewer 的 V1–V3 报告和允许读取的 `trigger-score.json`。未读取任何 holdout reconstruction、article、generalization、results 或 forward-test candidate。

## 阻断项

无。

本轮先实际构造出两个测试外问题，修复进入最终目录后又重新独立攻击；两者均已关闭。随后构造的 builder 默认标题绕过也已关闭。最终状态满足静态发布要求，但 `completionReady=true` 仍只表示机器闭包候选，不能替代 Skill 自己要求的独立语义审查和人类发布责任。

## 发布门结果

- 最终测试：`118 validator/builder/package tests passed`。任务要求复测的原 113 项仍全绿，并新增 5 个本轮回归。
- `skill-creator/scripts/quick_validate.py`：`Skill is valid!`。
- 25 个 `mode × format` scaffold 全部 `structuralReady=true`、`completionReady=false`；每份均有登记的 `draftSlots`，数量范围 3–56。
- 三份完成态 golden 覆盖 account、single/video、single/carousel；最终测试全部通过。
- package manifest 只有 SKILL、agent manifest、references、scripts 和三份 testdata；无 `__pycache__`、`.pyc` 或临时产物。
- `trigger-score.json` 为 40/40，false positive 0、false negative 0，且 classifier 只读 frontmatter 与 trigger prompts、未见 labels。静态触发门通过。
- 默认拒绝覆盖、显式 `--force` 原子替换、`--require-complete`、缺依赖降级、非标准 JSON 数值拒绝均有回归覆盖。

## V3 四个 P0 的最终独立复测

| 原阻断面 | 实构反例 | 最终结果 |
| --- | --- | --- |
| builder/plain slot 与伪装 known unknown | `audience.person="Define target person"` | `structuralReady=true`，但 `completionReady=false`，`draft_slot_unresolved` |
| builder/plain slot 与伪装 known unknown | `decision.status=known, value="unknown"` | `structuralReady=false`，`known_value_is_unresolved` |
| 非有限数值 | shot duration=`NaN` | `structuralReady=false`，`non_finite_number` |
| referent / asset / locator 图 | referent self-cycle | `structuralReady=false`，`referent_cycle` |
| referent / asset / locator 图 | music entry 指向 screen recording | `structuralReady=false`，`audio_asset_kind_mismatch` |
| referent / asset / locator 图 | carousel locator 指向不存在 panel | `structuralReady=false`，`dangling_typed_ref` |
| account identity closure | 删除 `identityWord` | `structuralReady=false`，`schema.required` |
| account series closure | 删除 `endRenewRule` | `structuralReady=false`，`schema.oneOf` |

以上四类旧 P0 均真实关闭，不是仅靠测试名称宣称关闭。

## 本轮发现、修复、复测历史

### 1. music 使用可借通用 audio asset 绕过平台检查

最初反例：`nonSpeechAudio.entries[].kind="music"` 引用 schema 允许的 `asset.kind="audio"`，删除全部 `platformChecks`。旧实现只从 `asset.kind="music"` 汇总 mandatory platform subjects，曾错误返回 `completionReady=true`、`requiredCount=0`。

最终实现按实际 music entry 的 `assetRef` 与 music asset、高风险 claim 一并求 required set。相同反例现在返回：

- `structuralReady=true`；
- `completionReady=false`；
- `mandatory_platform_check_not_clear`；
- platform `requiredCount=1`。

安全绕过已关闭。

### 2. draft 文本识别曾误伤合理英文成品

最初合理输入：CTA=`Check one saved tutorial and record the missing step.`。宽泛的动词前缀策略曾将其误判为 draft。

最终实现只匹配 sentinel 与精确 builder 默认短语。相同 CTA 现在 `structuralReady=true, completionReady=true`，无 blocker；原始 `Define target person` 仍被拦截。错误 FAIL 已关闭且没有重开原错误 PASS。

### 3. 默认标题可残留在完成态

独立将完成态 golden 的 `workingTitle` 和 `packaging.title` 同时改为 builder 默认 `Untitled content decision`，旧实现曾错误 PASS。最终实现返回两个 `builder_default_title_unresolved` blocker，`completionReady=false`。精确的用户自定义标题不受影响。

## Main workflow 与 Skill 结构

候选步骤的适用条件已经修正：只有 `account`、`single`、`series` 且存在真实开放选择时才要求三案；`research`、`review` 先完成各自证据/诊断合同，仅在确实要落成新策略时生成候选。它不再与五种 mode 的闭包相冲突，也不会为固定诊断任务强造三案。

渐进披露符合 `skill-creator` 规范：frontmatter 给出明确正触发和排除边界；主 `SKILL.md` 保持为路由、工作流和硬约束；结构、因果、平台、观察、评估和语义审查按任务条件导航到 references。脚本是确定性的 scaffold/validator 辅助，不把结构校验冒充语义质量判断。

`agents/openai.yaml` 与 SKILL frontmatter 一致，显示名、短描述、默认 prompt 均指向内容编导交付，没有扩大到发布 API、下载或纯转录。manifest 清洁，依赖失败返回稳定机器报告和安装指引，未发现隐性写入或覆盖授权扩大。

## 错误 PASS / 错误 FAIL 复核结论

本轮已实际攻击的错误 PASS 包括 V3 四组 P0、music→generic-audio safety、builder 默认标题；最终均被拒绝或 completion-block。已实际攻击的合理输入错误 FAIL 为英文 imperative CTA；最终正确通过。

仍应明确机器边界：原创性、承诺兑现、因果解释、证据是否真实、制作可行性和小红书语境质量不可能由 JSON validator 完成。最终实现诚实地返回 `semanticReviewRequired=true`，并要求 fresh reviewer；因此这些不是静态 validator 的漏判承诺。

## 非阻断项

1. `v0-traceability.md` 可继续补充 constraint/test ID，使“方法节点 → schema → validator → test”导航更精细；现有映射没有发现虚假声称，且核心闭包已有实现与回归证据。
2. semantic review 目前主要是文档合同而非独立 JSON schema。后续可机器校验 reviewer identity、artifact hash、G0–G7 完整性；当前 Skill 已明确结构通过不等于发布批准，风险边界可接受。
3. 118 项是精心设计的确定性回归，不是随机或穷举证明。发布后应持续把真实误判加入反例库，尤其关注新 builder 文案、asset kind 和新增 format locator。

