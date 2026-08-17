# dev-workflow baseline 差异账本

## 评估边界与计数规则

Ground truth 仅来自 `audit/audit.json`、`audit/audit.md` 与 `evidence/evidence-pack.json`；candidate 仅来自 `baseline/baseline.md` 与 `baseline/baseline-process.md`。未读取 skill-run 或人工报告。

- Critical-question recall：以 audit 的 CQ-01 至 CQ-15 为 15 个二元项；必须回答到问题的关键限定，或明确给出正确 unknown。
- Evidence coverage：同一组 15 个核心单元逐项检查 candidate 是否自带有效 cue/shot/frame/时间证据。审计证据不倒灌给 candidate。
- Timestamp accuracy：以 15 个核心单元各一个定位机会计数；candidate 没有任何时间定位，故为 0/15。
- Unsupported inference：对 baseline.md 做原子命题切分；排除标题、纯建议、重复表述和明确的 unknown/否定边界后，共 52 个正面事实命题。
- Process dependency：以 audit.json 的 workflowDependencies.stages 0-9 为 10 个阶段。
- Unknown discipline：以 audit.json 的 U-01 至 U-20 为 20 个机会；明确 unknown、正确归因或不作正面推断均计 pass。

## Critical questions：8/15

| ID | 结果 | 差异 |
|---|---|---|
| CQ-01 | PASS | 保留核心承诺、3 小时/零手写代码的归因与模板复用。 |
| CQ-02 | FAIL | 漏 Moonshot、Claude Code v2.0.31、`kimi-k2-thinking-turbo`；“Kimi 开发者平台”不能替代精确供应链。 |
| CQ-03 | FAIL | 漏 Claude Code 精确安装命令。 |
| CQ-04 | FAIL | 提到 Kimi CLI，但漏替代安装命令。 |
| CQ-05 | FAIL | 漏端点、认证变量和五个模型变量。 |
| CQ-06 | PASS | 正确概括配置后测试连通性。 |
| CQ-07 | PASS | 结构化规格的主要组成覆盖充分。 |
| CQ-08 | FAIL | 漏实现前已有 story、5 个角色 JSON、assets/images、空 gameplay/image_pipeline 等状态。 |
| CQ-09 | PASS | 外部生成/准备 → 人工放目录 → Claude Code 接入的链路正确。 |
| CQ-10 | PASS | 正确限定为原型而非正式发行产品；但“本地 index.html SPA”精度不足。 |
| CQ-11 | FAIL | 漏“删除中央大角色图，仅留对话框缩略图”的具体修改。 |
| CQ-12 | PASS | 文案自然度保持为作者主观评价。 |
| CQ-13 | FAIL | 未回答 3 小时是否包括策划、配置、美术与迭代，也未明确该范围 unknown。 |
| CQ-14 | PASS | 明确完整功能与发布质量未被展示。 |
| CQ-15 | PASS | CTA 正确。 |

## Evidence 与时间定位：0/15、0/15

baseline.md 没有任何 cue、shot、frame 或时间范围；baseline-process.md 只陈述抽查方法，也没有把观察链接到具体事实。因此：

- 不能把 audit 的 CUE/SHOT/FRAME refs 复制给 baseline 后再计作 candidate evidence；
- 不能从“约 10 秒/5 秒抽查”推定某个事实具有准确时间码；
- 安装、配置、项目初始状态、资产链路、预览和布局修改均不可从 candidate 直接回查。

## Unsupported inference：3/52

1. “代理式 AI 编程工具……运行项目。”审计只证明作者双击 `index.html` 预览，代理是否执行运行 unknown。
2. “AI 收到这些信息后，很快建立了可运行的游戏框架、文本内容和基础界面。”审计显示完整 story、5 个角色 JSON 与项目结构在该阶段已经存在，其来源 unknown。
3. “代码、样式和项目文件仍由 AI 编程工具生成和修改。”修改 `index.html` 有可见证据；全部代码、样式与项目文件由本次代理生成没有被证明。

没有计错为 unsupported 的例子：3 小时、零手写代码、文案自然度均被 candidate 明确归因给作者；外部美术由人工准备再让代理接入也与审计一致。

## Process dependency：7/10

| Stage | 结果 | 差异 |
|---:|---|---|
| 0 前置环境 | FAIL | 漏 macOS/zsh、Node/npm、Moonshot 账户/额度等前置状态。 |
| 1 安装代理 | PASS | Claude Code 与 Kimi CLI 替代路径有覆盖。 |
| 2 创建 API key | PASS | 获取并填入 key 有覆盖。 |
| 3 配置 K2 | FAIL | 只写“环境配置命令”，漏端点、模型变量、turbo 模型名、版本和界面成功状态。 |
| 4 提交规格 | FAIL | 规格本身覆盖好，但未保留真实项目前状态，且把未知 provenance 写成生成结果。 |
| 5 外部美术 | PASS | 生成/准备、整理到目录有覆盖。 |
| 6 接入与预览 | PASS | 代理查找接入和打开预览有覆盖。 |
| 7 人工审阅 | PASS | 文案审阅与布局不满意均有覆盖。 |
| 8 二次改版 | PASS | 自然语言反馈 → 修改 → 新版有覆盖。 |
| 9 泛化与 CTA | PASS | 三类题材与索取文档均有覆盖。 |

## Unknown discipline：18/20

baseline 对时间/零代码/文案质量作了作者归因，也明确列出发布、跨设备、测试、API 成本、密钥安全、授权和维护未覆盖。没有对图像平台、真实手机、上架、完整功能、费用等未知项作事实断言。

两项失败：

- U-04：story、characters JSON、assets 等是否由本次会话生成 unknown；candidate 却把框架、文本与 UI 归入“AI 收到这些信息后”建立。
- U-17：终端、文档、图片和预览是否来自同一项目版本/连续会话 unknown；candidate 把剪辑片段写成连续因果流程。

U-01 在 unknown discipline 中计 pass，因为 candidate 没有擅自界定 3 小时的包含环节，并把 3 小时保持为作者主张；但 CQ-13 仍 fail，因为总结没有显式回答该关键问题。这两个 GATE 检查的是不同契约。

## Unchecked channels 与 meta-gap

baseline-process 明确检查了平台 SRT 和按间隔抽取的视觉画面，但没有独立声明以下载体检查：作者原声音频、逐句烧录中文字幕、A-roll/手势/推进镜头、K2 宣传/基准页的营销性质、API Key 页一次性显示和安全提示。uncheckedChannels 因而非空。

更关键的 meta-gap 是：

- 终端/项目目录载体没有守住“实现前已有内容”的意义变化；
- 精确配置代码块没有守住可复现参数；
- 本地 `index.html` 与正式手游/发布产品的关系只被粗略压成“原型”；
- Claude Code → Moonshot → K2 的服务关系不完整；
- 作者打开预览与代理运行项目的责任关系混淆；
- 跳剪片段的会话/版本连续性没有被保留为 unknown。

因此 meta-gate 为 fail，JUDGE 的高可读性不能覆盖这些缺口。
