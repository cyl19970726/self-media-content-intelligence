#!/usr/bin/env python3
"""
人类最强编导 · 表现分档补算脚本（Task B）

数据源（实测与任务描述有出入，以下以仓库真实文件为准）：
  - artifacts/creator-research/human-director/inventory.json   ：19 条全量公开笔记，含 likes/collections/comments/shares + pillar/role（无 archetype、无发布时间）。
  - artifacts/creator-research/human-director/selection.json   ：8 条被选中做画面还原的样本，含 archetype（用于 join）。
  - artifacts/creator-research/human-director/analysis.json    ：只有 8 条深度样本（含嵌套 engagement + archetype），不是 19 条。

诚实边界：
  - 任务描述说 analysis.json 有"19 条 videos"，实测 analysis.json 只有 8 条；19 条全量在 inventory.json。
  - 19 条全部有点赞等互动数据，但没有任何 publishedAt/publishedLabel → 发布节奏标 missing。
  - archetype 只有 8 条（selection.json）有，其余 11 条具名缺省为 null。

分档口径（对齐张咋啦 tiers，先算样本自身中位数/均值，带宽参考张咋啦 averageDiagnostic 原文
"Posts exist within 25% of the arithmetic mean."，即均值 ±25%）：
  - 高表现 high      ：likes > 均值 + 25% 带宽（明显超基线）
  - 平均值附近 average：均值 - 25% 带宽 <= likes <= 均值 + 25% 带宽
  - 中 median       ：中位数 <= likes < 均值 - 25% 带宽（基线附近上）
  - 低表现 low       ：likes < 中位数（明显低于基线）
该规则是连续、互斥、覆盖全部 19 条的确定性分档；分档阈值随样本实时计算并写入输出 method 块。
结论句子只由可观察数据（条数、中位/均值点赞、收藏/点赞比）生成，不做定性归因。
"""
from __future__ import annotations

import json
import statistics
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts" / "creator-research" / "human-director"

INVENTORY = ART / "inventory.json"
SELECTION = ART / "selection.json"
ANALYSIS = ART / "analysis.json"
OUT = ART / "tiers-backfill.json"

TIER_LABELS = {
    "high": "高表现",
    "median": "中位数附近",
    "average": "平均值附近",
    "low": "低表现",
}
TIER_ORDER = ["high", "average", "median", "low"]


def safe_ratio(a: float, b: float) -> float | None:
    return round(a / b, 4) if b else None


def aggregate_collection_to_like(videos: list[dict]) -> float:
    col = sum(v["collections"] for v in videos)
    like = sum(v["likes"] for v in videos)
    return round(col / like, 4) if like else None


def mean_ratio(videos: list[dict]) -> float:
    ratios = [v["collections"] / v["likes"] for v in videos if v["likes"]]
    return round(statistics.fmean(ratios), 4) if ratios else None


def build_conclusion(tier: str, videos: list[dict], baseline_ratio: float | None) -> str:
    likes = [v["likes"] for v in videos]
    n = len(videos)
    med = round(statistics.median(likes))
    avg = round(statistics.fmean(likes))
    lo = min(likes)
    hi = max(likes)
    ratio = aggregate_collection_to_like(videos)

    base = f"该档样本共 {n} 条（点赞中位数 {med}、均值 {avg}、区间 {lo}–{hi}）"
    if ratio is not None and baseline_ratio is not None:
        if ratio >= baseline_ratio * 1.2:
            relation = "明显高于整体基线"
        elif ratio <= baseline_ratio * 0.8:
            relation = "明显低于整体基线"
        else:
            relation = "接近整体基线"
        base += f"，聚合收藏/点赞比 {ratio}，{relation}（整体基线 {baseline_ratio}）"
    else:
        base += "，收藏/点赞比无法计算（存在 0 点赞或数据缺失）"
    return base + "。"


