import type { VideoResearch } from "../../shared/contracts/core";

export type ResearchFrame = VideoResearch["frames"]["dense"][number];

export function timestamp(value: number | null) {
  if (value === null) return "—";
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}

export function metric(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function framesForRefs(data: VideoResearch, refs: string[], limit = 2): ResearchFrame[] {
  const byId = new Map([...data.frames.dense, ...data.frames.sparse].map((frame) => [frame.id, frame]));
  return refs.map((ref) => byId.get(ref)).filter((frame): frame is ResearchFrame => Boolean(frame)).slice(0, limit);
}

export function firstFrameForRange(data: VideoResearch, refs: string[], start: number | null, end: number | null): ResearchFrame | null {
  const direct = framesForRefs(data, refs, 1)[0];
  if (direct) return direct;
  if (start === null && end === null) return null;
  const center = start !== null && end !== null ? (start + end) / 2 : start ?? end ?? 0;
  return [...data.frames.dense, ...data.frames.sparse]
    .filter((frame) => frame.time !== null)
    .sort((left, right) => Math.abs((left.time ?? 0) - center) - Math.abs((right.time ?? 0) - center))[0] ?? null;
}
