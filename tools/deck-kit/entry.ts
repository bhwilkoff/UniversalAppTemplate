// What the main stage takes from Tiny Little Office: its deck, read from
// text and drawn as SVG, with the sheet (tables, charts) and diagram apps a
// slide can hold. No editor, no links, no storage. See README.md here.
import { deckPages, slidePage, lookOf, SW, SH } from '@tlo/src/apps/deck/view.ts';
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
  const svg = cells.map((row, i) => {
    const y = i * rowH;
    const words = row.map((c, j) => `<text x="${j * cw + 16}" y="${y + 50}" font-size="31" font-weight="${i ? 400 : 600}" fill="${i ? '#18181b' : '#52525b'}">${esc(c)}</text>`).join('');
    return words + `<line x1="0" y1="${y + rowH}" x2="${W}" y2="${y + rowH}" stroke="#d4d4d8" stroke-width="1"/>`;
  }).join('');
  return { w: W, h: cells.length * rowH + 2, svg, alt: cells.map((r) => r.join(', ')).join('. ') };
}
const plainSheet = { ...sheet, view: (body: string, o: any) => (/^chart:/m.test(body) ? sheet.view(body, o) : [tablePage(body)]) };
const INSIDE: Record<string, any> = { sheet: plainSheet, diagram };
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

export const render = (text: string): string[] => deckPages(text).map((p: any) => type(pageSvg(p, 'class="deck-slide" preserveAspectRatio="xMidYMid meet"')));
// One slide, with only its first `shown` lines drawn; the rest keep their place.
export function frame(text: string, slide: number, shown: number): string {
  const doc = parse(text);
  const s = slidesOf(doc)[slide];
  if (!s) return '';
  const p = slidePage(doc, s, lookOf(settingsOf(doc)), shown);
  return type(pageSvg(p, 'class="deck-slide" preserveAspectRatio="xMidYMid meet"'));
}
export const lint = (text: string) => lintDeck(text);
export const words = (text: string): string[] => slidesOf(parse(text)).map((s: any) => slideText(s));
