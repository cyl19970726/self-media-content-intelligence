import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { SQLitePublishingRepository, projectRoot } from "../packages/adapters/index.js";
import { loadCreatorDossier } from "../src/server/creator-dossier.js";
import { createSignalRoomComposition } from "../src/server/composition-root.js";

const prefix = "signal-room-task13-";

export interface Task13FixtureManifest {
  schemaVersion: "task13-release-fixture@1";
  runtimeDirectory: string;
  reportId: string;
  currentConceptId: string;
  staleConceptId: string;
  contentPackageId: string;
  frozenSnapshotId: string;
  publicationRunId: string;
  promotedValidationId: string;
  pendingHypothesisId: string;
  creatorId: string | null;
  comparisonId: string | null;
}

function restoreEnvironment(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

function assertDisposableRuntime(directory: string): string {
  const resolved = path.resolve(directory);
  const realRuntime = path.join(projectRoot, ".runtime");
  if (resolved === realRuntime || !path.basename(resolved).startsWith(prefix)) {
    throw new Error(`Task 13 fixture runtime must be an OS temporary directory named ${prefix}*`);
  }
  fs.mkdirSync(resolved, { recursive: true });
  const canonical = fs.realpathSync(resolved);
  const temporaryRoot = fs.realpathSync(os.tmpdir());
  const relativeToTemporaryRoot = path.relative(temporaryRoot, canonical);
  if (relativeToTemporaryRoot.startsWith("..") || path.isAbsolute(relativeToTemporaryRoot)) {
    throw new Error(`Task 13 fixture runtime must be inside ${temporaryRoot}`);
  }
  if (fs.readdirSync(canonical).length > 0) throw new Error("Task 13 fixture runtime must start empty");
  return canonical;
}

function fingerprint(value: unknown): string {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

export async function seedTask13ReleaseFixture(input: {
  runtimeDirectory: string;
  evidenceRoot?: string;
}): Promise<Task13FixtureManifest> {
  const runtimeDirectory = assertDisposableRuntime(input.runtimeDirectory);
  const previousRuntime = process.env.SELF_MEDIA_RUNTIME_DIR;
  const previousEvidence = process.env.SIGNAL_ROOM_EVIDENCE_ROOT;
  process.env.SELF_MEDIA_RUNTIME_DIR = runtimeDirectory;
  if (input.evidenceRoot) process.env.SIGNAL_ROOM_EVIDENCE_ROOT = path.resolve(input.evidenceRoot);

  const composition = createSignalRoomComposition({ publishers: null });
  const { analysis, contentKnowledge: knowledge, publishing, comparisons, creatorResearch } = composition.services;
  let directPublishing: SQLitePublishingRepository | null = null;
  try {
    const report = await analysis.createAndRun("fixture://xiaohongshu/task13-release-candidate");
    const proposal = knowledge.listProposals({ subjectType: "video", subjectId: report.id })[0];
    if (!proposal) throw new Error("Task 13 fixture did not stage a current concept proposal");
    knowledge.adjudicateProposal(proposal.id, { operationKey: `task13:review:${proposal.id}`,
      expectedFingerprint: proposal.inputFingerprint, decision: "apply", reason: "隔离 fixture 显式审核链路。", reviewerId: "fixture-reviewer" });
    const currentConcept = knowledge.listKnowledge().find((item) => item.research.observations.some((observation) =>
      observation.analysisRevisionId === `analysis:${report.id}:${report.updatedAt}`
    )) ?? knowledge.listKnowledge()[0];
    if (!currentConcept) throw new Error("Task 13 fixture did not compile a current concept");

    knowledge.compile({
      operationKey: "task13:compile:stale",
      compilerPolicyVersion: "task13-fixture-v1",
      inputFingerprint: fingerprint("task13-stale-analysis"),
      analysis: {
        analysisRevisionId: "task13-analysis-stale-r1",
        subjectType: "video",
        subjectId: "task13-stale-video",
        creatorId: "task13-fixture-creator",
        videoId: "task13-stale-video",
        deepReconstruction: true,
        lensGates: { contentRestoration: "ready", directingLogic: "ready", visualEditingLogic: "ready" },
        observations: [{
          concept: {
            slug: "task13-stale-proof",
            kind: "proof_mode",
            name: "已撤回的单一来源判断",
            definition: "用于验证上游失效向知识、关系与健康队列传播。",
            exclusions: ["存在独立有效来源的判断"]
          },
          relation: "confirm",
          statement: "这个判断只有一条随后被撤回的来源。",
          evidenceRefs: ["task13:evidence:withdrawn"],
          confidence: "high"
        }]
      }
    });
    const staleConcept = knowledge.listKnowledge().find((item) =>
      item.research.observations.some((observation) => observation.analysisRevisionId === "task13-analysis-stale-r1")
    );
    if (!staleConcept) throw new Error("Task 13 fixture did not compile the stale concept");

    knowledge.adjudicateEdge({
      operationKey: "task13:edge:stale-dependency",
      sourceConceptId: staleConcept.research.concept.id,
      sourceRevisionId: staleConcept.research.currentRevision.id,
      relation: "depends_on",
      targetConceptId: currentConcept.research.concept.id,
      targetRevisionId: currentConcept.research.currentRevision.id,
      status: "active",
      provenanceRefs: ["task13:evidence:withdrawn"],
      policyVersion: "human-task13-v1",
      decisionReason: "发布验收 Fixture 中的显式人工关系，用于验证失效传播。"
    });

    const contentPackage = publishing.createPackage({
      name: "Task 13 · 证据前置实验",
      brief: "用冻结知识 revision 验证创作决策与发布后复盘。",
      sourceRefs: [`analysis:${report.id}`]
    });
    const snapshot = publishing.listPackageSnapshots(contentPackage.id)[0];
    if (!snapshot) throw new Error("Task 13 fixture did not create a package snapshot");
    const binding = knowledge.createBinding({
      operationKey: "task13:binding:current-concept",
      contentPackageId: contentPackage.id,
      contentPackageSnapshotId: snapshot.id,
      targetType: "concept_revision",
      targetId: currentConcept.research.currentRevision.id,
      usage: "test",
      rationale: "验证证据前置结构在自有内容中的表现，同时保留适用边界。"
    });
    const promotedHypothesis = knowledge.createHypothesis({
      operationKey: "task13:hypothesis:promoted",
      contentPackageId: contentPackage.id,
      contentPackageSnapshotId: snapshot.id,
      statement: "如果开场先展示可核验结果，公开收藏数相对自身基线会上升。",
      linkedBindingIds: [binding.id],
      expectedSignals: ["saves"],
      unavailableSignals: ["impressions", "completion_rate", "conversion"],
      baselineDeclaration: "同账号最近十条同类内容收藏数中位数",
      confounders: ["发布时间与选题热度"]
    });
    const pendingHypothesis = knowledge.createHypothesis({
      operationKey: "task13:hypothesis:browser-pending",
      contentPackageId: contentPackage.id,
      contentPackageSnapshotId: snapshot.id,
      statement: "如果首屏同时说明适用边界，评论中的误解性追问会减少。",
      linkedBindingIds: [binding.id],
      expectedSignals: ["misunderstanding_comments"],
      unavailableSignals: ["impressions"],
      baselineDeclaration: "同账号最近十条同类内容误解性评论计数",
      confounders: ["评论样本量与审核延迟"]
    });

    const mediaPath = report.source?.media.find((item) => item.localPath)?.localPath;
    if (!mediaPath) throw new Error("Task 13 fixture report has no local media");
    const variant = publishing.createVariant(contentPackage.id, {
      contentPackageSnapshotId: snapshot.id,
      platform: "douyin",
      title: "Task 13 发布闭环演示",
      body: "本地隔离 Fixture；不会提交到任何外部平台。",
      contentType: "video",
      media: [{ kind: "video", localPath: mediaPath, mimeType: "video/mp4" }],
      tags: ["发布验收", "证据闭环"],
      visibility: "private",
      scheduledAt: null,
      platformOptions: { douyin: { declaration: "self_made" } }
    });
    const createdRun = publishing.createRun(variant.id);
    const publishedAt = new Date().toISOString();
    const publishedRun = {
      ...createdRun,
      status: "published" as const,
      currentStage: "隔离 Fixture 已验证发布回执",
      receipt: {
        externalId: "task13-local-receipt",
        externalUrl: null,
        platformState: "fixture_published",
        verifiedAt: publishedAt
      },
      updatedAt: publishedAt
    };
    directPublishing = new SQLitePublishingRepository(path.join(runtimeDirectory, "self-media.sqlite"));
    directPublishing.saveRun(publishedRun);
    directPublishing.appendEvent({
      runId: publishedRun.id,
      jobId: null,
      type: "publication.fixture_verified",
      message: "Task 13 隔离回执已写入；没有访问外部发布平台。",
      payload: { fixture: true, externalSubmission: false },
      createdAt: publishedAt
    });

    const promoted = knowledge.createValidation({
      operationKey: "task13:validation:promoted",
      publicationRunId: publishedRun.id,
      contentPackageId: contentPackage.id,
      contentPackageSnapshotId: snapshot.id,
      variantId: variant.id,
      variantRevision: variant.revision,
      hypothesisId: promotedHypothesis.id,
      executionSnapshot: { status: "published", receipt: publishedRun.receipt },
      observedSignals: [{ name: "saves", value: 42, unit: "count", source: "task13-fixture", collectedAt: publishedAt }],
      unavailableMetrics: [{ name: "impressions", reason: "平台未提供私有分母", source: "declared-platform-gap", recordedAt: publishedAt }],
      executionDeviations: [],
      confounders: ["选题热度无法完全控制"]
    });
    knowledge.submitValidation(promoted.id, {
      operationKey: "task13:validation:submit-promoted",
      proposedRelation: "confirm",
      targetConceptId: currentConcept.research.concept.id,
      decisionReason: "隔离结果支持预先声明的可观察信号，但不外推为因果规律。",
      submittedBy: "task13-content-reviewer"
    });
    knowledge.adjudicateValidation(promoted.id, {
      operationKey: "task13:validation:adjudicate-promoted",
      decision: "promote",
      reason: "来源与冻结 lineage 完整，允许进入第一方观察分区。",
      adjudicatorId: "task13-independent-adjudicator"
    });

    knowledge.invalidate({
      operationKey: "task13:invalidate:withdrawn-evidence",
      targetType: "evidence",
      targetId: "task13:evidence:withdrawn",
      reason: "发布验收 Fixture 主动撤回唯一来源，以验证失效传播。",
      actorId: "task13-release-auditor"
    });

    let creatorId: string | null = null;
    let comparisonId: string | null = null;
    if (input.evidenceRoot) {
      const creatorIds = ["ai-red-witch", "zhang-zala"];
      const sources = creatorIds.map((id) => {
        const dossier = loadCreatorDossier(creatorResearch, id);
        if (!dossier) throw new Error(`Task 13 external creator dossier is unavailable: ${id}`);
        return {
          creatorId: id,
          sourceRunId: `legacy:${id}`,
          revision: dossier.lastGood.revisionLabel ?? dossier.generatedAt
        };
      });
      const comparison = comparisons.create({ name: "Task 13 · 固定版本博主对比", creatorSources: sources });
      comparisons.processNext("task13-fixture-worker");
      if (comparisons.get(comparison.id)?.project.status !== "ready") throw new Error("Task 13 comparison fixture did not become ready");
      creatorId = creatorIds[0] ?? null;
      comparisonId = comparison.id;
      knowledge.recordLegacyUnverified({
        operationKey: "task13:legacy:creator",
        subjectType: "creator",
        subjectId: creatorId,
        analysisRevisionId: `legacy-creator:${creatorId}:${sources[0]?.revision}`,
        inputFingerprint: fingerprint(sources[0]),
        reason: "旧版博主档案可读且可固定，但尚未通过生产级 creator KnowledgeCompiler。"
      });
      knowledge.recordLegacyUnverified({
        operationKey: "task13:legacy:comparison",
        subjectType: "comparison",
        subjectId: comparison.id,
        analysisRevisionId: `legacy-comparison:${comparison.id}`,
        inputFingerprint: fingerprint(sources),
        reason: "固定版本对比可读，但尚未通过生产级 comparison KnowledgeCompiler。"
      });
    }

    const manifest: Task13FixtureManifest = {
      schemaVersion: "task13-release-fixture@1",
      runtimeDirectory,
      reportId: report.id,
      currentConceptId: currentConcept.research.concept.id,
      staleConceptId: staleConcept.research.concept.id,
      contentPackageId: contentPackage.id,
      frozenSnapshotId: snapshot.id,
      publicationRunId: publishedRun.id,
      promotedValidationId: promoted.id,
      pendingHypothesisId: pendingHypothesis.id,
      creatorId,
      comparisonId
    };
    fs.writeFileSync(path.join(runtimeDirectory, "task13-fixture-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    return manifest;
  } finally {
    directPublishing?.close();
    await composition.close();
    restoreEnvironment("SELF_MEDIA_RUNTIME_DIR", previousRuntime);
    restoreEnvironment("SIGNAL_ROOM_EVIDENCE_ROOT", previousEvidence);
  }
}

async function main(): Promise<void> {
  const runtimeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const evidenceRoot = process.env.SIGNAL_ROOM_EVIDENCE_ROOT?.trim();
  const manifest = await seedTask13ReleaseFixture({ runtimeDirectory, evidenceRoot: evidenceRoot || undefined });
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
