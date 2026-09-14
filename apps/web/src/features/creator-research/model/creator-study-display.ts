export const tierLabels = {
  high: "高表现",
  base: "中位附近",
  low: "低表现",
} as const;
export const evidenceLabels = {
  deep_validated: "原记录评估通过",
  deep_built: "Builder 已完成 · 待评估",
  deep_pending: "深度待构建",
  surface_only: "作品级证据",
  missing: "证据缺失",
} as const;
export const metric = (value: number | null) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("zh-CN", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(value);
export const duration = (value: number | null) =>
  value === null
    ? "时长未知"
    : value >= 60
      ? `${Math.floor(value / 60)}分${Math.round(value % 60)}秒`
      : `${Math.round(value)}秒`;
