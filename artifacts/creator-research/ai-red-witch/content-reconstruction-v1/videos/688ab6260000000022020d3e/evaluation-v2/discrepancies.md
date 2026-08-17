# 688ab6260000000022020d3e 当前 audit–candidate 差异

本文件只比较当前 evidence、修复后的 `skill-run/` 与独立 `audit/`。旧评估和旧差异清单没有作为输入，候选未被修改。

## 逐项核对

| 高风险主题 | 独立 audit / 当前 evidence | 当前候选 | 判定 |
|---|---|---|---|
| Act One / Act‑Two | 口播、SRT 与后期字称 Act One；工作区标签和完成结果播放器均明确为 Act‑Two。 | KU-09/KU-10、relations 与 report 完整保存冲突，并按 UI 将实际模式认定为 Act‑Two。 | 一致 |
| Gen‑4 身份 | `Gen-4: Now for Image and Video / Try it now` 是右侧宣传卡；没有点击或 Gen‑4 运行。 | KU-27 与 report 只记为 promo，不当作活动模式。 | 一致 |
| 两输入与 Generate | Performance 支持 voice/gestures/facial expressions up to 30s，可 Record/Select asset；Character 支持 image or video；Generate 可见。 | KU-11～KU-15 保存精确 UI 文案和两素材结构。 | 一致 |
| 完成结果播放器 | 14.1–16.1 秒是带 Act‑Two 标识、时间线和结果控制的视频播放器；`0:19` 是输出播放时长。 | report 明确写播放器状态，并拒绝把它当作生成耗时。 | 一致 |
| 操作闭包 | 未展示选择/上传成功、Generate 点击、进度、等待、保存或导出。 | KU-15、KU-16 与 report 将完整执行桥保持 unknown。 | 一致 |
| 结果 lineage | 水管工式 Act‑Two 播放器结果与后续粉发动漫片段的主体、风格、载体不同，仅剪辑相邻。 | KU-18、REL-07 与 report 明确同一生成链未知。 | 一致 |
| 同步与 causality | 分屏和连续动作能说明可见 motion，不能证明讲述者就是 driving input、精确同步或无隐藏剪辑。 | KU-06～KU-08、KU-19 与 report 均保持这些边界。 | 一致 |
| 一句话改图 | 结尾没有 prompt、编辑 UI、同图 before/after 或风格切换。 | KU-20/KU-21 与 report 只保留作者主张，不把画面当作操作证明。 | 一致 |
| SRT 冲突 | SRT“祛痘/土里”与烧录字幕“驱动/图里”冲突；`P图/批图` 同音且无结尾硬字幕。 | KU-22/KU-23 保留 verbatim SRT，同时采用可见字幕解释语义，并将正字法保持 unknown。 | 一致 |
| 音频 | 源音频存在；独立复跑三个连续窗口均检出 speech/music，低置信瞬态不足以确认独立音效。 | KU-25 与 report 记录持续音乐床，不升级 ding/ping 等不稳定候选。 | 一致 |
| 身份、来源与授权 | 视频未展示准确身份、素材来源、同意、版权/肖像/角色授权。 | KU-04/KU-05/KU-24 与 report 均有界保持 unknown。 | 一致 |

## 残余差异

没有发现实质性 audit–candidate 内容差异，也没有发现语义上未检查的载体、意义变化或关系。原视频本身的误导性主张仍然存在于原始口播和画面中，但修复后的 reconstruction 已把它们作为待限定的作者主张和 carrier conflict 记录，而不是作为已证实事实复述。

仍有两项 deterministic contract 残余：

### D-01 — 非语音音频 carrier key 未被 canonical validator 识别

- 事实：`CAR-NONSPEECH-AUDIO` 已经声明 `available=true`、`inspected=true`，KU-25、audio evidence 与 report 也完成了完整音轨语义检查。
- 契约缺口：其 `modalityKeys` 为 `audio_stream / music / sound_effect`，没有 validator 识别的 `non_speech_audio` 或等价标准键。
- 结果：`full_timeline_carrier_sweep` FAIL，例项为 `non_speech_audio:not_explicitly_inspected`。
- 修复方向：在 candidate probe 的该 carrier 中加入 canonical `non_speech_audio` modality key，再重跑 schema 与 deterministic gate。

### D-02 — KU-08 引用了声明区间外的 UI OCR

- 事实：KU-08 的作者主张发生于 5.18–8.66 秒；用于反驳“只靠嘴”的 `OCR-00107`、`OCR-00108` 来自约 11.5 秒的 Performance UI。
- 契约缺口：后续 UI 证据虽然相关且内容正确，但不落在 KU-08 的 `timeRange` 内。
- 结果：`internal_timestamp_bounds` FAIL 两项。
- 修复方向：把 UI 反证拆到单独的后续知识单元/关系中，或用能覆盖该交叉证据的范围建模，同时保留作者原始 claim interval。

按本次任务约束，上述 candidate 修复没有执行。
