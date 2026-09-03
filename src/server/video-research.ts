import fs from "node:fs";
import path from "node:path";
import { artifactPath } from "../../packages/adapters/index.js";
import {
  runtimeThreeLensEvaluationSchema,
  runtimeThreeLensGateReportSchema,
  type CreatorResearchService,
  type RuntimeThreeLensEvaluation,
  type RuntimeThreeLensGateReport
} from "../../packages/research/index.js";
import { videoResearchSchema, type VideoResearch } from "../shared/video-research.js";
import { loadVideoEvidence } from "./console.js";
import { loadLegacyDeepVideo } from "./legacy-deep-videos.js";
import { loadNextWaveDeepVideo } from "./next-wave-deep-videos.js";
import { projectPostSourceFacts } from "./post-source-facts.js";

function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown, fallback = ""): string { return typeof value === "string" ? value : fallback; }
function number(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function list(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function strings(value: unknown): string[] { return list(value).filter((item): item is string => typeof item === "string"); }
function uniqueText(values: Array<string | null | undefined>, limit: number): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].slice(0, limit);
}

function hasReadableOcr(rootPath: string): boolean {
  const ocrPath = path.join(rootPath, "targeted-evidence", "ocr-evidence.json");
  if (!fs.existsSync(ocrPath)) return false;
  const ocr = record(JSON.parse(fs.readFileSync(ocrPath, "utf8")) as unknown);
  return list(ocr.frames).some((raw) => list(record(raw).lines).some((line) => text(record(line).text).trim().length > 0));
}

function hasSemanticAudio(value: string | null): boolean {
  return Boolean(value && !/(未知|没有可读语义|未获得语义|不可判断|无法确认)/u.test(value));
}

type LensKey = keyof RuntimeThreeLensEvaluation["lenses"];

export function projectPostQualityStates(state: string, hasEvaluation: boolean) {
  const buildState = ["built_unevaluated", "evaluated_with_findings", "verified", "ready"].includes(state)
    ? "built" as const : state === "blocked" ? "blocked" as const : state === "not_ready" ? "failed" as const : "missing" as const;
  const evaluationState = ["verified", "ready"].includes(state) && hasEvaluation ? "verified" as const
    : state === "evaluated_with_findings" ? "findings" as const
      : ["verified", "ready"].includes(state) ? "failed" as const : hasEvaluation ? "failed" as const : "skipped" as const;
  const promotionState = evaluationState === "verified" ? "wiki_eligible" as const
    : buildState === "built" ? "provisional" as const : "ineligible" as const;
  return { buildState, evaluationState, promotionState };
}

function projectLens(
  evaluation: RuntimeThreeLensEvaluation,
  report: RuntimeThreeLensGateReport,
  key: LensKey,
  uncheckedChannels: string[]
) {
  const lens = evaluation.lenses[key];
  const passed = lens.rules.filter((rule) => rule.status === "pass");
  const failedGateIds = lens.rules.filter((rule) => rule.status !== "pass").map((rule) => rule.ruleId);
  const evidenceRefs = [...new Set(lens.rules.flatMap((rule) => rule.evidenceRefs.map((reference) => reference.refId)))];
  const state = failedGateIds.length === 0 ? "ready" as const : passed.length > 0 ? "partial" as const : "missing" as const;
  return {
    state, covered: passed.length, total: lens.rules.length, evidenceRefs, conflicts: [], uncheckedChannels,
    failedGateIds,
    note: report.ready ? "该镜头的独立评估规则已全部通过。" : `${failedGateIds.length} 条独立评估规则仍有 findings 或未检查。`,
    evaluator: { id: lens.evaluator.evaluatorId, version: lens.evaluator.evaluatorVersion, checkedAt: lens.evaluator.evaluatedAt },
    rules: lens.rules.map((rule) => ({ id: rule.ruleId, pass: rule.status === "pass", note: rule.finding,
      evidenceRefs: rule.evidenceRefs.map((reference) => reference.refId), failedReason: rule.status === "pass" ? null : rule.evaluatorNotes }))
  };
}

