import { useState } from "react";
import type { CSSProperties } from "react";
import type { VideoResearch } from "../../shared/contracts/core";

type ContentBlock = VideoResearch["contentBlocks"][number];

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
  return <div className={className}>{block.media.map((item) => <figure id={`evidence-${item.ref}`} key={item.ref}>
    <EvidenceImage item={item}/>
    <figcaption><div><b>{item.role}</b><span>{item.focus}</span><small>证明：{item.proves}</small><small>不能证明：{item.cannotProve}</small></div><time>{timestamp(item.time)}</time></figcaption>
  </figure>)}</div>;
}

export function ContentRestorationReport({ blocks }: { blocks: ContentBlock[] }) {
  return <div className="content-restoration-report">{blocks.map((block) => <article key={block.id} className={`content-block content-block--${block.type}`}>
    <header><span>{timestamp(block.start)}–{timestamp(block.end)}</span><h3>{block.title}</h3></header>
    <p>{block.body}</p>
    <EvidenceMedia block={block}/>
    {block.steps.length > 0 && <ol className="content-operation-sequence">{block.steps.map((step, index) => <li key={`${step.label}-${index}`}>
      <div><b>{step.label}</b><p>{step.description}</p></div>
      {step.media.length > 0 && <div className="content-step-media">{step.media.map((item) => <figure id={`evidence-${item.ref}`} key={item.ref}><img src={item.src} loading="lazy" alt={item.label}/><figcaption>{item.label}</figcaption></figure>)}</div>}
    </li>)}</ol>}
    {block.boundary && <aside><b>证据边界</b><p>{block.boundary}</p></aside>}
  </article>)}</div>;
}
