import { afterEach, expect, it, vi } from "vitest";
import { startFreshPostWorkflow } from "../../shared/api/post-workflows";

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
