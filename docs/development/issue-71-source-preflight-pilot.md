# Source preflight and reader acceptance pilot

## Authorized scope (2026-09-16)

Add source-content consistency checking before research, validate with one complete AI硬件情报局 workflow, and read the delivered post and creator results in the built-in browser. Use Terra medium for production/repair and Luna medium for independent checks. Preserve previous reports and frozen runs. The robot source-conflict hold remains in place.

## Deliverables and acceptance

- [x] Independent source check compares original title/body with media evidence; matched, conflict and insufficient evidence are separate outcomes.
- [x] Check results bind exact source hashes; cached Builder candidates do not bypass checking. Historical workflow revisions keep their semantics.
- [x] Conflict/insufficient evidence cannot silently pass to Builder; result and evidence remain inspectable.
- [x] Regression checks include known robot mismatch, consistent source, missing evidence, altered source and candidate reuse.
- [x] Launch one pilot through the real production SDK workflow after relevant checks pass.
- [ ] Verify actual model/skill/input receipts and inspect the resulting post and creator reports in the built-in browser.
- [ ] Record concrete knowledge obtained, unresolved questions, and whether the Host accepts the research. Execution success alone is not acceptance.

## Existing evidence

See `issue-71-source-identity-incident.md` for the known provider mismatch, and `issue-71-synthesis-quality-audit.md` for generic synthesis findings. Prior AI hardware v2 completed with 9 succeeded / 3 needs_review; its synthesis was not Host accepted. Robot v3 reused 12 candidates and completed 2 reviews before cancellation; no new synthesis was produced.

## Current status

Post/creator v4 is implemented, retaining v1-v3 historical definitions. Two scoped AI硬件情报局 pilot attempts were started and canceled after confirmed defects, with artifacts preserved. A third scoped research driver is now active after bounded context-check validation (see latest entry below). Other creator queues are not being consumed.

Additional confirmed defect: creatorReviewRoute returned deliver for every provisional result before inspecting quality failures. A narrow fix will permit provisional delivery only for an explicit deep_9_ready-only validation gap; other findings must reach repair.

Host baseline reading (built-in browser): current creator knowledge section repeats “structure/function explanation” for zipper, coffee machine, grill and fitness samples. The page exposes references but does not teach their concrete mechanisms or relationships. Acceptance requires per-example specific knowledge and bounded cross-post comparison, not merely more finding rows.

## Baseline knowledge for reader acceptance

The existing coffee-robot post describes an author's scene-selection argument: households are heterogeneous, factories already automated, while catering has repeated actions, standardized processes and stable demand. It then connects claimed beverage data accumulation, category replication and continuing service income. These are source claims with limits, not independently verified commercial outcomes.

The Wyze post describes a different mechanism: a low-priced entry device, prioritizing image/alerts/usability, followed by paid services and distribution channels. A useful synthesis should preserve these differences before drawing a bounded relationship about hardware and recurring services. The present synthesis collapses them into generic “mechanism and scene explanation.”

Actual reading also found SHOT-017 in the Wyze report resolved to a JSON manifest instead of its existing representative frame. The evaluator evidence list overwrote the canonical frame entry. A projection-only fix now keeps the canonical source resolution, with regression coverage; no Builder text or original evidence was changed.

## Validation and actual use

- 136 focused tests passed; TypeScript and production build passed. Package, frontend architecture and source-length checks passed. Root repository policy remains blocked by pre-existing untracked `pnpm-lock.yaml` and `pnpm-workspace.yaml`; neither was deleted nor bypassed.
- Real Luna medium checks: known robot mismatch returned conflict (`01cdad1d-dfa3-408b-92a7-9c06f8661530`); Wyze returned consistent (`a393b7ad-a71f-483d-8aa4-33dd73729526`). Both retain model thread IDs, source SHA, method SHA and original frame references. This verifies source identity, not external truth of commercial claims.
- The first real invocation exposed a Codex strict output-schema 400 (const/enum leaves missing explicit type). Corrected and covered by recursive schema regression before the full pilot started.
- Built-in browser verified SHOT-017 loads the actual 360px frame after API restart.
- Source-check asset is readable in the real workflow UI. Reader found misleading generic “研究复核通过” label on source checks and missing phase token totals; fixes/diagnosis delegated while the pilot runs. Final research acceptance remains pending.

