import fs from "node:fs";
import path from "node:path";
import { PublishingService, type VariantInput } from "../packages/creation/index.js";
import { SQLitePublishingRepository } from "../packages/adapters/index.js";
import { runtimeDir } from "../packages/adapters/index.js";
import { createDurableKnowledgeSystem } from "../src/server/content-knowledge.js";
import type { ContentKnowledgeService, KnowledgeConceptView } from "../packages/knowledge/index.js";

type PackageBlueprint = {
  name: string;
  brief: string;
  conceptMatchers: string[];
  bindingRationales: string[];
  hypothesis: {
    statement: string;
    expectedSignals: string[];
    unavailableSignals: string[];
    baselineDeclaration: string;
    confounders: string[];
  };
  variant: VariantInput;
};

const projectRoot = path.resolve(import.meta.dirname, "..");
const sessionVideo = "/Users/hhh0x/hhh-video/session-forensics-long-task-drift/成片-观察者模式-v1.mp4";
const jieyangVideo = "/Users/hhh0x/hhh-video/jieyang-ar-launch/deliverable/揭阳进贤门AR-发布版.mp4";

const blueprints: PackageBlueprint[] = [
  {
    name: "Wave 4｜Agent 长任务跑偏",
    brief: "用一个真实的 42 小时失败案例，解释为什么 AI 长任务需要独立观察者，而不是让执行者自查。",
    conceptMatchers: ["强结果/反常识钩子", "痛点→输入→处理状态→结果"],
    bindingRationales: ["采用强失败结果开场，先让观众看到代价。", "改编工作流结构，把执行过程与观察者修复前后并列呈现。"],
    hypothesis: {
      statement: "如果用具体失败结果开场，并展示观察者介入前后的工作流对照，那么高意向收藏与追问会高于普通功能介绍。",
      expectedSignals: ["收藏", "询问观察者流程的评论"],
      unavailableSignals: ["曝光", "完播率", "转化"],
      baselineDeclaration: "以最近三条 AI 方法内容的收藏数和高意向评论数中位数为比较基线；若无法取得则记录为不可用。",
      confounders: ["标题中的 42 小时数字可能单独提高点击", "发布时间与平台推荐波动"]
    },
    variant: {
      platform: "xiaohongshu", title: "别让AI长任务偷偷跑偏",
      body: "一个 AI 任务认真跑了 42 小时，最后却把目标越做越偏。\n\n真正的问题不是它不努力，而是执行者同时负责自查。这个视频展示我如何把“观察者”从主任务里拆出来：独立读 trace、定位漂移、在关键节点纠偏。\n\n不是多加一层汇报，而是给长任务装一套不会被执行惯性带跑的反馈回路。",
      contentType: "video", media: [{ kind: "video", localPath: sessionVideo, mimeType: "video/mp4" }],
      tags: ["AI工作流", "Agent", "Codex", "效率工具"], visibility: "public", scheduledAt: null,
      platformOptions: { xiaohongshu: { location: null, allowDownload: true, allowCopy: true } }
    }
  },
  {
    name: "Wave 4｜揭阳进贤门 AR",
    brief: "从回到家乡的真实场景切入，展示把古城门做成可扫描 AR 动画的制作过程、失败与结果。",
    conceptMatchers: ["作者立场/人物愿望", "从当天场景或个人事件切入"],
    bindingRationales: ["采用人物愿望与冲突升级结构，让技术服务于家乡叙事。", "采用现场事件切入，再把个人项目提升为古城文化的新表达。"],
    hypothesis: {
      statement: "如果先展示进贤门在手机里‘活起来’的结果，再讲个人愿望与制作失败，那么收藏和本地用户评论会高于纯技术演示。",
      expectedSignals: ["收藏", "揭阳本地身份评论", "询问体验入口的评论"],
      unavailableSignals: ["曝光", "完播率", "线下扫码转化"],
      baselineDeclaration: "以同账号最近三条技术演示内容的收藏和评论中位数为基线；本地身份评论单独计数。",
      confounders: ["家乡情绪可能高于 AR 技术本身", "节假日与本地热点流量"]
    },
    variant: {
      platform: "xiaohongshu", title: "我让进贤门在手机里活了",
      body: "回揭阳以后，我一直想让进贤门不只是游客相册里的一张照片。\n\n这次我把它做成了可以扫描触发的 AR 动画：从找素材、搭场景，到真机里一次次对不准，再到最后让古城门在现实画面里动起来。\n\n技术只是手段。我更想试试看，我们能不能用今天的媒介，重新认识一座熟悉的古城。",
      contentType: "video", media: [{ kind: "video", localPath: jieyangVideo, mimeType: "video/mp4" }],
      tags: ["揭阳", "进贤门", "AR", "潮汕", "数字文旅"], visibility: "public", scheduledAt: null,
      platformOptions: { xiaohongshu: { location: "揭阳进贤门", allowDownload: true, allowCopy: true } }
    }
  },
  {
    name: "Wave 4｜20 个 AI 博主内容 Wiki",
    brief: "展示 Signal Room 如何把帖子、博主和跨博主研究沉淀成可追溯的内容决策，而不是生成一堆看似正确的总结。",
    conceptMatchers: ["自有产品内容反复组合三种证明", "中段常把中心观点拆成编号原则", "结尾常把案例回扣为更高层"],
    bindingRationales: ["采用需求来源、操作状态、最终成品三种证明，避免只讲产品愿景。", "采用编号工作流解释帖子、博主、跨博主三个层级。", "把案例回扣为人负责裁决、LLM 负责积累的知识分工。"],
    hypothesis: {
      statement: "如果同时展示真实数据、工作台界面和一条可追溯知识链，那么收藏与产品机制追问会高于只展示界面截图。",
      expectedSignals: ["收藏", "询问知识链或开源地址的评论"],
      unavailableSignals: ["曝光", "图片停留时长", "转化"],
      baselineDeclaration: "以此前工作台截图类内容为基线；若历史数据不可取得，则本帖只建立首轮基线，不做胜负判断。",
      confounders: ["19 个博主的数量承诺可能影响点击", "开源项目本身可能带来额外关注"]
    },
    variant: {
      platform: "xiaohongshu", title: "我把19个AI博主做成内容Wiki",
      body: "我不想再让 AI 每次分析完就失忆。\n\n所以我把 19 个 AI 博主和他们的帖子放进一个工作台：\n1. 先还原单帖讲了什么、怎么编排、画面怎么证明；\n2. 再找出一个博主稳定有效和反复失效的模式；\n3. 最后才比较不同博主之间共同成立的机制。\n\n每个结论都能回到原帖、时间点和证据；创作时固定使用哪一版知识，发布后再把真实结果送回来验证。\n\n这才是我理解的 LLM Wiki：不是 AI 替人写百科，而是一套能持续学习、又不会偷偷改写历史的内容决策系统。",
      contentType: "image",
      media: ["actual-creator.png", "actual-creators.png", "actual-video.png"].map((file) => ({ kind: "image" as const, localPath: path.join(projectRoot, file), mimeType: "image/png" })),
      tags: ["AI工作台", "内容创作", "LLMWiki", "小红书运营"], visibility: "public", scheduledAt: null,
      platformOptions: { xiaohongshu: { location: null, allowDownload: true, allowCopy: true } }
    }
  }
];

