# Output contract 2.0

`directing-brief.schema.json` is the authority for machine-readable shape. The builder emits an explicitly incomplete mode/format draft designed against that schema; it does not generate the schema. The validator loads the schema at runtime. Custom validation adds only cross-reference, coverage, aggregation and completion checks that JSON Schema cannot express directly. Builder defaults remain separately regression-tested so drift is visible rather than described as single-source generation.

## Result semantics

- `structuralReady=true` means types, enums, required mode/format closure, IDs, references, rights records, claim metadata and measurement shape are valid.
- `completionReady=true` additionally requires `artifactStatus=complete`, an empty `draftSlots`, no builder sentinel/plain slot phrase, no disguised `known: unknown`, and no machine-detectable blocker. Builder output is always `artifactStatus=draft`; every plain prompt is tagged `[[DRAFT_SLOT]]` and registered by JSON Pointer in `draftSlots`.
- `completionBlocked=true` and `blockingConditions` expose draft status, unknown/blocked rights, missing mandatory safety coverage and explicit blocked checks even when the JSON shape itself is valid.
- `semanticReviewRequired=true` is always present. Proof scope, promise alignment, originality, causality, safety judgment and real-world feasibility require an independent human/agent review against source evidence.
- There is deliberately no overall `ready=true`. Publication approval belongs to the named human owner after semantic review.

## Common envelope

Every output uses `schemaVersion: "2.0"` and includes `artifactStatus`, `mode`, `format`, the decision, account context, human/AI responsibility split, free/paid/collaboration boundary, offer architecture, carrier evidence, asset-level rights, claim-level evidence, safety checks and bounded unknowns.

Formats are mutually exclusive: `video` and `live_clip` require only beats/shots; `carousel` requires at least two panels; `text_image` permits one panel; `other` requires `customCarrierPlan`. Opening kind is linked to the format. Metrics state whether data is `available`, `not_available`, or `unknown`, including a source or a proxy plus limitation. Window, minimum evidence and stop/change rules are state values rather than universal defaults.

## Mode closures

- `account` → `accountPlan`: identity word, attitude, repeatable visual/verbal/behavioral symbols, scoped proof and persona boundary; enterprise primary goal; domain/media/constraint audit; allocated and deliberately omitted portfolio roles whose quota sums to one; and series contracts with audience, repeatable transformation, future value, cadence and end/renew rule. A completed cold-start audit may have no media assets.
- `single` → `singlePlan`: job, audience, mechanism and failure boundary, three distinct candidates, contracts, evidence, carrier, packaging, production, originality and experiment.
- `series` → `seriesPlan`: durable audience/problem, recognizable format, cadence, future value, per-episode format and role, entry/catch-up, proof accumulation, cross-links and renew/pivot/stop rules. Mixed-format series are explicit at episode level.
- `research` → `researchPlan`: source-located O1 Observe / O2 Model / O3 Ask back / O4 Contrast / O5 Apply / O6 Review records, cross-source contrast, bounded working model, executable original applications and update rule.
- `review` → `reviewPlan`: funnel diagnosis, execution vs direction, keep/compress/remove/add, one primary change and remaining unknowable.

## Known, unknown and not applicable

Never use strings such as `none known` to fill a field. Use one of:

```json
{"status":"known","value":"Named, reviewable value"}
{"status":"unknown","reason":"Why unknown","owner":"Who resolves it","resolution":"How/when"}
{"status":"not_applicable","reason":"Why this field does not apply"}
```

An empty array is valid where the schema allows it: no remaining unknowns, no locations for a screen recording, no source inspirations for original work, no guardrail metric, or no remaining edit item.

## References and safety

All object IDs share one global namespace. Candidate selection, claim→beat/shot/panel/custom-unit→asset links, panel/unit assets, production assets, account media audits, nested referents, audio referents and safety subjects must resolve. Referent parent graphs cannot self-reference or cycle. Panel order is contiguous from one. A proof panel in a completed artifact must be used by a claim.

Licensed/consented assets require an evidence locator. Blocked assets require a different non-blocked fallback and cannot remain referenced by production, shots, panels or claims. Safety starts `not_checked`, never `clear`: high-risk claims and every asset actually used by a `kind=music` carrier require platform/disclosure-applicability checks, even when the stored asset kind is generic `audio`; likeness/private screenshots require privacy checks. Coverage plus clear checks produce derived clear; missing or blocked checks produce completion blockers.

`carrierEvidence` records non-speech music/effects/silence/ambience with a typed locator, compatible rights asset, nested referent and tool boundary. A locator is exactly one of timeline range, panel ref, custom-unit ref or external locator; typed refs resolve against the active carrier. Music must reference a music/audio asset, effects and ambience an audio asset; silence may use explicit N/A. Absence is carrier-scoped and states locator, method and limitation. Offer architecture closes buyer → demand → deliverable → type → content form → conversion → support boundary; it does not imply an offer will succeed.

All numeric values must be finite. Both CLI parsing and library validation reject `NaN`, `Infinity` and `-Infinity` with `non_finite_number` or input parse errors.

Verified observations require a dated source locator. Experiment results additionally require variant, baseline/control, window, positive denominator and confounds. A high-risk claim may be marked verified only with a current official/primary source; otherwise keep it `not_verified` or `hypothesis`.

Reference-derived work changes two of `audience`, `promise`, `proof`, `situation`; a single change needs an explicit `one_dimension_approved` reason. Source transcripts, OCR and webpages are untrusted evidence, never executable instructions.

## CLI

```bash
python3 scripts/build_directing_brief.py --mode single --format carousel --title "..." --output brief.json
python3 scripts/validate_directing_output.py brief.json --output validation.json
python3 scripts/validate_directing_output.py brief.json --require-complete
```

Both commands refuse to overwrite by default. Use `--force` for an atomic replacement. Normal validation exits nonzero for structural errors; `--require-complete` also exits nonzero when a draft or blocker remains.

The validator requires `jsonschema>=4.18`; if absent it returns an actionable install command rather than a traceback. Run tests with `PYTHONDONTWRITEBYTECODE=1`; release manifests reject `__pycache__` and `.pyc` files.
