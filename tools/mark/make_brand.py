"""Draw the brand kit for /start/brand/ as self-contained files.

The wordmark, the icon, and the event lockups go onto flyers, slides,
and other people's websites, where a web font cannot be counted on, so
every letter is drawn as an outline from Commissioner (SIL Open Font
License), the typeface the site is set in. The arch is the same shape
as the joined hyphen in assets/logo.svg, placed the way the site's
wordmark places it (DECISIONS.md, "The arch").

Run:  python3 -m venv .venv && .venv/bin/pip install fonttools uharfbuzz
      .venv/bin/python tools/mark/make_brand.py path/to/Commissioner.ttf

The font is Google Fonts' variable Commissioner, from
https://github.com/google/fonts/tree/main/ofl/commissioner (never
commit it). PNG copies are drawn with headless Google Chrome when it is
installed; without it, only the SVG files are written.
"""

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

from make_mark import arch, instance, shape

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets" / "brand"

# The site's tokens (assets/site.css). "light" is for light backgrounds,
# "dark" for dark ones; the one-color versions are for photocopies,
# stamps, and anything printed in a single ink.
COLORS = {
    "light": {"ink": "#162019", "accent": "#1F4D3A"},
    "dark": {"ink": "#E6EEEA", "accent": "#DCC4F0"},
    "black": {"ink": "#000000", "accent": "#000000"},
    "white": {"ink": "#FFFFFF", "accent": "#FFFFFF"},
}
PAPER = "#FFFFFF"
FOREST = "#1F4D3A"
THISTLE = "#DCC4F0"

SIZE = 100          # the wordmark's type size, in SVG units
TRACK = -0.025      # the wordmark's letter-spacing, in em
GAP = 0.02          # the space on each side of the arch, in em
EVENTS = {"meetup": "meetup", "hackathon": "hackathon"}


def bounds(fonts, text, size, x, baseline, track=0.0):
    """The ink box of text set as shape() sets it."""
    import uharfbuzz as hb
    tt, hbfont = fonts
    upm = tt["head"].unitsPerEm
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hbfont, buf, {"kern": True, "liga": True})
    glyphs = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    scale = size / upm
    pen = BoundsPen(glyphs)
    cursor = 0.0
    n = len(buf.glyph_infos)
    for i, (info, pos) in enumerate(zip(buf.glyph_infos, buf.glyph_positions)):
        gx = x + (cursor + pos.x_offset) * scale
        gy = baseline - pos.y_offset * scale
        glyphs[order[info.codepoint]].draw(
            TransformPen(pen, (scale, 0, 0, -scale, gx, gy)))
        cursor += pos.x_advance
        if i < n - 1:
            cursor += track * upm
    return pen.bounds  # (xMin, yMin, xMax, yMax) in SVG coordinates


def wordmark(word_font, size, x, baseline):
    """Path data for "human", the arch, and "shaped", and the right edge."""
    human_d, human_w = shape(word_font, "human", size, x, baseline, TRACK)
    ax = x + human_w + GAP * size
    arch_d, arch_w, stroke = arch(ax, baseline, size)
    sx = ax + arch_w + GAP * size
    shaped_d, shaped_w = shape(word_font, "shaped", size, sx, baseline, TRACK)
    box = bounds(word_font, "human", size, x, baseline, TRACK)
    box2 = bounds(word_font, "shaped", size, sx, baseline, TRACK)
    top = min(box[1], box2[1])
    bottom = max(box[3], box2[3])
    return {
        "letters": human_d + shaped_d, "arch": arch_d, "stroke": stroke,
        "left": box[0], "right": box2[2], "top": top, "bottom": bottom,
    }


def svg(width, height, title, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width:.0f}" height="{height:.0f}" '
            f'viewBox="0 0 {width:.2f} {height:.2f}" role="img" aria-label="{title}">\n'
            f"<title>{title}</title>\n{body}</svg>\n")


def draw_wordmark(word_font, colors):
    w = wordmark(word_font, SIZE, 0, SIZE)
    dx, dy = -w["left"], -w["top"]
    width, height = w["right"] - w["left"], w["bottom"] - w["top"]
    body = (f'<g transform="translate({dx:.2f} {dy:.2f})">\n'
            f'<path fill="{colors["ink"]}" d="{w["letters"]}"/>\n'
            f'<path fill="none" stroke="{colors["accent"]}" stroke-width="{w["stroke"]:.2f}" '
            f'stroke-linecap="round" d="{w["arch"]}"/>\n</g>\n')
    return svg(width, height, "Human Shaped", body)


def draw_event(word_font, label_font, event, colors):
    """The wordmark with the kind of event beneath it, flush left."""
    w = wordmark(word_font, SIZE, 0, SIZE)
    label_size = 0.62 * SIZE
    label_base = w["bottom"] + 0.30 * SIZE + 0.72 * label_size
    label_d, _ = shape(label_font, EVENTS[event], label_size, w["left"], label_base, -0.01)
    lb = bounds(label_font, EVENTS[event], label_size, w["left"], label_base, -0.01)
    left = min(w["left"], lb[0])
    width = max(w["right"], lb[2]) - left
    height = lb[3] - w["top"]
    body = (f'<g transform="translate({-left:.2f} {-w["top"]:.2f})">\n'
            f'<path fill="{colors["ink"]}" d="{w["letters"]}"/>\n'
            f'<path fill="none" stroke="{colors["accent"]}" stroke-width="{w["stroke"]:.2f}" '
            f'stroke-linecap="round" d="{w["arch"]}"/>\n'
            f'<path fill="{colors["accent"]}" d="{label_d}"/>\n</g>\n')
    return svg(width, height, f"Human-Shaped {event.capitalize()}", body)


