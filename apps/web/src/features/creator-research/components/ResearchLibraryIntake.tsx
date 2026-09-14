import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { CreatorResearchRun } from "../../../shared/contracts/core";
import { findExistingCreatorRun, validateCreatorProfileUrl } from "../model/creator-task-state";

export function ResearchLibraryIntake({ runs, creating, error, onAdd }: { runs: CreatorResearchRun[] | null; creating: boolean; error: string | null; onAdd: (profileUrl: string) => Promise<void> }) {
  const [url, setUrl] = useState("");
  const validation = url.trim() ? validateCreatorProfileUrl(url) : null;
  const existing = validation?.valid ? findExistingCreatorRun(runs, validation.normalizedUrl) : null;
  async function submit(event: FormEvent) { event.preventDefault(); if (!validation?.valid || existing) return; try { await onAdd(validation.normalizedUrl); setUrl(""); } catch { /* Parent presents the error. */ } }
  const href = existing ? `/creators/${encodeURIComponent(existing.canonicalSlug ?? existing.creatorId ?? existing.id)}` : null;
  return <form className="research-intake" onSubmit={(event) => void submit(event)} noValidate><label htmlFor="research-library-url">添加博主</label><div><input id="research-library-url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="粘贴小红书主页链接"/><button type="submit" disabled={!validation?.valid || Boolean(existing) || creating}>{creating ? <LoaderCircle className="spin" size={15}/> : "添加"}<ArrowRight size={15}/></button></div><p>{existing && href ? <Link to={href}><CheckCircle2 size={14}/>已有任务，打开继续查看</Link> : validation && !validation.valid ? validation.message : error ?? "使用 RedFox 采集公开资料；添加后会出现在分析进度中。"}</p></form>;
}
