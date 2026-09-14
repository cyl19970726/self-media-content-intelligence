import type { VideoResearch } from "../../shared/contracts/core";

export function contentRangeGaps(blocks: VideoResearch["contentBlocks"], duration: number | null) {
  const ranges = blocks.filter(block => block.start !== null && block.end !== null).map(block => ({ start: block.start!, end: block.end! }));
  const outOfOrder = ranges.some((range, index) => index > 0 && range.start < ranges[index - 1]!.start);
  let cursor = 0;
  const gaps: Array<{ start: number; end: number }> = [];
  for (const range of [...ranges].sort((a, b) => a.start - b.start)) {
    if (range.start - cursor > 0.5) gaps.push({ start: cursor, end: range.start });
    cursor = Math.max(cursor, range.end);
  }
  if (duration !== null && duration - cursor > 0.5) gaps.push({ start: cursor, end: duration });
  return { outOfOrder, gaps };
}
