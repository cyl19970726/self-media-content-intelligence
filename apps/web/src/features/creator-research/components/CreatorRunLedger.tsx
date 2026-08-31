import { Database, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-react";
import type { CreatorResearchRun, CreatorRunOperation, CreatorRunOperationAction } from "../../../shared/contracts/core";
import { CreatorRunRow } from "./CreatorRunRow";

export function CreatorRunLedger({ runs, operations, operatingId, onOperate, onRefresh }: {
  runs: CreatorResearchRun[] | null; operations: CreatorRunOperation[] | null; operatingId: string | null;
  onOperate: (id: string, action: CreatorRunOperationAction) => Promise<void>; onRefresh: () => Promise<void>;
}) {
  return <details className="research-queue"><summary><div><span>ALL RESEARCH RUNS</span><h2>全部单博主任务</h2><p>批次之外的历史任务也保留在同一账本中。</p></div></summary>
    <div className="research-queue__body"><div className="research-queue__toolbar"><span><ShieldCheck size={14}/>恢复动作只重试未通过部分，不覆盖已有证据。</span>
      <button className="text-button" type="button" onClick={() => void onRefresh()}><RefreshCw size={13}/>刷新状态</button></div>
      {runs === null ? <div className="page-loader"><LoaderCircle className="spin"/><p>正在读取任务账本</p></div>
        : runs.length > 0 ? <div className="creator-run-list">{runs.map((run) => <CreatorRunRow key={run.id} run={run}
          operation={operations?.find((item) => item.runId === run.id)} busy={operatingId === run.id} onOperate={onOperate}/>)}</div>
          : <div className="rail-empty"><Database size={20}/>提交第一个分析批次后，任务会持续保留在这里。</div>}</div>
  </details>;
}
