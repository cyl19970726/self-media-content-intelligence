# Holdout2-3D Skill Candidate 独立评估

## 结论

所有硬 GATE 通过，因此执行 JUDGE。没有 READY 宣告。

本次按独立 audit 的 12 个关键问题、7 个原子核心知识和 5 条论证依赖核算；candidate 自己的 coverage/meta 声明不作为其完整性的证明。高影响 UI 读数另外对放大帧作了独立目视复核。

## 硬 GATE

| GATE | 核算 | 阈值 | 判定 |
|---|---:|---:|---|
| Critical-question recall | 12/12 = 1.000 | ≥ 0.85 | PASS |
| Evidence coverage | 7/7 = 1.000 | ≥ 0.90 | PASS |
| Unsupported inference | 1/31 = 0.0323 | ≤ 0.05 | PASS |
| Timestamp accuracy | 20/20 = 1.000 | ≥ 0.90 | PASS |
| Process dependency completeness | 5/5 = 1.000 | ≥ 0.85 | PASS |
| Unknown discipline | 12/12 = 1.000 | ≥ 0.90 | PASS |
| Unchecked channels | 0 | 必须为 0 | PASS |
| Meta-gate | 无未守载体/意义变化/关系 | 必须无缺口 | PASS |

### 关键问题与证据覆盖

12 个 audit 问题全部得到回答或正确保持未知。尤其是工具身份、左侧输入类型、真实延迟、两侧是否同次会话、资产类型、导出与下游属性、结尾人物来源、完整场景/电商能力、价格许可和评论区工具包，均没有被促销口播升级为事实。

7 个 audit 核心知识全部有有效证据。candidate 还补出了 audit 初始密集帧未充分解析的高价值细节：三条英文人物 prompt、分屏右下仅见的 `KRE` 残片、另一套单头 UI、`Generation successful!`、`Refresh`、`Download`、`Upgrade`、`Credits/Est. Time` 以及缺失的跨 UI 文件桥接。

### 无依据推断

以 20 个 knowledge-unit 主命题和 11 个显式关系命题为原子计数，共 31 条；article 的重复复述不重复计数。唯一错误是 KU-017 标题“非语音音轨存在”：AAC 流、持续音频活动和 SRT 只覆盖语音，不能单独证明另有音乐或音效。其正文随后正确保持“无法分离、语义作用未知”，因此错误率为 1/31，仍低于 0.05。

其余高风险推断均守住边界：两套 UI 未合并；`KRE` 未补成品牌；成功状态与 Download 控件未被当作实际点击或落盘；结尾相似人物只写成视觉回环而非同一资产；人物身份、来源、授权和生成归因均保持未知。

### 时间码与流程依赖

抽查 20 个不重复的高影响 cue/target/crop 锚点，均与 manifest 和帧内容一致，包括 3.8、7.5、8.4、12.0、14.2 秒的 UI/prompt 细节，以及 14.95–17.481 秒的四主体蒙太奇和黑场。

audit 的 5 条论证依赖全部覆盖。candidate 还正确区分两本账：画面观测到的是分屏编辑、单头成功状态和结果蒙太奇的交替剪辑；真实的提示/绘制—生成—上传—下载—结尾成片依赖链没有被视频证明。

### 载体、未知与 Meta

旁白/SRT、烧录字幕、固定标题、账号/平台/水印、分屏 UI 与 prompt、单头 UI 状态、人物/环境、剪辑次序、CTA、负证据和活动音频流都进入了检查。非语音音频内容与作用被保留为未知，没有虚构音乐或音效。

单头 UI 的 Mesh 字段内还能看到一个近似 `3DAISTUDIO-V1` 的值，candidate 没有单列转录。该值属于已检查的 UI 载体，且不足以证明完整产品身份、两 UI 关系或输出格式，因此记为低影响文字遗漏，不构成未守载体、意义变化或关系。

## JUDGE

硬闸全过后评分：

| 维度 | 分数 | 理由 |
|---|---:|---|
| Readability | 5 | 先讲视频承诺，再拆 UI、流程、用途与 CTA，边界清晰。 |
| Knowledge prioritization | 5 | 两套 UI、prompt、Download 与缺失桥接被放在核心位置。 |
| Evidence usefulness | 5 | 高影响判断都有可定位的 cue/target/crop，并说明 OCR 修订来源。 |
| Execution / decision value | 5 | 明确告诉读者视频不能支持复现、采购、授权或生产链判断。 |
| Compression without loss | 4 | 信息保存充分，但对 17.6 秒素材仍有少量重复，JSON 尤其偏长。 |

## 最终判定

该 candidate 在本 holdout 上通过全部硬 GATE。最显著的价值不是增加描述量，而是抓住并正确限定了两套 UI、英文 prompt、`KRE` 残片、成功/Download 状态、生成—导出缺链、身份与授权未知，以及全片负证据范围。
