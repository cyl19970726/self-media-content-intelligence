import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Database, LoaderCircle, Search } from "lucide-react";
import type { EvidenceAccessProjection, EvidenceAvailability } from "../../shared/contracts/core";
import type { EvidenceCatalogPage } from "../../shared/contracts/core";
import { getEvidenceAccess, listEvidenceCatalog } from "../../shared/api/client";
import "./evidence-catalog.css";

const availabilityLabels: Record<EvidenceAvailability, string> = {
  available: "可用且完整",
  pending_retrieval: "等待获取",
  missing: "存储中缺失",
  unauthorized: "需要存储授权",
  integrity_failed: "完整性校验失败"
};

const reasonLabels: Record<EvidenceAccessProjection["reason"], string> = {
  verified: "文件大小与 SHA-256 均已核验。",
  not_materialized: "已登记证据，但当前工作台尚未配置外部 Evidence 存储。",
  object_missing: "Manifest 存在，但配置的存储中找不到对应内容。",
  access_denied: "证据存在，但当前运行身份没有读取权限。",
  hash_or_size_mismatch: "取得的内容与 Manifest 记录不一致，已拒绝作为证据使用。",
  manifest_state: "当前状态由迁移 Manifest 明确声明。"
};

export default function EvidenceInspector() {
  const [searchParams] = useSearchParams();
  const [evidenceId, setEvidenceId] = useState("");
  const [result, setResult] = useState<EvidenceAccessProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState<EvidenceCatalogPage | null>(null);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [classification, setClassification] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const loadCatalog = useCallback(async (offset = 0, query = catalogQuery, kind = classification) => {
    setCatalogLoading(true);
    try { setCatalog(await listEvidenceCatalog({ q: query.trim() || undefined, classification: kind || undefined, offset, limit: 30 })); }
    finally { setCatalogLoading(false); }
  }, [catalogQuery, classification]);
  useEffect(() => {
    void listEvidenceCatalog({ limit: 30 }).then(setCatalog).finally(() => setCatalogLoading(false));
  }, []);
  const inspectId = useCallback(async (id: string) => {
    setLoading(true);
    try {
      setResult(await getEvidenceAccess(id));
      setError(null);
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : "无法读取 Evidence 状态");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const requested = searchParams.get("evidenceId")?.trim();
    if (!requested) return;
    setEvidenceId(requested);
    void inspectId(requested);
  }, [inspectId, searchParams]);
  const inspect = async (event: FormEvent) => { event.preventDefault(); await inspectId(evidenceId.trim()); };

  return <main className="evidence-inspector">
    <header><p className="eyebrow"><span>EVIDENCE ACCESS</span><span>MANIFEST → STORE → HASH</span></p>
      <h1>证据可用性</h1><p>这里显示证据真实的读取状态。缺失、未获取、无权限或校验失败都不会被包装成空结果或成功分析。</p></header>
    <form onSubmit={(event) => void inspect(event)}><label htmlFor="evidence-id">Evidence ID</label><div><input id="evidence-id" value={evidenceId} onChange={(event) => setEvidenceId(event.target.value)} placeholder="例如 creator/red-witch/frame-1" required/><button className="primary-button" disabled={loading}>{loading ? <LoaderCircle className="spin" size={16}/> : <Search size={16}/>}检查状态</button></div></form>
    {error && <section className="evidence-result evidence-result--unknown"><AlertTriangle/><div><span>MANIFEST ENTRY</span><h2>没有找到这条 Evidence</h2><p>{error}</p></div></section>}
    {result && <section className={`evidence-result evidence-result--${result.availability}`}>
      {result.availability === "available" ? <CheckCircle2/> : <AlertTriangle/>}<div><span>{result.availability.toUpperCase()}</span><h2>{availabilityLabels[result.availability]}</h2><p>{reasonLabels[result.reason]}</p>
        <dl><div><dt>Evidence ID</dt><dd>{result.evidenceId}</dd></div><div><dt>原始来源</dt><dd>{result.originalPath}</dd></div><div><dt>内容</dt><dd>{result.content.mediaType} · {new Intl.NumberFormat("zh-CN").format(result.content.bytes)} bytes</dd></div><div><dt>SHA-256</dt><dd>{result.content.sha256}</dd></div><div><dt>检查时间</dt><dd>{new Date(result.checkedAt).toLocaleString("zh-CN")}</dd></div></dl>
      </div></section>}
    {!result && !error && <section className="evidence-empty"><Database/><div><h2>选择目录记录或输入 Evidence ID</h2><p>工作台会核验外部内容，而不是根据路径存在与否猜测证据状态。</p></div></section>}
    <section className="evidence-catalog" aria-labelledby="evidence-catalog-title">
      <header><div><span>EVIDENCE CATALOG</span><h2 id="evidence-catalog-title">Manifest 目录</h2><p>目录只展示登记信息；打开记录后才执行文件大小与 SHA-256 核验。</p></div>
        {catalog && <div className={`catalog-health ${catalog.summary.storeReadable ? "is-ready" : "is-blocked"}`}><strong>{catalog.summary.storeReadable ? "STORE READY" : "STORE UNAVAILABLE"}</strong><span>{new Intl.NumberFormat("zh-CN").format(catalog.summary.manifestEntries)} 条记录</span></div>}
      </header>
      <form className="catalog-search" onSubmit={(event) => { event.preventDefault(); void loadCatalog(0); }}>
        <label htmlFor="catalog-query">搜索目录</label><input id="catalog-query" value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="博主、视频、文件名或媒体类型"/>
        <label htmlFor="catalog-classification">分类</label><select id="catalog-classification" value={classification} onChange={(event) => setClassification(event.target.value)}><option value="">全部</option><option value="research_evidence">研究证据</option><option value="example">示例</option><option value="fixture">Fixture</option></select>
        <button disabled={catalogLoading}>{catalogLoading ? <LoaderCircle className="spin" size={15}/> : <Search size={15}/>}筛选</button>
      </form>
      {catalogLoading && !catalog ? <div className="catalog-loading"><LoaderCircle className="spin"/>正在读取 Manifest</div>
        : catalog && <><div className="catalog-meta"><span>找到 {new Intl.NumberFormat("zh-CN").format(catalog.total)} 条</span><span>{catalog.offset + 1}–{Math.min(catalog.offset + catalog.entries.length, catalog.total)}</span></div>
          <div className="catalog-list">{catalog.entries.map((entry) => <button key={entry.evidenceId} onClick={() => { setEvidenceId(entry.evidenceId); void inspectId(entry.evidenceId); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <span>{entry.classification === "research_evidence" ? "研究" : entry.classification}</span><div><strong>{entry.evidenceId}</strong><small>{entry.content.mediaType} · {new Intl.NumberFormat("zh-CN").format(entry.content.bytes)} bytes</small></div><em>{entry.storage.availability}</em>
          </button>)}</div>
          {catalog.entries.length === 0 && <div className="catalog-no-results">没有符合条件的 Manifest 记录。</div>}
          <footer><button disabled={catalog.offset === 0 || catalogLoading} onClick={() => void loadCatalog(Math.max(0, catalog.offset - catalog.limit))}>上一页</button><button disabled={catalog.offset + catalog.limit >= catalog.total || catalogLoading} onClick={() => void loadCatalog(catalog.offset + catalog.limit)}>下一页</button></footer>
        </>}
    </section>
  </main>;
}
