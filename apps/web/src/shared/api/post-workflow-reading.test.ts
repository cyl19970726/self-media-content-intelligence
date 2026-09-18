import { afterEach, expect, it, vi } from "vitest";
import { getOptionalBatchVideoResearch, getPostCandidateReader, getPostWorkflowReading } from "./post-workflow-reading";

afterEach(() => vi.unstubAllGlobals());

it("requests the selected post's workflow reading with an optional pinned workflow run", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ workflow: null, phases: [], candidate: null, dispositions: [] }), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  await getPostWorkflowReading("creator/run", "post?1", "workflow/2");
  expect(fetchMock).toHaveBeenCalledWith("/api/creator-runs/creator%2Frun/posts/post%3F1/workflow-reading?workflowRunId=workflow%2F2", { cache: "no-store" });
});

it("rejects a non-post or off-route candidate reader", async () => {
  await expect(getPostCandidateReader("https://example.com/reader")).rejects.toThrow("读取地址无效");
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ kind: "creator", data: {} }), { status: 200 })));
  await expect(getPostCandidateReader("/api/workflow-runs/run/artifacts/candidate/reader")).rejects.toThrow("不是单帖阅读版本");
});

it("treats only a missing batch report as empty, while surfacing service errors", async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: "视频研究证据不存在" }), { status: 404 }));
  vi.stubGlobal("fetch", fetchMock);
  await expect(getOptionalBatchVideoResearch("creator", "post", "run")).resolves.toBeNull();
  expect(fetchMock).toHaveBeenCalledWith("/api/v1/creators/creator/videos/post?run=run", { cache: "no-store" });
  fetchMock.mockImplementationOnce(async () => new Response(JSON.stringify({ error: "数据库暂时不可用" }), { status: 503 }));
  await expect(getOptionalBatchVideoResearch("creator", "post", "run")).rejects.toThrow("数据库暂时不可用");
});
