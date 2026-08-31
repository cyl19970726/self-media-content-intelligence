# Initiative Maturity Inventory

Status: **Canonical initiative classification**

Last audited: **2026-08-30**

Implementation maturity describes shipped behavior, lifecycle describes whether
work remains active, and verification describes the strongest evidence currently
available. A design document is never implementation proof by itself.

| Initiative | Implementation maturity | Lifecycle | Verification level | Canonical destination |
| --- | --- | --- | --- | --- |
| Creator Batch Pipeline V2 | Partial implementation; batch control plane, fixed 1–20 manual entry, five capability pools and workbench exist; RedFox incremental checkpoint, distributed failure closure and paid rollout remain | Active | Targeted gate 27/27; full repository gate 54 files/235 tests; isolated desktop/mobile browser passed without RedFox calls; paid live-unverified and requires 2 approved creators plus checkpoint before up to 20 | [Active record](initiatives/active/creator-batch-pipeline-v2/README.md) |
| Content Knowledge System V1 | Partial; the single-post research → revisioned Knowledge → creation → practice loop is operational, while production creator/comparison compilation remains | Active | Full repository gate plus desktop/390 px/empty/error browser evidence; 12/13 task groups checked | [Active record](initiatives/active/content-knowledge-system-v1/requirements.md) |
| Creator Analysis OS V1 | Partial product implementation; normative research and UI contracts remain active, six task groups unresolved | Active | Automated projections/gates plus recorded depth-parity evidence; 38/44 tasks checked | [Active record](initiatives/active/creator-analysis-os-v1/README.md) |
| Human Director Skill Study | Research study completed; productization remains governed separately | Completed | 19/19 reconstructions, 14 observation samples, five blind holdouts, static review and three forward tests | [Completed record](initiatives/completed/human-director-director-skill/study-plan.md) |
| Creation and Publishing V1 | Implemented for the declared platform matrix and guarded publication flow | Completed | 7/7 tasks, domain/API/adapter tests, compiled Worker/API smoke | [Completed record](initiatives/completed/creation-publishing-v1/requirements.md) |
| Creator Provider Adapters | Implemented for Ego Browser/RedFox routing and bounded discovery | Completed | 8/8 tasks, adapter tests, historical real-integration handoff | [Completed record](initiatives/completed/creator-provider-adapters/requirements.md) |
| Creator Research Architecture | Implemented durable jobs, artifact policy, bounded reconstruction, and projections | Completed | 7/7 tasks and automated service/adapter/projection tests | [Completed record](initiatives/completed/creator-research-architecture/requirements.md) |
| Creator Video Concurrency | Implemented bounded video lanes and idempotent aggregation | Completed | 11/11 tasks and reordered-completion/concurrency tests | [Completed record](initiatives/completed/creator-video-concurrency/requirements.md) |
| Repository Architecture and Governance | Package boundaries, documentation convergence and external Evidence separation implemented | Completed | PR/main CI, repository policy, dependency checks, external Evidence parity and recovery records | [GitHub Issue #13](https://github.com/cyl19970726/self-media-content-intelligence/issues/13) |

## Promotion and supersession

- Current product behavior is promoted to [Signal Room Current Product](product/current-product.md).
- Current repository topology is promoted to [Package Boundaries](architecture/package-boundaries.md).
- Completed implementation plans are frozen under `initiatives/completed`.
- The old `specs/` navigation and old `src/modules`/`src/platform` topology are
  superseded. Historical ADR reasoning remains preserved, with a pointer to the
  current topology where needed.
- Unchecked items remain only in active records or the GitHub tracking issue; a
  completed directory is not used as a hidden backlog.
