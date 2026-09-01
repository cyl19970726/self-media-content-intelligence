import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SQLiteComparisonProjectRepository, SQLitePublishingRepository } from "../packages/adapters/index.js";
import { PublishingService, type PublicationRun } from "../packages/creation/index.js";
import type { CreatorResearchCompletion, ComparisonResearchCompletion } from "../packages/research/index.js";
import { createDurableKnowledgeSystem } from "../src/server/content-knowledge.js";
import { ComparisonKnowledgeCompiler, CreatorKnowledgeCompiler } from "../src/server/research-knowledge-compiler.js";

const prefix = "content-knowledge-v1-";

export interface ContentKnowledgeV1FixtureManifest {
  schemaVersion: "content-knowledge-v1-fixture@1";
  runtimeDirectory: string;
  creatorManifestCount: number;
  comparisonManifestCount: number;
  comparisonProjectId: string;
  conceptId: string;
  conceptRevisionId: string;
  conceptScope: "track_wide";
  supportingCreators: number;
  supportingVideos: number;
  contentPackageId: string;
  bindingId: string;
  validationId: string;
  practiceObservationId: string;
  idempotentRetryProven: true;
  externalSubmission: false;
}

function assertRuntime(directory: string): string {
  const resolved = path.resolve(directory);
  if (!path.basename(resolved).startsWith(prefix)) throw new Error(`fixture directory must start with ${prefix}`);
  fs.mkdirSync(resolved, { recursive: true });
  const canonical = fs.realpathSync(resolved);
  const temporaryRoot = fs.realpathSync(os.tmpdir());
  const relative = path.relative(temporaryRoot, canonical);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("fixture must live below the OS temporary directory");
  if (fs.readdirSync(canonical).length > 0) throw new Error("fixture directory must start empty");
  return canonical;
}

function creatorCompletion(index: number): CreatorResearchCompletion {
  const digit = String(index + 1);
  const runId = `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`;
  const creatorId = `fixture-creator-${digit}`;
  const claim = { statement: "隔离样本判断", factClass: "observed" as const, confidence: "high" as const,
    evidenceRefs: [`fixture:${creatorId}`], caveat: null };
  return { creatorRunId: runId, creatorId, creatorName: `Fixture ${digit}`,
    synthesisArtifactRef: `fixture-artifact:${creatorId}:synthesis`, gateArtifactRef: `fixture-artifact:${creatorId}:gate`,
    synthesis: { schemaVersion: "1.0.0", creatorRunId: runId, generatedAt: "2026-08-30T00:00:00.000Z",
      inputs: { portfolioArtifactRef: "fixture:portfolio", selectionArtifactRef: "fixture:selection", detailArtifactRef: "fixture:detail", reconstructionBatchArtifactRef: "fixture:batch" },
      identity: { positioning: claim, audience: [claim], problemsAddressed: [claim], valueProvided: [claim], trustSources: [claim], lifecycleStage: claim, commercialPaths: [] },
      contentSystem: { topicClusters: [claim], formatClusters: [claim], visualLanguage: [claim], publishingRhythm: [], recurringStructure: [claim] },
      performance: { baseline: [claim], high: [claim], low: [claim], timing: [], confounds: ["隔离 fixture 不声明因果"] },
      postAnalyses: Array.from({ length: 21 }, (_, postIndex) => ({ postExternalId: `${creatorId}-post-${postIndex + 1}`,
        tier: postIndex < 7 ? "high" as const : postIndex < 14 ? "base" as const : "low" as const, tierRank: postIndex % 7 + 1,
        title: null, evidenceStatus: postIndex % 3 === 0 ? "deep_validated" as const : "surface_only" as const,
        contentRole: postIndex % 7 === 0 ? "先展示可核验结果" : `博主 ${digit} 局部角色 ${postIndex}`,
        contentForm: ["口播"], performanceInterpretation: "只描述冻结样本中的角色，不推断因果。",
        evidenceRefs: [`fixture-evidence:${creatorId}:${postIndex + 1}`], unknowns: [] })),
      boundaries: ["隔离 fixture 只证明系统链路。", "不代表真实博主或真实平台规律。"] },
    gate: { schemaVersion: "1.1.0", creatorRunId: runId, ready: true, gates: [], failedGateIds: [], checkedAt: "2026-08-30T00:00:00.000Z",
      candidateRevisionFingerprint: digit.repeat(64), independentEvaluationArtifactRef: `fixture-artifact:${creatorId}:evaluation`,
      evaluator: { evaluatorRunId: `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-9${digit.repeat(3)}-${digit.repeat(12)}`,
        independentOfCandidate: true, evaluatedAt: "2026-08-30T00:00:00.000Z" } } };
}

