import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { IngestAnalysisRevision, ResearchCondition, ResearchObservation } from "../shared/research-learning.js";
import {
  createDurableResearchLearningService,
  evaluateResearchPromotion,
  ResearchLearningService,
  type RecordResearchObservationInput
} from "./research-learning.js";

function withDurableService(run: (filePath: string) => void): void {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "research-learning-test-"));
  const filePath = path.join(directory, "research-learning.sqlite");
  try {
    run(filePath);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

function service(): ResearchLearningService {
  let sequence = 0;
  return new ResearchLearningService(
    () => `id-${++sequence}`,
    () => "2026-08-21T00:00:00.000Z"
  );
}

function createConcept(value: ResearchLearningService) {
  return value.createConcept({
    slug: "result-first-proof",
    kind: "proof_mode",
    name: "先结果后过程",
    definition: "在解释过程前展示可检查的结果证据。",
    exclusions: ["只有结果口号但没有可检查证据。"]
  });
}

function observationInput(
  conceptId: string,
  creatorId: string,
  videoId: string,
  overrides: Partial<RecordResearchObservationInput> = {}
): RecordResearchObservationInput {
  return {
    conceptId,
    subjectType: "video",
    subjectId: videoId,
    creatorId,
    videoId,
    relation: "confirm",
    condition: { tier: videoId.endsWith("1") ? "high" : "base", format: "talking-head" },
    statement: `${videoId} 先展示结果证据，再解释过程。`,
    evidenceRefs: [`cue:${videoId}:1`],
    analysisRevisionId: `analysis:${videoId}`,
    confidence: "high",
    sourceGateState: "ready",
    deepReconstruction: videoId.endsWith("1"),
    ...overrides
  };
}

function rawObservation(
  id: string,
  creatorId: string,
  videoId: string,
  relation: ResearchObservation["relation"],
  condition: Partial<ResearchCondition>,
  deepReconstruction = false
): ResearchObservation {
  return {
    id,
    conceptId: "concept",
    conceptRevisionId: "revision",
    subjectType: "video",
    subjectId: videoId,
    creatorId,
    videoId,
    relation,
    condition: {
      tier: null,
      topic: null,
      format: null,
      era: null,
      audienceProblem: null,
      proofContext: null,
      ...condition
    },
    statement: `${relation}:${creatorId}:${videoId}`,
    evidenceRefs: [`cue:${videoId}`],
    analysisRevisionId: `analysis:${videoId}`,
    confidence: "high",
    sourceGateState: "ready",
    gateState: "eligible",
    deepReconstruction,
    createdAt: "2026-08-21T00:00:00.000Z"
  };
}

function ingestInput(
  analysisRevisionId: string,
  overrides: Partial<IngestAnalysisRevision> = {}
): IngestAnalysisRevision {
  return {
    analysisRevisionId,
    subjectType: "video",
    subjectId: `video:${analysisRevisionId}`,
    creatorId: "creator-durable",
    videoId: `video:${analysisRevisionId}`,
    deepReconstruction: analysisRevisionId.endsWith("1"),
    lensGates: { contentRestoration: "ready", directingLogic: "ready", visualEditingLogic: "ready" },
    observations: [{
      concept: {
        slug: "durable-result-first",
        kind: "proof_mode",
        name: "持久化先结果后过程",
        definition: "展示结果证据后解释过程。",
        exclusions: ["只有无法检查的口号。"]
      },
      relation: "confirm",
      condition: { tier: analysisRevisionId.endsWith("1") ? "high" : "base" },
      statement: `${analysisRevisionId} 观察到先结果后过程。`,
      evidenceRefs: [`cue:${analysisRevisionId}`],
      confidence: "high"
    }],
    ...overrides
  };
}

describe("research learning observations", () => {
  it("quarantines unready sources and suppresses duplicate-video votes", () => {
    const learning = service();
    const conceptId = createConcept(learning).concept.id;
    learning.recordObservation(observationInput(conceptId, "creator-a", "video-1"));
    learning.recordObservation(observationInput(conceptId, "creator-a", "video-1", {
      statement: "同一视频的第二条支持证据",
      evidenceRefs: ["frame:video-1:2"]
    }));
    learning.recordObservation(observationInput(conceptId, "creator-a", "video-2", {
      sourceGateState: "not_ready"
    }));

    const read = learning.get(conceptId)!;
    expect(read.observations).toHaveLength(3);
    expect(read.counts.confirm).toBe(1);
    expect(read.counts.distinctEligibleVideos).toBe(1);
    expect(read.counts.quarantined).toBe(1);
    expect(read.observations.find((item) => item.videoId === "video-2")?.gateState).toBe("quarantined");
  });

  it("requires three distinct videos, a deep reconstruction, and tier breadth for creator promotion", () => {
    const learning = service();
    const conceptId = createConcept(learning).concept.id;
    learning.recordObservation(observationInput(conceptId, "creator-a", "video-1"));
    learning.recordObservation(observationInput(conceptId, "creator-a", "video-2"));
    learning.recordObservation(observationInput(conceptId, "creator-a", "video-2", { statement: "重复投票", evidenceRefs: ["cue:duplicate"] }));

    expect(() => learning.promote(conceptId, {
      targetScope: "creator_specific",
      creatorId: "creator-a",
      decision: "三条视频形成创作者级模式。"
    })).toThrow(/3-distinct-supporting-videos/);

    learning.recordObservation(observationInput(conceptId, "creator-a", "video-3"));
    const promoted = learning.promote(conceptId, {
      targetScope: "creator_specific",
      creatorId: "creator-a",
      decision: "三个不同视频，覆盖 High 与 Base，且有深重建。"
    });
    expect(promoted.concept.scope).toBe("creator_specific");
    expect(promoted.concept.status).toBe("active");
    expect(promoted.currentRevision.eligibleObservationIds).toHaveLength(3);
    expect(promoted.currentRevision.excludedObservationIds.some((item) => item.reason === "duplicate-video-vote")).toBe(true);
  });
});

describe("research learning promotion gates", () => {
  function trackObservations(contradictions: number): ResearchObservation[] {
    const rows: ResearchObservation[] = [];
    for (const creator of ["a", "b", "c"]) {
      rows.push(rawObservation(`${creator}-1`, creator, `${creator}-1`, "confirm", { tier: "high", format: "talking-head" }, true));
      rows.push(rawObservation(`${creator}-2`, creator, `${creator}-2`, "confirm", { tier: "base", format: "talking-head" }));
      rows.push(rawObservation(`${creator}-3`, creator, `${creator}-3`, "qualify", { tier: "base", format: "talking-head" }));
    }
    for (let index = 0; index < contradictions; index += 1) {
      rows.push(rawObservation(`x-${index}`, ["a", "b", "c"][index % 3]!, `counter-${index}`, "contradict", { tier: "base", format: "talking-head" }));
    }
    return rows;
  }

  it("promotes track-wide only with three comparable creators, nine support videos, deep evidence, and <=20% contradictions", () => {
    const pass = evaluateResearchPromotion(trackObservations(2), {
      targetScope: "track_wide",
      comparableCreatorIds: ["a", "b", "c"],
      condition: { format: "talking-head" },
      decision: "三位可比博主满足跨博主门槛。"
    });
    expect(pass.ready).toBe(true);
    expect(pass.supportingVideos).toBe(9);
    expect(pass.supportingCreators).toBe(3);
    expect(pass.contradictionRate).toBeCloseTo(2 / 11);

    const fail = evaluateResearchPromotion(trackObservations(3), {
      targetScope: "track_wide",
      comparableCreatorIds: ["a", "b", "c"],
      condition: { format: "talking-head" },
      decision: "反例超过门槛。"
    });
    expect(fail.ready).toBe(false);
    expect(fail.failures).toContain("track-wide-contradiction-rate-exceeds-20-percent");
  });

  it("requires two complete creator-specific evidence sets for conditional promotion", () => {
    const observations = [
      rawObservation("a-1", "a", "a-1", "confirm", { format: "demo" }, true),
      rawObservation("a-2", "a", "a-2", "confirm", { format: "demo" }),
      rawObservation("a-3", "a", "a-3", "confirm", { format: "demo" }),
      rawObservation("b-1", "b", "b-1", "confirm", { format: "demo" }, true),
      rawObservation("b-2", "b", "b-2", "confirm", { format: "demo" }),
      rawObservation("b-3", "b", "b-3", "confirm", { format: "demo" })
    ];
    const result = evaluateResearchPromotion(observations, {
      targetScope: "conditional",
      condition: { format: "demo" },
      decision: "只在演示型内容中成立。"
    });
    expect(result.ready).toBe(true);
  });
});

describe("research learning invalidation cascade", () => {
  it("demotes after evidence loss, stales dependent conclusions, then invalidates when no support remains", () => {
    const learning = service();
    const conceptId = createConcept(learning).concept.id;
    for (const videoId of ["video-1", "video-2", "video-3"]) {
      learning.recordObservation(observationInput(conceptId, "creator-a", videoId));
    }
    learning.promote(conceptId, {
      targetScope: "creator_specific",
      creatorId: "creator-a",
      decision: "满足创作者级门槛。"
    });
    learning.registerDependentConclusion({
      id: "conclusion-1",
      conceptIds: [conceptId],
      statement: "该博主反复使用先结果后过程。"
    });

    learning.invalidateAnalysisRevision("analysis:video-2", "video-2 的来源 gate 失效");
    let read = learning.get(conceptId)!;
    expect(read.concept.scope).toBe("video_specific");
    expect(read.currentRevision.changeType).toBe("demote");
    expect(read.dependentConclusions[0]?.status).toBe("stale_available");

    learning.invalidateAnalysisRevision("analysis:video-1", "其余支持证据失效");
    learning.invalidateAnalysisRevision("analysis:video-3", "其余支持证据失效");
    read = learning.get(conceptId)!;
    expect(read.concept.status).toBe("invalidated");
    expect(read.currentRevision.changeType).toBe("invalidate");
    expect(read.counts.invalid).toBe(3);
  });

  it("keeps a promoted scope when remaining evidence still passes its stored promotion gate", () => {
    const learning = service();
    const conceptId = createConcept(learning).concept.id;
    for (const videoId of ["video-1", "video-2", "video-3", "video-4"]) {
      learning.recordObservation(observationInput(conceptId, "creator-a", videoId, {
        deepReconstruction: videoId === "video-1" || videoId === "video-4"
      }));
    }
    learning.promote(conceptId, {
      targetScope: "creator_specific",
      creatorId: "creator-a",
      decision: "四条视频满足创作者级门槛。"
    });
    learning.invalidateAnalysisRevision("analysis:video-4", "一条冗余支持来源失效");
    const read = learning.get(conceptId)!;
    expect(read.concept.scope).toBe("creator_specific");
    expect(read.concept.status).toBe("active");
    expect(read.currentRevision.changeType).toBe("confirm");
  });

  it("marks an active creator concept contradicted and stales its dependent conclusions", () => {
    const learning = service();
    const conceptId = createConcept(learning).concept.id;
    for (const videoId of ["video-1", "video-2", "video-3"]) {
      learning.recordObservation(observationInput(conceptId, "creator-a", videoId));
    }
    learning.promote(conceptId, {
      targetScope: "creator_specific",
      creatorId: "creator-a",
      decision: "满足创作者级门槛。"
    });
    learning.registerDependentConclusion({ id: "conclusion-2", conceptIds: [conceptId], statement: "创作者级结论" });
    learning.recordObservation(observationInput(conceptId, "creator-a", "counter-4", {
      relation: "contradict",
      condition: { tier: "base" },
      deepReconstruction: false
    }));
    const read = learning.get(conceptId)!;
    expect(read.concept.status).toBe("contradicted");
    expect(read.currentRevision.changeType).toBe("contradict");
    expect(read.dependentConclusions[0]?.status).toBe("stale_available");
  });
});

describe("durable analysis-revision ingestion", () => {
  it("recovers append-only concepts and observations after restart and keeps ingestion idempotent", () => {
    withDurableService((filePath) => {
      const first = createDurableResearchLearningService(filePath);
      const input = ingestInput("analysis-ready-1");
      const ingested = first.ingestAnalysisRevision(input);
      expect(ingested.idempotent).toBe(false);
      expect(ingested.sourceGateState).toBe("ready");
      expect(ingested.observations[0]?.gateState).toBe("eligible");
      const conceptId = first.list()[0]!.concept.id;
      first.close();

      const restarted = createDurableResearchLearningService(filePath);
      expect(restarted.get(conceptId)?.counts.confirm).toBe(1);
      const repeated = restarted.ingestAnalysisRevision(input);
      expect(repeated.idempotent).toBe(true);
      expect(repeated.observations.map((item) => item.id)).toEqual(ingested.observations.map((item) => item.id));
      expect(restarted.get(conceptId)?.observations).toHaveLength(1);
      restarted.close();
    });
  });

  it("makes observations eligible only when CR, DL, and VE are all ready", () => {
    withDurableService((filePath) => {
      const learning = createDurableResearchLearningService(filePath);
      const ready = learning.ingestAnalysisRevision(ingestInput("analysis-ready-1"));
      const conceptId = ready.observations[0]!.conceptId;
      const baseObservation = ready.observations[0]!;
      const candidate = {
        conceptId,
        relation: "confirm" as const,
        condition: { tier: "base" as const },
        statement: "隔离状态观察",
        evidenceRefs: ["cue:isolated"],
        confidence: "medium" as const
      };
      const partial = learning.ingestAnalysisRevision(ingestInput("analysis-partial", {
        lensGates: { contentRestoration: "ready", directingLogic: "partial", visualEditingLogic: "ready" },
        observations: [candidate]
      }));
      const stale = learning.ingestAnalysisRevision(ingestInput("analysis-stale", {
        lensGates: { contentRestoration: "stale", directingLogic: "ready", visualEditingLogic: "ready" },
        observations: [candidate]
      }));
      const invalid = learning.ingestAnalysisRevision(ingestInput("analysis-invalid", {
        lensGates: { contentRestoration: "ready", directingLogic: "ready", visualEditingLogic: "invalid" },
        observations: [candidate]
      }));

      expect([partial.sourceGateState, stale.sourceGateState, invalid.sourceGateState]).toEqual(["partial", "stale", "invalid"]);
      expect(partial.observations[0]?.gateState).toBe("quarantined");
      expect(stale.observations[0]?.gateState).toBe("quarantined");
      expect(invalid.observations[0]?.gateState).toBe("invalid");
      expect(baseObservation.gateState).toBe("eligible");
      expect(learning.get(conceptId)?.counts).toMatchObject({ confirm: 1, quarantined: 2, invalid: 1 });
      learning.close();
    });
  });

  it("persists promotion context, invalidation, demotion, and stale-conclusion cascade across restarts", () => {
    withDurableService((filePath) => {
      let learning = createDurableResearchLearningService(filePath);
      const ingestions = ["analysis-1", "analysis-2", "analysis-3"].map((analysisRevisionId) =>
        learning.ingestAnalysisRevision(ingestInput(analysisRevisionId))
      );
      const conceptId = ingestions[0]!.observations[0]!.conceptId;
      learning.promote(conceptId, {
        targetScope: "creator_specific",
        creatorId: "creator-durable",
        decision: "三条 passed analysis revisions 满足 creator promotion。"
      });
      learning.registerDependentConclusion({
        id: "durable-conclusion",
        conceptIds: [conceptId],
        statement: "持久化依赖结论"
      });
      learning.close();

      learning = createDurableResearchLearningService(filePath);
      expect(learning.get(conceptId)?.concept.scope).toBe("creator_specific");
      learning.invalidateAnalysisRevision("analysis-2", "分析修订失效");
      expect(learning.get(conceptId)?.currentRevision.changeType).toBe("demote");
      expect(learning.get(conceptId)?.dependentConclusions[0]?.status).toBe("stale_available");
      learning.close();

      learning = createDurableResearchLearningService(filePath);
      expect(learning.get(conceptId)?.concept.scope).toBe("video_specific");
      expect(learning.get(conceptId)?.observations.find((item) => item.analysisRevisionId === "analysis-2")?.gateState).toBe("invalid");
      expect(learning.get(conceptId)?.dependentConclusions[0]?.status).toBe("stale_available");
      learning.close();
    });
  });
});
