import type { VideoResearch } from "../../shared/contracts/core";

export function originalReportBlocks(markdown: string) {
  return markdown.replace(/\r\n/g, '\n').split(/(```[^\n]*\n[\s\S]*?\n```)/g)
    .flatMap(part => part.startsWith('```') ? [part] : part.split(/\n\s*\n/)).filter(part => part.trim());
}

export function evaluationReadingLabel(data: VideoResearch) {
  if (data.quality.evaluationState === 'failed' && ['ready', 'verified'].includes(data.quality.aggregateState)) return '当前三部分评估不可用';
  return {verified:'当前评估通过',failed:'当前评估失败',findings:'评估有待解决项',skipped:'当前评估未执行'}[data.quality.evaluationState];
}

