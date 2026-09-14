import { ChevronDown } from "lucide-react";
import type { CreatorDossier } from "../../shared/contracts/core";
import { ResearchNotebook } from "../../entities/research/ResearchNotebook";
import { StatementList } from "./DossierStatements";
import { HealthNote, InsightCard } from "./CreatorStudyShared";
import { metric, tierLabels } from "./model/creator-study-display";

export function CreatorStudyOverview({
  data,
  openPosts,
}: {
  data: CreatorDossier;
  openPosts: (topic?: string) => void;
}) {
  return (
    <div className="creator-study-view">
      <section className="creator-study-section">
        <header>
          <div>
            <p>快速建立认识</p>
            <h2>这个账号在持续提供什么</h2>
          </div>
          <HealthNote value={data.contentSystem.health} />
        </header>
        <div className="creator-study-insight-grid">
          <InsightCard
            data={data}
            title="服务人群"
            values={data.identity.audience}
            empty="服务人群尚未覆盖。"
          />
          <InsightCard
            data={data}
            title="提供的价值"
            values={data.identity.valuesProvided}
            empty="用户价值尚未覆盖。"
          />
          <InsightCard
            data={data}
            title="信任从哪里来"
            values={data.identity.trustSources}
            empty="信任来源尚未覆盖。"
          />
          <InsightCard
            data={data}
            title="账号阶段"
            values={[data.identity.lifecycle]}
            empty="账号阶段尚未覆盖。"
          />
        </div>
      </section>
      <section className="creator-study-section">
        <header>
          <div>
            <p>内容版图</p>
            <h2>主题与表达方式</h2>
          </div>
        </header>
        <div className="creator-study-clusters">
          <article>
            <h3>常见主题</h3>
            {data.contentSystem.topicClusters.map((item) => (
              <button key={item.name} onClick={() => openPosts(item.name)}>
                <span>{item.name}</span>
                <b>{item.count} 条</b>
                <i
                  style={{
                    width: `${Math.max(4, item.share ? item.share * 100 : 0)}%`,
                  }}
                />
                <small>
                  中位 {metric(item.medianLikes)} · 最高 {metric(item.maxLikes)}
                </small>
              </button>
            ))}
          </article>
          <article>
            <h3>常见形式</h3>
            {data.contentSystem.formatClusters.map((item) => (
              <div key={item.name}>
                <span>{item.name}</span>
                <b>{item.count} 条</b>
                <i
                  style={{
                    width: `${Math.max(4, item.share ? item.share * 100 : 0)}%`,
                  }}
                />
                <small>
                  中位 {metric(item.medianLikes)} · 最高 {metric(item.maxLikes)}
                </small>
              </div>
            ))}
          </article>
        </div>
        <details className="creator-study-more">
          <summary>
            展开完整内容系统 <ChevronDown size={16} />
          </summary>
          <div className="creator-study-insight-grid">
            <InsightCard
              data={data}
              title="主题组合"
              values={data.contentSystem.topics}
              empty="主题尚未结构化。"
            />
            <InsightCard
              data={data}
              title="形式组合"
              values={data.contentSystem.formats}
              empty="形式尚未结构化。"
            />
            <InsightCard
              data={data}
              title="画面语言"
              values={data.contentSystem.visualLanguage}
              empty="画面语言尚未结构化。"
            />
            <InsightCard
              data={data}
              title="重复结构"
              values={data.contentSystem.recurringStructures}
              empty="重复结构尚未结构化。"
            />
          </div>
        </details>
      </section>
      <section className="creator-study-section">
        <header>
          <div>
            <p>表现对照</p>
            <h2>高、中位与低表现分别发生了什么</h2>
          </div>
          <button
            className="creator-study-text-button"
            onClick={() => openPosts()}
          >
            查看作品样本
          </button>
        </header>
        <div className="creator-study-tier-grid">
          {data.tiers.map((item) => (
            <article key={item.id} className={`is-${item.id}`}>
              <span>{tierLabels[item.id]}</span>
              <strong>{item.count} 条样本</strong>
              <div>
                <b>{metric(item.metrics.medianLikes)}</b>
                <small>点赞中位</small>
              </div>
              <StatementList
                data={data}
                values={item.conclusion}
                empty="当前没有可用结论。"
              />
              {item.mechanisms.length > 0 && (
                <details>
                  <summary>机制依据</summary>
                  <StatementList
                    data={data}
                    values={item.mechanisms}
                    empty=""
                  />
                </details>
              )}
              {item.failurePatterns.length > 0 && (
                <details>
                  <summary>失效条件</summary>
                  <StatementList
                    data={data}
                    values={item.failurePatterns}
                    empty=""
                  />
                </details>
              )}
            </article>
          ))}
        </div>
      </section>
      <section className="creator-study-section">
        <header>
          <div>
            <p>继续研究</p>
            <h2>节奏、受众与商业边界</h2>
          </div>
        </header>
        <div className="creator-study-insight-grid">
          <InsightCard
            data={data}
            title="发布节奏与演化"
            values={data.rhythm.statements}
            empty={data.rhythm.health.reason}
          />
          <InsightCard
            data={data}
            title="评论与用户需求"
            values={data.audienceDemand.statements}
            empty={data.audienceDemand.health.reason}
          />
          <InsightCard
            data={data}
            title="观察到的内容系统"
            values={data.growthEngines.statements}
            empty={data.growthEngines.health.reason}
          />
          <InsightCard
            data={data}
            title="商业路径"
            values={data.businessPath.statements}
            empty={data.businessPath.health.reason}
          />
          <InsightCard
            data={data}
            title="身份信息中的商业路径"
            values={data.identity.commercialPaths}
            empty="身份资料未产出商业路径。"
          />
        </div>
        <details className="creator-study-more">
          <summary>
            证据边界与未知 <ChevronDown size={16} />
          </summary>
          <div className="creator-study-boundaries">
            {data.boundaries.map((item, index) => (
              <p key={`${item}-${index}`}>{item}</p>
            ))}
          </div>
        </details>
        <details className="creator-study-more">
          <summary>
            查看发布时段原始分布 <ChevronDown size={16} />
          </summary>
          <div className="creator-study-insight-grid">
            <article className="creator-study-insight">
              <h3>星期分布</h3>
              {data.rhythm.weekdays.map((item) => (
                <p key={item.name}>
                  {item.name} · {item.count} 条 · 中位{" "}
                  {metric(item.medianLikes)}
                </p>
              ))}
            </article>
            <article className="creator-study-insight">
              <h3>时段分布</h3>
              {data.rhythm.dayparts.map((item) => (
                <p key={item.name}>
                  {item.name} · {item.count} 条 · 中位{" "}
                  {metric(item.medianLikes)}
                </p>
              ))}
            </article>
          </div>
        </details>
      </section>
      <ResearchNotebook
        subjectId={`creator:${data.canonicalId}:${data.run?.id ?? "latest"}`}
        title={`${data.identity.name} · 研究笔记`}
        sourceUrl={data.identity.profileHref}
      />
    </div>
  );
}
