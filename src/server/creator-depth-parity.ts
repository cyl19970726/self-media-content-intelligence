import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { CreatorDossier } from "../shared/creator-dossier.js";
import { loadLegacyDeepDossier } from "./legacy-deep-dossiers.js";
import { researchDir } from "./creator-meta.js";

export const CREATOR_DEPTH_PARITY_CONTRACT_VERSION = "creator-depth-parity/1.0.0" as const;

export type DepthParityCreatorId = "ai-red-witch" | "zhang-zala" | "human-director";
export type DepthParityMappingStatus = "mapped" | "partial" | "omitted";

export interface DepthParitySource {
  path: string;
  exists: boolean;
  sha256: string | null;
  recordCount: number | null;
}

export interface DepthParityMapping {
  sourcePointer: string;
  canonicalPointer: string;
  status: DepthParityMappingStatus;
  reason: string;
}

export interface DepthParityException {
  id: string;
  mappingPointers: string[];
  reason: string;
  evidenceRefs: string[];
}

export interface DepthParityCounts {
  corpus: number;
  comparison: number;
  canonicalDeep: number;
  registeredDeep: number;
}

export interface DepthParityGateFailure {
  id: string;
  reason: string;
}

export interface CreatorDepthParityManifest {
  creatorId: DepthParityCreatorId;
  contractVersion: typeof CREATOR_DEPTH_PARITY_CONTRACT_VERSION;
  sources: DepthParitySource[];
  mappings: DepthParityMapping[];
  counts: DepthParityCounts;
  expectedCounts: DepthParityCounts;
  exceptions: DepthParityException[];
  gate: {
    ready: boolean;
    failures: DepthParityGateFailure[];
  };
}

type JsonRecord = Record<string, unknown>;

interface SourceDefinition {
  path: string;
  recordPointer: string;
}

interface CreatorDefinition {
  expectedCounts: DepthParityCounts;
  sources: SourceDefinition[];
  mappings: Omit<DepthParityMapping, "status">[];
  exceptions: DepthParityException[];
  count: (documents: Map<string, unknown>, dossier: CreatorDossier) => DepthParityCounts;
  status: (mapping: Omit<DepthParityMapping, "status">, dossier: CreatorDossier) => DepthParityMappingStatus;
}

