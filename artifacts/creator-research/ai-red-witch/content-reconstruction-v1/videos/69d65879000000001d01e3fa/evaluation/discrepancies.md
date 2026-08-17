# Discrepancies：69d65879000000001d01e3fa

## D-01：可读安装/运行命令被错误弃权

- 严重度：中
- Candidate：KU-18/report 只说画面有“安装+运行”标题和较小/模糊的命令块，并称全部字符不足以可靠恢复。
- Independent audit：`toolReadmeUiAudit.installRun.visibleCommands` 明确记录 `npm install -g badclaude` 与 `badclaude`；同时正确限定视频没有展示命令被输入或执行成功。
- Evidence：SHOT-002、DENSE-0026；TARGET-0035 也能看到同一命令块。
- 影响：Critical-question recall 少 1；Evidence coverage 少 1；Unknown discipline 记一次 incorrect abstention。它不改变“视频没有证明安装成功”的结论。
- 所需修正：在 candidate 中补回两个可见命令，并继续保留“未演示输入、安装成功或启动成功”的证据边界。

## D-02：“停止侵权函”复选状态与 audit 冲突

- 严重度：低
- Candidate：KU-10/report 把“来自 Anthropic 的停止侵权函”归入未勾选路线图笑话项。
- Independent audit：`toolReadmeUiAudit.roadmap.visibleItems` 将该项记录为 `checked`。
- Evidence：SHOT-007、DENSE-0029、TARGET-0035。
- 影响：Unsupported inference 记 1 项。核心日志条目“记录你鞭打克劳德的次数”仍被双方一致识别为未勾选，因此“日志是未来路线图而非现有功能”的主结论保持成立。
- 所需修正：只更正停止侵权函条目的勾选状态，不要把更正扩张为日志已经实现。

## 无差异的关键边界

- badclaude/Claude Code 与 SRT 的 bad cloud/cloud code 冲突被正确保留。
- README/口播声称、终端可见状态与未证明的完整实时因果被正确区分。
- 7 个可见数组行与 5 种不同短句被正确同时报告。
- 鞭打日志的未勾选未来态、未来 AI 追责的喜剧外推、表情包的非正式指代均正确。
- 开头“人类会玩”与结尾“AI 何时能想出”的强化回环正确。
- 产品外部条件、身份映射、非语音音频和准确剪辑数均保持了范围化未知。
