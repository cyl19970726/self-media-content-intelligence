# Repository agent contract

## Project model policy

- Use `gpt-5.6-luna` for research workflow calls and newly delegated project tasks unless the user explicitly requests another model. This is the user's 2026-09-20 quota preference; do not silently escalate to Terra, Sol, or Astra.
- Keep Builder, independent Reviewer, repairs, creator synthesis, image research and report overview on the configured Luna policy. Preserve independent sessions and evidence contracts when changing models.
- Verify the model in actual execution receipts, not only environment settings or the workflow declaration. Keep historical runs' original model provenance.

## Reader-led research workflow

- Use the Codex built-in browser for this workbench's page acceptance and reader walkthroughs, as requested by the user. Ego task-space recovery is not a prerequisite for local page acceptance.
- Use the project-local [reader-led-workflow](.agents/skills/reader-led-workflow/SKILL.md) when reviewing research usefulness, identifying cognitive gaps, or deciding the next research iteration with the user.
- The lead must use the delivered workbench and own the user's understanding and next-step rationale. Delegate substantive single-post and creator synthesis production to an explicitly scoped Builder through the existing service or a subagent; independent review and actual use remain separate responsibilities.
- Keep this skill project-scoped. Maintain its runtime reference when execution paths change; do not add a global discovery entry without specific user authorization.

## Creator synthesis Builder

- The creator synthesis executor loads the project-local [creator-synthesis](.agents/skills/creator-synthesis/SKILL.md) and its required method reference for new CLI-built candidates. Keep research methodology there; keep pinned inputs, output contracts, validation, and execution in the service.
- Record loaded skill digests with each Builder run. Imported candidates must retain their separate provenance and must not be described as skill-generated.

## 单帖 Builder 报告的事实源

- 单帖主报告的唯一事实源是 `reconstruction.json` 中的 `builderLenses`。
- 主报告固定由三部分组成：`contentRestoration`（内容还原）、`directingLogic`（编导逻辑）和 `visualEditing`（画面与剪辑）。
- API 可以做 Schema 校验、字段兼容、证据引用解析和媒体 URL 投影；前端可以做排版、中文标签和交互折叠，但二者都不得改写、补写、重新总结或选择性替代 Builder 结论。
- 三个 Lens 的已定义字段必须完整可达。不得用“有效之处”“主要不足”“可复用结构”“一分钟结论”等派生内容替代或遮蔽原始 Builder 字段。若产品需要新增派生洞察，必须作为明确标注的下游分析，不能冒充 Builder 报告。
- 原帖标题、作者、发布时间和互动量属于来源身份信息，可以出现在页头，但不得静默混入视频内部重建。
- 新流程由 Reviewer 独立阅读并给出可执行修改意见，不直接改写 Builder 三部分；没有意见即跳过修订，有意见最多由 Builder 修订一次。审阅技术失败保留候选并单独标注；修订后未再次独立审阅的版本不得继承原审阅状态。旧 Evaluator / Gate 仅保留历史流程语义。Reviewer、修订记录、历史 Evaluator / Gate、知识单元、逐字稿和原始 Artifact 属于研究审计层，默认不占据主报告。
- `evidenceRefs`、关键帧、局部裁切、操作前后状态和转场画面必须在其对应结论附近解析展示；独立帧图库只能作为附录。
- Builder 字段缺失时如实显示“未产出/未知”，不得由前端或投影层猜测补齐。
- 工作台可以在三个 Lens 之间切换，但 `contentRestoration` 内部必须保持一份连续报告并完整渲染全部内容块。目录只能做锚点定位，不能筛选、分页或隐藏其他内容块。

权威格式见 `.agents/skills/video-content-reconstruction/schemas/reconstruction.schema.json`。

## Shared workflow maintenance

- Shared execution code lives in `vendor/agent-workflow` (Git submodule), accessed through public npm package exports. Read its AGENTS.md before editing it.
- Keep research workflows, queue dispatch, project method skills and UI here; do not copy the shared runtime back into this repository.
- Commit and push shared changes before updating the consumer submodule pointer. Run both shared and consumer verification. See [maintenance guide](docs/development/shared-workflow.md).
