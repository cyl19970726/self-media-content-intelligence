# 单帖金标准 · 实施计划

- [x] Host 识别并修复 `knowledge/context + unitIds: []` 退化映射。
- [x] Host 为普通 cue 选择最具体知识单元，保留 Builder 语义例外。
- [x] Host-owned 映射在知识单元范围改变后重新计算。
- [x] Builder 完整性 Gate 前移空回链检查。
- [x] Builder 禁止用跨越不连续语义的大时间范围修复证据越界。
- [x] 回归工具支持复用已验证本地源视频。
- [x] 正文操作序列去重，前后状态按阅读顺序显示。
- [x] AI 红发魔女完整重跑并通过 Builder、Evaluator 和确定性 Gate。
- [x] 使用真实页面完成桌面与手机验收。
- [ ] 全仓验证、提交与 PR。
