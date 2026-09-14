import { Link, useLocation } from "react-router-dom";
import { AlertTriangle, ChevronDown, ExternalLink } from "lucide-react";
import type { CreatorDossier } from "../../shared/contracts/core";
import { canonicalCreatorHref } from "./model/creator-reading";
import { creatorEvidenceHref } from "./model/creator-evidence-link";
import { HealthNote } from "./CreatorStudyShared";
import { metric, tierLabels } from "./model/creator-study-display";
const states: Record<string, string> = {
  pending: "未开始",
  running: "执行中",
  partial: "部分完成",
  complete: "已通过",
  blocked: "待接管",
  failed: "失败",
  stale: "需重跑",
};

export function CreatorStudyEvidence({ data }: { data: CreatorDossier }) {
  const location = useLocation();
  const deep = data.portfolio.items.filter((item) => item.deepSample);
  const href = (item: CreatorDossier["portfolio"]["items"][number]) =>
    item.evidenceHref
      ? creatorEvidenceHref(
          item.evidenceHref,
          data.run
            ? `${canonicalCreatorHref(data.canonicalId, data.run.id, location.search)}#evidence`
            : `${location.pathname}${location.search}#evidence`,
        )
      : item.sourceHref;
  return (
    <div className="creator-study-view">
      <section className="creator-study-section">
        <header>
          <div>
            <p>分析依据</p>
            <h2>数据范围与证据健康</h2>
          </div>
          <HealthNote value={data.corpus.health} />
        </header>
        <div className="creator-study-metrics">
          <div>
            <b>{data.corpus.postCount}</b>
            <span>可见作品</span>
          </div>
          <div>
            <b>{data.corpus.likesKnown}</b>
            <span>点赞已知</span>
          </div>
          <div>
            <b>{metric(data.corpus.medianLikes)}</b>
            <span>点赞中位</span>
          </div>
          <div>
            <b>{metric(data.corpus.meanLikes)}</b>
            <span>平均点赞</span>
          </div>
          <div>
            <b>{metric(data.corpus.maxLikes)}</b>
            <span>最高点赞</span>
          </div>
          <div>
            <b>{Math.round(data.corpus.coverageRate * 100)}%</b>
            <span>指标覆盖</span>
          </div>
        </div>
        <p className="creator-study-source-note">
          百分位：P10 {metric(data.corpus.percentiles.p10)} · P25{" "}
          {metric(data.corpus.percentiles.p25)} · P75{" "}
          {metric(data.corpus.percentiles.p75)} · P90{" "}
          {metric(data.corpus.percentiles.p90)} · 视频{" "}
          {data.corpus.videoCount ?? "—"} 条 · ≥1 万作品{" "}
          {data.corpus.highCount ?? "—"} 条
        </p>
        <div className="creator-study-distribution">
          {data.corpus.distribution.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <i>
                <em style={{ width: `${item.share * 100}%` }} />
              </i>
              <b>{item.count}</b>
              <small>{(item.share * 100).toFixed(1)}%</small>
            </div>
          ))}
        </div>
        {data.corpus.notes.map((item) => (
          <p className="creator-study-source-note" key={item}>
            <AlertTriangle size={14} />
            {item}
          </p>
        ))}
        {data.corpus.annotationCoverage && (
          <p className="creator-study-source-note">
            表层标注 {data.corpus.annotationCoverage.annotatedPosts}/
            {data.corpus.annotationCoverage.observedPosts} 条；
            {data.corpus.annotationCoverage.unclassifiedPosts} 条保留为未归类。
          </p>
        )}
      </section>
      <section className="creator-study-section">
        <header>
          <div>
            <p>深读覆盖</p>
            <h2>各表现层的证据状态</h2>
          </div>
        </header>
        <div className="creator-study-evidence-tiers">
          {(["high", "base", "low"] as const).map((key) => {
            const subset = deep.filter((item) => item.tier === key);
            return (
              <article key={key}>
                <span>{tierLabels[key]}</span>
                <b>
                  {
                    subset.filter(
                      (item) => item.evidenceStatus === "deep_validated",
                    ).length
                  }{" "}
                  / {subset.length}
                </b>
                <small>原记录通过 / 已选择</small>
                {subset.map((item) => (
                  <Link key={item.id} to={href(item)}>
                    {item.title}
                    <ExternalLink size={12} />
                  </Link>
                ))}
              </article>
            );
          })}
        </div>
      </section>
      {data.pipeline && (
        <section className="creator-study-section">
          <header>
            <div>
              <p>研究进度</p>
              <h2>
                {data.pipeline.ready
                  ? "研究闭环已通过"
                  : `已完成 ${data.pipeline.completedStages}/${data.pipeline.totalStages} 个阶段`}
              </h2>
            </div>
          </header>
          <div className="creator-study-stages">
            {data.pipeline.stages.map((item) => (
              <details key={item.id} className={`is-${item.state}`}>
                <summary>
                  <span />
                  <div>
                    <b>{item.label}</b>
                    <small>
                      {states[item.state] ?? item.state} · {item.message}
                    </small>
                  </div>
                  <ChevronDown size={15} />
                </summary>
                <div>
                  <p>
                    {item.nextAction
                      ? `下一步：${item.nextAction}`
                      : "该阶段没有待执行动作。"}
                  </p>
                  {item.missingInputs.map((missing) => (
                    <span key={missing}>{missing}</span>
                  ))}
                  {item.artifactRefs.length > 0 && (
                    <details>
                      <summary>查看产物引用</summary>
                      {item.artifactRefs.map((ref) => (
                        <code key={ref}>{ref}</code>
                      ))}
                    </details>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
