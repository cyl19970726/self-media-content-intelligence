import { AlertTriangle, ExternalLink, LoaderCircle, Plus, Radar, ShieldCheck } from "lucide-react";
import type { CreatorDiscoveryResult, CreatorResearchRun } from "../../../shared/contracts/core";
import { findExistingCreatorRun } from "../model/creator-task-state";

export function CreatorDiscoveryRadar({ discovery, error, discovering, enqueueingId, runs, onDiscover, onEnqueue }: {
  discovery: CreatorDiscoveryResult | null;
  error: string | null;
  discovering: boolean;
  enqueueingId: string | null;
  runs: CreatorResearchRun[] | null;
  onDiscover: () => Promise<void>;
  onEnqueue: (candidate: CreatorDiscoveryResult["candidates"][number]) => Promise<void>;
}) {
  return <details className="creator-discovery">
    <summary><div><span>REDFOX DISCOVERY RADAR</span><h2>还没有名单？发现更多 AI 博主</h2><p>自动发现只是候选入口；用户直接指定与候选最终进入同一个任务账本。</p></div><Radar size={18}/></summary>
    <div className="creator-discovery__body">
      <button className="creator-discovery__scan" type="button" onClick={() => void onDiscover()} disabled={discovering}>
        {discovering ? <LoaderCircle className="spin" size={15}/> : <Radar size={15}/>} {discovering ? "正在扫描" : discovery ? "重新扫描" : "扫描 AI 赛道"}
      </button>
      {error && <p className="form-error" role="alert"><AlertTriangle size={14}/>{error}</p>}
      {discovery && <><div className="creator-discovery__ledger"><span>{discovery.keywords.join(" / ")}</span><b>{discovery.requestsUsed} 次请求</b><b>估算 ¥{discovery.estimatedCostCny.toFixed(2)}</b><time>{new Date(discovery.capturedAt).toLocaleString("zh-CN")}</time></div>
        <div className="creator-candidate-list">{discovery.candidates.map((candidate, index) => {
          const duplicate = findExistingCreatorRun(runs, candidate.profileUrl);
          return <article key={candidate.creatorId}><span className="creator-candidate__rank">{String(index + 1).padStart(2, "0")}</span>
            <div><h3>{candidate.creatorName}</h3><p>{candidate.matchedKeywords.join(" · ")}</p><small>{candidate.observedNotes} 篇样本 · {candidate.videoNotes} 篇视频 · {candidate.observedLikes.toLocaleString("zh-CN")} 赞</small></div>
            <strong>{candidate.score.toFixed(1)}<small>证据分</small></strong><nav><a href={candidate.profileUrl} target="_blank" rel="noreferrer"><ExternalLink size={13}/>主页</a>
              <button type="button" disabled={Boolean(duplicate) || enqueueingId === candidate.creatorId} onClick={() => void onEnqueue(candidate)}>
                {enqueueingId === candidate.creatorId ? <LoaderCircle className="spin" size={13}/> : duplicate ? <ShieldCheck size={13}/> : <Plus size={13}/>} {duplicate ? "已在队列" : "加入研究"}
              </button></nav></article>;
        })}</div><p className="creator-discovery__boundary"><AlertTriangle size={14}/>{discovery.limitations[0]}</p></>}
    </div>
  </details>;
}
