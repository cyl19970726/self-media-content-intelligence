import type { WorkflowArtifact, WorkflowAttemptRecord, WorkflowEvent, WorkflowPhase, WorkflowRunState, WorkflowStepRecord } from "./contracts";

const stateLabels: Record<WorkflowRunState, string> = {
  queued: "等待执行", running: "执行中", waiting: "等待子流程", blocked: "已阻塞", needs_review: "待处理", succeeded: "执行完成", failed: "执行失败", canceled: "已取消"
};
export const workflowStateLabel = (state: WorkflowRunState) => stateLabels[state];
export const workflowReaderLabel = (workflowId: string): string => workflowId.startsWith("post.") ? "单帖研究"
  : workflowId.startsWith("creator.") ? "博主研究" : "工作流执行";

export function originalPostReportHref(creatorId: string | null | undefined, creatorRunId: string | null | undefined,
  postId: string | null | undefined): string | null {
  return creatorId && creatorRunId && postId
    ? `/creators/${encodeURIComponent(creatorId)}/videos/${encodeURIComponent(postId)}?run=${encodeURIComponent(creatorRunId)}` : null;
}
export const activeWorkflowState = (state: WorkflowRunState) => state === "queued" || state === "running" || state === "waiting";

export function reusedCandidateWithoutModel(phase: WorkflowPhase, steps: WorkflowStepRecord[], events: WorkflowEvent[]): boolean {
  if (phase.path.at(-1) !== "candidate-build") return false;
  const buildStepIds = new Set(steps.filter(step => step.key === "build" || step.key === "candidate-build:builder").map(step => step.id));
  if (!buildStepIds.size) return false;
  const buildEvents = events.filter(event => event.stepRunId && buildStepIds.has(event.stepRunId));
  const copied = buildEvents.some(event => event.type === "candidate.copied"
    && record(event.data)?.reason === "reuse_existing_candidate");
  const invoked = buildEvents.some(event => event.type === "agent.started" || event.type === "agent.usage"
    || event.type === "agent.lifecycle" && record(event.data)?.status === "started");
  return copied && !invoked;
}

