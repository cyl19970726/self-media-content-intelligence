import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import {
  creationHypothesisSchema, knowledgeBindingSchema, knowledgeCompilationProposalSchema, knowledgeContributionManifestSchema,
  knowledgeContributionSchema, knowledgeInvalidationRecordSchema, practiceValidationSchema, semanticEdgeSchema,
  type CreationHypothesis, type KnowledgeBinding, type KnowledgeCompilationProposal, type KnowledgeContribution,
  type KnowledgeContributionManifest, type KnowledgeInvalidationRecord, type PracticeValidation, type SemanticEdge
} from "../../../../knowledge/index.js";
import type { ContentKnowledgeRepository } from "../../../../knowledge/index.js";
import type { KnowledgeProjectionParity } from "../../../../knowledge/index.js";
import {
  researchLearningEventSchema,
  type ResearchLearningEvent,
  type ResearchLearningEventStore
} from "../../../../research/index.js";
import type { ResearchConceptRead } from "../../../../contracts/index.js";

interface JsonRow { value_json: string }
interface OperationRow { command_hash: string; result_json: string }
interface DecisionRow { event_type: string; snapshot_json: string }
interface ResearchEventRow { event_json: string }

export class SQLiteContentKnowledgeRepository implements ContentKnowledgeRepository, ResearchLearningEventStore {
  private readonly db: DatabaseSync;
  private transactionDepth = 0;
  private closed = false;

  constructor(filePath: string) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    this.db = new DatabaseSync(filePath);
    this.db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_compilation_proposals (
        id TEXT PRIMARY KEY, analysis_revision_id TEXT NOT NULL, compiler_policy_version TEXT NOT NULL,
        subject_type TEXT NOT NULL, subject_id TEXT NOT NULL, created_at TEXT NOT NULL, value_json TEXT NOT NULL,
        UNIQUE(analysis_revision_id, compiler_policy_version)
      );
      CREATE INDEX IF NOT EXISTS idx_knowledge_proposals_subject ON knowledge_compilation_proposals(subject_type, subject_id, created_at DESC);
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
      CREATE TABLE IF NOT EXISTS knowledge_invalidations (
        id TEXT PRIMARY KEY, operation_key TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, value_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS knowledge_operations (
        operation_key TEXT PRIMARY KEY, command_hash TEXT NOT NULL, result_json TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS knowledge_decision_events (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT, operation_key TEXT NOT NULL UNIQUE,
        event_type TEXT NOT NULL, entity_id TEXT NOT NULL, snapshot_json TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS research_learning_events (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        event_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS knowledge_concept_projection (
        concept_id TEXT PRIMARY KEY, name TEXT NOT NULL, definition TEXT NOT NULL,
        exclusions TEXT NOT NULL, value_json TEXT NOT NULL, updated_at TEXT NOT NULL
      );
    `);
    try {
      this.db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_concept_fts USING fts5(
        concept_id UNINDEXED, name, definition, exclusions, tokenize='unicode61'
      )`);
    } catch (error) {
      this.db.close();
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Knowledge search requires SQLite FTS5; database initialization stopped: ${detail}`);
    }
  }

  transaction<T>(operation: () => T): T {
    if (this.transactionDepth > 0) return operation();
    this.db.exec("BEGIN IMMEDIATE");
    this.transactionDepth += 1;
    try {
      const result = operation();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    } finally {
      this.transactionDepth -= 1;
    }
  }

  append(event: ResearchLearningEvent): void {
    const parsed = researchLearningEventSchema.parse(event);
    this.db.prepare("INSERT INTO research_learning_events (event_type, event_json, created_at) VALUES (?, ?, ?)")
      .run(parsed.type, JSON.stringify(parsed), new Date().toISOString());
  }

  load(): ResearchLearningEvent[] {
    const rows = this.db.prepare("SELECT event_json FROM research_learning_events ORDER BY sequence ASC").all() as unknown as ResearchEventRow[];
    return rows.map((row) => researchLearningEventSchema.parse(JSON.parse(row.event_json) as unknown));
  }

  getProposal(id: string): KnowledgeCompilationProposal | null {
    const row = this.db.prepare("SELECT value_json FROM knowledge_compilation_proposals WHERE id = ?").get(id) as JsonRow | undefined;
    return row ? knowledgeCompilationProposalSchema.parse(JSON.parse(row.value_json) as unknown) : null;
  }

  getProposalByAnalysis(analysisRevisionId: string, compilerPolicyVersion: string): KnowledgeCompilationProposal | null {
    const row = this.db.prepare("SELECT value_json FROM knowledge_compilation_proposals WHERE analysis_revision_id = ? AND compiler_policy_version = ?")
      .get(analysisRevisionId, compilerPolicyVersion) as JsonRow | undefined;
    return row ? knowledgeCompilationProposalSchema.parse(JSON.parse(row.value_json) as unknown) : null;
  }

  saveProposal(proposal: KnowledgeCompilationProposal, operationKey: string, commandHash: string): KnowledgeCompilationProposal {
    const parsed = knowledgeCompilationProposalSchema.parse(proposal);
    return this.write(operationKey, commandHash, "proposal_saved", parsed.id, parsed, () => {
      this.db.prepare(`INSERT INTO knowledge_compilation_proposals
        (id, analysis_revision_id, compiler_policy_version, subject_type, subject_id, created_at, value_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).run(parsed.id, parsed.analysisRevisionId, parsed.compilerPolicyVersion,
          parsed.subjectType, parsed.subjectId, parsed.createdAt, JSON.stringify(parsed));
    }, knowledgeCompilationProposalSchema);
  }

