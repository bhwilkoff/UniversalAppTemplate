// What the main stage takes from Tiny Little Office: its deck, read from
// text and drawn as SVG, with the sheet (tables, charts) and diagram apps a
// slide can hold. No editor, no links, no storage. See README.md here.
import { deckPages, slidePage, lookOf, layoutSlide, SW, SH } from '@tlo/src/apps/deck/view.ts';
import { lintDeck } from '@tlo/src/apps/deck/lint.ts';
import { slidesOf, slideText, settingsOf } from '@tlo/src/apps/deck/model.ts';
import { THEMES } from '@tlo/src/apps/deck/theme.ts';
import { parse } from '@tlo/src/doc/index.ts';
import { pageSvg } from '@tlo/src/kit/draw/draw.ts';
import { lookup } from '@tlo/src/kit/core/app.ts';
import sheet from '@tlo/src/apps/sheet/def.ts';
import diagram from '@tlo/src/apps/diagram/def.ts';

// A table on a slide is a table, not a spreadsheet: no lettered columns, no
// numbered rows. Anything with a chart is still the sheet's to draw.
const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
function tablePage(text: string) {
  const lines = text.split('\n').filter((l) => l.includes('|') && !/^[\s|:-]+$/.test(l));
  const cells = lines.map((l) => l.split('|').map((c) => c.trim().replace(/:(number|money|text|name|date|percent)$/, '')));
  const cols = Math.max(1, ...cells.map((r) => r.length));
  const W = 840, rowH = 78, cw = W / cols;
  // The longest cell sets the size, so no column runs into the next.
  const longest = Math.max(1, ...cells.flat().map((c) => c.length));
  const px = Math.max(16, Math.min(31, Math.floor((cw - 28) / (longest * 0.54))));
  const svg = cells.map((row, i) => {
    const y = i * rowH;
    const words = row.map((c, j) => `<text x="${j * cw + 16}" y="${y + 50}" font-size="${px}" font-weight="${i ? 400 : 600}" fill="${i ? '#18181b' : '#52525b'}">${esc(c)}</text>`).join('');
    return words + `<line x1="0" y1="${y + rowH}" x2="${W}" y2="${y + rowH}" stroke="#d4d4d8" stroke-width="1"/>`;
  }).join('');
  return { w: W, h: cells.length * rowH + 2, svg, alt: cells.map((r) => r.join(', ')).join('. ') };
}
const plainSheet = { ...sheet, view: (body: string, o: any) => (/^chart:/m.test(body) ? sheet.view(body, o) : [tablePage(body)]) };
// A picture on a slide, beside or under its words (Ben, November 12, 2026:
// "add images to slides ... we can certainly build that feature"). The block's
// first line is an https address; "alt:" gives the words read out in its place,
// and "size: 1600x900" its shape when known. The kit fits it like any document.
const image = {
  view: (body: string) => {
    const lines = String(body || '').split('\n').map((l) => l.trim()).filter(Boolean);
    const url = lines.find((l) => /^https:\/\/\S+$/.test(l)) || '';
    const alt = (lines.find((l) => /^alt:/i.test(l)) || '').replace(/^alt:\s*/i, '') || 'A picture';
    const m = /^size:\s*(\d{2,5})\s*x\s*(\d{2,5})/i.exec(lines.find((l) => /^size:/i.test(l)) || '');
    const w = m ? Number(m[1]) : 1600, h = m ? Number(m[2]) : 900;
    const svg = url ? `<image href="${esc(url)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>` : '';
    return [{ w, h, svg, alt }];
  },
};
const INSIDE: Record<string, any> = { sheet: plainSheet, diagram, image };
lookup.appOf = (id: string) => INSIDE[id];

