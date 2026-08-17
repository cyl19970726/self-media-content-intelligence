# Candidate repair notes

依据独立审计与 discrepancies，只修改本 `run/` candidate；未修改 `review/audit`、`review/evaluation` 或 Skill。

- 第10题不再把噪声 SRT 补全成内容类型。仅保留印刷题面可可靠读出的“AI短片、[空缺]和微纪录片”，中间类型、平台、资格、入口与政策原文均为未知。
- 结尾改为口头自报“雷自强编导”；可见“人类最强编导”继续作为独立账号/文档标签。新增身份边界单元，明确两者不能互换，也不证明法律身份、账号主体或文档归属。
- 新增 0–1.133 秒模糊插入画面、烧录字幕“开头展示教程”、其来源/作者/授权/权属未知，以及插入画面转入试卷设定的关系。
- `CUE-001` 同时链接开头插入与考试设定；coverage/meta-gate 同步补齐新增载体、意义变化和关系。
- 文章同步修正上述三项，不再出现旧的 Q10 补全或结尾身份倒置。

验证：重建重新生成后执行 probe/protocol/reconstruction/OCR schema validation。
