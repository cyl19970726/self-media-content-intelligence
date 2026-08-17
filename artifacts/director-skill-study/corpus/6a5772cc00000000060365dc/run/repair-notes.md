# Repair notes

本轮仅修改 `run/` candidate；未修改 `review/audit`、`review/evaluation` 或 canonical Skill。

## 已修复

- 在协议末尾新增 `ACT-07`，精确捕获 97.47–114.841 秒；目标证据由 57 帧增至 63 帧，OCR 63 帧全部成功。
- 恢复高影响冲突：SRT“装逼型饰品”与烧录字幕视觉写法“装13型视频”（“装逼”的替代写法）。重建明确支持的类别名词为“视频”，不再声称准确词未关闭。
- 分开保留身份物件载体原形：SRT 的 logo/毕业证/录取通知书表述，与烧录字幕“只需要展示一下学校的logo”“拍一张毕业证明和录取通知书啊”不再静默合并。
- 将“干货类型视频”拆为独立 unknown 单元 `KU-19`；只确认它紧接传奇型出现，不再确定归入涨粉型。
- 修正 `KU-15` 越界 OCR 引用：由 0.2 秒的 `OCR-00013` 改为单元范围内 12.5 秒的 `OCR-00073`。
- 更新 cue accountability、meaning-change/critical-question coverage、unknowns、article 和 meta-gate；`uncheckedChannels` 为空。

## 验证

- canonical `validate-schemas.py`：probe、protocol、reconstruction、OCR 全通过。
- 使用原独立 evaluation 运行 deterministic validator 时，candidate 的内部机器门全部通过；仅原 evaluation 中尚未复审的 `eval_unchecked_channels` 与 `eval_meta_gate` 保持失败，未篡改该独立结果。

## 保留未知

- “干货型”的层级归属。
- 身份信号物件的真实性、样本归属与涨粉效果。
- 其他未关闭 SRT 错词、白板小字、非语音音频作用、讲述者身份/授权、平台与价格/执行条件。
