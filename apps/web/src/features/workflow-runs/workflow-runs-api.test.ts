import { afterEach, expect, it, vi } from "vitest";
import { startFreshPostWorkflow } from "../../shared/api/post-workflows";
import { appendWorkflowStageDetails, getWorkflowReading, getWorkflowReadingChanges, getWorkflowStageDetails, mergeWorkflowReading, type WorkflowReading } from "./workflow-runs-api";

afterEach(() => vi.unstubAllGlobals());

it("starts a fresh workflow for exactly the selected post and returns its run record", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ creatorRunId: "creator-run", workflowRunId: "post-run",
    workflowId: "post.analyze", workflowRevision: "v5", state: "queued", generation: 1 }),
  { status: 202, headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);

  await expect(startFreshPostWorkflow("creator/run", "post?one")).resolves.toMatchObject({ workflowRunId: "post-run" });
  expect(fetchMock).toHaveBeenCalledWith("/api/creator-runs/creator%2Frun/workflows/post", expect.objectContaining({
    method: "POST", body: JSON.stringify({ postExternalId: "post?one", evaluationMode: "fresh" })
  }));
});

it("surfaces a workflow-start rejection to the report", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "单帖不存在或尚无可用媒体证据" }),
    { status: 409, headers: { "Content-Type": "application/json" } })));
  await expect(startFreshPostWorkflow("creator-run", "post-one"))
    .rejects.toThrow("单帖不存在或尚无可用媒体证据");
});

it("reads scoped execution records, opaque changes, and one stage without listing creator history", async () => {
  const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => new Response(JSON.stringify({ rootRunId: "root", selectedRunId: "child", cursor: "opaque" }),
    { headers: { "Content-Type": "application/json" } }));
  vi.stubGlobal("fetch", fetchMock);
  await getWorkflowReading("child/run");
  await getWorkflowReadingChanges("child/run", "opaque+cursor");
  await getWorkflowStageDetails("child/run", "build/stage", "page+2");
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    "/api/workflow-runs/child%2Frun/reading",
    "/api/workflow-runs/child%2Frun/reading/changes?cursor=opaque%2Bcursor",
    "/api/workflow-runs/child%2Frun/reading/stages/build%2Fstage?cursor=page%2B2"
  ]);
});

it("keeps host verified context while accepting changed shared facts", () => {
  const previous = { schemaVersion: 1, rootRunId: "root", selectedRunId: "child", subject: { creatorRunId: "owner", postId: "post" }, title: "Research", cursor: "first", runs: [{ id: "root" }], stages: [{ id: "keep" }, { id: "remove" }], calls: [], artifacts: [], relations: [{ kind: "selected" }], progress: { registered: 2, completed: 0, closed: false }, diagnostics: [] } as unknown as WorkflowReading;
  const next = mergeWorkflowReading(previous, { resetRequired: false, cursor: "second", removed: { runs: [], stages: ["remove"], calls: [], artifacts: [] }, changed: {
    ...previous, cursor: "second", selectedRunId: undefined, runs: [], stages: [{ id: "new" }], calls: [], artifacts: [], relations: []
  } as unknown as WorkflowReading });
  expect(next).toMatchObject({ cursor: "second", selectedRunId: "child", subject: { creatorRunId: "owner", postId: "post" }, title: "Research" });
  expect(next.runs.map((run) => run.id)).toEqual(["root"]);
  expect(next.stages.map((stage) => stage.id)).toEqual(["keep", "new"]);
  expect(next.relations).toEqual([]);
});

it("appends a stage page without duplicating calls and rejects a mismatched stage", () => {
  const first = { phaseId: "stage", calls: [{ id: "call-1" }], artifacts: [], nextCursor: "next" };
  const second = { phaseId: "stage", calls: [{ id: "call-1" }, { id: "call-2" }], artifacts: [] };
  const merged = appendWorkflowStageDetails(first as never, second as never);
  expect(merged.calls.map((call) => call.id)).toEqual(["call-1", "call-2"]);
  expect(merged.nextCursor).toBeUndefined();
  expect(() => appendWorkflowStageDetails(first as never, { ...second, phaseId: "other" } as never)).toThrow("阶段分页游标与当前阶段不匹配");
});