function findConcept(concepts: KnowledgeConceptView[], matcher: string): KnowledgeConceptView {
  const match = concepts.find((item) => [item.research.concept.name, item.research.currentRevision.definition]
    .some((value) => value.includes(matcher)) && ["active", "qualified", "contradicted"].includes(item.research.concept.status));
  if (!match) throw new Error(`找不到已审核的 Knowledge：${matcher}`);
  return match;
}

function sourceRefs(concepts: KnowledgeConceptView[]): string[] {
  return [...new Set(concepts.flatMap((item) => [
    `knowledge-revision:${item.research.currentRevision.id}`,
    ...item.research.observations.flatMap((observation) => [
      `analysis-revision:${observation.analysisRevisionId}`,
      ...observation.evidenceRefs
    ])
  ]))].slice(0, 50);
}

function createPackage(
  publishing: PublishingService,
  knowledge: ContentKnowledgeService,
  concepts: KnowledgeConceptView[],
  blueprint: PackageBlueprint
) {
  const existing = publishing.listPackages(200).find((item) => item.name === blueprint.name);
  if (existing) return { packageId: existing.id, state: "existing" as const };
  for (const media of blueprint.variant.media) {
    if (!fs.existsSync(media.localPath)) throw new Error(`真实素材不存在：${media.localPath}`);
  }
  const selected = blueprint.conceptMatchers.map((matcher) => findConcept(concepts, matcher));
  const contentPackage = publishing.createPackage({ name: blueprint.name, brief: blueprint.brief, sourceRefs: sourceRefs(selected) });
  const snapshot = publishing.listPackageSnapshots(contentPackage.id)[0];
  if (!snapshot) throw new Error(`内容包没有初始快照：${blueprint.name}`);
  const bindings = selected.map((item, index) => knowledge.createBinding({
    operationKey: `wave4:${contentPackage.id}:binding:${item.research.currentRevision.id}`,
    contentPackageId: contentPackage.id,
    contentPackageSnapshotId: snapshot.id,
    targetType: "concept_revision",
    targetId: item.research.currentRevision.id,
    usage: index === 0 ? "adopt" : "adapt",
    rationale: blueprint.bindingRationales[index] ?? blueprint.bindingRationales.at(-1) ?? "用于本次真实创作决策。"
  }));
  knowledge.createHypothesis({
    operationKey: `wave4:${contentPackage.id}:hypothesis`,
    contentPackageId: contentPackage.id,
    contentPackageSnapshotId: snapshot.id,
    linkedBindingIds: bindings.map((item) => item.id),
    ...blueprint.hypothesis
  });
  const variant = publishing.createVariant(contentPackage.id, { ...blueprint.variant, contentPackageSnapshotId: snapshot.id });
  return { packageId: contentPackage.id, snapshotId: snapshot.id, variantId: variant.id, state: "created" as const };
}

const knowledgeFile = path.join(runtimeDir(), "content-knowledge.sqlite");
const researchFile = path.join(runtimeDir(), "research-learning.sqlite");
const publishingFile = path.join(runtimeDir(), "self-media.sqlite");
const { contentKnowledge, researchLearning } = createDurableKnowledgeSystem(knowledgeFile, researchFile);
const publishing = new PublishingService(new SQLitePublishingRepository(publishingFile), { exists: fs.existsSync }, null);

try {
  const concepts = contentKnowledge.listKnowledge();
  const results = blueprints.map((blueprint) => createPackage(publishing, contentKnowledge, concepts, blueprint));
  console.log(JSON.stringify({ runtime: runtimeDir(), results }, null, 2));
} finally {
  publishing.close();
  contentKnowledge.close();
  researchLearning.close();
}
