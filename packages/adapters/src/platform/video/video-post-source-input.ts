import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { buildPostSourceFacts } from "../../../../contracts/index.js";
import { artifactPath } from "../../core/artifacts.js";

type Request = { postExternalId: string; sourceUrl: string; detailArtifactRef?: string | null;
  mediaManifestArtifactRef?: string | null; selectionArtifactRef?: string | null };
function row(ref: string | null | undefined, key: string, id: string): Record<string, unknown> {
  if (!ref) return {};
  const data = JSON.parse(fs.readFileSync(artifactPath(ref), "utf8"));
  return (data[key] ?? []).find((item: { externalId: string }) => item.externalId === id) ?? {};
}
const str = (v: unknown) => typeof v === "string" ? v : null;
const num = (v: unknown) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null;
export function freezePostSourceInput(request: Request, outputDir: string) {
  const detail = row(request.detailArtifactRef, "posts", request.postExternalId);
  const media = row(request.mediaManifestArtifactRef, "items", request.postExternalId);
  const selected = row(request.selectionArtifactRef, "items", request.postExternalId);
  const cover = media.coverState === "ready" ? str(media.coverArtifactRef) : null;
  const coverPath = cover ? artifactPath(cover) : null;
  const coverExists = coverPath !== null && fs.existsSync(coverPath);
  const facts = buildPostSourceFacts({ sourceUrl: request.sourceUrl.split("?")[0]!,
    capturedAt: str(detail.inspectedAt), title: str(detail.title) ?? str(selected.title),
    caption: str(detail.description), coverHref: coverExists ? cover : null,
    mediaType: detail.mediaType === "video" || detail.mediaType === "image" ? detail.mediaType : "unknown",
    imageCount: num(detail.imageCount) ?? 0, tags: [], publishedLabel: str(detail.publishedLabel),
    metrics: { likes: num(selected.likes), collections: num(selected.collections), comments: num(selected.comments), shares: num(selected.shares) },
    sourceRefs: [request.detailArtifactRef, request.mediaManifestArtifactRef, request.selectionArtifactRef].filter((v): v is string => Boolean(v)) });
  const input = { facts, cover: coverExists ? { path: "post-cover" + path.extname(coverPath),
    sha256: crypto.createHash("sha256").update(fs.readFileSync(coverPath)).digest("hex") } : null };
  const target = path.join(outputDir, "post-source-input.json");
  const serialized = JSON.stringify(input, null, 2) + "\n";
  if (fs.existsSync(target) && fs.readFileSync(target, "utf8") !== serialized) throw new Error("BUILDER_INTEGRITY_POST_SOURCE_REVISION_CHANGED");
  if (!fs.existsSync(target)) {
    if (input.cover && coverPath) fs.copyFileSync(coverPath, path.join(outputDir, input.cover.path));
    fs.writeFileSync(target, serialized);
  }
  return input;
}
