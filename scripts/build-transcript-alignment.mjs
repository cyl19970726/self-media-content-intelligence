import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const artifactDir = resolve(process.argv[2] || "");
if (!process.argv[2]) throw new Error("Usage: node scripts/build-transcript-alignment.mjs <artifact-dir>");

const parseTime = (value) => {
  const match = value.match(/(\d+):(\d+):(\d+),(\d+)/);
  if (!match) throw new Error(`Invalid SRT timestamp: ${value}`);
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) + Number(match[4]) / 1000;
};

const rawSrt = readFileSync(join(artifactDir, "source.zh-CN.srt"), "utf8");
const analysis = JSON.parse(readFileSync(join(artifactDir, "analysis.json"), "utf8"));
const sourceVideo = join(artifactDir, "source.mp4");
const frameDir = join(artifactDir, "transcript-frames");
mkdirSync(frameDir, { recursive: true });

const rules = [
  { id: "N01", pattern: /\bcodax\b/gi, replacement: "Codex", label: "产品名", confidence: "high" },
  { id: "N02", pattern: /\bcodex\b/gi, replacement: "Codex", label: "英文大小写", confidence: "high" },
  { id: "N03", pattern: /floor的agent/gi, replacement: "Flova Agent", label: "产品名", confidence: "high" },
  { id: "N04", pattern: /flogo agent/gi, replacement: "Flova Agent", label: "产品名", confidence: "high" },
  { id: "N05", pattern: /(?:弗罗瓦|弗洛瓦|floor瓦)/g, replacement: "Flova", label: "产品名", confidence: "high" },
  { id: "N06", pattern: /Flow ai/gi, replacement: "Flova AI", label: "产品名", confidence: "high" },
  { id: "N07", pattern: /age的平台/gi, replacement: "Agent 平台", label: "术语", confidence: "medium" },
  { id: "N08", pattern: /但接近 Codex 之后/g, replacement: "但接入 Codex 之后", label: "同音纠正", confidence: "medium" },
  { id: "N09", pattern: /需要细条的时候/g, replacement: "需要细调的时候", label: "同音纠正", confidence: "medium" },
  { id: "N10", pattern: /Codex 里跑大火/g, replacement: "Codex 里跑大活", label: "同音纠正", confidence: "medium" },
  { id: "N11", pattern: /点儿m d/gi, replacement: ".md", label: "文件扩展名", confidence: "medium" },
  { id: "N12", pattern: /ai原生的视频Agent 平台/gi, replacement: "AI 原生的视频 Agent 平台", label: "英文分词", confidence: "high" }
];

const unresolvedRules = [
  { id: "U01", pattern: /s d二/i, term: "s d二", note: "可能指某个视频模型或版本名；现有公开字幕和冻结证据不足以确认。" }
];

const normalize = (text) => {
  let normalized = text;
  const changes = [];
  for (const rule of rules) {
    const next = normalized.replace(rule.pattern, rule.replacement);
    if (next !== normalized) {
      changes.push({ id: rule.id, label: rule.label, confidence: rule.confidence });
      normalized = next;
    }
  }
  return { normalized, changes };
};

const boundaries = [0, ...analysis.mediaFacts.sceneCuts, analysis.mediaFacts.durationSeconds];
const shotIntervals = boundaries.slice(0, -1).map((start, index) => ({
  id: `SHOT-${String(index + 1).padStart(2, "0")}`,
  start,
  end: boundaries[index + 1]
}));

const blocks = rawSrt.trim().split(/\n\s*\n/);
const cues = blocks.map((block, index) => {
  const lines = block.trim().split("\n");
  const [startRaw, endRaw] = lines[1].split(" --> ");
  const start = parseTime(startRaw);
  const end = parseTime(endRaw);
  const midpoint = (start + end) / 2;
  const rawText = lines.slice(2).join(" ");
  const { normalized, changes } = normalize(rawText);
  const unresolvedTerms = unresolvedRules.filter((rule) => rule.pattern.test(rawText)).map(({ id, term, note }) => ({ id, term, note, status: "needs_human_review" }));
  const segment = analysis.narrativeSegments.find((item) => midpoint >= item.start && midpoint < item.end)
    || analysis.narrativeSegments.at(-1);
  const overlappingShots = shotIntervals.filter((shot) => shot.end > start && shot.start < end);
  const primaryShot = shotIntervals.find((shot) => midpoint >= shot.start && midpoint < shot.end) || overlappingShots[0];
  const cueNumber = String(index + 1).padStart(3, "0");
  const frame = `transcript-frames/cue-${cueNumber}.jpg`;
  execFileSync("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-ss", String(midpoint), "-i", sourceVideo,
    "-frames:v", "1", "-vf", "scale=540:960:force_original_aspect_ratio=decrease", "-q:v", "3", "-y", join(artifactDir, frame)
  ]);
  return {
    id: `CUE-${cueNumber}`,
    officialCueNumber: Number(lines[0]),
    start,
    end,
    duration: Number((end - start).toFixed(3)),
    screenshotTime: Number(midpoint.toFixed(3)),
    rawText,
    normalizedText: normalized,
    normalizationStatus: unresolvedTerms.length ? "needs_human_review" : changes.length ? "normalization_suggestion" : "unchanged",
    normalizationChanges: changes,
    unresolvedTerms,
    segmentId: segment.id,
    segmentTitle: segment.title,
    primaryShotId: primaryShot?.id || null,
    overlappingShotIds: overlappingShots.map((shot) => shot.id),
    frame
  };
});

const output = {
  schemaVersion: "signal-room-transcript-alignment-1.0",
  subjectId: analysis.subjectId,
  source: {
    transcript: "source.zh-CN.srt",
    media: basename(sourceVideo),
    transcriptOrigin: "xiaohongshu official zh-CN subtitle",
    screenshotRule: "one real frame at each cue midpoint",
    normalizationRule: "raw official text is immutable; normalized text is a separate machine-draft suggestion until a named human reviewer confirms it"
  },
  counts: {
    cues: cues.length,
    cuesWithNormalization: cues.filter((cue) => cue.normalizationChanges.length > 0).length,
    cuesNeedingHumanReview: cues.filter((cue) => cue.unresolvedTerms.length > 0).length,
    generatedFrames: cues.length
  },
  normalizationRules: rules.map(({ id, label, confidence, replacement }) => ({ id, label, confidence, replacement })),
  cues
};

writeFileSync(join(artifactDir, "transcript-alignment.json"), `${JSON.stringify(output, null, 2)}\n`);
process.stdout.write(`aligned ${cues.length} cues -> ${join(artifactDir, "transcript-alignment.json")}\n`);
