import { Database, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import type { CreatorResearchRun, CreatorRunOperation, CreatorRunOperationAction } from "../../../shared/contracts/core";
import { CreatorRunRow } from "./CreatorRunRow";

export function CreatorRunLedger({ runs, operations, operatingId, onOperate, onRefresh }: {
  runs: CreatorResearchRun[] | null; operations: CreatorRunOperation[] | null; operatingId: string | null;
  onOperate: (id: string, action: CreatorRunOperationAction) => Promise<void>; onRefresh: () => Promise<void>;
}) {
  const runById = new Map((runs ?? []).map((run) => [run.id, run]));
  const canonicalOperations = operations?.filter((operation) => operation.authorityState === "canonical") ?? [];
  const grouped = canonicalOperations.map((canonical) => ({
    canonical,
    candidates: operations?.filter((operation) => operation.creatorKey === canonical.creatorKey && operation.authorityState === "candidate") ?? [],
    history: operations?.filter((operation) => operation.creatorKey === canonical.creatorKey && operation.authorityState === "superseded") ?? []
  }));
  return <details className="research-queue"><summary><div><span>CREATOR AUTHORITY LEDGER</span><h2>每个博主，一个权威状态</h2><p>刷新候选不会覆盖 last-good；历史 run 保留证据，但不再与当前档案竞争。</p></div></summary>
    <div className="research-queue__body"><div className="research-queue__toolbar"><span><ShieldCheck size={14}/>恢复动作只重试未通过部分，不覆盖已有证据。</span>
      <button className="text-button" type="button" onClick={() => void onRefresh()}><RefreshCw size={13}/>刷新状态</button></div>
      {runs === null ? <div className="page-loader"><LoaderCircle className="spin"/><p>正在读取任务账本</p></div>
        : grouped.length > 0 ? <div className="creator-run-groups">{grouped.map((group) => {
          const canonicalRun = runById.get(group.canonical.runId);
          if (!canonicalRun) return null;
          return <section className="creator-run-group" key={group.canonical.creatorKey}>
            <header><div><span>CANONICAL CREATOR</span><b>{canonicalRun.creatorName ?? "待识别博主"}</b></div><p>{group.candidates.length ? `${group.candidates.length} 个刷新候选不影响当前可用版本` : "当前没有竞争中的刷新版本"}</p></header>
            <CreatorRunRow run={canonicalRun} operation={group.canonical} busy={operatingId === canonicalRun.id} onOperate={onOperate}/>
            {group.candidates.map((operation) => { const candidate = runById.get(operation.runId); return candidate ? <CreatorRunRow key={candidate.id} run={candidate} operation={operation} busy={operatingId === candidate.id} onOperate={onOperate}/> : null; })}
            {group.history.length > 0 && <details className="creator-run-history"><summary>查看 {group.history.length} 个已被替代的历史 run</summary><div>{group.history.map((operation) => { const history = runById.get(operation.runId); return history ? <CreatorRunRow key={history.id} run={history} operation={operation} busy={operatingId === history.id} onOperate={onOperate}/> : null; })}</div></details>}
          </section>;
        })}</div>
          : runs.length > 0 ? <div className="creator-run-list">{runs.map((run) => <CreatorRunRow key={run.id} run={run}
            operation={operations?.find((item) => item.runId === run.id)} busy={operatingId === run.id} onOperate={onOperate}/>)}</div>
          : <div className="rail-empty"><Database size={20}/>提交第一个分析批次后，任务会持续保留在这里。</div>}</div>
  </details>;
}
