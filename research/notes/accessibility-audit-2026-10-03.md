# Accessibility and quality audit, October 3, 2026

The site grew from a few pages to dozens in one day, built by many
agents, and research/README.md (section 1) asks for WCAG 2.2 AA
throughout. This audit checked every page against that bar, fixed what
was mechanical, and lists what is left for Ben, with page and line.

Branch `m14-audit`, three commits on top of `3c226b2`:

- `8a3e308` Repair the stylesheet's lost toolkit rule, and size targets and forms for small screens
- `63e44a3` Announce only what changes on the hub pages, and fix the headings and tables axe found
- `52fb01f` Make the header and footer agree on every page

`node --test tools/test/*.mjs` stays green (121 pass, 2 skipped, as before).

## How it was checked

- **Pages.** Every URL in sitemap.xml (39), `/404.html`, and the
  signed-in pages: `/account/` (signed out and in), `/teach/`,
  `/cohort/?c=…`, `/live/?c=…`, `/oauth/consent/?authorization_id=…`,
  `/credential/?id=…` and `/credential/` with no id. 48 page states in
  all, served from the worktree with `python3 -m http.server`.
- **No production data.** The supabase-js script was swapped in the
  browser for a stand-in with sample rows (a running cohort with five
  sessions, a trio, a bring-back marked "not yet", feedback, a queue, an
  open question and a multiple-choice one, a credential, a teacher
  request). Every request to supabase.co and api.github.com was answered
  locally with empty JSON; nothing reached the real database.
- **axe-core 4** (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa,
  best-practice), driven by puppeteer-core on the installed Chrome, in
  light and dark (prefers-color-scheme), at 375 and 1280 px: 192 runs.
  A second pass ran axe on states reached by clicking: a cohort open on
  `/teach/`, the new-cohort form, the delete dialog on `/account/`, every
  `<details>` open on `/live/` and `/cohort/`, signed out of `/teach/`,
  not a member of a cohort, and the error states of `/live/` and the
  consent page (36 runs).
- **By script, standing in for hand checks:** a keyboard walk of up to
  80 Tab stops on every page (first stop, a visible outline at every
  stop, nothing focused off screen), targets under 24 by 24 px that are
  not inline in a sentence, heading order, landmarks, the skip link,
  images without alt, sideways scroll at 320 px (1280 at 400%) and
  640 px (1280 at 200%), title, description, canonical, the nav's
  aria-current, and whether the header and footer are byte-identical.
- **Links.** Every link and asset on every rendered page (1,577), with
  each `#fragment` checked against the ids on its target, and every
  external origin fetched once.
- **Words.** All page text and JS strings, for em dashes, the banned
  words in WRITING.md, missing Oxford commas, and runs of three or more
  short sentences.

## Results

**axe, before:** 24 failing nodes (20 rule failures) across the 192
runs, all on three rules:

| Rule | Nodes | Where |
|---|---|---|
| empty-table-header | 12 | `/why/archive-watch/` (a Markdown table with an empty header row), `/why/not-vibe-coding/` (an empty corner cell) |
| landmark-unique | 8 | `/why/archive-watch/`, `/teach/guide/weeks/`: every rendered table was a region named "Table, scrolls sideways" |
| heading-order | 4 | `/apps/`: the four app cards were h3 straight under the h1 |

The click-through pass found 4 more: `/live/`'s error state had no h1.

**axe, after:** 0 on all 192 runs and 0 on all 36 click-through runs.

**Contrast, computed for every token pair** (WCAG ratio; 4.5 is the bar
for text, 3 for parts of controls):

| Text | on paper | on surface | on card |
|---|---|---|---|
| ink, light | 15.64 | 13.73 | 16.91 |
| muted, light | 6.22 | 5.46 | 6.73 |
| clay, light | 5.94 | 5.21 | 6.42 |
| ink, dark | 15.13 | 13.49 | 13.96 |
| muted, dark | 7.86 | 7.01 | 7.25 |
| clay, dark | 8.76 | 7.81 | 8.08 |

On-ink text on the ink button is 16.91 (light) and 15.13 (dark), and
on the clay hover 6.42 and 8.76. In the dark band: band-ink 14.11 /
12.54, band-muted 7.33 / 7.46, band-clay 8.16 / 7.26, and the band's
button 14.11 / 12.54. Every text pair passes AA, most pass AAA.
Field borders use `--muted` (5.46 and up). The `--edge` outline on quiet
buttons is 2.67 on `--surface` in light, under 3, but those buttons are
identified by their words, so 1.4.11 does not require the outline;
`--rule` lines are decoration.

**Keyboard.** On every page the first Tab stop is "Skip to the page",
it lands on `main#main`, every stop shows the 3 px clay outline, and no
stop was off screen or trapped. The dialogs on `/account/` are native
`<dialog>` with `showModal()`, so focus stays inside and goes to "Keep
my account" first. Nothing is sticky over the content, so focus is
never obscured.

**Motion.** The global `prefers-reduced-motion` rule covers CSS; the
one smooth scroll in JS (live.js, putting a thread in the queue) now
checks it too.

