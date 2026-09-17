import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import type { RunStore } from "../../packages/workflow/index.js";
import type { CreatorResearchService } from "../../packages/research/index.js";

const paths = vi.hoisted(() => new Map<string, string>());
vi.mock("../../packages/adapters/index.js", () => ({ artifactPath: (ref: string) => paths.get(ref) }));
vi.mock("./video-research.js", () => ({ loadWorkflowVideoResearch: vi.fn() }));
vi.mock("../../packages/research/index.js", () => ({
  creatorSynthesisSchema: { parse: (value: unknown) => value },
  videoReconstructionBatchSchema: { parse: (value: unknown) => value }
}));
vi.mock("./workflow-creator-reader.js", () => ({ loadWorkflowCreatorReader: (value: unknown) => value }));
import { loadWorkflowArtifactReader } from "./workflow-artifact-reader.js";

const directories: string[] = [];
afterEach(() => { paths.clear(); directories.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })); });

it("reads a registered content-addressed synthesis while retaining frozen source and file checks", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "workflow-asset-reader-")); directories.push(root);
  const creatorRunId = "00000000-0000-4000-8000-000000000071";
  const files: Array<{ ref: string; sha256: string }> = [];
  function write(ref: string, value: unknown) {
    const file = path.join(root, `${paths.size}.json`);
    const bytes = JSON.stringify(value); fs.writeFileSync(file, bytes); paths.set(ref, file);
    const sha256 = createHash("sha256").update(bytes).digest("hex"); files.push({ ref, sha256 }); return sha256;
  }
  const source = { creatorRunId, portfolioArtifactRef: "/analysis", portfolioAnnotationsArtifactRef: "/annotations",
    selectionArtifactRef: "/selection", detailArtifactRef: "/details", reconstructionBatchArtifactRef: "/batch" };
  for (const ref of Object.values(source).slice(1, -1)) write(ref, { frozen: ref });
  const pinnedReportRef = `/artifacts/${creatorRunId}/workflow-reconstructions/post-run/attempt/post-1/reconstruction.json`;
  const pinnedReportSha256 = write(pinnedReportRef, { builderLenses: {} });
  write(source.reconstructionBatchArtifactRef, { items: [{ postExternalId: "post-1", reconstructionArtifactRef: pinnedReportRef }] });
  const reportArtifactRef = `/artifacts/${creatorRunId}/creator-analysis.4019cc5ad224.json`;
  const reportSha256 = write(reportArtifactRef, { inputs: source });
  const candidate = { evidence: { id: "evidence", sha256: "evidence-sha" }, reportArtifactRef, reportSha256 };
  const postArtifact = { id: "post-candidate", type: "post-candidate", schemaVersion: "v1" };
  const store = { getRun: async () => ({ metadata: { creatorRunId } }),
    listRuns: async () => [{ id: "post-run" }], listArtifacts: async () => [postArtifact],
    getArtifact: async (id: string) => id === "evidence" ? { id: "evidence", sha256: "evidence-sha" }
      : { producedBy: { workflowRunId: "workflow" }, schemaVersion: "v1", type: "creator-synthesis" } } as unknown as RunStore;
  const payload = async (id: string) => id === "evidence" ? { source, files }
    : id === postArtifact.id ? { reportArtifactRef: pinnedReportRef, reportSha256: pinnedReportSha256 } : candidate;
  const creators = { get: () => ({ creatorName: "测试博主" }) } as unknown as CreatorResearchService;
  await expect(loadWorkflowArtifactReader(store, payload, creators, "workflow", "candidate"))
    .resolves.toMatchObject({ kind: "creator", data: { source, creatorName: "测试博主",
      evidenceHrefByPost: new Map([["post-1", "/workflow-runs/post-run#artifact-post-candidate"]]) } });
  fs.writeFileSync(paths.get(source.selectionArtifactRef)!, "{}");
  await expect(loadWorkflowArtifactReader(store, payload, creators, "workflow", "candidate"))
    .rejects.toThrow("FROZEN_SOURCE_CHANGED");
});
