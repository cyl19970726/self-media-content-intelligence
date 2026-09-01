import {
  creatorCorpusSchema,
  creatorPortfolioAnnotationRowSchema,
  creatorPortfolioAnnotationsSchema,
  type CreatorCorpus,
  type CreatorPortfolioAnnotationRow,
  type CreatorPortfolioAnnotations
} from "./contracts.js";

type Rule = { value: string; patterns: RegExp[] };

const topicRules: Rule[] = [
  { value: "AI 编程与开发", patterns: [/coding|代码|编程|开发|程序员|harness|cli|ide/i] },
  { value: "Agent 与自动化工作流", patterns: [/agent|智能体|自动|工作流|workflow|graph|skill/i] },
  { value: "模型与底层概念", patterns: [/模型|model|大模型|llm|transformer|token|推理|上下文/i] },
  { value: "AI 产品与工具", patterns: [/产品|工具|应用|软件|平台|claude|chatgpt|openai|gemini|cursor/i] },
  { value: "AI 学习与职业", patterns: [/学习|入门|课程|职场|工作|面试|转型|学生|毕业/i] },
  { value: "行业判断与趋势", patterns: [/趋势|未来|时代|行业|创业|商业|机会|门槛/i] }
];

const problemRules: Rule[] = [
  { value: "理解一个 AI 概念", patterns: [/什么是|区别|原理|讲清楚|为什么|到底/i] },
  { value: "完成一个具体操作", patterns: [/怎么|如何|教程|步骤|使用|搭建|实现|分钟/i] },
  { value: "选择或判断工具与路线", patterns: [/选择|对比|哪个好|值得|不要|必须|真正|避坑/i] },
  { value: "跟上产品与行业变化", patterns: [/更新|发布|最新|趋势|未来|刚刚|来了/i] }
];

function matches(text: string, rules: Rule[]): string[] {
  return rules.filter((rule) => rule.patterns.some((pattern) => pattern.test(text))).map((rule) => rule.value);
}

function refs(source: string, index: number, field: "title" | "visibleText" | "mediaType" | "likes"): string[] {
  return [`${source}#/records/${index}/${field}`];
}

function fields(values: string[], evidenceRefs: string[]) {
  return [...new Set(values)].map((value) => ({ value, evidenceRefs }));
}

function annotate(corpus: CreatorCorpus, source: string, index: number): CreatorPortfolioAnnotationRow {
  const post = corpus.records[index]!;
  const title = post.title?.trim() ?? "";
  const titleRefs = refs(source, index, post.title ? "title" : "visibleText");
  const topics = matches(title, topicRules);
  const problems = matches(title, problemRules);
  const formats = [
    ...(/什么是|区别|原理|讲清楚|为什么|到底/i.test(title) ? ["概念解释"] : []),
    ...(/怎么|如何|教程|步骤|使用|搭建|实现|分钟/i.test(title) ? ["操作教程"] : []),
    ...(/对比|区别|哪个好|vs/i.test(title) ? ["对比判断"] : []),
    ...(/不要|必须|真正|避坑|门槛|最/i.test(title) ? ["观点判断"] : [])
  ];
  const promises = [
    ...(/分钟|快速|一次|从头到尾|讲清楚/i.test(title) ? ["降低理解或操作成本"] : []),
    ...(/怎么|如何|教程|步骤|使用|搭建|实现/i.test(title) ? ["给出可执行方法"] : []),
    ...(/区别|对比|哪个好|选择|值得/i.test(title) ? ["帮助做选择"] : [])
  ];
  const values = [
    ...(problems.includes("理解一个 AI 概念") ? ["建立理解"] : []),
    ...(problems.includes("完成一个具体操作") ? ["推动行动"] : []),
    ...(problems.includes("选择或判断工具与路线") ? ["辅助决策"] : []),
    ...(problems.includes("跟上产品与行业变化") ? ["提供变化感知"] : [])
  ];
  const architecture = [
    ...(/[？?]|什么是|为什么|怎么|如何/i.test(title) ? ["标题以问题或任务建立入口"] : []),
    ...(/分钟|\d+个|\d+步|第一|最/i.test(title) ? ["标题使用数字或强程度词压缩承诺"] : []),
    ...(/不要|必须|真正|区别|对比|但|却/i.test(title) ? ["标题使用冲突或判断制造张力"] : [])
  ];
  const classified = topics.length + problems.length + formats.length + promises.length + values.length + architecture.length > 0;
  return creatorPortfolioAnnotationRowSchema.parse({
    postExternalId: post.externalId,
    sourceUrl: post.url,
    title: post.title,
    mediaType: post.mediaType,
    likes: post.likes,
    classification: classified ? "classified" : "unclassified",
    confidence: title && post.visibleText ? "medium" : "low",
    evidenceScope: [post.title ? "title" : "visible_text", "media_type", ...(post.likes === null ? [] : ["public_metric" as const])],
    topics: fields(topics.length ? topics : ["未归类主题"], titleRefs),
    formats: fields(formats.length ? formats : [post.mediaType === "video" ? "视频（内容形式未知）" : "图文（内容形式未知）"], refs(source, index, "mediaType")),
    audienceProblems: fields(problems.length ? problems : ["受众问题未知"], titleRefs),
    promises: fields(promises.length ? promises : ["标题未表达明确承诺"], titleRefs),
    values: fields(values.length ? values : ["用户价值未知"], titleRefs),
    proofModes: fields(["标题层未见可验证证明"], titleRefs),
    visualSignals: fields(["未检查封面与正文画面"], refs(source, index, "mediaType")),
    contentArchitectureSignals: fields(architecture.length ? architecture : ["正文结构未知"], titleRefs),
    conflicts: [],
    unknowns: [
      "表层标注不能证明正文实际讲了什么、如何论证或如何剪辑。",
      "公开点赞不等于曝光、完播、转粉、投放或成交。"
    ]
  });
}

export function buildCreatorPortfolioAnnotations(
  input: unknown,
  sourceCorpusArtifactRef: string,
  generatedAt: string
): CreatorPortfolioAnnotations {
  const corpus = creatorCorpusSchema.parse(input);
  const rows = corpus.records.map((_, index) => annotate(corpus, sourceCorpusArtifactRef, index));
  const classifiedPosts = rows.filter((row) => row.classification === "classified").length;
  return creatorPortfolioAnnotationsSchema.parse({
    schemaVersion: "portfolio-annotations@1",
    runId: corpus.runId,
    annotationRevision: "title-surface-v1",
    generatedAt,
    sourceCorpusArtifactRef,
    denominator: {
      observedPosts: corpus.records.length,
      annotatedPosts: rows.length,
      classifiedPosts,
      unclassifiedPosts: rows.length - classifiedPosts,
      parity: rows.length === corpus.records.length
    },
    rows,
    boundaries: [
      "本层只使用主页标题、可见文字、媒介类型和公开点赞；没有检查正文、评论、封面细节或后台数据。",
      "未归类也是正式结果，不会为了覆盖率编造主题、证明方式、视觉或内容结构。",
      "深度 Builder / Evaluator 结论仍保存在单视频 Artifact，不由表层标注替代。"
    ]
  });
}
