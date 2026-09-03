import fs from "node:fs";
import path from "node:path";

type Carrier = {
  id?: string;
  available?: boolean;
  inspected?: boolean;
  inspectionStatus?: "absent" | "unchecked" | "checked_readable" | "checked_unreadable";
  inspectionRationale?: string;
  discoveredIn?: string[];
  [key: string]: unknown;
};

type EvidencePack = {
  transcript?: { origin?: string; cues?: Array<Record<string, unknown>> };
};

type Probe = {
  carrierSweep?: Array<{ id?: string }>;
  informationCarriers?: Carrier[];
};

type Reconstruction = {
  transcript?: { origin?: string; cues?: Array<Record<string, unknown>> };
  knowledgeUnits?: Array<{
    id?: string;
    timeRange?: { start?: number; end?: number };
    evidence?: Array<{ refType?: string; ref?: string; [key: string]: unknown }>;
  }>;
  relations?: Array<{
    evidence?: Array<{ refType?: string; ref?: string; [key: string]: unknown }>;
    [key: string]: unknown;
  }>;
  derivedSources?: Array<{ id?: string; [key: string]: unknown }>;
  coverageMatrix?: {
    channels?: Carrier[];
    cueAccountability?: Array<{
      cueId?: string;
      disposition?: "knowledge" | "context" | "nonsemantic" | "uncertain";
      unitIds?: string[];
      rationale?: string;
      assignmentSource?: "builder_override" | "host_time_overlap" | "host_unresolved";
      [key: string]: unknown;
    }>;
    uncheckedChannels?: string[];
    [key: string]: unknown;
  };
  metaGate?: {
    questionId?: string;
    question?: string;
    pass?: boolean;
    uncheckedChannels?: string[];
    overlookedMeaningChanges?: string[];
    overlookedRelationships?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type HostAssemblyReport = {
  transcriptCuesRestored: number;
  cueAccountabilityRowsRestored: number;
  cueAccountabilityRowsRepaired: number;
  cueAccountabilityRowsHostOwned: number;
  invalidAbsoluteSourceRefsRemoved: number;
  carriersNormalized: number;
  carrierRationalesSynchronized: number;
  probeWarnings: string[];
};

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function inspectionStatus(carrier: Carrier): NonNullable<Carrier["inspectionStatus"]> {
  return carrier.inspectionStatus ?? (!carrier.available ? "absent" : carrier.inspected ? "checked_readable" : "unchecked");
}

function normalizeCarrier(carrier: Carrier): Carrier {
  const status = inspectionStatus(carrier);
  if (status === "absent") return { ...carrier, available: false, inspected: carrier.inspected === true, inspectionStatus: status };
  if (status === "unchecked") return { ...carrier, available: true, inspected: false, inspectionStatus: status };
  return { ...carrier, available: true, inspected: true, inspectionStatus: status };
}

function isClosed(carrier: Carrier): boolean {
  return ["checked_readable", "checked_unreadable"].includes(inspectionStatus(carrier));
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function overlappingUnitIds(
  cue: Record<string, unknown>,
  units: NonNullable<Reconstruction["knowledgeUnits"]>
): string[] {
  const cueStart = finiteNumber(cue.start);
  const cueEnd = finiteNumber(cue.end) ?? cueStart;
  if (cueStart === null || cueEnd === null) return [];
  const candidates = units.filter((unit) => {
    const unitStart = finiteNumber(unit.timeRange?.start);
    const unitEnd = finiteNumber(unit.timeRange?.end);
    return Boolean(unit.id) && unitStart !== null && unitEnd !== null && cueEnd > unitStart && cueStart < unitEnd;
  }).map((unit) => ({
    id: unit.id!,
    span: Number(unit.timeRange!.end) - Number(unit.timeRange!.start)
  })).filter((unit) => Number.isFinite(unit.span) && unit.span >= 0)
    .sort((left, right) => left.span - right.span || left.id.localeCompare(right.id));
  const smallestSpan = candidates[0]?.span;
  return smallestSpan === undefined ? [] : candidates
    .filter((unit) => Math.abs(unit.span - smallestSpan) < 0.001)
    .map((unit) => unit.id);
}

export function assembleHostOwnedReconstruction(outputDir: string): HostAssemblyReport {
  const evidencePath = path.join(outputDir, "evidence/evidence-pack.json");
  const probePath = path.join(outputDir, "probe.json");
  const reconstructionPath = path.join(outputDir, "reconstruction.json");
  const evidence = readJson<EvidencePack>(evidencePath);
  const probe = readJson<Probe>(probePath);
  const reconstruction = readJson<Reconstruction>(reconstructionPath);
  const frozenCues = evidence.transcript?.cues ?? [];
  const reconstructionCarriers = (reconstruction.coverageMatrix?.channels ?? []).map(normalizeCarrier);
  const reconstructionCarriersById = new Map(reconstructionCarriers
    .filter((carrier): carrier is Carrier & { id: string } => Boolean(carrier.id))
    .map((carrier) => [carrier.id, carrier]));
  let carrierRationalesSynchronized = 0;
  const probeCarriers = (probe.informationCarriers ?? []).map(normalizeCarrier).map((carrier) => {
    const reconstructionCarrier = carrier.id ? reconstructionCarriersById.get(carrier.id) : undefined;
    if (carrier.inspectionRationale?.trim() || !reconstructionCarrier?.inspectionRationale?.trim()) return carrier;
    carrierRationalesSynchronized += 1;
    return {
      ...carrier,
      inspectionStatus: reconstructionCarrier.inspectionStatus,
      available: reconstructionCarrier.available,
      inspected: reconstructionCarrier.inspected,
      inspectionRationale: reconstructionCarrier.inspectionRationale
    };
  });
  const uncheckedChannels = reconstructionCarriers
    .filter((carrier) => carrier.available && !isClosed(carrier))
    .map((carrier) => carrier.id)
    .filter((id): id is string => Boolean(id));
  const meta = reconstruction.metaGate ?? {};
  const overlookedMeaningChanges = meta.overlookedMeaningChanges ?? [];
  const overlookedRelationships = meta.overlookedRelationships ?? [];
  const sweepIds = new Set((probe.carrierSweep ?? []).map((item) => item.id).filter(Boolean));
  const probeWarnings = probeCarriers.flatMap((carrier) =>
    !carrier.discoveredIn?.length || carrier.discoveredIn.some((id) => !sweepIds.has(id))
      ? [`probe_carrier_sweep_trace:${carrier.id ?? "unknown"}`]
      : []);
  const existingAccountability = new Map((reconstruction.coverageMatrix?.cueAccountability ?? [])
    .filter((row): row is typeof row & { cueId: string } => Boolean(row.cueId))
    .map((row) => [row.cueId, row]));
  let cueAccountabilityRowsRestored = 0;
  let cueAccountabilityRowsRepaired = 0;
  const cueAccountability = frozenCues.flatMap((cue) => {
    const cueId = typeof cue.id === "string" ? cue.id : null;
    if (!cueId) return [];
    const existing = existingAccountability.get(cueId);
    const existingWasHostOwned = existing?.assignmentSource?.startsWith("host_") === true
      || existing?.rationale?.startsWith("Host ") === true;
    const existingUnitIds = existing?.unitIds ?? [];
    const isSemanticException = existing?.disposition === "nonsemantic" || existing?.disposition === "uncertain";
    const hasCompleteSemanticMapping = (existing?.disposition === "knowledge" || existing?.disposition === "context")
      && existingUnitIds.length > 0;
    if (!existingWasHostOwned && existing?.rationale?.trim() && (isSemanticException || hasCompleteSemanticMapping)) {
      return [{ ...existing, cueId, unitIds: existing.unitIds ?? [] }];
    }
    const repairsInvalidSemanticRow = Boolean(existing?.rationale?.trim())
      && (existing?.disposition === "knowledge" || existing?.disposition === "context")
      && existingUnitIds.length === 0;
    if (repairsInvalidSemanticRow) cueAccountabilityRowsRepaired += 1;
    else cueAccountabilityRowsRestored += 1;
    const unitIds = !existingWasHostOwned && existingUnitIds.length > 0
      ? existingUnitIds
      : overlappingUnitIds(cue, reconstruction.knowledgeUnits ?? []);
    return [{
      ...(existing ?? {}),
      cueId,
      disposition: unitIds.length > 0
        ? existing?.disposition === "context" ? "context" as const : "knowledge" as const
        : "uncertain" as const,
      unitIds,
      rationale: unitIds.length > 0
        ? repairsInvalidSemanticRow
          ? `Host 按冻结 Cue 与知识单元时间范围补全 Builder 的空回链；保留原分类 ${existing?.disposition}。`
          : "Host 按冻结 Cue 与知识单元时间范围生成机械候选回链。"
        : "Host 已登记该冻结 Cue；没有知识单元时间范围与其重叠，语义归属保持未知。",
      assignmentSource: unitIds.length > 0 ? "host_time_overlap" as const : "host_unresolved" as const
    }];
  });
  const derivedSourceIds = new Set((reconstruction.derivedSources ?? [])
    .map((source) => source.id).filter((id): id is string => Boolean(id)));
  let invalidAbsoluteSourceRefsRemoved = 0;
  const removeInvalidAbsoluteSourceRefs = (
    evidence: Array<{ refType?: string; ref?: string; [key: string]: unknown }> | undefined
  ) => (evidence ?? []).filter((reference) => {
    const invalid = reference.refType === "source" && typeof reference.ref === "string" &&
      path.isAbsolute(reference.ref) && !derivedSourceIds.has(reference.ref);
    if (invalid) invalidAbsoluteSourceRefsRemoved += 1;
    return !invalid;
  });
  for (const unit of reconstruction.knowledgeUnits ?? []) {
    unit.evidence = removeInvalidAbsoluteSourceRefs(unit.evidence);
  }
  for (const relation of reconstruction.relations ?? []) {
    relation.evidence = removeInvalidAbsoluteSourceRefs(relation.evidence);
  }

  probe.informationCarriers = probeCarriers;
  reconstruction.transcript = {
    origin: reconstruction.transcript?.origin ?? evidence.transcript?.origin ?? "frozen_evidence_pack",
    cues: frozenCues.map((cue) => ({
      id: cue.id,
      start: cue.start,
      end: cue.end,
      text: cue.text,
      representativeFrame: cue.representativeFrame,
      overlappingShots: cue.overlappingShots
    }))
  };
  reconstruction.coverageMatrix = {
    ...(reconstruction.coverageMatrix ?? {}),
    channels: reconstructionCarriers,
    cueAccountability,
    uncheckedChannels
  };
  reconstruction.metaGate = {
    ...meta,
    questionId: "uncovered_information_audit",
    question: meta.question?.trim() || "原视频还有哪种信息载体、意义变化或知识关系根本没被协议检查？",
    uncheckedChannels,
    overlookedMeaningChanges,
    overlookedRelationships,
    pass: uncheckedChannels.length === 0 && overlookedMeaningChanges.length === 0 && overlookedRelationships.length === 0
  };
  fs.writeFileSync(probePath, `${JSON.stringify(probe, null, 2)}\n`, "utf8");
  fs.writeFileSync(reconstructionPath, `${JSON.stringify(reconstruction, null, 2)}\n`, "utf8");
  return {
    transcriptCuesRestored: frozenCues.length,
    cueAccountabilityRowsRestored,
    cueAccountabilityRowsRepaired,
    cueAccountabilityRowsHostOwned: cueAccountability.filter((row) => row.assignmentSource?.startsWith("host_")).length,
    invalidAbsoluteSourceRefsRemoved,
    carriersNormalized: probeCarriers.length + reconstructionCarriers.length,
    carrierRationalesSynchronized,
    probeWarnings
  };
}
