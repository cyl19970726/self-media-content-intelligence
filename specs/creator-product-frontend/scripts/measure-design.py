#!/usr/bin/env python3
"""Phase 2 · 设计方向图测量脚本（可复测）。

把四张 v2 方向图测量成数据：主色板、水平/垂直发丝线（masthead/rail 边界）、
深色收口区位置、文本区暗像素密度。输出 JSON 到 stdout。
用法：python3 specs/creator-product-frontend/scripts/measure-design.py
"""
import json
from collections import Counter
from pathlib import Path

from PIL import Image

DESIGNS = Path(__file__).resolve().parent.parent / "designs"
FILES = [
    "direction-v2-1-overview.png",
    "direction-v2-2-creator.png",
    "direction-v2-3-benchmark.png",
    "direction-v2-4-video.png",
]


def quantize(color: tuple[int, int, int], step: int = 16) -> tuple[int, int, int]:
    return (color[0] // step * step, color[1] // step * step, color[2] // step * step)


def dominant_colors(im: Image.Image, top: int = 6) -> list[str]:
    counter = Counter(quantize(pixel) for pixel in im.getdata())
    return ["#%02x%02x%02x" % color for color, _ in counter.most_common(top)]


def longest_horizontal_line(im: Image.Image, y: int, threshold: int = 420) -> int:
    """Length of the longest run of dark pixels in row y (发丝线检测)."""
    best = run = 0
    for x in range(im.width):
        if sum(im.getpixel((x, y))) < threshold:
            run += 1
            best = max(best, run)
        else:
            run = 0
    return best


def longest_vertical_line(im: Image.Image, x: int, threshold: int = 420) -> int:
    """Length of the longest run of dark pixels in column x."""
    best = run = 0
    for y in range(im.height):
        if sum(im.getpixel((x, y))) < threshold:
            run += 1
            best = max(best, run)
        else:
            run = 0
    return best


def find_masthead_bottom(im: Image.Image, y0: int = 0, y1: int = 260) -> int | None:
    """First row in [y0,y1) whose dark-run spans most of the width = masthead 底线."""
    for y in range(y0, y1):
        if longest_horizontal_line(im, y) > im.width * 0.6:
            return y
    return None


def find_rail_right(im: Image.Image, x0: int = 0, x1: int = 480) -> int | None:
    """First column in [x0,x1) whose dark-run spans most of the height = rail 右边线."""
    for x in range(x0, x1):
        if longest_vertical_line(im, x) > im.height * 0.5:
            return x
    return None


def find_dark_band_top(im: Image.Image, threshold: float = 0.35) -> int | None:
    """Scanning upward, the y where a wide dark band starts (深色收口区顶部)."""
    for y in range(im.height - 1, -1, -1):
        row_dark = sum(1 for x in range(0, im.width, 4) if sum(im.getpixel((x, y))) < 320)
        if row_dark < (im.width // 4) * threshold:
            return y + 1
    return None


def dark_density(im: Image.Image, box: tuple[int, int, int, int]) -> float:
    """Fraction of dark pixels in a region (文本密度粗估)."""
    x0, y0, x1, y1 = box
    total = sampled = 0
    for y in range(y0, y1, 2):
        for x in range(x0, x1, 2):
            total += 1
            if sum(im.getpixel((x, y))) < 480:
                sampled += 1
    return sampled / total


def measure(path: Path) -> dict:
    im = Image.open(path).convert("RGB")
    return {
        "size": [im.width, im.height],
        "dominantColors": dominant_colors(im),
        "mastheadBottomY": find_masthead_bottom(im),
        "railRightX": find_rail_right(im),
        "darkBandTopY": find_dark_band_top(im),
        "titleDarkDensity": dark_density(im, (0, 80, im.width, 320)),
    }


def main() -> None:
    out = {}
    for name in FILES:
        path = DESIGNS / name
        if not path.exists():
            out[name] = {"error": "missing"}
            continue
        out[name] = measure(path)
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
