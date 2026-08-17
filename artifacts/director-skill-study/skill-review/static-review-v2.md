# Deep Content Director — Static Review V2

审查范围严格限于最新 `deep-content-director/` 全目录、冻结 `v0-method.md`、上一版 `static-review.md` 与 `trigger-matrix.md`。未读取任何 holdout reconstruction、article、generalization result、delta 或其他 holdout 结果。

## 结论

**NOT READY。**

V2 不是小修：上一轮最危险的“机器把语义正确性判成 ready”已经真正拆掉；validator 现在只输出 `structuralReady`，永远带 `semanticReviewRequired=true`，且不存在总 `ready=true`。五种 mode、video/carousel/text-image 分支、正式 JSON Schema、V0 traceability、拒绝覆盖与原子写入也都已加入。现有测试运行结果为 `55 validator/builder tests passed`，`skill-creator quick_validate` 也通过。

但仍有三类发布阻断项：

1. builder 在没有用户证据时生成大量“已知事实”和“已拥有版权”的成品值，并立即通过结构验证；
2. carousel/format 与全局引用图仍有机器可检出的断链和交叉污染；
3. safety 的派生状态会把“没检查”写成 `clear`，且 blocked asset 仍可被镜头继续使用。

这些不是应交给 semantic reviewer 的审美判断，而是结构合同自己声称能保证、实际上没有保证的事项。

## 上一轮 P0/P1 复核

| 原问题 | V2 状态 | 复核结论 |
| --- | --- | --- |
| P0-1 structural 与 semantic 混为一谈 | **已修** | 报告只有 `structuralReady`；语义项全部为 `not_machine_verified`；无总 `ready`。 |
| P0-2 malformed JSON 导致崩溃 | **已修** | 原 `shots=["bad"]`、candidate name=list 均稳定返回错误；type fuzz 通过。最外层还捕获内部错误，不再向调用者抛 traceback。 |
| P0-3 五种 mode 共用 single schema | **部分修** | 五种 mode 已有专属 plan，但允许异 mode plan 混入；single `format=other` 可没有任何 carrier；format 分支不互斥。 |
| P0-4 V0 闭包未落入合同 | **部分修** | 新增 mechanism、责任、商业边界、mode closure 与 traceability；但 carousel proof carrier、account asset audit、research O1–O6 仍不完整。 |
| P0-5 claim/asset/safety 可随意自证 | **部分修** | claim 条件、asset fallback、source locator 已加强；但 safety coverage、blocked use、ID 歧义与 class/status 矛盾仍可通过。 |
| P1-1 触发过宽/漏触发 | **静态已修** | metadata 已限定交付物并明确排除纯转录、下载、排期、API 发布；20/20 trigger matrix 合理。尚无 fresh trigger 实跑结果。 |
| P1-2 偏视频、无小红书图文分支 | **大部分已修** | 已有 carousel/text-image、panel opening、metric availability；仍误杀单图笔记，`other` 又没有 carrier closure。 |
| P1-3 合理空值被误杀 | **大部分已修** | `unknowns=[]`、`locations=[]`、无 guardrail metric、无 proof、单维迁移例外均有通过测试。仍存在 assetless account 与单图笔记表达问题。 |
| P1-4 无 schema 导航 | **已修** | `output-schema.md` 与 authority JSON Schema 均由主 Skill 一层直达。 |
| P1-5 覆盖写入/source injection | **已修** | builder/validator 默认拒绝覆盖，`--force` 才原子替换；source-as-untrusted-data 已写入主 Skill 和 evidence reference。 |
| P1-6 包含 pycache | **未修** | 当前仍存在 `scripts/__pycache__/` 与两个 `.pyc`；运行测试还会继续生成。 |

## P0 — 仍需修复

### P0-1：builder 生成伪“已完成事实”，与自身使用说明冲突

`SKILL.md` 说“scaffold 后替换 placeholders”，但 V2 builder 没有 placeholders，反而直接生成可通过 validator 的具体断言：

- `assets[0].rightsStatus="owned"`，即使用户从未说明资产归属；
- `claims[0].claimClass="user_claim"`，但该 claim 并非用户提供；
- `responsibility.publishOwner="Named human publisher"`、`factVerification="Named human editor..."`，实际没有 named person；
- 固定 `72 hours + seven-day`、`three comparable executions`、`two failed revisions`，与 V0 明确禁止把固定窗口/样本写成平台定律的纪律相冲突；
- research scaffold 直接产出“status cues amplify attention...” working model，没有 source reconstruction；
- review scaffold 直接声称方向支持与唯一改动，没有 supplied artifact；
- `unknowns=[]`，同时把关键缺口藏在少数 nested unknown 中。

