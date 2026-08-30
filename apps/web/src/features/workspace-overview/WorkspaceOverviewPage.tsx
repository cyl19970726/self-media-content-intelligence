import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, BookOpen, CheckCircle2, Database, FileSearch,
  GitCompareArrows, LoaderCircle, RefreshCw, Send, Sparkles, Users
} from "lucide-react";
import { getWorkspaceOverview } from "../../shared/api/client";
import type { WorkspaceOverview } from "../../shared/contracts/core";
import "./workspace-overview.css";

const statusLabels: Record<string, string> = {
  complete: "完成", blocked: "阻塞", failed: "失败", ready: "Ready", reviewable: "待收口",
  draft: "草稿", repair_queued: "待修复", active: "有效", invalidated: "已失效", unknown: "未分类"
};
const kindLabels: Record<WorkspaceOverview["recent"][number]["kind"], string> = {
  post: "单帖", creator: "博主", comparison: "比较", learning_loop: "验证"
};

function StatusLine({ statuses }: { statuses: Record<string, number> }) {
  const items = Object.entries(statuses);
  if (items.length === 0) return <span>尚无记录</span>;
  return <>{items.map(([status, count]) => <span key={status}>{statusLabels[status] ?? status} {count}</span>)}</>;
}

function AssetCard({ label, value, detail, href, icon }: {
  label: string; value: number; detail: React.ReactNode; href: string; icon: React.ReactNode;
}) {
  return <Link to={href} className="overview-asset-card">
    <header>{icon}<span>{label}</span><ArrowRight size={15}/></header>
    <strong>{new Intl.NumberFormat("zh-CN").format(value)}</strong>
    <div>{detail}</div>
  </Link>;
}

