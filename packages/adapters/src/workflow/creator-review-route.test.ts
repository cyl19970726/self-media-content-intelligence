import { describe, expect, it } from "vitest";
import { creatorReviewRoute } from "./creator-review-route.js";

describe("creatorReviewRoute", () => {
  it("delivers a ready review regardless of maturity state", () => {
    expect(creatorReviewRoute({ state: "provisional" }, { ready: true, failedGateIds: [] })).toBe("deliver");
    expect(creatorReviewRoute({ state: "ready" }, { ready: true })).toBe("deliver");
  });

  it("allows a provisional dossier when the only explicit failure is incomplete source coverage", () => {
    expect(creatorReviewRoute(
      { state: "provisional" },
      { ready: false, failedGateIds: ["deep_9_ready"] }
    )).toBe("deliver");
  });

  it("routes the same source-only failure to source_gap outside provisional maturity", () => {
    expect(creatorReviewRoute(
      { state: "not_ready" },
      { ready: false, failedGateIds: ["deep_9_ready"] }
    )).toBe("source_gap");
  });

  it("repairs every deep evidence binding failure even when source coverage also failed", () => {
    expect(creatorReviewRoute(
      { state: "provisional" },
      { ready: false, failedGateIds: ["deep_evidence_binding"] }
    )).toBe("repair");
    expect(creatorReviewRoute(
      { state: "provisional" },
      { ready: false, failedGateIds: ["deep_9_ready", "deep_evidence_binding"] }
    )).toBe("repair");
  });

  it("repairs all other quality failures", () => {
    expect(creatorReviewRoute(
      { state: "provisional" },
      { ready: false, failedGateIds: ["evidence_classification"] }
    )).toBe("repair");
    expect(creatorReviewRoute(
      { state: "not_ready" },
      { ready: false, failedGateIds: ["deep_9_ready", "backend_metrics_unknown"] }
    )).toBe("repair");
  });

  it("fails closed when the gate is not ready and supplies no concrete failure", () => {
    expect(creatorReviewRoute({ state: "provisional" }, { ready: false, failedGateIds: [] })).toBe("repair");
    expect(creatorReviewRoute({ state: "provisional" }, {})).toBe("repair");
  });
});
