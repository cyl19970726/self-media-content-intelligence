import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  imagePostReconstructionSchema,
  videoReconstructionLifecycleEventSchema,
  type CreatorArtifactStore,
  type ImagePostReconstructionExecutor
} from "../../../../research/index.js";
import { artifactPath } from "../../core/artifacts.js";
import { projectRoot, runArtifactDir } from "../../core/config.js";
import { runFileInput } from "../../core/process.js";
import { LocalCreatorArtifactStore } from "../artifacts/local-creator-artifact-store.js";
import { withSystemProxy } from "../network/system-proxy.js";

const analysisSkill = process.env.SELF_MEDIA_CREATOR_ANALYSIS_SKILL
  ?? path.join(os.homedir(), ".codex", "skills", "analyze-creator-videos", "SKILL.md");

export class CodexImagePostReconstructionExecutor implements ImagePostReconstructionExecutor {
  constructor(private readonly artifacts: CreatorArtifactStore = new LocalCreatorArtifactStore()) {}

  async reconstruct(request: Parameters<ImagePostReconstructionExecutor["reconstruct"]>[0],
    observe?: Parameters<ImagePostReconstructionExecutor["reconstruct"]>[1]) {
    const outputDir = path.join(runArtifactDir(request.creatorRunId), "image-post-reconstructions", request.postExternalId);
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, "reconstruction.json");
    const lastMessagePath = path.join(outputDir, "candidate-last-message.txt");
    const childRunId = crypto.randomUUID();
    const startedAt = new Date().toISOString();
    const inputRevision = crypto.createHash("sha256").update(JSON.stringify(request)).digest("hex");
    const emit = (status: "started" | "progress" | "completed" | "failed", errorCode: string | null = null) => {
      try {
        observe?.(videoReconstructionLifecycleEventSchema.parse({
          childRunId, role: "candidate", status, startedAt, lastProgressAt: new Date().toISOString(),
          inputRevision, outputArtifactRevisions: {}, errorCode
        }));
      } catch { /* Lifecycle telemetry cannot corrupt the artifact. */ }
    };
    emit("started");
    const imagePaths = request.imageArtifactRefs.map(artifactPath);
    const prompt = `
Read the creator research Skill at ${analysisSkill}. Reconstruct one Xiaohongshu image/carousel post from primary evidence.

Pinned inputs:
- public detail artifact: ${artifactPath(request.detailArtifactRef)}
- postExternalId: ${request.postExternalId}
- source URL: ${request.sourceUrl}
- ordered local image pages:\n${imagePaths.map((value, index) => `  ${index + 1}. ${value}`).join("\n")}

Inspect every available image at full readable resolution. Restore what the post says, its hook, information architecture,
knowledge units, proof mode, intended audience action, page-by-page visual role, readable on-image text, composition,
and what each page contributes. Separate observation, author claim, inference and unknown. Missing carousel pages,
unreadable text, off-platform facts, exposure, retention, conversion, ads and sales must remain unknown.

Write only ${outputPath}. It must match imagePostReconstructionSchema in
${path.join(projectRoot, "packages", "research", "src", "image-analysis", "contracts.ts")}.
Use exactly creatorRunId ${request.creatorRunId}, postExternalId ${request.postExternalId}, sourceUrl ${request.sourceUrl},
detailArtifactRef ${request.detailArtifactRef}, and the ordered imageArtifactRefs ${JSON.stringify(request.imageArtifactRefs)}.
All human-readable JSON values must be concise natural Chinese. Do not write advice for our own account.
`;
    try {
      const environment = await withSystemProxy();
      const args = ["exec", "-", "--skip-git-repo-check", "--color", "never", "--approve-for-me",
        "-m", environment.SELF_MEDIA_IMAGE_POST_MODEL ?? "gpt-5.6-terra",
        "-c", `model_reasoning_effort=${JSON.stringify(environment.SELF_MEDIA_IMAGE_POST_REASONING_EFFORT ?? "medium")}`,
        "-C", outputDir, "-o", lastMessagePath];
      if (environment.SELF_MEDIA_CODEX_EPHEMERAL !== "false") args.splice(2, 0, "--ephemeral");
      await runFileInput(process.env.SELF_MEDIA_CODEX_BIN ?? "codex", args, prompt, {
        cwd: outputDir, timeout: 30 * 60_000, env: environment, onOutput: () => emit("progress")
      });
      if (!fs.existsSync(outputPath)) throw new Error("image_post_output_missing");
      const reconstruction = imagePostReconstructionSchema.parse(JSON.parse(fs.readFileSync(outputPath, "utf8")) as unknown);
      const allowedRefs = new Set([request.detailArtifactRef, ...request.imageArtifactRefs]);
      const invalidRefs = [
        ...reconstruction.inputs.imageArtifactRefs,
        ...reconstruction.visualSystem.pages.map((page) => page.imageArtifactRef),
        ...reconstruction.claims.flatMap((claim) => claim.evidenceRefs)
      ].filter((ref) => !allowedRefs.has(ref));
      const valid = reconstruction.creatorRunId === request.creatorRunId
        && reconstruction.postExternalId === request.postExternalId
        && reconstruction.inputs.detailArtifactRef === request.detailArtifactRef
        && invalidRefs.length === 0;
      const validationRef = this.artifacts.write(request.creatorRunId,
        `image-post-builder-validation-${request.postExternalId}.json`, {
          schemaVersion: "image-post-builder-validation@1", postExternalId: request.postExternalId,
          valid, checkedAt: new Date().toISOString(), invalidRefs
        }, allowedRefs.size > 0 ? [...allowedRefs] : []);
      if (!valid) return { state: "not_ready" as const, reconstructionArtifactRef: null,
        evaluationArtifactRef: null, gateReportArtifactRef: null, threeLensEvaluationArtifactRef: null,
        threeLensGateReportArtifactRef: null, failedGateIds: ["image_post_evidence_binding"],
        message: "图文 Builder 产物没有严格绑定当前详情与图片证据。" };
      const reconstructionRef = this.artifacts.write(request.creatorRunId,
        `image-post-reconstruction-${request.postExternalId}.json`, reconstruction, [...allowedRefs]);
      emit("completed");
      return { state: "built_unevaluated" as const, reconstructionArtifactRef: reconstructionRef,
        articleArtifactRef: null, builderValidationArtifactRef: validationRef,
        evaluationMode: "skipped" as const, message: "图文 Builder 与确定性证据校验已完成。" };
    } catch (error) {
      emit("failed", "image_post_runner_failed");
      const message = error instanceof Error ? error.message : "图文 Builder 失败";
      return { state: "not_ready" as const, reconstructionArtifactRef: null, evaluationArtifactRef: null,
        gateReportArtifactRef: null, threeLensEvaluationArtifactRef: null, threeLensGateReportArtifactRef: null,
        failedGateIds: ["image_post_execution_failed"], message };
    }
  }
}
