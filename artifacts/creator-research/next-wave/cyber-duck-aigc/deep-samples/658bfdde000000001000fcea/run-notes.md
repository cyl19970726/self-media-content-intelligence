# Reconstruction run notes

## Scope and isolation

- Sample: `658bfdde000000001000fcea`
- Source: `source/video.mp4`
- Source SHA-256: `03100b82366cd9dcfe52d01ed99e5871a0253b13610a9d66f43a423cb901d020`
- Media: 35.067 seconds, 1280×720, H.264 video, AAC stereo audio
- Allowed contextual inputs: this sample's `detail/detail-observation.json`, `source/source-observation.json`, subtitle status, and newly derived evidence from the source video
- Isolation rule followed: no reconstruction/evaluation/report from the high-performing sample or any other prior report was read or used as answer material
- No external web facts were used to validate product claims

## Two-pass execution

### Pass 1 — probe

1. Confirmed official page subtitles were unavailable in the captured page state.
2. Generated a machine transcript with OpenAI Whisper turbo (`zh`, word timestamps enabled), preserving the raw SRT cues.
3. Built the canonical evidence pack:
   - 6 technical scene-detection shots
   - 21 transcript cues
   - 25 dense probe frames at 1.5-second spacing
   - cue ↔ representative frame ↔ all overlapping shots mapping
4. Inspected the full timeline and identified 10 carriers, 8 meaning changes, 8 relationship hypotheses, 8 omission risks, and 9 critical questions.
5. Separately classified the full audio in four gap-free windows. Music was proposed in all windows; the mixed-track classifier cannot isolate or identify sources.

### Pass 2 — dynamic capture protocol

The protocol was derived from this video's actual evidence structure. It focused on:

- Google AI Studio/API key identity and disclaimer;
- Vercel account and Git provider handoff;
- repository state, pre-deployment demo insertion, README Deploy entry, and location caveat;
- Vercel environment variable before/during/after states;
- deployment success wording and Gemini Pro Chat identity;
- GPT-4/free claims versus visible product evidence;
- transcript/burned-caption conflicts;
- CTA/access responsibility;
- full-timeline negative evidence;
- non-speech audio.

Capture results:

- 10 protocol actions
- 267 targeted frames
- 267/267 OCR frames processed
- 1,178 OCR line proposals, 0 OCR failures
- 15 original-resolution key frames
- 15/15 original-resolution OCR frames processed
- 264 high-resolution OCR line proposals, 0 OCR failures

## Material findings that required resampling

1. The opening cover itself already shows a Vercel success page behind the title.
2. Google AI Studio page text includes:
   - Google Cloud project/service-terms language;
   - Gemini API public-preview status;
   - not supported for production applications.
3. Before the README Deploy entry is shown, the edit inserts a working `Gemini Pro Chat` page with `Based on GeminiPro API` and a Google-trained self-description. Therefore screen chronology is not a continuous deployment record.
4. The README contains a visible `API 使用不支持用户位置` solution mentioning `palm-proxy` and a Vercel domain. This materially limits the opening “不要魔法” framing.
5. The Vercel environment-variable Key field visibly reads `EXAMPLE_NAME`, so the real key name is not established.
6. The success page says the deployed result is `Gemini Pro Chat`; no visible GPT-4 model-selection or backend proof appears.
7. The final examples are generated text about Lu Xun/Zhou Shuren and GPT/GEMINI; they show a text UI result, not GPT-4 provenance or answer correctness.

## Transcript conflict ledger

- `CUE-012`: raw ASR `三角形使用Vercel部署`; frames support “scroll to the triangle/Deploy area” plus README `使用 Vercel 部署（推荐）`; exact spoken sentence remains uncertain.
- `CUE-014`: raw ASR `把刚才谷歌的API捡贴进去`; high-resolution burned caption supports `把刚才谷歌的API键贴进去`; actual paste action and real variable key remain unknown.
- `CUE-020`: raw ASR `我是塞伯亚Candy老师`; high-resolution burned caption supports `我是赛博鸭Candy老师`.
- `CUE-021`: raw ASR `在AI星级中一路为您银行`; high-resolution burned caption supports `在AI星际中一路为您引航`.

Raw cue text remains unchanged in `reconstruction.json.transcript`. Supported readings live only in separate knowledge units and the article.

## Evidence and privacy handling

- The video visibly contains an API-key-like string. The structured reconstruction and article intentionally do not reproduce it.
- OCR text rows matching the API-key-like string were replaced with `[REDACTED_API_KEY_LIKE_STRING]`; the replacement is explicit rather than silent. Raw media and image frames still visibly contain the string because they are source evidence. They must not be copied to a public repository or shared outside the authorized local workspace without image-level redaction.
- No cookie, login token, signed media URL, XHS token, request header, or browser credential was written by this reconstruction.

## Validation

Canonical schema validation passed for:

- `probe.json`
- `capture-protocol.json`
- `reconstruction.json`
- `targeted-evidence/ocr-evidence.json`

Additional consistency checks performed:

- full carrier sweep covers 0.000–35.067 without gaps;
- 21/21 transcript cues preserved;
- 21/21 cue-accountability rows present;
- 8/8 meaning changes captured;
- 8/8 probe relationships evidenced;
- 10/10 available carriers inspected;
- 20/20 core knowledge units cite evidence;
- no relation self-edge;
- no unchecked channel in the reconstruction meta-gate.

Per task boundary, this run does **not** create an independent `evaluation.json`, deterministic `gate-report.json`, or claim downstream readiness. Independent evaluation is a separate reviewer task.

## Explicit limitations

- Official subtitles were unavailable; Whisper output contains consequential errors.
- A frame sequence cannot prove hidden clicks, authorizations, network calls, builds, retries, model routing, or billing.
- The exact repository owner/name, commit, project URL, real environment-variable key, deployment account, and backend model are not established.
- The README's location workaround is only partly legible; exact proxy instructions remain unknown.
- “free”, “GPT-4”, “one minute”, “no magic”, public access, answer correctness, product currency, and long-term availability are not externally verified.
- Audio classification is machine-proposed on a mixed track and cannot identify song, licensing, or exact sound effects.
- Technical scene-detection shots are not semantic scene or edit counts.