function text(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  for (const key of ["summary", "message", "decision", "reason", "label", "route", "state"]) {
    const found = text(record[key]);
    if (found) return found;
  }
  return null;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

const roleLabels: Record<string, string> = {
  candidate: "构建候选报告", "post-builder": "构建候选报告", "post-reviewer": "独立评估", "post-repair": "定向修订",
  "creator-builder": "博主综合构建", "creator-reviewer": "博主综合独立评估", "creator-repair": "博主综合定向修订",
  generic_repair: "定向修订", generic_evaluator: "独立评估",
  content_restoration_evaluator: "内容还原评估", directing_logic_evaluator: "编导逻辑评估",
  visual_editing_evaluator: "画面与剪辑评估", runtime_repair: "运行修复", generic_recheck: "修订后复核",
  creator_synthesis: "博主综合构建", creator_synthesis_evaluator: "博主综合独立评估",
};
const lifecycleLabels: Record<string, string> = { started: "已启动", progress: "处理中", completed: "已完成", failed: "失败" };
const copiedLabels: Record<string, string> = {
  reuse_existing_candidate: "复用已固定候选", targeted_repair: "复制既有候选，准备定向修订", independent_review: "复制既有候选，准备独立复核",
};
export const stepLabel = (key: string): string => {
  if (key === "builder") return "构建候选报告";
  if (key === "build") return "构建候选";
  if (/^repair-evaluation:\d+$/u.test(key)) return `定向修复评估第 ${Number(key.split(":")[1]) + 1} 轮`;
  if (/^candidate-check(?::\d+)?$/u.test(key)) return "候选结构校验";
  if (key === "register-version") return "登记工作台版本";
  if (/^route:\d+$/u.test(key)) return "决定后续步骤";
  const match = key.match(/^(review|repair):(\d+)$/u);
  if (match) return `${match[1] === "review" ? "独立评估" : "定向修订"}（第 ${Number(match[2]) + 1} 轮）`;
  return key;
};

export function eventSummary(event: WorkflowEvent): string {
  const data = record(event.data);
  if (event.type === "agent.lifecycle" && data) {
    const role = typeof data.role === "string" ? roleLabels[data.role] ?? data.role : "子执行";
    const status = typeof data.status === "string" ? lifecycleLabels[data.status] ?? data.status : "状态未记录";
    return `${role}：${status}${typeof data.childRunId === "string" ? ` · 子执行 ${data.childRunId}` : ""}`;
  }
  if (event.type === "agent.delegate" && data) {
    const role = typeof data.role === "string" ? roleLabels[data.role] ?? data.role : "Agent";
    return typeof data.model === "string" ? `计划由${role}使用 ${data.model} 执行（不代表已完成）` : `已计划${role}执行（模型未记录）`;
  }
  if (event.type === "agent.started" && data) {
    const role = typeof data.agentId === "string" ? roleLabels[data.agentId] ?? data.agentId : "Agent";
    return typeof data.model === "string" ? `${role}已启动 · ${data.model}` : `${role}已启动`;
  }
  if (event.type === "candidate.copied" && data) {
    return typeof data.reason === "string" ? copiedLabels[data.reason] ?? "复制既有候选" : "复制既有候选";
  }
  if (event.type === "agent.completed") return "模型回合已完成，仍需合同校验与研究复核。";
  if (event.type === "agent.failed") return text(data?.error) ?? "模型执行失败。";
  return text(event.data) ?? `记录了 ${event.type.replaceAll("_", " ")} 事件`;
}

export const emptyArtifactMessage = (childRunCount: number): string => childRunCount > 0
  ? "成果保存在上述子流程中；打开构建或复核子流程查看对应资产。"
  : "这个运行尚未登记输出资产。";

export function stepSummary(step: WorkflowStepRecord, events: WorkflowEvent[]): string | null {
  if (step.error) return step.error;
  const related = events.filter((event) => event.stepRunId === step.id).at(-1);
  return related ? eventSummary(related) : null;
}

export function artifactLabel(artifact: WorkflowArtifact): string {
  const type = ({ "post-evidence": "冻结单帖来源", "post-source-check": "单帖来源检查", "post-candidate": "单帖候选报告", "post-evaluation": "单帖独立复核", "post-review": "单帖研究复核", "creator-review": "博主研究复核", "research-revision": "研究修订记录", "creator-evidence": "冻结综合来源", "creator-synthesis": "博主综合候选", "creator-synthesis-evaluation": "博主综合复核", "creator-evaluation": "博主综合复核" } as Record<string, string>)[artifact.type] ?? artifact.type;
  if (artifact.type === "post-source-check") return `${type} · ${artifact.schemaVersion} · 来源核对结果`;
  if (artifact.type === "post-review" || artifact.type === "creator-review") {
    const review = artifact.review === "passed" ? "审阅完成 · 无意见"
      : artifact.review === "findings" ? "审阅完成 · 有意见" : "审阅未完成";
    return `${type} · ${artifact.schemaVersion} · ${review}`;
  }
  if (artifact.type === "research-revision") return `${type} · ${artifact.schemaVersion} · 已修订 · 尚未再次独立审阅`;
  const assurance = artifact.review === "passed" ? "研究复核通过" : artifact.review === "findings" ? "研究复核有发现" : artifact.validation === "valid" ? "结构校验通过" : artifact.validation === "invalid" ? "结构校验失败" : "尚未校验";
  return `${type} · ${artifact.schemaVersion} · ${assurance}`;
}

export function isKnownArtifactType(type: string): boolean {
  return ["post-evidence", "post-source-check", "post-candidate", "post-evaluation", "post-review", "creator-review", "research-revision", "creator-evidence", "creator-synthesis", "creator-synthesis-evaluation", "creator-evaluation"].includes(type);
}

export function stepCanRetry(runState: WorkflowRunState, step: Pick<WorkflowStepRecord, "state" | "validation">): boolean {
  return ["failed", "needs_review"].includes(runState)
    && (step.state === "failed" || step.state === "needs_review" || step.validation === "invalid");
}

type Usage = { inputTokens: number | null; cachedInputTokens: number | null; outputTokens: number | null; reasoningOutputTokens: number | null };
function usage(value: unknown): Usage | null {
  const item = record(value);
  if (!item || !["inputTokens", "cachedInputTokens", "outputTokens", "reasoningOutputTokens"].every((key) => typeof item[key] === "number" || item[key] === null)) return null;
  return item as unknown as Usage;
}
function usageSummary(values: Usage[]): string {
  const metric = (key: keyof Usage, label: string) => {
    const known = values.map((value) => value[key]).filter((value): value is number => typeof value === "number");
    const missing = known.length !== values.length;
    if (!known.length) return `${label}未记录`;
    return `${label} ${known.reduce((total, value) => total + value, 0)}${missing ? "（部分未记录）" : ""}`;
  };
  return `用量：${metric("inputTokens", "输入")}，${metric("cachedInputTokens", "缓存")}，${metric("outputTokens", "输出")}，${metric("reasoningOutputTokens", "推理")}`;
}
export function attemptPresentation(attempt: WorkflowAttemptRecord, events: WorkflowEvent[]) {
  const related = events.filter((event) => event.attemptId === attempt.id);
  const delegate = related.find((event) => event.type === "agent.delegate");
  const started = related.find((event) => event.type === "agent.started");
  const model = record(delegate?.data)?.model ?? record(started?.data)?.model;
  const usageByChild = new Map<string, { usage: Usage | null; model: string | null }>();
  const usageEvents = related.filter((event) => event.type === "agent.usage");
  usageEvents.forEach((event) => {
    const data = record(event.data);
    const childRunId = typeof data?.childRunId === "string" ? data.childRunId : event.id;
    usageByChild.set(childRunId, { usage: usage(data?.usage), model: typeof data?.model === "string" ? data.model : null });
  });
  if (!usageEvents.length) related.filter((event) => event.type === "agent.completed").forEach((event) => {
    const data = record(event.data);
    const childRunId = typeof data?.threadId === "string" ? data.threadId : event.id;
    usageByChild.set(childRunId, { usage: usage(data?.usage), model: null });
  });
  const measured = [...usageByChild.values()];
  const measuredModels = measured.map((value) => value.model).filter((value): value is string => Boolean(value));
  const startedModel = record(started?.data)?.model;
  const actualModels = [...new Set(measuredModels.length ? measuredModels
    : typeof startedModel === "string" ? [startedModel] : [])];
  return {
    state: workflowStateLabel(attempt.state),
    model: typeof model === "string" ? `计划模型：${model}` : "计划模型未记录",
    actualModel: actualModels.length ? `实际模型：${actualModels.join("、")}` : "实际模型未记录",
    usage: measured.length ? usageSummary(measured.map((value) => value.usage ?? { inputTokens: null, cachedInputTokens: null, outputTokens: null, reasoningOutputTokens: null })) : "用量未记录",
    error: attempt.error ?? null,
    errorId: attempt.errorId ?? null,
  };
}
