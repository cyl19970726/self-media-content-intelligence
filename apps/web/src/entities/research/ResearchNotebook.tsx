import { useState } from "react";
import { Copy, Download, Plus, StickyNote, Trash2 } from "lucide-react";
import { discussionContext, noteKinds, parseNotes, type ResearchNote } from "./notebook";
import "./research-notebook.css";

type Props = { subjectId: string; title: string; sourceUrl?: string };
export function ResearchNotebook(props: Props) {
  return <NotebookSession key={props.subjectId} {...props}/>;
}
function NotebookSession({ subjectId, title, sourceUrl }: Props) {
  const key = `self-media:research-notes:v1:${subjectId}`;
  const [initial] = useState(() => {
    try { return { notes: parseNotes(localStorage.getItem(key)), error: "" }; }
    catch (cause) { return { notes: [] as ResearchNote[], error: cause instanceof Error ? cause.message : "无法读取本地笔记" }; }
  });
  const [notes, setNotes] = useState(initial.notes);
  const [kind, setKind] = useState<ResearchNote["kind"]>("question");
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState(initial.error);
  const [exportText, setExportText] = useState<string | null>(null);
  function save(next: ResearchNote[]) {
    try { localStorage.setItem(key, JSON.stringify(next)); setNotes(next); setMessage("已保存在当前浏览器"); return true; }
    catch { setMessage("保存失败：浏览器存储不可用或已满。请先复制或导出记录。"); return false; }
  }
  function add() {
    if (!draft.trim() || initial.error) return;
    if (save([...notes, { id: crypto.randomUUID(), kind, text: draft.trim(), sourceUrl: window.location.href, createdAt: new Date().toISOString() }])) setDraft("");
  }
  const context = () => discussionContext(title, sourceUrl ?? window.location.href, notes);
  async function copy() {
    const text = context();
    try { await navigator.clipboard.writeText(text); setMessage("已复制，可粘贴到与我的对话中继续研究"); }
    catch { setExportText(text); setMessage("无法访问剪贴板，请复制下方文本"); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([context()], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "研究笔记.md"; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <details className="research-notebook">
    <summary><StickyNote size={18}/><strong>我的研究记录</strong><span>{notes.length ? `${notes.length} 条` : "留下问题，带着来源继续讨论"}</span></summary>
    <div className="research-notebook-body">
      <p>记录自己的问题、判断和创作线索。仅保存在当前浏览器，可复制给我讨论或导出留存。</p>
      <div className="research-note-form">
        <label>记录类型<select value={kind} onChange={event => setKind(event.target.value as ResearchNote["kind"])}>{Object.entries(noteKinds).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>研究记录<textarea value={draft} onChange={event => setDraft(event.target.value)} placeholder="我想弄清楚什么？哪条判断还需要更多证据？" rows={3}/></label>
        <button type="button" disabled={!draft.trim() || Boolean(initial.error)} onClick={add}><Plus size={15}/>保存记录</button>
      </div>
      <ul>{notes.map(note => <li key={note.id}><div><small>{noteKinds[note.kind]}</small><p>{note.text}</p><a href={note.sourceUrl}>回到记录时的位置</a></div><button type="button" aria-label={`删除记录：${note.text.slice(0, 20)}`} onClick={() => save(notes.filter(item => item.id !== note.id))}><Trash2 size={15}/></button></li>)}</ul>
      <div className="research-note-actions"><button type="button" disabled={!notes.length} onClick={() => void copy()}><Copy size={15}/>复制讨论材料</button><button type="button" disabled={!notes.length} onClick={download}><Download size={15}/>导出笔记</button></div>
      {message && <p role="status">{message}</p>}
      {exportText && <textarea aria-label="讨论材料" readOnly value={exportText} rows={8}/>}
    </div>
  </details>;
}
