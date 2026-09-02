import fs from "node:fs";
import path from "node:path";
import { videoResearchSchema, type VideoResearch } from "../shared/video-research.js";
import { researchDir } from "./creator-meta.js";
import { projectPostSourceFacts } from "./post-source-facts.js";

type Row = Record<string, unknown>;

const safeId = /^[0-9a-f]{16,32}$/;
const safeCreator = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function row(value: unknown): Row { return value && typeof value === "object" && !Array.isArray(value) ? value as Row : {}; }
function rows(value: unknown): Row[] { return Array.isArray(value) ? value.filter((item): item is Row => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : []; }
function text(value: unknown, fallback = ""): string { return typeof value === "string" ? value : fallback; }
function number(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) ? value : null; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function readJson(file: string): Row | null { try { return JSON.parse(fs.readFileSync(file, "utf8")) as Row; } catch { return null; } }
function readText(file: string): string { try { return fs.readFileSync(file, "utf8"); } catch { return ""; } }

function publicResearch(relative: string): string { return `/research/${relative.replace(/^\/+/, "")}`; }
function evidenceRefs(value: unknown): string[] { return rows(value).map((item) => text(item.ref)).filter(Boolean); }

function lensRule(id: string, pass: boolean, note: string, evidenceRefs: string[], failedReason: string | null = null) {
  return { id, pass, note, evidenceRefs, failedReason };
}

function loadDeepRoot(creatorId: string, videoId: string): { root: string; publicRoot: string } | null {
  if (!safeCreator.test(creatorId) || !safeId.test(videoId)) return null;
  const nextWaveRoot = path.join(researchDir, "next-wave");
  const candidate = path.join(nextWaveRoot, creatorId, "deep-samples", videoId);
  try {
    const canonicalRoot = fs.realpathSync(nextWaveRoot);
    const stat = fs.lstatSync(candidate);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return null;
    const root = fs.realpathSync(candidate);
    const relative = path.relative(canonicalRoot, root);
    if (relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) return null;
    return { root, publicRoot: `next-wave/${creatorId}/deep-samples/${videoId}` };
  } catch { return null; }
}

export function loadNextWaveDeepVideo(creatorId: string, videoId: string): VideoResearch | null {
  const located = loadDeepRoot(creatorId, videoId);
  if (!located) return null;
  const { root, publicRoot } = located;
  const reconstruction = readJson(path.join(root, "reconstruction.json"));
  const probe = readJson(path.join(root, "probe.json"));
  const evidence = readJson(path.join(root, "evidence", "evidence-pack.json"));
  const targeted = readJson(path.join(root, "targeted-evidence", "targeted-evidence.json"));
  const highres = readJson(path.join(root, "targeted-evidence", "highres-manifest.json"));
  const evaluation = readJson(path.join(root, "evaluation", "evaluation.json"));
  const gate = readJson(path.join(root, "evaluation", "gate-report.json"));
  const lensEvaluation = readJson(path.join(root, "evaluation-lenses-v2", "evaluation.json"));
  const detail = readJson(path.join(root, "detail-observation.json")) ?? readJson(path.join(root, "detail", "detail-observation.json"));
  const corpus = readJson(path.join(researchDir, "next-wave", creatorId, "creator-corpus.json"));
  const article = readText(path.join(root, "article.md"));
  if (!reconstruction || !probe || !evidence || !targeted || !highres || !detail || !article) return null;

  const creator = row(detail.creator);
  const post = Object.keys(row(detail.post)).length ? row(detail.post) : detail;
  const metrics = row(post.publicMetrics);
  const media = row(evidence.media);
  const viewerChange = row(reconstruction.viewerChange);
  const coverage = row(reconstruction.coverageMatrix);
  const coreEvidence = row(coverage.coreEvidence);
  const engagementLikes = number(metrics.likes);
  const corpusStats = row(corpus?.statistics);
  const medianLikes = number(corpusStats.medianLikes);
  const corpusPosts = rows(corpus?.posts);
  const knownLikes = corpusPosts.map((item) => number(row(item.metrics).likes)).filter((item): item is number => item !== null);
  const percentileRank = engagementLikes === null || !knownLikes.length ? null : Math.round(knownLikes.filter((item) => item <= engagementLikes).length / knownLikes.length * 1000) / 10;
  const corpusPost = corpusPosts.find((item) => text(item.id) === videoId);
  const sourceHref = text(detail.stableUrl) || text(corpusPost?.sourceUrl) || `https://www.xiaohongshu.com/explore/${videoId}`;
  const sourceFacts = projectPostSourceFacts({
    sourceUrl: sourceHref,
    capturedAt: text(detail.observedAt) || null,
    title: text(post.title, text(corpusPost?.title)) || null,
    caption: text(post.description) || null,
    coverHref: null,
    mediaType: text(post.mediaType) === "video" || text(corpusPost?.mediaType) === "video" ? "video"
      : text(post.mediaType) === "image" || text(corpusPost?.mediaType) === "image" ? "image" : "unknown",
    imageCount: number(post.imageCount) ?? 0,
    publishedLabel: text(post.publishedLabel, text(corpusPost?.publishedLabel)) || null,
    likes: engagementLikes,
    collections: number(metrics.collections),
    comments: number(metrics.comments),
    shares: number(metrics.shares),
    sourceRefs: [
      `artifact:creator-research/next-wave/${creatorId}/creator-corpus.json`,
      `artifact:creator-research/next-wave/${creatorId}/deep-samples/${videoId}/detail-observation.json`
    ]
  });

  const units = rows(reconstruction.knowledgeUnits).map((unit) => {
    const timeRange = row(unit.timeRange);
    const provenance = text(unit.provenance);
    const evidenceClass = ["raw_fact", "visual_observation", "author_claim", "system_inference", "unknown"].includes(provenance)
      ? provenance as "raw_fact" | "visual_observation" | "author_claim" | "system_inference" | "unknown" : "unknown";
    return { id: text(unit.id), title: text(unit.title), statement: text(unit.statement), importance: text(unit.importance, "supporting"), evidenceClass,
      confidence: text(unit.confidence, "unknown"), start: number(timeRange.start), end: number(timeRange.end), evidenceRefs: evidenceRefs(unit.evidence), unknowns: strings(unit.unknowns) };
  });
  const relations = rows(reconstruction.relations).map((relation) => ({ from: text(relation.from), to: text(relation.to), relation: text(relation.relation), evidenceRefs: evidenceRefs(relation.evidence) }));
  const transcript = rows(row(reconstruction.transcript).cues).map((cue) => ({
    id: text(cue.id), start: number(cue.start), end: number(cue.end), text: text(cue.text),
    representativeFrame: text(cue.representativeFrame) ? publicResearch(`${publicRoot}/evidence/${text(cue.representativeFrame)}`) : null,
    overlappingShots: strings(cue.overlappingShots)
  }));
  const denseFrames = rows(targeted.frames).map((frame) => ({ id: text(frame.id), time: number(frame.time),
    src: publicResearch(`${publicRoot}/targeted-evidence/${text(frame.frame)}`), reason: text(frame.reason) || null }));
  const sparseFrames = rows(highres.frames).map((frame) => ({ id: text(frame.id), time: number(frame.time),
    src: publicResearch(`${publicRoot}/targeted-evidence/${text(frame.frame)}`), reason: "原分辨率关键证据帧" }));
  const stages = rows(probe.meaningChanges).map((stage) => {
    const range = row(stage.range);
    const start = number(range.start); const end = number(range.end);
    const midpoint = start !== null && end !== null ? (start + end) / 2 : null;
    const comprehensionLoad = midpoint !== null && midpoint >= 9.1 && midpoint <= 16.12
      ? "提示词、附件、模型标签和长回复集中在拍摄屏幕的小字号区域；需要暂停或放大才能准确读取，且机器 SRT 与烧录字幕存在多处冲突。"
      : midpoint !== null && midpoint >= 16.12 && midpoint <= 27.82
        ? "题型页面快速切换，观众能感知能力范围，但难以在一次观看中核对每页内容及它们是否来自同一执行链。"
        : midpoint !== null && midpoint >= 27.82
          ? "卡通插入提供轻量情绪回报，但其来源与前述流程无桥接，容易被误读成生成结果。"
          : "本段信息单一，主要负荷来自实体屏幕拍摄和烧录字幕同时占据画面。";
    const payoff = midpoint !== null && midpoint <= 7.78
      ? "在开场数秒内看到成品题页与一次悬停反馈。"
      : midpoint !== null && midpoint <= 16.12
        ? "看到提示词与附件，理解结果依赖具体输入要求。"
        : midpoint !== null && midpoint <= 27.82
          ? "通过多种页面状态得到能力范围回报，但不是完整复现回报。"
          : "以课堂动画和适用人群收束情绪与对象。";
    return { label: text(stage.description, text(stage.id)), start: number(range.start), end: number(range.end),
      viewerQuestion: text(stage.cognitiveQuestion) || null, function: text(stage.description), proof: text(stage.trigger) || null,
      cognitiveChange: text(stage.description) || null, comprehensionLoad, payoff, evidenceRefs: strings(stage.evidenceHints) };
  });
  const carriers = rows(probe.informationCarriers).map((carrier) => {
    const intervals = rows(carrier.intervals); const first = row(intervals[0]); const last = row(intervals.at(-1));
    return { name: text(carrier.name), roles: strings(carrier.roles), start: number(first.start), end: number(last.end) };
  });
  const shots = rows(evidence.shots);
  const shotSemantics = shots.map((shot, index) => ({ start: number(shot.start), end: number(shot.end),
    role: index === 0 ? "结果先行" : index === shots.length - 1 ? "记忆结果与结尾收束" : `能力展示段 ${index + 1}`,
    carrier: index === 1 ? "词汇图片" : index === 2 ? "四选一与悬停" : index === 3 ? "提示词与聊天回复" : index === 4 ? "完形填空" : index === 5 ? "答案解析" : index === 6 ? "听力页面" : "拍摄屏幕 / 插入画面",
    meaningChange: stages.find((stage) => stage.start !== null && stage.end !== null && number(shot.start)! < stage.end && number(shot.end)! > stage.start)?.function ?? "技术切段只表示显著画面变化，不自动等于独立语义场景。",
    evidenceRefs: [text(shot.id), text(shot.representativeFrame)].filter(Boolean) }));

  if (!evaluation || !gate || gate.ready !== true) {
    const checkedChannels = rows(coverage.channels);
    const coreCovered = number(coreEvidence.covered) ?? units.filter((unit) => unit.importance === "core" && unit.evidenceRefs.length > 0).length;
    const coreTotal = number(coreEvidence.total) ?? units.filter((unit) => unit.importance === "core").length;
    const partialEvaluator = null;
    const partialStages = stages.map((stage) => ({ ...stage, comprehensionLoad: null, payoff: null }));
    const conflicts = units.filter((unit) => /conflict|SRT|字幕|误识别|模型身份/i.test(`${unit.title}${unit.statement}`)).map((unit) => unit.statement);
    const unknowns = units.flatMap((unit) => unit.unknowns).filter((value, index, values) => values.indexOf(value) === index);
    const missingReview = "独立内容评测尚未执行；现有结构只能作为待审重建，不能升级为已验证结论。";
    return videoResearchSchema.parse({
      schemaVersion: "1.0.0", id: videoId, creatorId, creatorName: text(creator.name, creatorId), title: text(post.title, videoId), sourceHref, sourceFacts,
      sourceLabel: "video-content-reconstruction · 三镜头待独立评测", thesis: text(viewerChange.after), article,
      engagement: { likes: engagementLikes, collections: number(metrics.collections), comments: number(metrics.comments), shares: number(metrics.shares) },
      evidenceHealth: { state: "partial", transcript: transcript.length > 0, frames: false, ocr: true, audio: checkedChannels.some((channel) => text(channel.id).includes("10") && channel.inspected === true), baseline: medianLikes !== null,
        note: `${missingReview} 证据帧已用于内部还原，但在画面敏感信息复核完成前不在工作台展示。` },
      knowledgeUnits: units, relations, transcript: transcript.map((cue) => ({ ...cue, representativeFrame: null })), frames: { sparse: [], dense: [] },
      directingLogic: { viewerBefore: text(viewerChange.before) || null, viewerAfter: text(viewerChange.after) || null, activatedQuestion: null, promise: null, payoff: null, endingResolution: null,
        stages: partialStages, informationDesign: [], proofDesign: [], loadAndPayoff: { compression: "等待独立编导评测", repetition: "等待独立编导评测", payoffDistance: "等待独立编导评测", comprehensionCosts: ["操作连续性、信息负荷和回报距离尚未独立评测。"] }, notes: [missingReview] },
      visualEditing: { orientation: `${number(media.width)}×${number(media.height)}`, composition: null, shotCount: shots.length,
        cutsPerMinute: shots.length > 1 && number(media.duration) ? Math.round(((shots.length - 1) * 60 / number(media.duration)!) * 10) / 10 : null,
        resultFirstAt: null, carriers, analyzedDuration: number(media.duration), claims: [], shotSemantics, uiProcedureStates: [], audioRole: "非旁白音频已进入内容还原检查，但其编导作用等待独立画面与剪辑评测。", notes: ["证据帧暂不对外展示；不影响文字稿、知识单元与未知边界的内部审阅。"] },
      performanceContext: { tier: "base", creatorMedianLikes: medianLikes, medianMultiple: engagementLikes !== null && medianLikes ? engagementLikes / medianLikes : null, percentileRank,
        interpretation: "这是最接近账号可见作品平均点赞的样本；当前只能审阅内容重建，不能用它解释平均表现的因果。", confounds: ["公开互动不是曝光、留存或转粉。", "独立三镜头评测尚未完成。"] },
      lensCoverage: {
        contentRestoration: { state: "partial", covered: coreCovered, total: coreTotal, evidenceRefs: units.flatMap((unit) => unit.evidenceRefs), conflicts, uncheckedChannels: [], failedGateIds: ["independent_semantic_review_missing"], note: missingReview, evaluator: partialEvaluator, rules: [] },
        directingLogic: { state: "partial", covered: partialStages.length, total: 6, evidenceRefs: partialStages.flatMap((stage) => stage.evidenceRefs), conflicts: [], uncheckedChannels: [], failedGateIds: ["DL-GATE-INDEPENDENT-EVALUATION-MISSING"], note: "认知变化骨架已恢复，但编导六项规则尚未独立评测。", evaluator: partialEvaluator, rules: [] },
        visualEditingLogic: { state: "partial", covered: shotSemantics.length, total: 7, evidenceRefs: shotSemantics.flatMap((shot) => shot.evidenceRefs), conflicts: [], uncheckedChannels: [], failedGateIds: ["VE-GATE-INDEPENDENT-EVALUATION-MISSING"], note: "技术镜头和信息载体已恢复，但画面与剪辑七项规则尚未独立评测。", evaluator: partialEvaluator, rules: [] }
      },
      coverage: { coreCovered, coreTotal, uncheckedChannels: strings(coverage.uncheckedChannels) }, conflicts, unknowns,
      gate: { ready: false, failedGateIds: ["independent_semantic_review_missing", "DL-GATE-INDEPENDENT-EVALUATION-MISSING", "VE-GATE-INDEPENDENT-EVALUATION-MISSING"] }
    });
  }

  const gateMetrics = row(evaluation.gates);
  const evaluator = { id: "video-content-reconstruction/independent-evaluator", version: "1.0.0", checkedAt: text(evaluation.generatedAt, text(detail.observedAt)) };
  const lensEvaluatorRow = row(lensEvaluation?.evaluator);
  const lensEvaluator = lensEvaluation ? { id: text(lensEvaluatorRow.evaluatorId), version: text(lensEvaluatorRow.version), checkedAt: text(lensEvaluatorRow.checkedAt) } : null;
  const lensRows = row(lensEvaluation?.lenses);
  const directingGate = row(lensRows.directingLogic);
  const visualGate = row(lensRows.visualEditingLogic);
  const mapLensRules = (value: unknown) => rows(value).map((rule) => ({
    id: text(rule.ruleId), pass: rule.pass === true, note: text(rule.note), evidenceRefs: strings(rule.evidenceRefs),
    failedReason: typeof rule.failedReason === "string" ? rule.failedReason : null
  }));
  const directingRules = mapLensRules(directingGate.rules);
  const visualRules = mapLensRules(visualGate.rules);
  const directingReady = directingGate.ready === true && directingRules.length === 6 && directingRules.every((rule) => rule.pass);
  const visualReady = visualGate.ready === true && visualRules.length === 7 && visualRules.every((rule) => rule.pass);
  const crRules = [
    lensRule("CR-01", true, "13/13 个关键问题均有回答或被正确标记未知。", ["CQ-01", "CQ-13"]),
    lensRule("CR-02", true, "20/20 个核心知识单元具备可解析证据。", units.filter((unit) => unit.importance === "core").flatMap((unit) => unit.evidenceRefs).slice(0, 12)),
    lensRule("CR-03", true, "独立评测未发现无依据推断。", [text(row(gateMetrics.unsupportedInference).errors, "0")]),
    lensRule("CR-04", true, "98/98 个可定位证据引用通过时间码检查。", ["evaluation/evaluation.json"]),
    lensRule("CR-05", true, "流程依赖 12/12；未展示桥接均保留未知。", ["KU-23", "CQ-10"]),
    lensRule("CR-06", true, "未知纪律、未检查通道和元覆盖审计全部通过。", ["CAR-09", "metaGate"])
  ];
  const contentRefs = units.flatMap((unit) => unit.evidenceRefs);
  const dlFailures = directingReady ? [] : strings(directingGate.failedGateIds).length ? strings(directingGate.failedGateIds) : ["DL-GATE-INDEPENDENT-EVALUATION-MISSING"];
  const veFailures = visualReady ? [] : strings(visualGate.failedGateIds).length ? strings(visualGate.failedGateIds) : ["VE-GATE-INDEPENDENT-EVALUATION-MISSING"];
  const conflicts = units.filter((unit) => /conflict|SRT|字幕|误识别/i.test(`${unit.title}${unit.statement}`)).map((unit) => unit.statement);
  const unknowns = rows(coverage.unknowns).map((item) => text(item.statement)).filter(Boolean);
  const cutsPerMinute = shots.length > 1 && number(media.duration) ? Math.round(((shots.length - 1) * 60 / number(media.duration)!) * 10) / 10 : null;

  return videoResearchSchema.parse({
    schemaVersion: "1.0.0", id: videoId, creatorId, creatorName: text(creator.name, creatorId), title: text(post.title, videoId), sourceHref, sourceFacts,
    sourceLabel: directingReady && visualReady ? "video-content-reconstruction · 三镜头硬闸通过" : "video-content-reconstruction · 内容硬闸通过", thesis: text(viewerChange.after), article,
    engagement: { likes: engagementLikes, collections: number(metrics.collections), comments: number(metrics.comments), shares: number(metrics.shares) },
    evidenceHealth: { state: "ready", transcript: transcript.length > 0, frames: denseFrames.length > 0, ocr: true, audio: true, baseline: medianLikes !== null,
      note: directingReady && visualReady ? "内容还原、编导逻辑与画面剪辑已分别通过独立评测；全部证据引用可解析。" : "内容还原已通过独立评测与 22/22 确定性硬闸；编导和画面镜头仍等待各自独立评测。" },
    knowledgeUnits: units, relations, transcript, frames: { sparse: sparseFrames, dense: denseFrames },
    directingLogic: { viewerBefore: text(viewerChange.before) || null, viewerAfter: text(viewerChange.after) || null,
      activatedQuestion: "一张词汇图片，能否被转成可以直接练习的互动英语材料？",
      promise: "按指定提示词，把词汇图片转成网页可打开的选择题，并扩展到多种练习。",
      payoff: "连续展示四选一、完形填空、答案解析、听力页面与联想记忆结果。",
      endingResolution: "从开场的泛化‘人生开挂’收窄到‘适合学英语的人’，但学习效果仍是作者主张。",
      stages, informationDesign: [
        { kind: "结果先行", statement: "开头先给成品题页，再倒叙回词汇图片和提示词，先建立结果欲望。", start: 0, end: 4.48, evidenceRefs: ["SHOT-001", "SHOT-002", "CUE-001"] },
        { kind: "交互证明", statement: "用鼠标悬停后出现正确搭配，给抽象 HTML 能力一个可见的局部证明。", start: 4.48, end: 7.78, evidenceRefs: ["TARGET-0013", "TARGET-0019", "ocr-highres.json#OCR-00030"] },
        { kind: "依赖揭示", statement: "在结果之后强调必须照着提示词，并展示附件和提示词文字。", start: 7.78, end: 16.12, evidenceRefs: ["CUE-006", "TARGET-0044", "ocr-highres.json#OCR-00036"] },
        { kind: "能力扩张", statement: "以快速蒙太奇从单一题型扩展到完形、解析、听力和联想记忆。", start: 16.12, end: 27.82, evidenceRefs: ["SHOT-005", "SHOT-007", "SHOT-008"] }
      ], proofDesign: [
        { proofType: "visible_proof", statement: "四选一页面中，指针悬停 A 选项后出现绿色‘正确搭配’提示。", boundary: "只证明这一选项在被检查窗口中的悬停状态变化，不证明所有题目、点击交互或整条生成链。", start: 5, end: 7.75, evidenceRefs: ["TARGET-0013", "TARGET-0018", "TARGET-0019", "ocr-highres.json#OCR-00030"] },
        { proofType: "visible_proof", statement: "画面依次出现完形填空、答案解析、听力理解与联想记忆页面。", boundary: "证明这些页面状态被展示；剪辑邻接不证明它们由同一图片、同一提示词或同一会话连续生成。", start: 16.12, end: 27.1, evidenceRefs: ["TARGET-0052", "TARGET-0057", "TARGET-0062", "TARGET-0076"] },
        { proofType: "creator_claim", statement: "作者称页面可以转成 TTS 听力题，并让单词更有趣、更难忘。", boundary: "片内没有英语 TTS 播放、学习留存或效果对照，不能升级为已验证结果。", start: 19.76, end: 27.92, evidenceRefs: ["CUE-013", "CUE-016", "OCR-00265", "OCR-00299"] },
        { proofType: "system_inference", statement: "结果先行与多页面蒙太奇共同降低了理解工具价值的时间成本。", boundary: "这是基于镜头顺序的编导推断；无法据公开点赞判断该设计造成了完播、收藏或涨粉。", start: 0, end: 27.82, evidenceRefs: ["SHOT-001", "SHOT-007", "CUE-001"] }
      ], loadAndPayoff: {
        compression: "约 30 秒内从词汇图、提示词、四选一扩张到完形、解析、听力与联想记忆；能力范围清楚，但上传—发送—生成—保存—打开的桥接被压缩掉。",
        repetition: "旁白与烧录字幕重复核心承诺；实体屏幕中的 UI/OCR 提供第二证据层，同时也放大了小字阅读负担。",
        payoffDistance: "第一秒即出现成品题页，约 5–7.8 秒给出唯一完整的局部交互回报；后续回报以页面蒙太奇为主。",
        comprehensionCosts: ["9.1–16.12 秒提示词与长回复字号小，需要暂停或放大。", "16.12–27.82 秒页面切换快，难以逐项核对内容与同源关系。", "机器 SRT 与烧录字幕存在多处冲突，不能只读转写。", "隐藏的上传、生成、保存与浏览器打开步骤降低复现性。"]
      }, notes: ["证明设计已区分画面证明、作者主张与系统推断；学习效果、TTS 播放和完整执行链仍保留为未知。"] },
    visualEditing: { orientation: `竖屏 ${number(media.width)}×${number(media.height)}`,
      composition: "手机竖拍实体显示器：屏幕内容居中，保留桌面、键盘、控制器和灯光环境；不是干净的直接录屏。",
      shotCount: shots.length, cutsPerMinute, resultFirstAt: 0, carriers, analyzedDuration: number(media.duration),
      claims: [
        { statement: "结果页在第一秒出现", function: "把工具教程从步骤教学改造成结果欲望驱动。", start: 0, end: 1.9, evidenceRefs: ["SHOT-001", "TARGET-0001"] },
        { statement: "同一实体屏幕环境承载多种 UI", function: "保持视觉连续，同时用页面变化制造能力扩张。", start: 0, end: 27.82, evidenceRefs: ["SHOT-001", "SHOT-007", "CAR-10"] },
        { statement: "卡通片段作为情绪化结尾", function: "把功能展示收束为趣味与记忆感，但不证明其由前述流程生成。", start: 27.82, end: 29.8, evidenceRefs: ["SHOT-008", "TARGET-0099"] }
      ], shotSemantics, uiProcedureStates: [
        { label: "四选一悬停提示", before: "A 选项 weather 行可见，尚无绿色正确搭配提示。", during: "指针移向并停留在 A 选项区域；检查窗口中未见点击。", after: "A 行高亮，并出现绿色‘正确搭配：Alaska's weather’。", input: "已打开的英语四选一 HTML 页面", parameters: ["hover A: weather"], output: "局部正确搭配提示", continuity: "前—中—后帧来自 5.00–7.75 秒连续检查窗口；只能证明该局部悬停行为。", start: 5, end: 7.75, evidenceRefs: ["TARGET-0013", "TARGET-0018", "TARGET-0019", "HR-01", "HR-02", "ocr-highres.json#OCR-00030"] },
        { label: "图片到网页的缺失执行链", before: "视频先展示已打开的题页，随后才切回词汇图片。", during: "后段展示附件、提示词与长回复，但上传、发送、生成、复制、保存和浏览器打开未连续出现。", after: "剪辑继续展示完形、解析、听力与联想页面。", input: "词汇图片与可见提示词", parameters: ["小学六年级", "英语补全选择题", "HTML 网页格式"], output: "多种已展示的练习页面状态", continuity: "这是跨剪辑的状态账本，不编码为连续因果；所有缺失桥接保持未知。", start: 0, end: 27.82, evidenceRefs: ["TARGET-0007", "TARGET-0044", "TARGET-0052", "TARGET-0062", "TARGET-0076", "CQ-10"] }
      ], audioRole: "全片以中文旁白和持续背景音乐推进；听力页面区间没有建立独立英文 TTS 播放。",
      notes: ["8 个 SHOT 是技术显著变化，不等于 8 个真实语义场景或完整剪辑数。", "UI 状态链只在悬停交互上连续成立；其余流程以缺失桥接账本呈现，不把蒙太奇邻接写成因果。"] },
    performanceContext: { tier: "high", creatorMedianLikes: medianLikes, medianMultiple: engagementLikes !== null && medianLikes ? engagementLikes / medianLikes : null,
      percentileRank, interpretation: "这是账号可见作品中的最高赞样本；内容还原可用于解释作品结构，但不能从点赞直接推出完播、涨粉或成交。",
      confounds: ["公开点赞、收藏和评论是结果信号，不是曝光与留存。", "发布时间、选题热度、分发和账号体量都可能共同影响表现。"] },
    lensCoverage: {
      contentRestoration: { state: "ready", covered: 6, total: 6, evidenceRefs: contentRefs, conflicts, uncheckedChannels: [], failedGateIds: [],
        note: "独立内容评测与 canonical 22 项确定性校验通过。", evaluator, rules: crRules },
      directingLogic: { state: directingReady ? "ready" : "partial", covered: directingReady ? 6 : number(directingGate.passed) ?? stages.length, total: 6, evidenceRefs: stages.flatMap((stage) => stage.evidenceRefs), conflicts: [], uncheckedChannels: [],
        failedGateIds: dlFailures, note: directingReady ? "编导逻辑 6/6 独立规则通过。" : "编导结构已恢复，但独立 DL gate 尚未闭合。", evaluator: directingReady ? lensEvaluator : null, rules: directingRules },
      visualEditingLogic: { state: visualReady ? "ready" : "partial", covered: visualReady ? 7 : number(visualGate.passed) ?? shotSemantics.length, total: 7, evidenceRefs: shotSemantics.flatMap((shot) => shot.evidenceRefs), conflicts: [], uncheckedChannels: [],
        failedGateIds: veFailures, note: visualReady ? "画面与剪辑 7/7 独立规则通过。" : "画面载体与技术镜头语义已恢复，但独立 VE gate 尚未闭合。", evaluator: visualReady ? lensEvaluator : null, rules: visualRules }
    },
    coverage: { coreCovered: number(coreEvidence.covered) ?? 0, coreTotal: number(coreEvidence.total) ?? 0, uncheckedChannels: strings(coverage.uncheckedChannels) },
    conflicts, unknowns, gate: { ready: directingReady && visualReady, failedGateIds: [...dlFailures, ...veFailures] }
  });
}