  saveProposalState(proposal: KnowledgeCompilationProposal, operationKey: string, commandHash: string): KnowledgeCompilationProposal {
    const parsed = knowledgeCompilationProposalSchema.parse(proposal);
    return this.write(operationKey, commandHash, "proposal_state_saved", parsed.id, parsed, () => {
      this.db.prepare("UPDATE knowledge_compilation_proposals SET value_json = ? WHERE id = ?").run(JSON.stringify(parsed), parsed.id);
    }, knowledgeCompilationProposalSchema);
  }

  listProposals(subjectType?: string, subjectId?: string): KnowledgeCompilationProposal[] {
    const rows = subjectType && subjectId
      ? this.db.prepare("SELECT value_json FROM knowledge_compilation_proposals WHERE subject_type = ? AND subject_id = ? ORDER BY created_at DESC").all(subjectType, subjectId)
      : this.db.prepare("SELECT value_json FROM knowledge_compilation_proposals ORDER BY created_at DESC").all();
    return (rows as unknown as JsonRow[]).map((row) => knowledgeCompilationProposalSchema.parse(JSON.parse(row.value_json) as unknown));
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

  saveManifestState(manifest: KnowledgeContributionManifest, operationKey: string, commandHash: string): KnowledgeContributionManifest {
    const parsed = knowledgeContributionManifestSchema.parse(manifest);
    return this.write(operationKey, commandHash, "manifest_state_saved", parsed.id, parsed, () => {
      this.db.prepare("UPDATE knowledge_manifests SET value_json = ? WHERE id = ?").run(JSON.stringify(parsed), parsed.id);
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

  saveEdgeState(edge: SemanticEdge, operationKey: string, commandHash: string): SemanticEdge {
    const parsed = semanticEdgeSchema.parse(edge);
    return this.write(operationKey, commandHash, "edge_state_saved", parsed.id, parsed, () => {
      this.db.prepare("UPDATE knowledge_edges SET value_json = ? WHERE id = ?").run(JSON.stringify(parsed), parsed.id);
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

  saveInvalidation(record: KnowledgeInvalidationRecord, operationKey: string, commandHash: string): KnowledgeInvalidationRecord {
    const parsed = knowledgeInvalidationRecordSchema.parse(record);
    return this.write(operationKey, commandHash, "invalidation_recorded", parsed.id, parsed, () => {
      this.db.prepare("INSERT INTO knowledge_invalidations (id, operation_key, created_at, value_json) VALUES (?, ?, ?, ?)")
        .run(parsed.id, parsed.operationKey, parsed.createdAt, JSON.stringify(parsed));
    }, knowledgeInvalidationRecordSchema);
  }

  getInvalidationByOperationKey(operationKey: string): KnowledgeInvalidationRecord | null {
    const row = this.db.prepare("SELECT value_json FROM knowledge_invalidations WHERE operation_key = ?").get(operationKey) as JsonRow | undefined;
    return row ? knowledgeInvalidationRecordSchema.parse(JSON.parse(row.value_json) as unknown) : null;
  }

  listInvalidations(): KnowledgeInvalidationRecord[] {
    const rows = this.db.prepare("SELECT value_json FROM knowledge_invalidations ORDER BY created_at DESC, id DESC").all() as unknown as JsonRow[];
    return rows.map((row) => knowledgeInvalidationRecordSchema.parse(JSON.parse(row.value_json) as unknown));
  }

  syncConceptProjection(concepts: ResearchConceptRead[]): void {
    this.transaction(() => {
      const upsert = this.db.prepare(`INSERT INTO knowledge_concept_projection
        (concept_id, name, definition, exclusions, value_json, updated_at) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(concept_id) DO UPDATE SET name=excluded.name, definition=excluded.definition,
        exclusions=excluded.exclusions, value_json=excluded.value_json, updated_at=excluded.updated_at`);
      const removeFts = this.db.prepare("DELETE FROM knowledge_concept_fts WHERE concept_id = ?");
      const insertFts = this.db.prepare("INSERT INTO knowledge_concept_fts (concept_id, name, definition, exclusions) VALUES (?, ?, ?, ?)");
      const ids = new Set(concepts.map((item) => item.concept.id));
      for (const row of this.db.prepare("SELECT concept_id FROM knowledge_concept_projection").all() as unknown as Array<{ concept_id: string }>) {
        if (!ids.has(row.concept_id)) {
          this.db.prepare("DELETE FROM knowledge_concept_projection WHERE concept_id = ?").run(row.concept_id);
          removeFts.run(row.concept_id);
        }
      }
      for (const item of concepts) {
        const exclusions = item.currentRevision.exclusions.join("\n");
        upsert.run(item.concept.id, item.concept.name, item.currentRevision.definition, exclusions, JSON.stringify(item), new Date().toISOString());
        removeFts.run(item.concept.id);
        insertFts.run(item.concept.id, item.concept.name, item.currentRevision.definition, exclusions);
      }
    });
  }

  searchConceptIds(query: string): string[] {
    const ftsQuery = query.trim().split(/\s+/u).filter(Boolean).map((term) => `"${term.replaceAll('"', '""')}"`).join(" AND ");
    if (ftsQuery) {
      const ranked = this.db.prepare(`SELECT concept_id FROM knowledge_concept_fts
        WHERE knowledge_concept_fts MATCH ? ORDER BY bm25(knowledge_concept_fts), concept_id`).all(ftsQuery) as unknown as Array<{ concept_id: string }>;
      if (ranked.length > 0) return ranked.map((row) => row.concept_id);
    }
    const escaped = `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    const rows = this.db.prepare(`SELECT concept_id FROM knowledge_concept_projection
      WHERE name LIKE ? ESCAPE '\\' OR definition LIKE ? ESCAPE '\\' OR exclusions LIKE ? ESCAPE '\\'
      ORDER BY updated_at DESC`).all(escaped, escaped, escaped) as unknown as Array<{ concept_id: string }>;
    return rows.map((row) => row.concept_id);
  }

  rebuildProjections(): KnowledgeProjectionParity {
    return this.transaction(() => {
      this.db.exec(`DELETE FROM knowledge_contributions; DELETE FROM knowledge_manifests;
        DELETE FROM knowledge_edges; DELETE FROM knowledge_bindings;
        DELETE FROM creation_hypotheses; DELETE FROM practice_validations;
        DELETE FROM knowledge_invalidations;
        DELETE FROM knowledge_concept_projection; DELETE FROM knowledge_concept_fts;`);
      const rows = this.db.prepare("SELECT event_type, snapshot_json FROM knowledge_decision_events ORDER BY sequence ASC").all() as unknown as DecisionRow[];
      for (const row of rows) this.replayDecision(row);
      return this.projectionParity();
    });
  }

  projectionParity(): KnowledgeProjectionParity {
    const count = (table: string) => Number((this.db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count);
    return {
      eventCount: count("knowledge_decision_events"), manifestCount: count("knowledge_manifests"),
      contributionCount: count("knowledge_contributions"), edgeCount: count("knowledge_edges"),
      bindingCount: count("knowledge_bindings"), hypothesisCount: count("creation_hypotheses"),
      validationCount: count("practice_validations"), invalidationCount: count("knowledge_invalidations")
    };
  }

  close(): void { if (!this.closed) { this.closed = true; this.db.close(); } }

  private write<T>(operationKey: string, commandHash: string, eventType: string, entityId: string, value: T,
    persist: () => void, schema: z.ZodType<T, z.ZodTypeDef, unknown>): T {
    return this.transaction(() => {
      const prior = this.db.prepare("SELECT command_hash, result_json FROM knowledge_operations WHERE operation_key = ?")
        .get(operationKey) as OperationRow | undefined;
      if (prior) {
        if (prior.command_hash !== commandHash) throw new Error(`idempotency conflict for operation ${operationKey}`);
        const result = schema.parse(JSON.parse(prior.result_json) as unknown);
        return result;
      }
      persist();
      const now = new Date().toISOString();
      this.db.prepare("INSERT INTO knowledge_operations (operation_key, command_hash, result_json, created_at) VALUES (?, ?, ?, ?)")
        .run(operationKey, commandHash, JSON.stringify(value), now);
      this.db.prepare("INSERT INTO knowledge_decision_events (operation_key, event_type, entity_id, snapshot_json, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(operationKey, eventType, entityId, JSON.stringify(eventType === "manifest_saved" ? { entity: value, contributions: this.listContributions(entityId) } : { entity: value }), now);
      return value;
    });
  }

  private replayDecision(row: DecisionRow): void {
    const snapshot = JSON.parse(row.snapshot_json) as { entity?: unknown; contributions?: unknown[] } | unknown;
    const wrapped = typeof snapshot === "object" && snapshot !== null && "entity" in snapshot;
    const entity = wrapped ? (snapshot as { entity: unknown }).entity : snapshot;
    if (row.event_type === "manifest_saved") {
      const manifest = knowledgeContributionManifestSchema.parse(entity);
      this.db.prepare(`INSERT INTO knowledge_manifests
        (id, analysis_revision_id, compiler_policy_version, subject_type, subject_id, created_at, value_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)`)
        .run(manifest.id, manifest.analysisRevisionId, manifest.compilerPolicyVersion, manifest.subjectType, manifest.subjectId, manifest.createdAt, JSON.stringify(manifest));
      const contributions = wrapped ? ((snapshot as { contributions?: unknown[] }).contributions ?? []) : [];
      for (const raw of contributions) {
        const item = knowledgeContributionSchema.parse(raw);
        this.db.prepare("INSERT INTO knowledge_contributions (id, manifest_id, value_json) VALUES (?, ?, ?)").run(item.id, manifest.id, JSON.stringify(item));
      }
      return;
    }
    if (row.event_type === "manifest_state_saved") {
      const item = knowledgeContributionManifestSchema.parse(entity);
      this.db.prepare("UPDATE knowledge_manifests SET value_json = ? WHERE id = ?").run(JSON.stringify(item), item.id);
    } else if (row.event_type === "edge_saved") {
      const item = semanticEdgeSchema.parse(entity);
      this.db.prepare("INSERT INTO knowledge_edges (id, source_concept_id, target_concept_id, created_at, value_json) VALUES (?, ?, ?, ?, ?)")
        .run(item.id, item.sourceConceptId, item.targetConceptId, item.createdAt, JSON.stringify(item));
    } else if (row.event_type === "edge_state_saved") {
      const item = semanticEdgeSchema.parse(entity);
      this.db.prepare("UPDATE knowledge_edges SET value_json = ? WHERE id = ?").run(JSON.stringify(item), item.id);
    } else if (row.event_type === "binding_saved") {
      const item = knowledgeBindingSchema.parse(entity);
      this.db.prepare("INSERT INTO knowledge_bindings (id, package_id, target_id, created_at, value_json) VALUES (?, ?, ?, ?, ?)")
        .run(item.id, item.contentPackageId, item.targetId, item.createdAt, JSON.stringify(item));
    } else if (row.event_type === "hypothesis_saved") {
      const item = creationHypothesisSchema.parse(entity);
      this.db.prepare("INSERT INTO creation_hypotheses (id, package_id, created_at, value_json) VALUES (?, ?, ?, ?)")
        .run(item.id, item.contentPackageId, item.createdAt, JSON.stringify(item));
    } else if (row.event_type === "validation_saved") {
      const item = practiceValidationSchema.parse(entity);
      this.db.prepare(`INSERT INTO practice_validations (id, publication_run_id, updated_at, value_json) VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET updated_at=excluded.updated_at, value_json=excluded.value_json`)
        .run(item.id, item.publicationRunId, item.updatedAt, JSON.stringify(item));
    } else if (row.event_type === "invalidation_recorded") {
      const item = knowledgeInvalidationRecordSchema.parse(entity);
      this.db.prepare("INSERT INTO knowledge_invalidations (id, operation_key, created_at, value_json) VALUES (?, ?, ?, ?)")
        .run(item.id, item.operationKey, item.createdAt, JSON.stringify(item));
    }
  }
}