export default function WorkspaceOverviewPage() {
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true);
    try { setOverview(await getWorkspaceOverview()); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "工作区总览读取失败"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const actions = useMemo(() => {
    if (!overview) return [];
    const incompleteCreators = overview.assets.creatorRuns.total - (overview.assets.creatorRuns.statuses.ready ?? 0);
    return [
      !overview.evidence.storeReadable ? { tone: "danger", title: "Evidence Store 未就绪", body: "深度报告和证据回跳可能不可用。", href: "/evidence", action: "检查 Evidence" } : null,
      incompleteCreators > 0 ? { tone: "warning", title: `${incompleteCreators} 个博主尚未 Ready`, body: "先收口阻塞和深度视频缺口，再扩大样本。", href: "/creators", action: "处理研究任务" } : null,
      overview.assets.knowledge.total === 0 ? { tone: "quiet", title: "真实 Wiki 尚未激活", body: "已有研究还没有经过贡献清单审核进入 Knowledge。", href: "/knowledge", action: "查看知识缺口" } : null,
      overview.assets.contentPackages.total === 0 ? { tone: "quiet", title: "还没有创作项目", body: "应在真实 Knowledge 可引用后创建第一份内容包。", href: "/creation", action: "查看创作边界" } : null
    ].filter((item): item is NonNullable<typeof item> => item !== null);
  }, [overview]);

  if (loading && !overview) return <div className="page-loader"><LoaderCircle className="spin"/><p>正在读取真实工作区</p></div>;
  if (error && !overview) return <main className="overview-error"><AlertTriangle/><h1>无法读取工作区</h1><p>{error}</p><button onClick={() => void load()}><RefreshCw size={15}/>重试</button></main>;
  if (!overview) return null;
  const assets = overview.assets;
  return <main className="workspace-overview">
    <header className="overview-hero">
      <div><p className="eyebrow"><span>PRODUCT CONTROL PLANE</span><span>RESEARCH → KNOWLEDGE → CREATION</span></p>
        <h1>这里不是报告仓库。<br/><em>这是内容认知的工作现场。</em></h1>
        <p>先看清已有资产、阻塞和知识缺口，再决定下一项研究或创作。</p></div>
      <div className={`overview-health ${overview.evidence.storeReadable ? "is-ready" : "is-blocked"}`}>
        {overview.evidence.storeReadable ? <CheckCircle2/> : <AlertTriangle/>}
        <span>EVIDENCE STORE</span><strong>{overview.evidence.storeReadable ? "已挂载" : "未就绪"}</strong>
        <small>{new Intl.NumberFormat("zh-CN").format(overview.evidence.manifestEntries)} 条 Manifest 记录</small>
      </div>
    </header>

    <section className="overview-assets" aria-labelledby="asset-heading">
      <div className="overview-section-heading"><span>01</span><div><h2 id="asset-heading">真实资产</h2><p>来自当前运行库，不包含隔离 Fixture。</p></div><Link to="/analyze">分析新链接 <ArrowRight size={14}/></Link></div>
      <div className="overview-asset-grid">
        <AssetCard label="单帖分析" value={assets.postRuns.total} href="/analyze" icon={<FileSearch/>} detail={<StatusLine statuses={assets.postRuns.statuses}/>}/>
        <AssetCard label="博主研究" value={assets.creatorRuns.total} href="/creators" icon={<Users/>} detail={<><StatusLine statuses={assets.creatorRuns.statuses}/><span>{assets.creatorRuns.reconstructedPosts} 条深度视频</span></>}/>
        <AssetCard label="多博主比较" value={assets.comparisons.total} href="/comparisons" icon={<GitCompareArrows/>} detail={<StatusLine statuses={assets.comparisons.statuses}/>}/>
        <AssetCard label="内容知识" value={assets.knowledge.total} href="/knowledge" icon={<BookOpen/>} detail={<StatusLine statuses={assets.knowledge.statuses}/>}/>
        <AssetCard label="创作项目" value={assets.contentPackages.total} href="/creation" icon={<Sparkles/>} detail={<StatusLine statuses={assets.contentPackages.statuses}/>}/>
        <AssetCard label="发布任务" value={assets.publications.total} href="/creation" icon={<Send/>} detail={<StatusLine statuses={assets.publications.statuses}/>}/>
      </div>
      <div className="overview-coverage">
        <div><span>发现作品</span><strong>{assets.creatorRuns.discoveredPosts}</strong></div>
        <div><span>比较样本</span><strong>{assets.creatorRuns.comparisonPosts}</strong></div>
        <div><span>深度还原</span><strong>{assets.creatorRuns.reconstructedPosts}</strong></div>
        <div><span>迭代验证</span><strong>{assets.learningLoops.total}</strong></div>
      </div>
    </section>

    <div className="overview-lower-grid">
      <section className="overview-actions" aria-labelledby="action-heading">
        <div className="overview-section-heading"><span>02</span><div><h2 id="action-heading">现在需要处理</h2><p>系统根据真实状态提出操作，不生成内容结论。</p></div></div>
        {actions.length === 0 ? <div className="overview-all-clear"><CheckCircle2/><div><h3>当前没有阻塞动作</h3><p>可以继续新增研究或进入创作。</p></div></div>
          : actions.map((item) => <article key={item.title} className={`overview-action is-${item.tone}`}><AlertTriangle/><div><h3>{item.title}</h3><p>{item.body}</p></div><Link to={item.href}>{item.action}<ArrowRight size={14}/></Link></article>)}
      </section>

      <section className="overview-recent" aria-labelledby="recent-heading">
        <div className="overview-section-heading"><span>03</span><div><h2 id="recent-heading">最近资产</h2><p>直接进入可审计的研究对象。</p></div></div>
        <div className="overview-recent-list">{overview.recent.map((item) => <Link key={`${item.kind}:${item.id}`} to={item.href}>
          <span>{kindLabels[item.kind]}</span><div><strong>{item.title}</strong><small>{item.meta}</small></div>
          <em>{statusLabels[item.status] ?? item.status}</em><ArrowRight size={14}/>
        </Link>)}</div>
      </section>
    </div>
    <footer className="overview-footer"><Database size={15}/> 快照生成于 {new Date(overview.generatedAt).toLocaleString("zh-CN")} · 数据真相源仍在服务端</footer>
  </main>;
}
