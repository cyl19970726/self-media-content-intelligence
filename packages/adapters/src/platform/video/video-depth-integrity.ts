import { openingAnalysisSchema, packagingAnalysisSchema } from "../../../../contracts/index.js";

export function validateVideoDepth(input: unknown, duration: number, ids: Set<string>, frames: Map<string, number>,
  source: { facts: { title: string | null; coverHref: string | null }; cover?: unknown } | null) {
  const root = input as { depthContractVersion?: string; builderLenses?: { visualEditing?: { openingAnalysis?: unknown }; directingLogic?: { packagingAnalysis?: unknown } } };
  const fail = (reason: string, detail?: string): never => {
    throw new Error(`BUILDER_INTEGRITY_DEPTH_${reason}${detail ? `:${detail}` : ""}`);
  };
  if (!root.depthContractVersion && !source) return;
  if (root.depthContractVersion !== "single-post-depth@1") fail("CONTRACT_MISSING");
  const openingResult = openingAnalysisSchema.safeParse(root.builderLenses?.visualEditing?.openingAnalysis);
  const packagingResult = packagingAnalysisSchema.safeParse(root.builderLenses?.directingLogic?.packagingAnalysis);
  if (!openingResult.success || !packagingResult.success) return fail("SCHEMA");
  const opening = openingResult.data, packaging = packagingResult.data;
  if (!Number.isFinite(duration) || Math.abs(opening.duration - Math.min(10, duration)) > 0.02) fail("DURATION");
  const invalidReferenceDetails: string[] = [];
  const checkRefs = (refs: string[], location: string) => {
    const invalid = [...new Set(refs.filter(ref => !ids.has(ref)))];
    if (invalid.length > 0) invalidReferenceDetails.push(`${location}:${invalid.join(",")}`);
  };
  let cursor = 0;
  const seen = new Set<string>();
  for (const [index, segment] of opening.segments.entries()) {
    if (seen.has(segment.id)) fail("DUPLICATE_SEGMENT");
    seen.add(segment.id);
    const { start, end } = segment.timeRange;
    if (Math.abs(start - cursor) > 0.001 || end <= start || end > opening.duration + 0.001) fail("COVERAGE");
    cursor = end;
    checkRefs(segment.evidenceRefs, `builderLenses.visualEditing.openingAnalysis.segments[${index}].evidenceRefs`);
    const times = [...new Set(segment.frameRefs.map(ref => frames.get(ref)).filter((time): time is number => time !== undefined))].sort((a,b) => a-b);
    if (!times.length || times[0]! - start > .55 || end - times.at(-1)! > .55 ||
        times.some((time,index) => index > 0 && time - times[index-1]! > 1.01)) fail("FRAME_STRIP_COVERAGE");
    for (const ref of segment.frameRefs) {
      const time = frames.get(ref);
      if (time === undefined || time < start - 0.05 || time > end + 0.05) fail("FRAME_RANGE");
    }
  }
  if (Math.abs(cursor - opening.duration) > 0.001) fail("COVERAGE");
  for (const key of ["title", "cover", "firstFrame"] as const) {
    const surface = packaging[key];
    if (surface.state === "missing") {
      if (surface.sourceRef !== null || surface.evidenceRefs.length || !surface.unknowns.length ||
          [surface.audience, surface.promise, surface.tension, surface.specificity, surface.searchTerms,
            surface.composition, surface.typeHierarchy, surface.smallSizeReadability].some(value => value !== null)) fail("MISSING_SOURCE_CLAIM");
    } else {
      if (!surface.sourceRef || !surface.evidenceRefs.length) fail("SOURCE_REFERENCE");
      checkRefs(surface.evidenceRefs, `builderLenses.directingLogic.packagingAnalysis.${key}.evidenceRefs`);
      checkRefs([surface.sourceRef!], `builderLenses.directingLogic.packagingAnalysis.${key}.sourceRef`);
      if (key === "cover" && (!source?.facts.coverHref || !source.cover || surface.sourceRef !== "POST-COVER")) fail("INDEPENDENT_COVER");
      if (key === "title" && (!source?.facts.title || surface.sourceRef !== "POST-TITLE")) fail("TITLE_SOURCE");
      if (key === "firstFrame" && (frames.get(surface.sourceRef!) ?? Infinity) > 0.5) fail("FIRST_FRAME");
    }
  }
  for (const [index, item] of packaging.fulfillment.entries()) {
    checkRefs(item.bodyEvidenceRefs, `builderLenses.directingLogic.packagingAnalysis.fulfillment[${index}].bodyEvidenceRefs`);
    if ((item.status === "fulfilled" || item.status === "partial") && !item.bodyEvidenceRefs.length) fail("FULFILLMENT_EVIDENCE");
  }
  if (invalidReferenceDetails.length > 0) fail("REFERENCE", invalidReferenceDetails.join("\n"));
}
