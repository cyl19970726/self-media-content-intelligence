import type { ReactNode } from "react";

export type LensOutlineItem = {
  href: string;
  label: string;
  meta?: string;
};

export function LensWorkspace({ label, items, children }: { label: string; items: LensOutlineItem[]; children: ReactNode }) {
  return <div className="lens-workspace">
    <nav className="lens-outline" aria-label={`${label}目录`}>
      <p>{label}目录</p>
      <div>{items.map((item, index) => <a key={item.href} href={item.href}>
        <b>{String(index + 1).padStart(2, "0")}</b><span>{item.label}</span>{item.meta && <small>{item.meta}</small>}
      </a>)}</div>
    </nav>
    <div className="lens-workspace__body">{children}</div>
  </div>;
}
