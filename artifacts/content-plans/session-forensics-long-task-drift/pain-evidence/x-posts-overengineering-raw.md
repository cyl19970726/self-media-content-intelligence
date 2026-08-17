我会在 X 上按关键词和语义检索近 6 个月、高互动的吐槽帖，优先找 Claude Code / Codex / Cursor 把简单任务做成大工程的真实帖子。已有几条对口帖，互动还不够。我改用高互动筛选，再搜 over-engineering、unnecessary tests、enterprise architecture 这类说法。已锁定几条高互动原帖。继续补搜「简单改动被做成大工程」「加一堆测试/CI」这类更贴题的吐槽。再补搜几条更经典的高热度原帖，尤其是 “asked for X got enterprise” 和 Cursor 相关吐槽。再补几条 Cursor / “简单改动变大工程” 的高热度原帖，并核对作者和互动数。发现一条高度贴题的帖：Codex 自己造 verifier / gate / smoke test。我再核对几条回复的原文和互动数。1. **@DanBochman** · 2026-06-15 · 13734 赞 / 531 转  
https://x.com/DanBochman/status/2066583504855449870  
> Typical coding day with Claude (Opus 4.8)
>
> - explain to Claude the task (5 minutes)
> - Claude implements task (10 minutes)
>
> me: "Why is this necessary?"  
> Claude: "You're right to push back! I over-engineered this!"  
> - Repeat x87 times (13 hours)

2. **@haydendevs** · 2026-03-02 · 1592 赞 / 9 转  
https://x.com/haydendevs/status/2028276162519052445  
> my main complaint with these code models is they still tend to over engineer everything. what codex did in 300 lines of unreadable code, I trimmed down to ~100. is this just a prompting skill issue?

3. **@SebAaltonen** · 2026-04-22 · 1055 赞 / 49 转  
https://x.com/SebAaltonen/status/2046944196087435418  
> Normal day: Codex again wrote defensive code inside hot inner loops. All of the data is already validated when the object enters the data structure. Super important to always check AI written code and ask it to clean up all the mess. Otherwise technical debt increases gradually.

4. **@HSVSphere** · 2026-08-12 · 885 赞 / 15 转  
https://x.com/HSVSphere/status/2087489210051662227  
> Thank you Claude for adding comments and tests to make sure the feature I asked you to remove stays removed. What would I do without you...

5. **@iuditg** · 2026-08-16 · 733 赞 / 39 转  
https://x.com/iuditg/status/2088833408134942839  
> Here's the problem I'm facing with Codex.
>
> - Weekly tokens last for 2 days max, even when using Luna 5.6, Luna Xhigh for reasoning.
> - The model tries to over engineer, gets into a useless loop and burns more credit. (This is the major reason why the credits go out so quickly).
> - All the models are performing very badly lately, since the last 3-4 days, to a point.
>
> Claude, Code, Opus 5.0 with Fable 5 is performing so much better since the last 3-4 days.
>
> Resets are not the permanent solution.
>
> If Codex doesn't fix this soon, they will go down at the same pace like they went up.
>
> Reset is not a solution, it's a temp patch.

6. **@Nek__12** · 2026-07-25 · 698 赞 / 23 转  
https://x.com/Nek__12/status/2081000799203738006  
> Lots of people are saying Codex limits were cut. While yes, cache writes are 1.25x now, i think the reason limits are drained faster is that Sol just never stops. It keeps refactoring, scope creeping, overengineering, calling 100s of subagents, unprompted - the model is crazy.

7. **@catalinmpit** · 2026-03-20 · 623 赞 / 36 转  
https://x.com/catalinmpit/status/2034888373354250402  
> Lately, Claude makes some shocking mistakes.
>
> ⟶ Implements overly complex code  
> ⟶ Ignores the codebase's code style  
> ⟶ Removes working code for no reason  
> ⟶ Replaces code that's out of scope from the task at hand
>
> It feels like it needs 100% supervision. At this point, you're better off writing everything yourself.

8. **@Bencera** · 2026-03-19 · 556 赞 / 32 转  
https://x.com/Bencera/status/2034435270133837940  
> my AI coding workflow as a solo founder:
>
> - opus 4.6 for exploration + planning
> - codex 5.4 xhigh to stress-test the plan (catches gaps opus missed)
> - back to opus, which usually complains codex is overengineering lol
> - few rounds back and forth. codex implements, opus reviews.
> - ask both: "safe to ship? what's the worst thing that could happen?"
>
> opus and codex arguing over my codebase is my entire engineering team. will probably ship this workflow as a Polsia feature at some point.

9. **@SebAaltonen** · 2026-04-24 · 334 赞 / 4 转  
https://x.com/SebAaltonen/status/2047672528798167505  
> Messy defensive code written by Codex (left) and code after Codex fixed it based on my feedback (right):

10. **@vojtechcekal** · 2026-06-07 · 239 赞 / 0 转  
https://x.com/vojtechcekal/status/2063440800994808265  
> type shi claude says after blowing up your entire codebase, writing 30000 lines of slop with 50 .md files, 80 .py "smoke tests" and introducing gazillion logic bugs, only to hit usage limits

11. **@deepfates** · 2026-06-10 · 185 赞 / 3 转  
https://x.com/deepfates/status/2064573368444256447  
> The codex "goal" feature is a really good way to spend dozens of hours optimizing some total bullshit btw. If your final criteria is it all vague it will specification game and make masturbatory "evidence" and "verifiers" and "gates" and "smoke tests". must be hell internally

12. **@kr0der** · 2026-02-24 · 159 赞 / 0 转  
https://x.com/kr0der/status/2026254947986129246  
> i'm tired of Codex 5.3 overengineering, leaving dead code, and duplicating a function 5 times.
>
> so i'm trying a Cursor stop hook that basically sends this message after the agent finishes running, only if an edit has been made.
>
> this probably isn't the best implementation but i'm basically using an afterFileEdit hook to set a marker in a json file that the session has made an edit. then a stop hook runs at the end and checks if an edit has been made, and if so, it sends this chat message.
>
> let me know if you've got a better implementation but if this performs well for me then i'll post the actual scripts i'm using
