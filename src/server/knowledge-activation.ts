import type { AnalysisService } from "../core/service.js";
import type { ContentKnowledgeService, CompileKnowledgeInput, KnowledgeCompilationProposal } from "../../packages/knowledge/index.js";
import type { ComparisonProjectService, CreatorResearchCompletion, CreatorResearchService } from "../../packages/research/index.js";
import { proposeSinglePostKnowledge } from "./analysis-knowledge-compiler.js";
import { ComparisonKnowledgeCompiler, proposeCreatorKnowledge } from "./research-knowledge-compiler.js";

export type KnowledgeActivationItem = {
  subjectType: "video" | "creator" | "comparison";
  subjectId: string;
  label: string;
  readiness: "ready" | "not_ready";
  action: "stage" | "already_recorded" | "await_evidence" | "reject";
  reason: string;
  proposal: KnowledgeCompilationProposal | null;
  preview: { candidateCount: number; promotionRequestCount: number; inputFingerprint: string } | null;
};

function preview(input: CompileKnowledgeInput) {
  return { candidateCount: input.analysis.observations.length,
    promotionRequestCount: input.promotionRequests?.length ?? 0, inputFingerprint: input.inputFingerprint };
}

export class KnowledgeActivationService {
  constructor(
    private readonly analysis: AnalysisService,
    private readonly creators: CreatorResearchService,
    private readonly comparisons: ComparisonProjectService,
    private readonly knowledge: ContentKnowledgeService
  ) {}

  plan(): { dryRun: true; totals: Record<KnowledgeActivationItem["action"], number>; items: KnowledgeActivationItem[] } {
    const items = [...this.singlePostItems(), ...this.creatorItems(), ...this.comparisonItems()];
    const totals = { stage: 0, already_recorded: 0, await_evidence: 0, reject: 0 };
    for (const item of items) totals[item.action] += 1;
    return { dryRun: true, totals, items };
  }

  stageReady(): { staged: KnowledgeCompilationProposal[]; unchanged: string[]; failed: Array<{ subjectId: string; reason: string }> } {
    const staged: KnowledgeCompilationProposal[] = [];
    const unchanged: string[] = [];
    const failed: Array<{ subjectId: string; reason: string }> = [];
    for (const item of this.plan().items.filter((candidate) => candidate.action === "stage")) {
      try {
        const input = this.proposalInput(item.subjectType, item.subjectId);
        if (!input) throw new Error("ready research input is no longer resolvable");
        const result = this.knowledge.stage(input);
        if (result.idempotent) unchanged.push(item.subjectId);
        else staged.push(result.proposal);
      } catch (error) { failed.push({ subjectId: item.subjectId, reason: error instanceof Error ? error.message : String(error) }); }
    }
    return { staged, unchanged, failed };
  }

  private existing(input: CompileKnowledgeInput): KnowledgeCompilationProposal | null {
    return this.knowledge.listProposals().find((item) => item.analysisRevisionId === input.analysis.analysisRevisionId
      && item.compilerPolicyVersion === input.compilerPolicyVersion) ?? null;
  }

  private item(subjectType: KnowledgeActivationItem["subjectType"], subjectId: string, label: string,
    input: CompileKnowledgeInput): KnowledgeActivationItem {
    const proposal = this.existing(input);
    return { subjectType, subjectId, label, readiness: "ready", action: proposal ? "already_recorded" : "stage",
      reason: proposal ? `已有 ${proposal.status} 提案。` : "研究版本和证据闸门可解析，可以进入人工审核。",
      proposal, preview: preview(input) };
  }

  private singlePostItems(): KnowledgeActivationItem[] {
    return this.analysis.list(1000).map((summary) => {
      const report = this.analysis.get(summary.id);
      if (!report) return { subjectType: "video" as const, subjectId: summary.id, label: summary.title,
        readiness: "not_ready" as const, action: "await_evidence" as const,
        reason: "单帖完整报告无法读取。", proposal: null, preview: null };
      if (report.sourceUrl.startsWith("fixture://")) return { subjectType: "video" as const, subjectId: report.id,
        label: report.shareTitle ?? report.source?.title ?? report.id, readiness: "not_ready" as const,
        action: "reject" as const, reason: "fixture 只用于产品验证，禁止进入生产 Knowledge。",
        proposal: null, preview: null };
      if (report.status !== "complete" || !report.source) return { subjectType: "video" as const, subjectId: report.id,
        label: report.shareTitle ?? report.source?.title ?? report.id, readiness: "not_ready" as const,
        action: report.status === "failed" ? "reject" as const : "await_evidence" as const,
        reason: `单帖状态为 ${report.status}，尚不能形成正式贡献提案。`, proposal: null, preview: null };
      try { return this.item("video", report.id, report.shareTitle ?? report.source.title, proposeSinglePostKnowledge(report)); }
      catch (error) { return { subjectType: "video" as const, subjectId: report.id, label: report.shareTitle ?? report.source.title,
        readiness: "not_ready" as const, action: "await_evidence" as const,
        reason: error instanceof Error ? error.message : String(error), proposal: null, preview: null }; }
    });
  }