const definitions: Record<DepthParityCreatorId, CreatorDefinition> = {
  "ai-red-witch": {
    expectedCounts: { corpus: 331, comparison: 318, canonicalDeep: 21, registeredDeep: 9 },
    sources: [
      { path: "ai-red-witch/video-library/creator-overview.json", recordPointer: "/publicCorpus/notes" },
      { path: "ai-red-witch/video-library/library.json", recordPointer: "/videos" },
      { path: "ai-red-witch/selected-high-like/focus-reconstruction.json", recordPointer: "/videos" }
    ],
    mappings: [
      { sourcePointer: "ai-red-witch/video-library/creator-overview.json#/creator", canonicalPointer: "/identity", reason: "身份、受众、价值承诺与信任结构直接来自既有 creator overview。" },
      { sourcePointer: "ai-red-witch/video-library/creator-overview.json#/publicCorpus/notes", canonicalPointer: "/counts/corpus", reason: "公开笔记总数保留为全量 corpus 计数。" },
      { sourcePointer: "ai-red-witch/video-library/creator-overview.json#/publicCorpus/videos", canonicalPointer: "/counts/comparison", reason: "318 条视频构成有视频口径的全量可比较盘面；不是 21 条分层样本。" },
      { sourcePointer: "ai-red-witch/video-library/creator-overview.json#/publicCorpus/videoLikeStats", canonicalPointer: "/corpus", reason: "median、mean、max 与分布按聚合基本盘迁移。" },
      { sourcePointer: "ai-red-witch/video-library/creator-overview.json#/titleHeuristics", canonicalPointer: "/contentSystem", reason: "主题与形式数值聚类来自既有标题启发式统计。" },
      { sourcePointer: "ai-red-witch/video-library/library.json#/videos", canonicalPointer: "/counts/canonicalDeep", reason: "21 条视频库记录是可逐条阅读的 canonical evidence records。" },
      { sourcePointer: "ai-red-witch/video-library/library.json#/videos", canonicalPointer: "/portfolio/items", reason: "同一组 21 条记录承载 High/Base/Low 比较和逐条内容结构。" },
      { sourcePointer: "ai-red-witch/selected-high-like/focus-reconstruction.json#/videos", canonicalPointer: "/counts/registeredDeep", reason: "9 条 focus videos 注册为三档深度机制样本。" }
    ],
    exceptions: [
      { id: "red-witch-aggregate-corpus", mappingPointers: ["/counts/corpus", "/counts/comparison"], reason: "331/318 只保留聚合基本盘，缺少 318 条逐行原始视频记录；21 条分层记录不能冒充全量行。", evidenceRefs: ["ai-red-witch/video-library/creator-overview.json#/publicCorpus"] }
    ],
    count: (documents, dossier) => ({
      corpus: requiredNumber(documents, "ai-red-witch/video-library/creator-overview.json", "/publicCorpus/notes"),
      comparison: requiredNumber(documents, "ai-red-witch/video-library/creator-overview.json", "/publicCorpus/videos"),
      canonicalDeep: requiredArrayLength(documents, "ai-red-witch/video-library/library.json", "/videos"),
      registeredDeep: dossier.portfolio.deepCount
    }),
    status: (mapping, dossier) => mapping.canonicalPointer === "/counts/corpus" || mapping.canonicalPointer === "/counts/comparison"
      ? "partial" : mapping.canonicalPointer === "/portfolio/items" && dossier.portfolio.items.length !== 21 ? "partial" : "mapped"
  },
  "zhang-zala": {
    expectedCounts: { corpus: 62, comparison: 21, canonicalDeep: 12, registeredDeep: 9 },
    sources: [
      { path: "zhang-zala-v1/dashboard-data.json", recordPointer: "/posts" },
      { path: "zhang-zala-v1/selection.json", recordPointer: "/deepSet" },
      { path: "zhang-zala-v1/creator-analysis.json", recordPointer: "/deepDives" }
    ],
    mappings: [
      { sourcePointer: "zhang-zala-v1/dashboard-data.json#/creator", canonicalPointer: "/identity", reason: "博主身份与主页信息来自 dashboard creator。" },
      { sourcePointer: "zhang-zala-v1/dashboard-data.json#/positioning", canonicalPointer: "/identity/positioning", reason: "定位、受众、价值承诺和证明系统来自既有定位研究。" },
      { sourcePointer: "zhang-zala-v1/dashboard-data.json#/overview/postCount", canonicalPointer: "/counts/corpus", reason: "62 条作品级公开盘面保留为 corpus。" },
      { sourcePointer: "zhang-zala-v1/dashboard-data.json#/posts", canonicalPointer: "/counts/comparison", reason: "从全量四档池选择 7/7/7，映射为 21 条 High/Base/Low canonical comparison。" },
      { sourcePointer: "zhang-zala-v1/dashboard-data.json#/topicClusters", canonicalPointer: "/contentSystem/topicClusters", reason: "多标签主题组合保留 count、median、mean 和 max。" },
      { sourcePointer: "zhang-zala-v1/dashboard-data.json#/formatClusters", canonicalPointer: "/contentSystem/formatClusters", reason: "多标签形式组合保留 count、median、mean 和 max。" },
      { sourcePointer: "zhang-zala-v1/dashboard-data.json#/deepDives", canonicalPointer: "/counts/canonicalDeep", reason: "12 条四档深度研究是源资产中的完整 deep set。" },
      { sourcePointer: "zhang-zala-v1/selection.json#/deepSet", canonicalPointer: "/counts/registeredDeep", reason: "四档 12 条按三档产品合同注册 9 条，Base 同时覆盖 median 与 average。" },
      { sourcePointer: "zhang-zala-v1/dashboard-data.json#/posts", canonicalPointer: "/portfolio/items", reason: "21 条比较记录必须保留公开指标、核心内容、机制、架构与证据状态。" }
    ],
    exceptions: [
      { id: "zhang-four-to-three-tier", mappingPointers: ["/counts/registeredDeep"], reason: "源研究包含 high/median/average/low 各 3 条（12 条）；产品三档注册集为 High 3 + Base 3 + Low 3，未注册的 3 条仍须保留在 canonicalDeep，不得删除。", evidenceRefs: ["zhang-zala-v1/selection.json#/deepSet"] }
    ],
    count: (documents, dossier) => ({
      corpus: requiredArrayLength(documents, "zhang-zala-v1/dashboard-data.json", "/posts"),
      comparison: dossier.portfolio.items.length,
      canonicalDeep: requiredArrayLength(documents, "zhang-zala-v1/dashboard-data.json", "/deepDives"),
      registeredDeep: dossier.portfolio.deepCount
    }),
    status: (mapping, dossier) => {
      if (mapping.canonicalPointer === "/counts/registeredDeep") return dossier.portfolio.deepCount === 9 ? "partial" : "omitted";
      if (mapping.canonicalPointer === "/portfolio/items") return dossier.portfolio.items.every((item) => item.coreContent && item.contentArchitecture.length && item.evidenceStatus !== "missing") ? "mapped" : "partial";
      return "mapped";
    }
  },
  "human-director": {
    expectedCounts: { corpus: 19, comparison: 19, canonicalDeep: 8, registeredDeep: 8 },
    sources: [
      { path: "human-director/inventory.json", recordPointer: "/videos" },
      { path: "human-director/analysis.json", recordPointer: "/videos" },
      { path: "human-director/tiers-backfill.json", recordPointer: "/tiers" }
    ],
    mappings: [
      { sourcePointer: "human-director/analysis.json#/creator", canonicalPointer: "/identity", reason: "身份与主页信息来自既有 creator analysis。" },
      { sourcePointer: "human-director/inventory.json#/videos", canonicalPointer: "/counts/corpus", reason: "19 条公开作品与互动指标构成全量 corpus。" },
      { sourcePointer: "human-director/inventory.json#/videos", canonicalPointer: "/counts/comparison", reason: "小样本账号的 19 条作品全部进入统一比较浏览。" },
      { sourcePointer: "human-director/analysis.json#/videos", canonicalPointer: "/counts/canonicalDeep", reason: "8 条具备字幕、archetype 与画面研究的源深样本。" },
      { sourcePointer: "human-director/analysis.json#/videos", canonicalPointer: "/counts/registeredDeep", reason: "8 条源深样本全部注册，不做无证据缩减。" },
      { sourcePointer: "human-director/inventory.json#/videos", canonicalPointer: "/contentSystem/topicClusters", reason: "全量 pillar 按 count、median、mean、max 聚合。" },
      { sourcePointer: "human-director/analysis.json#/videos", canonicalPointer: "/contentSystem/formatClusters", reason: "8 条 archetype 应形成数值形式聚类，不能只保留文字列表。" },
      { sourcePointer: "human-director/tiers-backfill.json#/tiers", canonicalPointer: "/tiers", reason: "high/median/average/low 研究映射到 High/Base/Low，Base 保留两个锚点。" },
      { sourcePointer: "human-director/inventory.json#/videos", canonicalPointer: "/portfolio/items", reason: "19 条记录保留指标；8 条深样本附加内容结构与证据状态。" }
    ],
    exceptions: [
      { id: "human-director-publishing-time", mappingPointers: ["/rhythm"], reason: "19 条源记录均缺精确发布时间，因此发布星期与时段保持 missing；不得用零值或推断补齐。", evidenceRefs: ["human-director/inventory.json#/videos"] }
    ],
    count: (documents, dossier) => ({
      corpus: requiredArrayLength(documents, "human-director/inventory.json", "/videos"),
      comparison: dossier.portfolio.items.length,
      canonicalDeep: requiredArrayLength(documents, "human-director/analysis.json", "/videos"),
      registeredDeep: dossier.portfolio.deepCount
    }),
    status: (mapping, dossier) => mapping.canonicalPointer === "/contentSystem/formatClusters" && dossier.contentSystem.formatClusters.length === 0 ? "omitted"
      : mapping.canonicalPointer === "/portfolio/items" && dossier.portfolio.items.some((item) => item.deepSample && item.contentArchitecture.length === 0) ? "partial" : "mapped"
  }
};

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

