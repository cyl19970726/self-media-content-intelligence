import { readReportSource } from "./report-source-revision.js";
import { loadReportOverview } from "./report-overview.js";
import { postSourceFactsSchema } from "../../packages/contracts/index.js";
import { buildPostPerformance, creatorInventorySchema } from "../../packages/research/index.js";
import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { artifactPath } from "../../packages/adapters/index.js";
import {
  runtimeThreeLensEvaluationSchema,
  runtimeThreeLensGateReportSchema,
  type CreatorResearchService,
  type VideoReconstructionBatch,
  type RuntimeThreeLensEvaluation,
  type RuntimeThreeLensGateReport
} from "../../packages/research/index.js";
import { videoResearchSchema, type VideoResearch } from "../shared/video-research.js";
import { projectPostSourceFacts } from "./post-source-facts.js";

function record(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown, fallback = ""): string { return typeof value === "string" ? value : fallback; }
function number(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function list(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function strings(value: unknown): string[] { return list(value).filter((item): item is string => typeof item === "string"); }
function uniqueText(values: Array<string | null | undefined>, limit: number): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))].slice(0, limit);
}

/** Keep the first, source-resolved projection when evaluator refs reuse its ID. */
export function firstEvidenceEntryById<T>(entries: ReadonlyArray<readonly [string, T]>): T[] {
  const byId = new Map<string, T>();
  for (const [id, value] of entries) if (!byId.has(id)) byId.set(id, value);
  return [...byId.values()];
}

function hasReadableOcr(rootPath: string): boolean {
  const ocrPath = path.join(rootPath, "targeted-evidence", "ocr-evidence.json");
  if (!fs.existsSync(ocrPath)) return false;
  const ocr = record(JSON.parse(fs.readFileSync(ocrPath, "utf8")) as unknown);
  return list(ocr.frames).some((raw) => list(record(raw).lines).some((line) => text(record(line).text).trim().length > 0));
}

