import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { artifactPath, artifactRef } from "../../core/artifacts.js";
import { projectRoot, runArtifactDir } from "../../core/config.js";
import { runFileInput } from "../../core/process.js";
import type { CreatorArtifactStore } from "../../modules/creator-research/artifact-store.js";
import { LocalCreatorArtifactStore } from "../artifacts/local-creator-artifact-store.js";
import { creatorSynthesisSchema, type CreatorSynthesisExecutor, type CreatorSynthesisRequest } from "../../modules/creator-synthesis/contracts.js";
import { validateCreatorSynthesis } from "../../modules/creator-synthesis/validate.js";
import { withSystemProxy } from "../network/system-proxy.js";

const creatorSkill = process.env.SELF_MEDIA_CREATOR_ANALYSIS_SKILL ??
  path.join(os.homedir(), ".codex", "skills", "analyze-creator-videos", "SKILL.md");

export class CodexCreatorSynthesisExecutor implements CreatorSynthesisExecutor {
  constructor(private readonly artifacts: CreatorArtifactStore = new LocalCreatorArtifactStore()) {}

  async synthesize(request: CreatorSynthesisRequest) {
    const outputDir = path.join(runArtifactDir(request.creatorRunId), "creator-synthesis");
    fs.mkdirSync(outputDir, { recursive: true });
    const synthesisPath = path.join(outputDir, "creator-analysis.json");
    const prompt = `
Read the complete creator-analysis Skill at ${creatorSkill}. Then build a research-only single-creator synthesis for ${request.creatorName ?? "the creator"}.

Pinned inputs (read all):
- portfolio: ${artifactPath(request.portfolioArtifactRef)}
- canonical 21 selection: ${artifactPath(request.selectionArtifactRef)}
- public detail evidence: ${artifactPath(request.detailArtifactRef)}
- validated reconstruction batch: ${artifactPath(request.reconstructionBatchArtifactRef)}
- each ready reconstruction/article/evaluation/gate referenced by that batch

Write only ${synthesisPath}. It must validate against ${path.join(projectRoot, "src/modules/creator-synthesis/contracts.ts")} and contain exactly the same 21 selected posts. Analyze account positioning, audience, problems, value provided, trust sources, lifecycle and possible commercial paths; content topics, formats, visual language, recurring structures and publishing rhythm; baseline/high/low performance patterns and confounds; and a per-record interpretation for every one of the 21 posts. Deep claims for the marked 9 must cite validated video reconstruction artifacts. The remaining 12 must be explicitly surface_only and may use only title/copy/date/metric/form observations.

User product boundary overrides any launch-plan instruction in the Skill: do not write what we should copy, what we should post next, titles/covers/CTA for us, launch plans, or experiments. This artifact explains the creator only. Keep visible observation, author claim, inference, and unknown distinct. Public likes do not prove exposure, retention, conversion, ads, or sales; preserve those as unknown. Do not read old static reports or prior creator analyses.
`;
    try {
      const environment = await withSystemProxy();
      try { await runFileInput(process.env.SELF_MEDIA_CODEX_BIN ?? "codex", ["exec", "-", "--skip-git-repo-check", "--ephemeral", "--color", "never",
        "--approve-for-me", "-C", outputDir, "-o", path.join(outputDir, "synthesis-last-message.txt")],
      prompt, { cwd: outputDir, timeout: 2 * 60 * 60_000, env: environment }); }
      catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (/ENOENT|not found|authentication|unauthorized/i.test(message)) throw new Error("CODEX_RUNNER_UNAVAILABLE");
        throw new Error("CODEX_SYNTHESIS_RUNNER_FAILED");
      }
      if (!fs.existsSync(synthesisPath)) return { state: "not_ready" as const, synthesisArtifactRef: null, gateArtifactRef: null,
        failedGateIds: ["synthesis_output_missing"], message: "博主归纳没有生成结构化产物。" };
      const synthesis = creatorSynthesisSchema.parse(JSON.parse(fs.readFileSync(synthesisPath, "utf8")) as unknown);
      const gate = validateCreatorSynthesis({ creatorRunId: request.creatorRunId,
        selection: this.artifacts.read(request.selectionArtifactRef), batch: this.artifacts.read(request.reconstructionBatchArtifactRef),
        synthesis, checkedAt: new Date().toISOString() });
      const gateRef = this.artifacts.write(request.creatorRunId, "creator-synthesis-gate.json", gate);
      const synthesisRef = artifactRef(request.creatorRunId, "creator-synthesis/creator-analysis.json");
      return gate.ready
        ? { state: "ready" as const, synthesisArtifactRef: synthesisRef, gateArtifactRef: gateRef }
        : { state: "not_ready" as const, synthesisArtifactRef: synthesisRef, gateArtifactRef: gateRef,
          failedGateIds: gate.failedGateIds, message: "博主归纳未通过研究边界或证据闭合硬闸。" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "博主归纳执行失败";
      return /CODEX_RUNNER_UNAVAILABLE|ENOENT|not found|authentication|unauthorized/i.test(message)
        ? { state: "blocked" as const, message, userActionRequired: true }
        : { state: "not_ready" as const, synthesisArtifactRef: null, gateArtifactRef: null, failedGateIds: ["synthesis_execution"], message };
    }
  }
}
