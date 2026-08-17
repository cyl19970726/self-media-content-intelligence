# Deep Content Director release manifest

Release date: 2026-08-16  
Skill path: `/Users/hhh0x/.codex/skills/deep-content-director`

## Verification

- `quick_validate.py`: PASS
- validator/builder/package suite: 118 PASS
- static review V4: READY, 0 blockers
- trigger isolation test: 40/40, FP 0, FN 0
- three forward structural tests: completionReady=true
- three final independent semantic reviews: G0–G7 PASS, READY
- package contains no `__pycache__` or `.pyc`

## Core file SHA-256

```text
057184bf4974d534d4aa75d96c4a0657a0244beb88238161a5994a12a009c913  SKILL.md
4970a22d29a2828c610d0de5625189e2dee3f8dff7a120acb2bcff7394297d42  agents/openai.yaml
b2d40bc1946ae40d781ae77269d0167f1f397689c57d93a4601c4a48932ab7d2  references/directing-brief.schema.json
eeb03e72b482e9fa24e334bda4907a1d2ce49839a6f0812440437bdf40b5a620  references/directing-closures.md
f110ba41b5bb60e68e59afc2eea3c5f6f6ca3c45955a955c96c885c0955c5637  references/evaluation.md
c09bf1b4dd6319f8a1ccd81ecb62397b27396f657b7b102c37d50bba802ff3f9  references/evidence-and-causality.md
20b59fb132010f69db5b1f1712e4c98e467315e3d08d6464a372cf0c9248dbaa  references/observation-loop.md
41ddf2c00365273ba72eb31509c1598080cd83357fb8bbadf6ed343ae9921615  references/output-schema.md
a9c25f641262d1f8fefb11829646f5d67d68379092291c740304712ad3afeb1f  references/semantic-review.md
93fc9ee7d4da927b3cdf9f05386731ad3fd4d83c65cf0726996d78d7651f7bd0  references/v0-traceability.md
d57609c3ec061bdefc7aea60fa152622bcc7d25436d1954ef0be6e08284fd867  references/xhs-publishing.md
e10cafac1294a0ca0ce412eae37c5670a7a354ea2a1e1a1e837c103a864e6934  scripts/build_directing_brief.py
0cf3b438d5834eb9dccee3f2971c23146f15f18fb79b011b353ab191d5ceaca3  scripts/test_validator.py
2d7efb6c3c81d796ecf9fe68a36af207c4afd05bb1cb9f20e3e9331f08dc5eb5  scripts/validate_directing_output.py
```
