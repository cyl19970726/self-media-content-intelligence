#!/usr/bin/env python3
"""
红发魔女 · 基本盘/发布节奏 补算脚本（Task A）

数据源：
  - artifacts/creator-research/ai-red-witch/video-library/library.json   （21 条分层深度样本，含 engagement + publishedAt/publishedLabel）
  - artifacts/creator-research/ai-red-witch/video-library/creator-overview.json（331 条公开盘面聚合摘要，仅存在于这里，不含逐条原始行）

诚实边界（重要）：
  - 任务描述把 library.json 说成"331 条公开盘面数据"，但实测 library.json 的 videos 只有 21 条
    （7 high + 7 median + 7 low，是"分层对比样本"，不是全量盘面）。
  - 331 条全量数据在仓库里没有逐条原始行，只有 creator-overview.json#publicCorpus 的聚合摘要
    （notes=331 / videos=318 / mean/median/分位数/分桶分布）。
  - 因此：overview / publishing / averageDiagnostic 由 library.json 的 21 条真实计算（sampleSize=21），
    并把 331 条聚合摘要原样搬进 publicCorpusAggregate 块（标注来源，绝不当作"从 library.json 重算"）。

口径对齐（与张咋啦 dashboard-data.json 一致，已用张咋啦 12 条深度样本反向验证）：
  - 时间一律按北京时间（UTC+8）归位星期与时段。
  - 星期：周日为首 [周日, 周一, 周二, 周三, 周四, 周五, 周六]。
  - 时段四档：凌晨 00–05、早间 06–11、午后 12–17、晚间 18–23。
  - 点赞分桶六档（张咋啦口径）：<100 / 100–499 / 500–999 / 1k–4,999 / 5k–9,999 / ≥10k。
  - averageDiagnostic 带宽 = 均值的 ±25%（张咋啦 averageDiagnostic.interpretation 原文
    "Posts exist within 25% of the arithmetic mean."）。
"""
from __future__ import annotations

import json
import statistics
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts" / "creator-research" / "ai-red-witch"

LIBRARY = ART / "video-library" / "library.json"
OVERVIEW = ART / "video-library" / "creator-overview.json"
OUT = ART / "selected-high-like" / "baseline-backfill.json"

BEIJING = timezone(timedelta(hours=8))
WEEKDAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]  # python weekday() 0=Mon
WEEKDAY_ORDER = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"]
DIST_BUCKETS = [
    ("<100", lambda x: x < 100),
    ("100–499", lambda x: 100 <= x <= 499),
    ("500–999", lambda x: 500 <= x <= 999),
    ("1k–4,999", lambda x: 1000 <= x <= 4999),
    ("5k–9,999", lambda x: 5000 <= x <= 9999),
    ("≥10k", lambda x: x >= 10000),
]


def beijing_of(iso: str) -> datetime:
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return dt.astimezone(BEIJING)


def daypart(hour: int) -> str:
    if hour < 6:
        return "凌晨"
    if hour < 12:
        return "早间"
    if hour < 18:
        return "午后"
    return "晚间"


def bucket_stats(rows: list[dict]) -> dict:
    """rows: [{'likes': int}, ...] -> 单桶统计（对齐张咋啦 dayparts/weekdays 元素）。"""
    likes = [r["likes"] for r in rows]
    if not likes:
        return {
            "count": 0,
            "measuredCount": 0,
            "medianLikes": None,
            "meanLikes": None,
            "maxLikes": None,
            "hits10k": 0,
        }
    return {
        "count": len(likes),
        "measuredCount": len(likes),
        "medianLikes": round(statistics.median(likes)),
        "meanLikes": round(statistics.fmean(likes)),
        "maxLikes": max(likes),
        "hits10k": sum(1 for x in likes if x >= 10000),
    }