// The site's dark palette (assets/site.css), and its typeface.
THEMES.humanshaped = { name: () => 'Human Shaped', dark: true, paper: '#131916', ink: '#E8EDEA', muted: '#C1CAC5', accent: '#DCC4F0' };
// The renderer lays white under every page, which bleeds through at a dark
// slide's edges when the stage scales it.
const CARD = '#1B2320';
// Documents are drawn for white paper. On a dark slide each color moves to its
// place in the site's palette, so a chart belongs to the slide it is on.
const SWAP: Record<string, string> = {
  '#fff': CARD, '#ffffff': CARD, '#f4f4f5': '#28302C', '#d4d4d8': '#3A4540',
  '#18181b': '#E8EDEA', '#52525b': '#C1CAC5',
  '#0072b2': '#DCC4F0', '#d55e00': '#8FD6B4', '#009e73': '#F2C879', '#a05ca8': '#9CC7F0', '#b3261e': '#F2A79C',
};
const paint = (svg: string) => svg.replace(/#[0-9a-fA-F]{3,6}\b/g, (c) => SWAP[c.toLowerCase()] ?? c);
function restyle(svg: string): string {
  const at = svg.indexOf('<svg', 10);
  const start = svg.indexOf('<rect', 0);
  const inner = at > 0 ? paint(svg.slice(at)) : '';
  const head = (at > 0 ? svg.slice(0, at) : svg).replace(/fill="#ffffff" rx="12"/, `fill="${CARD}" rx="12"`);
  return start >= 0 ? head + inner : svg;
}
const type = (svg: string) => restyle(svg.replace(/'IBM Plex Sans'/g, 'Commissioner').replace('<rect width="960" height="600" fill="#ffffff"/>', ''));

// Pictures written as ![words](https://...) on a slide with other words: the
// slide becomes two columns, the words on the left, and the picture is drawn
// into the right column's box, as the renderer measured it. A slide with only a
// headline and a picture takes the picture as its document, under the headline.
// (A slide that is only a picture is drawn whole by the site, SlidesLib.render.)
const PICTURE = /^!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)\s*$/;
function chunks(text: string): { head: string; slides: string[] } {
  let head = '', rest = text;
  const m = /^---\n[\s\S]*?\n---\n/.exec(text);
  if (m) { head = m[0]; rest = text.slice(m[0].length); }
  const slides: string[][] = [[]];
  let fence = false;
  for (const line of rest.split('\n')) {
    if (/^```/.test(line)) fence = !fence;
    if (!fence && /^---\s*$/.test(line)) { slides.push([]); continue; }
    slides[slides.length - 1].push(line);
  }
  return { head, slides: slides.map((l) => l.join('\n')) };
}
function withPictures(text: string): { text: string; pics: Map<number, { url: string; alt: string }> } {
  const { head, slides } = chunks(text);
  const pics = new Map<number, { url: string; alt: string }>();
  let n = -1;
  const out = slides.map((slide) => {
    if (!slide.trim()) return slide;
    n += 1;
    const lines = slide.split('\n');
    const at = lines.findIndex((l) => PICTURE.test(l.trim()));
    if (at < 0) return slide;
    const [, alt, url] = PICTURE.exec(lines[at].trim()) as RegExpExecArray;
    const others = lines.filter((l, i) => i !== at && l.trim() && !l.startsWith('>'));
    const words = others.filter((l) => !/^#{1,6}\s/.test(l));
    if (!others.length) return slide;
    if (!words.length) {
      lines[at] = '```image\n' + url + '\nalt: ' + (alt || 'A picture') + '\n```';
      return lines.join('\n');
    }
    pics.set(n, { url, alt: alt || 'A picture' });
    const kept = lines.filter((_, i) => i !== at);
    const h = kept.findIndex((l) => /^##\s/.test(l));
    if (h >= 0) kept[h] = /\{[^}]*\}\s*$/.test(kept[h]) ? kept[h].replace(/\{([^}]*)\}\s*$/, (_, c) => '{' + c.replace(/\.(title|icon|two)\b/g, '').trim() + ' .two}') : kept[h] + ' {.two}';
    else kept.unshift('## {.two}');
    const notesAt = kept.findIndex((l) => l.startsWith('>'));
    if (notesAt >= 0) kept.splice(notesAt, 0, '', '|', ''); else kept.push('', '|');
    return kept.join('\n');
  });
  return { text: head + out.join('\n---\n'), pics };
}
function placePicture(svg: string, text: string, i: number, pic: { url: string; alt: string }): string {
  const doc = parse(text);
  const s = slidesOf(doc)[i];
  if (!s) return svg;
  const box = layoutSlide(s).cols[1];
  if (!box) return svg;
  const img = `<image href="${esc(pic.url)}" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" preserveAspectRatio="xMidYMid meet"><title>${esc(pic.alt)}</title></image>`;
  const end = svg.lastIndexOf('</svg>');
  return end > 0 ? svg.slice(0, end) + img + svg.slice(end) : svg;
}
export const render = (raw: string): string[] => {
  const { text, pics } = withPictures(raw);
  return deckPages(text).map((p: any, i: number) => {
    const svg = type(pageSvg(p, 'class="deck-slide" preserveAspectRatio="xMidYMid meet"'));
    const pic = pics.get(i);
    return pic ? placePicture(svg, text, i, pic) : svg;
  });
};
// One slide, with only its first `shown` lines drawn; the rest keep their place.
export function frame(raw: string, slide: number, shown: number): string {
  const { text, pics } = withPictures(raw);
  const doc = parse(text);
  const s = slidesOf(doc)[slide];
  if (!s) return '';
  const p = slidePage(doc, s, lookOf(settingsOf(doc)), shown);
  const svg = type(pageSvg(p, 'class="deck-slide" preserveAspectRatio="xMidYMid meet"'));
  const pic = pics.get(slide);
  return pic ? placePicture(svg, text, slide, pic) : svg;
}
export const lint = (text: string) => lintDeck(text);
export const words = (raw: string): string[] => { const { text, pics } = withPictures(raw); return slidesOf(parse(text)).map((s: any, i: number) => (pics.get(i) ? [...slideText(s), pics.get(i)!.alt] : slideText(s))); };
