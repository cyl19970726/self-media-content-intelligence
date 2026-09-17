import { workflow, type ArtifactRef, type WorkflowDefinition } from "../../../workflow/index.js";
import type {
  CreatorAnalysisWorkflowInput, CreatorAnalysisWorkflowOutput, CreatorSynthesisWorkflowInput,
  CreatorSynthesisWorkflowOutput, PostWorkflowInput, PostWorkflowOutput,
} from "./contracts.js";

function artifact(value: unknown): ArtifactRef | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<ArtifactRef>;
  return typeof candidate.id === "string" && typeof candidate.type === "string"
    && typeof candidate.schemaVersion === "string" && typeof candidate.sha256 === "string"
    && typeof candidate.revision === "string" && typeof candidate.uri === "string"
    && !!candidate.producedBy && Array.isArray(candidate.dependsOn)
    && typeof candidate.validation === "string" && typeof candidate.review === "string"
    ? candidate as ArtifactRef : undefined;
}

/** Returns readable post outputs without promoting findings to verified. */
export function postWorkflowArtifacts(result: PostWorkflowOutput): {
  candidate: ArtifactRef;
  evaluation?: ArtifactRef;
} | null {
  if (result.ok) return { candidate: result.candidate, evaluation: result.evaluation };
  if (result.state !== "needs_review" || !result.details || typeof result.details !== "object") return null;
  const details = result.details as Record<string, unknown>;
  const candidate = artifact(details.candidate);
  if (!candidate) return null;
  return { candidate, evaluation: artifact(details.evaluation) ?? artifact(details.review) };
}

/**
 * Durable parent connection. ctx.call is dispatched by the configured child
 * dispatcher; each wait suspends this run and releases the research queue lease.
 */
export function createCreatorAnalysisWorkflow(
  postWorkflow: WorkflowDefinition<PostWorkflowInput, PostWorkflowOutput>,
  synthesisWorkflow: WorkflowDefinition<CreatorSynthesisWorkflowInput, CreatorSynthesisWorkflowOutput>,
  prepareSynthesis: (input: CreatorAnalysisWorkflowInput, posts: PostWorkflowOutput[]) => Promise<CreatorSynthesisWorkflowInput>,
) {
  return createCreatorAnalysisWorkflowVersion("v1", postWorkflow, synthesisWorkflow, prepareSynthesis);
}

export function createCreatorAnalysisWorkflowV3(
  postWorkflow: WorkflowDefinition<PostWorkflowInput, PostWorkflowOutput>,
  synthesisWorkflow: WorkflowDefinition<CreatorSynthesisWorkflowInput, CreatorSynthesisWorkflowOutput>,
  prepareSynthesis: (input: CreatorAnalysisWorkflowInput, posts: PostWorkflowOutput[]) => Promise<CreatorSynthesisWorkflowInput>,
) {
  return createCreatorAnalysisWorkflowPhased("v3", postWorkflow, synthesisWorkflow, prepareSynthesis);
}

export function createCreatorAnalysisWorkflowV4(
  postWorkflow: WorkflowDefinition<PostWorkflowInput, PostWorkflowOutput>,
  synthesisWorkflow: WorkflowDefinition<CreatorSynthesisWorkflowInput, CreatorSynthesisWorkflowOutput>,
  prepareSynthesis: (input: CreatorAnalysisWorkflowInput, posts: PostWorkflowOutput[]) => Promise<CreatorSynthesisWorkflowInput>,
) {
  return createCreatorAnalysisWorkflowPhased("v4", postWorkflow, synthesisWorkflow, prepareSynthesis);
}

export function createCreatorAnalysisWorkflowV5(
  postWorkflow: WorkflowDefinition<PostWorkflowInput, PostWorkflowOutput>,
  synthesisWorkflow: WorkflowDefinition<CreatorSynthesisWorkflowInput, CreatorSynthesisWorkflowOutput>,
  prepareSynthesis: (input: CreatorAnalysisWorkflowInput, posts: PostWorkflowOutput[]) => Promise<CreatorSynthesisWorkflowInput>,
) {
  return createCreatorAnalysisWorkflowPhased("v5", postWorkflow, synthesisWorkflow, prepareSynthesis);
}

