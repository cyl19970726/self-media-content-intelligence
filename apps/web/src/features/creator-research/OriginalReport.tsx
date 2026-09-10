import { originalReportBlocks } from "./original-report-utils";
import { Fragment, type ReactNode } from "react";
import type { VideoResearch } from "../../shared/contracts/core";
import { DepthEvidence } from "./DepthReports";

function inline(text: string, data: VideoResearch): ReactNode[] {
  return text.split(/(`[^`\n]+`|\*\*[^*\n]+\*\*|\[[^\]\n]+\]\([^\s)]+\))/g).map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index}>{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    const href = link ? data.originalReportMedia?.[link[2]!] ?? link[2] : null;
    if (link && href && /^(https?:\/\/|\/(?:research|artifacts)\/)/.test(href)) return <a key={index} href={href} target="_blank" rel="noreferrer">{link[1]}</a>;
    return part;
  });
}

/** Reading-only presentation: no heading rewriting, summary, or transcript removal. */
export function OriginalReport({ markdown, data }: { markdown: string; data: VideoResearch }) {
  return <div className="original-report">{originalReportBlocks(markdown).map((block, index) => {
    const heading = block.match(/^(#{1,6})\s+([^\n]+)\s*$/);
    if (heading) return heading[1]!.length < 3
      ? <h3 key={index} id={`original-section-${index}`}>{inline(heading[2]!, data)}</h3>
      : <h4 key={index} id={`original-section-${index}`}>{inline(heading[2]!, data)}</h4>;
    if (block.startsWith('```')) return <pre key={index}><code>{block.replace(/^```[^\n]*\n/, '').replace(/\n```$/, '')}</code></pre>;
    if (/^\|/m.test(block)) {
      const rows = block.split('\n').filter(line => !/^\s*\|?\s*:?-+/.test(line));
      return <div className="original-report-table" key={index}><table><tbody>{rows.map((line, rowIndex) => <tr key={rowIndex}>{line.replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((cell, cellIndex) => rowIndex === 0 ? <th key={cellIndex}>{inline(cell, data)}</th> : <td key={cellIndex}>{inline(cell, data)}</td>)}</tr>)}</tbody></table></div>;
    }
    const refs = [...new Set(block.replace(/!?\[[^\]]*\]\([^\s)]+\)/g, '').match(/\b(?:TARGET|HIRES|CUE|SHOT|FRAME|ACT|DENSE|SPARSE)-[A-Za-z0-9-]+\b/g) ?? [])];
    const parts = block.split(/(!\[[^\]]*\]\([^\s)]+\))/g);
    return <Fragment key={index}>{parts.filter(Boolean).map((part, partIndex) => {
      const image = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (image) {
        const src = data.originalReportMedia?.[image[2]!];
        return src ? <figure key={partIndex}><a href={src} target="_blank" rel="noreferrer"><img src={src} alt={image[1]} loading="lazy"/></a><figcaption>{image[1]}</figcaption></figure>
          : <p className="original-report-unresolved" key={partIndex}>{part}<br/>图片来源未解析</p>;
      }
      const lines = part.split('\n');
      if (lines.every(line => /^[-*] /.test(line))) return <ul key={partIndex}>{lines.map((line, i) => <li key={i}>{inline(line.slice(2), data)}</li>)}</ul>;
      if (lines.every(line => /^\d+\. /.test(line))) return <ol key={partIndex}>{lines.map((line, i) => <li key={i} value={Number.parseInt(line)}>{inline(line.replace(/^\d+\. /, ''), data)}</li>)}</ol>;
      return part.startsWith('> ') ? <blockquote key={partIndex}>{inline(part.replace(/^> ?/gm, ''), data)}</blockquote> : <p key={partIndex}>{inline(part, data)}</p>;
    })}{refs.length > 0 && <DepthEvidence data={data} refs={refs}/>}</Fragment>;
  })}</div>;
}