现有 golden hash 测试把这些通用输出冻结为“有效结构”，所以用户忘记替换时，validator 会给 `structuralReady=true`。虽然它仍要求 semantic review，但这会把凭空生成的 rights、claims 和 ownership 带入后续审核，属于证据污染，不只是文案质量问题。

**必须修改：**

1. builder 只能生成 `artifactStatus="draft"` 的不完整 scaffold；没有用户证据的 rights、claim provenance、owner、时间窗全部用结构化 unknown，不得写成 `known/owned/user_claim`。
2. 未替换 draft 必须 `structuralReady=false`，或另设 `schemaReady` 与 `completionReady`，禁止把 schema 示例当完成品。
3. 固定窗口、最小样本和停止线改为 bounded unknown/decision slot；只有任务证据支持时才能填具体值。
4. golden fixtures 可验证 builder 形状，但不得把通用 scaffold 叫作“human-reviewed valid brief”。至少增加一份真实 single-video 与 single-carousel golden；builder hash 与完成态 validity 分开测试。

### P0-2：carousel 的 claim→panel→asset 证明链不成立

当前 claim 只有 `beatRefs`、`shotRefs`、`assetRefs`，没有 `panelRefs`。因此 carousel 的 claim 无法引用具体承证 panel；同时 validator 计算了 `panel_ids` 却从未使用，也没有校验 panel 的 `assetRefs`。

实测把 carousel 首 panel 的 asset 改成不存在的 `A99`，仍得到 `structuralReady=true`。这直接违反 `output-schema.md` 所声称的 “claim→beat→shot→asset links resolve”，也使 V0 的“主张→证据对象→画面→证明范围”在图文形态断链。

**必须修改：** claim 增加 format-aware `panelRefs` 或统一 `carrierRefs`；校验 panel→asset、claim→panel；carousel/text-image 的 consequential claim 至少要能定位到一个 panel 或显式说明 off-panel source。加入 dangling panel asset、dangling claim panel、unused evidence panel 回归测试。

### P0-3：format 分支不互斥，`other` 可以没有 carrier closure

独立 mutation 实测以下均错误 PASS：

- carousel 同时携带 video 的 `beats + shots`；
- video 同时携带 `panels`；
- carousel 的 opening kind 写成 `first_frame`；
- `mode=single, format=other` 时没有 beats、shots、panels 或任何 custom carrier plan。

这会让“format-specific contract”只成为最低必填，而不是清晰分支。`other` 更是直接绕过 V0 必须存在的 carrier/shot/edit closure。

**必须修改：** 使用互斥 `oneOf`：video/live 只允许 beats+shots，carousel/text-image 只允许 panels，`other` 必须有 `customCarrierPlan`；opening kind 与 format 做 const 联动。若确实需要混合形态，应增加显式 `hybrid` 和各 channel 的职责，而不是允许静默混入。

### P0-4：ID 唯一性与引用图存在歧义

`output-schema.md` 写“IDs are unique”，实现却只在每个局部集合内去重。实测 asset 与 claim 同时使用 `A01` 仍 PASS；safety `subjectRef=A01` 此时无法知道引用的是资产还是主张。beat/shot/panel/safety IDs 也没有全局唯一保证。panel order 同样不检查唯一或连续，两个 panel 都写 `order=1` 仍 PASS。

异 mode plan 也可以混入：`mode=account` 同时带 `reviewPlan` 仍 PASS，因为 root schema 允许所有 plan property，mode `oneOf` 只要求正确 plan 存在，不禁止其他 plan。

**必须修改：** 要么所有 ID 全局唯一，要么引用改为 typed ref（如 `{kind:"asset", id:"A01"}`）；校验 panel order 唯一且连续；每个 mode 明确禁止其他四个 plan。把这些写进 schema 导航和 mutation tests。

### P0-5：claim/asset safety 的“派生”仍会说假话

当前 `derivedSafety` 初始即为：asset rights/privacy/platform `clear`。因此：

- 有 high-risk verified claim，但 `platformChecks=[]`，仍派生 platform `clear`；
- 没有任何 privacy check，仍派生 privacy `clear`；
- safety check 明确 `blocked`，结构仍 PASS，只在 summary 写 blocked；
- asset 明确 `rightsStatus=blocked` 且已有 fallback，但 shots、production 与 claim 仍继续引用被禁资产，结构仍 PASS；
- claim 可以 `claimClass="unknown"` 同时 `verificationStatus="verified"`，仍 PASS。

