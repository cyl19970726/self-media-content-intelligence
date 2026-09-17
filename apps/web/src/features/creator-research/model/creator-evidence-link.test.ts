import { describe, expect, it } from "vitest";
import { creatorEvidenceHref, crossPostReturnTo } from "./creator-evidence-link.js";

describe("creatorEvidenceHref", () => {
  it("appends returnTo to an evidence link without a query", () => {
    expect(creatorEvidenceHref(
      "/creators/example/videos/post-1",
      "/creators/example#portfolio"
    )).toBe("/creators/example/videos/post-1?returnTo=%2Fcreators%2Fexample%23portfolio");
  });

  it("preserves the run query when appending returnTo", () => {
    expect(creatorEvidenceHref(
      "/creators/example/videos/post-1?run=run-1",
      "/creators/example?tier=low#portfolio"
    )).toBe("/creators/example/videos/post-1?run=run-1&returnTo=%2Fcreators%2Fexample%3Ftier%3Dlow%23portfolio");
  });

  it("inserts returnTo before a workflow artifact anchor", () => {
    expect(creatorEvidenceHref(
      "/workflow-runs/post-run#artifact-candidate", "/workflow-runs/creator-run#artifact-synthesis"
    )).toBe("/workflow-runs/post-run?returnTo=%2Fworkflow-runs%2Fcreator-run%23artifact-synthesis#artifact-candidate");
  });

  it("preserves a workflow candidate anchor instead of replacing it with a research section", () => {
    expect(crossPostReturnTo("/workflow-runs/creator-run#artifact-synthesis", "knowledge"))
      .toBe("/workflow-runs/creator-run#artifact-synthesis");
    expect(crossPostReturnTo("/creators/creator?run=run-1", "knowledge"))
      .toBe("/creators/creator?run=run-1#knowledge");
  });
});
