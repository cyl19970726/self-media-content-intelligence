import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import type { AnalysisService } from "../core/service.js";
import type { CreatorResearchService } from "../modules/creator-research/service.js";
import type { ComparisonProjectService } from "../modules/comparison/service.js";
import { learningLoopRunSchema } from "../shared/learning-loop.js";
import { createApp } from "./app.js";
import { createDurableLearningLoopControlPlane, seedInitialProductBlindAudit, seedProductBlindRegressionV2, type LearningLoopControlPlane } from "./learning-loop.js";
import type { ResearchLearningService } from "./research-learning.js";
import type { PublishingService } from "../modules/publishing/service.js";
import type { RedFoxCreatorDiscoveryService } from "../modules/creator-discovery/redfox-service.js";
import type { ContentKnowledgeService } from "../modules/content-knowledge/service.js";

const tempDirectories: string[] = [];
const servers: Server[] = [];
const controls: LearningLoopControlPlane[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  controls.splice(0).forEach((control) => control.close());
  tempDirectories.splice(0).forEach((directory) => fs.rmSync(directory, { recursive: true, force: true }));
});

async function fixtureServer() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "learning-loop-api-"));
  tempDirectories.push(directory);
  const control = createDurableLearningLoopControlPlane(path.join(directory, "loop.sqlite"));
  controls.push(control);
  seedInitialProductBlindAudit(control);
  seedProductBlindRegressionV2(control);
  const unused = {} as unknown;
  const app = createApp({
    analysis: unused as AnalysisService,
    creatorResearch: unused as CreatorResearchService,
    comparisons: unused as ComparisonProjectService,
    researchLearning: { list: () => [], get: () => null } as unknown as ResearchLearningService,
    learningLoop: control,
    publishing: unused as PublishingService,
    creatorDiscovery: unused as RedFoxCreatorDiscoveryService,
    contentKnowledge: unused as ContentKnowledgeService
  });
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("test server has no port");
  return `http://127.0.0.1:${address.port}`;
}