这里要区分两件事：编码一个 blocker 本身可以是结构合法的；但报告不能把“未检查”归约为 clear，也不能让实际 production graph 继续使用 blocked asset 而不产生 machine blocking condition。

**必须修改：**

1. derived status 初始为 `not_checked/unknown`；只有对适用 subject 有覆盖且无 blocker 才能 `clear`。
2. 输出独立 `blockingConditions`；任何 referenced blocked asset、blocked safety check、缺失 mandatory high-risk check 都进入其中。即使 `structuralReady=true`，CLI 也应清楚标记 `completionBlocked=true`。
3. 禁止 shots/panels/production/claims 引用 blocked asset；只能引用其 non-blocked fallback。
4. 建立 claimClass×verificationStatus 合法矩阵，至少禁止 `unknown + verified`；experiment result、platform hypothesis 与 source author claim 的状态转换也要明确。
5. 对 high-risk claim、person likeness、private screenshot、music 等能从 kind/risk 推导的对象，要求相应 safety check 覆盖；不能靠空数组表示通过。

### P0-6：五种 mode 虽已分型，但 account/research 闭包仍被压扁

account 的 `assetAudit` 只允许引用 media asset，不能诚实表达 V0 要求的 expertise、access、lived experience、production capacity、distribution 和 constraints。冷启动账号如果尚无可用资产，只能虚构一个 asset 才能满足 `minItems=1`。`contentPortfolio.role` 也没有完整覆盖 search/save、commercial carrier、expression/taste，且没有 deliberate omissions；share 总和不校验，实测总和不等于 1 仍 PASS。

research 的 O1–O6 字段命名与 `observation-loop.md` 不一致：O2 应是 model/dependencies，不是 `o2Expression`；O4 应是 contrast，不是 `o4Transfer`；O5 才是 apply。`sourceId` 只是任意字符串，没有 source locator/evidence record。`applications` 仅需一条普通字符串，无法保证研究真的转成 original brief/script/carrier/experiment。

series 的基本骨架已出现，但缺 durable audience/problem、recognizable format 与明确 cadence；这些是 `directing-closures.md` 已声明的 series closure。

**必须修改：** account audit 使用 domain asset/constraint union，而不是只用媒体 rights asset；portfolio role 与 V0 对齐并记录 omissions，share 采用总和约束或明确“非配额”语义。research schema 按 O1 Observe/O2 Model/O3 Ask back/O4 Contrast/O5 Apply/O6 Review 命名，并把 source locator 与 executable application 设为结构项。series 补 audience/problem/format/cadence。

## P1 — 仍应修复

### P1-1：合理输入仍有至少两个表达缺口

- `text_image` 强制至少两个 panels；单首图 + 正文型小红书笔记会因 `minItems=2` 错误 FAIL。若 `text_image` 的定义确实是多 panel，它与 carousel 重复；需要重新定义或允许单 panel。
- cold-start account 没有任何现成 media asset 时，无法用 bounded unknown/empty audit 表达，只能失败或造假。应允许“已审计但无可用项”与“待审计”两种结构化状态。

上一轮列出的 `unknowns=[]`、无 location、无 guardrail metric、无 consequential claim、无 source inspiration、合法单维迁移例外均已正确 PASS，不应回退。

### P1-2：traceability 文档存在过度声明

`v0-traceability.md` 是有价值的新增，但目前写了 “IDs are unique”“claim→beat→shot→asset links resolve”“asset/claim-level records and derived blocks”，与上述实际实现不符。矩阵也没有上一轮建议的明确 mode applicability 和 `SKILL instruction` 来源列；P18 邻近变体、P19 评论交叉验证等原则只被宽泛归入 experiment/commentCoding，容易再次出现“有标签就算覆盖”。

**建议：** 先修实现，再让 traceability 每行指向具体 schema constraint/custom test/semantic question，并标 P01–P20、mode、format 与不适用条件。文档不能先于实现宣称闭包。

### P1-3：触发矩阵尚未成为 forward-test 证据

metadata 与 20/20 正反例的静态质量已经合格，三个 ambiguous routing check 也清楚。但 `trigger-matrix.md` 只是题库，没有 fresh agent 的实际 trigger/no-trigger 结果、false-positive/false-negative 计数、Skill hash 或模型版本。

