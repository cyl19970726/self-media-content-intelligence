import type { CrossPostResearch } from "@signal-room/contracts";

export type CrossPostSpecificityDiagnostic = {
  code: "repeated_observation_across_posts" | "broad_builder_lenses_reference";
  message: string;
  findingPaths: string[];
  paths: string[];
  postExternalIds: string[];
  value: string;
};

type LocatedCitation = {
  findingPath: string;
  observationPath: string;
  postExternalId: string;
  observation: string;
};

function normalizedObservation(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Finds mechanical signals that a reviewer can use while judging whether
 * cross-post findings retained enough post-specific evidence. These signals
 * are deliberately diagnostics, not validity errors: a real shared property
 * can justify identical wording across posts, and a root citation can still
 * point at relevant evidence even though it makes review less precise.
 */
export function diagnoseCrossPostSpecificity(
  research: CrossPostResearch
): CrossPostSpecificityDiagnostic[] {
  const diagnostics: CrossPostSpecificityDiagnostic[] = [];
  const citationsByObservation = new Map<string, LocatedCitation[]>();

  research.sections.forEach((section, sectionIndex) => {
    section.findings.forEach((finding, findingIndex) => {
      const findingPath = `crossPostResearch.sections[${sectionIndex}].findings[${findingIndex}]`;
      const citationGroups = [
        ["support", finding.support],
        ["counterexamples", finding.counterexamples]
      ] as const;

      for (const [groupName, citations] of citationGroups) {
        citations.forEach((citation, citationIndex) => {
          const citationPath = `${findingPath}.${groupName}[${citationIndex}]`;
          const normalized = normalizedObservation(citation.observation);
          const located = citationsByObservation.get(normalized) ?? [];
          located.push({
            findingPath,
            observationPath: `${citationPath}.observation`,
            postExternalId: citation.postExternalId,
            observation: citation.observation
          });
          citationsByObservation.set(normalized, located);

          citation.evidenceRefs.forEach((reference, referenceIndex) => {
            if (!/#\/builderLenses\/?$/.test(reference)) return;
            diagnostics.push({
              code: "broad_builder_lenses_reference",
              message: "Evidence reference stops at the builderLenses root; review whether a specific lens field can be cited.",
              findingPaths: [findingPath],
              paths: [`${citationPath}.evidenceRefs[${referenceIndex}]`],
              postExternalIds: [citation.postExternalId],
              value: reference
            });
          });
        });
      }
    });
  });

  for (const citations of citationsByObservation.values()) {
    const postExternalIds = [...new Set(citations.map((citation) => citation.postExternalId))];
    if (postExternalIds.length < 2) continue;
    diagnostics.push({
      code: "repeated_observation_across_posts",
      message: "The same observation is used for multiple posts; review whether the wording preserves each post's actual contribution.",
      findingPaths: [...new Set(citations.map((citation) => citation.findingPath))],
      paths: citations.map((citation) => citation.observationPath),
      postExternalIds,
      value: citations[0]!.observation
    });
  }

  return diagnostics;
}
