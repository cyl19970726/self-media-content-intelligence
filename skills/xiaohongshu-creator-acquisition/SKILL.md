---
name: xiaohongshu-creator-acquisition
description: Acquire and resume a Xiaohongshu creator's public profile, visible post inventory, post details, covers, public metrics, bounded comments, and selected media with auditable coverage. Use for creator research collection, not for interpreting content mechanisms or evading platform controls.
---

# Xiaohongshu Creator Acquisition

Produce a resumable public-evidence package that downstream research can trust. Use `$ego-browser` with the user's authenticated session and preserve user control. Never route collection through Chrome scraping, hidden credentials, request replay, or anti-detection behavior.

## Inputs

- creator profile URL or verified creator ID;
- run directory and snapshot time;
- requested stages: profile, inventory, detail, comments, covers, or selected media;
- existing inventory and resume cursor when continuing a run.

## Required outputs

- verified identity with at least two independent public anchors;
- `collection-inventory.json` with globally deduplicated post IDs;
- `collection-status.json` with observed/displayed counts, field-specific missingness, stop reason, failures, and resume state;
- bounded detail observations containing stable post identity, public dates and metrics when visible;
- local cover/media manifests with bytes and SHA-256, never signed source URLs;
- comment snapshots that disclose selected posts, captured count, reply coverage, and capture time.

## Workflow

1. Verify the final profile identity before accepting posts.
2. Resume from the persisted global-ID ledger. A visible-card batch is not a global inventory.
3. Advance only when an observable signal changes: new global IDs, page height, scroll position, or DOM/card keys.
4. At the bottom, use bounded observation and at most one bounded retrigger. If the displayed count still exceeds observed IDs, stop as `quiescent_incomplete`, not complete.
5. Open known canonical post URLs directly. Use a bounded profile-card lookup only as a fallback.
6. On login, captcha, `300031`, safety restriction, or unavailable-note state, stop immediately and request handoff. Do not retry around the control.
7. Verify downloaded media by hash, probe, and decode samples before marking it usable.

## Boundaries

- Acquisition records what is publicly observable. It does not infer positioning, audiences, content quality, mechanisms, or commercial success.
- Missing values stay null with a reason; never coerce them to zero.
- Public likes are not impressions, retention, conversion, followers, or revenue.
- Store no cookies, headers, tokens, signed media URLs, private comments, or login material in public artifacts.

Return `ACQUISITION_READY` only when the requested stage is complete and its coverage is explicit. Otherwise return `ACQUISITION_PARTIAL` with the exact resumable blocker.
