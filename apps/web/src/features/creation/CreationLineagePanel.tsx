import { useEffect, useMemo, useState } from "react";
import { Check, CircleDashed, FileCheck2, FlaskConical, GitBranch, ShieldAlert } from "lucide-react";
import { getContentPackageLineage } from "../../shared/api/client";
import type { PublicationRun } from "../../shared/contracts/creation";
import type { ContentPackageLineage } from "../../shared/contracts/content-lineage";

const publicationComplete = new Set<PublicationRun["status"]>(["published", "draft_saved"]);
const practiceComplete = new Set(["promoted", "completed_no_promotion", "blocked", "invalidated"]);

function StateMark({ complete }: { complete: boolean }) {
  return complete ? <Check size={13}/> : <CircleDashed size={13}/>;
}

export function CreationLineagePanel({ run }: { run: PublicationRun }) {
  const [lineage, setLineage] = useState<ContentPackageLineage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!run.contentPackageSnapshotId) { setLineage(null); return; }
    void getContentPackageLineage(run.variant.packageId, run.contentPackageSnapshotId)
      .then((value) => { setLineage(value); setError(null); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "Lineage 读取失败"));
  }, [run.contentPackageSnapshotId, run.id, run.updatedAt, run.variant.packageId]);

  const validations = useMemo(() => lineage?.publications
    .find((item) => item.run.id === run.id)?.validations ?? [], [lineage, run.id]);

  if (error) return <div className="lineage-error"><ShieldAlert size={14}/>{error}</div>;
  if (!lineage) return null;

  const stages = [
    { label: "知识", value: `${lineage.bindings.length} 个固定 revision`, complete: lineage.bindings.length > 0 && lineage.bindings.every((item) => item.resolution !== "missing" && item.resolution !== "invalidated") },
    { label: "假设", value: `${lineage.hypotheses.length} 条预先声明`, complete: lineage.hypotheses.length > 0 },
    { label: "版本", value: `S${lineage.snapshot.sequence} · V${run.variantRevision}`, complete: lineage.snapshot.status === "frozen" },
    { label: "执行", value: run.receipt ? run.receipt.platformState : run.status, complete: publicationComplete.has(run.status) && Boolean(run.receipt) },
    { label: "学习", value: validations.length === 0 ? "等待结果" : `${validations.length} 份实践记录`, complete: validations.some((item) => practiceComplete.has(item.status)) }
  ];

  return <section className="creation-lineage">
    <header><div><GitBranch size={15}/><span>END-TO-END LINEAGE</span></div><code>{lineage.snapshot.id.slice(0, 8)}</code></header>
    <div className="lineage-stages">{stages.map((stage, index) => <div className={stage.complete ? "complete" : "pending"} key={stage.label}>
      <span><StateMark complete={stage.complete}/>{String(index + 1).padStart(2, "0")}</span><strong>{stage.label}</strong><small>{stage.value}</small>
    </div>)}</div>
    <div className="lineage-decisions">
      {lineage.bindings.map((item) => <details key={item.binding.id}>
        <summary><FileCheck2 size={13}/><span>{item.targets[0]?.concept.name ?? item.binding.targetId}<small>{item.binding.usage} · {item.resolution} · {item.binding.rationale}</small></span></summary>
        {item.targets.map((target) => <div className="lineage-source" key={target.pinnedRevision.id}>
          <b>固定 r{target.pinnedRevision.revision}</b><p>{target.pinnedRevision.definition}</p>
          {target.observations.map((observation) => <p key={observation.id}><code>{observation.subjectType}:{observation.subjectId}</code> {observation.statement}<small>{observation.evidenceRefs.join(" · ")}</small></p>)}
        </div>)}
      </details>)}
      {lineage.hypotheses.map((hypothesis) => <article key={hypothesis.id}><FlaskConical size={13}/><span>{hypothesis.statement}<small>基线：{hypothesis.baselineDeclaration} · 预期：{hypothesis.expectedSignals.join(" / ")}</small></span></article>)}
    </div>
  </section>;
}
