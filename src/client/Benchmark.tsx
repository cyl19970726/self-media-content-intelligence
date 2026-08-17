import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CircleAlert, LoaderCircle } from "lucide-react";
import { getBenchmark } from "./api";
import type { Benchmark as BenchmarkData } from "../shared/schema";

const kindLabels: Record<string, string> = { track: "赛道规律", ip: "IP 能力", gap: "定位空缺" };

export default function BenchmarkPage() {
  const [data, setData] = useState<BenchmarkData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    getBenchmark().then(setData).catch((cause) => {
      setError(cause instanceof Error ? cause.message : "无法读取对比数据");
    });
  }, []);
  return <main className="console">
    <article className="benchmark">
      <nav className="breadcrumb">
        <Link to="/creators">博主总览</Link><span>/</span><b>跨 IP 对比台</b>
      </nav>
      <header className="benchmark-head">
        <div>
          <p className="eyebrow"><span>BENCHMARK</span><span>跨账号 · 规律可信度</span></p>
          <h1>跨 IP 对比台</h1>
          <p className="benchmark-head__lede">同一个归纳循环在多个账号之间运行：用"跨账号重复出现"给规律标可信度——赛道规律（可复制）/ IP 能力（是边界）/ 定位空缺（是机会）。</p>
        </div>
      </header>
      {error ? <div className="page-error"><CircleAlert/><h1>对比数据读取失败</h1><p>{error}</p></div>
        : !data ? <div className="page-loader"><LoaderCircle className="spin"/><p>正在计算跨账号对比</p></div>
          : <>
            <section className="benchmark-metric">
              <h2>{data.metric}</h2>
              <p className="benchmark-note">{data.metricNote}</p>
              <div className="benchmark-strip">
                {data.ips.map((ip) => {
                  const ratio = Math.min(1.2, ip.aggregateCollectionToLike);
                  return <div key={ip.id} className="benchmark-ip">
                    <header><Link to={`/creators/${ip.id}`}>{ip.name}<ArrowRight size={13}/></Link><span>{ip.sampleSize} 条样本</span></header>
                    <div className="benchmark-ip__bar"><i style={{ width: `${(ratio / 1.2) * 100}%` }}/></div>
                    <div className="benchmark-ip__values">
                      <div><b>{ip.aggregateCollectionToLike.toFixed(2)}</b><span>收藏/点赞</span></div>
                      <div><b>{ip.medianLikes.toLocaleString()}</b><span>互动中位</span></div>
                    </div>
                  </div>;
                })}
              </div>
            </section>
            <section className="benchmark-findings">
              <h2>规律可信度分层</h2>
              <div className="finding-list">
                {data.findings.map((finding) => <article key={finding.text.slice(0, 24)} className={`finding finding--${finding.kind}`}>
                  <span className="finding__kind">{kindLabels[finding.kind]}</span>
                  <p>{finding.text}</p>
                </article>)}
              </div>
            </section>
            <p className="console-note"><CircleAlert size={14}/>样本结构不同（21 条分层选样 vs 62 条全量 vs 19 条全量），对比只标注方向，不虚构精度。</p>
          </>}
    </article>
  </main>;
}
