import fs from "node:fs";
import path from "node:path";
import { artifactPath } from "../../packages/adapters/index.js";
import type { CreatorResearchService } from "../../packages/research/index.js";
import { videoResearchSchema, type VideoResearch } from "../shared/video-research.js";
import { loadVideoEvidence } from "./console.js";
import { loadLegacyDeepVideo } from "./legacy-deep-videos.js";
import { loadNextWaveDeepVideo } from "./next-wave-deep-videos.js";

function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown, fallback = ""): string { return typeof value === "string" ? value : fallback; }
function number(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function list(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function strings(value: unknown): string[] { return list(value).filter((item): item is string => typeof item === "string"); }

function legacyVideo(creatorId: string, videoId: string): VideoResearch | null {
  const data = loadVideoEvidence(creatorId, videoId);
  if (!data) return null;
  const frames = data.frames.map((frame) => ({ id: frame.id, time: frame.time ? Number.parseFloat(frame.time) || null : null, src: frame.src, reason: null }));
  return videoResearchSchema.parse({
    schemaVersion: "1.0.0", id: data.id, creatorId: data.creatorId,
    creatorName: data.creatorId === "ai-red-witch" ? "AI红发魔女" : data.creatorId === "human-director" ? "人类最强编导" : data.creatorId,
    title: data.title, sourceHref: data.reportHref ?? "#", sourceLabel: `${data.sourceLabel} · legacy adapter`,
    thesis: data.lead, article: data.lead,
    engagement: data.engagement ?? { likes: null, collections: null, comments: null, shares: null },
    evidenceHealth: { state: data.knowledgeUnits.length && data.cues.length ? "partial" : "missing", transcript: data.cues.length > 0,
      frames: frames.length > 0, ocr: false, audio: false, baseline: Boolean(data.engagement), note: "兼容页面只投影已迁移的旧证据字段。" },
    knowledgeUnits: data.knowledgeUnits.map((unit) => ({ ...unit, importance: "unknown", evidenceClass: "system_inference", confidence: "medium",
      start: null, end: null, evidenceRefs: [], unknowns: [] })),
    directingLogic: { viewerBefore: null, viewerAfter: data.lead, activatedQuestion: null, promise: null, payoff: null, endingResolution: null,
      stages: data.architecture ? [{ label: data.architecture, start: null, end: null, viewerQuestion: null, function: data.lead, proof: null, cognitiveChange: null, comprehensionLoad: null, payoff: null, evidenceRefs: [] }] : [], informationDesign: [], notes: ["兼容投影尚未恢复完整编导逻辑。"] },
    visualEditing: { orientation: null, composition: null, shotCount: null, cutsPerMinute: null, resultFirstAt: null, carriers: [], analyzedDuration: null,
      claims: [], shotSemantics: [], audioRole: null, notes: ["兼容投影尚未恢复画面与剪辑分析。"] },
    performanceContext: { tier: "unknown", creatorMedianLikes: null, medianMultiple: null, percentileRank: null, interpretation: "仅有作品公开互动，缺少统一账号基线。", confounds: ["公开互动不等于播放、留存、涨粉或成交。"] },
    relations: [],
    transcript: data.cues.map((cue) => ({ id: cue.id, start: cue.start, end: null, text: cue.text, representativeFrame: cue.frame, overlappingShots: [] })),
    frames: { sparse: frames, dense: frames },
    lensCoverage: {
      contentRestoration: { state: "partial", covered: data.knowledgeUnits.length, total: data.knowledgeUnits.length, evidenceRefs: [], conflicts: [], uncheckedChannels: [], failedGateIds: ["legacy_evidence_projection"], note: "仅迁移了旧知识单元，未通过内容还原硬闸。" },
      directingLogic: { state: "missing", covered: 0, total: 1, evidenceRefs: [], conflicts: [], uncheckedChannels: [], failedGateIds: ["directing_logic_missing"], note: "旧投影未恢复编导逻辑。" },
      visualEditingLogic: { state: "missing", covered: 0, total: 1, evidenceRefs: [], conflicts: [], uncheckedChannels: ["visual", "audio.non_speech"], failedGateIds: ["visual_editing_missing"], note: "旧投影未恢复画面与剪辑逻辑。" }
    }, coverage: { coreCovered: data.knowledgeUnits.length, coreTotal: data.knowledgeUnits.length, uncheckedChannels: [] },
    conflicts: [], unknowns: data.unknowns, gate: { ready: false, failedGateIds: ["legacy_evidence_projection"] }
  });
}

function readJson(reference: string): unknown { return JSON.parse(fs.readFileSync(artifactPath(reference), "utf8")) as unknown; }

export function loadVideoResearch(service: CreatorResearchService, creatorId: string, videoId: string, requestedRunId?: string): VideoResearch | null {
  if (!requestedRunId) {
    const nextWaveDeep = loadNextWaveDeepVideo(creatorId, videoId);
    if (nextWaveDeep) return nextWaveDeep;
    const deepLegacy = loadLegacyDeepVideo(creatorId, videoId);
    if (deepLegacy) return deepLegacy;
  }
  const runs = service.list(100);
  const run = (requestedRunId ? service.get(requestedRunId) : null) ?? service.get(creatorId) ?? runs.find((item) => item.creatorId === creatorId) ?? null;
  if (!run) return legacyVideo(creatorId, videoId);
  const portfolio = service.portfolio(run.id);
  const batchItem = portfolio?.reconstructionBatch?.items.find((item) => item.postExternalId === videoId);
  if (!batchItem?.reconstructionArtifactRef) return legacyVideo(creatorId, videoId);
  const selection = portfolio?.selection?.items.find((item) => item.externalId === videoId);
  const detail = portfolio?.details?.posts.find((item) => item.externalId === videoId);
  const synthesis = portfolio?.synthesis?.postAnalyses.find((item) => item.postExternalId === videoId);
  const analysis = portfolio?.analysis;
  const reconstruction = record(readJson(batchItem.reconstructionArtifactRef));
  const rootRef = batchItem.reconstructionArtifactRef.replace(/reconstruction\.json$/, "");
  const rootPath = path.dirname(artifactPath(batchItem.reconstructionArtifactRef));
  const articlePath = batchItem.articleArtifactRef ? artifactPath(batchItem.articleArtifactRef) : path.join(rootPath, "article.md");
  const article = fs.existsSync(articlePath) ? fs.readFileSync(articlePath, "utf8") : "完整文章尚未生成。";
  const targetedPath = path.join(rootPath, "targeted-evidence", "targeted-evidence.json");
  const targeted = fs.existsSync(targetedPath) ? record(JSON.parse(fs.readFileSync(targetedPath, "utf8")) as unknown) : {};
  const probePath = path.join(rootPath, "probe.json");
  const probe = fs.existsSync(probePath) ? record(JSON.parse(fs.readFileSync(probePath, "utf8")) as unknown) : {};
  const denseFrames = list(targeted.frames).map((raw) => {
    const frame = record(raw);
    const relative = text(frame.frame);
    return { id: text(frame.id, "FRAME"), time: number(frame.time), src: relative ? `${rootRef}targeted-evidence/${relative}` : "", reason: text(frame.reason) || null };
  }).filter((frame) => frame.src);
  const sparseFrames = denseFrames.filter((_frame, index) => index === 0 || index === denseFrames.length - 1 || index % Math.max(1, Math.ceil(denseFrames.length / 12)) === 0);
  const transcript = record(reconstruction.transcript);
  const cues = list(transcript.cues).map((raw) => {
    const cue = record(raw);
    const frame = text(cue.representativeFrame);
    return { id: text(cue.id), start: number(cue.start), end: number(cue.end), text: text(cue.text),
      representativeFrame: frame ? `${rootRef}evidence/${frame}` : null, overlappingShots: strings(cue.overlappingShots) };
  });
  const units = list(reconstruction.knowledgeUnits).map((raw) => {
    const unit = record(raw); const timeRange = record(unit.timeRange);
    const evidenceRefs = list(unit.evidence).map((item) => text(record(item).ref)).filter(Boolean);
    const provenance = text(unit.provenance);
    const evidenceClass = ["raw_fact", "visual_observation", "author_claim", "system_inference", "unknown"].includes(provenance) ? provenance : "unknown";
    return { id: text(unit.id), title: text(unit.title), statement: text(unit.statement), importance: text(unit.importance, "supporting"), evidenceClass,
      confidence: text(unit.confidence, "unknown"), start: number(timeRange.start), end: number(timeRange.end), evidenceRefs, unknowns: strings(unit.unknowns) };
  });
  const relations = list(reconstruction.relations).map((raw) => { const relation = record(raw); return {
    from: text(relation.from), to: text(relation.to), relation: text(relation.relation),
    evidenceRefs: list(relation.evidence).map((item) => text(record(item).ref)).filter(Boolean)
  }; });
  const viewerChange = record(reconstruction.viewerChange);
  const coverage = record(reconstruction.coverageMatrix);
  const coreEvidence = record(coverage.coreEvidence);
  const metaGate = record(reconstruction.metaGate);
  const gate = batchItem.gateReportArtifactRef ? record(readJson(batchItem.gateReportArtifactRef)) : {};
  const allUnknowns = [...strings(coverage.unknowns), ...units.flatMap((unit) => unit.unknowns)];
  const conflicts = units.filter((unit) => /冲突|误识别|不一致/.test(`${unit.title}${unit.statement}`)).map((unit) => unit.statement);
  const contentReady = gate.ready === true && metaGate.pass === true;
  const stageRows = list(probe.meaningChanges);
  const directingReady = contentReady && stageRows.length >= 2 && text(viewerChange.before).length > 0 && text(viewerChange.after).length > 0;
  const visualReady = false;
  const projectionGateFailures = [...new Set([
    ...strings(gate.failedGateIds),
    ...(directingReady ? [] : ["directing_logic_projection_incomplete"]),
    ...(visualReady ? [] : ["visual_editing_projection_incomplete"])
  ])];
  return videoResearchSchema.parse({
    schemaVersion: "1.0.0", id: videoId, creatorId: run.creatorId ?? creatorId, creatorName: run.creatorName ?? "待识别博主",
    title: detail?.title ?? selection?.title ?? synthesis?.title ?? "标题未识别", sourceHref: detail?.finalUrl ?? selection?.url ?? run.profileUrl,
    sourceLabel: `video-content-reconstruction · ${batchItem.state}`,
    thesis: text(viewerChange.after, synthesis?.contentRole ?? text(reconstruction.scopeStatement, "内容已完成证据化重建。")), article,
    engagement: { likes: selection?.likes ?? null, collections: null, comments: null, shares: null },
    evidenceHealth: { state: batchItem.state === "ready" ? "ready" : "partial", transcript: cues.length > 0, frames: denseFrames.length > 0,
      ocr: fs.existsSync(path.join(rootPath, "targeted-evidence", "ocr-evidence.json")), audio: strings(coverage.uncheckedChannels).length === 0,
      baseline: selection?.likes != null, note: text(reconstruction.scopeStatement, batchItem.message) },
    knowledgeUnits: units, relations, transcript: cues, frames: { sparse: sparseFrames, dense: denseFrames },
    directingLogic: { viewerBefore: text(viewerChange.before) || null, viewerAfter: text(viewerChange.after) || null,
      activatedQuestion: null, promise: null, payoff: null, endingResolution: null,
      stages: list(probe.meaningChanges).map((raw) => { const stage = record(raw); const range = record(stage.range); return {
        label: text(stage.description, text(stage.id)), start: number(range.start), end: number(range.end), viewerQuestion: null,
        function: text(stage.description), proof: text(stage.trigger) || null, cognitiveChange: text(stage.description) || null, comprehensionLoad: null, payoff: null, evidenceRefs: strings(stage.evidenceHints)
      }; }), informationDesign: [], notes: strings(viewerChange.intendedChanges) },
    visualEditing: { orientation: null, composition: null, shotCount: null, cutsPerMinute: null, resultFirstAt: null, carriers: [], analyzedDuration: null,
      claims: [], shotSemantics: [], audioRole: null, notes: ["画面、UI、OCR 与音频证据已保留；结构化剪辑指标未进入当前 run 投影。"] },
    performanceContext: { tier: selection?.tier ?? "unknown", creatorMedianLikes: analysis?.likes.median ?? null,
      medianMultiple: selection?.likes != null && analysis?.likes.median ? selection.likes / analysis.likes.median : null, percentileRank: null,
      interpretation: synthesis?.performanceInterpretation ?? "公开表现只按账号内部基线解释。", confounds: [analysis?.interpretationBoundary ?? "公开互动不等于播放、留存、涨粉或成交。"] },
    lensCoverage: {
      contentRestoration: { state: contentReady ? "ready" : "partial", covered: number(coreEvidence.covered) ?? 0, total: number(coreEvidence.total) ?? 0,
        evidenceRefs: units.flatMap((unit) => unit.evidenceRefs), conflicts, uncheckedChannels: strings(coverage.uncheckedChannels), failedGateIds: contentReady ? [] : strings(gate.failedGateIds), note: "由当前 reconstruction 与内容 gate 投影。" },
      directingLogic: { state: directingReady ? "ready" : "partial", covered: stageRows.length, total: stageRows.length, evidenceRefs: units.flatMap((unit) => unit.evidenceRefs).slice(0, 24),
        conflicts: [], uncheckedChannels: [], failedGateIds: directingReady ? [] : ["directing_logic_projection_incomplete"], note: "已恢复认知阶段；仅在内容 gate 与阶段证据同时闭环时通过。" },
      visualEditingLogic: { state: "partial", covered: denseFrames.length, total: denseFrames.length, evidenceRefs: denseFrames.slice(0, 24).map((frame) => frame.id),
        conflicts: [], uncheckedChannels: strings(coverage.uncheckedChannels), failedGateIds: ["visual_editing_projection_incomplete"], note: "真实帧已保留，结构化画面/剪辑评测尚未进入 versioned run。" }
    },
    coverage: { coreCovered: number(coreEvidence.covered) ?? 0, coreTotal: number(coreEvidence.total) ?? 0,
      uncheckedChannels: strings(coverage.uncheckedChannels) },
    conflicts, unknowns: [...new Set(allUnknowns)],
    gate: { ready: contentReady && directingReady && visualReady, failedGateIds: projectionGateFailures }
  });
}
