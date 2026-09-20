import type { CreatorSelection } from "../portfolio/contracts.js";
import type { VideoReconstructionBatch } from "../video-analysis/batch-contracts.js";

export type CreatorAnalysisStartOptions = {
  candidateMode?: "rebuild" | "reuse";
  scope?: "selected" | "available_deep";
};

export function creatorAnalysisItems(
  selection: CreatorSelection,
  batch: VideoReconstructionBatch,
  scope: CreatorAnalysisStartOptions["scope"] = "selected"
): VideoReconstructionBatch["items"] {
  const selectedIds = new Set(selection.items.filter((item) => item.deepCandidate).map((item) => item.externalId));
  if (scope === "available_deep") {
    const reportWithoutMedia = batch.items.find((item) => item.reconstructionArtifactRef && !item.sourceMediaArtifactRef);
    if (reportWithoutMedia) throw new Error(`单帖 ${reportWithoutMedia.postExternalId} 存在旧报告但缺少可冻结的媒体来源`);
  }
  const items = scope === "available_deep"
    ? batch.items.filter((item) => item.sourceMediaArtifactRef)
    : batch.items.filter((item) => selectedIds.has(item.postExternalId));
  const selectedCoverage = items.filter((item) => selectedIds.has(item.postExternalId)).length;
  if (!selectedIds.size || selectedCoverage !== selectedIds.size) throw new Error("冻结重建批次未覆盖全部深读选样");
  return items;
}