  private creatorItems(): KnowledgeActivationItem[] {
    return this.creators.list(1000).map((run) => {
      const snapshot = this.creators.portfolio(run.id);
      if (!snapshot?.synthesis || !snapshot.synthesisGate?.ready || !snapshot.synthesisGate.evaluator?.independentOfCandidate
        || !run.creatorId || !run.synthesisArtifactRef || !run.synthesisGateArtifactRef) {
        return { subjectType: "creator" as const, subjectId: run.id, label: run.creatorName ?? run.creatorId ?? run.id,
          readiness: "not_ready" as const, action: run.status === "failed" ? "reject" as const : "await_evidence" as const,
          reason: run.status === "failed" ? "博主任务失败，未形成可审核综合结论。" : "等待深度证据或独立综合评估。",
          proposal: null, preview: null };
      }
      const completion: CreatorResearchCompletion = { creatorRunId: run.id, creatorId: run.creatorId,
        creatorName: run.creatorName, synthesisArtifactRef: run.synthesisArtifactRef,
        gateArtifactRef: run.synthesisGateArtifactRef, synthesis: snapshot.synthesis, gate: snapshot.synthesisGate };
      return this.item("creator", run.id, run.creatorName ?? run.creatorId, proposeCreatorKnowledge(completion));
    });
  }

  private comparisonItems(): KnowledgeActivationItem[] {
    const compiler = new ComparisonKnowledgeCompiler(this.knowledge);
    return this.comparisons.list(1000).map((project) => {
      const stored = this.comparisons.get(project.id);
      if (!stored?.comparison || project.status !== "ready" || !project.comparisonArtifactRef) return {
        subjectType: "comparison" as const, subjectId: project.id, label: project.name, readiness: "not_ready" as const,
        action: project.status === "failed" ? "reject" as const : "await_evidence" as const,
        reason: `比较项目状态为 ${project.status}。`, proposal: null, preview: null };
      const input = compiler.propose({ comparisonProjectId: project.id, comparisonArtifactRef: project.comparisonArtifactRef,
        sourceArtifactRefs: project.members.flatMap((member) => [member.portfolioArtifactRef, member.synthesisArtifactRef, member.synthesisGateArtifactRef]
          .filter((ref): ref is string => Boolean(ref))), comparison: stored.comparison });
      return this.item("comparison", project.id, project.name, input);
    });
  }

  private proposalInput(subjectType: KnowledgeActivationItem["subjectType"], subjectId: string): CompileKnowledgeInput | null {
    if (subjectType === "video") { const report = this.analysis.get(subjectId); return report ? proposeSinglePostKnowledge(report) : null; }
    if (subjectType === "creator") {
      const snapshot = this.creators.portfolio(subjectId); const run = snapshot?.run;
      if (!snapshot?.synthesis || !snapshot.synthesisGate || !run?.creatorId || !run.synthesisArtifactRef || !run.synthesisGateArtifactRef) return null;
      return proposeCreatorKnowledge({ creatorRunId: run.id, creatorId: run.creatorId, creatorName: run.creatorName,
        synthesisArtifactRef: run.synthesisArtifactRef, gateArtifactRef: run.synthesisGateArtifactRef,
        synthesis: snapshot.synthesis, gate: snapshot.synthesisGate });
    }
    const stored = this.comparisons.get(subjectId);
    if (!stored?.comparison || !stored.project.comparisonArtifactRef) return null;
    return new ComparisonKnowledgeCompiler(this.knowledge).propose({ comparisonProjectId: stored.project.id,
      comparisonArtifactRef: stored.project.comparisonArtifactRef,
      sourceArtifactRefs: stored.project.members.flatMap((member) => [member.portfolioArtifactRef, member.synthesisArtifactRef, member.synthesisGateArtifactRef]
        .filter((ref): ref is string => Boolean(ref))), comparison: stored.comparison });
  }
}
