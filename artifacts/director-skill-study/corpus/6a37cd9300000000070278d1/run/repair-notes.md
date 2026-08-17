# Gate discrepancy repair notes

修复范围仅限本 `run/`；未修改 audit、evaluation、gate-report 或 canonical Skill。

- 可见账号状态：新增 `KU-02B`，记录 TARGET-0004 可独立看到账号“人类最强编导”和“5万粉丝”；明确“不到一周”、从零起号、增长轨迹与账号归属仍未知。
- 来源归因：新增 `KU-05B`，单独恢复作者“结合我之前说的 Vlog 框架”的自我归因，并与当前展示书籍来源分开；新增 `author_overlay_on_displayed_source` 关系。
- 平台 bridge：新增 `KU-06B`，恢复“利他→平台深度精选→得到感”，并标为未被平台规则/数据验证的 author claim；新增 `unverified_platform_bridge` 关系。
- 五步法边界：`KU-11` 新增 stage、niche、resources、exceptions 四类未知。
- 时间越界：删除 `KU-11` 对 112.954 秒 TARGET-0048 的引用，改用单元范围内 100.7 秒的 TARGET-0043。
- 结尾边界：`REL-10` 从 `payoff_for` 改为 `does_not_verify`；`KU-19` 明确只完成本期 episode，不验证“不到一周五万粉/30天十万粉”，并补 `reasoning`。
- cue accountability、meaning change、关键问题与文章同步更新。
- 重建后 schema 验证通过；所有知识单元和关系证据引用均可解析，无 self-edge。

## Fresh review v2 repair

- 新增 `KU-07B`：原子保存“平台最终目的是留住用户”（CUE-025）。
- 新增 `KU-07C`：完整保存“用户喜欢即好内容；平台需留住用户；所以平台与用户对好内容目标一致”的作者论证，并列出未验证边界。
- 新增 `REL-11 author_rationale_for`，由 `KU-07B` 指向 `KU-07C`，引用 CUE-023–CUE-025。
- 新增关键问题 `Q-09`，同步 protocol 派生、coverage、cue accountability、meaning change 与 meta-gate。
- 文章新增三步因果链及平台规则/留存数据/衡量方式/例外均未验证的限制。