**建议：** 用 fresh contexts 对 40 条逐一运行；记录是否加载 Skill、首选 mode、是否误抢纯 reconstruction/API 操作。静态复审不应把题库存在等同于触发准确性已经验证。

### P1-4：semantic gate 有说明，没有稳定验收产物

`evaluation.md` 已明确 fresh reviewer 不能相信自填 clear/verified/original，这是正确的。但目前没有 semantic review 输出 schema/template，也没有把 reviewer 的 G0–G7 evidence、failed gates、human publish owner decision 与结构报告关联。后续很容易只看到 `structuralReady=true` 就停止。

**建议：** 增加独立 `semantic-review` 合同：candidate hash、original task/evidence hashes、reviewer identity、G0–G7 evidence、failed gates、required revisions、human approval。它不能由 author 自评，也不能写回结构 validator 的 `ready`。

### P1-5：`__pycache__` 仍污染发布包

当前包仍含 `scripts/__pycache__/build_directing_brief.cpython-312.pyc` 与 `validate_directing_output.cpython-312.pyc`。这不提供运行价值，并会随测试反复生成。

**建议：** 发布前清除缓存；测试/打包时设置不写 bytecode 或在构建清单排除 `__pycache__`、`*.pyc`。验收应对最终 package manifest 断言无缓存文件，而不只依赖版本控制忽略规则。

### P1-6：脚本依赖与 authority 表述需收口

validator 依赖第三方 `jsonschema`，当前环境可用，但 Skill 没有运行前依赖探测或清晰错误；缺包时 module import 会在 CLI 建立报告前直接失败。`output-schema.md` 又写“The Python builder generates it”，实际上 builder 生成 brief，不生成 schema；schema、builder 默认值和 custom checks 仍是三处手工合同。

**建议：** 启动时对依赖缺失给可操作错误，或提供封装；修正文档措辞。尽量从 schema 生成 scaffold 骨架/枚举，减少 drift，golden hashes 不能替代契约单源。

## 本轮错误 PASS 复现清单

以下均由最新 builder 生成的结构有效对象做单点 mutation，validator 仍返回 `structuralReady=true`：

1. `decision="none known"`；
2. carousel panel 引用不存在的 `A99`；
3. 两个 panel 都是 `order=1`；
4. carousel 同时带 beats/shots；
5. video 同时带 panels；
6. `single/other` 没有任何 carrier；
7. carousel opening kind 为 `first_frame`；
8. high-risk verified claim 没有任何 safety check；
9. blocked asset 仍被 production、shot、claim 引用；
10. 明确 blocked 的 platform safety check 不形成 completion blocker；
11. asset ID 与 claim ID 相同；
12. `unknown` claim 被标 `verified`；
13. account 同时夹带 reviewPlan；
14. account portfolio share 总和不等于 1。

“标题/封面/正文语义互相矛盾”不列为结构错误 PASS：V2 已正确声明这必须由独立 semantic reviewer 判断。问题只在机器可判定的类型、分支、引用、覆盖和状态归约。

## 本轮错误 FAIL / 不可表达清单

1. 一张首图 + 正文的 `text_image` 笔记；
2. 已完成自我盘点但当前没有任何 media asset 的 cold-start account；
3. mixed-format series（若系列允许视频与 carousel 混合，当前只有一个全局 format，无法逐 episode 表达）；
4. carousel claim 需要指向具体承证 panel——不是 FAIL，而是 schema 根本没有合法字段可表达。

## READY 前最短修复清单

1. 把 builder 改成不可误用的 draft/unknown scaffold，禁止凭空生成 owned rights、user claims、named responsibility 和固定实验阈值。
2. 补 carrier-aware refs：panel→asset、claim→panel；让 format branches 互斥并给 `other` 明确 carrier contract。
3. 做全局或 typed ID refs，校验 panel order，并禁止异 mode plan 混入。
4. 将 safety 初始状态改为 `not_checked`，增加 coverage 与 blocking conditions，禁止任何执行节点引用 blocked asset。
5. 补齐 account/research/series 的上述 mode closure；同步 traceability 的真实可检查约束。
6. 清除 pycache，加入 package manifest 测试；再跑现有 55 项、上述 14 个 false-PASS mutation、两个合理输入，以及 fresh trigger/semantic forward tests。

完成这些 P0 后，静态结构才可进入 READY 候选；最终发布仍必须通过 Skill 自己规定的独立 semantic gate 与未泄露答案的 forward tests。
