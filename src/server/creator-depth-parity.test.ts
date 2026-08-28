import { describe, expect, it } from "vitest";
import type { CreatorResearchService } from "../../packages/research/index.js";
import type { CreatorDossier, ResearchStatement } from "../shared/creator-dossier.js";
import type { VideoResearch } from "../shared/video-research.js";
import { loadCreatorDossier } from "./creator-dossier.js";
import { loadVideoResearch } from "./video-research.js";

const describeWithExternalEvidence = process.env.SIGNAL_ROOM_EVIDENCE_ROOT ? describe : describe.skip;

const emptyCreatorService = { list: () => [], get: () => null } as unknown as CreatorResearchService;

const placeholder = /(待识别|等待(?:证据化)?归纳|等待.*闭环|尚未(?:生成|恢复|迁移)|兼容(?:页面|投影|数据)|只投影|未进入当前|标题未识别|完整文章尚未生成|^unknown$|^未知$)/i;

function expectMeaningfulText(value: string | null | undefined, label: string, minimum = 8) {
  expect.soft(value, `${label} should exist`).toBeTruthy();
  const normalized = value?.replace(/\s+/g, " ").trim() ?? "";
  expect.soft(normalized.length, `${label} should contain substantive analysis`).toBeGreaterThanOrEqual(minimum);
  expect.soft(normalized, `${label} must not be a compatibility or unknown placeholder`).not.toMatch(placeholder);
}

function expectSourcedStatement(value: ResearchStatement, label: string) {
  expectMeaningfulText(value.statement, label);
  expect.soft(value.factClass, `${label} has source material and cannot be unknown`).not.toBe("unknown");
  expect.soft(value.evidenceRefs.length, `${label} should point back to source evidence`).toBeGreaterThan(0);
}

function dossier(id: string): CreatorDossier {
  const value = loadCreatorDossier(emptyCreatorService, id);
  expect(value, `${id} dossier should be readable`).not.toBeNull();
  return value!;
}

function expectIdentityDepth(value: CreatorDossier) {
  expectMeaningfulText(value.identity.name, `${value.canonicalId}.identity.name`, 2);
  expectSourcedStatement(value.identity.positioning, `${value.canonicalId}.identity.positioning`);
  expect.soft(value.identity.audience.length).toBeGreaterThan(0);
  expect.soft(value.identity.valuesProvided.length).toBeGreaterThan(0);
  expect.soft(value.identity.trustSources.length).toBeGreaterThan(0);
  value.identity.audience.forEach((row, index) => expectSourcedStatement(row, `${value.canonicalId}.identity.audience[${index}]`));
  value.identity.valuesProvided.forEach((row, index) => expectSourcedStatement(row, `${value.canonicalId}.identity.valuesProvided[${index}]`));
  value.identity.trustSources.forEach((row, index) => expectSourcedStatement(row, `${value.canonicalId}.identity.trustSources[${index}]`));
}

