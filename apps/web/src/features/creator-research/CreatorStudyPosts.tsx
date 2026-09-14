import { useMemo } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ExternalLink, LayoutGrid, List, Search } from "lucide-react";
import type { CreatorDossier } from "../../shared/contracts/core";
import { SourceCaptionPreview } from "../../entities/source-facts/PostSourceFactsCard";
import { sampleRoleLabel, canonicalCreatorHref } from "./model/creator-reading";
import { creatorEvidenceHref } from "./model/creator-evidence-link";
import { HealthNote } from "./CreatorStudyShared";
import {
  duration,
  evidenceLabels,
  metric,
  tierLabels,
} from "./model/creator-study-display";

export function CreatorStudyPosts({ data }: { data: CreatorDossier }) {
  const location = useLocation();
  const [search, setSearch] = useSearchParams();
  const query = search.get("q") ?? "";
  const tier = search.get("tier") ?? "all";
  const topic = search.get("topic") ?? "all";
  const evidence = search.get("evidence") ?? "all";
  const view = search.get("view") === "list" ? "list" : "grid";
  const topics = useMemo(
    () => [
      ...new Set(
        data.portfolio.items
          .map((item) => item.topic)
          .filter((item): item is string => Boolean(item)),
      ),
    ],
    [data.portfolio.items],
  );
  const items = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("zh-CN");
    return data.portfolio.items.filter(
      (item) =>
        (tier === "all" || item.tier === tier) &&
        (topic === "all" || item.topic === topic) &&
        (evidence === "all" ||
          (evidence === "deep"
            ? item.deepSample
            : item.evidenceStatus === evidence)) &&
        (!needle ||
          [
            item.title,
            item.topic,
            item.format,
            item.coreContent,
            item.mechanismHypothesis,
            item.selectionReason,
          ].some((value) =>
            value?.toLocaleLowerCase("zh-CN").includes(needle),
          )),
    );
  }, [data.portfolio.items, evidence, query, tier, topic]);
  const setOption = (key: string, value: string, fallback = "all") => {
    const next = new URLSearchParams(search);
    if (value === fallback) next.delete(key);
    else next.set(key, value);
    setSearch(next, { replace: true });
  };
  const itemHref = (item: CreatorDossier["portfolio"]["items"][number]) =>
    item.evidenceHref
      ? creatorEvidenceHref(
          item.evidenceHref,
          data.run
            ? `${canonicalCreatorHref(data.canonicalId, data.run.id, location.search)}#works`
            : `${location.pathname}${location.search}#works`,
        )
      : item.sourceHref;
  return (
    <div className="creator-study-view">
      <section className="creator-study-section">
        <header>
          <div>
            <p>作品研究台</p>
            <h2>从样本回到原帖和深读证据</h2>
            <span>
              {data.portfolio.items.length} 条选择集 ·{" "}
              {data.portfolio.deepCount} 条深读样本
            </span>
          </div>
          <HealthNote value={data.portfolio.health} />
        </header>
        <div className="creator-study-toolbar">
          <label className="creator-study-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setOption("q", event.target.value, "")}
              placeholder="搜索标题、主题、形式或内容…"
            />
          </label>
          <select
            aria-label="表现层级"
            value={tier}
            onChange={(event) => setOption("tier", event.target.value)}
          >
            <option value="all">全部表现</option>
            <option value="high">高表现</option>
            <option value="base">中位附近</option>
            <option value="low">低表现</option>
          </select>
          <select
            aria-label="主题"
            value={topic}
            onChange={(event) => setOption("topic", event.target.value)}
          >
            <option value="all">全部主题</option>
            {topics.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            aria-label="证据状态"
            value={evidence}
            onChange={(event) => setOption("evidence", event.target.value)}
          >
            <option value="all">全部证据</option>
            <option value="deep">深读样本</option>
            {Object.entries(evidenceLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <div className="creator-study-view-toggle">
            <button
              className={view === "grid" ? "is-active" : ""}
              aria-label="卡片视图"
              onClick={() => setOption("view", "grid", "grid")}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={view === "list" ? "is-active" : ""}
              aria-label="列表视图"
              onClick={() => setOption("view", "list", "grid")}
            >
              <List size={16} />
            </button>
          </div>
        </div>
        <div className={`creator-study-posts is-${view}`}>
          {items.map((item) => {
            const multiple =
              item.likes !== null && data.corpus.medianLikes
                ? item.likes / data.corpus.medianLikes
                : null;
            return (
              <Link
                to={itemHref(item)}
                target={item.evidenceHref ? undefined : "_blank"}
                rel={item.evidenceHref ? undefined : "noreferrer"}
                className={`creator-study-post is-${item.tier}`}
                key={item.id}
              >
                <div className="creator-study-post__cover">
                  {item.coverHref ? (
                    <img src={item.coverHref} alt="" loading="lazy" />
                  ) : (
                    <span>{tierLabels[item.tier]}</span>
                  )}
                  <em>{tierLabels[item.tier]}</em>
                </div>
                <div className="creator-study-post__body">
                  <small>
                    {[item.topic, item.format].filter(Boolean).join(" · ") ||
                      "尚未标注"}
                  </small>
                  <h3>{item.title}</h3>
                  <SourceCaptionPreview facts={item.sourceFacts} />
                  <div className="creator-study-post__metrics">
                    <b>{metric(item.likes)} 赞</b>
                    <span>
                      {multiple === null
                        ? "无法计算中位倍数"
                        : `${multiple.toFixed(2)}× 中位`}
                    </span>
                    <span>{duration(item.durationSeconds)}</span>
                  </div>
                  <p>{item.coreContent ?? "内容待深度还原"}</p>
                  <dl>
                    <div>
                      <dt>公开数据</dt>
                      <dd>
                        {item.publishedLabel ?? "发布时间未知"} · 收藏{" "}
                        {metric(item.collections)} · 评论{" "}
                        {metric(item.comments)} · 分享 {metric(item.shares)} ·
                        百分位 {item.percentileRank ?? "—"} · 层内序位{" "}
                        {item.tierRank}
                      </dd>
                    </div>
                    <div>
                      <dt>选样锚点</dt>
                      <dd>{item.anchors.join(" · ") || "无"}</dd>
                    </div>
                    <div>
                      <dt>选择理由</dt>
                      <dd>{item.selectionReason}</dd>
                    </div>
                    <div>
                      <dt>内容架构</dt>
                      <dd>
                        {item.contentArchitecture.join(" → ") || "未产出"}
                      </dd>
                    </div>
                    <div>
                      <dt>机制假设</dt>
                      <dd>{item.mechanismHypothesis ?? "未产出"}</dd>
                    </div>
                  </dl>
                  <footer>
                    <span>{sampleRoleLabel(item)}</span>
                    <b>{evidenceLabels[item.evidenceStatus]}</b>
                    <ExternalLink size={14} />
                  </footer>
                </div>
              </Link>
            );
          })}
        </div>
        {items.length === 0 && (
          <div className="creator-study-empty">
            没有匹配的作品。尝试放宽筛选条件。
          </div>
        )}
      </section>
    </div>
  );
}