def draw_icon():
    """The favicon's geometry: the arch high in a forest square, so it reads
    as the top of a head and never as a frown."""
    body = (f'<rect width="32" height="32" rx="8" fill="{FOREST}"/>\n'
            f'<path d="M7.5 16C8.43 10.56 11.52 7.5 16 7.5S23.57 10.56 24.5 16" fill="none" '
            f'stroke="{THISTLE}" stroke-width="4.4" stroke-linecap="round"/>\n')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 32 32" '
            f'role="img" aria-label="Human Shaped">\n<title>Human Shaped</title>\n{body}</svg>\n')


def chrome():
    for c in ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
              shutil.which("google-chrome"), shutil.which("chromium")):
        if c and Path(c).exists():
            return c
    return None


def png(browser, svg_path, png_path, width):
    """Draw an SVG at a given pixel width on a transparent background."""
    text = svg_path.read_text()
    vb = [float(v) for v in text.split('viewBox="')[1].split('"')[0].split()]
    height = round(width * vb[3] / vb[2])
    with tempfile.TemporaryDirectory() as tmp:
        page = Path(tmp) / "p.html"
        page.write_text(
            f'<!doctype html><style>html,body{{margin:0;background:transparent}}'
            f'img{{display:block;width:{width}px;height:{height}px}}</style>'
            f'<img src="{svg_path.as_uri()}">')
        subprocess.run([browser, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                        "--allow-file-access-from-files", "--default-background-color=00000000",
                        f"--window-size={max(width, 500)},{max(height, 500)}",
                        f"--screenshot={tmp}/shot.png", page.as_uri()],
                       check=True, capture_output=True)
        # Crop the window down to the image (the window is at least 500 square).
        crop_png(Path(tmp) / "shot.png", png_path, width, height)


def crop_png(src, dst, width, height):
    """Crop the top-left width x height of an RGBA PNG, with no libraries."""
    import struct
    import zlib
    data = src.read_bytes()
    pos, chunks = 8, []
    while pos < len(data):
        n = struct.unpack(">I", data[pos:pos + 4])[0]
        kind = data[pos + 4:pos + 8]
        chunks.append((kind, data[pos + 8:pos + 8 + n]))
        pos += 12 + n
    ihdr = dict(chunks)[b"IHDR"]
    w, h, depth, ctype = struct.unpack(">IIBB", ihdr[:10])
    if depth != 8 or ctype != 6:
        raise SystemExit(f"unexpected PNG type {depth}/{ctype} from Chrome")
    raw = zlib.decompress(b"".join(c for k, c in chunks if k == b"IDAT"))
    stride, bpp = w * 4, 4
    rows, prev, i = [], bytearray(stride), 0
    for _ in range(h):
        f, line = raw[i], bytearray(raw[i + 1:i + 1 + stride])
        i += 1 + stride
        for x in range(stride):
            a = line[x - bpp] if x >= bpp else 0
            b = prev[x]
            c = prev[x - bpp] if x >= bpp else 0
            if f == 1: line[x] = (line[x] + a) & 255
            elif f == 2: line[x] = (line[x] + b) & 255
            elif f == 3: line[x] = (line[x] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pr = a if pa <= pb and pa <= pc else (b if pb <= pc else c)
                line[x] = (line[x] + pr) & 255
        rows.append(bytes(line))
        prev = line
    out = b"".join(b"\x00" + r[:width * 4] for r in rows[:height])

    def chunk(kind, body):
        return (struct.pack(">I", len(body)) + kind + body
                + struct.pack(">I", zlib.crc32(kind + body) & 0xFFFFFFFF))
    dst.write_bytes(b"\x89PNG\r\n\x1a\n"
                    + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
                    + chunk(b"IDAT", zlib.compress(out, 9)) + chunk(b"IEND", b""))


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    word_font = instance(sys.argv[1], 680)
    label_font = instance(sys.argv[1], 600)
    OUT.mkdir(parents=True, exist_ok=True)
    files = []
    for name, colors in COLORS.items():
        p = OUT / f"wordmark-{name}.svg"
        p.write_text(draw_wordmark(word_font, colors))
        files.append(p)
    for event in EVENTS:
        for name in ("light", "dark"):
            p = OUT / f"{event}-{name}.svg"
            p.write_text(draw_event(word_font, label_font, event, COLORS[name]))
            files.append(p)
    p = OUT / "icon.svg"
    p.write_text(draw_icon())
    files.append(p)
    for f in files:
        print(f.relative_to(ROOT))

    browser = chrome()
    if not browser:
        print("Google Chrome not found, so no PNG copies were drawn.")
        return
    for f, width in [(OUT / "wordmark-light.svg", 1600), (OUT / "wordmark-dark.svg", 1600),
                     (OUT / "icon.svg", 512)]:
        target = f.with_suffix(".png")
        png(browser, f, target, width)
        print(target.relative_to(ROOT))


if __name__ == "__main__":
    main()
