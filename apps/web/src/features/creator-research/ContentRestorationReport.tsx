import { DepthEvidence } from "./DepthReports";
import { useState } from "react";
import type { CSSProperties } from "react";
import type { VideoResearch } from "../../shared/contracts/core";

type ContentBlock = VideoResearch["contentBlocks"][number];

const roleLabels: Record<string, string> = {
  key_frame: "关键画面", evidence: "结论证据", before: "前状态（报告标注）", during: "中间状态（报告标注）", after: "后状态（报告标注）",
  detail: "局部细节", detail_crop: "局部裁切", sequence: "连续画面", context: "上下文"
};

function timestamp(value: number | null) {
  if (value === null) return "—";
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
}

function EvidenceImage({ item }: { item: ContentBlock["media"][number] }) {
  const [sourceRatio, setSourceRatio] = useState<number | null>(null);
  if (!item.crop) return <img src={item.src} loading="lazy" alt={item.label}/>;
  const { x, y, width, height } = item.crop;
  const style = {
    "--crop-x": x,
    "--crop-y": y,
    "--crop-width": width,
    "--crop-height": height,
    aspectRatio: sourceRatio ? `${sourceRatio * width / height}` : undefined
  } as CSSProperties;
  return <div className="content-evidence-crop" style={style} aria-label={`局部裁切：${item.focus}`}>
    <img src={item.src} loading="lazy" alt={item.label} onLoad={(event) => {
      const image = event.currentTarget;
      if (image.naturalHeight) setSourceRatio(image.naturalWidth / image.naturalHeight);
    }}/>
  </div>;
}

function EvidenceMedia({ block }: { block: ContentBlock }) {
  if (!block.media.length) return null;
  const className = block.type === "before_after" ? "content-evidence content-evidence--paired" : "content-evidence";
  return <div className={className}>{block.media.map((item) => <figure id={`evidence-${block.id}-${item.ref}`} key={item.ref}>
    <a href={item.src} target="_blank" rel="noreferrer" aria-label={`打开原图：${item.label}`}><EvidenceImage item={item}/></a>
    <figcaption><div><b>{roleLabels[item.role] ?? "视觉证据"}</b><span>{item.focus}</span>{item.proves || item.cannotProve ? <><small>画面支持：{item.proves || "未产出"}</small><small>不能据此证明：{item.cannotProve || "未产出"}</small></> : <small>该帧未产出单独的证明范围说明。</small>}</div><time>{timestamp(item.time)}</time></figcaption>
  </figure>)}</div>;
}

function UnresolvedVisualEvidence({ visual, data }: { visual: ContentBlock["unresolvedVisuals"][number]; data?: VideoResearch }) {
  const shot = data?.evidenceIndex.find(item => item.id === visual.ref && item.kind === "shot" && item.artifactRef);
  return <aside>
    {!shot && <b>{visual.ref} · 图片引用未解析</b>}
    <p>{roleLabels[visual.role] ?? visual.role}：{visual.focus}</p>
    <p>报告标注的支持范围：{visual.proves}</p><p>报告标注的证明边界：{visual.cannotProve}</p>
    {visual.crop && <p>原始裁切范围（归一化）：x {visual.crop.x}，y {visual.crop.y}，宽 {visual.crop.width}，高 {visual.crop.height}</p>}
    {shot?.artifactRef && <figure>
      <a href={shot.artifactRef} target="_blank" rel="noreferrer"><img src={shot.artifactRef} loading="lazy" alt={`${visual.focus} · 镜头代表帧`}/></a>
      <figcaption><span>镜头代表帧</span><time>{shot.label}</time></figcaption>
    </figure>}
  </aside>;
}

type ContentBodySegment = { type: "prose"; text: string } | { type: "table"; header: string[]; rows: string[][] };

function tableCells(line: string) {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return null;
  const cells = trimmed.replace(/^\||\|$/g, "").split("|").map(cell => cell.trim());
  return cells.length > 1 && cells.every(Boolean) ? cells : null;
}

function isDividerRow(cells: string[], columnCount: number) {
  return cells.length === columnCount && cells.every(cell => /^:?-{3,}:?$/.test(cell));
}

function contentBodySegments(body: string): ContentBodySegment[] {
  const lines = body.split("\n");
  const segments: ContentBodySegment[] = [];
  let prose: string[] = [];
  const flushProse = () => {
    if (prose.length) segments.push({ type: "prose", text: prose.join("\n") });
    prose = [];
  };

  for (let index = 0; index < lines.length;) {
    const header = tableCells(lines[index] ?? "");
    const divider = tableCells(lines[index + 1] ?? "");
    if (!header || !divider || !isDividerRow(divider, header.length)) {
      prose.push(lines[index] ?? "");
      index += 1;
      continue;
    }

    const rows: string[][] = [];
    let cursor = index + 2;
    while (cursor < lines.length) {
      const row = tableCells(lines[cursor] ?? "");
      if (!row || row.length !== header.length) break;
      rows.push(row);
      cursor += 1;
    }
    if (!rows.length) {
      prose.push(lines[index] ?? "", lines[index + 1] ?? "");
      index += 2;
      continue;
    }
    flushProse();
    segments.push({ type: "table", header, rows });
    index = cursor;
  }
  flushProse();
  return segments;
}

function ContentBlockBody({ body }: { body: string }) {
  return <>{contentBodySegments(body).map((segment, index) => segment.type === "prose"
    ? <p key={`prose-${index}`}>{segment.text}</p>
    : <div className="content-markdown-table" key={`table-${index}`} tabIndex={0} aria-label="报告表格，可横向滚动">
      <table>
        <thead><tr>{segment.header.map((cell, cellIndex) => <th key={`${cell}-${cellIndex}`} scope="col">{cell}</th>)}</tr></thead>
        <tbody>{segment.rows.map((row, rowIndex) => <tr key={`row-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )}</>;
}

export function ContentRestorationReport({ blocks, data }: { blocks: ContentBlock[]; data?: VideoResearch }) {
  return <div className="content-restoration-report">{blocks.map((block) => <article id={`content-${block.id}`} key={block.id} className={`content-block content-block--${block.type}`}>
    <header><span>{timestamp(block.start)}–{timestamp(block.end)}</span><h3>{block.title}</h3></header>
    <ContentBlockBody body={block.body}/>
    <EvidenceMedia block={block}/>
    {block.unresolvedVisuals?.map((visual, index) => <UnresolvedVisualEvidence key={`${visual.ref}-${index}`} visual={visual} data={data}/>)}
    {data && <DepthEvidence data={data} refs={block.evidenceRefs.filter(ref => ![...block.media, ...block.steps.flatMap(step => step.media)].some(item => item.ref === ref))}/>}
    {block.steps.length > 0 && <ol className="content-operation-sequence">{block.steps.map((step, index) => <li key={`${step.label}-${index}`}>
      <div><b>{step.label}</b><p>{step.description}</p></div>
      {!!step.unresolvedFrameRefs?.length && <p>步骤画面引用未解析：{step.unresolvedFrameRefs.join("、")}</p>}
      {step.media.length > 0 && <div className="content-step-media">{step.media.map((item) => <figure key={item.ref}><a href={item.src} target="_blank" rel="noreferrer"><img src={item.src} loading="lazy" alt={`${step.label}：${step.description}`}/></a><figcaption><span>步骤证据</span><time>{timestamp(item.time)}</time></figcaption></figure>)}</div>}
    </li>)}</ol>}
    {block.boundary && <aside><b>证据边界</b><p>{block.boundary}</p></aside>}
  </article>)}</div>;
}
