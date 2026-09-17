import { describe, expect, it } from "vitest";
import type { CreatorDossier } from "../../../shared/contracts/core";
import { matchesPortfolioClassification, matchesPortfolioEvidence } from "./creator-portfolio-filter";

const item = { topic: "智能穿戴", format: "产品报道", topics: ["智能穿戴", "AI 硬件"],
  formats: ["产品报道", "融资叙事"] } as CreatorDossier["portfolio"]["items"][number];

describe("portfolio multi-label filter", () => {
  it("matches secondary labels and combines topic and format filters", () => {
    expect(matchesPortfolioClassification(item, "AI 硬件", "融资叙事")).toBe(true);
    expect(matchesPortfolioClassification(item, "AI 硬件", "教程")).toBe(false);
    expect(matchesPortfolioClassification(item, "all", "融资叙事")).toBe(true);
  });

  it("keeps legacy singular fields as fallback", () => {
    expect(matchesPortfolioClassification({ ...item, topics: [], formats: [] }, "智能穿戴", "产品报道")).toBe(true);
  });

  it("keeps completed independent evaluations separate from truly unevaluated Builder work", () => {
    const evaluated = { ...item, deepSample: true, evidenceStatus: "deep_evaluated_with_findings" } as CreatorDossier["portfolio"]["items"][number];
    const unevaluated = { ...item, deepSample: true, evidenceStatus: "deep_built" } as CreatorDossier["portfolio"]["items"][number];
    expect(matchesPortfolioEvidence(evaluated, "deep_evaluated_with_findings")).toBe(true);
    expect(matchesPortfolioEvidence(evaluated, "deep_built")).toBe(false);
    expect(matchesPortfolioEvidence(unevaluated, "deep_built")).toBe(true);
    expect(matchesPortfolioEvidence(unevaluated, "deep_evaluated_with_findings")).toBe(false);
  });

  it("filters each current Reviewer state separately while retaining legacy Evaluator states", () => {
    const reviewed = { ...item, deepSample: true, evidenceStatus: "deep_reviewed_no_findings" } as CreatorDossier["portfolio"]["items"][number];
    const revised = { ...item, deepSample: true, evidenceStatus: "deep_revised_unverified" } as CreatorDossier["portfolio"]["items"][number];
    const failed = { ...item, deepSample: true, evidenceStatus: "deep_review_failed" } as CreatorDossier["portfolio"]["items"][number];
    expect(matchesPortfolioEvidence(reviewed, "deep_reviewed_no_findings")).toBe(true);
    expect(matchesPortfolioEvidence(reviewed, "deep_validated")).toBe(false);
    expect(matchesPortfolioEvidence(revised, "deep_revised_unverified")).toBe(true);
    expect(matchesPortfolioEvidence(revised, "deep_reviewed_no_findings")).toBe(false);
    expect(matchesPortfolioEvidence(failed, "deep_review_failed")).toBe(true);
  });
});