### First full pilot stopped for an execution-boundary defect

Run `f8dde0cf-403e-4056-bdac-eccc9c7e6d67` was canceled through the normal service after source check `ff79fe9a-cf5a-47ef-a8f3-5126c978d329` returned a malformed model-echoed input hash. This is a schema/execution failure, not a source conflict. The fix makes input fingerprint binding a service responsibility; model output contains only source-comparison semantics. Existing input byte checks remain mandatory. No frozen input in that run will be rewritten. A new run will capture the corrected method revision.

### Corrected pilot

Same-post real recheck `a47d4332-7272-4767-9432-494bebb0892e` returned consistent after removing model hash echo. Its standard usage event records Luna medium and SDK/CLI 0.154.0. The input fingerprint is now service-bound. All 136 focused tests pass again. New full parent: `ea4e69bb-75d2-44f5-92aa-ca92008f9e65`, started 2026-09-16 17:03 CST. Previous canceled attempt remains inspectable.

UI source-check label now reads 来源核对结果; v4 source/candidate/review/repair order is 1/2/3/4. The original v3 definitions retain their order. Production source-check usage is now sent through `agent.usage`; private raw traces remain private. Final reader acceptance is pending.

## Cost observation (not changed during the pilot)

The same-post recheck used 88,787 input tokens, including 55,296 cached, and 1,031 output tokens. Trace shows one thread/turn, four native image inputs (720×1280), one small JSON-reading shell command, no image-tool replay. Business prompt is 1,561 bytes and method reference 1,034 bytes. A skills-context-budget warning proves ambient skill context was present; exact attribution of cached tokens to system/tools/skills versus reused inputs is not exposed. Image encoding and ambient context are plausible contributors, not proven per-component counts. Future bounded cost experiment: compare a smaller contact sheet with original four-frame checks on the known conflict and normal cases before changing production. No active input snapshot was changed for cost tuning.

### Reader caught a false source-conflict verdict

All 12 source checks executed in second pilot, 11 returned consistent and AI红包 (`69a8030f00000000220219dd`) returned conflict. The checker compared title 80亿 against sampled 45亿 and missed intervening context. Host read the actual delivered post in the built-in browser: opening shows “光现金红包…45亿” followed by “算上春晚赞助/市场活动总花费/超80亿”; both original subtitle frames are visible. These are different scopes, not evidence of a wrong source video. Existing media-preparation source SHA is `2db19d30161ff0e04ef1113f58a359787bdb755288115a8b9c5f1f8e587808bb`.

Second parent canceled through normal service before synthesis: its source gate is not accepted yet. Corrective work is bounded to one supplementary context pass after initial non-consistent verdicts, distinct identity-vs-detail comparisons, preserved first/second-round evidence and usage, and regression checks. No verdict is manually overridden.

### Bounded context checker implementation and real comparisons

Added @2 comparisons separating identity from claim detail, with @1 historical reading retained. Non-consistent initial checks or contradictory detail findings trigger at most one contextual pass (opening 0–12s and nearby sampled intervals). PIL contact sheets preserve labeled original frame references; input byte identity is fixed before extraction and checked across rounds. Missing contextual evidence remains uncertain. 143 focused tests and production build passed before the final de-anchoring adjustment.

Real pair: robot `89336ac6-8906-4bf6-b74c-4dc530adc31a` remained conflict after context; AI红包 `38ed14f2-78ee-47bb-b990-37935e3b106d` became consistent. However Host rejects treating that as full success: its detail row still falsely claimed 45/80 contradiction, citing initial sparse frames despite contact sheet clearly showing cash vs total context. Final bounded adjustment removes prior-round conclusions and initial-frame citation permissions from second-round inputs; first-round traces remain preserved. Final same-post check `5716f672-7ad0-453e-ba78-f5312467bfce` is in progress. No third full parent has been launched.

