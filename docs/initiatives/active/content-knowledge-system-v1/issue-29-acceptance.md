# Issue #29 — Practice Validation Acceptance

Status: **Accepted locally**

Issue: <https://github.com/cyl19970726/self-media-content-intelligence/issues/29>

## Outcome

Issue #29 closes the first creation-to-learning loop without weakening the
research authority boundary:

```text
predeclared hypothesis + baseline
  → frozen package snapshot + platform revision
  → verified publication receipt
  → observable results + explicit unavailable metrics
  → accountable submission
  → independent adjudication
  → first-party observation | no promotion | blocked | invalidated
```

The key invariant is that a first-party result can support, qualify, or
contradict a concept, but it never increases the distinct external video or
creator denominators used by research promotion gates.

## Requirements and acceptance mapping

| Requirement | Implemented behavior | Verification |
|---|---|---|
| R1 | Canonical promoted results are origin-labelled first-party validation observations. | Knowledge and Research Learning service tests |
| R8 | Validation freezes hypothesis, baseline, execution, results, unavailable metrics, deviations and confounders. | Service and HTTP integration tests |
| R9 | Creation requires resolvable run, verified receipt, matching variant revision and frozen package snapshot; commands remain idempotent. | Route, repository and integration tests |
| R10 | Conclusive candidates require observed evidence; submitter and adjudicator must differ; only explicit promote emits an observation. | State-machine tests for all terminal decisions |
| R11 | Publication History presents planned, observed and decision context in one case file. | Browser and responsive verification |

## Domain decisions

1. Practice Validation belongs to the Content Knowledge decision ledger; the
   original publication run and receipt remain owned by Creation.
2. A validation can be created only from `published` or verified
   `draft_saved` execution, never from preview, failure, cancellation or an
   unknown submission result.
3. The hypothesis snapshot is copied at validation creation so later working
   changes cannot rewrite what was tested.
4. An unavailable metric is a typed absence with source, reason and timestamp;
   it is never represented by zero.
5. A conclusive candidate requires a target concept, its frozen current
   revision, and at least one observed signal.
6. Submission and adjudication are distinct accountable decisions. A shared
   identity is rejected deterministically.
7. `promote`, `complete_no_promotion`, `block`, and `invalidate` are explicit
   adjudication decisions. Only `promote` emits a canonical observation.
8. A promoted observation uses `origin = first_party_practice`, a null external
   creator/video identity, and a validation-local evidence reference.
9. Research reads expose counts partitioned into external research and
   first-party practice; existing external promotion counts retain their prior
   meaning.
10. Legacy validation JSON remains readable through additive defaults; history
    is not rewritten during reads.

## Compatibility notes

- Existing validation routes remain at their V1 paths.
- The adjudication command accepts the legacy `promote: boolean` shape during a
  compatibility window, while new callers use an explicit decision.
- Existing aggregate confirm/qualify/contradict and distinct-video/creator
  counts continue to represent eligible external research votes.
- New origin-partitioned counts and validation snapshot fields are additive.

## Verification record

- Targeted Knowledge, HTTP integration and Research Learning suites cover
  promoted, inconclusive, blocked and invalidated decisions, publication
  eligibility, unavailable metrics, independent adjudication and origin counts.
- Default repository suite: 39 files passed, 9 skipped; 180 tests passed, 41
  skipped.
- Documentation links, repository policy, package boundaries, artifact budget,
  typecheck, lint, production client/server build and all four entrypoint smoke
  checks passed.
- Ego Browser opened an isolated production runtime with one verified published
  run and promoted first-party qualification. Publication History rendered the
  frozen hypothesis, declared baseline, observed save count and source, two
  unavailable private metrics, execution deviation, confounders, accountable
  submitter/adjudicator and canonical observation ID with no page error.
- Desktop 1527px and narrow 320px checks showed no horizontal overflow. At 320px
  the case file retained the Planned → Observed → Decision order.
- The browser flow found and fixed a disabled terminal invalidation control.
  After the fix, entering a reviewer and source-withdrawal reason enabled the
  action; the real UI/API transition changed the record from `promoted` to
  `invalidated` without losing the historical observation ID or producing a
  browser exception.