export async function seedContentKnowledgeV1Fixture(runtimeInput: string): Promise<ContentKnowledgeV1FixtureManifest> {
  const runtimeDirectory = assertRuntime(runtimeInput);
  const { researchLearning, contentKnowledge: knowledge } = createDurableKnowledgeSystem(path.join(runtimeDirectory, "content-knowledge.sqlite"), path.join(runtimeDirectory, "research-learning.sqlite"));
  const publishingRepository = new SQLitePublishingRepository(path.join(runtimeDirectory, "self-media.sqlite"));
  const comparisonRepository = new SQLiteComparisonProjectRepository(path.join(runtimeDirectory, "self-media.sqlite"));
  const publishing = new PublishingService(publishingRepository, { exists: fs.existsSync }, null);
  try {
    const creators = [0, 1, 2].map(creatorCompletion);
    const creatorCompiler = new CreatorKnowledgeCompiler(knowledge);
    for (const creator of creators) { creatorCompiler.publish(creator); creatorCompiler.publish(creator); }
    const support = creators.flatMap((creator) => [0, 7, 14].map((postIndex) => creator.synthesis.postAnalyses[postIndex]!)
      .filter((post): post is typeof post & { evidenceStatus: "deep_validated" | "surface_only" } =>
        post.evidenceStatus !== "deep_provisional").map((post) => ({
      creatorRunId: creator.creatorRunId, creatorId: creator.creatorId, creatorName: creator.creatorName!,
      postExternalId: post.postExternalId, tier: post.tier, evidenceStatus: post.evidenceStatus,
      contentForm: post.contentForm, evidenceRefs: post.evidenceRefs
    })));
    const comparison: ComparisonResearchCompletion = {
      comparisonProjectId: "44444444-4444-4444-8444-444444444444",
      comparisonArtifactRef: "fixture-artifact:comparison",
      sourceArtifactRefs: creators.flatMap((creator) => [creator.synthesisArtifactRef, creator.gateArtifactRef]),
      comparison: { schemaVersion: "1.0.0", generatedAt: "2026-08-30T00:00:00.000Z", readiness: "content_validated",
        members: creators.map((creator) => ({ creatorRunId: creator.creatorRunId, creatorId: creator.creatorId, sourceRunId: creator.creatorRunId,
          revision: `${creator.synthesisArtifactRef}|${creator.gateArtifactRef}`, creatorName: creator.creatorName ?? creator.creatorId,
          portfolioRevision: "fixture-portfolio-r1", discoveredPosts: 21, likesCoverage: 1, medianLikes: 10, meanLikes: 20, maxLikes: 100,
          headToMedianRatio: 10, meanToMedianRatio: 2, selectedCounts: { high: 7, base: 7, low: 7 } })),
        comparability: { platform: "小红书", metricBasis: "fixture 公开点赞", timeWindowAligned: false, members: [], warnings: ["fixture"] },
        creatorProfiles: [],
        observations: [], exceptions: [], gaps: [], limitations: ["隔离 fixture 不声明真实规律。"],
        contentPatterns: [{ role: "先展示可核验结果", classification: "track_wide",
          statement: "三个独立门控的冻结博主样本都出现该内容角色。", boundary: "只验证链路，不声明因果。",
          creatorIds: creators.map((creator) => creator.creatorId), condition: { format: "口播" }, support }] }
    };
    const comparisonCompiler = new ComparisonKnowledgeCompiler(knowledge);
    const comparisonDirectory = path.join(runtimeDirectory, "runs", comparison.comparisonProjectId);
    fs.mkdirSync(comparisonDirectory, { recursive: true });
    const comparisonArtifactRef = `/artifacts/${comparison.comparisonProjectId}/comparison-r1.json`;
    fs.writeFileSync(path.join(comparisonDirectory, "comparison-r1.json"), `${JSON.stringify(comparison.comparison, null, 2)}\n`);
    comparison.comparisonArtifactRef = comparisonArtifactRef;
    const at = "2026-08-30T00:00:00.000Z";
    comparisonRepository.save({ schemaVersion: "1.0.0", id: comparison.comparisonProjectId, name: "Content Knowledge V1 Fixture Comparison",
      status: "ready", createdAt: at, updatedAt: at,
      members: creators.map((creator) => ({ creatorRunId: creator.creatorRunId, creatorId: creator.creatorId,
        sourceRunId: creator.creatorRunId, revision: `${creator.synthesisArtifactRef}|${creator.gateArtifactRef}`,
        creatorName: creator.creatorName ?? creator.creatorId, portfolioArtifactRef: creator.synthesisArtifactRef,
        selectionArtifactRef: creator.synthesisArtifactRef, synthesisArtifactRef: creator.synthesisArtifactRef,
        synthesisGateArtifactRef: creator.gateArtifactRef, pinnedAt: at })),
      inputArtifactRef: "fixture-artifact:comparison-input", comparisonArtifactRef,
      knowledgeCompilation: { status: "succeeded", message: "Fixture uses the production comparison compiler." },
      job: { state: "succeeded", attempt: 1, leaseOwner: null, leaseExpiresAt: null, lastHeartbeatAt: at }, error: null });
    comparisonCompiler.publish(comparison);
    comparisonCompiler.publish(comparison);
    const concept = knowledge.listKnowledge().find((item) => item.research.concept.scope === "track_wide");
    if (!concept) throw new Error("fixture comparison did not promote a track-wide concept");

    const contentPackage = publishing.createPackage({ name: "Content Knowledge V1 Fixture", brief: "消费固定知识 revision 并回流第一方实践。",
      sourceRefs: [`concept-revision:${concept.research.currentRevision.id}`] });
    const snapshot = publishing.listPackageSnapshots(contentPackage.id)[0]!;
    const binding = knowledge.createBinding({ operationKey: "fixture:v1:binding", contentPackageId: contentPackage.id,
      contentPackageSnapshotId: snapshot.id, targetType: "concept_revision", targetId: concept.research.currentRevision.id,
      usage: "test", rationale: "只在隔离发布中验证该知识 revision。" });
    const hypothesis = knowledge.createHypothesis({ operationKey: "fixture:v1:hypothesis", contentPackageId: contentPackage.id,
      contentPackageSnapshotId: snapshot.id, statement: "先展示可核验结果可能提高收藏。", linkedBindingIds: [binding.id],
      expectedSignals: ["saves"], unavailableSignals: ["impressions"], baselineDeclaration: "隔离 fixture baseline", confounders: ["fixture 数据不代表平台"] });
    const mediaPath = path.join(runtimeDirectory, "fixture.mp4");
    fs.writeFileSync(mediaPath, "fixture-only");
    const variant = publishing.createVariant(contentPackage.id, { contentPackageSnapshotId: snapshot.id, platform: "douyin", title: "Fixture",
      body: "不会提交到外部平台。", contentType: "video", media: [{ kind: "video", localPath: mediaPath, mimeType: "video/mp4" }],
      tags: ["fixture"], visibility: "private", scheduledAt: null, platformOptions: { douyin: { declaration: "self_made" } } });
    const run = publishing.createRun(variant.id);
    const receipt = { externalId: "fixture-local-only", externalUrl: null, platformState: "fixture_published", verifiedAt: "2026-08-30T00:00:00.000Z" };
    publishingRepository.saveRun({ ...run, status: "published", currentStage: "isolated fixture", receipt, updatedAt: receipt.verifiedAt } as PublicationRun);
    const validation = knowledge.createValidation({ operationKey: "fixture:v1:validation", publicationRunId: run.id,
      contentPackageId: contentPackage.id, contentPackageSnapshotId: snapshot.id, variantId: variant.id, variantRevision: variant.revision,
      hypothesisId: hypothesis.id, executionSnapshot: { status: "published", receipt },
      observedSignals: [{ name: "saves", value: 7, unit: "count", source: "fixture", collectedAt: receipt.verifiedAt }],
      unavailableMetrics: [{ name: "impressions", reason: "fixture intentionally omits platform denominator", source: "fixture", recordedAt: receipt.verifiedAt }],
      executionDeviations: [], confounders: ["fixture only"] });
    knowledge.submitValidation(validation.id, { operationKey: "fixture:v1:submit", proposedRelation: "confirm",
      targetConceptId: concept.research.concept.id, decisionReason: "隔离观察只进入第一方实践分区。", submittedBy: "fixture-reviewer" });
    const adjudicated = knowledge.adjudicateValidation(validation.id, { operationKey: "fixture:v1:adjudicate", decision: "promote",
      reason: "lineage 完整，允许写入隔离第一方观察。", adjudicatorId: "fixture-independent-adjudicator" });
    const refreshed = knowledge.getKnowledge(concept.research.concept.id)!;
    const manifest: ContentKnowledgeV1FixtureManifest = { schemaVersion: "content-knowledge-v1-fixture@1", runtimeDirectory,
      creatorManifestCount: creators.reduce((count, creator) => count + knowledge.listContributions("creator", creator.creatorRunId).length, 0),
      comparisonManifestCount: knowledge.listContributions("comparison", comparison.comparisonProjectId).length,
      comparisonProjectId: comparison.comparisonProjectId,
      conceptId: refreshed.research.concept.id, conceptRevisionId: refreshed.research.currentRevision.id, conceptScope: "track_wide",
      supportingCreators: refreshed.research.counts.distinctEligibleCreators, supportingVideos: refreshed.research.counts.distinctEligibleVideos,
      contentPackageId: contentPackage.id, bindingId: binding.id, validationId: adjudicated.id,
      practiceObservationId: adjudicated.promotedObservationId!, idempotentRetryProven: true, externalSubmission: false };
    fs.writeFileSync(path.join(runtimeDirectory, "content-knowledge-v1-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    return manifest;
  } finally {
    publishing.close();
    comparisonRepository.close();
    researchLearning.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const runtimeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  process.stdout.write(`${JSON.stringify(await seedContentKnowledgeV1Fixture(runtimeDirectory), null, 2)}\n`);
}