### Final source-check comparison and resumed pilot

Real independent-context recheck `5716f672-7ad0-453e-ba78-f5312467bfce` succeeded: second round cited `context/ctx-06.jpg` (“超80亿”) and described total marketing activity spending, with no contradictory detail finding. It retained an English monetary-unit mistranslation; method now requires Chinese output and verbatim source units, to be inspected in the production pilot. Host did not edit the already-produced check. Final focused suite: 143/143.

Third scoped parent `7cc56f5f-a872-460d-858e-f48906fd7e9a` started 2026-09-16 17:31 CST, post.source-check@v2 with new pinned method. Terra medium production/repair, Luna medium source/review, video concurrency2. Full creator reader acceptance remains pending, and no other creators are scheduled by this driver.

### Production checkpoint after final source repair

Third parent has 12/12 source checks succeeded with no blocked/failed post at checkpoint; two post reviews are actively running and remaining reviews are queued. Source gate acceptance is complete for this pilot cohort. Source child `0b9f816b-38dd-4a8b-8a24-7ffbc3ce1431` was read by Host in the built-in browser: Chinese reasoning correctly names “就砸了45亿 / 市场活动总花费 / 超80亿”; evidence refs are directly accessible and identity/detail labels are separate. This fixes the observed false conflict and unit mistranslation in the new production output.

Full creator synthesis and final research acceptance are still pending. Scoped driver PID96990 / exec session23410 remains active, API PID90542 / exec session46400. Continue inspecting this parent rather than launching another. Reader questions remain: concrete knowledge across examples, meaningful cross-post relationships and bounded comparisons, and evidence usefulness—not merely execution status.


### Single-post closeout, 2026-09-16 20:00 CST

User requested step one only: finish post review and repair before creator synthesis. Fresh inspection found root `7cc56f5f-a872-460d-858e-f48906fd7e9a` had ended `needs_review`: five posts passed, seven repair branches failed before useful repair execution. Source checks remain 12/12 passed.

Two execution defects were reproduced and fixed: inherited phase prefix `post-research:` was missing from repair-to-review key resolution; copied candidates already contained an `immediate-predecessor/evaluator-evidence` directory and archival collided with it. Exact candidate/review SHA checks remain mandatory. Multi-generation archives now preserve earlier evaluations in numbered history directories rather than overwrite them. Production runner tests cover nested v4, v3/v2 and evaluation-contract repair; archive regression covers three generations.

Recovery uses `.runtime/issue-71/recover-posts-v4.ts`, normal service retries, the original seven post branches, unchanged frozen inputs, Terra medium repairs and Luna medium reviews. The creator root stays `needs_review`, so synthesis does not start. The first recovery supervisor exposed a queue/core-state distinction: queued execution records can coexist with the old failed core record until execution starts. Recovery now reads queue state and supports resuming partial dispatch; it never treats a failed post as successful closeout. Final post outcomes and reader acceptance are still pending.

Host reader checkpoint: built-in browser opened exact repaired candidate `207eb8e2-0166-4fc0-b45c-3849b414a562` (AI pet). It now explicitly distinguishes the product name BOOBOO from uncertain company-name ASR, lists hover/approach/circle behavior as author claims, and distinguishes visible Pitch/Speed controls from proof of flight/emotion behavior. Visible remaining questions: a 2:02–2:09 content-block coverage warning, repeated evidence images/ASR text, and inherited parent-phase assets cluttering the repair-child page. These are reader observations, not proof of missing source content; independent final review is still pending.

Recovery checkpoint: all seven post repairs executed successfully on original branches. Five untouched posts remain accepted; seven repaired candidates undergo the existing bounded independent second review. First second-review result (AI pet) remains `needs_review` with timestamp/process-dependency findings; no report/status is overridden. Host has read repaired AI pet and coffee robot candidates in the built-in browser; coffee now records visible `+Printed Coffee` while keeping product-label identity unknown and preserves the scene-selection/data/repeat-service argument as author claims. Validation: 102 workflow/research/adapter tests passed, full TypeScript and focused ESLint passed, package-boundary/source-line checks passed.

