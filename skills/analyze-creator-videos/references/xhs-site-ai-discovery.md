# Xiaohongshu in-site AI discovery (experimental)

This channel is a discovery accelerator, not the canonical creator inventory. It is useful when the user wants many relevant posts, creators, or recurring questions from one broad query.

## Product decision

Start as a Skill workflow. Do not build an MCP until browser tests show a stable machine-readable interface, repeatable pagination or continuation behavior, durable citation identifiers, and enough call volume to justify a long-running service.

Reasons:

- the current surface is an authenticated browser conversation;
- answer structure, citations, and UI state may change;
- the workflow still needs semantic query planning and human-readable evidence review;
- a browser Skill can use the user's existing `hhh-01` session without moving credentials into a service.

Promote to MCP only after at least 20 successful sessions across five query families and two account states, with measured extraction precision and a versioned response adapter.

## Canonical route

- `$ego-browser` only;
- authenticated server/profile `hhh-01`;
- dedicated TaskSpace reused across follow-ups;
- read-only interactions;
- no Chrome/Google automation fallback;
- login or bootstrap failure becomes `needs_user`.

## Query protocol

For each research question, run three passes:

1. **Landscape:** ask for the main creators/topics and why each is relevant.
2. **Evidence expansion:** ask for representative posts, titles, authors, dates, and direct post references for every answer item.
3. **Counter-search:** ask for missing, contradictory, smaller, recent, or low-performing examples that challenge the first answer.

Example creator query:

> 小红书上有哪些体量较大、持续发布 AI 内容的博主？请按职场提效、AI 工具实操、行业资讯、商业案例分组。每位博主请给出账号名、你判断其体量较大的公开依据、3 条代表帖子标题与可点击帖子引用；不确定的字段明确写未知，不要只给概括。

Follow-up:

> 你刚才的名单可能遗漏了哪些博主？请补充至少 10 个候选，并指出哪些账号只是单条 AI 爆款、哪些是持续经营 AI 垂类。不要重复上一轮。

## Evidence ledger

Store one sanitized observation per answer:

```json
{
  "queryId": "xhs-ai-001",
  "askedAt": "...",
  "query": "...",
  "answerText": "...",
  "candidates": [
    {
      "kind": "creator|post|topic|question",
      "name": "...",
      "claimedReason": "...",
      "citationLabel": "...",
      "citationUrl": "...",
      "verificationStatus": "unopened|opened|confirmed|conflict|unavailable"
    }
  ],
  "continuationState": "complete|more_available|unknown",
  "uiEvidence": ["screenshot or sanitized DOM artifact"],
  "limitations": []
}
```

Do not store cookies, local profile paths, hidden tokens, signed media URLs, or private conversation state in public artifacts.

## Verification rules

The in-site AI answer may nominate candidates, but it may not by itself establish:

- the creator's stable identity;
- follower or engagement counts;
- a complete post inventory;
- exact publication dates or metrics;
- that a cited post is a video;
- causal reasons for performance;
- platform-wide ranking or completeness.

Open cited creators/posts through the normal read-only acquisition pipeline. Record `source = xhs_site_ai` as discovery provenance, then resolve identity and metrics independently. Contradictory values remain conflicts.

## Evaluation before promotion

Maintain a small gold set of queries with independently verified creators and posts. Measure:

- creator recall and false-positive rate;
- valid citation rate;
- citation-to-creator identity accuracy;
- duplicate rate across continuations;
- field precision for titles, authors, dates, and public metrics;
- freshness sensitivity;
- unsupported ranking or size claims;
- recovery from login, empty-answer, and continuation failures.

Hard failures: fabricated citation, wrong creator identity, hidden credential capture, mutating page action, or presenting site-AI output as a complete inventory.