function ocrEvidenceEntries(rootPath: string, rootRef: string): Array<[string, VideoResearch["evidenceIndex"][number]]> {
  const ocrPath = path.join(rootPath, "targeted-evidence", "ocr-evidence.json");
  if (!fs.existsSync(ocrPath)) return [];
  const ocr = record(JSON.parse(fs.readFileSync(ocrPath, "utf8")) as unknown);
  return list(ocr.frames).flatMap((raw) => {
    const frame = record(raw); const sourceFrame = text(frame.sourceFrame);
    const safeFrame = sourceFrame && !path.isAbsolute(sourceFrame) && !sourceFrame.split(/[\\/]/).includes("..");
    const artifactRef = safeFrame ? `${rootRef}targeted-evidence/${sourceFrame}` : null;
    return list(frame.lines).flatMap((line) => {
      const value = record(line); const id = text(value.id); const content = text(value.text).trim();
      if (!id || !content) return [];
      const entry: [string, VideoResearch["evidenceIndex"][number]] = [id, { id, kind: "ocr", label: content, anchorId: null, artifactRef }];
      return [entry];
    });
  });
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

export function readerStatusLabel(productState: "gold" | "analysis_ready" | "provisional", quality: ReturnType<typeof projectPostQualityStates>, review?: {
  reviewStatus: "completed_no_findings" | "completed_with_findings" | "failed";
  candidateStatus: "original_reviewed" | "revised_unverified" | "review_incomplete";
} | null) {
  if (review?.reviewStatus === "failed" || review?.candidateStatus === "review_incomplete") return "Reviewer 技术失败·待处理";
  if (review?.candidateStatus === "revised_unverified") return "已按意见修订·未再次独立复核";
  if (review?.reviewStatus === "completed_no_findings") return "Reviewer 已完成·无意见";
  if (review?.reviewStatus === "completed_with_findings") return "Reviewer 已完成·有修改意见";
  if (quality.buildState === "built" && quality.evaluationState === "skipped") return "分析已生成 · 尚未独立评估";
  return productState === "gold" ? "单帖 Gold" : productState === "analysis_ready" ? "分析完成 · 原帖资料待补" : "分析尚未闭环";
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

function safeThreeLens(batchItem: { threeLensEvaluationArtifactRef: string | null; threeLensGateReportArtifactRef: string | null }): { evaluation: RuntimeThreeLensEvaluation; report: RuntimeThreeLensGateReport } | { error: string } {
  if (!batchItem.threeLensEvaluationArtifactRef || !batchItem.threeLensGateReportArtifactRef) return { error: "未记录当前三部分评估或门禁文件。" };
  try {
    const evaluation = runtimeThreeLensEvaluationSchema.parse(readJson(batchItem.threeLensEvaluationArtifactRef));
    const report = runtimeThreeLensGateReportSchema.parse(readJson(batchItem.threeLensGateReportArtifactRef));
    if (evaluation.postExternalId !== report.postExternalId || evaluation.candidateRevision.fingerprint !== report.candidateRevision.fingerprint) return { error: "评估与门禁所指作品或报告版本不一致。" };
    return { evaluation, report };
  } catch (error) { return { error: error instanceof Error ? error.message : "评估资料无法读取。" }; }
}

function readJson(reference: string): unknown { return JSON.parse(fs.readFileSync(artifactPath(reference), "utf8")) as unknown; }

function researchOwnerId(run: ReturnType<CreatorResearchService["list"]>[number]): string {
  return run.creatorId ?? run.canonicalSlug ?? `run-${run.id}`;
}

export function loadVideoResearch(service: CreatorResearchService, creatorId: string, videoId: string, requestedRunId?: string): VideoResearch | null {
  return loadVideoResearchSource(service, creatorId, videoId, requestedRunId);
}

/** Read an immutable workflow candidate without promoting it over the current report. */
export function loadWorkflowVideoResearch(service: CreatorResearchService, runId: string, postId: string,
  candidate: { reportArtifactRef: string; reportSha256: string; outcome: Record<string, unknown> }): VideoResearch | null {
  const run = service.get(runId);
  const original = service.portfolio(runId)?.reconstructionBatch?.items.find((item) => item.postExternalId === postId);
  if (!run || !original || !candidate.reportArtifactRef.startsWith(`/artifacts/${runId}/workflow-reconstructions/`)) return null;
  if (createHash("sha256").update(fs.readFileSync(artifactPath(candidate.reportArtifactRef))).digest("hex") !== candidate.reportSha256) {
    throw new Error("CANDIDATE_REVISION_CHANGED");
  }
  const item: VideoReconstructionBatch["items"][number] = { ...original,
    state: "built_unevaluated", reconstructionArtifactRef: candidate.reportArtifactRef,
    articleArtifactRef: typeof candidate.outcome.articleArtifactRef === "string" ? candidate.outcome.articleArtifactRef : null,
    builderValidationArtifactRef: typeof candidate.outcome.builderValidationArtifactRef === "string" ? candidate.outcome.builderValidationArtifactRef : null,
    evaluationArtifactRef: null, gateReportArtifactRef: null, threeLensEvaluationArtifactRef: null,
    threeLensGateReportArtifactRef: null, failedGateIds: [], message: "候选正文已登记；独立复核状态见工作流。",
  };
  return loadVideoResearchSource(service, researchOwnerId(run), postId, runId, item);
}

export function listLatestVideoResearch(service: CreatorResearchService) {
  const latestRuns = new Map<string, ReturnType<CreatorResearchService["list"]>[number]>();
  for (const run of service.list(100)) {
    const ownerId = researchOwnerId(run);
    if (!latestRuns.has(ownerId)) latestRuns.set(ownerId, run);
  }
  return [...latestRuns.values()].flatMap((run) => {
    const ownerId = researchOwnerId(run);
    const batch = service.portfolio(run.id)?.reconstructionBatch?.items ?? [];
    return batch.flatMap((item) => {
      const report = loadVideoResearchSource(service, ownerId, item.postExternalId, run.id);
      if (!report) return [];
      return [{
        creatorId: report.creatorId,
        creatorName: report.creatorName,
        videoId: report.id,
        title: report.title,
        runId: run.id,
        href: `/creators/${encodeURIComponent(report.creatorId)}/videos/${encodeURIComponent(report.id)}?run=${encodeURIComponent(run.id)}`
      }];
    });
  });
}

function loadVideoResearchSource(service: CreatorResearchService, creatorId: string, videoId: string, requestedRunId?: string,
  candidateItem?: VideoReconstructionBatch["items"][number]): VideoResearch | null {
  const run = requestedRunId
    ? service.get(requestedRunId)
    : service.list(100).find((item) => researchOwnerId(item) === creatorId) ?? null;
  if (!run || researchOwnerId(run) !== creatorId) return null;
  const portfolio = service.portfolio(run.id);
  const batchItem = candidateItem ?? portfolio?.reconstructionBatch?.items.find((item) => item.postExternalId === videoId);
  if (!batchItem?.reconstructionArtifactRef) return null;
  const selection = portfolio?.selection?.items.find((item) => item.externalId === videoId);
  const detail = portfolio?.details?.posts.find((item) => item.externalId === videoId);
  const sourceMedia = portfolio?.mediaManifest?.items.find((item) => item.externalId === videoId);
  const synthesis = portfolio?.synthesis?.postAnalyses.find((item) => item.postExternalId === videoId);
  const analysis = portfolio?.analysis;
  let sourceRead: ReturnType<typeof readReportSource>;
  let reconstruction: Record<string, unknown>;
  try {
    sourceRead = readReportSource(artifactPath(batchItem.reconstructionArtifactRef));
    reconstruction = record(JSON.parse(sourceRead.text));
  } catch {
    return null;
  }
  const builderLenses = record(reconstruction.builderLenses);
  const builderContent = record(builderLenses.contentRestoration);
  const builderDirecting = record(builderLenses.directingLogic);
  const builderVisual = record(builderLenses.visualEditing);
  const hasBuilderThreeLenses = reconstruction.schemaVersion === "video-reconstruction-2.0" &&
    list(builderContent.blocks).length > 0 && list(builderDirecting.stages).length > 0 &&
    list(builderVisual.carriers).length > 0 && list(builderVisual.claims).length > 0 &&
    list(builderVisual.shotSemantics).length > 0 && list(builderVisual.rhythm).length > 0;
  if (!hasBuilderThreeLenses) return null;
  const rootRef = batchItem.reconstructionArtifactRef.replace(/reconstruction\.json$/, "");
  const rootPath = path.dirname(artifactPath(batchItem.reconstructionArtifactRef));
  const articlePath = batchItem.articleArtifactRef ? artifactPath(batchItem.articleArtifactRef) : path.join(rootPath, "article.md");
  const article = fs.existsSync(articlePath) ? readReportSource(articlePath).text : null;
  const evaluatorReportPath = path.join(rootPath, "evaluation.md");
  const evaluatorReport = fs.existsSync(evaluatorReportPath) ? fs.readFileSync(evaluatorReportPath, "utf8") : null;
  const targetedPath = path.join(rootPath, "targeted-evidence", "targeted-evidence.json");
  const targeted = fs.existsSync(targetedPath) ? record(JSON.parse(fs.readFileSync(targetedPath, "utf8")) as unknown) : {};
  const evidencePackPath = path.join(rootPath, "evidence", "evidence-pack.json");
  const evidencePack = fs.existsSync(evidencePackPath) ? record(JSON.parse(fs.readFileSync(evidencePackPath, "utf8")) as unknown) : {};
  const probePath = path.join(rootPath, "probe.json");
  const probe = fs.existsSync(probePath) ? record(JSON.parse(fs.readFileSync(probePath, "utf8")) as unknown) : {};
  const supplementalFrames = ["hires-manifest.json", "highres-manifest.json"].flatMap(name => {
    const manifest = path.join(rootPath, "targeted-evidence", name);
    return fs.existsSync(manifest) ? list(record(JSON.parse(fs.readFileSync(manifest, "utf8"))).frames) : [];
  });
  const denseFrames = [...list(targeted.frames), ...supplementalFrames].map((raw) => {
    const frame = record(raw);
    const relative = text(frame.frame);
    return { id: text(frame.id, "FRAME"), time: number(frame.time), src: relative && !path.isAbsolute(relative) && !relative.split(/[\\/]/).includes("..") ? `${rootRef}targeted-evidence/${relative}` : "", reason: text(frame.reason) || null };
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
  const mediaForRefs = (refs: string[]) => refs.flatMap((ref) => {
    const frame = frameLookup.get(ref);
    return frame ? [{ ref, src: frame.src, label: frame.reason ?? ref, time: frame.time, role: "evidence",
      focus: "", proves: "", cannotProve: "", crop: null }] : [];
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
        proves: text(visual.proves), cannotProve: text(visual.cannotProve),
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
        focus: item.focus
      };
    });
    const steps = list(block.steps).map((rawStep) => {
      const step = record(rawStep);
      const label = text(step.label);
      const description = text(step.description);
      return {
        label,
        description,
        unresolvedFrameRefs: strings(step.frameRefs).filter((ref) => !frameLookup.has(ref)),
        media: mediaForRefs(strings(step.frameRefs)).map((item) => ({
          ...item,
          label,
          focus: description
        }))
      };
    });
    const combinedMedia = [...visualMedia, ...fallbackMedia];
    const stepRefs = new Set(steps.flatMap(step => step.media.map(item => item.ref)));
    const media = text(block.type) === "operation_sequence" && steps.length > 0
      ? [...visualMedia, ...fallbackMedia.filter(item => !stepRefs.has(item.ref))]
      : text(block.type) === "before_after"
        ? combinedMedia.sort((left, right) => {
          const order = (role: string) => role === "before" ? 0 : role === "after" ? 2 : 1;
          return order(left.role) - order(right.role) || (left.time ?? 0) - (right.time ?? 0);
        })
        : combinedMedia;
    return {
      id: text(block.id), type: text(block.type, "text"), title: text(block.title), body: text(block.body),
      start: number(timeRange.start), end: number(timeRange.end),
      evidenceRefs: [...new Set([...evidenceRefs, ...frameRefs.filter((ref) => !frameLookup.has(ref))])],
      unresolvedVisuals: visuals.filter((visual) => !frameLookup.has(text(visual.ref))),
      media,
      steps,
      boundary: text(block.boundary) || null
    };
  });
  const coverage = record(reconstruction.coverageMatrix);
  const coreEvidence = record(coverage.coreEvidence);
  const metaGate = record(reconstruction.metaGate);
  const gate = batchItem.gateReportArtifactRef ? record(readJson(batchItem.gateReportArtifactRef)) : {};
  const evaluationRead = sourceRead.revision ? { error: "源报告已修订，原评估不适用于当前修订。" } : safeThreeLens(batchItem);
  const threeLens = "evaluation" in evaluationRead ? evaluationRead : null;
  const allUnknowns = [...strings(coverage.unknowns), ...units.flatMap((unit) => unit.unknowns)];
  const conflicts = units.filter((unit) => /冲突|误识别|不一致/.test(`${unit.title}${unit.statement}`)).map((unit) => unit.statement);
  const contentReady = threeLens ? threeLens.evaluation.lenses.contentRestoration.rules.every((rule) => rule.status === "pass") : hasBuilderThreeLenses && metaGate.pass === true;
  const stageRows = list(probe.meaningChanges);
  const directingReady = threeLens ? threeLens.evaluation.lenses.directingLogic.rules.every((rule) => rule.status === "pass")
    : hasBuilderThreeLenses && list(builderDirecting.stages).length >= 1;
  const visualReady = threeLens ? threeLens.evaluation.lenses.visualEditing.rules.every((rule) => rule.status === "pass") : hasBuilderThreeLenses;
  const projectionGateFailures = [...new Set([
    ...(threeLens ? [] : strings(gate.failedGateIds)),
    ...(directingReady ? [] : ["directing_logic_projection_incomplete"]),
    ...(visualReady ? [] : ["visual_editing_projection_incomplete"]),
    ...(threeLens?.report.failedGateIds ?? []),
    ...(threeLens?.report.uncheckedGateIds ?? [])
  ])];
  const qualityStates = projectPostQualityStates(sourceRead.revision ? "built_unevaluated" : batchItem.state, Boolean(threeLens));
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
  const evidenceIndex = firstEvidenceEntryById<VideoResearch["evidenceIndex"][number]>([
    ...list(evidencePack.shots).flatMap(raw => {
      const shot = record(raw); const relative = text(shot.representativeFrame);
      if (!relative || path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) return [];
      const id = text(shot.id);
      return [[id, { id, kind: "shot", label: `${number(shot.start) ?? "?"}–${number(shot.end) ?? "?"} 秒镜头 · 代表帧 ${number(shot.representativeTime) ?? "?"} 秒（非切点画面）`, anchorId: null, artifactRef: `${rootRef}evidence/${relative}` }] as const];
    }),
    ...cues.map((cue) => [cue.id, { id: cue.id, kind: "subtitle_cue", label: cue.text.slice(0, 80), anchorId: cue.id, artifactRef: null }] as const),
    ...evidenceFrames.map((frame) => [frame.id, { id: frame.id, kind: "frame", label: frame.reason ?? frame.id, anchorId: null, artifactRef: frame.src }] as const),
    ...ocrEvidenceEntries(rootPath, rootRef),
    ...list(reconstruction.derivedSources).map(raw => { const source = record(raw); const relative = text(source.path);
      const safe = relative && !path.isAbsolute(relative) && !relative.split(/[\\/]/).includes("..");
      return [text(source.id), { id: text(source.id), kind: "source", label: text(source.id), anchorId: null, artifactRef: safe ? `${rootRef}${relative}` : batchItem.reconstructionArtifactRef }] as const; }),
    ...denseFrames.map((frame) => [frame.id, { id: frame.id, kind: "frame", label: frame.reason ?? frame.id, anchorId: frame.id, artifactRef: frame.src }] as const),
    ...units.map((unit) => [unit.id, { id: unit.id, kind: "claim", label: unit.title, anchorId: unit.id, artifactRef: batchItem.reconstructionArtifactRef }] as const),
    ...referencedEvidence.map((reference) => [reference.refId, { id: reference.refId, kind: reference.kind, label: reference.refId,
      anchorId: anchorIds.has(reference.refId) ? reference.refId : null, artifactRef: reference.artifactRef }] as const)
  ]);
  const selectionRecord = record(selection);
  const frozenSourcePath = path.join(rootPath, "post-source-input.json");
  const frozenSource = fs.existsSync(frozenSourcePath) ? record(JSON.parse(fs.readFileSync(frozenSourcePath, "utf8"))) : null;
  const sourceFacts = frozenSource?.facts ? postSourceFactsSchema.parse(frozenSource.facts) : projectPostSourceFacts({
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
  const inventory = run.inventoryArtifactRef ? creatorInventorySchema.safeParse(readJson(run.inventoryArtifactRef)) : null;
  const observation = buildPostPerformance({ externalId: videoId, ...sourceFacts.metrics },
    inventory?.success ? inventory.data.posts : [], sourceFacts.capturedAt,
    inventory?.success ? inventory.data.capturedAt : null, "已冻结作者清单中的可核验视频");
  const thesis = text(builderContent.summary, "Builder 未产出内容还原报告；旧知识单元仅供研究审计。");
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
    schemaVersion: "1.0.0", id: videoId, creatorId: researchOwnerId(run), creatorName: run.creatorName ?? "作者未知",
    title: sourceFacts.title ?? "标题未识别", sourceHref: sourceFacts.sourceUrl,
    sourceLabel: `video-content-reconstruction · ${batchItem.state}`,
    sourceFacts,
    thesis,
    sourceRevision: sourceRead.revision,
    overview: sourceRead.revision ? { state: "stale", overview: null } : loadReportOverview(artifactPath(batchItem.reconstructionArtifactRef)),
    contentUnknowns: strings(builderContent.unknowns),
    readerSummary: {
      productState,
      statusLabel: readerStatusLabel(productState, qualityStates, batchItem.researchReview),
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
    contentBlocks,
    reportFormat: "builder_lenses",
    quality: { ...qualityStates, evaluationReadIssue: "error" in evaluationRead ? evaluationRead.error : null, aggregateState: batchItem.state, findings: [...lensFindings, ...genericFindings],
      lineage: { reconstructionArtifactRef: batchItem.reconstructionArtifactRef,
        builderReportArtifactRef: article ? `${rootRef}article.md` : null,
        builderValidationArtifactRef: batchItem.builderValidationArtifactRef ?? null,
        evaluationArtifactRef: batchItem.evaluationArtifactRef,
        evaluatorReportArtifactRef: evaluatorReport ? `${rootRef}evaluation.md` : null,
        gateReportArtifactRef: batchItem.gateReportArtifactRef,
        threeLensEvaluationArtifactRef: batchItem.threeLensEvaluationArtifactRef, threeLensGateReportArtifactRef: batchItem.threeLensGateReportArtifactRef,
        candidateRevisionFingerprint: threeLens?.evaluation.candidateRevision.fingerprint ?? null } },
    evidenceIndex,
    engagement: sourceFacts.metrics,
    evidenceHealth: { state: qualityStates.promotionState === "wiki_eligible" ? "ready" : qualityStates.buildState === "built" ? "partial" : "missing", transcript: cues.length > 0, frames: denseFrames.length > 0,
      ocr: hasReadableOcr(rootPath), audio: hasSemanticAudio(text(builderVisual.audioRole) || null),
      baseline: selection?.likes != null, note: text(reconstruction.scopeStatement, batchItem.message) },
    knowledgeUnits: units, relations, transcript: cues, frames: { sparse: sparseFrames, dense: [...frameLookup.values()] },
    directingLogic: { packagingAnalysis: builderDirecting.packagingAnalysis ?? null, viewerBefore: text(builderDirecting.viewerBefore) || null, viewerAfter: text(builderDirecting.viewerAfter) || null,
      activatedQuestion: text(builderDirecting.activatedQuestion) || null, promise: text(builderDirecting.promise) || null,
      payoff: text(builderDirecting.payoff) || null, endingResolution: text(builderDirecting.endingResolution) || null,
      stages: list(builderDirecting.stages).map((raw) => { const stage = record(raw); const range = record(stage.timeRange ?? stage.range); return {
        label: text(stage.label, text(stage.description, text(stage.id))), start: number(range.start), end: number(range.end), viewerQuestion: text(stage.viewerQuestion) || null,
        function: text(stage.function, text(stage.description)), proof: text(stage.proof, text(stage.trigger)) || null,
        cognitiveChange: text(stage.cognitiveChange, text(stage.description)) || null,
        comprehensionLoad: text(stage.comprehensionLoad) || null, payoff: text(stage.payoff) || null,
        evidenceRefs: strings(stage.evidenceRefs).length ? strings(stage.evidenceRefs) : strings(stage.evidenceHints)
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
      notes: strings(builderDirecting.notes) },
    visualEditing: { openingAnalysis: builderVisual.openingAnalysis ?? null, orientation: text(builderVisual.orientation) || null, composition: text(builderVisual.composition) || null,
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
      notes: strings(builderVisual.notes) },
    performanceContext: { observation, tier: selection?.tier ?? "unknown", creatorMedianLikes: observation.metrics[0]?.median ?? null,
      medianMultiple: observation.metrics[0]?.multiple ?? null, percentileRank: null,
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
