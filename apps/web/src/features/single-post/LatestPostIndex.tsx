import { useEffect, useState } from "react";
import { ArrowRight, CircleAlert, FileSearch, LoaderCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { listLatestVideoResearch, type LatestVideoResearchItem } from "../../shared/api/client";

export function LatestPostList({ items }: { items: LatestVideoResearchItem[] }) {
  if (!items.length) return <div className="rail-empty">当前没有完整的 Builder 三部分单帖报告。</div>;
  return <div className="run-list">{items.map((item, index) => <Link className="run-item" key={`${item.runId}:${item.videoId}`} to={item.href}>
    <span className="run-item__number">{String(index + 1).padStart(2, "0")}</span>
    <div><strong>{item.title}</strong><small>{item.creatorName} · LATEST BUILDER</small></div>
    <span className="status status--complete"><i/>三部分报告</span>
  </Link>)}</div>;
}

export default function LatestPostIndex() {
  const [items, setItems] = useState<LatestVideoResearchItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    listLatestVideoResearch().then((value) => { if (active) setItems(value); }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "无法读取最新单帖报告");
    });
    return () => { active = false; };
  }, []);
  return <main className="workspace">
    <aside className="run-rail"><div className="rail-heading"><span>LATEST BUILDER</span><b>{String(items?.length ?? 0).padStart(2, "0")}</b></div><div className="rail-empty">这里只列出每位博主最新运行及独立单帖运行中，三部分完整产出的报告。</div></aside>
    <section className="intake">
      <div className="eyebrow"><span>SINGLE POST REPORTS</span><span>BUILDER LENSES</span></div>
      <h1>最新单帖。<br/><em>完整三部分报告。</em></h1>
      <p className="intake__lede">选择一条报告，查看内容还原、编导逻辑、画面与剪辑，以及结论附近的原始证据。</p>
      {error ? <div className="page-error"><CircleAlert/><h2>报告列表读取失败</h2><p>{error}</p></div>
        : items === null ? <div className="page-loader"><LoaderCircle className="spin"/><p>正在读取最新报告</p></div>
          : <LatestPostList items={items}/>} 
    </section>
  </main>;
}

export function LegacyRunRetired() {
  return <main className="workspace workspace--solo"><article className="dossier"><div className="dossier-topline"><span>旧单帖入口</span></div><header className="report-header">
    <div className="report-kicker"><span>ENTRY RETIRED</span></div><h1>这条旧报告入口已退役。</h1>
    <p>当前只展示从最新 Builder 三部分产物生成的单帖报告。</p>
    <div className="report-actions"><Link to="/analyze"><FileSearch size={15}/> 查看最新单帖报告 <ArrowRight size={15}/></Link></div>
  </header></article></main>;
}
