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
  coverageMatrix?: { channels?: Carrier[]; uncheckedChannels?: string[]; [key: string]: unknown };
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
    carriersNormalized: probeCarriers.length + reconstructionCarriers.length,
    carrierRationalesSynchronized,
    probeWarnings
  };
}