**Reflow.** At 640 px nothing scrolls sideways. At 320 px only
`/cohort/` did, by 22 px (a long option in the share form's select set
the grid's width); fixed.

**Links.** No broken internal link, missing asset, or missing anchor.
The only failing fetches are the optional `HUMAN-SHAPED.md` on the four
showcase apps' pages (404 until those repositories declare), and GitHub
answering a bot with 403 on `/signup`.

**Header, footer, meta.** One header on all 48 states. Two footers: the
home page lacked the credit line added to every other page in
`728dc67`. Every page has a title ending "| Human Shaped", a
description, an og:image, and a canonical URL matching its path (the
404 rightly has none and is `noindex`, as are the six signed-in pages).
Every public page is in sitemap.xml.

**The arch.** It appears alone in `assets/favicon.svg`,
`assets/brand/icon.svg` and `icon.png`, and `assets/apple-touch-icon.png`;
all use the wordmark's proportions with ends at y 16 and the top at
y 7.5 in the 32-unit frame, so the rule holds. `og.png` and the brand
marks show it only inside the wordmark.

**Words.** No em dashes and no banned words in any page or script
string. One missing Oxford comma (home page, "Classmates, partners and
your teacher"). No run of clipped captions in the site's own copy; the
only runs of three short sentences are the four review questions on
`/start/hackathon/` (line 384) and status strings in teach.js.

## What was fixed

1. **A broken comment in site.css** (before the M5 toolkit section) made
   the browser read the comment as a selector and drop
   `.kit .draft-note`. The draft notes on `/start/meetup/`,
   `/start/hackathon/`, and `/start/brand/` now get their intended muted
   style.
2. **Page-wide live regions removed.** `/account/`, `/cohort/`,
   `/teach/`, `/live/`, and `/oauth/consent/` wrapped the whole page in
   `aria-live="polite"`, so a screen reader would read every redraw in
   full, and `/live/` redraws every fifteen seconds. Errors are now
   `role="alert"`, the consent result is `role="status"`, and the small
   status lines beside buttons (already there) carry the rest.
3. **Things that changed silently are said.** The live page's timer
   says "Time is up." and the copy buttons on `/start/`, the guides, and
   `/connect/` say "Copied." (or why not) in a hidden status line.
4. **Rendered tables** (assets/render.js) are named for the heading
   above them, and an empty Markdown header row is dropped or its blank
   corner made a plain cell.
5. **Headings.** `/apps/` has a hidden "The four apps" h2 above its
   cards and "Being built right now" is an h2; the home page's feed is a
   `<section>` rather than a `<div>` with aria-labelledby; `/cohort/` and
   `/live/` have a hidden h1 in their loading and error states.
6. **Targets.** Footer links, crumbs, kicker links, next and previous
   links, and source links are at least 24 px tall; check boxes and
   radios are 20 px and clay, inside labels at least 36 px tall; the file
   picker on `/teach/` shows focus on its label.
7. **Reflow.** The hub's grids and forms shrink to 320 px.
8. **Consistency.** aria-current is "true" on a section's subpages
   (`/apps/app/`, the four `/start/` guides) and "page" only on the page
   itself; the teaching guide and its weekly pages sit under Cohorts,
   where their crumbs lead, not The path. The home footer has the credit
   line. One Oxford comma added.

## What remains

For Ben, because they are words or choices rather than mechanics:

- `teach/guide/index.html:86` still says "Each session has the same
  three parts in the same order"; COURSE.md now has six parts (Arrive,
  bring-backs, the prompt, one value at work, Start, checks). Needs
  rewriting in his voice.
- `oauth/consent/index.html:7` and `connect/index.html:6` share the
  title "Connect your agent". They are different pages (one explains,
  one asks for approval); the consent page may want its own title.
- `apps/app/index.html:7`: the four showcase app pages share one
  description, since the page is one file filled by JS. Search engines
  and link previews will show the same summary for each.
- The hidden headings this audit added are new words: "The four apps"
  (`apps/index.html`, above the cards), "Your cohort" and "The live
  session" (`cohort/index.html` and `live/index.html`, loading and error
  states). They are only read by screen readers, but they are copy.
- Comments still mark the words on `/teach/guide/` (M2) and
  `/credential/` (M4) as written by Claude and awaiting Ben's review.

For the lead, small and not done here:

- `/connect/`, `/credential/issuer/`, and the signed-in pages mark no
  nav item as current. That is right if they belong to no section; if
  `/connect/` belongs under The path or Cohorts, say which.
- The theme toggle's name is an action ("Switch between light and
  dark") and does not say which theme is on. Adding `aria-pressed`
  would read oddly with that name; a name that changes with the theme
  would need words from Ben.
- Optional setup steps on `/cohort/` show a dashed circle but are not
  announced as optional (cohort.js:385); done steps are announced.
- The course table on `/teach/guide/` links single digits ("1" to "5",
  20 by 9 px). They pass 2.5.8 through its spacing exception (each is
  alone in a padded cell), but would be easier to hit as "Week 1".
- `design/` (the archived directions) is reachable by URL, has no
  `noindex`, and keeps the old wording ("partners and your teacher",
  `design/round-2/commons/index.html:179`). It was left untouched as an
  archive.
- The reading pages render text from the template's `main` branch; that
  text was checked by axe as rendered but its words belong to the
  template's own copy audit.
- Not tested: a real screen reader (VoiceOver or NVDA) end to end, real
  sign-in, and real GitHub data. The audit used a stand-in database and
  empty GitHub answers, so commit lists and discussion threads were seen
  only in their empty and error states.

The audit scripts (axe runner, keyboard and reflow checks, link crawl,
word scan, and the stand-in database) were kept outside the repository
in a scratch folder, so they did not change the site.
