# Creator collection infrastructure

This design is derived from the real build session `01a0066b-defd-7241-98dc-a0a31863b36c`. It defines the collection substrate that must exist before the creator-analysis Skill is treated as repeatable.

## Contents

1. History-derived failure edges
2. Architecture and browser broker
3. Identity and convergent crawling
4. Field provenance and resumable inventory
5. Media resolution and verification
6. Snapshot diff, control plane, and gates
7. Build order

## What the history showed

The reference runs repeatedly had to:

- reconnect to the authenticated `hhh-01` ego-browser service and verify login;
- confirm the creator identity before trusting the page;
- scroll long profile grids until no new stable note IDs appeared;
- distinguish video notes from image/text notes;
- reopen individual notes to recover metrics, publish time, media, and official subtitles;
- retry page-state extraction after CDP timeouts or changing `__INITIAL_STATE__` shapes;
- download only missing media instead of restarting the corpus;
- detect a nominally valid 315-second MP4 whose actual moving picture stopped near 40 seconds;
- preserve the one subtitle-less visual short as an explicit case instead of treating it as a failure;
- keep the collection read-only: no likes, comments, follows, or credential extraction.

These are recurring operations and should become infrastructure rather than ad hoc browser scripts.

## Recommended architecture

```text
creator URL
  -> identity resolver
  -> profile snapshot
  -> convergent grid crawler
  -> note inventory
  -> detail enrichment queue
  -> media/subtitle resolver
  -> verified downloader
  -> immutable raw snapshot
  -> normalized creator corpus
  -> snapshot diff / downstream invalidation
```

The browser adapter, download verifier, and corpus store are separate components. Page-shape changes must not require changing analysis logic.

## 1. Authenticated browser broker

Canonical route for Xiaohongshu:

- `$ego-browser`;
- server/profile label `hhh-01` when available;
- one named TaskSpace per creator collection run;
- explicit ownership state: `agent_control | user_control | released`;
- login/CAPTCHA becomes `needs_user`, never an automatic credential fallback.

Persist only the server/profile label and TaskSpace ID. Never persist cookies, passwords, local profile paths, or signed URLs in public artifacts.

The broker should expose four high-level actions instead of arbitrary repeated snippets:

1. `verifySession()`
2. `openCreator(profileUrl)`
3. `runReadOnly(action)`
4. `releaseTaskSpace()`

Every mutating page action is denied by default.

## 2. Creator identity resolver

Before collecting posts, capture and reconcile:

- stable creator ID from the URL/page state;
- display name and Xiaohongshu ID;
- bio and public labels;
- follower and total likes/collections labels;
- canonical profile URL;
- avatar reference;
- snapshot timestamp.

Require two independent identity anchors, such as stable ID plus displayed Xiaohongshu ID/name. If the shared link redirects to a different creator or a login shell, stop before collection.

## 3. Convergent profile-grid crawler

Do not use a fixed scroll count. Crawl until convergence:

1. extract visible card IDs and lightweight card fields;
2. scroll by a bounded viewport amount;
3. wait for DOM/network quiet;
4. merge by stable note ID;
5. stop only after `N` consecutive rounds add zero IDs, an explicit end marker appears, or a declared limit is reached.

Record each round in `crawl-ledger.jsonl`:

- round number and timestamp;
- visible IDs and new IDs;
- scroll position and page height;
- extraction strategy used;
- retry/error result;
- stop reason.

Default convergence: three zero-growth rounds. A timeout or page error is not convergence.

Card-level output should include stable ID, card title, media badge/type, cover reference, public like label, relative publish label when visible, and source URL/token availability. Preserve the raw card payload separately.

## 4. Layered extraction strategies

The session showed that a single `__INITIAL_STATE__` path is brittle. Use a strategy ladder and log which one succeeded:

1. structured page state with versioned path adapters;
2. visible DOM attributes/text;
3. network response already available to the controlled page;
4. `unknown` plus screenshot/DOM evidence.

Never silently combine contradictory values. Store candidates with provenance and run a resolver:

```json
{
  "field": "likes",
  "chosen": 63000,
  "candidates": [
    {"value": 63000, "source": "detail_page_state", "capturedAt": "..."},
    {"value": 63000, "source": "visible_dom", "capturedAt": "..."}
  ],
  "status": "confirmed"
}
```

If sources disagree beyond normal display rounding, set `conflict` and preserve both.

## 5. Inventory first, detail enrichment second

Freeze a complete lightweight inventory before opening every post. This prevents deep work from hiding coverage gaps.

Each inventory row has a state machine:

```text
discovered
  -> detail_pending
  -> metadata_ready
  -> media_pending | media_skipped
  -> media_downloaded
  -> media_verified
  -> ready

Any stage may become: needs_user | retryable_failed | terminal_failed | stale
```

Detail enrichment adds:

- exact public engagement snapshot;
- publish timestamp/label and capture timezone;
- description, hashtags, author identity check;
- video/image type confirmation;
- duration and dimensions when visible;
- official subtitle availability/language;
- selected public comments when the analysis contract requests them;
- public source references and field-level provenance.

