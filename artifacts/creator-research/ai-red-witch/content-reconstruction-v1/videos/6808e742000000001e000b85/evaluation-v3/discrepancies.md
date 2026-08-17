# Current repaired candidate discrepancies — 6808e742000000001e000b85

## Substantive audit discrepancies

None found that changes a hard-gate count, factual boundary, evidence scope, relation or downstream understanding.

The three requested closure checks all succeed:

| Closure | Current evidence | Result |
|---|---|---|
| Complete non-speech-audio semantics | Source-matching 87.957-second PCM derivative; 17 gap-free AudioSet windows; `SRC-AUDIO-NON-SPEECH`, `CAR-07`, `KU-21` | Closed |
| Resampled OCR provenance/execution | `SRC-RESAMPLED-OCR`; three processed `ACT-14` OCR frames; namespaced frame/OCR references | Closed |
| `KU-23` timestamp scope | Unit range `1.867–6.967s`; only 6.4-second page frame/OCR retained in the unit; later playback frames moved to their own units/relation | Closed |

## Residual non-blocking note

The audit lists “whether the interface was live or prerecorded” as one of 13 workflow-dependency boundaries. The candidate does not repeat that wording verbatim, so process dependency completeness is 12/13 rather than 13/13. It does preserve the material conclusion that the edited UI/result montage is not an end-to-end execution demonstration. This remains above the 0.85 threshold and does not create an unguarded carrier, meaning change or relationship.

## Remaining unknowns correctly preserved

- page/repository URL, owner verification, license, current download availability and commercial terms;
- online access, price/credits, account, region, hardware, latency and support conditions;
- 30-second source-file continuity and literal infinite extension;
- sample authorship, model/version, prompt, parameters, source rights and post-processing;
- training-data definition, provenance and authorization;
- full short-drama production dependencies;
- background-music identity, creator, source, license, frame-exact boundaries, embedded-sample audio and weak event-label provenance.

These are bounded unknowns, not unresolved contradictions or silent omissions.
