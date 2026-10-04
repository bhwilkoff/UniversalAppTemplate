"""Draw everything the Google Workspace Marketplace listing needs for the
Meet add-on (C3; tools/meet-addon/LISTING.md says where each file goes).

- Icons at 32, 48, 96, and 128 pixels, and Meet's 512-pixel logos, light
  and dark. The Marketplace asks for square icons with transparent
  backgrounds, in color; so these are the site's own tile (the arch high
  on it, never a frown, DECISIONS.md "The arch") with its corners left
  transparent. The dark logo turns the tile light so it stands out on
  Meet's dark side panel.
- The 220 by 140 card banner: the wordmark on paper.
- Three 1280 by 800 screenshots of the real add-on pages, side panel and
  main stage, drawn with SAMPLE DATA: a small local server hands the
  pages stand-ins for the database and for Meet's SDK
  (tools/meet-addon/listing/fixture/), so no network and no real person
  is involved. The site itself never loads those stand-ins.

Run:  python3 tools/mark/make_listing.py

It needs Google Chrome (headless) and macOS's sips for resizing, and
writes tools/meet-addon/listing/ and assets/brand/meet-logo-*.png.
"""

import functools
import http.server
import re
import shutil
import subprocess
import tempfile
import threading
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BRAND = ROOT / "assets" / "brand"
OUT = ROOT / "tools" / "meet-addon" / "listing"
FIXTURE = "/tools/meet-addon/listing/fixture/"

PAPER, INK, CLAY, CLAY_DARK, NIGHT = "#F7F6F2", "#1A1D21", "#A23F22", "#F0A184", "#141618"

# The tile and arch from assets/brand/icon.svg, in its 32-unit square.
ARCH = "M7.5 16C8.43 10.56 11.52 7.5 16 7.5S23.57 10.56 24.5 16"


def tile(fill, stroke):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 32 32">'
            f'<rect width="32" height="32" rx="8" fill="{fill}"/>'
            f'<path d="{ARCH}" fill="none" stroke="{stroke}" stroke-width="4.4" stroke-linecap="round"/></svg>')


def banner():
    text = (BRAND / "wordmark-light.svg").read_text()
    vb = [float(v) for v in re.search(r'viewBox="([^"]+)"', text).group(1).split()]
    body = re.search(r"(<g[\s\S]*</g>)", text).group(1)
    w, h = 880, 560
    mark_w = 640
    s = mark_w / vb[2]
    y = (h - vb[3] * s) / 2
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
            f'<rect width="{w}" height="{h}" fill="{PAPER}"/>'
            f'<g transform="translate({(w - mark_w) / 2:.1f} {y:.1f}) scale({s:.5f})">{body}</g></svg>')


def chrome():
    for c in ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
              shutil.which("google-chrome"), shutil.which("chromium")):
        if c and Path(c).exists():
            return c
    raise SystemExit("Google Chrome is needed to draw the listing images.")


def shoot(browser, url, png, w, h, transparent=False, wait_ms=0):
    args = [browser, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--window-size={w},{h}",
            f"--screenshot={png}"]
    if transparent:
        args.append("--default-background-color=00000000")
    if wait_ms:
        args.append(f"--virtual-time-budget={wait_ms}")
    subprocess.run(args + [url], check=True, capture_output=True)


def svg_page(svg, w, h, tmp, name):
    page = Path(tmp) / f"{name}.html"
    page.write_text(f'<!doctype html><html><body style="margin:0;background:transparent">'
                    f'<div style="width:{w}px;height:{h}px">{svg.replace("<svg ", f"<svg style=\"width:{w}px;height:{h}px;display:block\" ", 1)}</div></body></html>')
    return page.as_uri()


def resize(src, dst, size):
    shutil.copyfile(src, dst)
    subprocess.run(["sips", "-z", str(size[1]), str(size[0]), str(dst)], check=True, capture_output=True)


class Handler(http.server.SimpleHTTPRequestHandler):
    """Serves the site, but hands the add-on pages the sample stand-ins."""

    def log_message(self, *a):
        pass

    def do_GET(self):
        path = self.path.split("?")[0]
        if path in ("/addon/", "/addon/stage/"):
            html = (ROOT / path.strip("/") / "index.html").read_text()
            html = re.sub(r'<script src="https://cdn\.jsdelivr\.net/npm/@supabase/[^"]+" defer></script>',
                          f'<script src="{FIXTURE}sample-hub.js" defer></script>', html)
            html = re.sub(r'<script src="https://www\.gstatic\.com/meetjs/[^"]+" defer></script>',
                          f'<script src="{FIXTURE}sample-meet.js" defer></script>', html)
            body = html.encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


SCREENS = [
    ("1-welcome", "welcome", "Now"),
    ("2-question", "check", "Checks"),
    ("3-showing-work", "item", "Queue"),
]


def main():
    browser = chrome()
    OUT.mkdir(parents=True, exist_ok=True)
    icons = {"light": tile(CLAY, PAPER), "dark": tile(CLAY_DARK, NIGHT)}
    with tempfile.TemporaryDirectory() as tmp:
        for kind, svg in icons.items():
            (OUT / f"logo-{kind}.svg").write_text(svg + "\n")
            master = Path(tmp) / f"logo-{kind}.png"
            shoot(browser, svg_page(svg, 512, 512, tmp, f"logo-{kind}"), master, 512, 512, transparent=True)
            shutil.copyfile(master, OUT / f"logo-{kind}-512.png")
            shutil.copyfile(master, BRAND / f"meet-logo-{kind}.png")
            if kind == "light":
                for n in (32, 48, 96, 128):
                    resize(master, OUT / f"icon-{n}.png", (n, n))
        b = banner()
        (OUT / "banner.svg").write_text(b + "\n")
        big = Path(tmp) / "banner.png"
        shoot(browser, svg_page(b, 880, 560, tmp, "banner"), big, 880, 560)
        resize(big, OUT / "banner-220x140.png", (220, 140))

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    port = server.server_address[1]
    try:
        for name, scene, tab in SCREENS:
            url = f"http://127.0.0.1:{port}{FIXTURE}frame.html?stage={scene}&panel={tab}"
            shoot(browser, url, OUT / f"screenshot-{name}.png", 1280, 800, wait_ms=6000)
    finally:
        server.shutdown()
    print("Wrote", ", ".join(sorted(p.name for p in OUT.glob("*.png"))))


if __name__ == "__main__":
    main()