export function resolveJsonPointer(document: unknown, pointer: string): unknown {
  if (pointer === "") return document;
  if (!pointer.startsWith("/")) return undefined;
  return pointer.slice(1).split("/").reduce<unknown>((value, rawToken) => {
    const token = rawToken.replace(/~1/g, "/").replace(/~0/g, "~");
    if (Array.isArray(value)) {
      const index = Number.parseInt(token, 10);
      return Number.isInteger(index) ? value[index] : undefined;
    }
    return record(value)?.[token];
  }, document);
}

function readDocuments(sourceDefinitions: SourceDefinition[]): { sources: DepthParitySource[]; documents: Map<string, unknown> } {
  const documents = new Map<string, unknown>();
  const sources = sourceDefinitions.map((source): DepthParitySource => {
    const absolute = path.join(researchDir, source.path);
    if (!fs.existsSync(absolute)) return { path: source.path, exists: false, sha256: null, recordCount: null };
    const bytes = fs.readFileSync(absolute);
    let document: unknown;
    try { document = JSON.parse(bytes.toString("utf8")) as unknown; } catch { document = undefined; }
    documents.set(source.path, document);
    const records = resolveJsonPointer(document, source.recordPointer);
    const recordCount = Array.isArray(records) ? records.length : typeof records === "number" && Number.isFinite(records) ? records : null;
    return { path: source.path, exists: true, sha256: crypto.createHash("sha256").update(bytes).digest("hex"), recordCount };
  });
  return { sources, documents };
}