describe("learning loop API", () => {
  it("publishes the product-blind failure, gates, events, and evidence lineage without promotion", async () => {
    const base = await fixtureServer();
    const list = await fetch(`${base}/api/v1/learning-loops`).then((response) => response.json()) as { runs: unknown[] };
    expect(list.runs).toHaveLength(2);
    const run = learningLoopRunSchema.parse(list.runs.find((candidate) => typeof candidate === "object" && candidate !== null && "id" in candidate && candidate.id === "product-blind-2026-08-21-v1"));
    expect(run.status).toBe("repair_queued");
    expect(run.pendingObservationIds).toEqual([]);
    expect(run.observationAdjudications).toEqual([]);
    expect(run.gates.find((gate) => gate.kind === "blind_quality")?.pass).toBe(false);

    const gates = await fetch(`${base}/api/v1/learning-loops/${run.id}/gates`).then((response) => response.json()) as { gates: unknown[] };
    const events = await fetch(`${base}/api/v1/learning-loops/${run.id}/events`).then((response) => response.json()) as { events: unknown[] };
    const lineage = await fetch(`${base}/api/v1/learning-loops/${run.id}/lineage`).then((response) => response.json()) as { nodes: unknown[]; edges: unknown[] };
    expect(gates.gates).toHaveLength(3);
    expect(events.events).toHaveLength(1);
    expect(lineage.nodes).toHaveLength(4);
    expect(lineage.edges).toHaveLength(4);
    const regressionV2 = learningLoopRunSchema.parse(list.runs.find((candidate) => typeof candidate === "object" && candidate !== null && "id" in candidate && candidate.id === "product-blind-2026-08-21-regression-v2"));
    expect(regressionV2.status).toBe("draft");
    expect(regressionV2.gates).toEqual([]);
    expect(regressionV2.observationAdjudications).toEqual([]);
  });

  it("rejects unknown fields and invalid state transitions", async () => {
    const base = await fixtureServer();
    const malformed = await fetch(`${base}/api/v1/learning-loops`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policyVersion: "v1", inputHash: "x", upstreamHashes: {}, targetCreatorIds: ["a"], operationKey: "operation:create", surprise: true })
    });
    expect(malformed.status).toBe(400);
    const transition = await fetch(`${base}/api/v1/learning-loops/product-blind-2026-08-21-v1/move`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target: "sampling", operationKey: "operation:invalid-transition" })
    });
    expect(transition.status).toBe(409);
    const mixedPromotion = await fetch(`${base}/api/v1/learning-loops/product-blind-2026-08-21-v1/adjudications`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operationKey: "operation:mixed-adjudication", decisions: [
        { id: "decision:promote", runId: "product-blind-2026-08-21-v1", observationId: "observation:1", decision: "promote", rationale: "fixture", adjudicatorId: "a", artifactId: "artifact:a", createdAt: new Date().toISOString() },
        { id: "decision:reject", runId: "product-blind-2026-08-21-v1", observationId: "observation:2", decision: "reject", rationale: "fixture", adjudicatorId: "b", artifactId: "artifact:b", createdAt: new Date().toISOString() }
      ] })
    });
    expect(mixedPromotion.status).toBe(400);
  });

  it("can execute every controlled API transition through completed-no-promotion", async () => {
    const base = await fixtureServer();
    const runId = "api-full-loop";
    const createdAt = new Date().toISOString();
    const digest = (character: string) => character.repeat(64);
    const post = async (route: string, body: unknown) => {
      const response = await fetch(`${base}${route}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const value = await response.json();
      expect(response.status, JSON.stringify(value)).toBe(202);
      return learningLoopRunSchema.parse(value);
    };
    await post("/api/v1/learning-loops", {
      id: runId, policyVersion: "api-e2e/v1", inputHash: "input-v1", upstreamHashes: { dashboard: "dash-v1" },
      targetCreatorIds: ["creator-a"], pendingObservationIds: ["observation:1"], operationKey: "api-e2e:create"
    });
    await post(`/api/v1/learning-loops/${runId}/move`, { target: "sampling", operationKey: "api-e2e:sampling" });
    const cases = [
      { id: "case:development", runId, role: "development", creatorId: "creator-a", videoId: "video-dev", sourceRevisionId: "source-dev-v1", sourceHash: digest("a"), untouched: false, createdAt },
      { id: "case:holdout", runId, role: "holdout", creatorId: "creator-a", videoId: "video-holdout", sourceRevisionId: "source-holdout-v1", sourceHash: digest("b"), untouched: true, createdAt }
    ];
    await post(`/api/v1/learning-loops/${runId}/cases`, { cases, operationKey: "api-e2e:add-cases" });
    for (const [index, item] of cases.entries()) {
      await post(`/api/v1/learning-loops/${runId}/artifacts`, { operationKey: `api-e2e:add-source:${index}`, artifact: {
        id: `artifact:source:${index}`, runId, caseId: item.id, kind: "source", uri: `fixture://source/${index}`,
        sha256: item.sourceHash, parentArtifactIds: [], createdAt
      } });
    }
    await post(`/api/v1/learning-loops/${runId}/move`, { target: "creator_running", operationKey: "api-e2e:creator-running" });
    await post(`/api/v1/learning-loops/${runId}/move`, { target: "video_evaluating", operationKey: "api-e2e:video-evaluating" });
    for (const [index, item] of cases.entries()) {
      await post(`/api/v1/learning-loops/${runId}/artifacts`, { operationKey: `api-e2e:add-capture:${index}`, artifact: {
        id: `artifact:capture:${index}`, runId, caseId: item.id, kind: "capture", uri: `fixture://capture/${index}`,
        sha256: digest(String(index + 2)), parentArtifactIds: [`artifact:source:${index}`], createdAt
      } });
      for (const [kind, required] of [["content_restoration", 6], ["directing_logic", 6], ["visual_editing_logic", 7]] as const) {
        await post(`/api/v1/learning-loops/${runId}/lens-gates`, { operationKey: `api-e2e:gate:${index}:${kind}`, gate: {
          id: `gate:${index}:${kind}`, runId, caseId: item.id, kind, pass: true, evaluatorId: "fixture-evaluator", evaluatorVersion: "v1",
          evidenceArtifactIds: [`artifact:capture:${index}`], reasons: [], passedChecks: required, requiredChecks: required, createdAt
        } });
      }
    }
    const traces = cases.map((item, index) => ({
      id: `trace:${index}`, runId, caseId: item.id, inputArtifactIds: [`artifact:capture:${index}`], allowedKinds: ["capture"],
      outputArtifactId: null, leakageKinds: [], pass: null, createdAt, completedAt: null
    }));
    await post(`/api/v1/learning-loops/${runId}/blind-traces`, { traces, operationKey: "api-e2e:begin-blind" });
    for (const [index, item] of cases.entries()) {
      await post(`/api/v1/learning-loops/${runId}/artifacts`, { operationKey: `api-e2e:add-blind-output:${index}`, artifact: {
        id: `artifact:blind:${index}`, runId, caseId: item.id, kind: "blind_trace", uri: `fixture://blind/${index}`,
        sha256: digest(index ? "d" : "c"), parentArtifactIds: [`artifact:capture:${index}`], createdAt
      } });
    }
    await post(`/api/v1/learning-loops/${runId}/blind-results`, { operationKey: "api-e2e:blind-results", updates: [
      { traceId: "trace:0", pass: false, outputArtifactId: "artifact:blind:0", completedAt: createdAt },
      { traceId: "trace:1", pass: true, outputArtifactId: "artifact:blind:1", completedAt: createdAt }
    ] });
    await post(`/api/v1/learning-loops/${runId}/artifacts`, { operationKey: "api-e2e:add-diagnosis-artifact", artifact: {
      id: "artifact:diagnosis", runId, caseId: null, kind: "diagnosis", uri: "fixture://diagnosis",
      sha256: digest("e"), parentArtifactIds: ["artifact:blind:0", "artifact:blind:1"], createdAt
    } });
    await post(`/api/v1/learning-loops/${runId}/diagnoses`, { operationKey: "api-e2e:diagnosis", diagnosis: {
      id: "diagnosis:1", runId, blindTraceIds: ["trace:0", "trace:1"], failureClosures: ["product_projection"],
      proposedRepairs: ["repair projection"], artifactId: "artifact:diagnosis", createdAt
    } });
    await post(`/api/v1/learning-loops/${runId}/regression/begin`, { operationKey: "api-e2e:begin-regression" });
    await post(`/api/v1/learning-loops/${runId}/artifacts`, { operationKey: "api-e2e:add-regression-artifact", artifact: {
      id: "artifact:regression", runId, caseId: null, kind: "regression", uri: "fixture://regression",
      sha256: digest("f"), parentArtifactIds: ["artifact:diagnosis"], createdAt
    } });
    const regressionGates = (["regression", "untouched_holdout", "meta_coverage"] as const).map((kind) => ({
      id: `gate:${kind}`, runId, caseId: null, kind, pass: true, evaluatorId: "fixture-regression-evaluator", evaluatorVersion: "v1",
      evidenceArtifactIds: ["artifact:regression"], reasons: [], passedChecks: 1, requiredChecks: 1, createdAt
    }));
    await post(`/api/v1/learning-loops/${runId}/regressions`, { operationKey: "api-e2e:record-regression", regression: {
      id: "regression:1", runId, repairedCaseIds: ["case:development"], untouchedHoldoutCaseIds: ["case:holdout"],
      regressionGateId: "gate:regression", holdoutGateId: "gate:untouched_holdout", metaGateId: "gate:meta_coverage",
      artifactId: "artifact:regression", createdAt
    }, gates: regressionGates });
    await post(`/api/v1/learning-loops/${runId}/artifacts`, { operationKey: "api-e2e:add-adjudication-artifact", artifact: {
      id: "artifact:adjudication", runId, caseId: null, kind: "adjudication", uri: "fixture://adjudication",
      sha256: digest("1"), parentArtifactIds: ["artifact:regression"], createdAt
    } });
    const finalRun = await post(`/api/v1/learning-loops/${runId}/adjudications`, { operationKey: "api-e2e:adjudicate", decisions: [{
      id: "adjudication:1", runId, observationId: "observation:1", decision: "reject", rationale: "product repair is not research evidence",
      adjudicatorId: "independent-adjudicator", artifactId: "artifact:adjudication", createdAt
    }] });
    expect(finalRun.status).toBe("completed_no_promotion");
    expect(finalRun.observationAdjudications[0]?.eligible).toBe(false);
  });
});
