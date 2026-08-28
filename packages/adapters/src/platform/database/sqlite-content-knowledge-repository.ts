import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import {
  creationHypothesisSchema, knowledgeBindingSchema, knowledgeContributionManifestSchema,
  knowledgeContributionSchema, practiceValidationSchema, semanticEdgeSchema,
  type CreationHypothesis, type KnowledgeBinding, type KnowledgeContribution,
  type KnowledgeContributionManifest, type PracticeValidation, type SemanticEdge
} from "../../../../knowledge/index.js";
import type { ContentKnowledgeRepository } from "../../../../knowledge/index.js";

interface JsonRow { value_json: string }
interface OperationRow { command_hash: string; result_json: string }

export class SQLiteContentKnowledgeRepository implements ContentKnowledgeRepository {
  private readonly db: DatabaseSync;

  constructor(filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_manifests (
        id TEXT PRIMARY KEY, analysis_revision_id TEXT NOT NULL, compiler_policy_version TEXT NOT NULL,
        subject_type TEXT NOT NULL, subject_id TEXT NOT NULL, created_at TEXT NOT NULL, value_json TEXT NOT NULL,
        UNIQUE(analysis_revision_id, compiler_policy_version)
      );
      CREATE INDEX IF NOT EXISTS idx_knowledge_manifests_subject ON knowledge_manifests(subject_type, subject_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS knowledge_contributions (
        id TEXT PRIMARY KEY, manifest_id TEXT NOT NULL, value_json TEXT NOT NULL,
        FOREIGN KEY(manifest_id) REFERENCES knowledge_manifests(id)
      );
      CREATE INDEX IF NOT EXISTS idx_knowledge_contributions_manifest ON knowledge_contributions(manifest_id);
      CREATE TABLE IF NOT EXISTS knowledge_edges (
        id TEXT PRIMARY KEY, source_concept_id TEXT NOT NULL, target_concept_id TEXT NOT NULL, created_at TEXT NOT NULL, value_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_knowledge_edges_source ON knowledge_edges(source_concept_id);
      CREATE INDEX IF NOT EXISTS idx_knowledge_edges_target ON knowledge_edges(target_concept_id);
      CREATE TABLE IF NOT EXISTS knowledge_bindings (
        id TEXT PRIMARY KEY, package_id TEXT NOT NULL, target_id TEXT NOT NULL, created_at TEXT NOT NULL, value_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_knowledge_bindings_package ON knowledge_bindings(package_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_knowledge_bindings_target ON knowledge_bindings(target_id);
      CREATE TABLE IF NOT EXISTS creation_hypotheses (
        id TEXT PRIMARY KEY, package_id TEXT NOT NULL, created_at TEXT NOT NULL, value_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_creation_hypotheses_package ON creation_hypotheses(package_id, created_at DESC);
      CREATE TABLE IF NOT EXISTS practice_validations (
        id TEXT PRIMARY KEY, publication_run_id TEXT NOT NULL, updated_at TEXT NOT NULL, value_json TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_practice_validations_run ON practice_validations(publication_run_id, updated_at DESC);
      CREATE TABLE IF NOT EXISTS knowledge_operations (
        operation_key TEXT PRIMARY KEY, command_hash TEXT NOT NULL, result_json TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS knowledge_decision_events (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT, operation_key TEXT NOT NULL UNIQUE,
        event_type TEXT NOT NULL, entity_id TEXT NOT NULL, snapshot_json TEXT NOT NULL, created_at TEXT NOT NULL
      );
    `);
  }

  getManifestByAnalysis(analysisRevisionId: string, compilerPolicyVersion: string): KnowledgeContributionManifest | null {
    const row = this.db.prepare("SELECT value_json FROM knowledge_manifests WHERE analysis_revision_id = ? AND compiler_policy_version = ?")
      .get(analysisRevisionId, compilerPolicyVersion) as JsonRow | undefined;
    return row ? knowledgeContributionManifestSchema.parse(JSON.parse(row.value_json) as unknown) : null;
  }

  saveManifest(manifest: KnowledgeContributionManifest, contributions: KnowledgeContribution[], operationKey: string, commandHash: string): KnowledgeContributionManifest {
    const parsed = knowledgeContributionManifestSchema.parse(manifest);
    const items = contributions.map((item) => knowledgeContributionSchema.parse(item));
    return this.write(operationKey, commandHash, "manifest_saved", parsed.id, parsed, () => {
      this.db.prepare(`INSERT INTO knowledge_manifests
        (id, analysis_revision_id, compiler_policy_version, subject_type, subject_id, created_at, value_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(parsed.id, parsed.analysisRevisionId, parsed.compilerPolicyVersion, parsed.subjectType, parsed.subjectId, parsed.createdAt, JSON.stringify(parsed));
      const statement = this.db.prepare("INSERT INTO knowledge_contributions (id, manifest_id, value_json) VALUES (?, ?, ?)");
      for (const item of items) statement.run(item.id, parsed.id, JSON.stringify(item));
    }, knowledgeContributionManifestSchema);
  }

  listManifests(subjectType?: string, subjectId?: string): KnowledgeContributionManifest[] {
    const rows = subjectType && subjectId
      ? this.db.prepare("SELECT value_json FROM knowledge_manifests WHERE subject_type = ? AND subject_id = ? ORDER BY created_at DESC").all(subjectType, subjectId)
      : this.db.prepare("SELECT value_json FROM knowledge_manifests ORDER BY created_at DESC").all();
    return (rows as unknown as JsonRow[]).map((row) => knowledgeContributionManifestSchema.parse(JSON.parse(row.value_json) as unknown));
  }

  listContributions(manifestId: string): KnowledgeContribution[] {
    const rows = this.db.prepare("SELECT value_json FROM knowledge_contributions WHERE manifest_id = ? ORDER BY rowid").all(manifestId) as unknown as JsonRow[];
    return rows.map((row) => knowledgeContributionSchema.parse(JSON.parse(row.value_json) as unknown));
  }

  saveEdge(edge: SemanticEdge, operationKey: string, commandHash: string): SemanticEdge {
    const parsed = semanticEdgeSchema.parse(edge);
    return this.write(operationKey, commandHash, "edge_saved", parsed.id, parsed, () => {
      this.db.prepare("INSERT INTO knowledge_edges (id, source_concept_id, target_concept_id, created_at, value_json) VALUES (?, ?, ?, ?, ?)")
        .run(parsed.id, parsed.sourceConceptId, parsed.targetConceptId, parsed.createdAt, JSON.stringify(parsed));
    }, semanticEdgeSchema);
  }

  listEdges(conceptId?: string): SemanticEdge[] {
    const rows = conceptId
      ? this.db.prepare("SELECT value_json FROM knowledge_edges WHERE source_concept_id = ? OR target_concept_id = ? ORDER BY created_at DESC").all(conceptId, conceptId)
      : this.db.prepare("SELECT value_json FROM knowledge_edges ORDER BY created_at DESC").all();
    return (rows as unknown as JsonRow[]).map((row) => semanticEdgeSchema.parse(JSON.parse(row.value_json) as unknown));
  }

  saveBinding(binding: KnowledgeBinding, operationKey: string, commandHash: string): KnowledgeBinding {
    const parsed = knowledgeBindingSchema.parse(binding);
    return this.write(operationKey, commandHash, "binding_saved", parsed.id, parsed, () => {
      this.db.prepare("INSERT INTO knowledge_bindings (id, package_id, target_id, created_at, value_json) VALUES (?, ?, ?, ?, ?)")
        .run(parsed.id, parsed.contentPackageId, parsed.targetId, parsed.createdAt, JSON.stringify(parsed));
    }, knowledgeBindingSchema);
  }

  listBindings(contentPackageId?: string, conceptRevisionId?: string): KnowledgeBinding[] {
    const rows = contentPackageId
      ? this.db.prepare("SELECT value_json FROM knowledge_bindings WHERE package_id = ? ORDER BY created_at DESC").all(contentPackageId)
      : conceptRevisionId
        ? this.db.prepare("SELECT value_json FROM knowledge_bindings WHERE target_id = ? ORDER BY created_at DESC").all(conceptRevisionId)
        : this.db.prepare("SELECT value_json FROM knowledge_bindings ORDER BY created_at DESC").all();
    return (rows as unknown as JsonRow[]).map((row) => knowledgeBindingSchema.parse(JSON.parse(row.value_json) as unknown));
  }

  saveHypothesis(hypothesis: CreationHypothesis, operationKey: string, commandHash: string): CreationHypothesis {
    const parsed = creationHypothesisSchema.parse(hypothesis);
    return this.write(operationKey, commandHash, "hypothesis_saved", parsed.id, parsed, () => {
      this.db.prepare("INSERT INTO creation_hypotheses (id, package_id, created_at, value_json) VALUES (?, ?, ?, ?)")
        .run(parsed.id, parsed.contentPackageId, parsed.createdAt, JSON.stringify(parsed));
    }, creationHypothesisSchema);
  }

  getHypothesis(id: string): CreationHypothesis | null {
    const row = this.db.prepare("SELECT value_json FROM creation_hypotheses WHERE id = ?").get(id) as JsonRow | undefined;
    return row ? creationHypothesisSchema.parse(JSON.parse(row.value_json) as unknown) : null;
  }

  listHypotheses(contentPackageId: string): CreationHypothesis[] {
    const rows = this.db.prepare("SELECT value_json FROM creation_hypotheses WHERE package_id = ? ORDER BY created_at DESC").all(contentPackageId) as unknown as JsonRow[];
    return rows.map((row) => creationHypothesisSchema.parse(JSON.parse(row.value_json) as unknown));
  }

  saveValidation(validation: PracticeValidation, operationKey: string, commandHash: string): PracticeValidation {
    const parsed = practiceValidationSchema.parse(validation);
    return this.write(operationKey, commandHash, "validation_saved", parsed.id, parsed, () => {
      this.db.prepare(`INSERT INTO practice_validations (id, publication_run_id, updated_at, value_json) VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, value_json = excluded.value_json`)
        .run(parsed.id, parsed.publicationRunId, parsed.updatedAt, JSON.stringify(parsed));
    }, practiceValidationSchema);
  }

  getValidation(id: string): PracticeValidation | null {
    const row = this.db.prepare("SELECT value_json FROM practice_validations WHERE id = ?").get(id) as JsonRow | undefined;
    return row ? practiceValidationSchema.parse(JSON.parse(row.value_json) as unknown) : null;
  }

  listValidations(publicationRunId?: string): PracticeValidation[] {
    const rows = publicationRunId
      ? this.db.prepare("SELECT value_json FROM practice_validations WHERE publication_run_id = ? ORDER BY updated_at DESC").all(publicationRunId)
      : this.db.prepare("SELECT value_json FROM practice_validations ORDER BY updated_at DESC").all();
    return (rows as unknown as JsonRow[]).map((row) => practiceValidationSchema.parse(JSON.parse(row.value_json) as unknown));
  }

  close(): void { this.db.close(); }

  private write<T>(operationKey: string, commandHash: string, eventType: string, entityId: string, value: T,
    persist: () => void, schema: z.ZodType<T>): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const prior = this.db.prepare("SELECT command_hash, result_json FROM knowledge_operations WHERE operation_key = ?")
        .get(operationKey) as OperationRow | undefined;
      if (prior) {
        if (prior.command_hash !== commandHash) throw new Error(`idempotency conflict for operation ${operationKey}`);
        const result = schema.parse(JSON.parse(prior.result_json) as unknown);
        this.db.exec("COMMIT");
        return result;
      }
      persist();
      const now = new Date().toISOString();
      this.db.prepare("INSERT INTO knowledge_operations (operation_key, command_hash, result_json, created_at) VALUES (?, ?, ?, ?)")
        .run(operationKey, commandHash, JSON.stringify(value), now);
      this.db.prepare("INSERT INTO knowledge_decision_events (operation_key, event_type, entity_id, snapshot_json, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(operationKey, eventType, entityId, JSON.stringify(value), now);
      this.db.exec("COMMIT");
      return value;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
}
