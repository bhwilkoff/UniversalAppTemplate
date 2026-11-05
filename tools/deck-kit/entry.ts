// What the main stage takes from Tiny Little Office: its deck, read from
// text and drawn as SVG, with the sheet (tables, charts) and diagram apps a
// slide can hold. No editor, no links, no storage. See README.md here.
import { deckPages } from '@tlo/src/apps/deck/view.ts';
import { lintDeck } from '@tlo/src/apps/deck/lint.ts';
import { slidesOf, slideText } from '@tlo/src/apps/deck/model.ts';
import { THEMES } from '@tlo/src/apps/deck/theme.ts';
import { parse } from '@tlo/src/doc/index.ts';
import { pageSvg } from '@tlo/src/kit/draw/draw.ts';
import { lookup } from '@tlo/src/kit/core/app.ts';
import sheet from '@tlo/src/apps/sheet/def.ts';
import diagram from '@tlo/src/apps/diagram/def.ts';

const INSIDE: Record<string, any> = { sheet, diagram };
lookup.appOf = (id: string) => INSIDE[id];

// The site's dark palette (assets/site.css), and its typeface.
THEMES.humanshaped = { name: () => 'Human Shaped', dark: true, paper: '#131916', ink: '#E8EDEA', muted: '#C1CAC5', accent: '#DCC4F0' };
// The renderer lays white under every page, which bleeds through at a dark
// slide's edges when the stage scales it.
const type = (svg: string) => svg.replace(/'IBM Plex Sans'/g, 'Commissioner').replace('<rect width="960" height="600" fill="#ffffff"/>', '');

export const render = (text: string): string[] => deckPages(text).map((p: any) => type(pageSvg(p, 'class="deck-slide" preserveAspectRatio="xMidYMid meet"')));
export const lint = (text: string) => lintDeck(text);
export const words = (text: string): string[] => slidesOf(parse(text)).map((s: any) => slideText(s));
