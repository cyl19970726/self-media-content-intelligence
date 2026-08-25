import { describe, expect, it } from "vitest";
import { creatorEvidenceHref } from "./creator-evidence-link.js";

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
});
