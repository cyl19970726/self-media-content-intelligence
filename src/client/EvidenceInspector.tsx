import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Database, LoaderCircle, Search } from "lucide-react";
import type { EvidenceAccessProjection, EvidenceAvailability } from "../../packages/contracts/index";
import { getEvidenceAccess } from "./api";

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
    {!result && !error && <section className="evidence-empty"><Database/><div><h2>输入 Manifest 中的 Evidence ID</h2><p>工作台会核验外部内容，而不是根据路径存在与否猜测证据状态。</p></div></section>}
  </main>;
}