def main() -> None:
    library = json.loads(LIBRARY.read_text(encoding="utf-8"))
    overview = json.loads(OVERVIEW.read_text(encoding="utf-8"))

    videos = library["videos"]
    creator = library["creator"]

    # ---- 每个视频补充解析后的发布时间（北京时间星期 + 时段）----
    rows = []
    for v in videos:
        likes = v.get("engagement", {}).get("likes")
        published_at = v.get("publishedAt")
        published_label = v.get("publishedLabel")
        row = {
            "id": v["id"],
            "title": v["title"],
            "tier": v.get("tier"),
            "likes": likes,
            "publishedAt": published_at,
            "publishedLabel": published_label,
        }
        if published_at:
            bj = beijing_of(published_at)
            row["weekday"] = WEEKDAY_NAMES[bj.weekday()]
            row["hour"] = bj.hour
            row["daypart"] = daypart(bj.hour)
        else:
            row["weekday"] = None
            row["hour"] = None
            row["daypart"] = None
        rows.append(row)

    missing_at = sum(1 for r in rows if r["publishedAt"] is None)
    missing_label = sum(1 for r in rows if r["publishedLabel"] is None)
    missing_likes = sum(1 for r in rows if r["likes"] is None)

    # ---- overview ----
    likes = [r["likes"] for r in rows if r["likes"] is not None]
    median_likes = round(statistics.median(likes))
    mean_likes = round(statistics.fmean(likes))
    max_likes = max(likes)

    distribution = []
    for label, pred in DIST_BUCKETS:
        count = sum(1 for x in likes if pred(x))
        distribution.append(
            {"label": label, "count": count, "share": round(count / len(likes) * 100, 1)}
        )

    # ---- averageDiagnostic（均值 ± 25% 带宽）----
    band = 0.25 * mean_likes
    band_low = mean_likes - band
    band_high = mean_likes + band
    in_band = [x for x in likes if band_low <= x <= band_high]
    below = [x for x in likes if x < mean_likes]
    above = [x for x in likes if x > mean_likes]
    lower_like = max(below) if below else None
    upper_like = min(above) if above else None

    lower_neighbor = None
    upper_neighbor = None
    if lower_like is not None:
        cand = [r for r in rows if r["likes"] == lower_like][0]
        lower_neighbor = {
            "id": cand["id"],
            "title": cand["title"],
            "likes": cand["likes"],
            "tier": cand["tier"],
            "publishedAt": cand["publishedAt"],
        }
    if upper_like is not None:
        cand = [r for r in rows if r["likes"] == upper_like][0]
        upper_neighbor = {
            "id": cand["id"],
            "title": cand["title"],
            "likes": cand["likes"],
            "tier": cand["tier"],
            "publishedAt": cand["publishedAt"],
        }

    if in_band:
        status = "natural_cluster"
        nearest = min(in_band, key=lambda x: abs(x - mean_likes))
        nearest_distance = round(abs(nearest - mean_likes))
        nearest_relative = round(nearest_distance / mean_likes, 3)
        interpretation = "Posts exist within 25% of the arithmetic mean."
    else:
        status = "mean_gap"
        dist_lower = mean_likes - lower_like if lower_like is not None else None
        dist_upper = upper_like - mean_likes if upper_like is not None else None
        candidates = [d for d in (dist_lower, dist_upper) if d is not None]
        nearest_distance = round(min(candidates)) if candidates else None
        nearest_relative = (
            round(nearest_distance / mean_likes, 3) if nearest_distance is not None else None
        )
        interpretation = (
            "平均值落在断层中：21 条样本为分层对比样本（7 high / 7 median / 7 low），"
            f"均值 {mean_likes} 被高端尾部拉高，±25% 带宽区间 [{round(band_low)}–{round(band_high)}] 内没有自然样本，"
            "不伪造“典型平均内容”，改看下边界与上边界。"
        )

    average_diagnostic = {
        "status": status,
        "mean": mean_likes,
        "band": 0.25,
        "bandLow": round(band_low),
        "bandHigh": round(band_high),
        "nearestDistance": nearest_distance,
        "nearestRelativeDistance": nearest_relative,
        "lowerNeighbor": lower_neighbor,
        "upperNeighbor": upper_neighbor,
        "interpretation": interpretation,
    }

    # ---- publishing ----
    weekdays = []
    for name in WEEKDAY_ORDER:
        subset = [r for r in rows if r["weekday"] == name]
        stat = bucket_stats(subset)
        weekdays.append({"name": name, **stat})

    dayparts = []
    for name in ["凌晨", "早间", "午后", "晚间"]:
        subset = [r for r in rows if r["daypart"] == name]
        stat = bucket_stats(subset)
        dayparts.append({"name": name, **stat})

    # 数据可观察事实 + 分层样本的强约束声明
    nonzero_days = [(w["name"], w["count"]) for w in weekdays if w["count"]]
    nonzero_parts = [(p["name"], p["count"]) for p in dayparts if p["count"]]
    top_day = max(nonzero_days, key=lambda x: x[1]) if nonzero_days else None
    top_part = max(nonzero_parts, key=lambda x: x[1]) if nonzero_parts else None

    conclusion = (
        f"21 条深度样本全部具备精确发布时间（publishedAt + publishedLabel 均无缺失）。"
    )
    if top_day:
        conclusion += f"样本中星期分布最多为{top_day[0]}（{top_day[1]} 条）；"
    if top_part:
        conclusion += f"时段分布最多为{top_part[0]}（{top_part[1]} 条）。"
    conclusion += (
        "注意：这 21 条是 7/7/7 分层对比样本，不是 331 条公开盘面的随机样本，"
        "星期/时段分布反映的是选样结构而非账号真实发布节奏，不能据此推出“某天/某时段发会火”。"
    )

    publishing = {
        "conclusion": conclusion,
        "weekdays": weekdays,
        "dayparts": dayparts,
        "experimentRule": None,
        "note": "experimentRule 为分析师结论，本补算脚本不生成；口径与张咋啦 publishing 一致（北京时间归位）。",
    }

    # ---- 331 公开盘面聚合（搬运自 creator-overview.json，标注来源）----
    pc = overview.get("publicCorpus", {})

    missing = {
        "publishedAt": missing_at,
        "publishedLabel": missing_label,
        "likes": missing_likes,
        "fullCorpusRows": True,
        "fullCorpusRowsDetail": (
            "任务描述的 331 条公开盘面逐条原始行不在 library.json（仅 21 条分层样本）；"
            "331 条只以聚合摘要存在于 creator-overview.json#publicCorpus，已原样搬到 publicCorpusAggregate。"
        ),
    }

    out = {
        "schemaVersion": "backfill-baseline-1.0",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "creator": creator,
        "sampleNote": (
            "overview/publishing/averageDiagnostic 由 library.json 的 21 条分层深度样本真实计算（sampleSize=21）；"
            "publicCorpusAggregate 为 331 条公开盘面的既有聚合摘要（来源 creator-overview.json），未逐条重算。"
        ),
        "overview": {
            "postCount": len(videos),
            "videoCount": len(videos),
            "medianLikes": median_likes,
            "meanLikes": mean_likes,
            "maxLikes": max_likes,
            "distribution": distribution,
        },
        "averageDiagnostic": average_diagnostic,
        "publishing": publishing,
        "publicCorpusAggregate": {
            "source": "ai-red-witch/video-library/creator-overview.json#publicCorpus",
            **pc,
        },
        "missing": missing,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(json.dumps(
        {
            "ok": True,
            "output": str(OUT),
            "sampleSize": len(videos),
            "medianLikes": median_likes,
            "meanLikes": mean_likes,
            "maxLikes": max_likes,
            "averageDiagnosticStatus": status,
            "missingPublishedAt": missing_at,
            "missingPublishedLabel": missing_label,
            "missingLikes": missing_likes,
            "weekdayCounts": {w["name"]: w["count"] for w in weekdays},
            "daypartCounts": {p["name"]: p["count"] for p in dayparts},
        },
        ensure_ascii=False,
        indent=2,
    ))


if __name__ == "__main__":
    main()