function expectBaselineDepth(value: CreatorDossier, expectedCount: number) {
  expect.soft(value.corpus.postCount).toBe(expectedCount);
  expect.soft(value.corpus.likesKnown).toBeGreaterThan(0);
  expect.soft(value.corpus.medianLikes).toBeTypeOf("number");
  expect.soft(value.corpus.meanLikes).toBeTypeOf("number");
  expect.soft(value.corpus.maxLikes).toBeTypeOf("number");
  expect.soft(value.corpus.maxLikes!).toBeGreaterThanOrEqual(value.corpus.meanLikes!);
  expect.soft(value.corpus.meanLikes!).toBeGreaterThanOrEqual(value.corpus.medianLikes!);
  expect.soft(value.corpus.distribution.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(expectedCount);
}

function expectClusterDepth(value: CreatorDossier) {
  for (const [kind, clusters] of [["topic", value.contentSystem.topicClusters], ["format", value.contentSystem.formatClusters]] as const) {
    expect.soft(clusters.length, `${value.canonicalId} should retain numeric ${kind} clusters from its source artifacts`).toBeGreaterThan(0);
    clusters.forEach((cluster, index) => {
      const label = `${value.canonicalId}.${kind}Clusters[${index}]`;
      expectMeaningfulText(cluster.name, `${label}.name`, 2);
      expect.soft(cluster.count, `${label}.count`).toBeGreaterThan(0);
      expect.soft(cluster.measuredCount, `${label}.measuredCount`).toBeGreaterThan(0);
      expect.soft(cluster.medianLikes, `${label}.medianLikes`).toBeTypeOf("number");
      expect.soft(cluster.meanLikes, `${label}.meanLikes`).toBeTypeOf("number");
      expect.soft(cluster.maxLikes, `${label}.maxLikes`).toBeTypeOf("number");
      expect.soft(cluster.evidenceRefs.length, `${label}.evidenceRefs`).toBeGreaterThan(0);
    });
  }
}

function expectTierDepth(value: CreatorDossier) {
  expect.soft(value.tiers.map((tier) => tier.id)).toEqual(["high", "base", "low"]);
  value.tiers.forEach((tier) => {
    const label = `${value.canonicalId}.${tier.id}`;
    expect.soft(tier.count, `${label}.count`).toBeGreaterThan(0);
    expect.soft(tier.metrics.medianLikes, `${label}.medianLikes`).toBeTypeOf("number");
    expect.soft(tier.metrics.meanLikes, `${label}.meanLikes`).toBeTypeOf("number");
    expect.soft(tier.metrics.minLikes, `${label}.minLikes`).toBeTypeOf("number");
    expect.soft(tier.metrics.maxLikes, `${label}.maxLikes`).toBeTypeOf("number");
    expect.soft(tier.conclusion.length, `${label} should explain the tier rather than only name it`).toBeGreaterThan(0);
    expect.soft(tier.mechanisms.length, `${label} should retain at least one evidence-backed mechanism`).toBeGreaterThan(0);
    tier.conclusion.forEach((row, index) => expectSourcedStatement(row, `${label}.conclusion[${index}]`));
    tier.mechanisms.forEach((row, index) => expectSourcedStatement(row, `${label}.mechanisms[${index}]`));
  });
}

function expectPortfolioDepth(value: CreatorDossier, expectedItems: number, expectedDeep: number) {
  expect.soft(value.portfolio.items).toHaveLength(expectedItems);
  expect.soft(new Set(value.portfolio.items.map((item) => item.id)).size).toBe(expectedItems);
  expect.soft(value.portfolio.deepCount).toBe(expectedDeep);
  expect.soft(value.portfolio.items.filter((item) => item.deepSample)).toHaveLength(expectedDeep);
  value.portfolio.items.forEach((item, index) => {
    const label = `${value.canonicalId}.portfolio[${index}:${item.id}]`;
    expectMeaningfulText(item.title, `${label}.title`, 2);
    expect.soft(item.likes, `${label}.likes should retain its public metric`).toBeTypeOf("number");
    expectMeaningfulText(item.coreContent, `${label}.coreContent`);
    expectMeaningfulText(item.mechanismHypothesis, `${label}.mechanismHypothesis`);
    expect.soft(item.contentArchitecture.length, `${label}.contentArchitecture should not be an empty schema projection`).toBeGreaterThan(0);
    item.contentArchitecture.forEach((stage, stageIndex) => expectMeaningfulText(stage, `${label}.contentArchitecture[${stageIndex}]`, 2));
    expectMeaningfulText(item.selectionReason, `${label}.selectionReason`);
    expect.soft(item.evidenceStatus, `${label}.evidenceStatus`).not.toBe("missing");
    if (item.deepSample) {
      expect.soft(item.evidenceHref, `${label} deep sample should open an evidence page`).toBeTruthy();
      expect.soft(item.evidenceStatus, `${label} deep sample cannot be surface-only`).not.toBe("surface_only");
    }
  });
}

describeWithExternalEvidence("creator dossier depth parity with the existing research artifacts", () => {
  it("preserves AI红发魔女: 331 baseline / 21 comparison / 9 deep", () => {
    const value = dossier("ai-red-witch");
    expectIdentityDepth(value);
    expectBaselineDepth(value, 331);
    expectClusterDepth(value);
    expectTierDepth(value);
    expectPortfolioDepth(value, 21, 9);
  });

  it("preserves 张咋啦: 62-post baseline and a non-empty 21-record comparison", () => {
    const value = dossier("zhang-zala");
    expectIdentityDepth(value);
    expectBaselineDepth(value, 62);
    expectClusterDepth(value);
    expectTierDepth(value);
    expectPortfolioDepth(value, 21, 9);
    expect.soft(value.portfolio.items.some((item) => item.anchors.includes("median_near"))).toBe(true);
    expect.soft(value.portfolio.items.some((item) => item.anchors.includes("mean_near"))).toBe(true);
  });

  it("preserves 人类最强编导: all 19 posts and 8 deep samples", () => {
    const value = dossier("human-director");
    expectIdentityDepth(value);
    expectBaselineDepth(value, 19);
    expectClusterDepth(value);
    expectTierDepth(value);
    expectPortfolioDepth(value, 19, 8);
  });
});

function representativeVideo(creatorId: string, videoId: string): VideoResearch {
  const value = loadVideoResearch(emptyCreatorService, creatorId, videoId);
  expect(value, `${creatorId}/${videoId} should project its existing evidence pack`).not.toBeNull();
  return value!;
}

function expectVideoDepth(value: VideoResearch) {
  const label = `${value.creatorId}/${value.id}`;
  expectMeaningfulText(value.thesis, `${label}.thesis`, 12);
  expectMeaningfulText(value.article, `${label}.article`, 160);

  expect.soft(value.knowledgeUnits.length, `${label} needs multiple restored knowledge units`).toBeGreaterThanOrEqual(3);
  value.knowledgeUnits.forEach((unit, index) => {
    expectMeaningfulText(unit.title, `${label}.knowledgeUnits[${index}].title`, 2);
    expectMeaningfulText(unit.statement, `${label}.knowledgeUnits[${index}].statement`);
  });

  expectMeaningfulText(value.directingLogic.viewerBefore, `${label}.directingLogic.viewerBefore`);
  expectMeaningfulText(value.directingLogic.viewerAfter, `${label}.directingLogic.viewerAfter`);
  expect.soft(value.directingLogic.stages.length, `${label} needs an actual directing progression`).toBeGreaterThanOrEqual(2);
  value.directingLogic.stages.forEach((stage, index) => {
    expectMeaningfulText(stage.label, `${label}.directingLogic.stages[${index}].label`, 2);
    expectMeaningfulText(stage.function, `${label}.directingLogic.stages[${index}].function`);
  });

  expectMeaningfulText(value.visualEditing.orientation, `${label}.visualEditing.orientation`, 2);
  expectMeaningfulText(value.visualEditing.composition, `${label}.visualEditing.composition`, 2);
  expect.soft(value.visualEditing.notes.length, `${label} needs concrete picture/editing observations`).toBeGreaterThan(0);
  value.visualEditing.notes.forEach((note, index) => expectMeaningfulText(note, `${label}.visualEditing.notes[${index}]`));

  expect.soft(value.evidenceHealth.state, `${label} may be partial when evidence is genuinely missing, but not empty`).not.toBe("missing");
  expect.soft(value.evidenceHealth.transcript, `${label} transcript channel`).toBe(true);
  expect.soft(value.evidenceHealth.frames, `${label} frame channel`).toBe(true);
  expect.soft(value.transcript.length, `${label} transcript should be substantive`).toBeGreaterThanOrEqual(5);
  expect.soft(value.frames.sparse.length, `${label} sparse frame view`).toBeGreaterThanOrEqual(3);
  expect.soft(value.frames.dense.length, `${label} dense frame view`).toBeGreaterThanOrEqual(5);
  expect.soft(value.unknowns.length + value.conflicts.length + value.coverage.uncheckedChannels.length,
    `${label} must explicitly preserve unknowns/conflicts/unchecked channels`).toBeGreaterThan(0);

  if (value.gate.ready) {
    expect.soft(value.coverage.coreCovered).toBe(value.coverage.coreTotal);
    expect.soft(value.coverage.uncheckedChannels).toHaveLength(0);
  } else {
    expectMeaningfulText(value.evidenceHealth.note, `${label}.partialEvidenceNote`);
    expect.soft(value.gate.failedGateIds.length + value.coverage.uncheckedChannels.length + value.unknowns.length,
      `${label} partial evidence must disclose why it is not ready`).toBeGreaterThan(0);
  }
}

describeWithExternalEvidence("representative single-video depth parity", () => {
  it("restores content, directing, picture/editing and evidence for AI红发魔女", () => {
    expectVideoDepth(representativeVideo("ai-red-witch", "6801c0750000000007037156"));
  });

  it("restores content, directing, picture/editing and evidence for 张咋啦", () => {
    expectVideoDepth(representativeVideo("zhang-zala", "6a31edc300000000200387f4"));
  });

  it("restores content, directing, picture/editing and evidence for 人类最强编导", () => {
    expectVideoDepth(representativeVideo("human-director", "6a2fcd940000000007021a9f"));
  });
});
