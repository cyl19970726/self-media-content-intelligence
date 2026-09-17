import { describe, expect, it } from "vitest";
import type { CreatorDossier, CreatorResearchRun } from "../../../shared/contracts/core";
import { creatorProgress } from "./creator-progress";

function run(overrides: Partial<CreatorResearchRun> = {}): CreatorResearchRun {
  return {
    status: "collecting", currentStage: "deep_capture", nextAction: "等待 Builder",
    worker: { state: "queued" }, coverage: { discoveredPosts: 30, enrichedPosts: 21, comparisonPosts: 21, reconstructedPosts: 0 },
    videoWork: { concurrencyLimit: 3, activePostExternalIds: [], queuedPosts: 12, analyzedPosts: 0, failedPosts: 0 }, blockers: [],
    stages: ["preflight", "inventory", "tiering", "deep_capture", "synthesis", "dashboard"].map((id, index) => ({
      id, label: id, status: index < 3 ? "complete" : index === 3 ? "running" : "pending", message: null
    })), ...overrides
  } as CreatorResearchRun;
}

function dossier(runValue: CreatorResearchRun | null, pipeline?: CreatorDossier["pipeline"]): CreatorDossier {
  return { run: runValue, pipeline } as CreatorDossier;
}

describe("creator progress presentation", () => {
  it("shows a queued current stage as waiting instead of running", () => {
    const model = creatorProgress(dossier(run()));
    expect(model.headline).toBe("停在单帖分析：等待执行");
    expect(model.rows.map((row) => row.label)).toEqual(["身份核验", "作品采集", "分层选样", "单帖分析", "博主综合", "研究交付"]);
    expect(model.rows.map((row) => row.state)).toEqual(["已完成", "已完成", "已完成", "等待执行", "未开始", "未开始"]);
    expect(model.rows.find((row) => row.id === "deep_capture")).toMatchObject({ state: "等待执行", current: true });
    expect(model.rows.find((row) => row.id === "deep_capture")?.detail).toContain("12 条等待执行，0 条执行中，0 条已完成");
    expect(model.detail).toBe("等待执行单帖分析；完成后进入博主综合。");
  });

  it("uses active work as evidence that the current stage is running", () => {
    const value = run({ worker: { ...run().worker, state: "running" }, videoWork: { ...run().videoWork, queuedPosts: 10, activePostExternalIds: ["a", "b"] } });
    expect(creatorProgress(dossier(value))).toMatchObject({ headline: "正在单帖分析" });
    expect(creatorProgress(dossier(value)).rows.find((row) => row.id === "deep_capture")?.state).toBe("执行中");
  });

  it("shows partial detail collection as media preparation before a reconstruction batch exists", () => {
    const value = run({
      worker: { ...run().worker, state: "running" },
      coverage: { ...run().coverage, enrichedPosts: 3, reconstructedPosts: 0 },
      reconstructionBatchArtifactRef: null,
      videoWork: { ...run().videoWork, queuedPosts: 0, activePostExternalIds: [], analyzedPosts: 0, failedPosts: 0 }
    });
    const model = creatorProgress(dossier(value));
    expect(model.headline).toBe("正在详情与媒体准备");
    expect(model.detail).toBe("正在补齐选择集详情与媒体；完成后才会创建单帖分析批次。");
    expect(model.rows.find((row) => row.id === "deep_capture")).toMatchObject({
      label: "详情与媒体准备",
      state: "执行中",
      detail: "已采集 3/21 篇选择集详情，单帖分析批次尚未创建。"
    });
  });

  it("uses single-post analysis language once real video work exists", () => {
    const value = run({
      worker: { ...run().worker, state: "running" },
      reconstructionBatchArtifactRef: "/artifacts/run/video-reconstruction-batch.json",
      videoWork: { ...run().videoWork, queuedPosts: 2, activePostExternalIds: ["post-1"], analyzedPosts: 0, failedPosts: 0 }
    });
    const model = creatorProgress(dossier(value));
    expect(model.headline).toBe("正在单帖分析");
    expect(model.detail).toBe("单帖分析正在执行；完成后进入博主综合。");
    expect(model.rows.find((row) => row.id === "deep_capture")?.detail)
      .toContain("2 条等待执行，1 条执行中");
  });

  it("makes a failed stage and reason explicit", () => {
    const value = run({ status: "failed", blockers: [{ code: "builder_failed", message: "两条帖子构建失败", userActionRequired: false }],
      stages: run().stages.map((stage) => stage.id === "deep_capture" ? { ...stage, status: "failed", message: "Builder 返回失败" } : stage) });
    const model = creatorProgress(dossier(value));
    expect(model.headline).toBe("停在单帖分析：执行失败");
    expect(model.detail).toContain("两条帖子构建失败");
    expect(model.detail.match(/两条帖子构建失败/g)).toHaveLength(1);
    expect(model.rows.find((row) => row.id === "deep_capture")?.state).toBe("失败");
  });

  it("distinguishes reviewable output from delivered output", () => {
    const value = run({ status: "reviewable", currentStage: "dashboard", stages: run().stages.map((stage) => ({ ...stage, status: stage.id === "dashboard" ? "blocked" : "complete" })) });
    expect(creatorProgress(dossier(value)).headline).toBe("研究结果待复核");
    expect(creatorProgress(dossier(value)).rows.at(-1)).toMatchObject({ state: "待处理", current: true });
  });

  it("only declares completion when the run itself is ready", () => {
    const value = run({ status: "ready", currentStage: "dashboard", worker: { ...run().worker, state: "succeeded" }, stages: run().stages.map((stage) => ({ ...stage, status: "complete" })) });
    expect(creatorProgress(dossier(value))).toMatchObject({ headline: "研究已完成" });
    expect(creatorProgress(dossier(value)).rows.every((row) => row.state === "已完成")).toBe(true);
  });

  it("shows skipped stages without claiming they completed", () => {
    const value = run({ stages: run().stages.map((stage) => stage.id === "tiering" ? { ...stage, status: "skipped" } : stage) });
    expect(creatorProgress(dossier(value)).rows.find((row) => row.id === "tiering")?.state).toBe("已跳过");
  });

  it("keeps the run current stage authoritative over stale earlier comments and uses pipeline only as assurance", () => {
    const value = run({ stages: run().stages.map((stage) => stage.id === "inventory" ? { ...stage, status: "running", message: "旧的采集备注" } : stage) });
    const pipeline = { stages: [
      { id: "media_verification", state: "complete", gateState: "passed" },
      { id: "video_evaluation", state: "pending", gateState: "not_checked" }
    ] } as CreatorDossier["pipeline"];
    const model = creatorProgress(dossier(value, pipeline));
    expect(model.headline).toBe("停在单帖分析：等待执行");
    expect(model.detail).toContain("媒体核验已完成");
    expect(model.detail).not.toContain("旧的采集备注");
    expect(model.headline).not.toMatch(/13|%/);
  });

  it("does not call Evaluator running while Builder has produced no posts", () => {
    const value = run({
      coverage: { ...run().coverage, reconstructedPosts: 0 },
      videoWork: { ...run().videoWork, analyzedPosts: 0, queuedPosts: 12 },
    });
    const pipeline = { stages: [
      { id: "media_verification", state: "complete", gateState: "passed" },
      { id: "video_evaluation", state: "running", gateState: "running" }
    ] } as CreatorDossier["pipeline"];
    expect(creatorProgress(dossier(value, pipeline)).detail).toBe("等待执行单帖分析；完成后进入博主综合。 媒体核验已完成。");
  });

  it("is transparent when no run is available", () => {
    const model = creatorProgress(dossier(null));
    expect(model.headline).toBe("尚无可追踪的研究任务");
    expect(model.detail).toContain("进度未知");
    expect(model.rows.every((row) => row.state === "未开始" && !row.current)).toBe(true);
  });
});

it("does not label a drained single-post stage with failures as fully complete", () => {
  const value = run({ currentStage: "synthesis", videoWork: { ...run().videoWork, queuedPosts: 0, analyzedPosts: 11, failedPosts: 1 },
    stages: run().stages.map((stage) => stage.id === "deep_capture" ? { ...stage, status: "complete" } : stage) });
  const result = creatorProgress(dossier(value));
  expect(result.rows.find((row) => row.id === "deep_capture")?.state).toBe("部分完成");
  expect(result.rows.find((row) => row.id === "deep_capture")?.detail).toContain("1 条失败");
});