AI-pet second-review forensic classification: the reviewer expected nonexistent `steps/checks/unknowns` fields in valid capture-protocol-2.0 (actual fields: captureActions/requiredRelations/stoppingRules/declaredUnknowns), and nonexistent per-frame status/artifacts/ocr/notes in targeted-evidence-1.0. All 21 requested timestamps have matching existing target frames. The process-dependency 0/1 score is unsupported by its cited rationale, and timestamp 4/5 gives no concrete bad reference. CR-06/DL-06/VE-07 repeat the same premise. Do not order a further content repair from this finding or manually promote its review. A subsequent evaluator correction must bind the real artifact contracts and require actionable failed-reference evidence, then reevaluate the unchanged candidate.

Additional Host reading: repaired OpenClaw candidate `70d308ff-c701-4d7d-b294-105d3f0155a6` visibly restores the independent development-board/home-automation segment: Tuya T5/Raspberry Pi examples, claimed low-cost deployment, claimed proactive response, and claimed light control. It explicitly does not convert montage into a demonstrated setup/event/result sequence. Host also inspected the coffee candidate’s directing lens and packaging-promise boundaries. These are targeted reader walkthroughs of three revised samples, not a claim to have reread all twelve complete reports.

### Bounded post closeout result — 2026-09-16 20:30 CST

All seven failed repair branches recovered; all seven second reviews completed. Final twelve post outcomes: **11 succeeded, 1 needs_review, 0 failed, 0 blocked**. The single needs_review is the AI-pet evaluator-contract misreading documented above, not evidence of missing target-frame files. No manual acceptance override. No creator synthesis was started, and the historical creator parent remains needs_review until explicitly resumed in the next stage.

| Post | Final state | Workflow |
| --- | --- | --- |
| `6a61e8640000000022018372` | `succeeded` | `728ca78e-73e0-4442-b6a8-c58e5fb29ecc` |
| `6968c3c9000000000b013f4d` | `needs_review` | `43b3e358-f1a0-40b6-ae72-ba8ece551410` |
| `6a672d9f000000001102d3ae` | `succeeded` | `2dfcc8a9-3aff-41a5-b562-e4bf02a3f99f` |
| `6a71be2d0000000021023fa4` | `succeeded` | `85b142bd-5a76-4a82-b8df-cc54dd3d3137` |
| `69fc61750000000035038fec` | `succeeded` | `d9bd65b9-92b5-478d-ab99-9031230f1e9c` |
| `69e0bcd700000000210079a4` | `succeeded` | `c096c861-b555-4778-86e3-db7170700533` |
| `6a47a0d5000000000f006b47` | `succeeded` | `27e29466-1cc8-4c8a-b0b8-71246249757f` |
| `6a0eddfa0000000035032dfc` | `succeeded` | `f71f6b52-9438-400b-ab59-05e83dbda80c` |
| `6a312941000000000f031628` | `succeeded` | `41eb2250-7d6a-4f6b-b8d0-65194926e798` |
| `69c260f6000000002200f0ec` | `succeeded` | `0e207b93-1604-4626-bf29-f2d9d2bb2162` |
| `69a8030f00000000220219dd` | `succeeded` | `7a195204-e71b-4bcc-85bb-d9c4864ebade` |
| `69afed94000000002603df49` | `succeeded` | `1e5f4599-76b4-4b5f-89e8-37c7f420d93a` |

Remaining narrowly scoped action: correct evaluator evidence-contract consumption and unsupported failure reporting, then independently reevaluate the unchanged AI-pet candidate. Do not rerun its Builder or the other eleven posts merely to clear the status. Other reader findings (parent assets shown in child view, repeated evidence/ASR, coverage warnings needing source checks) remain recorded separately from accepted research claims.
