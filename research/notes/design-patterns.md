# The site's own design patterns

October 6, 2026. Ben, after the forest and thistle change: removing the
patterns AI-made sites lean on (ai-design-anti-patterns.md) is not a
design on its own; the site needs patterns of its own, from good modern
web design, and needs to use them on every page. These are those
patterns. Each one names where it lives in `assets/site.css`.

## 1. One continuous page

The page is one sheet of paper with things placed on it. Color never
runs edge to edge: a colored section is a **panel**, inset to the
page's width with round corners (`--panel-radius`, 28px), so moving
down the page never jumps from a light stripe to a dark one. The forest
panel is for the one place a page asks for something (the closing
invitation, the showcase of real apps); the thistle-tinted panel groups
a set the page is built around (the three moves, the weeks). The footer
is paper too, with one rule above it.

*Where:* the "site's own patterns" block at the end of the stylesheet
(`.band`, `.showcase`, `.section.tint`, `.site-footer`).

## 2. Hanging headings

Long reading has a spine. From 64rem up, each heading sits in a left
column (a third of the width) beside the words it introduces, and stays
in view while they scroll by; the words keep their measure (38rem) in
the right column. Below 64rem the heading sits above its words as usual.
Every reading page uses it: the brand kit, the guides, Connect, the
meetup and hackathon guides (`.topics.single`), About's why
(`.about-why .article`), and any section marked `.hang-section`. A new
document page with no contents beside it adds `class="article hang"`.

## 3. A measure for every paragraph

No paragraph runs wider than about 38rem (`--measure`), and none sits
alone at the left of a wide, empty page: either it hangs from a heading
(pattern 2), sits beside a contents list (the stage pages), or shares a
row with a second column (`.topics` on Privacy and Help).

## 4. No highlighted words

Headings and sentences carry their own weight; no word is picked out
with a colored background or color (Ben, October 6: highlighting
"sleeves" "reads as AI written").

## 5. Two colors with jobs

Forest is for what can be clicked and for the arch; thistle is for what
is current (this week, a chosen answer) and for stickers.
Text sits on white or on the thistle tint, never on full thistle except
in a short label (DECISIONS.md, "Forest and thistle").

## 6. Real things as the pictures

The pictures are real: the apps' App Store screens, Ben's desk and
testing phones, the marks people actually show. No illustrations, no
stock, no decorative shapes; icons are Phosphor's.

## 7. Actions and links

Replaced October 12, 2026 (Ben: "The whole site has a pretty wonky way of
displaying links that are completely unadorned right next to buttons that
are also links. We need a consistent design for links and actions within
the site"). Research and sources: `links-and-actions-notes.md`.

- **Anything that stands on its own is a button**, whether it goes
  somewhere (an `<a>`) or does something (a `<button>`): one shape, one
  height (44px, or 40px with `.small` in dense lists), one weight, in one
  of three styles. `.btn-primary` is filled and is the main next step: at
  most one in a group, and first. `.btn-secondary` is outlined, for
  everything else, including a link that ends a section. `.btn-danger` is
  outlined in red for what is hard to undo (removing, deleting, leaving),
  last in its row, and filled red (`.final`) only on the step that
  confirms it. Undoable things (taking a card down) stay secondary.
- **Underlined text appears only inside a sentence**: links, and
  `.text-button` for a button that sits in a sentence ("Or record with
  your phone's camera app and come back").
- **Navigation is plain**: the header, the footer, and lists of pages use
  ink-colored links that underline on hover.
- **Leaving the site** is named in the label and marked with the
  arrow-out icon, in the same tab ("Open in Google Drive").
- Never put a bare link beside buttons. The check is
  `tools/test/action-styles.test.mjs`: no retired style, and in every row
  of actions on a page, one filled button at most and first, red last, and
  nothing without a button style.

*Where:* "Actions" near the top of `assets/site.css`.

## 8. Things that are compared look alike

When a block sets two things side by side (computer-shaped and
human-shaped problems), both sides share one structure and one type
style, start at the same height, and sit under the same thin rule. The
difference is carried by the words, never by one side being bigger,
bolder, or a different color (Ben, October 6, on the home page's
comparison).

## 9. A short type ramp

Within a section there are at most three text styles: the heading, the
reading text, and one small label or caption style. A second large
statement in the same section (a pull quote) takes the heading's size
and the heading-left, words-right layout, with a 1px rule, not a heavier
one. A link inside reading text looks like every other link and is not
bolded to stand out; a link that stands alone is a `.btn-secondary`.

## 10. Side-by-side text starts at the same height

When a heading and smaller text sit in two columns, the top of the
heading's capitals is level with the top of the first line beside it
(Ben, October 6, twice: baselines were the wrong edge, since a small
first line on the heading's baseline sits far below the heading's top).
Each column's first element loses its top margin and is trimmed to its
cap height (`text-box: trim-start cap alphabetic`), and the grid aligns
at the start. This holds whatever the sizes or font. Browsers without
text-box (Firefox, for now) align the boxes' tops, a few pixels off.
A button beside a heading lines its top edge up with the capitals.

## 11. A heading for the whole section is centered

When a section's heading has no words beside it and introduces
everything under it (the apps in the stores, the three moves), it is
centered across both columns from 56rem up (`.head-center`), and left
on phones, where everything below it is one column.

## Checking a page

At 375 and 1280 pixels, light and dark: does color stay inside panels,
does every long text hang from a heading or share its row, is there at
most one forest panel, no highlighted words, do compared things
look alike, does each section keep to three text styles, does text
beside a heading start at its height, and is everything shown real?