function safeThreeLens(batchItem: { threeLensEvaluationArtifactRef: string | null; threeLensGateReportArtifactRef: string | null }) {
  if (!batchItem.threeLensEvaluationArtifactRef || !batchItem.threeLensGateReportArtifactRef) return null;
  try {
    const evaluation = runtimeThreeLensEvaluationSchema.parse(readJson(batchItem.threeLensEvaluationArtifactRef));
    const report = runtimeThreeLensGateReportSchema.parse(readJson(batchItem.threeLensGateReportArtifactRef));
    if (evaluation.postExternalId !== report.postExternalId || evaluation.candidateRevision.fingerprint !== report.candidateRevision.fingerprint) return null;
    return { evaluation, report };
  } catch { return null; }
}

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
  const sourceMedia = portfolio?.mediaManifest?.items.find((item) => item.externalId === videoId);
  const synthesis = portfolio?.synthesis?.postAnalyses.find((item) => item.postExternalId === videoId);
  const analysis = portfolio?.analysis;
  const reconstruction = record(readJson(batchItem.reconstructionArtifactRef));
  const rootRef = batchItem.reconstructionArtifactRef.replace(/reconstruction\.json$/, "");
  const rootPath = path.dirname(artifactPath(batchItem.reconstructionArtifactRef));
  const articlePath = batchItem.articleArtifactRef ? artifactPath(batchItem.articleArtifactRef) : path.join(rootPath, "article.md");
  const article = fs.existsSync(articlePath) ? fs.readFileSync(articlePath, "utf8") : null;
  const evaluatorReportPath = path.join(rootPath, "evaluation.md");
  const evaluatorReport = fs.existsSync(evaluatorReportPath) ? fs.readFileSync(evaluatorReportPath, "utf8") : null;
  const targetedPath = path.join(rootPath, "targeted-evidence", "targeted-evidence.json");
  const targeted = fs.existsSync(targetedPath) ? record(JSON.parse(fs.readFileSync(targetedPath, "utf8")) as unknown) : {};
  const evidencePackPath = path.join(rootPath, "evidence", "evidence-pack.json");
  const evidencePack = fs.existsSync(evidencePackPath) ? record(JSON.parse(fs.readFileSync(evidencePackPath, "utf8")) as unknown) : {};
  const probePath = path.join(rootPath, "probe.json");
  const probe = fs.existsSync(probePath) ? record(JSON.parse(fs.readFileSync(probePath, "utf8")) as unknown) : {};
  const denseFrames = list(targeted.frames).map((raw) => {
    const frame = record(raw);
    const relative = text(frame.frame);
    return { id: text(frame.id, "FRAME"), time: number(frame.time), src: relative ? `${rootRef}targeted-evidence/${relative}` : "", reason: text(frame.reason) || null };
  }).filter((frame) => frame.src);
  const evidenceFrames = list(evidencePack.frameIndex).map((raw) => {
    const frame = record(raw); const relative = text(frame.frame);
    return { id: text(frame.id, "FRAME"), time: number(frame.time), src: relative ? `${rootRef}evidence/${relative}` : "", reason: text(frame.purpose) || null };
  }).filter((frame) => frame.src);
  const navigationFrames = evidenceFrames.length > 0 ? evidenceFrames : denseFrames;
  const sparseFrames = navigationFrames.filter((_frame, index) => index === 0 || index === navigationFrames.length - 1 || index % Math.max(1, Math.ceil(navigationFrames.length / 12)) === 0);
  const frameLookup = new Map([...evidenceFrames, ...denseFrames].map((frame) => [frame.id, frame]));
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
  const builderLenses = record(reconstruction.builderLenses);
  const builderContent = record(builderLenses.contentRestoration);
  const builderDirecting = record(builderLenses.directingLogic);
  const builderVisual = record(builderLenses.visualEditing);
  const hasBuilderThreeLenses = list(builderContent.blocks).length > 0 && list(builderDirecting.stages).length >= 2 &&
    list(builderVisual.carriers).length > 0 && list(builderVisual.shotSemantics).length > 0;
  const mediaForRefs = (refs: string[]) => refs.flatMap((ref) => {
    const frame = frameLookup.get(ref);
    return frame ? [{ ref, src: frame.src, label: frame.reason ?? ref, time: frame.time, role: "evidence",
      focus: frame.reason ?? ref, proves: "支持相邻内容结论", cannotProve: "单帧不能证明未展示的连续操作或外部结果", crop: null }] : [];
  });
  const contentBlocks = list(builderContent.blocks).map((raw) => {
    const block = record(raw); const timeRange = record(block.timeRange);
    const evidenceRefs = strings(block.evidenceRefs);
    const frameRefs = [...new Set([
      ...strings(block.frameRefs),
      ...(text(block.beforeFrameRef) ? [text(block.beforeFrameRef)] : []),
      ...(text(block.afterFrameRef) ? [text(block.afterFrameRef)] : [])
    ])];
    const visuals = list(block.visuals).map((rawVisual) => record(rawVisual));
    const visualMedia = visuals.flatMap((visual) => {
      const ref = text(visual.ref); const frame = frameLookup.get(ref); const crop = record(visual.crop);
      return frame ? [{ ref, src: frame.src, label: text(visual.focus, frame.reason ?? ref), time: frame.time,
        role: text(visual.role, "evidence"), focus: text(visual.focus, frame.reason ?? ref),
        proves: text(visual.proves, "支持相邻内容结论"), cannotProve: text(visual.cannotProve, "不能替代完整时间序列"),
        crop: number(crop.x) !== null && number(crop.y) !== null && number(crop.width) !== null && number(crop.height) !== null
          ? { x: number(crop.x)!, y: number(crop.y)!, width: number(crop.width)!, height: number(crop.height)! } : null }] : [];
    });
    const visualRefs = new Set(visualMedia.map((item) => item.ref));
    const fallbackMedia = mediaForRefs(frameRefs.filter((ref) => !visualRefs.has(ref))).map((item) => {
      const isBefore = item.ref === text(block.beforeFrameRef);
      const isAfter = item.ref === text(block.afterFrameRef);
      const stateLabel = isBefore ? "变化前" : isAfter ? "变化后" : text(block.title, "画面证据");
      return {
        ...item,
        role: isBefore ? "before" : isAfter ? "after" : "evidence",
        label: stateLabel,
        focus: isBefore || isAfter ? `${stateLabel}的可见界面状态` : text(block.title, item.focus),
        proves: isBefore || isAfter ? `为“${text(block.title)}”提供${stateLabel}状态` : text(block.body, item.proves),
        cannotProve: text(block.boundary, item.cannotProve)
      };
    });
    const steps = list(block.steps).map((rawStep) => {
      const step = record(rawStep);
      const label = text(step.label);
      const description = text(step.description);
      return {
        label,
        description,
        media: mediaForRefs(strings(step.frameRefs)).map((item) => ({
          ...item,
          label,
          focus: description,
          proves: description
        }))
      };
    });
    const combinedMedia = [...visualMedia, ...fallbackMedia];
    const media = text(block.type) === "operation_sequence" && steps.length > 0
      ? visualMedia
      : text(block.type) === "before_after"
        ? combinedMedia.sort((left, right) => {
          const order = (role: string) => role === "before" ? 0 : role === "after" ? 2 : 1;
          return order(left.role) - order(right.role) || (left.time ?? 0) - (right.time ?? 0);
        })
        : combinedMedia;
    return {
      id: text(block.id), type: text(block.type, "text"), title: text(block.title), body: text(block.body),
      start: number(timeRange.start), end: number(timeRange.end), evidenceRefs,
      media,
      steps,
      boundary: text(block.boundary) || null
    };
  });
  const coverage = record(reconstruction.coverageMatrix);
  const coreEvidence = record(coverage.coreEvidence);
  const metaGate = record(reconstruction.metaGate);
  const gate = batchItem.gateReportArtifactRef ? record(readJson(batchItem.gateReportArtifactRef)) : {};
  const threeLens = safeThreeLens(batchItem);
  const allUnknowns = [...strings(coverage.unknowns), ...units.flatMap((unit) => unit.unknowns)];
  const conflicts = units.filter((unit) => /冲突|误识别|不一致/.test(`${unit.title}${unit.statement}`)).map((unit) => unit.statement);
  const contentReady = threeLens ? threeLens.evaluation.lenses.contentRestoration.rules.every((rule) => rule.status === "pass") : hasBuilderThreeLenses && metaGate.pass === true;
  const stageRows = list(probe.meaningChanges);
  const directingReady = threeLens ? threeLens.evaluation.lenses.directingLogic.rules.every((rule) => rule.status === "pass")
    : hasBuilderThreeLenses && list(builderDirecting.stages).length >= 2;
  const visualReady = threeLens ? threeLens.evaluation.lenses.visualEditing.rules.every((rule) => rule.status === "pass") : hasBuilderThreeLenses;
  const projectionGateFailures = [...new Set([
    ...(threeLens ? [] : strings(gate.failedGateIds)),
    ...(directingReady ? [] : ["directing_logic_projection_incomplete"]),
    ...(visualReady ? [] : ["visual_editing_projection_incomplete"]),
    ...(threeLens?.report.failedGateIds ?? []),
    ...(threeLens?.report.uncheckedGateIds ?? [])
  ])];
  const qualityStates = projectPostQualityStates(batchItem.state, Boolean(threeLens));
  const lensFindings = threeLens ? (Object.entries(threeLens.evaluation.lenses) as Array<[LensKey, RuntimeThreeLensEvaluation["lenses"][LensKey]]>)
    .flatMap(([key, lens]) => lens.rules.filter((rule) => rule.status !== "pass").map((rule) => ({
      id: rule.ruleId,
      source: key === "contentRestoration" ? "content_restoration" as const : key === "directingLogic" ? "directing_logic" as const : "visual_editing" as const,
      message: `${rule.finding} ${rule.evaluatorNotes}`.trim(),
      evidenceRefs: rule.evidenceRefs.map((reference) => reference.refId)
    }))) : [];
  const genericFindings = strings(batchItem.failedGateIds).filter((id) => !lensFindings.some((finding) => finding.id === id)).map((id) => ({
    id, source: "generic_evaluator" as const, message: id, evidenceRefs: [] as string[]
  }));
  const anchorIds = new Set([...cues.map((cue) => cue.id), ...denseFrames.map((frame) => frame.id), ...units.map((unit) => unit.id)]);
  const referencedEvidence = threeLens ? Object.values(threeLens.evaluation.lenses).flatMap((lens) => lens.rules.flatMap((rule) => rule.evidenceRefs)) : [];
  const evidenceIndex = [...new Map<string, VideoResearch["evidenceIndex"][number]>([
    ...cues.map((cue) => [cue.id, { id: cue.id, kind: "subtitle_cue", label: cue.text.slice(0, 80), anchorId: cue.id, artifactRef: null }] as const),
    ...denseFrames.map((frame) => [frame.id, { id: frame.id, kind: "frame", label: frame.reason ?? frame.id, anchorId: frame.id, artifactRef: frame.src }] as const),
    ...units.map((unit) => [unit.id, { id: unit.id, kind: "claim", label: unit.title, anchorId: unit.id, artifactRef: batchItem.reconstructionArtifactRef }] as const),
    ...referencedEvidence.map((reference) => [reference.refId, { id: reference.refId, kind: reference.kind, label: reference.refId,
      anchorId: anchorIds.has(reference.refId) ? reference.refId : null, artifactRef: reference.artifactRef }] as const)
  ]).values()];
  const selectionRecord = record(selection);
  const sourceFacts = projectPostSourceFacts({
    sourceUrl: detail?.finalUrl ?? selection?.url ?? run.profileUrl,
    capturedAt: detail?.inspectedAt ?? run.lastSnapshotAt,
    title: detail?.title ?? selection?.title ?? synthesis?.title ?? null,
    caption: detail?.description ?? selection?.visibleText ?? null,
    coverHref: sourceMedia?.coverArtifactRef ?? null,
    mediaType: detail?.mediaType ?? selection?.mediaType ?? "unknown",
    imageCount: detail?.imageCount ?? sourceMedia?.imageArtifactRefs?.length ?? 0,
    publishedLabel: detail?.publishedLabel ?? (text(selectionRecord.publishedLabel) || null),
    likes: selection?.likes ?? null,
    collections: number(selectionRecord.collections), comments: number(selectionRecord.comments), shares: number(selectionRecord.shares),
    sourceRefs: [run.inventoryArtifactRef, run.detailArtifactRef, run.mediaManifestArtifactRef]
  });
  const thesis = text(builderContent.summary, text(viewerChange.after, synthesis?.contentRole ?? text(reconstruction.scopeStatement, "内容已完成证据化重建。")));
  const stageLabels = list(builderDirecting.stages).map((raw) => text(record(raw).label)).filter(Boolean);
  const limitations = uniqueText([
    ...strings(record(builderDirecting.loadAndPayoff).comprehensionCosts),
    ...list(builderVisual.missingBridges).map((raw) => text(record(raw).statement)),
    ...allUnknowns
  ], 4);
  const positiveEnding = text(builderDirecting.endingResolution);
  const strengths = uniqueText([
    text(builderDirecting.promise), text(builderDirecting.payoff),
    ...list(builderVisual.claims).map((raw) => text(record(raw).statement)),
    /(?:没有|未|不能|未知|缺少)/.test(positiveEnding) ? "" : positiveEnding
  ], 3);
  const representativeMedia = contentBlocks.flatMap((block) => block.media).find((item) => item.src) ?? sparseFrames[0] ?? null;
  const productState = !contentReady || !directingReady || !visualReady || qualityStates.evaluationState !== "verified" ? "provisional" as const
    : sourceFacts.availability.overall === "available" && selection?.likes != null ? "gold" as const : "analysis_ready" as const;
  return videoResearchSchema.parse({
    schemaVersion: "1.0.0", id: videoId, creatorId: run.creatorId ?? creatorId, creatorName: run.creatorName ?? "待识别博主",
    title: detail?.title ?? selection?.title ?? synthesis?.title ?? "标题未识别", sourceHref: detail?.finalUrl ?? selection?.url ?? run.profileUrl,
    sourceLabel: `video-content-reconstruction · ${batchItem.state}`,
    sourceFacts,
    thesis,
    contentUnknowns: strings(builderContent.unknowns),
    readerSummary: {
      productState,
      statusLabel: productState === "gold" ? "单帖 Gold" : productState === "analysis_ready" ? "分析完成 · 原帖资料待补" : "分析尚未闭环",
      verdict: thesis,
      strengths,
      limitations,
      reusableStructure: stageLabels,
      representativeFrame: representativeMedia ? {
        src: representativeMedia.src,
        label: "focus" in representativeMedia ? representativeMedia.focus : representativeMedia.reason ?? "视频代表画面",
        time: representativeMedia.time
      } : null
    },
    article, contentBlocks,
    reports: { builder: article, evaluator: evaluatorReport },
    quality: { ...qualityStates, aggregateState: batchItem.state, findings: [...lensFindings, ...genericFindings],
      lineage: { reconstructionArtifactRef: batchItem.reconstructionArtifactRef,
        builderReportArtifactRef: article ? `${rootRef}article.md` : null,
        builderValidationArtifactRef: batchItem.builderValidationArtifactRef ?? null,
        evaluationArtifactRef: batchItem.evaluationArtifactRef,
        evaluatorReportArtifactRef: evaluatorReport ? `${rootRef}evaluation.md` : null,
        gateReportArtifactRef: batchItem.gateReportArtifactRef,
        threeLensEvaluationArtifactRef: batchItem.threeLensEvaluationArtifactRef, threeLensGateReportArtifactRef: batchItem.threeLensGateReportArtifactRef,
        candidateRevisionFingerprint: threeLens?.evaluation.candidateRevision.fingerprint ?? null } },
    evidenceIndex,
    engagement: { likes: selection?.likes ?? null, collections: number(selectionRecord.collections), comments: number(selectionRecord.comments), shares: number(selectionRecord.shares) },
    evidenceHealth: { state: qualityStates.promotionState === "wiki_eligible" ? "ready" : qualityStates.buildState === "built" ? "partial" : "missing", transcript: cues.length > 0, frames: denseFrames.length > 0,
      ocr: hasReadableOcr(rootPath), audio: hasSemanticAudio(text(builderVisual.audioRole) || null),
      baseline: selection?.likes != null, note: text(reconstruction.scopeStatement, batchItem.message) },
    knowledgeUnits: units, relations, transcript: cues, frames: { sparse: sparseFrames, dense: denseFrames },
    directingLogic: { viewerBefore: text(builderDirecting.viewerBefore, text(viewerChange.before)) || null, viewerAfter: text(builderDirecting.viewerAfter, text(viewerChange.after)) || null,
      activatedQuestion: text(builderDirecting.activatedQuestion) || null, promise: text(builderDirecting.promise) || null,
      payoff: text(builderDirecting.payoff) || null, endingResolution: text(builderDirecting.endingResolution) || null,
      stages: (hasBuilderThreeLenses ? list(builderDirecting.stages) : list(probe.meaningChanges)).map((raw) => { const stage = record(raw); const range = record(stage.timeRange ?? stage.range); return {
        label: text(stage.description, text(stage.id)), start: number(range.start), end: number(range.end), viewerQuestion: null,
        function: text(stage.function, text(stage.description)), proof: text(stage.proof, text(stage.trigger)) || null,
        cognitiveChange: text(stage.cognitiveChange, text(stage.description)) || null,
        comprehensionLoad: text(stage.comprehensionLoad) || null, payoff: text(stage.payoff) || null,
        evidenceRefs: strings(stage.evidenceRefs).length ? strings(stage.evidenceRefs) : strings(stage.evidenceHints),
        ...(hasBuilderThreeLenses ? { label: text(stage.label), viewerQuestion: text(stage.viewerQuestion) || null } : {})
      }; }),
      informationDesign: list(builderDirecting.informationDesign).map((raw) => { const item = record(raw); const range = record(item.timeRange); return {
        kind: text(item.kind), statement: text(item.statement), start: number(range.start), end: number(range.end), evidenceRefs: strings(item.evidenceRefs)
      }; }),
      proofDesign: list(builderDirecting.proofDesign).map((raw) => { const item = record(raw); const range = record(item.timeRange); return {
        proofType: text(item.proofType), statement: text(item.statement), boundary: text(item.boundary), start: number(range.start), end: number(range.end), evidenceRefs: strings(item.evidenceRefs)
      }; }),
      loadAndPayoff: { compression: text(record(builderDirecting.loadAndPayoff).compression, "尚未分析"),
        repetition: text(record(builderDirecting.loadAndPayoff).repetition, "尚未分析"),
        payoffDistance: text(record(builderDirecting.loadAndPayoff).payoffDistance, "尚未分析"),
        comprehensionCosts: strings(record(builderDirecting.loadAndPayoff).comprehensionCosts) },
      notes: hasBuilderThreeLenses ? strings(builderDirecting.notes) : strings(viewerChange.intendedChanges) },
    visualEditing: { orientation: text(builderVisual.orientation) || null, composition: text(builderVisual.composition) || null,
      shotCount: number(builderVisual.shotCount), cutsPerMinute: number(builderVisual.cutsPerMinute), resultFirstAt: number(builderVisual.resultFirstAt),
      shotMetricBasis: text(builderVisual.shotMetricBasis) || (hasBuilderThreeLenses
        ? "Builder 依据证据包技术分段估算变化密度；不等同经逐切点核实的真实剪辑数。" : null),
      analyzedDuration: number(builderVisual.analyzedDuration),
      carriers: list(builderVisual.carriers).map((raw) => { const carrier = record(raw); const range = record(carrier.timeRange); return {
        name: text(carrier.name), roles: strings(carrier.roles), start: number(range.start), end: number(range.end)
      }; }),
      claims: list(builderVisual.claims).map((raw) => { const claim = record(raw); const range = record(claim.timeRange); return {
        statement: text(claim.statement), function: text(claim.function), start: number(range.start), end: number(range.end), evidenceRefs: strings(claim.evidenceRefs)
      }; }),
      shotSemantics: list(builderVisual.shotSemantics).map((raw) => { const shot = record(raw); const range = record(shot.timeRange); return {
        start: number(range.start), end: number(range.end), role: text(shot.role), carrier: text(shot.carrier), meaningChange: text(shot.meaningChange), evidenceRefs: strings(shot.evidenceRefs)
      }; }),
      uiProcedureStates: list(builderVisual.uiProcedureStates).map((raw) => { const state = record(raw); const range = record(state.timeRange); return {
        label: text(state.label), before: text(state.before), during: text(state.during), after: text(state.after), input: text(state.input) || null,
        parameters: strings(state.parameters), output: text(state.output) || null, continuity: text(state.continuity),
        start: number(range.start), end: number(range.end), evidenceRefs: strings(state.evidenceRefs)
      }; }),
      transitions: list(builderVisual.transitions).map((raw) => { const transition = record(raw); const range = record(transition.timeRange); return {
        from: text(transition.from), to: text(transition.to), mechanism: text(transition.mechanism), function: text(transition.function),
        start: number(range.start), end: number(range.end), evidenceRefs: strings(transition.evidenceRefs)
      }; }),
      rhythm: list(builderVisual.rhythm).map((raw) => { const rhythm = record(raw); const range = record(rhythm.timeRange); return {
        pace: text(rhythm.pace), density: text(rhythm.density), function: text(rhythm.function),
        start: number(range.start), end: number(range.end), evidenceRefs: strings(rhythm.evidenceRefs)
      }; }),
      missingBridges: list(builderVisual.missingBridges).map((raw) => { const bridge = record(raw); const range = record(bridge.timeRange); return {
        statement: text(bridge.statement), impact: text(bridge.impact), start: number(range.start), end: number(range.end), evidenceRefs: strings(bridge.evidenceRefs)
      }; }),
      audioRole: text(builderVisual.audioRole) || null,
      notes: hasBuilderThreeLenses ? strings(builderVisual.notes) : ["V1 产物只保留画面证据，尚未生成 Builder 画面与剪辑镜头。"] },
    performanceContext: { tier: selection?.tier ?? "unknown", creatorMedianLikes: analysis?.likes.median ?? null,
      medianMultiple: selection?.likes != null && analysis?.likes.median ? selection.likes / analysis.likes.median : null, percentileRank: null,
      interpretation: synthesis?.performanceInterpretation ?? "公开表现只按账号内部基线解释。", confounds: [analysis?.interpretationBoundary ?? "公开互动不等于播放、留存、涨粉或成交。"] },
    lensCoverage: threeLens ? {
      contentRestoration: projectLens(threeLens.evaluation, threeLens.report, "contentRestoration", strings(coverage.uncheckedChannels)),
      directingLogic: projectLens(threeLens.evaluation, threeLens.report, "directingLogic", []),
      visualEditingLogic: projectLens(threeLens.evaluation, threeLens.report, "visualEditing", strings(coverage.uncheckedChannels))
    } : {
      contentRestoration: { state: contentReady ? "ready" : "partial", covered: number(coreEvidence.covered) ?? 0, total: number(coreEvidence.total) ?? 0,
        evidenceRefs: contentBlocks.length ? contentBlocks.flatMap((block) => block.evidenceRefs) : units.flatMap((unit) => unit.evidenceRefs),
        conflicts, uncheckedChannels: strings(coverage.uncheckedChannels), failedGateIds: contentReady ? [] : strings(gate.failedGateIds),
        note: hasBuilderThreeLenses ? "Builder 已完成多模态内容还原；尚未独立评估。" : "由 V1 reconstruction 与内容 gate 投影。", evaluator: null, rules: [] },
      directingLogic: { state: directingReady ? "ready" : "partial", covered: hasBuilderThreeLenses ? list(builderDirecting.stages).length : stageRows.length,
        total: hasBuilderThreeLenses ? list(builderDirecting.stages).length : stageRows.length,
        evidenceRefs: hasBuilderThreeLenses ? list(builderDirecting.stages).flatMap((item) => strings(record(item).evidenceRefs)) : units.flatMap((unit) => unit.evidenceRefs).slice(0, 24),
        conflicts: [], uncheckedChannels: [], failedGateIds: directingReady ? [] : ["directing_logic_projection_incomplete"],
        note: hasBuilderThreeLenses ? "Builder 已完成编导逻辑镜头；尚未独立评估。" : "V1 仅从 Probe 恢复认知阶段。", evaluator: null, rules: [] },
      visualEditingLogic: { state: visualReady ? "ready" : "partial", covered: list(builderVisual.shotSemantics).length, total: list(builderVisual.shotSemantics).length,
        evidenceRefs: list(builderVisual.shotSemantics).flatMap((item) => strings(record(item).evidenceRefs)),
        conflicts: [], uncheckedChannels: strings(coverage.uncheckedChannels), failedGateIds: visualReady ? [] : ["visual_editing_projection_incomplete"],
        note: visualReady ? "Builder 已完成画面与剪辑镜头；尚未独立评估。" : "V1 只保留真实帧，未生成结构化画面与剪辑镜头。", evaluator: null, rules: [] }
    },
    coverage: { coreCovered: number(coreEvidence.covered) ?? 0, coreTotal: number(coreEvidence.total) ?? 0,
      uncheckedChannels: strings(coverage.uncheckedChannels) },
    conflicts, unknowns: [...new Set(allUnknowns)],
    gate: { ready: contentReady && directingReady && visualReady, failedGateIds: projectionGateFailures }
  });
}
