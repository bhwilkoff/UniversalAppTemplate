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

## 4. One highlighted phrase

A page may mark one phrase as its point, in thistle (`.hl`): behind the
type on light pages, as the type's color on dark ones. Only the home
page's "sleeves" uses it so far. One per page, never a whole sentence.

## 5. Two colors with jobs

Forest is for what can be clicked and for the arch; thistle is for what
is current or highlighted (this week, the marked phrase, stickers).
Text sits on white or on the thistle tint, never on full thistle except
in a short label (DECISIONS.md, "Forest and thistle").

## 6. Real things as the pictures

The pictures are real: the apps' App Store screens, Ben's desk and
testing phones, the marks people actually show. No illustrations, no
stock, no decorative shapes; icons are Phosphor's.

## 7. Quiet controls

One filled button per view (forest), everything else a quiet outlined
button or a bold underlined link (`.section-more`, `a.go`, `a.go-text`).

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
one. Links look like links everywhere; they are not bolded to stand out.

## Checking a page

At 375 and 1280 pixels, light and dark: does color stay inside panels,
does every long text hang from a heading or share its row, is there at
most one forest panel and one highlighted phrase, do compared things
look alike, does each section keep to three text styles, and is
everything shown real?
