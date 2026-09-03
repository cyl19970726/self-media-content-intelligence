# Repository agent contract

## 单帖 Builder 报告的事实源

- 单帖主报告的唯一事实源是 `reconstruction.json` 中的 `builderLenses`。
- 主报告固定由三部分组成：`contentRestoration`（内容还原）、`directingLogic`（编导逻辑）和 `visualEditing`（画面与剪辑）。
- API 可以做 Schema 校验、字段兼容、证据引用解析和媒体 URL 投影；前端可以做排版、中文标签和交互折叠，但二者都不得改写、补写、重新总结或选择性替代 Builder 结论。
- 三个 Lens 的已定义字段必须完整可达。不得用“有效之处”“主要不足”“可复用结构”“一分钟结论”等派生内容替代或遮蔽原始 Builder 字段。若产品需要新增派生洞察，必须作为明确标注的下游分析，不能冒充 Builder 报告。
- 原帖标题、作者、发布时间和互动量属于来源身份信息，可以出现在页头，但不得静默混入视频内部重建。
- Evaluator 只负责独立评估、问题定位和晋升状态，不改写 Builder 三部分。Evaluator、Gate、知识单元、逐字稿和原始 Artifact 属于研究审计层，默认不占据主报告。
- `evidenceRefs`、关键帧、局部裁切、操作前后状态和转场画面必须在其对应结论附近解析展示；独立帧图库只能作为附录。
- Builder 字段缺失时如实显示“未产出/未知”，不得由前端或投影层猜测补齐。

权威格式见 `.agents/skills/video-content-reconstruction/schemas/reconstruction.schema.json`。
