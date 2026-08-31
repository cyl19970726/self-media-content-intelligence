# Evaluation report

Date: 2026-08-16

## Decision

The current canonical Skill passed all 22 deterministic and independent hard gates on three development videos and two fresh post-repair holdouts. The readable article is produced only after the evidence-backed reconstruction validates.

`READY_FOR_DOWNSTREAM_USE`

## Method

Each real-video evaluation used isolated roles and directories:

1. an independent auditor watched raw video and created evidence-backed ground truth;
2. a fresh Skill runner received only video, subtitles, and the generated evidence pack;
3. a normal-summary baseline received video/subtitles without the Skill;
4. an independent evaluator applied GATE, then JUDGE only after GATE;
5. the deterministic validator checked schemas, transcript/shot mappings, carrier sweep, protocol derivation, capture/OCR execution, evidence references, time bounds, dependencies, coverage, and meta closure.

Existing human-authored reports were excluded from runner and evaluator inputs. Real media and authenticated data stayed local and were not copied into the Skill.

## Development set

| Set | Real video | Distinct structure | Final hard-gate result |
|---|---|---|---|
| dev-tool-map | `69129479000000000700ac96` — 大揭秘！这些强大的AI，都怎么用？ | rapid tool cards, deictic speech, counted visual examples | 22/22 |
| dev-workflow | `6928316c000000001e0397ba` — 3小时0代码，教你用AI做乙女文游！ | long UI/file workflow, commands, external asset handoff | 22/22 |
| dev-argument | `66011c23000000000d00ed40` — 给OpenAI的Sora泼点冷水 | long argument, conditions, counterexamples, hopeful close | 22/22 |

Independent content metrics:

| Set | CQ recall | Evidence | Unsupported | Timestamp | Dependency | Unknown | Unchecked | Meta |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| dev-tool-map | 14/15 | 23/25 | 0/31 | 37/37 | 8/8 | 9/9 | 0 | pass |
| dev-workflow | 15/15 | 37/40 | 1/24 | 78/85 | 65/70 | 20/20 | 0 | pass |
| dev-argument | 18/18 | 28/28 | 0/46 | 89/89 | 19/19 | 14/14 | 0 | pass |

V1 development failures were retained and used to improve the method: missed short cards, sublines, counts, identity/authorization boundaries, UI/OCR reading, file-state provenance, non-speech audio, global relations, and closing reframes. Development reruns are regression evidence, not blind generalization evidence.

## Blind holdouts and repair history

The first two fresh holdouts failed and were not relabeled as passes:

- `6801c0750000000007037156` exposed application/document identity inversion, literal failure-signature loss, environment omission, procedure-order smoothing, and weak unknown handling.
- `69424c0d000000001e039745` exposed missed source qualifiers, UI progress/disclaimers, scoped CTA absence, service-condition unknowns, and avatar referent loss.

The Skill was repaired around open principles—referent, boundary, absence, identity, and negative-evidence audits—rather than adding content categories.

A later director holdout, `6a69d19c00000000090357d0`, found another real meta failure: a transcript/burned-text conflict was silently normalized, the closing guarantee disappeared, technical shot segments were not related to semantic continuity, and self-edge relations weakened the graph. The Skill was repaired again to require a carrier-conflict ledger, opening-to-closing semantic relation, segmentation-versus-continuity audit, and distinct relation endpoints.

Two fresh post-repair holdouts then passed:

| Holdout | Real video | CQ | Evidence | Unsupported | Timestamp | Dependency | Unknown | Unchecked | Meta | Deterministic |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| holdout2-3d | `663ac5da000000001e03437a` — 用Ai捏一个粘土风3D模型，又丑又乖 | 12/12 | 7/7 | 1/31 | 20/20 | 5/5 | 12/12 | 0 | pass | 22/22, ready |
| holdout3-director | `6a3ba6950000000007027cc5` — 同行别割了 自媒体没有捷径 | 8/8 | 17/17 | 0/45 | 29/29 | 5/5 | 8/8 | 0 | pass | 22/22, ready |

JUDGE after hard-gate pass:

- holdout2-3d: readability 5, prioritization 5, evidence usefulness 5, execution value 5, compression without loss 4;
- holdout3-director: 5, 5, 5, 4, 5.

## Baseline comparison on final holdouts

| Metric | 3D Skill | 3D normal summary | Director Skill | Director normal summary |
|---|---:|---:|---:|---:|
| Critical-question recall | 100% | 66.7% | 100% | 100% |
| Evidence coverage | 100% | 85.7% | 100% | 0% |
| Unsupported-claim error | 3.2% | 7.9% | 0% | 12.5% |
| Timestamp accuracy | 100% | 80% | 100% | 0% |
| Unknown discipline | 100% | 66.7% | 100% | 25% |

Both normal-summary baselines failed hard gates. The 3D baseline upgraded a side-by-side edit into proven real-time causality. The director baseline recalled the thesis but supplied no auditable evidence ledger and lost uncertainty boundaries.

## Remaining limitations

See [known-limitations.md](known-limitations.md). Readiness means the reconstruction contract and evaluation gates passed; it does not verify the video's external product, medical, commercial, platform, or causal claims.
