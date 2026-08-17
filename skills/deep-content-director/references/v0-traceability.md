# V0 traceability

This matrix prevents a documented principle from disappearing between instruction, output contract and review. `S` means structurally machine-checkable; `R` means independent semantic review is still required.

| V0 closure | Output path | S | R |
| --- | --- | --- | --- |
| Account promise and post role | `accountContext`, `accountPlan.identitySystem`, `singlePlan.primaryJob` | required by mode | audience/account truth and fit |
| Primary and guardrail jobs | `singlePlan.primaryJob`, `singlePlan.guardrailJob` | enum/state shape | whether metrics truly match jobs |
| Person, situation and demand evidence | `singlePlan.audience`, `singlePlan.demandEvidence`, global `claims` | references and claim metadata | demand representativeness |
| Topic hypothesis, conditions and counterexample | `singlePlan.contentMechanism` | fields/types | causal plausibility and boundary |
| Click, delivery, follow and action contracts | `singlePlan.contracts` | presence | title/opening/body/ending alignment |
| Cognitive narrative progression | `singlePlan.beats`, `seriesPlan.episodes`, `researchPlan` | IDs/order/format branch | clarity, load and real progression |
| Claim → proof → carrier scope | global `claims`, `assets`, `singlePlan.evidencePlan`, beat/shot refs | source/rights/refs/conditional metadata | source actually supports claim |
| Speech/image/text/audio function | `singlePlan.beats`, `shots` or `panels` | mode/format shape and refs | complementarity, meaning and pacing |
| Shot/panel/edit decisions | `singlePlan.shots` or `panels`, `reviewPlan.editDecisions` | positive duration/order/refs | keep/compress/remove judgment |
| Title, cover, search and CTA | `singlePlan.packaging` | fields and metric availability | Xiaohongshu fit and promise match |
| Rights, privacy, claims and platform | `assets`, `claims`, `safety` | asset/claim-level records and derived blocks | sufficiency/currentness of evidence |
| One-variable publication experiment | mode plan `experiment` | one variable, metric state, window/stop shape | learnability and confounds |
| Layered diagnosis and next revision | `reviewPlan`, mode decision rules | required by review mode | execution vs direction judgment |
| Human/AI responsibility | global `responsibility` | named decisions/contributions/owner | real ownership and fact review |
| Free/paid and partnership boundary | global `commercialBoundary`, `accountPlan.commercialBoundaryDecision` | fields/types | fairness, disclosure and business fit |
| Unknowns and N/A | global `unknowns`, structured state/N/A objects | bounded reason/owner/resolution | whether uncertainty is honest |

Structural validation deliberately cannot approve the rightmost column. A fresh reviewer must use the original request and evidence, not the candidate's self-description.