def main() -> None:
    inventory = json.loads(INVENTORY.read_text(encoding="utf-8"))
    selection = json.loads(SELECTION.read_text(encoding="utf-8"))
    # analysis.json 仅用于声明"深度样本只有 8 条"这一事实，不用于分档
    analysis = json.loads(ANALYSIS.read_text(encoding="utf-8"))

    inv_videos = inventory["videos"]
    archetype_by_id = {v["id"]: v.get("archetype") for v in selection.get("videos", [])}

    rows = []
    for v in inv_videos:
        rows.append(
            {
                "id": v["id"],
                "title": v["title"],
                "likes": v["likes"],
                "collections": v["collections"],
                "comments": v["comments"],
                "shares": v["shares"],
                "pillar": v.get("pillar"),
                "role": v.get("role"),
                "archetype": archetype_by_id.get(v["id"]),
            }
        )

    likes = [r["likes"] for r in rows]
    median = statistics.median(likes)
    mean = statistics.fmean(likes)
    band = 0.25 * mean
    band_low = mean - band
    band_high = mean + band

    baseline_ratio = aggregate_collection_to_like(rows)

    def assign(lk: int) -> str:
        if lk > band_high:
            return "high"
        if lk >= band_low:
            return "average"
        if lk >= median:
            return "median"
        return "low"

    for r in rows:
        r["tier"] = assign(r["likes"])

    tiers = []
    for tier in TIER_ORDER:
        subset = [r for r in rows if r["tier"] == tier]
        if not subset:
            continue
        slikes = sorted(r["likes"] for r in subset)
        videos_out = []
        for r in sorted(subset, key=lambda x: -x["likes"]):
            item = {
                "id": r["id"],
                "title": r["title"],
                "likes": r["likes"],
                "collections": r["collections"],
                "comments": r["comments"],
                "shares": r["shares"],
                "pillar": r["pillar"],
                "archetype": r["archetype"],
            }
            videos_out.append(item)
        tiers.append(
            {
                "tier": tier,
                "label": TIER_LABELS[tier],
                "sampleSize": len(subset),
                "medianLikes": round(statistics.median(slikes)),
                "meanLikes": round(statistics.fmean(slikes)),
                "minLikes": min(slikes),
                "maxLikes": max(slikes),
                "aggregateCollectionToLike": aggregate_collection_to_like(subset),
                "meanCollectionToLike": mean_ratio(subset),
                "conclusion": build_conclusion(tier, subset, baseline_ratio),
                "videos": videos_out,
            }
        )

    archetype_missing = sum(1 for r in rows if r["archetype"] is None)

    out = {
        "schemaVersion": "tiers-backfill-1.0",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "creator": inventory.get("creator"),
        "sourceNote": (
            "19 条全量互动数据来自 inventory.json（任务描述的 analysis.json 只有 8 条深度样本）；"
            "archetype 由 selection.json 按 id join（仅 8 条具备）。"
        ),
        "method": {
            "sample": "19 条公开笔记，likes 为主排序字段",
            "baselineMedian": round(median),
            "baselineMean": round(mean),
            "bandwidth": 0.25,
            "bandwidthOf": "arithmetic_mean",
            "bandLow": round(band_low),
            "bandHigh": round(band_high),
            "rule": {
                "high": f"likes > {round(band_high)}（明显超基线）",
                "average": f"{round(band_low)} <= likes <= {round(band_high)}（均值±25%）",
                "median": f"{round(median)} <= likes < {round(band_low)}（基线附近上）",
                "low": f"likes < {round(median)}（明显低于基线）",
            },
            "note": "带宽 25% 对齐张咋啦 averageDiagnostic 的 'within 25% of the arithmetic mean' 口径；分档为连续互斥覆盖全部样本的确定性规则。",
        },
        "baseline": {
            "aggregateCollectionToLike": baseline_ratio,
            "meanCollectionToLike": mean_ratio(rows),
        },
        "tiers": tiers,
        "missing": {
            "publishedAt": True,
            "publishedAtDetail": "inventory.json / analysis.json 的 19 条均无 publishedAt/publishedLabel 字段，发布节奏（星期/时段）无法计算。",
            "archetypeMissingCount": archetype_missing,
            "archetypeMissingIds": [r["id"] for r in rows if r["archetype"] is None],
            "analysisVideosCount": len(analysis.get("videos", [])),
        },
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps(
        {
            "ok": True,
            "output": str(OUT),
            "totalVideos": len(rows),
            "baselineMedian": round(median),
            "baselineMean": round(mean),
            "bandLow": round(band_low),
            "bandHigh": round(band_high),
            "tierCounts": {t["tier"]: t["sampleSize"] for t in tiers},
            "archetypeMissing": archetype_missing,
        },
        ensure_ascii=False,
        indent=2,
    ))


if __name__ == "__main__":
    main()
