import fs from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { artifactPath } from "../../packages/adapters/index.js";
import { videoReconstructionBatchSchema } from "../../packages/research/index.js";
import { readReportSource } from "./report-source-revision.js";

type SourceItem = { postExternalId: string; reconstructionArtifactRef: string | null };

/** Compare current reading sources with the inputs actually consumed by the displayed synthesis. */
export function creatorSourceChanges(items: SourceItem[], synthesisBatchRef?: string) {
  let consumed: Map<string, string | null> | null = null;
  let unreadableBatch = false;
  if (synthesisBatchRef) {
    try {
      const batch = videoReconstructionBatchSchema.parse(JSON.parse(fs.readFileSync(artifactPath(synthesisBatchRef), "utf8")));
      consumed = new Map(batch.items.map(item => [item.postExternalId, item.reconstructionArtifactRef]));
    } catch { unreadableBatch = true; }
  }
  return items.flatMap((item) => {
    if (!item.reconstructionArtifactRef) return [];
    try {
      const source = readReportSource(artifactPath(item.reconstructionArtifactRef));
      if (unreadableBatch) throw new Error("综合输入无法读取");
      if (consumed) {
        const consumedRef = consumed.get(item.postExternalId);
        if (!consumedRef) throw new Error("综合未绑定当前单帖");
        // Read the immutable snapshot directly; resolving its overlays would conceal stale inputs.
        const consumedText = fs.readFileSync(artifactPath(consumedRef), "utf8");
        if (isDeepStrictEqual(JSON.parse(source.text), JSON.parse(consumedText))) return [];
        return [{ postExternalId: item.postExternalId, note: source.revision ?? "当前单帖与综合所用来源版本不同。" }];
      }
      return source.revision ? [{ postExternalId: item.postExternalId, note: source.revision }] : [];
    } catch {
      return [{ postExternalId: item.postExternalId, note: "该帖源版本无法核对，综合与当前单帖的一致性待检查。" }];
    }
  });
}
