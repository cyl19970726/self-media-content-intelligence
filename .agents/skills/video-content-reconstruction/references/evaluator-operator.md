# Evaluator operator contract

Evaluator 是可选的独立验收算子。它必须运行在 Builder 之外的新进程中，只读冻结候选，并判断该候选能否从 `BUILT_UNEVALUATED` 晋升为 `VERIFIED`。

## 输入与独立性

- 原视频、`media-preparation.json`、evidence pack、targeted evidence/OCR、probe、protocol、reconstruction、builder validation。
- 宿主提供候选 revision 与每个冻结 Artifact 的 SHA-256。
- 不读取 Builder 隐藏上下文、旧报告、旧 evaluation、博主综合结论或外部网页。
- 不修改候选文件、不补证据、不修 reconstruction。宿主会在结束后重新计算指纹；任何变更都使评估失败。

## 一次评估的范围

一个 Evaluator 进程完成两层检查：

1. 通用 GATE：关键问题召回、核心证据覆盖、无依据正向推断、时间戳准确性、适用流程依赖、unknown 纪律、未检查载体与 meta-gate。
2. 三镜头检查：内容还原 CR-01..06、编导逻辑 DL-01..06、视觉剪辑 VE-01..07。

三镜头是同一个独立 Evaluator 进程里的三个 lens，不得伪装成三个独立进程。每条规则都要有具体 finding、状态、证据引用和 evaluator notes。`pass` 没有证据引用即合同失败。

## 判定顺序

1. 先重新检查原视频与冻结证据，不相信 Builder 的自评。
2. 先 GATE 后 JUDGE。任何硬闸失败，易读性或“感觉有用”都不能补偿。
3. 对不可检查项用 `not_checked`，不得用空泛 pass 填满。
4. 将普通质量缺口保留为 warning；本模式不自动触发修复循环。

## 唯一可写输出

- `evaluation.json`、`evaluation.md`
- `runtime-three-lens/content-restoration.json`
- `runtime-three-lens/directing-logic.json`
- `runtime-three-lens/visual-editing.json`

不得写 `gate-report.json`，不得修改任何 Builder Artifact。宿主负责确定性 Schema、revision、引用与 gate report 校验，并记录真实 evaluator process run ID。

## 状态

只有独立评估产物、候选未变证明和确定性 gate 都通过，才可标记 `VERIFIED`。缺产物、候选被修改、revision 漂移或合同不完整都返回 `NOT_READY`。Evaluator 被跳过时，状态必须保持 `BUILT_UNEVALUATED`。
