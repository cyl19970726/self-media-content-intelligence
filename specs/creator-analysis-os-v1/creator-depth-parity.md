# Creator Depth-Parity Contract

Status: **normative migration floor**

This is a source-artifact → canonical-field → UI-surface contract. It prevents a new schema or cleaner page from silently flattening populated research. `partial` is allowed only for a genuinely absent source channel and must name the source path, impact, and failed gate.

## 1. Shared non-loss rules

- Every source record is registered by content hash and subject ID before projection.
- Every populated source value maps to a canonical value, a typed evidence reference, or an explicit migration exception. It may not vanish into prose such as “兼容旧数据”.
- Counts are checked at source registration, canonical artifact, and UI projection. A count mismatch blocks parity publication.
- List and Gallery use the same IDs. Deep items are flags on those records, not a second inventory.
- A source deep asset that is outside the V1 canonical nine remains registered and reachable as historical evidence; canonical selection does not authorize deletion.

## 2. AI红发魔女 (`ai-red-witch`)

| Source artifact | Canonical fields | Required UI surface | Minimum / cannot lose |
| --- | --- | --- | --- |
| `artifacts/creator-research/ai-red-witch/selected-high-like/baseline-backfill.json` | `corpus.{postCount,likesKnown,coverageRate,medianLikes,meanLikes,maxLikes,distribution,health}` | Creator header + 基本盘 | `postCount=331`; `likesKnown=318`; median, mean, max and distribution populated; unknown 13 remain unknown. |
| `.../selected-high-like/analysis.json`, `.../median-performance/median-samples.json`, `.../low-vs-high/low-samples.json` | `tiers[high|base|low].{count,metrics,conclusion,mechanisms,confounds}` | High/Base/Low comparison | Exactly 3 tiers; each has count and min/median/mean/max; each has ≥1 sourced conclusion and ≥1 sourced mechanism/failure condition. |
| `.../video-library/library.json` | `portfolio.items[]` | Canonical List + Gallery | Exactly 21 unique IDs; High/Base/Low each 7; every record retains title, likes, tier, topic, format, core content, architecture, mechanism hypothesis, selection reason and evidence state. |
| `.../video-library/creator-overview.json`, `.../selected-high-like/strategy.json` | `identity`, `contentSystem.{topicClusters,formatClusters,visualLanguage,recurringStructures}`, `growthEngines`, `boundaries` | 定位与核心价值 + 内容系统 | Positioning, audience, provided values and trust sources each contain ≥1 evidence-linked statement; numeric topic and format clusters expose count/measured count/median/mean/max/high share where source supports it. |
| deep video reports and media under `selected-high-like`, `median-performance`, `low-vs-high` | `portfolio.items[].deepSample`, video reconstruction revision | Deep marker + Single Video | Exactly 9 canonical deep markers (3 per tier); every marker resolves to a video page. Representative ID `6801c0750000000007037156` passes `three-lens-video-contract.md`. |

Parity gate `PARITY-AIWITCH` passes only when all five rows pass.

## 3. 张咋啦 (`zhang-zala`)

| Source artifact | Canonical fields | Required UI surface | Minimum / cannot lose |
| --- | --- | --- | --- |
| `artifacts/creator-research/zhang-zala-v1/creator-corpus.json`, `annotated-inventory.json`, `dashboard-data.json` | `corpus.*`, per-post metric snapshots, annotations | Creator header + 基本盘 | Exactly 62 posts; distribution totals 62; likes known for every source-populated post; median, mean and maximum remain separate. |
| `.../dashboard-data.json` `topicClusters[]` / `formatClusters[]` | `contentSystem.topicClusters[]`, `formatClusters[]` | 主题组合 + 形式组合 | At least 8 source topic clusters and 18 source format clusters are registered; canonical clustering may merge only with an explicit many-to-one mapping. Every displayed cluster has count/measured count/median/mean/max and evidence refs. |
| `.../selection.json`, `creator-analysis.json`, `dashboard-data.json` | one `selection_set`, 21 `selection_items`, `tiers[high|base|low]` | High/Base/Low + List/Gallery | Exactly 21 canonical records; all IDs unique; includes ≥1 `median_near` and ≥1 `mean_near` anchor. Source `high/median/average/low` labels map explicitly to High/Base/Low; average is an anchor, never a fourth user-facing tier. |
| `.../creator-analysis.json` | `identity`, tier conclusions/mechanisms, publishing, visual language, boundaries | 定位与核心价值 + 三档洞察 + 演化 | Positioning, values, proof modes, cross-tier findings and unknowns remain evidence-linked; no empty architecture or generic mechanism text on any canonical record. |
| `.../dashboard-data.json` `deepDives[12]`, `.../selection.json` `deepSet[12]`, `.../videos/<id>/...` | 12 registered source evidence packages; 9 flagged canonical deep items; 3 historical-but-reachable deep assets | Deep markers + Single Video + evidence drawer | Source registry count is 12 and no package is deleted. Canonical V1 marks exactly 9 within the 21; the remaining 3 expose `canonicalDeep=false` plus a working evidence reference. Representative ID `6a31edc300000000200387f4` passes the three-lens contract. |

