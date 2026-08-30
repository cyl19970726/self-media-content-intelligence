import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { BarChart3, BookOpen, Database, GitBranch, Search, Send, Users } from "lucide-react";

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <div className="app-shell">
    <header className="masthead">
      <Link to="/" className="brand" aria-label="返回分析台首页">
        <span className="brand__index">01</span>
        <span><strong>SIGNAL ROOM</strong><small>SELF-MEDIA INTELLIGENCE</small></span>
      </Link>
      <div className="masthead__meta"><span>PRIVATE WORKSPACE</span><span className="live-dot">LOCAL</span></div>
    </header>
    <nav className="section-nav" aria-label="主导航">
      <Link className={location.pathname === "/" ? "active" : ""} to="/"><Search size={16}/> 链接分析</Link>
      <Link className={location.pathname.startsWith("/creators") || location.pathname.startsWith("/creator-runs") ? "active" : ""} to="/creators"><Users size={16}/> 博主研究</Link>
      <Link className={location.pathname.startsWith("/comparisons") ? "active" : ""} to="/comparisons"><BarChart3 size={16}/> 多博主研究</Link>
      <Link className={location.pathname.startsWith("/learning-loop") ? "active" : ""} to="/learning-loop"><GitBranch size={16}/> 迭代验证</Link>
      <Link className={location.pathname.startsWith("/knowledge") ? "active" : ""} to="/knowledge"><BookOpen size={16}/> 内容知识</Link>
      <Link className={location.pathname.startsWith("/evidence") ? "active" : ""} to="/evidence"><Database size={16}/> 证据存储</Link>
      <Link className={location.pathname.startsWith("/creation") ? "active" : ""} to="/creation"><Send size={16}/> 创作发布</Link>
      <span className="section-nav__soon">Notion 同步 · NEXT</span>
    </nav>
    {children}
  </div>;
}
