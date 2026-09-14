import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  FileSearch,
  LoaderCircle,
  RefreshCw,
  UserRound,
} from "lucide-react";
import type {
  CreatorDossier,
  CreatorRunOperation,
} from "../../shared/contracts/core";
import { runCreatorOperation } from "../../shared/api/creators";
import { StatementList } from "./DossierStatements";
import { creatorRecoveryPresentation } from "./model/creator-recovery";
import { metric } from "./model/creator-study-display";
import { CreatorStudyOverview } from "./CreatorStudyOverview";
import { CreatorStudyPosts } from "./CreatorStudyPosts";
import { CreatorStudyEvidence } from "./CreatorStudyEvidence";
type Mode = "overview" | "posts" | "evidence";
const modes = [
  {
    id: "overview",
    label: "认识博主",
    hint: "定位、主题与受众",
    icon: UserRound,
  },
  { id: "posts", label: "研究作品", hint: "搜索和对照样本", icon: BookOpen },
  {
    id: "evidence",
    label: "分析依据",
    hint: "口径、证据与进度",
    icon: FileSearch,
  },
] as const;

export function CreatorStudyWorkspace({
  data,
  operation,
  reload,
}: {
  data: CreatorDossier;
  operation: CreatorRunOperation | null;
  reload: () => Promise<void>;
}) {
  const [search, setSearch] = useSearchParams();
  const [resuming, setResuming] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const actionGeneration = useRef(0);
  const mode = (
    modes.some((item) => item.id === search.get("mode"))
      ? search.get("mode")
      : "overview"
  ) as Mode;
  const deepCount = data.portfolio.items.filter(
    (item) => item.deepSample,
  ).length;
  const recovery = data.run
    ? creatorRecoveryPresentation(data.run, operation)
    : null;
  const setMode = (value: Mode, topic?: string) => {
    const next = new URLSearchParams(search);
    if (value === "overview") next.delete("mode");
    else next.set("mode", value);
    if (topic) next.set("topic", topic);
    setSearch(next, { replace: true });
  };
  const resume = async () => {
    if (!data.run || !recovery || recovery.action === "none" || resuming)
      return;
    const current = ++actionGeneration.current;
    setResuming(true);
    setResumeError(null);
    try {
      await runCreatorOperation(data.run.id, recovery.action);
      if (current === actionGeneration.current) await reload();
    } catch (cause) {
      if (current === actionGeneration.current)
        setResumeError(cause instanceof Error ? cause.message : "无法恢复研究");
    } finally {
      if (current === actionGeneration.current) setResuming(false);
    }
  };
  return (
    <main className="creator-study">
      <header className="creator-study-topbar">
        <Link to="/creators">
          <ArrowLeft size={17} />
          创作者研究
        </Link>
        <span>
          {data.run ? `批次 ${data.run.id.slice(0, 8)}` : "历史研究档案"}
        </span>
        <a href={data.identity.profileHref} target="_blank" rel="noreferrer">
          查看原主页
          <ExternalLink size={15} />
        </a>
      </header>
      <section className="creator-study-hero">
        <div className="creator-study-avatar">
          {data.identity.name.slice(0, 1)}
        </div>
        <div>
          <p className="creator-study-kicker">CREATOR STUDY</p>
          <h1>{data.identity.name}</h1>
          <StatementList
            data={data}
            values={[data.identity.positioning]}
            empty="定位尚未产出。"
          />
        </div>
        <dl>
          <div>
            <dt>公开作品</dt>
            <dd>{data.corpus.postCount}</dd>
          </div>
          <div>
            <dt>点赞中位</dt>
            <dd>{metric(data.corpus.medianLikes)}</dd>
          </div>
          <div>
            <dt>深读样本</dt>
            <dd>{deepCount}</dd>
          </div>
        </dl>
      </section>
      {data.lastGood.active && (
        <div className="creator-study-notice">
          <RefreshCw size={16} />
          <div>
            <b>当前展示上一版可读结果</b>
            <p>
              {data.lastGood.reason}
              {data.lastGood.revisionLabel
                ? ` · ${data.lastGood.revisionLabel}`
                : ""}
            </p>
          </div>
        </div>
      )}
      {data.run && data.run.status !== "ready" && (
        <div className="creator-study-notice is-running">
          <LoaderCircle
            className={data.run.status === "failed" ? "" : "spin"}
            size={16}
          />
          <div>
            <b>{data.run.nextAction}</b>
            <p>
              {data.run.stages.find(
                (item) => item.id === data.run?.currentStage,
              )?.message ?? "研究仍在进行"}
            </p>
          </div>
          {recovery && (
            <button onClick={() => void resume()} disabled={resuming}>
              {resuming ? "恢复中…" : recovery.label}
            </button>
          )}
          {operation?.resolutionState === "waiting_external" &&
            operation.waitingReason && <small>{operation.waitingReason}</small>}
          {resumeError && <small role="alert">{resumeError}</small>}
        </div>
      )}
      <nav className="creator-study-modes" aria-label="研究模式">
        {modes.map(({ id, label, hint, icon: Icon }) => (
          <button
            key={id}
            className={mode === id ? "is-active" : ""}
            onClick={() => setMode(id)}
          >
            <Icon size={18} />
            <span>
              <b>{label}</b>
              <small>{hint}</small>
            </span>
          </button>
        ))}
      </nav>
      {mode === "overview" && (
        <CreatorStudyOverview
          data={data}
          openPosts={(topic) => setMode("posts", topic)}
        />
      )}{" "}
      {mode === "posts" && <CreatorStudyPosts data={data} />}{" "}
      {mode === "evidence" && <CreatorStudyEvidence data={data} />}{" "}
    </main>
  );
}
