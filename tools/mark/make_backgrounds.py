"""Draw the Meet backgrounds for /start/brand/ (C9 in
research/notes/meet-classroom-design.md).

Each background is 1920 by 1080, the size Google Meet asks for, with the
middle left empty: Meet puts the person in the center, so the wordmark
sits in the upper left and any arch sits high on the right, never behind
a head (DECISIONS.md, "The arch"). The wordmark is read from the files
make_brand.py already drew, so this needs no font and no libraries.

Run:  python3 tools/mark/make_backgrounds.py

It writes assets/brand/backgrounds/<name>.svg, and a PNG of each with
headless Google Chrome when it is installed.
"""

import re
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BRAND = ROOT / "assets" / "brand"
OUT = BRAND / "backgrounds"
W, H = 1920, 1080

# The site's tokens (assets/site.css): paper, surface, and rule for the
# light ones; the dark mode's paper, surface, and rule for the evening.
VARIANTS = {
    "paper": {"bg": "#F7F6F2", "floor": "#ECE7DE", "mark": "light", "arch": None},
    "paper-arch": {"bg": "#F7F6F2", "floor": "#ECE7DE", "mark": "light", "arch": "#DDD8CF"},
    "evening": {"bg": "#141618", "floor": "#1E2124", "mark": "dark", "arch": None},
    "evening-arch": {"bg": "#141618", "floor": "#1E2124", "mark": "dark", "arch": "#2F3337"},
}

# The arch's own path, from the wordmark (make_mark.arch), in its units.
ARCH = "M312.91 65.43C316.25 48.71 327.39 39.24 343.55 39.24S370.85 48.71 374.19 65.43"
ARCH_X0, ARCH_Y0, ARCH_W = 312.91, 39.24, 61.28


def wordmark(kind):
    """The wordmark's drawing, and its viewBox, from make_brand's file."""
    text = (BRAND / f"wordmark-{kind}.svg").read_text()
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', text).group(1).split()]
    body = re.search(r"(<g[\s\S]*</g>)", text).group(1)
    return body, vb


def background(v):
    body, vb = wordmark(v["mark"])
    mark_w = 420
    s = mark_w / vb[2]
    parts = [
        f'<rect width="{W}" height="{H}" fill="{v["bg"]}"/>',
        f'<rect y="{H - 170}" width="{W}" height="170" fill="{v["floor"]}"/>',
        f'<g transform="translate(96 88) scale({s:.5f})">{body}</g>',
    ]
    if v["arch"]:
        # High on the right, well clear of the middle third, with the
        # empty space below it, so it reads as the top of a head.
        k = 380 / ARCH_W
        x, y = 1440, 170
        parts.append(
            f'<path d="{ARCH}" fill="none" stroke="{v["arch"]}" stroke-width="{34 / k:.3f}" '
            f'stroke-linecap="round" transform="translate({x - ARCH_X0 * k:.2f} {y - ARCH_Y0 * k:.2f}) scale({k:.4f})"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" '
            f'role="img" aria-label="A Human Shaped background for video calls">\n'
            f'<title>Human Shaped, a background for video calls</title>\n' + "\n".join(parts) + "\n</svg>\n")


def chrome():
    for c in ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
              shutil.which("google-chrome"), shutil.which("chromium")):
        if c and Path(c).exists():
            return c
    return None


def png(browser, svg_path, png_path):
    with tempfile.TemporaryDirectory() as tmp:
        page = Path(tmp) / "p.html"
        page.write_text(f'<!doctype html><style>html,body{{margin:0}}img{{display:block;width:{W}px;height:{H}px}}</style>'
                        f'<img src="{svg_path.as_uri()}">')
        subprocess.run([browser, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                        "--allow-file-access-from-files", f"--window-size={W},{H}",
                        f"--screenshot={png_path}", page.as_uri()], check=True, capture_output=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    browser = chrome()
    for name, v in VARIANTS.items():
        svg_path = OUT / f"{name}.svg"
        svg_path.write_text(background(v))
        print("wrote", svg_path.relative_to(ROOT))
        if browser:
            png(browser, svg_path, OUT / f"{name}.png")
            print("wrote", (OUT / f"{name}.png").relative_to(ROOT))
    if not browser:
        print("Google Chrome not found, so no PNG copies were drawn.")


if __name__ == "__main__":
    main()
