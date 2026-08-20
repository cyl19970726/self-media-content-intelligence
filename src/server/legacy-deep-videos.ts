import fs from "node:fs";
import path from "node:path";
import { projectRoot } from "../core/config.js";
import { videoResearchSchema, type VideoResearch } from "../shared/video-research.js";
import { aiRedWitch6801ThreeLens } from "./three-lens-data/ai-red-witch-6801.js";
import { humanDirector6a2fThreeLens } from "./three-lens-data/human-director-6a2f.js";
import { zhangZala69fe } from "./three-lens-data/zhang-zala-69fe.js";
import { aiRedWitch6801Evaluation, humanDirector6a2fEvaluation, zhangZala69feEvaluation } from "./three-lens-evaluations/index.js";
import type { ThreeLensIndependentEvaluation } from "./three-lens-evaluations/types.js";

type Row = Record<string, unknown>;

const creatorResearchRoot = path.join(projectRoot, "artifacts", "creator-research");
const directorStudyRoot = path.join(projectRoot, "artifacts", "director-skill-study", "corpus");

function row(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {};
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function str(value: unknown, fallback = ""): string { return typeof value === "string" ? value : fallback; }
function num(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function strList(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }

function readJson(file: string): Row | null {
  try { return JSON.parse(fs.readFileSync(file, "utf8")) as Row; } catch { return null; }
}

function readMarkdown(...files: string[]): string {
  const file = files.find((candidate) => fs.existsSync(candidate));
  return file ? fs.readFileSync(file, "utf8") : "";
}

function parseClock(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parts = value.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
  return Number.isFinite(Number(value)) ? Number(value) : null;
}

function publicResearch(relative: string): string {
  return `/research/${relative.replace(/^\/+/, "")}`;
}

function evidenceRefs(value: unknown): string[] {
  return rows(value).map((item) => str(item.ref)).filter(Boolean);
}

function percentile(values: number[], value: number | null): number | null {
  if (value === null || values.length === 0) return null;
  return Math.round(values.filter((candidate) => candidate <= value).length / values.length * 1000) / 10;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] ?? null : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function dimensions(evidence: Row) {
  const media = row(evidence.media);
  const width = num(media.width); const height = num(media.height);
  const orientation = width !== null && height !== null ? (height > width ? `竖屏 ${width}×${height}` : width > height ? `横屏 ${width}×${height}` : `方形 ${width}×${height}`) : null;
  return { media, orientation };
}

function mapReconstructionUnits(reconstruction: Row) {
  return rows(reconstruction.knowledgeUnits).map((source) => {
    const timeRange = row(source.timeRange);
    const provenance = str(source.provenance);
    const evidenceClass = ["raw_fact", "visual_observation", "author_claim", "system_inference", "unknown"].includes(provenance)
      ? provenance as "raw_fact" | "visual_observation" | "author_claim" | "system_inference" | "unknown" : "unknown";
    return {
      id: str(source.id), title: str(source.title), statement: str(source.statement), importance: str(source.importance, "supporting"),
      evidenceClass, confidence: str(source.confidence, "unknown"), start: num(timeRange.start), end: num(timeRange.end),
      evidenceRefs: evidenceRefs(source.evidence), unknowns: strList(source.unknowns)
    };
  });
}

function mapRelations(reconstruction: Row) {
  return rows(reconstruction.relations).map((source) => ({
    from: str(source.from), to: str(source.to), relation: str(source.relation), evidenceRefs: evidenceRefs(source.evidence)
  })).filter((relation) => relation.from && relation.to);
}

function mapTranscript(reconstruction: Row, publicRoot: string) {
  return rows(row(reconstruction.transcript).cues).map((source) => {
    const frame = str(source.representativeFrame);
    return {
      id: str(source.id), start: parseClock(source.start), end: parseClock(source.end), text: str(source.text),
      representativeFrame: frame ? publicResearch(`${publicRoot}/evidence/${frame.replace(/^frames\//, "frames/")}`) : null,
      overlappingShots: strList(source.overlappingShots)
    };
  });
}

function mapProbeStages(probe: Row) {
  return rows(probe.meaningChanges).map((source) => {
    const range = row(source.range);
    return {
      label: str(source.description, str(source.id)), start: num(range.start), end: num(range.end), viewerQuestion: null,
      function: str(source.description), proof: str(source.trigger) || strList(source.evidenceHints).join("、") || null,
      cognitiveChange: str(source.description) || null, comprehensionLoad: null, payoff: null, evidenceRefs: strList(source.evidenceHints)
    };
  });
}

function mapArchitectureStages(value: unknown) {
  return rows(row(value).stages).map((source) => ({
    label: str(source.heading, str(source.role)), start: num(source.start), end: num(source.end),
    viewerQuestion: str(source.viewerQuestion) || null, function: str(source.function), proof: str(source.visualEvidence) || null,
    cognitiveChange: str(source.function) || null, comprehensionLoad: null, payoff: null, evidenceRefs: []
  }));
}

function mapCarriers(probe: Row) {
  return rows(probe.informationCarriers).filter((source) => source.available !== false).map((source) => {
    const intervals = rows(source.intervals); const first = intervals[0]; const last = intervals.at(-1);
    return { name: str(source.name, str(source.id)), roles: strList(source.roles), start: first ? num(first.start) : null, end: last ? num(last.end) : null };
  });
}

function mapEvidenceFrames(evidence: Row, publicRoot: string) {
  const dense = rows(row(evidence.denseProbe).frames).map((source) => ({
    id: str(source.id), time: num(source.time), src: publicResearch(`${publicRoot}/evidence/${str(source.frame)}`), reason: null
  })).filter((frame) => frame.src);
  const shots = rows(evidence.shots).map((source) => ({
    id: str(source.id), time: num(source.representativeTime), src: publicResearch(`${publicRoot}/evidence/${str(source.representativeFrame)}`), reason: "镜头代表帧"
  })).filter((frame) => frame.src);
  return { sparse: shots.length <= 16 ? shots : shots.filter((_item, index) => index === 0 || index === shots.length - 1 || index % Math.ceil(shots.length / 12) === 0), dense };
}

function mapTargetedFrames(root: string, publicRoot: string) {
  const manifest = readJson(path.join(root, "skill-run", "targeted-evidence", "targeted-evidence.json"));
  if (!manifest) return [];
  return rows(manifest.frames).map((source) => ({
    id: str(source.id), time: num(source.time),
    src: publicResearch(`${publicRoot}/skill-run/targeted-evidence/${str(source.frame)}`), reason: str(source.reason) || null
  })).filter((frame) => frame.src);
}

function coverageOf(reconstruction: Row) {
  const coverage = row(reconstruction.coverageMatrix); const core = row(coverage.coreEvidence);
  return { coreCovered: num(core.covered) ?? 0, coreTotal: num(core.total) ?? 0, uncheckedChannels: strList(coverage.uncheckedChannels) };
}

function unknownsOf(reconstruction: Row) {
  const coverage = row(reconstruction.coverageMatrix);
  return [...new Set([...strList(coverage.unknowns), ...mapReconstructionUnits(reconstruction).flatMap((unit) => unit.unknowns)])];
}

function conflictsOf(reconstruction: Row, probe: Row) {
  const units = mapReconstructionUnits(reconstruction).filter((unit) => /冲突|不一致|误识别|泛称|转写/.test(`${unit.title}${unit.statement}`)).map((unit) => unit.statement);
  const risks = rows(probe.omissionRisks).filter((risk) => /冲突|误识别|字幕|泛称/.test(`${str(risk.risk)}${str(risk.why)}`)).map((risk) => str(risk.risk));
  return [...new Set([...units, ...risks])];
}

function gateOf(gate: Row | null, reconstruction: Row, forcedPartial = false) {
  const metaGate = row(reconstruction.metaGate);
  if (forcedPartial) return { ready: false, failedGateIds: ["independent_semantic_review_missing"] };
  const ready = gate?.ready === true && metaGate.pass === true;
  return { ready, failedGateIds: ready ? [] : [...new Set([...(gate ? strList(gate.failedGateIds) : []), ...(metaGate.pass === true ? [] : ["reconstruction_meta_gate"])])] };
}

function lensCoverage(state: "ready" | "partial" | "missing", covered: number, total: number, evidenceRefs: string[], note: string,
  failedGateIds: string[] = [], uncheckedChannels: string[] = [], conflicts: string[] = [],
  rules: { id: string; pass: boolean; note: string; evidenceRefs: string[]; failedReason: string | null }[] = [],
  evaluator: { id: string; version: string; checkedAt: string } | null = null) {
  return { state, covered, total, evidenceRefs: [...new Set(evidenceRefs)].filter(Boolean), conflicts, uncheckedChannels, failedGateIds, note, rules, evaluator };
}

type ThreeLensOverlay = typeof aiRedWitch6801ThreeLens | typeof zhangZala69fe | typeof humanDirector6a2fThreeLens;

function overlayStages(overlay: ThreeLensOverlay) {
  return overlay.directing.stages.map((stage) => ({
    label: stage.label, start: stage.start, end: stage.end, viewerQuestion: stage.viewerQuestion,
    function: stage.function, proof: stage.proofDesign, cognitiveChange: stage.cognitiveChange,
    comprehensionLoad: stage.comprehensionLoad, payoff: stage.payoff, evidenceRefs: [...stage.evidenceRefs]
  }));
}

function overlayInformationDesign(overlay: ThreeLensOverlay) {
  return overlay.directing.informationDesign.map((item) => ({ ...item, evidenceRefs: [...item.evidenceRefs] }));
}

function overlayClaims(overlay: ThreeLensOverlay) {
  return overlay.visual.claims.map((claim) => ({ ...claim, evidenceRefs: [...claim.evidenceRefs] }));
}

function overlayShotSemantics(overlay: ThreeLensOverlay) {
  return overlay.visual.shotSemantics.map((shot) => ({ ...shot, evidenceRefs: [...shot.evidenceRefs] }));
}

function overlayEvidenceRefs(overlay: ThreeLensOverlay, lens: "directing" | "visual") {
  const refs = lens === "directing"
    ? [...overlay.directing.stages, ...overlay.directing.informationDesign].flatMap((item) => [...item.evidenceRefs])
    : [...overlay.visual.claims, ...overlay.visual.shotSemantics].flatMap((item) => [...item.evidenceRefs]);
  return [...new Set(refs)];
}

function overlayCoverage(overlay: ThreeLensOverlay, evaluation: ThreeLensIndependentEvaluation, lens: "directing" | "visual") {
  const source = lens === "directing" ? overlay.directing : overlay.visual;
  const evaluated = lens === "directing" ? evaluation.directing : evaluation.visual;
  const rules = evaluated.rules.map((rule) => ({ id: rule.ruleId, pass: rule.pass, note: rule.note, evidenceRefs: [...rule.evidenceRefs], failedReason: rule.failedReason }));
  const total = rules.length; const covered = rules.filter((rule) => rule.pass).length;
  const label = lens === "directing" ? "编导逻辑" : "画面与剪辑";
  return lensCoverage(evaluated.ready ? "ready" : "partial", covered, total, overlayEvidenceRefs(overlay, lens),
    evaluated.ready ? `${label}已由独立评审按规则闭环。` : `${label}分析已进入页面，但仍保留未闭环评测规则。`,
    rules.filter((rule) => !rule.pass).map((rule) => rule.id), [], [...source.conflicts], rules,
    { id: evaluation.evaluatorId, version: evaluation.version, checkedAt: evaluation.checkedAt });
}

function independentContentCoverage(evaluation: ThreeLensIndependentEvaluation, conflicts: string[] = [], uncheckedChannels: string[] = []) {
  const rules = evaluation.content.rules.map((rule) => ({ id: rule.ruleId, pass: rule.pass, note: rule.note, evidenceRefs: [...rule.evidenceRefs], failedReason: rule.failedReason }));
  const refs = [...new Set(rules.flatMap((rule) => rule.evidenceRefs))];
  return lensCoverage(evaluation.content.ready ? "ready" : "partial", rules.filter((rule) => rule.pass).length, rules.length, refs,
    evaluation.content.ready ? "内容还原已由独立评审按规则闭环。" : "内容还原仍有未闭环评测规则。",
    rules.filter((rule) => !rule.pass).map((rule) => rule.id), uncheckedChannels, conflicts, rules,
    { id: evaluation.evaluatorId, version: evaluation.version, checkedAt: evaluation.checkedAt });
}

function redWitch(videoId: string): VideoResearch | null {
  const publicRoot = `ai-red-witch/content-reconstruction-v1/videos/${videoId}`;
  const root = path.join(creatorResearchRoot, publicRoot);
  const reconstruction = readJson(path.join(root, "skill-run", "reconstruction.json"));
  const evidence = readJson(path.join(root, "evidence", "evidence-pack.json"));
  const probe = readJson(path.join(root, "skill-run", "probe.json"));
  if (!reconstruction || !evidence || !probe) return null;
  const library = readJson(path.join(creatorResearchRoot, "ai-red-witch", "video-library", "library.json"));
  const overview = readJson(path.join(creatorResearchRoot, "ai-red-witch", "video-library", "creator-overview.json"));
  const video = rows(library?.videos).find((item) => str(item.id) === videoId);
  if (!video) return null;
  const engagement = row(video.engagement); const contentArchitecture = row(video.contentArchitecture);
  const stages = mapArchitectureStages(contentArchitecture);
  const gateCandidates = ["evaluation-v3", "evaluation-v2", "evaluation"].map((name) => readJson(path.join(root, name, "gate-report.json"))).filter(Boolean);
  const gate = gateOf(gateCandidates[0] ?? null, reconstruction);
  const frames = mapEvidenceFrames(evidence, publicRoot);
  const targetedFrames = mapTargetedFrames(root, publicRoot);
  const libraryFrames = row(video.frames);
  const sparse = rows(libraryFrames.sparse).map((source, index) => ({
    id: `S-${String(index + 1).padStart(2, "0")}`, time: num(source.time),
    src: publicResearch(`ai-red-witch/video-library/reports/${videoId}/${str(source.src)}`), reason: stages.find((stage) => stage.start !== null && stage.end !== null && (num(source.time) ?? -1) >= stage.start && (num(source.time) ?? -1) <= stage.end)?.label ?? null
  }));
  const likes = num(engagement.likes); const stats = row(row(overview?.publicCorpus).videoLikeStats); const creatorMedian = num(stats.median);
  const { media, orientation } = dimensions(evidence); const units = mapReconstructionUnits(reconstruction);
  const core = coverageOf(reconstruction); const redStages = stages.length ? stages : mapProbeStages(probe); const redCarriers = mapCarriers(probe);
  const overlay = videoId === aiRedWitch6801ThreeLens.videoId ? aiRedWitch6801ThreeLens : null;
  const redContent = overlay ? independentContentCoverage(aiRedWitch6801Evaluation, conflictsOf(reconstruction, probe), core.uncheckedChannels) : lensCoverage(gate.ready ? "ready" : "partial", core.coreCovered, core.coreTotal,
    units.flatMap((unit) => unit.evidenceRefs), "知识单元、全文、逐字稿与关系已进入内容重建硬闸。", gate.ready ? [] : gate.failedGateIds);
  const redDirecting = overlay ? overlayCoverage(overlay, aiRedWitch6801Evaluation, "directing") : lensCoverage("partial", redStages.filter((stage) => stage.start !== null && stage.end !== null).length, redStages.length,
    units.flatMap((unit) => unit.evidenceRefs).slice(0, 24), "阶段骨架已恢复；仍缺承诺—回报、认知负荷、信息延迟与证明设计的独立评审。", ["directing_logic_independent_review_missing"]);
  const redVisual = overlay ? overlayCoverage(overlay, aiRedWitch6801Evaluation, "visual") : lensCoverage("partial", redCarriers.length, redCarriers.length,
    targetedFrames.slice(0, 24).map((frame) => frame.id), "帧、OCR、载体和技术切分已取得；仍缺语义镜头时间线与逐项画面作用评审。", ["visual_editing_independent_review_missing"], core.uncheckedChannels);
  const redGate = { ready: redContent.state === "ready" && redDirecting.state === "ready" && redVisual.state === "ready", failedGateIds: [...new Set([...redContent.failedGateIds, ...redDirecting.failedGateIds, ...redVisual.failedGateIds])] };
  return videoResearchSchema.parse({
    schemaVersion: "1.0.0", id: videoId, creatorId: "ai-red-witch", creatorName: "AI红发魔女", title: str(video.title),
    sourceHref: str(video.sourceUrl), sourceLabel: `content reconstruction ${gate.ready ? "READY" : "PARTIAL"} · three-lens ${redGate.ready ? "READY" : "NOT_READY"}`,
    thesis: str(row(reconstruction.viewerChange).after, str(video.coreClaim)),
    article: readMarkdown(path.join(root, "skill-run", "article.md"), path.join(root, "skill-run", "report.md")),
    engagement: { likes, collections: num(engagement.collections), comments: num(engagement.comments), shares: num(engagement.shares) },
    evidenceHealth: { state: "partial", transcript: rows(row(reconstruction.transcript).cues).length > 0, frames: frames.dense.length > 0,
      ocr: fs.existsSync(path.join(root, "skill-run", "targeted-evidence", "ocr-evidence.json")), audio: row(reconstruction.metaGate).pass === true,
      baseline: creatorMedian !== null, note: str(reconstruction.scopeStatement) },
    knowledgeUnits: units, directingLogic: { viewerBefore: str(row(reconstruction.viewerChange).before) || null, viewerAfter: str(row(reconstruction.viewerChange).after) || null,
      activatedQuestion: overlay?.directing.activatedQuestion ?? null, promise: overlay?.directing.promise ?? null, payoff: overlay?.directing.payoff ?? null,
      endingResolution: overlay?.directing.endingResolution ?? null, stages: overlay ? overlayStages(overlay) : redStages,
      informationDesign: overlay ? overlayInformationDesign(overlay) : [], notes: [...strList(contentArchitecture.proofChain), ...(overlay ? [...overlay.directing.conflicts] : [])] },
    visualEditing: { orientation, composition: mapCarriers(probe).map((carrier) => carrier.name).filter((name) => !/字幕|语音/.test(name)).join(" · ") || null,
      shotCount: rows(evidence.shots).length, cutsPerMinute: rows(evidence.shots).length && num(media.duration) ? Math.round(rows(evidence.shots).length / (num(media.duration)! / 60) * 10) / 10 : null,
      resultFirstAt: overlay ? 25.5 : null, carriers: mapCarriers(probe), analyzedDuration: overlay?.visual.analyzedDuration ?? num(media.duration),
      claims: overlay ? overlayClaims(overlay) : [], shotSemantics: overlay ? overlayShotSemantics(overlay) : [], audioRole: overlay?.visual.audioRole ?? null,
      notes: [...rows(probe.omissionRisks).map((risk) => str(risk.risk)).filter(Boolean), ...(overlay ? [...overlay.visual.conflicts] : [])] },
    performanceContext: { tier: str(video.tier) === "median" ? "base" : str(video.tier, "unknown"), creatorMedianLikes: creatorMedian,
      medianMultiple: likes !== null && creatorMedian ? Math.round(likes / creatorMedian * 10) / 10 : null, percentileRank: null,
      interpretation: `该片公开点赞 ${likes ?? "未知"}，属于账号内部${str(video.tier) === "high" ? "高表现" : str(video.tier) === "low" ? "低表现" : "基本盘"}样本；结构关联不等于分发因果。`,
      confounds: [str(row(overview?.threeTierComparison).confound), "公开互动不等于播放、完播、涨粉或成交。"].filter(Boolean) },
    relations: mapRelations(reconstruction), transcript: mapTranscript(reconstruction, publicRoot), frames: { sparse: sparse.length ? sparse : frames.sparse, dense: targetedFrames.length ? targetedFrames : frames.dense },
    lensCoverage: { contentRestoration: redContent, directingLogic: redDirecting, visualEditingLogic: redVisual },
    coverage: coverageOf(reconstruction),
    conflicts: (() => {
      const audit = readJson(path.join(root, "audit", "audit.json"));
      const ledger = rows(audit?.carrierConflictLedger).map((item) => `${str(item.id)}：${str(item.supportedReading)}${str(item.unresolved) ? `；未解决：${str(item.unresolved)}` : ""}`).filter(Boolean);
      return ledger.length ? ledger : conflictsOf(reconstruction, probe);
    })(), unknowns: [...new Set([...unknownsOf(reconstruction), ...(overlay ? [...overlay.directing.unknowns, ...overlay.visual.unknowns] : [])])], gate: redGate
  });
}

function zhangZala(videoId: string): VideoResearch | null {
  const publicRoot = `zhang-zala-v1/videos/${videoId}`; const root = path.join(creatorResearchRoot, publicRoot);
  const reconstruction = readJson(path.join(root, "skill-run", "reconstruction.json"));
  const evidence = readJson(path.join(root, "evidence", "evidence-pack.json"));
  const probe = readJson(path.join(root, "skill-run", "probe.json"));
  const dashboard = readJson(path.join(creatorResearchRoot, "zhang-zala-v1", "dashboard-data.json"));
  if (!reconstruction || !evidence || !probe || !dashboard) return null;
  const post = rows(dashboard.posts).find((item) => str(item.id) === videoId);
  const dive = rows(dashboard.deepDives).find((item) => str(item.postId) === videoId);
  if (!post || !dive) return null;
  const overview = row(dashboard.overview); const likes = num(post.likes); const creatorMedian = num(overview.medianLikes);
  const postLikes = rows(dashboard.posts).map((item) => num(item.likes)).filter((value): value is number => value !== null);
  const frames = mapEvidenceFrames(evidence, publicRoot); const { media, orientation } = dimensions(evidence);
  const targetedFrames = mapTargetedFrames(root, publicRoot);
  const sparseFrames = frames.sparse.length >= 3 ? frames.sparse : targetedFrames.filter((_frame, index) =>
    index === 0 || index === targetedFrames.length - 1 || index % Math.max(1, Math.ceil(targetedFrames.length / 12)) === 0);
  const carriers = mapCarriers(probe);
  const zhangUnits = mapReconstructionUnits(reconstruction); const zhangCore = coverageOf(reconstruction); const zhangStages = mapProbeStages(probe);
  const overlay = videoId === zhangZala69fe.videoId ? zhangZala69fe : null;
  const reviewFailure = ["independent_semantic_review_missing"];
  const zhangContent = overlay ? independentContentCoverage(zhangZala69feEvaluation, conflictsOf(reconstruction, probe), zhangCore.uncheckedChannels) : lensCoverage("partial", zhangCore.coreCovered, zhangCore.coreTotal, zhangUnits.flatMap((unit) => unit.evidenceRefs), "内容重建材料充足，但尚缺独立语义复核。", reviewFailure);
  const zhangDirecting = overlay ? overlayCoverage(overlay, zhangZala69feEvaluation, "directing") : lensCoverage("partial", zhangStages.length, zhangStages.length, [], "尚未恢复编导逻辑。", reviewFailure);
  const zhangVisual = overlay ? overlayCoverage(overlay, zhangZala69feEvaluation, "visual") : lensCoverage("partial", carriers.length, carriers.length, [], "尚未恢复画面与剪辑逻辑。", reviewFailure);
  const zhangOverallGate = { ready: zhangContent.state === "ready" && zhangDirecting.state === "ready" && zhangVisual.state === "ready", failedGateIds: [...new Set([...zhangContent.failedGateIds, ...zhangDirecting.failedGateIds, ...zhangVisual.failedGateIds])] };
  return videoResearchSchema.parse({
    schemaVersion: "1.0.0", id: videoId, creatorId: "zhang-zala", creatorName: "张咋啦", title: str(post.title), sourceHref: str(post.sourceUrl),
    sourceLabel: `dashboard deepDive + video-content-reconstruction · THREE-LENS ${zhangOverallGate.ready ? "READY" : "NOT_READY"}`,
    thesis: str(row(reconstruction.viewerChange).after, str(post.coreMessage)), article: readMarkdown(path.join(root, "skill-run", "report.md")),
    engagement: { likes, collections: num(post.collections), comments: num(post.comments), shares: num(post.shares) },
    evidenceHealth: { state: "partial", transcript: rows(row(reconstruction.transcript).cues).length > 0, frames: frames.dense.length > 0,
      ocr: fs.existsSync(path.join(root, "skill-run", "targeted-evidence", "ocr-evidence.json")), audio: row(reconstruction.metaGate).pass === true,
      baseline: creatorMedian !== null, note: `${str(reconstruction.scopeStatement)}；${str(dive.gateStatus)}` },
    knowledgeUnits: zhangUnits, directingLogic: { viewerBefore: str(row(reconstruction.viewerChange).before) || null,
      viewerAfter: str(row(reconstruction.viewerChange).after) || null, activatedQuestion: overlay?.directing.activatedQuestion ?? null,
      promise: overlay?.directing.promise ?? null, payoff: overlay?.directing.payoff ?? null, endingResolution: overlay?.directing.endingResolution ?? null,
      stages: overlay ? overlayStages(overlay) : zhangStages, informationDesign: overlay ? overlayInformationDesign(overlay) : [],
      notes: [str(dive.selectionReason), str(dive.representedMechanism), ...(overlay ? [...overlay.directing.conflicts] : [])].filter(Boolean) },
    visualEditing: { orientation, composition: carriers.map((carrier) => carrier.name).filter((name) => !/字幕|口播|音频/.test(name)).join(" · ") || null,
      shotCount: rows(evidence.shots).length, cutsPerMinute: rows(evidence.shots).length && num(media.duration) ? Math.round(rows(evidence.shots).length / (num(media.duration)! / 60) * 10) / 10 : null,
      resultFirstAt: overlay ? 0 : null, carriers, analyzedDuration: overlay?.visual.analyzedDuration ?? num(media.duration), claims: overlay ? overlayClaims(overlay) : [],
      shotSemantics: overlay ? overlayShotSemantics(overlay) : [], audioRole: overlay?.visual.audioRole ?? null,
      notes: [...rows(probe.omissionRisks).map((risk) => str(risk.risk)).filter(Boolean), ...(overlay ? [...overlay.visual.conflicts] : [])] },
    performanceContext: { tier: str(post.tier) === "median" || str(post.tier) === "average" ? "base" : str(post.tier, "unknown"), creatorMedianLikes: creatorMedian,
      medianMultiple: likes !== null && creatorMedian ? Math.round(likes / creatorMedian * 10) / 10 : null, percentileRank: percentile(postLikes, likes),
      interpretation: `${str(dive.selectionReason)} 当前只能说明公开表现与内容结构同时出现，不能认定结构造成点赞。`,
      confounds: strList(dashboard.boundaries) },
    relations: mapRelations(reconstruction), transcript: mapTranscript(reconstruction, publicRoot), frames: { sparse: sparseFrames, dense: targetedFrames.length ? targetedFrames : frames.dense },
    lensCoverage: {
      contentRestoration: zhangContent,
      directingLogic: zhangDirecting,
      visualEditingLogic: zhangVisual
    }, coverage: zhangCore,
    conflicts: [...new Set([...conflictsOf(reconstruction, probe), ...(overlay ? [...overlay.directing.conflicts, ...overlay.visual.conflicts] : [])])],
    unknowns: [...new Set([...unknownsOf(reconstruction), ...(overlay ? [...overlay.directing.unknowns, ...overlay.visual.unknowns] : [])])], gate: zhangOverallGate
  });
}

function humanDirector(videoId: string): VideoResearch | null {
  const analysis = readJson(path.join(creatorResearchRoot, "human-director", "analysis.json"));
  const inventory = readJson(path.join(creatorResearchRoot, "human-director", "inventory.json"));
  const sourceVideo = rows(analysis?.videos).find((item) => str(item.id) === videoId);
  const inventoryVideo = rows(inventory?.videos).find((item) => str(item.id) === videoId);
  if (!sourceVideo || !inventoryVideo) return null;
  const deepRoot = path.join(directorStudyRoot, videoId); const reconstruction = readJson(path.join(deepRoot, "run", "reconstruction.json"));
  const probe = readJson(path.join(deepRoot, "run", "probe.json")); const evidence = readJson(path.join(deepRoot, "evidence", "evidence-pack.json"));
  const gateReport = readJson(path.join(deepRoot, "review", "evaluation-v2", "gate-report.json"));
  if (!reconstruction || !probe || !evidence) return null;
  const engagement = row(sourceVideo.engagement); const editing = row(sourceVideo.editing); const media = row(sourceVideo.media);
  const reconstructedCues = new Map(rows(row(reconstruction?.transcript).cues).map((cue) => [str(cue.id), cue]));
  const transcript = rows(row(sourceVideo.transcript).cues).map((cue) => ({
    id: str(cue.id), start: num(cue.start), end: num(cue.end), text: str(cue.text), representativeFrame: publicResearch(`human-director/${str(cue.frame)}`),
    overlappingShots: strList(reconstructedCues.get(str(cue.id))?.overlappingShots)
  }));
  const dense = rows(row(sourceVideo.transcript).cues).map((cue) => ({
    id: `FRAME-${str(cue.id)}`, time: num(cue.midpoint) ?? num(cue.start), src: publicResearch(`human-director/${str(cue.frame)}`), reason: `逐字稿 ${str(cue.id)} 代表帧`
  }));
  const sampleTimes = Array.isArray(row(sourceVideo.evidence).sampleTimes) ? row(sourceVideo.evidence).sampleTimes as unknown[] : [];
  const sparse = sampleTimes.map((time, index) => ({ id: `SAMPLE-${String(index + 1).padStart(3, "0")}`, time: num(time),
    src: publicResearch(`human-director/evidence/${videoId}/sample-frames/frame-${String(index + 1).padStart(3, "0")}.jpg`), reason: "均匀样本帧" }));
  const values = rows(inventory?.videos).map((item) => num(item.likes)).filter((value): value is number => value !== null); const likes = num(engagement.likes);
  const creatorMedian = median(values); const height = num(media.height); const width = num(media.width); const carriers = mapCarriers(probe);
  const gate = gateOf(gateReport, reconstruction);
  const humanUnits = mapReconstructionUnits(reconstruction); const humanCore = coverageOf(reconstruction); const humanStages = mapProbeStages(probe);
  const overlay = videoId === humanDirector6a2fThreeLens.videoId ? humanDirector6a2fThreeLens : null;
  const humanContent = overlay ? independentContentCoverage(humanDirector6a2fEvaluation, conflictsOf(reconstruction, probe), humanCore.uncheckedChannels) : lensCoverage(gate.ready ? "ready" : "partial", humanCore.coreCovered, humanCore.coreTotal, humanUnits.flatMap((unit) => unit.evidenceRefs), "内容重建与原有独立评测已闭环。", gate.ready ? [] : gate.failedGateIds);
  const humanDirecting = overlay ? overlayCoverage(overlay, humanDirector6a2fEvaluation, "directing") : lensCoverage("partial", humanStages.filter((stage) => stage.start !== null && stage.end !== null).length, humanStages.length, humanUnits.flatMap((unit) => unit.evidenceRefs).slice(0, 24), "意义变化骨架已经恢复；原有 v2 gate 未单独评审编导设计。", ["directing_logic_independent_review_missing"]);
  const humanVisual = overlay ? overlayCoverage(overlay, humanDirector6a2fEvaluation, "visual") : lensCoverage("partial", carriers.length, carriers.length, dense.slice(0, 24).map((frame) => frame.id), "镜头密度、信息载体与帧证据已恢复；原有 v2 gate 未单独评审画面与剪辑逻辑。", ["visual_editing_independent_review_missing"], humanCore.uncheckedChannels);
  const humanGate = { ready: humanContent.state === "ready" && humanDirecting.state === "ready" && humanVisual.state === "ready", failedGateIds: [...new Set([...humanContent.failedGateIds, ...humanDirecting.failedGateIds, ...humanVisual.failedGateIds])] };
  return videoResearchSchema.parse({
    schemaVersion: "1.0.0", id: videoId, creatorId: "human-director", creatorName: "人类最强编导", title: str(sourceVideo.title), sourceHref: str(sourceVideo.sourceUrl),
    sourceLabel: `content reconstruction ${gate.ready ? "READY" : "PARTIAL"} · three-lens ${humanGate.ready ? "READY" : "NOT_READY"}`,
    thesis: str(row(reconstruction.viewerChange).after), article: readMarkdown(path.join(deepRoot, "run", "article.md")),
    engagement: { likes, collections: num(engagement.collections), comments: num(engagement.comments), shares: num(engagement.shares) },
    evidenceHealth: { state: "partial", transcript: transcript.length > 0, frames: sparse.length > 0, ocr: true,
      audio: row(reconstruction.metaGate).pass === true, baseline: creatorMedian !== null,
      note: `${str(reconstruction.scopeStatement)}；公开作品库仅 19 条，发布时间缺失。` },
    knowledgeUnits: humanUnits, directingLogic: { viewerBefore: str(row(reconstruction.viewerChange).before) || null,
      viewerAfter: str(row(reconstruction.viewerChange).after) || null, activatedQuestion: overlay?.directing.activatedQuestion ?? null,
      promise: overlay?.directing.promise ?? null, payoff: overlay?.directing.payoff ?? null, endingResolution: overlay?.directing.endingResolution ?? null,
      stages: overlay ? overlayStages(overlay) : humanStages, informationDesign: overlay ? overlayInformationDesign(overlay) : [],
      notes: [str(analysis?.selectionLogic), ...(overlay ? [...overlay.directing.conflicts] : [])].filter(Boolean) },
    visualEditing: { orientation: width !== null && height !== null ? (height > width ? `竖屏 ${width}×${height}` : `横屏 ${width}×${height}`) : null,
      composition: carriers.map((carrier) => carrier.name).filter((name) => !/字幕|口播|音频|缺失/.test(name)).join(" · ") || null,
      shotCount: num(editing.detectedShotCount), cutsPerMinute: num(editing.cutsPerMinute), resultFirstAt: overlay ? 0 : null, carriers,
      analyzedDuration: overlay?.visual.analyzedDuration ?? num(media.duration), claims: overlay ? overlayClaims(overlay) : [],
      shotSemantics: overlay ? overlayShotSemantics(overlay) : [], audioRole: overlay?.visual.audioRole ?? null,
      notes: ["技术场景检测只表示画面变化，不能直接当作语义镜头或隐藏剪辑数量。", ...rows(probe.omissionRisks).map((risk) => `遗漏风险：${str(risk.risk)}`).filter((value) => value.length > 5), ...(overlay ? [...overlay.visual.conflicts] : [])] },
    performanceContext: { tier: "high", creatorMedianLikes: creatorMedian, medianMultiple: likes !== null && creatorMedian ? Math.round(likes / creatorMedian * 10) / 10 : null,
      percentileRank: percentile(values, likes), interpretation: `${str(inventoryVideo.role)}；该片处于 19 条公开作品的头部，但点赞不能证明开场资历或结构造成传播。`,
      confounds: ["19 条均缺发布时间，无法控制作品年龄与账号阶段。", "公开互动不等于播放、完播、涨粉、收入或成交。"] },
    relations: mapRelations(reconstruction), transcript, frames: { sparse, dense: dense.length ? dense : sparse },
    lensCoverage: { contentRestoration: humanContent, directingLogic: humanDirecting, visualEditingLogic: humanVisual }, coverage: humanCore,
    conflicts: [...new Set([...conflictsOf(reconstruction, probe), ...(overlay ? [...overlay.directing.conflicts, ...overlay.visual.conflicts] : [])])],
    unknowns: [...new Set([...unknownsOf(reconstruction), ...(overlay ? [...overlay.directing.unknowns, ...overlay.visual.unknowns] : [])])], gate: humanGate
  });
}

export function loadLegacyDeepVideo(creatorId: string, videoId: string): VideoResearch | null {
  if (creatorId === "ai-red-witch") return redWitch(videoId);
  if (creatorId === "zhang-zala") return zhangZala(videoId);
  if (creatorId === "human-director") return humanDirector(videoId);
  return null;
}