function requiredNumber(documents: Map<string, unknown>, sourcePath: string, pointer: string): number {
  const value = resolveJsonPointer(documents.get(sourcePath), pointer);
  return typeof value === "number" && Number.isFinite(value) ? value : -1;
}

function requiredArrayLength(documents: Map<string, unknown>, sourcePath: string, pointer: string): number {
  const value = resolveJsonPointer(documents.get(sourcePath), pointer);
  return Array.isArray(value) ? value.length : -1;
}

function mappingIsExplained(manifest: CreatorDepthParityManifest, mapping: DepthParityMapping): boolean {
  return manifest.exceptions.some((exception) => exception.mappingPointers.includes(mapping.canonicalPointer));
}

function splitArtifactPointer(reference: string): { sourcePath: string; pointer: string } | null {
  const marker = reference.indexOf("#");
  if (marker <= 0) return null;
  const sourcePath = reference.slice(0, marker);
  const pointer = reference.slice(marker + 1);
  return pointer === "" || pointer.startsWith("/") ? { sourcePath, pointer } : null;
}

function inspectArtifactPointer(reference: string, listedSources: Set<string>): string | null {
  const parsed = splitArtifactPointer(reference);
  if (!parsed) return `Invalid artifact pointer: ${reference}`;
  if (!listedSources.has(parsed.sourcePath)) return `Artifact pointer uses an unregistered source: ${reference}`;
  const absolute = path.join(researchDir, parsed.sourcePath);
  if (!fs.existsSync(absolute)) return `Artifact pointer source does not exist: ${reference}`;
  let document: unknown;
  try { document = JSON.parse(fs.readFileSync(absolute, "utf8")) as unknown; } catch { return `Artifact pointer source is not valid JSON: ${reference}`; }
  return resolveJsonPointer(document, parsed.pointer) === undefined ? `Artifact pointer does not resolve: ${reference}` : null;
}