Parity gate `PARITY-ZHANG` passes only when all five rows pass, including both the `12 registered` and `9 canonical` assertions.

## 4. 人类最强编导 (`human-director`)

| Source artifact | Canonical fields | Required UI surface | Minimum / cannot lose |
| --- | --- | --- | --- |
| `artifacts/creator-research/human-director/inventory.json` | `corpus.*`, `portfolio.items[]` | 基本盘 + unified List/Gallery | Exactly 19 unique posts; all 19 remain browseable; public interaction values survive where present; missing publish times remain unknown, not zero. |
| `.../tiers-backfill.json` | `tiers[high|base|low]`, selection anchors/rules | High/Base/Low comparison | Exactly 3 user-facing tiers covering all 19 posts with no duplicate IDs; count and min/median/mean/max per tier; rule version and denominator visible. |
| `.../analysis.json`, `.../selection.json` | `portfolio.items[].deepSample`, tier mechanisms, content architecture, evidence state | Deep markers + 三档洞察 | Exactly 8 deep markers among the 19; each has non-empty core content, architecture, mechanism hypothesis, selection reason and evidence href. |
| `.../analysis.json` video `archetype` and visual fields | numeric `contentSystem.formatClusters[]`, visual grammar annotations | 形式组合 + 画面语言 | Every populated archetype maps to a canonical format label; format clusters show count/measured count/median/mean/max rather than a prose-only list. |
| `.../evidence/<id>/{analysis,transcript}.json` and contact sheets; richer `artifacts/director-skill-study/corpus/<id>/run/*` where available | video reconstruction/evidence revisions | Single Video | All 8 deep pages open. Representative ID `6a2fcd940000000007021a9f` passes the three-lens contract. Conflicts between transcript/OCR/frame evidence remain visible. |

Parity gate `PARITY-DIRECTOR` passes only when all five rows pass.

## 5. Canonical parity manifest

Each creator migration emits an immutable manifest:

```json
{
  "creatorId": "zhang-zala",
  "contractVersion": "creator-depth-parity-v1",
  "sources": [{"path": "...", "sha256": "...", "recordCount": 0}],
  "mappings": [{"sourcePointer": "...", "canonicalPointer": "...", "status": "mapped|exception"}],
  "counts": {"corpus": 62, "comparison": 21, "canonicalDeep": 9, "registeredDeep": 12},
  "exceptions": [],
  "gate": {"passed": false, "failedAssertions": []}
}
```

Every `exception` requires `reason`, `sourceEvidenceRef`, `impact`, and `ownerAction`. A parity manifest with an unexplained populated-source omission fails.

## 6. UI and test acceptance

The automated suite must assert:

1. the creator-specific counts above at source, canonical and projection layers;
2. uniqueness and identity equality between List and Gallery;
3. all required canonical fields contain substantive, non-placeholder values;
4. all evidence references resolve;
5. deep markers open the expected single-video route;
6. each representative video passes all independent three-lens assertions or visibly reports why a lens is partial;
7. source-to-canonical mappings have no unexplained omissions.

The current executable entry is `npx vitest run src/server/creator-depth-parity.test.ts`; implementation is incomplete until it also validates the parity manifest and all three independent lens gates described above.

`depth-parity-matrix.md` is a short historical checklist. Where it conflicts with this document, this contract governs.
