# V3 deterministic validation

- Candidate SHA-256: `3b555f95996551283c90bfe42390377ae356ea16b6f7a8117f19cc34944596c1`
- Wireframe SHA-256: `6247a1bf0a8f2819d65a9e1eb4c95b49efdebb1404a710def07c6e19377b6a4e`
- Speech timing proxy: macOS `Tingting`, `190 words/min`, eight independent AIFF files; duration read with `ffprobe`.
- Segment durations: `4.957 / 7.988 / 6.246 / 4.725 / 6.293 / 6.049 / 9.195 / 5.700s`.
- Pure voice total: `51.154s`.
- With seven `0.35s` gaps, `0.5s` opening hold, `1.0s` closing hold: `55.104s`.
- A/B local opening proxy duration: `5.039s`, within the `0–5.5s` opening package.
- Browser-computed V3 sizes at 360×640: source `12px`; body/subtitle/person placeholder `16px`; primary card `24px`.
- Render outputs: four PNG files, each exactly `360×640`.
- Stale-claim scan: no `重新说了八次`, no `3 小时 / 0`, no `为了证明自己`, no `收藏下一条`.

These checks validate timing arithmetic and static layout constraints only. They do not replace a natural human read, real-footage transition review, consent, redaction, rights clearance, or human publishing approval.
