import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Activity, Compass, ScanText, Users } from "lucide-react";
import "./study-shell.css";

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation();
  const progress = pathname === "/creators" && new URLSearchParams(search).get("view") === "progress";
  const post = pathname.startsWith("/analyze") || pathname.startsWith("/runs") || pathname.includes("/videos/");
  return <div className="study-shell">
    <aside className="study-sidebar">
      <Link to="/creators" className="study-brand"><Compass size={25}/><span>内容研究<small>研究工作台</small></span></Link>
      <nav aria-label="主导航">
        <Link to="/creators" aria-current={!post && !progress && pathname.startsWith("/creators") ? "page" : undefined}><Users size={19}/>博主研究</Link>
        <Link to="/analyze" aria-current={post ? "page" : undefined}><ScanText size={19}/>帖子研究</Link>
        <Link to="/creators?view=progress" aria-current={progress ? "page" : undefined}><Activity size={19}/>分析进度</Link>
      </nav>
      <div className="study-sidebar-note"><span>从内容到认知</span><p>认识创作者，追溯证据，留下自己的判断。</p></div>
    </aside>
    <div className="study-surface">{children}</div>
  </div>;
}
