# Repair notes — 6a4a1cab0000000021020230

依据独立审计反馈，仅修复 candidate `run/`；未修改 `review/audit/`、`review/evaluation/` 或 canonical Skill。

## 补回的内容

- 新增 `A-10` 目标取证，逐帧补抓并人工核验三张署名账号卡：现在是吴克、何香蓓Betty、张根源Genyuan。
- 补全结果卡直接可见边界：账号名、`06-15`、`667114` 播放及心形旁 `5.7万`。
- 新增原子知识单元，区分“示例被展示”与“示例造成关注增长”。
- 明确保留增长因果所缺的匹配账号基线、作品级归因和一致测量窗口。
- 明确保留爆款/人设视频/隐形价值/成功转化的类别定义未知，以及平台、账号规模、赛道、时间段和反例边界未知。
- 补全搜索策略依赖：持续可搜索需求未知，搜索是否造成声称长尾未知。
- 为字幕冲突 `system_inference` 增加逐项比较 reasoning，消除 `inference_without_reasoning_or_evidence`。

## 验证

- schema：`probe`、`protocol`、`reconstruction`、`ocr` 全部通过。
- 59/59 cue accountability；23 knowledge units，其中 13 core。
- 64 targeted frames；529 OCR lines；0 OCR failure。
- evidence refs 全部可解析；知识单元证据时间均落在声明范围内。
- 未生成或覆盖独立 `evaluation.json` / `gate-report.json`。

