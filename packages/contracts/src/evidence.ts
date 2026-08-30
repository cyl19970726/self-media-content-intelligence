import { z } from "zod";

export const evidenceAvailabilitySchema = z.enum([
  "available",
  "pending_retrieval",
  "missing",
  "unauthorized",
  "integrity_failed"
]);

export const evidenceManifestEntrySchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  evidenceId: z.string().min(1),
  classification: z.enum(["research_evidence", "fixture", "example"]),
  content: z.object({
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    bytes: z.number().int().nonnegative(),
    mediaType: z.string().min(1)
  }).strict(),
  storage: z.object({
    uri: z.string().min(1),
    availability: evidenceAvailabilitySchema
  }).strict(),
  provenance: z.object({
    originalPath: z.string().startsWith("artifacts/"),
    capturedAt: z.string().datetime().nullable(),
    producer: z.string().min(1)
  }).strict()
}).strict();

export const evidenceAccessProjectionSchema = z.object({
  evidenceId: z.string().min(1),
  classification: evidenceManifestEntrySchema.shape.classification,
  availability: evidenceAvailabilitySchema,
  content: evidenceManifestEntrySchema.shape.content,
  storageUri: z.string().min(1),
  originalPath: z.string().startsWith("artifacts/"),
  checkedAt: z.string().datetime(),
  reason: z.enum([
    "verified",
    "not_materialized",
    "object_missing",
    "access_denied",
    "hash_or_size_mismatch",
    "manifest_state"
  ])
}).strict();

export type EvidenceAvailability = z.infer<typeof evidenceAvailabilitySchema>;
export type EvidenceManifestEntry = z.infer<typeof evidenceManifestEntrySchema>;
export type EvidenceAccessProjection = z.infer<typeof evidenceAccessProjectionSchema>;

export const evidenceCatalogSummarySchema = z.object({
  manifestEntries: z.number().int().nonnegative(),
  storeConfigured: z.boolean(),
  storeReadable: z.boolean(),
  classifications: z.record(z.string(), z.number().int().nonnegative()),
  declaredAvailability: z.record(z.string(), z.number().int().nonnegative())
}).strict();

export const evidenceCatalogPageSchema = z.object({
  entries: z.array(evidenceManifestEntrySchema),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  summary: evidenceCatalogSummarySchema
}).strict();

export type EvidenceCatalogSummary = z.infer<typeof evidenceCatalogSummarySchema>;
export type EvidenceCatalogPage = z.infer<typeof evidenceCatalogPageSchema>;
export type EvidenceCatalogQuery = {
  query?: string;
  classification?: EvidenceManifestEntry["classification"];
  offset?: number;
  limit?: number;
};

export interface EvidenceAccessPort {
  resolve(evidenceId: string): Promise<EvidenceAccessProjection | null>;
  list(query?: EvidenceCatalogQuery): EvidenceCatalogPage;
  summary(): EvidenceCatalogSummary;
}
