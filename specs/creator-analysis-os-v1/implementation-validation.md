# Creator Analysis OS — Implementation validation

Date: 2026-08-21

## Mechanical checks

- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm test`: 37/37 pass across 11 test files.
- `npm run build`: pass.

## Live Xiaohongshu vertical slice

Input: the public AI 红发魔女 creator profile, using the local `hhh-01` ego-browser session.

- acquisition job leased and completed in a dedicated TaskSpace;
- convergence: `zero_growth` after bounded scrolling;
- 61 unique visible `section[data-note-id]` cards frozen after `zero_growth` convergence;
- 61/61 visible like counts parsed; no missing value was converted to zero;
- corpus statistics: median 765, mean 1783.43, maximum 24000;
- canonical selection: High 7 / Base 7 / Low 7;
- deep candidates: 9 flags inside the same 21 records;
- artifacts: inventory, normalized corpus, corpus analysis, canonical selection;
- selected-post detail job: 21/21 identities verified, with sanitized URL, title, public description and visible date label;
- event ledger covers create/lease/start/artifact/complete/reviewable transitions for all three nodes;
- final operational boundary: `reviewable`, with `deep_capture_pending`; it is not labeled ready.

The same temporary browser TaskSpace was passed from inventory to detail collection and closed afterward. Signed card navigation URLs lived only inside the ego-browser process and were not persisted. No challenge was bypassed and no signed media URL, cookie, credential, or login secret was persisted in the artifacts.

An earlier broad anchor scan returned 91 IDs, but included hidden/internal links that could not be matched to visible cards. The implementation rejected that denominator and now requires the visible card identity anchor. The 61 count means this web session converged; it is not claimed to be the platform's authoritative lifetime post count.

## Browser checks

- `/creators/ai-red-witch` is the only creator research page; the old run URL redirects into it.
- desktop creator projection: 21 List records, 21 Gallery records, the same record IDs, and 9 deep-validated markers;
- the deep section no longer duplicates the nine records; it reports High/Base/Low coverage as 3/3, 3/3, 3/3 and directs users back to the canonical 21;
- List exposes tier, title, topic/form, publish time/duration, likes/median multiple, core content, architecture, mechanism hypothesis, and evidence state; Gallery shows the same research fields over the same items;
- single-video route rendered content restoration, evidence health, knowledge units, sparse/dense frames, complete cue table, conflicts, unknowns, and gate state without opening a parallel report system;
- desktop horizontal overflow: false at 1280 px;
- mobile emulation at 390×844: H1 and all 21 records present; List becomes labeled stacked records and page horizontal overflow is false;
- `/comparisons` renders the honest empty/project state without the deleted raw-like legacy leaderboard; `/benchmark` redirects to it;
- screenshots are local QA artifacts under `.runtime/qa/` and are not committed.

## Read-model and route convergence

- creator: `GET /api/v1/creators/:creatorId` → `/creators/:creatorId`;
- video: `GET /api/v1/creators/:creatorId/videos/:videoId` → `/creators/:creatorId/videos/:videoId`;
- comparison: `GET /api/v1/comparisons/:comparisonId/dossier` → `/comparisons/:comparisonId`;
- legacy creator/video artifacts are parsed only through compatibility projectors into the same V1 schemas;
- duplicate Creator Console and Creator Run Console React implementations were removed;
- old creator, video, and benchmark HTTP read APIs were removed rather than left as parallel truth.

## Remaining hard boundary

Older imported creator artifacts do not contain every normalized identity, topic, format, comment, duration, and architecture field. The compatibility projection leaves those cells unknown or pending. New versioned runs can fill them only through the confirmed acquisition, reconstruction, evaluation, and synthesis gates.