export function evaluateCreatorDepthParityManifest(manifest: Omit<CreatorDepthParityManifest, "gate">): CreatorDepthParityManifest["gate"] {
  const failures: DepthParityGateFailure[] = [];
  for (const source of manifest.sources) {
    const absolute = path.join(researchDir, source.path);
    const existsOnDisk = fs.existsSync(absolute);
    if (!source.exists || !existsOnDisk) failures.push({ id: `missing-source:${source.path}`, reason: `Source file does not exist: ${source.path}` });
    if (source.exists && !/^[a-f0-9]{64}$/.test(source.sha256 ?? "")) failures.push({ id: `invalid-sha256:${source.path}`, reason: `Source SHA-256 is missing or invalid: ${source.path}` });
    if (source.exists && existsOnDisk && /^[a-f0-9]{64}$/.test(source.sha256 ?? "")) {
      const actual = crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
      if (source.sha256 !== actual) failures.push({ id: `sha256-mismatch:${source.path}`, reason: `Recorded SHA-256 does not match the source bytes: ${source.path}` });
    }
    if (source.exists && source.recordCount === null) failures.push({ id: `unreadable-record-count:${source.path}`, reason: `Configured record pointer did not resolve to a number or array: ${source.path}` });
  }
  for (const key of ["corpus", "comparison", "canonicalDeep", "registeredDeep"] as const) {
    if (manifest.counts[key] !== manifest.expectedCounts[key]) failures.push({ id: `count-mismatch:${key}`, reason: `${key}: expected ${manifest.expectedCounts[key]}, observed ${manifest.counts[key]}.` });
  }
  const listedSources = new Set(manifest.sources.map((source) => source.path));
  for (const mapping of manifest.mappings) {
    if (!mapping.reason.trim()) failures.push({ id: `mapping-without-reason:${mapping.canonicalPointer}`, reason: `Mapping has no reason: ${mapping.sourcePointer}` });
    const pointerError = inspectArtifactPointer(mapping.sourcePointer, listedSources);
    if (pointerError) failures.push({ id: `invalid-source-pointer:${mapping.sourcePointer}`, reason: pointerError });
    if (mapping.status !== "mapped" && !mappingIsExplained({ ...manifest, gate: { ready: false, failures: [] } }, mapping)) {
      failures.push({ id: `unexplained-${mapping.status}:${mapping.canonicalPointer}`, reason: `${mapping.status} mapping has no matching exception: ${mapping.sourcePointer}` });
    }
  }
  for (const exception of manifest.exceptions) {
    if (!exception.reason.trim()) failures.push({ id: `exception-without-reason:${exception.id}`, reason: `Exception has no reason: ${exception.id}` });
    if (!exception.mappingPointers.length) failures.push({ id: `exception-without-mapping:${exception.id}`, reason: `Exception names no canonical mapping: ${exception.id}` });
    if (!exception.evidenceRefs.length) failures.push({ id: `exception-without-evidence:${exception.id}`, reason: `Exception has no evidence reference: ${exception.id}` });
    for (const evidenceRef of exception.evidenceRefs) {
      const pointerError = inspectArtifactPointer(evidenceRef, listedSources);
      if (pointerError) failures.push({ id: `invalid-exception-evidence:${exception.id}`, reason: pointerError });
    }
  }
  return { ready: failures.length === 0, failures };
}

export function buildCreatorDepthParityManifest(creatorId: DepthParityCreatorId): CreatorDepthParityManifest {
  const definition = definitions[creatorId];
  const dossier = loadLegacyDeepDossier(creatorId);
  if (!dossier) throw new Error(`Canonical dossier is unavailable for ${creatorId}.`);
  const { sources, documents } = readDocuments(definition.sources);
  const partial: Omit<CreatorDepthParityManifest, "gate"> = {
    creatorId,
    contractVersion: CREATOR_DEPTH_PARITY_CONTRACT_VERSION,
    sources,
    mappings: definition.mappings.map((mapping) => ({ ...mapping, status: definition.status(mapping, dossier) })),
    counts: definition.count(documents, dossier),
    expectedCounts: { ...definition.expectedCounts },
    exceptions: definition.exceptions.map((exception) => ({ ...exception, mappingPointers: [...exception.mappingPointers], evidenceRefs: [...exception.evidenceRefs] }))
  };
  return { ...partial, gate: evaluateCreatorDepthParityManifest(partial) };
}

export function buildAllCreatorDepthParityManifests(): CreatorDepthParityManifest[] {
  return (["ai-red-witch", "zhang-zala", "human-director"] as const).map(buildCreatorDepthParityManifest);
}

export function assertCreatorDepthParity(manifest: CreatorDepthParityManifest): void {
  const gate = evaluateCreatorDepthParityManifest(manifest);
  if (!gate.ready) throw new Error(`${manifest.creatorId} depth parity failed:\n${gate.failures.map((failure) => `- ${failure.id}: ${failure.reason}`).join("\n")}`);
}
