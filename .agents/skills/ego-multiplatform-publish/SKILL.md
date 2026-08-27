---
name: ego-multiplatform-publish
description: Use Ego Browser to prepare, save drafts, verify, or publish content through the real creator forms of Xiaohongshu, Douyin, WeChat Channels, Bilibili, and WeChat Official Accounts. Use when platform-specific fields and reliable platform-side evidence matter in this self-media project.
---

# Ego multi-platform publishing

Use the `ego-browser` skill for every browser action. Treat a shared content package as source material, never as a platform-ready form.

Before filling a platform, read its section in [references/platform-contracts.md](references/platform-contracts.md). Map the source into that platform's own fields; do not collapse distinct fields such as Bilibili intro and dynamic text, Official Account body and digest, or Channels description and short title.

## Operating modes

- `inspect`: observe the live form and report its fields without changing platform state.
- `prepare`: upload and fill the form, then hand control to the user before the final action.
- `draft`: save inside the platform and verify the draft through the platform's own draft/unpublished-work entry.
- `publish`: perform the final external submission only after explicit authorization for that exact prepared revision.

Draft permission is not publish permission. Never use a generic text-matching submit routine across platforms. Each adapter must name its exact final action and its post-action evidence.

## Live-form drift

The reference is a maintained contract, not proof of the current page. When a locator, required field, enum, or limit differs from the live form:

1. Stop before the final action.
2. Re-observe the semantic tree and visible page in the existing Ego TaskSpace.
3. Update the platform adapter and the relevant reference section.
4. Re-run validation with harmless media and save only a draft unless publish was explicitly authorized.

Record the account identity, prepared fields, platform result, draft/public URL or ID when available, and timestamp. Do not claim success from a click alone.