The queue is resumable by note ID. A rerun only processes missing, stale, or explicitly invalidated rows.

## 6. Selection-aware media policy

Separate metadata coverage from media coverage:

- all visible notes: inventory + public metrics + lightweight annotations;
- comparison set: detail page and cover evidence;
- deep set: full video, official subtitle when available, comments if required, and reconstruction evidence.

Do not download every video by default. Default deep media set is 3 high + 3 median + 3 near arithmetic mean + 3 low after corpus selection. Median represents the typical post; arithmetic mean may represent a higher long-tail baseline. If an account is small, disclose overlap and avoid downloading the same post twice. If the user asks for full reconstruction, expand explicitly and show expected work.

Existing verified files are content-addressed and reused. A new run should report `reused`, `downloaded`, `refreshed`, and `missing` counts.

## 7. Media and subtitle resolver

For each selected note, resolve candidates without publishing ephemeral links:

- media candidate URL(s), container/codec expectations, and expiry scope;
- official subtitle URL/language/format when present;
- no-subtitle as a valid state with reason;
- content type and expected duration from page evidence when available.

Write safe source metadata before downloading. Signed URLs live only in a private transient record and are redacted from public manifests.

Downloaded files use stable note IDs, not sequence numbers:

```text
media/<note-id>/source.mp4
media/<note-id>/official.zh-CN.srt
media/<note-id>/download-receipt.json
```

## 8. Verified downloader

HTTP success and container duration are insufficient. The reference run contained a partial video whose container looked like a full five-minute file.

Verification has four layers:

1. transport: status, received bytes, retry/resume result, candidate checksum;
2. container: ffprobe duration, streams, dimensions, codec, decode errors;
3. timeline: decode probes at start, quartiles, near-end, and a dense tail window;
4. content continuity: detect frozen/black/repeated tails and verify real frame change near the expected end.

Status vocabulary:

- `verified_complete`
- `verified_visual_short_no_subtitle`
- `partial_or_frozen_tail`
- `decode_failed`
- `metadata_mismatch`
- `unknown_completeness`

Only the first two may feed deep reconstruction. A partial file must invalidate derived frames, transcript alignment, and reports.

## 9. Snapshot store and incremental refresh

Every collection produces immutable raw snapshots plus a normalized current view:

```text
runs/<creator-id>/<snapshot-id>/
  profile.raw.json
  grid.raw.jsonl
  details/<note-id>.raw.json
  crawl-ledger.jsonl
  collection-status.json
  creator-corpus.json
```

The refresh engine diffs stable note IDs and field revisions:

- new post;
- removed/hidden post;
- metric changed;
- metadata changed;
- media/subtitle candidate changed;
- unchanged.

Metric updates create new snapshots; they do not overwrite the original capture. Content changes invalidate only affected downstream nodes. Likes changing should refresh portfolio statistics but should not force video reconstruction when the media hash is unchanged.

## 10. Collection control plane

`collection-status.json` is the operator-facing truth:

- creator identity result;
- authenticated route and TaskSpace reference;
- start/end timestamps;
- crawl stop reason and convergence evidence;
- visible/discovered/enriched/video/image counts;
- media reused/downloaded/verified/failed counts;
- subtitle available/missing counts;
- retry queue and needs-user blockers;
- incomplete fields and conflicts;
- raw snapshot revision/hash;
- readiness: `blocked | partial | inventory_ready | deep_media_ready`.

The Dashboard and analysis stages may never infer collection completeness from file count alone.

## 11. Observability and fixture separation

For every browser or download action record:

- action ID, note ID, stage, attempt, elapsed time;
- extraction strategy and page-state signature;
- input/output artifact references;
- retry class and terminal error;
- redaction status.

Maintain sanitized page-shape fixtures for parser regression, but label them `fixture`. A fixture passing extraction tests proves adapter compatibility, not that a live creator corpus is current or complete.

## 12. Hard gates before analysis

Portfolio analysis may start only when:

- creator identity is confirmed;
- crawl has a documented stop reason;
- duplicate note IDs are zero after merge;
- video vs non-video status is explicit or unresolved;
- metric missingness is measured;
- snapshot time and timezone are recorded.

Deep reconstruction may start only when each selected item has:

- detail metadata and stable source ID;
- verified complete media or a documented visual-only exception;
- official subtitle state (`available | absent | failed`);
- safe provenance record without exposed auth/session data;
- no unresolved partial-download gate.

## Build order

1. Define the collection state machine and schemas.
2. Build the ego-browser broker and identity resolver.
3. Build the convergent grid crawler with a resumable ledger.
4. Add detail enrichment and field-level provenance.
5. Add verified media/subtitle resolution and download validation.
6. Add snapshot diff and downstream invalidation.
7. Only then wire the analysis Skill and Dashboard renderer to the canonical collection outputs.

The first usable milestone is not “a finished Dashboard.” It is: paste a creator link, resume safely after interruption, produce a complete inventory with explicit gaps, select high/median/average/low representatives, download only what is needed, and prove each selected media file is complete.
