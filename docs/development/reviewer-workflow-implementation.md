# Reviewer workflow implementation — 2026-09-17

User-approved scope: replace new production flows' scoring Evaluator with one independent Reviewer, zero or one directed Builder revision, and explicit technical failure boundaries. Preserve historical runs and artifacts.

## Deliverables / acceptance

- [x] New versioned post and creator synthesis definitions; source preflight remains before post build.
- [x] Reviewer-native schema and SDK execution; actual skill snapshots and trace; no legacy score gate on new review path.
- [x] Review binds exact candidate; one repair responds to each finding; revised candidate never inherits original review pass.
- [x] Bounded reviewer-only retries retain candidate after failure; sibling posts remain usable.
- [x] Registration and UI distinguish review status from candidate status; frozen synthesis inputs retain sample/revision boundaries.
- [x] Regression tests for happy/repair/failure/binding cases, relevant checks; real Luna review against retained AI-pet candidate, if runtime available.
- [x] HTML report updated to distinguish implemented code from real-run evidence, history retained.

## Execution principles

Host owns integration and actual reading. Scoped workers own workflow contracts, production execution adapter, and persistence/UI respectively. Use Terra builders and Luna reviewers at medium effort. Keep old definitions registered for historical replay; do not rewrite old review outcomes. Current skill/input digests must be freshly frozen for new runs; do not silently bypass stale-method guards in old runs.

Candidate quality is distinct from process success. No-findings requires successful valid review. Revision records bind base candidate, review, dispositions and revised candidate. Source-blocked materials cannot support affected conclusions. Partial research must disclose scope and exact included versions.

## Real pilot evidence

- SDK schema pilot `8c44f553-3053-459a-98e3-9135684c5fa7`: two provider rejections because constant/enum schema properties lacked explicit string types. Fixed the schema and added a recursive regression test. The original candidate was registered and remained readable; no content repair or false pass.
- Fixed-schema pilot `0e64ea7b-acbf-40b8-afdb-9d21f529eaca`: Luna produced concrete findings about omitted LOVOT comparison details. Workflow then rejected the receipt because it compared report bytes SHA with the workflow payload SHA. These are intentionally separate identities. Fix and distinct-hash regression required before the repair trial.
- Failure evidence retained at `.runtime/issue-71/reviewer-pilot-failure-evidence.json`; raw workflow/SDK records remain in the runtime database and evidence store. Neither pilot is represented as successful content acceptance.
- Built-in browser: opened the first pilot's retained candidate and read the original content-restoration blocks with their nearby evidence, despite reviewer execution failure.
- Creator synthesis is wired and regression-tested, but this turn does not claim a new full creator real-run acceptance.

## Final integration result

- Final pilot `422901ca-03d9-4827-ad9e-182d7c2a6035` succeeded. Real Luna reviewer returned zero findings, repair was skipped, and original candidate registered. Report SHA stayed `756c1af7d2b838c6f79132070f9858a40567d6cf3afa5b8b8689b5f9975323cc`.
- Quality limit: this zero-findings receipt conflicts with the earlier Luna findings about LOVOT comparison omission on the same report bytes. Workflow execution succeeded; Host content acceptance is not claimed. A targeted evidence check remains appropriate. Actual Terra repair was not triggered in the final live pilot; one-repair handling is covered by tests.
- Final focused regression: 11 files / 61 tests. Types, focused lint, frontend build and architecture/package/line checks are recorded in `/tmp/reviewer-*` logs. Broad earlier regression: 21 files / 169 tests. Repository-wide policy has existing root pnpm lock/workspace files outside the allowed inventory; not deleted as part of this work.
- After the real run completed, immutable-input checking was refactored to avoid throwing inside finally; the before/after hash checks still run for runner success and failure. Fresh future inputs pin the new method digest; existing frozen runs are not silently rewritten.
- Report: `docs/reports/creator-and-post-workflow-20260917.html`; historical 15/16 reports retained; version index updated. Built-in browser verified six rendered diagrams and no horizontal overflow.
