#!/usr/bin/env python3
"""Phase 4 · 并排 montage 生成（可复测）。

把冻结设计图与 actual-shots/ 下的实际渲染截图按同宽对齐拼成左右并排图。
用法：python3 specs/creator-product-frontend/scripts/make-montage.py
前置：actual-shots/actual-{1..4}-*.png 已由 agent-browser 截图更新。
"""
from pathlib import Path

from PIL import Image

DESIGNS = Path(__file__).resolve().parent.parent / "designs"

PAIRS = [
    ("direction-v2-1-overview.png", "actual-shots/actual-1-overview.png", "montage-1-overview.png"),
    ("direction-v2-2-creator.png", "actual-shots/actual-2-creator.png", "montage-2-creator.png"),
    ("direction-v2-3-benchmark.png", "actual-shots/actual-3-benchmark.png", "montage-3-benchmark.png"),
    ("direction-v2-4-video.png", "actual-shots/actual-4-video.png", "montage-4-video.png"),
]

MARGIN = 6
INK = (23, 23, 19)


def main() -> None:
    for design_name, actual_name, out_name in PAIRS:
        design_path = DESIGNS / design_name
        actual_path = DESIGNS / actual_name
        if not design_path.exists() or not actual_path.exists():
            print(f"SKIP {out_name}: missing input")
            continue
        design = Image.open(design_path).convert("RGB")
        actual = Image.open(actual_path).convert("RGB")
        width = min(design.width, actual.width)
        design = design.resize((width, round(design.height * width / design.width)))
        actual = actual.resize((width, round(actual.height * width / actual.width)))
        height = max(design.height, actual.height)
        montage = Image.new("RGB", (width * 2 + MARGIN * 3, height), INK)
        montage.paste(design, (MARGIN, 0))
        montage.paste(actual, (width + MARGIN * 2, 0))
        montage.save(DESIGNS / out_name)
        print(f"{out_name} {montage.size}")


if __name__ == "__main__":
    main()
