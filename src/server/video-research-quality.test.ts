import { describe, expect, it } from "vitest";
import { projectPostQualityStates } from "./video-research.js";

describe("projectPostQualityStates", () => {
  it("keeps Builder-only work provisional", () => {
    expect(projectPostQualityStates("built_unevaluated", false)).toEqual({
      buildState: "built", evaluationState: "skipped", promotionState: "provisional"
    });
  });

  it("does not trust a stale ready label without a valid evaluator artifact", () => {
    expect(projectPostQualityStates("ready", false)).toEqual({
      buildState: "built", evaluationState: "failed", promotionState: "provisional"
    });
  });

  it("promotes only a ready state backed by a valid evaluator artifact", () => {
    expect(projectPostQualityStates("verified", true)).toEqual({
      buildState: "built", evaluationState: "verified", promotionState: "wiki_eligible"
    });
  });
});
