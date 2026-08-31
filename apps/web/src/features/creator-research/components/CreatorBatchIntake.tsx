import { AlertTriangle, Check, ChevronDown, Database, LoaderCircle, Server, ShieldCheck, UserRound, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { CreatorAcquisitionAdapter, CreatorResearchRun } from "../../../shared/contracts/core";
import { CREATOR_BATCH_LIMIT, parseCreatorBatchDraft } from "../model/creator-batch-intake";

const entryLabels = {
  valid: "可创建", invalid: "需修正", duplicate_in_batch: "本批重复", existing_run: "已有任务"
} as const;

export type CreatorBatchSubmission = {
  name: string | undefined;
  adapter: CreatorAcquisitionAdapter;
  profileUrls: string[];
};

export function CreatorBatchIntake({ runs, submitting, submitError, onSubmit }: {
  runs: CreatorResearchRun[] | null;
  submitting: boolean;
  submitError: string | null;
  onSubmit: (input: CreatorBatchSubmission) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [adapter, setAdapter] = useState<CreatorAcquisitionAdapter>("redfox");
  const [reviewing, setReviewing] = useState(false);
  const draft = useMemo(() => parseCreatorBatchDraft(text, runs), [text, runs]);

  function review(event: FormEvent) {
    event.preventDefault();
    setReviewing(true);
  }

  async function submit() {
    if (!draft.canSubmit) return;
    try {
      await onSubmit({ name: name.trim() || undefined, adapter, profileUrls: draft.entries.flatMap((entry) =>
        (entry.state === "valid" || entry.state === "existing_run") && entry.normalizedUrl ? [entry.normalizedUrl] : []) });
      setText(""); setName(""); setReviewing(false);
    } catch { /* The parent renders the server error next to this form. */ }
  }

  return <form className="batch-intake" onSubmit={review} noValidate>
    <header><div><span>MANUAL CREATOR INTAKE</span><h2>一次指定 1–20 个博主</h2><p>每行一个小红书主页链接，也可以写成“昵称 + 链接”。先在本地检查，再由服务端一次创建整个批次。</p></div>
      <div className="batch-intake__limit"><b>{draft.lineCount}</b><span>/ {CREATOR_BATCH_LIMIT} 行</span></div></header>
    <div className="batch-intake__fields">
      <label><span>批次名称 <small>可选</small></span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：AI 工具赛道第一批" maxLength={80}/></label>
      <label className="batch-intake__urls"><span>博主主页</span><textarea value={text} onChange={(event) => { setText(event.target.value); setReviewing(false); }} rows={7}
        placeholder={"阿柚：https://www.xiaohongshu.com/user/profile/...\nhttps://www.xiaohongshu.com/user/profile/..."} aria-describedby="batch-input-help"/></label>
      <p id="batch-input-help" className="batch-intake__help"><ShieldCheck size={13}/>链接中的查询参数会在预检时清除；已有任务和重复链接不会再次创建。</p>
    </div>
    <details className="batch-intake__advanced"><summary><ChevronDown size={14}/>高级采集方式 <b>{adapter === "redfox" ? "RedFox（默认）" : "Ego Browser"}</b></summary>
      <div className="batch-intake__providers" role="radiogroup" aria-label="采集方式">
        <button type="button" role="radio" aria-checked={adapter === "redfox"} className={adapter === "redfox" ? "is-active" : ""} onClick={() => setAdapter("redfox")}>
          <Server size={16}/><span><b>RedFox</b><small>批量默认，适合公开数据快速建库</small></span></button>
        <button type="button" role="radio" aria-checked={adapter === "ego-browser"} className={adapter === "ego-browser" ? "is-active" : ""} onClick={() => setAdapter("ego-browser")}>
          <UserRound size={16}/><span><b>Ego Browser</b><small>适合少量登录态核验，可能需要人工接管</small></span></button>
      </div>
    </details>
    <div className="batch-intake__counts" aria-live="polite">
      <span><Check size={13}/><b>{draft.validCount}</b> 新建任务</span><span><Database size={13}/><b>{draft.existingCount}</b> 复用任务</span>
      <span><ShieldCheck size={13}/><b>{draft.duplicateCount}</b> 重复</span><span className={draft.invalidCount ? "is-error" : ""}><X size={13}/><b>{draft.invalidCount}</b> 需修正</span>
    </div>
    {draft.overLimit && <p className="batch-intake__error" role="alert"><AlertTriangle size={14}/>一次最多提交 20 个非空行，请拆成多个批次。</p>}
    {reviewing && draft.entries.length > 0 && <div className="batch-preview" aria-label="本地预检结果">
      {draft.entries.map((entry) => <div className={`batch-preview__row batch-preview__row--${entry.state}`} key={`${entry.row}-${entry.raw}`}>
        <span>{String(entry.row).padStart(2, "0")}</span><div><b>{entry.label ?? entry.normalizedUrl ?? entry.raw}</b><small>{entry.message}</small></div><em>{entryLabels[entry.state]}</em>
      </div>)}
    </div>}
    {submitError && <p className="batch-intake__error" role="alert"><AlertTriangle size={14}/>{submitError}</p>}
    <footer><p>{reviewing ? draft.canSubmit ? `确认后将 ${draft.validCount + draft.existingCount} 个博主纳入同一批次。` : "请先修正无效或超量输入。" : "预检不会产生 RedFox 请求或费用。"}</p>
      {!reviewing ? <button type="submit" disabled={draft.lineCount === 0}>检查这批博主</button>
        : <button type="button" disabled={!draft.canSubmit || submitting} onClick={() => void submit()}>{submitting && <LoaderCircle className="spin" size={15}/>}{submitting ? "正在创建批次" : `开始分析 ${draft.validCount + draft.existingCount} 个博主`}</button>}</footer>
  </form>;
}
