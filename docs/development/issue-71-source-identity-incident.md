# Issue 71: source identity conflict isolation

## Observed incident

Creator run `2224f773-c005-4326-ba14-a3bf42ff444f` contains post
`6a916dbf000000000302829c`. The page-level identity supplied by RedFox says
“浙大迎新现场，机器狗学长正式上岗” and describes an 85 kg luggage climb.
The downloaded 40-second video, its frozen frames, ASR, and Builder report all
show the unrelated Microduck open-source robot / USD 399 material.

One fresh, single-note RedFox `noteDetail` read returned the same post ID,
creator ID, dog metadata, and video candidate. A diagnostic-only download of
that candidate was byte-identical to the retained formal media. This isolates
the mismatch to the upstream detail response or its upstream platform source;
it is not a local downloader ordering error, ASR mismatch, or Builder report
reuse.

The private raw provider response and diagnostic download are retained under a
mode-0700 runtime diagnostics directory. They are intentionally not public
artifacts. The workbench displays the RedFox-projected title, while a direct
original-page visit currently returns “当前笔记暂时无法浏览”; this incident does
not treat a live page header as independently verified.

## Scope check

The twelve selected deep samples were checked against their detail title and
description, local video evidence, ASR, and Builder summary. Eleven are
consistent at that level. Only `6a916dbf000000000302829c` has the explicit
identity/content conflict.

## Isolation rule

`CreatorResearchService.recordSourceIdentityConflict(runId, conflict)` keeps
all existing artifacts and Builder text unchanged. It appends a
`source_identity_conflict` blocker, gives the run an independent-media-check
next action, and emits a `handoff.required` event containing the diagnostic
evidence reference.

While that blocker remains, post, synthesis, creator-analysis, and workflow
retry starts are rejected. The legacy `resynthesize` and failed-reconstruction
retry paths are rejected as well, so they cannot clear blockers and bypass the
hold. Reading a workflow and canceling it remain available.

## Operator call

After storing the private diagnostic evidence, call:

```ts
service.recordSourceIdentityConflict("2224f773-c005-4326-ba14-a3bf42ff444f", {
  postExternalId: "6a916dbf000000000302829c",
  message: "RedFox detail returns Zhejiang dog metadata but its video candidate is byte-identical to the retained Microduck video.",
  evidenceRef: "/private-runtime-diagnostics/6a916dbf000000000302829c-20260916"
});
```

Do not rebind the Microduck media to another post by title similarity. Recover
only after an independently verified page/media pair supplies a stable external
ID; then create a new, separately evidenced reconstruction attempt.
