# Evaluation protocol

Evaluate the skill on raw videos in fresh contexts. Do not provide existing reports, intended answers, diagnoses, or prior conclusions to reconstruction agents.

## Evaluation topology

Use separate closures:

1. **Ground-truth auditor:** watch the raw video and create critical questions, evidence windows, carriers, meaning changes, and relationships.
2. **Skill runner:** use this skill with raw video/subtitles only.
3. **Baseline runner:** answer a normal “summarize/reconstruct this video” request without this skill.
4. **GATE evaluator:** compare outputs against the independent audit and return count-based metrics.
5. **JUDGE evaluator:** score readability and execution value only after gates.
6. **Meta auditor:** identify a channel, meaning change, or relationship that the protocol and evaluators failed to inspect.

The independent audit must explicitly challenge identity inversion, literal failure/result signatures, opening/closing qualifiers and disclaimers, opening-to-closing semantic relations, UI progress/status, referent relations, edited chronology versus dependency order, scoped negative evidence, consequential carrier conflicts, and technical segmentation versus semantic continuity. These are omission probes, not fixed content categories; mark them not applicable when the raw video supplies no reason to inspect them.

Never let an output prove its own completeness.

## Hard GATE thresholds

- Critical-question recall: answered or correctly unknown critical questions / all critical questions ≥ 0.85.
- Evidence coverage: core knowledge units with valid evidence / all core units ≥ 0.90.
- Unsupported inference: unsupported positive claims / all positive claims ≤ 0.05.
- Timestamp accuracy: correctly localized checked evidence references / all checked references ≥ 0.90.
- Process dependency completeness: covered required dependencies / all audited dependencies ≥ 0.85 when applicable; otherwise independently mark not applicable.
- Unknown discipline: correct unknowns and abstentions / all audited unknown opportunities ≥ 0.90.
- Unchecked channels: zero available carriers left unchecked.
- Meta-gate: pass only when the meta auditor finds no unguarded carrier, meaning change, or relationship.

Count a negative claim as evidenced only when the candidate names a bounded inspected scope and the relevant carriers. Count a generic narration label as correct only when it does not contradict a more specific visible identity. Count an unknown opportunity when access, price, platform, account, region, responsibility/support, execution proof, attribution, or another decision boundary is made material by the video's own promise or omission risk.

Each metric must include numerator, denominator, and examples. No rounded “overall completeness” score.

## JUDGE dimensions

Score 1–5 after hard gates:

- readability;
- knowledge prioritization;
- evidence usefulness;
- execution or decision value;
- compression without loss.

JUDGE scores cannot override a failed GATE.

## Baseline comparison

Use the same raw input and independent audit. Compare skill and baseline using the same metrics. Randomize presentation order when an evaluator sees both. Preserve failures, especially plausible prose that omitted a whole visual channel or invented an unstated dependency.
