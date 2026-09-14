import "./creator-workspace.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { getCreatorDossier, listCreatorRunOperations } from "../../shared/api/creators";
import type {
  CreatorDossier,
  CreatorRunOperation,
} from "../../shared/contracts/core";
import { canonicalCreatorHref } from "./model/creator-reading";
import { CreatorStudyWorkspace } from "./CreatorStudyWorkspace";

export default function CreatorDossierPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [data, setData] = useState<CreatorDossier | null>(null);
  const [operation, setOperation] = useState<CreatorRunOperation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const requestedRun = search.get("run");
  const load = useCallback(async () => {
    const current = ++generation.current;
    try {
      const dossier = await getCreatorDossier(requestedRun ?? id);
      if (current !== generation.current) return;
      setData(dossier);
      setOperation(null);
      setError(null);
      if (!dossier.run) return;
      try {
        const operations = await listCreatorRunOperations();
        if (current === generation.current)
          setOperation(
            operations.find((item) => item.runId === dossier.run?.id) ?? null,
          );
      } catch {
        if (current === generation.current) setOperation(null);
      }
    } catch (cause) {
      if (current !== generation.current) return;
      setData(null);
      setOperation(null);
      setError(cause instanceof Error ? cause.message : "无法读取博主研究");
    }
  }, [id, requestedRun]);
  useEffect(() => {
    setData(null); setOperation(null); setError(null);
    void load();
    return () => {
      generation.current += 1;
    };
  }, [load]);
  useEffect(() => {
    if (
      !data?.run ||
      ["ready", "reviewable", "failed"].includes(data.run.status)
    )
      return undefined;
    const stream = new EventSource(
      `/api/creator-runs/${encodeURIComponent(data.run.id)}/events/stream`,
    );
    stream.addEventListener("creator-research-event", () => {
      void load();
    });
    stream.onerror = () => stream.close();
    return () => stream.close();
  }, [data?.run, load]);
  useEffect(() => {
    if (!data?.run || data.canonicalId === id) return;
    navigate(
      `${canonicalCreatorHref(data.canonicalId, data.run.id, window.location.search)}${window.location.hash}`,
      { replace: true },
    );
  }, [data, id, navigate]);
  if (error)
    return (
    <main className="creator-study-state">
        <AlertTriangle />
        <h1>博主研究读取失败</h1>
        <p>{error}</p>
        <button onClick={() => void load()}>重新载入</button>
      </main>
    );
  if (!data)
    return (
    <main className="creator-study-state">
        <LoaderCircle className="spin" />
        <p>正在整理研究材料…</p>
      </main>
    );
  return (
    <CreatorStudyWorkspace key={`${data.canonicalId}:${data.run?.id ?? "source"}`} data={data} operation={operation} reload={load} />
  );
}
