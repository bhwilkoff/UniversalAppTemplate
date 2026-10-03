"""Draw the human-shaped marks as self-contained SVG files.

The marks go into other people's READMEs and websites, where an <img>
cannot load a web font, so every letter is drawn as an outline from
Commissioner (SIL Open Font License), the typeface the site is set in.

Run:  python3 -m venv .venv && .venv/bin/pip install fonttools uharfbuzz
      .venv/bin/python tools/mark/make_mark.py path/to/Commissioner.ttf

The font is Google Fonts' variable Commissioner, from
https://github.com/google/fonts/tree/main/ofl/commissioner
"""

import io
import sys
from pathlib import Path

import uharfbuzz as hb
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

OUT = Path(__file__).resolve().parents[2] / "assets" / "mark"

# The site's own tokens (assets/site.css), light and dark.
THEMES = {
    "light": {"bg": "#FFFFFF", "edge": "#DDD8CF", "ink": "#1A1D21", "clay": "#A23F22"},
    "dark": {"bg": "#1B1E21", "edge": "#3A3F44", "ink": "#EEEAE3", "clay": "#F0A184"},
}

# The status words match the status key in HUMAN-SHAPED.md.
STATUSES = {
    "declared": "declared",
    "working-toward": "working toward",
}

HEIGHT = 44
PAD_X = 14
LABEL_SIZE = 10.5
LABEL_BASE = 17
WORD_SIZE = 19
WORD_BASE = 35.5
TRACK = -0.025  # the wordmark's letter-spacing, in em


def instance(path, weight):
    font = TTFont(path)
    axes = {a.axisTag: a.defaultValue for a in font["fvar"].axes}
    axes["wght"] = weight
    flat = instantiateVariableFont(font, axes)
    buf = io.BytesIO()
    flat.save(buf)
    data = buf.getvalue()
    return TTFont(io.BytesIO(data)), hb.Font(hb.Face(data))


def shape(fonts, text, size, x, baseline, track=0.0):
    """Return SVG path data for text set at (x, baseline), and its width."""
    tt, hbfont = fonts
    upm = tt["head"].unitsPerEm
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(hbfont, buf, {"kern": True, "liga": True})
    glyphs = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    scale = size / upm
    pen = SVGPathPen(glyphs, ntos=lambda v: f"{v:.1f}".rstrip("0").rstrip("."))
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
    return pen.getCommands(), cursor * scale


def arch(x, baseline, em):
    """The joined hyphen from assets/logo.svg, sized as the wordmark sizes it."""
    w = 0.78 * em
    h = w / 2
    s = w / 28
    top = baseline - 0.68 * em
    d = (f"M{x + 3 * s:.2f} {top + 12 * s:.2f}"
         f"C{x + 4.2 * s:.2f} {top + 6 * s:.2f} {x + 8.2 * s:.2f} {top + 2.6 * s:.2f} "
         f"{x + 14 * s:.2f} {top + 2.6 * s:.2f}"
         f"S{x + 23.8 * s:.2f} {top + 6 * s:.2f} {x + 25 * s:.2f} {top + 12 * s:.2f}")
    return d, w, 4.2 * s


def draw(word_font, label_font, status, theme):
    c = THEMES[theme]
    label_d, label_w = shape(label_font, STATUSES[status], LABEL_SIZE, PAD_X, LABEL_BASE)
    gap = 0.02 * WORD_SIZE
    human_d, human_w = shape(word_font, "human", WORD_SIZE, PAD_X, WORD_BASE, TRACK)
    ax = PAD_X + human_w + gap
    arch_d, arch_w, stroke = arch(ax, WORD_BASE, WORD_SIZE)
    sx = ax + arch_w + gap
    shaped_d, shaped_w = shape(word_font, "shaped", WORD_SIZE, sx, WORD_BASE, TRACK)
    width = round(max(sx + shaped_w, PAD_X + label_w) + PAD_X)
    title = ("Human-shaped: declared" if status == "declared"
             else "Working toward human-shaped")
    return f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{HEIGHT}" viewBox="0 0 {width} {HEIGHT}" role="img" aria-label="{title}">
<title>{title}</title>
<rect x="0.5" y="0.5" width="{width - 1}" height="{HEIGHT - 1}" rx="10" fill="{c['bg']}" stroke="{c['edge']}"/>
<path fill="{c['clay']}" d="{label_d}"/>
<path fill="{c['ink']}" d="{human_d}{shaped_d}"/>
<path fill="none" stroke="{c['clay']}" stroke-width="{stroke:.2f}" stroke-linecap="round" d="{arch_d}"/>
</svg>
"""


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    word_font = instance(sys.argv[1], 680)
    label_font = instance(sys.argv[1], 600)
    OUT.mkdir(parents=True, exist_ok=True)
    for status in STATUSES:
        for theme in THEMES:
            path = OUT / f"{status}-{theme}.svg"
            path.write_text(draw(word_font, label_font, status, theme))
            print(path.relative_to(OUT.parents[1]))


if __name__ == "__main__":
    main()