function createCreatorAnalysisWorkflowPhased(revision: "v3" | "v4" | "v5",
  postWorkflow: WorkflowDefinition<PostWorkflowInput, PostWorkflowOutput>,
  synthesisWorkflow: WorkflowDefinition<CreatorSynthesisWorkflowInput, CreatorSynthesisWorkflowOutput>,
  prepareSynthesis: (input: CreatorAnalysisWorkflowInput, posts: PostWorkflowOutput[]) => Promise<CreatorSynthesisWorkflowInput>,
) {
  return workflow<CreatorAnalysisWorkflowInput, CreatorAnalysisWorkflowOutput>("creator.analyze", { revision }, async (ctx, input) => {
    const settled = await ctx.phase("post-research", { title: "单帖研究", purpose: "分别完成每个冻结帖子的候选、复核与必要修复。", order: 1,
      expectedArtifacts: input.posts.map((post) => ({ role: `post:${post.postExternalId}:candidate`,
        title: `单帖候选 ${post.postExternalId}`, required: true })) }, async (phase) => {
      const results = await phase.mapSettled("posts", input.posts, { concurrency: 2, itemKey: (post) => post.postExternalId },
        (post) => phase.call(`post:${post.postExternalId}`, postWorkflow, post));
      for (const [index, result] of results.entries()) {
        if (result.status !== "fulfilled") continue;
        const refs = postWorkflowArtifacts(result.value);
        if (!refs) continue;
        const post = input.posts[index]!;
        await phase.bindArtifact(refs.candidate, { role: `post:${post.postExternalId}:candidate`, title: `单帖候选 ${post.postExternalId}`, primary: true });
        if (refs.evaluation) await phase.bindArtifact(refs.evaluation, { role: `post:${post.postExternalId}:evaluation`,
          title: `单帖评估 ${post.postExternalId}`, order: 2 });
      }
      return results;
    });
    const rejected = settled.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    if (rejected.length) return ctx.needsReview({ kind: "post_execution_failed", rejected }) as CreatorAnalysisWorkflowOutput;
    const posts = settled.map((result) => (result as PromiseFulfilledResult<PostWorkflowOutput>).value);
    const readable = posts.map(postWorkflowArtifacts);
    const unavailable = readable.filter((result) => result === null);
    const route = ctx.decide("synthesis-readiness", { postCount: posts.length, candidateCount: readable.length - unavailable.length,
      unavailableCount: unavailable.length, canSynthesize: unavailable.length === 0 });
    if (!route.canSynthesize) return ctx.blocked({ kind: "post_inputs_unavailable", posts }) as CreatorAnalysisWorkflowOutput;
    const synthesisInput = await ctx.phase("freeze-synthesis-inputs", { title: "冻结综合输入", purpose: "绑定单帖结果与博主综合的冻结输入。", order: 2,
      expectedArtifacts: [{ role: "frozen-input", title: "冻结综合输入", required: true }] }, async (phase) => {
      const value = await phase.task("freeze", ({ source, results }) => prepareSynthesis(source, results), { source: input, results: posts });
      await phase.bindArtifact(value.frozenInputs, { role: "frozen-input", title: "冻结综合输入", primary: true });
      return value;
    });
    const synthesis = await ctx.phase("creator-synthesis", { title: "博主综合", purpose: "基于冻结输入完成博主级综合与独立复核。", order: 3,
      expectedArtifacts: [{ role: "synthesis", title: "博主综合候选", required: true }, { role: "evaluation", title: "综合评估", required: false }] }, async (phase) => {
      const value = await phase.call("synthesis", synthesisWorkflow, synthesisInput);
      if (value.ok) { await phase.bindArtifact(value.synthesis, { role: "synthesis", title: "博主综合候选", primary: true });
        await phase.bindArtifact(value.evaluation, { role: "evaluation", title: "综合评估", order: 2 }); }
      return value;
    });
    if (!synthesis.ok) return synthesis as CreatorAnalysisWorkflowOutput;
    return { ok: true, posts, synthesis };
  });
}

export function createCreatorAnalysisWorkflowV2(
  postWorkflow: WorkflowDefinition<PostWorkflowInput, PostWorkflowOutput>,
  synthesisWorkflow: WorkflowDefinition<CreatorSynthesisWorkflowInput, CreatorSynthesisWorkflowOutput>,
  prepareSynthesis: (input: CreatorAnalysisWorkflowInput, posts: PostWorkflowOutput[]) => Promise<CreatorSynthesisWorkflowInput>,
) {
  return createCreatorAnalysisWorkflowVersion("v2", postWorkflow, synthesisWorkflow, prepareSynthesis);
}

function createCreatorAnalysisWorkflowVersion(revision: "v1" | "v2",
  postWorkflow: WorkflowDefinition<PostWorkflowInput, PostWorkflowOutput>,
  synthesisWorkflow: WorkflowDefinition<CreatorSynthesisWorkflowInput, CreatorSynthesisWorkflowOutput>,
  prepareSynthesis: (input: CreatorAnalysisWorkflowInput, posts: PostWorkflowOutput[]) => Promise<CreatorSynthesisWorkflowInput>) {
  return workflow<CreatorAnalysisWorkflowInput, CreatorAnalysisWorkflowOutput>("creator.analyze", { revision }, async (ctx, input) => {
    const settled = await ctx.mapSettled("posts", input.posts, { concurrency: 2, itemKey: (post) => post.postExternalId },
      (post) => ctx.call(`post:${post.postExternalId}`, postWorkflow, post));
    const rejected = settled.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    if (rejected.length) return ctx.needsReview({ kind: "post_execution_failed", rejected }) as CreatorAnalysisWorkflowOutput;
    const posts = settled.map((result) => (result as PromiseFulfilledResult<PostWorkflowOutput>).value);
    const readable = posts.map(postWorkflowArtifacts);
    const unavailable = readable.filter((result) => result === null);
    const route = ctx.decide("synthesis-readiness", {
      postCount: posts.length, candidateCount: readable.length - unavailable.length,
      unavailableCount: unavailable.length, canSynthesize: unavailable.length === 0,
    });
    if (!route.canSynthesize) {
      return ctx.blocked({ kind: "post_inputs_unavailable", posts }) as CreatorAnalysisWorkflowOutput;
    }
    const synthesisInput = await ctx.task("freeze-synthesis-inputs", ({ source, results }) => prepareSynthesis(source, results),
      { source: input, results: posts });
    const synthesis = await ctx.call("synthesis", synthesisWorkflow, synthesisInput);
    if (!synthesis.ok) return synthesis as CreatorAnalysisWorkflowOutput;
    return { ok: true, posts, synthesis };
  });
}
