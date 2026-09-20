import { defineAgent, type AgentDefinition } from "@signal-room/workflow";
import type {
  CreatorSynthesisEvaluationReceipt, CreatorSynthesisReceipt, CreatorSynthesisWorkflowInput,
  PostCandidateReceipt, PostEvaluationReceipt, PostWorkflowInput,
  PostEvaluationRepairInput, PostEvaluationRepairReceipt, SourceConsistencyReceipt,
} from "./contracts.js";

export type ResearchAgentDefinitions = {
  postSourceChecker: AgentDefinition<PostWorkflowInput, SourceConsistencyReceipt>;
  postBuilder: AgentDefinition<PostWorkflowInput, PostCandidateReceipt>;
  postReviewer: AgentDefinition<unknown, PostEvaluationReceipt>;
  postRepair: AgentDefinition<unknown, PostCandidateReceipt>;
  postEvaluationRepair: AgentDefinition<PostEvaluationRepairInput, PostEvaluationRepairReceipt>;
  creatorBuilder: AgentDefinition<CreatorSynthesisWorkflowInput, CreatorSynthesisReceipt>;
  creatorReviewer: AgentDefinition<unknown, CreatorSynthesisEvaluationReceipt>;
  creatorRepair: AgentDefinition<unknown, CreatorSynthesisReceipt>;
};

type AgentConfig = {
  model?: string;
  prompt: string;
  promptRevision: string;
  skillSnapshotsRevision: string;
  permissionsRevision: string;
  config: Readonly<Record<string, unknown>>;
};

export type ResearchAgentConfig = Record<keyof ResearchAgentDefinitions, AgentConfig>;

/** Requires complete validated prompts, skill snapshots and output schemas from composition. */
export function createResearchAgentDefinitions(values: ResearchAgentConfig): ResearchAgentDefinitions {
  const make = <Input, Output>(id: string, value: AgentConfig) => defineAgent<Input, Output>({
    id, revision: "v1", model: value.model ?? "gpt-5.6-luna", reasoningEffort: "medium", promptRevision: value.promptRevision,
    skillsRevision: value.skillSnapshotsRevision, permissionsRevision: value.permissionsRevision,
    config: { ...value.config, prompt: value.prompt },
  });
  return {
    postSourceChecker: make("post-source-checker", values.postSourceChecker),
    postBuilder: make("post-builder", values.postBuilder),
    postReviewer: make("post-reviewer", values.postReviewer),
    postRepair: make("post-repair", values.postRepair),
    postEvaluationRepair: make("post-evaluation-repair", values.postEvaluationRepair),
    creatorBuilder: make("creator-synthesis-builder", values.creatorBuilder),
    creatorReviewer: make("creator-synthesis-reviewer", values.creatorReviewer),
    creatorRepair: make("creator-synthesis-repair", values.creatorRepair),
  };
}
