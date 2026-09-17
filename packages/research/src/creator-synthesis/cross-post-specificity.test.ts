import { describe, expect, it } from "vitest";
import type { CrossPostResearch } from "@signal-room/contracts";
import { diagnoseCrossPostSpecificity } from "./cross-post-specificity.js";

function researchWith(
  support: CrossPostResearch["sections"][number]["findings"][number]["support"],
  counterexamples: CrossPostResearch["sections"][number]["findings"][number]["counterexamples"] = []
): CrossPostResearch {
  return {
    sections: [{
      id: "knowledge",
      title: "知识与问题地图",
      findings: [{
        id: "knowledge-1",
        statement: "不同帖子提供了可比较的具体知识。",
        factClass: "inference",
        confidence: "medium",
        support,
        counterexamples,
        boundary: "只覆盖当前样本。",
        openQuestions: []
      }]
    }]
  };
}

describe("diagnoseCrossPostSpecificity", () => {
  it("reports a repeated observation across different posts with every exact observation path", () => {
    const diagnostics = diagnoseCrossPostSpecificity(researchWith([
      { postExternalId: "post-a", observation: "先给钩子，再解释机制。", evidenceRefs: ["/a.json#/builderLenses/directingLogic"] },
      { postExternalId: "post-b", observation: "  先给钩子，再解释机制。 ", evidenceRefs: ["/b.json#/builderLenses/directingLogic"] }
    ]));

    expect(diagnostics).toEqual([expect.objectContaining({
      code: "repeated_observation_across_posts",
      findingPaths: ["crossPostResearch.sections[0].findings[0]"],
      paths: [
        "crossPostResearch.sections[0].findings[0].support[0].observation",
        "crossPostResearch.sections[0].findings[0].support[1].observation"
      ],
      postExternalIds: ["post-a", "post-b"]
    })]);
  });

  it("reports every affected finding path when repeated wording crosses findings", () => {
    const research = researchWith([
      { postExternalId: "post-a", observation: "共同观察。", evidenceRefs: ["/a.json#/builderLenses/directingLogic"] }
    ]);
    research.sections[0]!.findings.push({
      ...research.sections[0]!.findings[0]!,
      id: "knowledge-2",
      support: [
        { postExternalId: "post-b", observation: "共同观察。", evidenceRefs: ["/b.json#/builderLenses/directingLogic"] }
      ]
    });

    expect(diagnoseCrossPostSpecificity(research)).toEqual([expect.objectContaining({
      code: "repeated_observation_across_posts",
      findingPaths: [
        "crossPostResearch.sections[0].findings[0]",
        "crossPostResearch.sections[0].findings[1]"
      ]
    })]);
  });

  it("does not report repeated wording when every occurrence belongs to the same post", () => {
    const diagnostics = diagnoseCrossPostSpecificity(researchWith(
      [{ postExternalId: "post-a", observation: "同一条观察。", evidenceRefs: ["/a.json#/builderLenses/contentRestoration/summary"] }],
      [{ postExternalId: "post-a", observation: "同一条观察。", evidenceRefs: ["/a.json#/builderLenses/contentRestoration/blocks/0"] }]
    ));

    expect(diagnostics).toEqual([]);
  });

  it("reports builderLenses root references but accepts references to a lens or deeper field", () => {
    const diagnostics = diagnoseCrossPostSpecificity(researchWith([
      {
        postExternalId: "post-a",
        observation: "该帖解释了订阅条件。",
        evidenceRefs: [
          "/a.json#/builderLenses",
          "/a.json#/builderLenses/",
          "/a.json#/builderLenses/contentRestoration/blocks/2"
        ]
      }
    ]));

    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: "broad_builder_lenses_reference",
        findingPaths: ["crossPostResearch.sections[0].findings[0]"],
        paths: ["crossPostResearch.sections[0].findings[0].support[0].evidenceRefs[0]"]
      }),
      expect.objectContaining({
        code: "broad_builder_lenses_reference",
        paths: ["crossPostResearch.sections[0].findings[0].support[0].evidenceRefs[1]"]
      })
    ]);
  });
});
