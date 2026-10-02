# Design language and visuals for humanshaped.org

Research notes, 2026-10-01. For Ben. Nothing here is decided, and nothing
in the site has been changed. Proposals are marked as proposals; open
questions are collected at the end.

---

## 1. What the template's design skills already say

Read from `UniversalAppTemplate/.claude/skills/`. These are binding for the
site because the site follows the template's values.

**mobile-first-density-design** (the strongest fit)
- Density comes from removing chrome, never from adding decoration. No
  tinted boxes behind every item; spacing and one rule line do the
  separating.
- Three weights by two sizes, six hierarchy levels. Refuse a seventh.
  The current site already has eight (eyebrow, h1, h2, lede, body,
  strong, footer small, button). See section 3.
- Rule 7, only essential words: a caption is a refusal, a warning, or a
  fact the person cannot find by looking. This applies to site UI
  labels, not to lesson prose.
- One canonical cell ("small multiples"): every stage on the map, every
  showcase entry, uses one component.
- Progressive disclosure must be predictable: a chevron pushes, a
  disclosure triangle inlines, never both.
- The Gruber test: could a designer rebuild the page from one paragraph?
- Brand color for chrome, semantic color for content. Never cross them.
- Design at 375px first.

**learning-orientation-design**
- "Quiet where it does not matter, effortful where the learning is." This
  is the site's whole brief in one line: smooth the interface, keep the
  effort in the prediction, the writing, the bring-back.
- Many ways in: a course map that a reader can enter at any stage, not a
  locked sequence.
- Anti-patterns that map directly to course sites: onboarding as a slide
  deck; "one tap" that skips a moment of consideration; hiding the
  domain's real vocabulary.
- No AI-written lists or copy in the product. On the site that means
  showcase blurbs come from students, stage summaries from the README
  table Ben wrote, never generated.
- Honesty checklist for anything automated (if the site ever answers
  questions with a model, it says so, and never passes as Ben).

**universal-feature-states**
- Every surface that loads (sign-up, cohort roster, showcase, a
  learner's saved checklist) needs loading, empty, error, offline, and
  "unavailable" states. Empty states carry a next action.
- Walkthroughs are rejected on the web: links, `<dialog>` and sidebars
  are already legible. Teaching surfaces on the site are the empty state
  and, at most, one dismissible hint.

**native-platform-first**
- `<dialog>`, Popover API, `<details>`, native form validation,
  `input type="email"`, Web Share with copy fallback, View Transitions,
  container queries. Custom only after writing down why no native piece
  fits.

**frontend-design**
- Commit to one clear aesthetic direction and execute it precisely.
  Restraint is a valid direction if it is intentional.
- It explicitly warns against Inter as the generic default. The site
  currently pairs Fraunces with Inter. Fraunces carries character; Inter
  is the part that reads as default. See the typography proposal.
- Its push for "gradient meshes, grain, dramatic shadows" conflicts with
  the density skill. The density skill wins for this site; take only the
  "one well-orchestrated moment" idea from frontend-design.

**killer-ui** (and its knowledge base)
- Systems over opinions: every value comes from a scale.
- Dark mode designed with light from day one, not themed after.
- WCAG AA as a floor, 44px touch targets, 4.5:1 text contrast.

**ui-ux-pro-max**
- Useful checklists: focus states, skip links, heading order, `font-display`,
  reserved image space (no layout shift), 150 to 300ms motion,
  `aria-live` for form errors, focus moved to main on navigation.
- Its "Online Course" product recipe recommends claymorphism, vibrant
  blocks, gamification, certificates and progress green. That recipe is
  the generic LMS this site should not become. Use the skill's
  accessibility and interaction rules; ignore its course style preset.

**Current site, measured against the above** (`index.html`, `styles.css`)
- Good: single column, 40rem measure, `min-width` queries, tokens in
  `:root`, dark override, dark text on the orange button (5.81:1).
- `--color-primary` `#FF5C35` on `--color-bg` `#FBF8F4` is 2.9:1. It is
  fine as an underline color and a button fill, but the current focus
  ring (`outline: 3px solid var(--color-primary)`) is under the 3:1
  non-text contrast that WCAG 1.4.11 asks of a focus indicator in light
  mode. In dark mode the same orange is 6.03:1 and passes.
- `--color-border` `#E6DFD6` on the background is 1.25:1. Fine for a
  decorative rule, too faint for a form field's border (1.4.11 again).
- The `.notice` box uses a tinted surface, a full border and a thick left
  bar at once: three pieces of chrome where the density skill asks for
  one.
- Dark mode exists only through `prefers-color-scheme`; there is no way
  for a reader to override it.

---

## 2. What the best learning experiences do (with sources)

### Patterns worth taking

**Make the learner commit before the answer.** Nicky Case names four
patterns for explorables: puzzle it out, place your bets (predict before
you are told), role play with no right answer, and a sandbox at the end
([Nicky Case, 4 more design patterns](https://blog.ncase.me/explorable-explanations-4-more-design-patterns/)).
Josh Comeau builds his courses on "a chance to struggle": try an exercise
for five to ten minutes before the solution, and exercises that show A,
B and C, then ask for D ([Badass Courses podcast with Josh Comeau](https://badass.dev/podcast/course_builders/engaging-learners-with-a-chance-to-struggle-with-josh-w.-comeau)).
Learning research backs the order: an attempt before instruction, even a
failed one, prepares the learner to use the explanation that follows
([pretesting and generation effect summary](https://edukatesg.com/2026/09/11/how-generation-effect-works-produce-answer-before-you-see-it/);
[retrieval before generative learning](https://www.sciencedirect.com/science/article/abs/pii/S095947522200055X)).
For this course the "attempt" is natural: before Ben's prompt is shown,
the learner writes the prompt they would have sent.

**Reactive documents.** Bret Victor's "explorable explanations": text
with small handles the reader can change to see consequences
([Wikipedia summary](https://en.wikipedia.org/wiki/Explorable_explanation)).
Distill's review found interactive articles improve engagement and recall
over static ones, but also that they are expensive to make
([Hohman et al., Communicating with Interactive Articles](https://distill.pub/2020/communicating-with-interactive-articles/)).
Bartosz Ciechanowski's essays are the ceiling: one idea per figure, a
slider per variable, the prose and the figure always on screen together
([ciechanow.ski](https://ciechanow.ski/)). Lesson for a $0, two-week
launch: one or two explorables at most, where the idea really is a
system (the values ladder, the floor and ceiling), not everywhere.

**Interleave modes, keep each short.** Comeau alternates short videos
(five to ten minutes), interactive articles, exercises and mini-games,
and keeps video for ideas that will not change, articles for what will
([podcast](https://badass.dev/podcast/course_builders/engaging-learners-with-a-chance-to-struggle-with-josh-w.-comeau)).
That maps well to this course: the path text changes as the template
does, so it stays text; a short recording is only for something that
will not go stale (what a Claude Code session feels like).

**Ask for real work, reviewed by a person.** Exercism's mentored mode:
submit, get feedback from a human mentor, then move on; practice mode
drops the gating for those who want speed
([Exercism, mentored vs practice mode](https://github.com/exercism/website-copy/blob/main/pages/mentored_mode_vs_independent_mode.md);
[practice mode post](https://exercism.org/blog/independent-mode-becomes-practice-mode)).
COURSE.md's "show what you brought back to at least two others" is the
same idea, and should be the visible spine of every stage page.

**Retrieval without manipulation.** Execute Program interleaves prose with
live examples, reviews them later with spaced repetition, checks answers
automatically rather than asking learners to grade themselves, and limits
lessons per day so people cannot binge and forget
([Execute Program, spaced repetition](https://www.executeprogram.com/spaced-repetition);
[review](https://code.brettchalupa.com/execute-program-review)). The daily
limit is a pacing rule in the learner's interest, the opposite of a
streak.

**Progress as the shape of the skills, not a number.** Khan Academy moved
from course mastery percentages to Unit Missions and a grid where each
square is one skill
([Khan Academy, mastery visualization](https://support.khanacademy.org/hc/en-us/community/posts/18735056915469-Update-New-mastery-progress-visualization-on-Course-and-Unit-pages);
[reimagined experience](https://support.khanacademy.org/hc/en-us/articles/47216131257997-Why-don-t-I-see-Course-Mastery-in-the-reimagined-Khan-Academy-experience)).
For this course the honest unit of progress is the bring-back: nine stages,
ten weeks, each a thing a person made and showed.

**Cohort surfaces.** Maven's model is live sessions, projects and a place
for the cohort to talk, all in one place
([Maven, teach](https://maven.com/teach)). What makes a cohort work is the
conversation, not the platform; a static site only needs to say when,
where, and who.

**Docs as product.** Stripe's docs put explanation and the code it
explains on screen together, code following the reader as they scroll
([Stripe docs teardown](https://writechoice.io/blog/best-api-documentation-stripe-teardown)).
The equivalent here is the prompt-and-result pair: Ben's dated words
beside what the agent did and what changed. Emil Kowalski's course
platform shows the polish details that read as "made by a person": one
accent color with a reason behind it, a warm neutral scale, a single mono
face, a short feedback form at the end of each lesson
([How I built my course platform](https://emilkowal.ski/ui/how-i-built-my-course-platform)).

**Intrinsic layout.** Every Layout's primitives (Stack, Cluster, Sidebar,
Switcher) let components rearrange by available space instead of
breakpoints ([Every Layout, Sidebar](https://every-layout.dev/layouts/sidebar/);
[Stack](https://every-layout.dev/layouts/stack/)). With container queries
these replace most media queries on a no-build site.

**Structured public curricula.** MDN's Curriculum and its Core modules
show a long path split into modules with plain titles and outcomes
([MDN Curriculum](https://developer.mozilla.org/en-US/curriculum/);
[Core modules](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core)).
Their curriculum lives in a public GitHub repo
([mdn/curriculum](https://github.com/mdn/curriculum)), the same "two
homes" situation as this course.

**Learn by making a real thing.** Swift Playgrounds moves learners from
guided lessons into real SwiftUI projects
([Apple, Swift Playground](https://developer.apple.com/swift-playground/)).
Scrimba's "scrims" make the instructor's code editable mid-lesson
([How scrims work](https://scrimbaguide.tech/docs/how-it-works/how-scrims-work/)).
Both point the same way as "one real app of your own."

**Visual essays.** The Pudding's scroll-led essays give numbers meaning
by tying each graphic to one sentence of prose
([Storybench on The Pudding](https://www.storybench.org/the-proof-is-in-the-pudding-how-one-online-publication-is-using-cutting-edge-data-visualizations-to-tell-meaningful-pop-culture-stories/)).
Good model for the Archive Watch timeline.

### What to avoid

- **Streaks, XP, leaderboards, owl guilt.** Duolingo's streaks raise daily
  return, and researchers describe them as loss-aversion dark patterns that
  push people to protect the streak rather than learn, including farming
  easy lessons for points
  ([arXiv case study on gamification misuse](https://arxiv.org/pdf/2203.16175);
  [Decision Lab, streak creep](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification);
  [SSRN critical analysis](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6846283)).
- **Rewards that crowd out the reason.** Self-determination theory: when
  rewards feel controlling they undermine the autonomy that intrinsic
  motivation needs; tangible rewards are the worst offenders, and the
  evidence in classrooms is mixed
  ([Overjustification effect](https://en.wikipedia.org/wiki/Overjustification_effect);
  [Rutledge et al., Gamification in Action, SDT](https://selfdeterminationtheory.org/wp-content/uploads/2020/10/2018_RutledgeWalshEtAl_Gamification.pdf)).
  The course already says "a value is worth what it changed"; a credential
  should be evidence of what was made, not a badge for showing up.
- **Percent-complete bars as the headline.** They reward reading over doing.
- **Copy buttons on Ben's prompts.** The course asks each student to write
  the prompt they will send. A "copy" button on an example turns a lesson
  into a template. Offer a place to write one's own instead.
- **Slide-deck onboarding, testimonial carousels, logo walls, countdown
  timers, "only 3 seats left."**

### Accessibility, WCAG 2.2 specifics that change this design

([summary of the nine new criteria](https://wcagpatterns.com/guides/wcag-2-2);
[Vispero](https://vispero.com/resources/new-success-criteria-in-wcag22/))
- **2.4.11 Focus not obscured.** A sticky header must not cover the
  focused element. Use `scroll-padding-top` equal to the header height, or
  do not make the header sticky.
- **2.5.8 Target size, 24 by 24 CSS px minimum.** Aim for 44.
- **2.5.7 Dragging.** A before/after slider needs a non-drag alternative
  (two buttons, or simply two figures side by side).
- **3.3.8 Accessible authentication.** Sign-up and sign-in never use a
  puzzle CAPTCHA or require recalling a password; magic links or
  passkeys are fine.
- **3.2.6 Consistent help.** If there is a "contact Ben" link, it sits in
  the same place on every page.
- **2.2.2 Pause, stop, hide.** An autoplaying GIF longer than five
  seconds needs a pause control, and `prefers-reduced-motion` cannot stop
  a GIF; only swapping the source can
  ([2WebP on animated images](https://2webp.com/guides/animated-webp-accessibility);
  [Cloud Four, accessible GIF alternatives](https://cloudfour.com/thinks/accessible-animated-gif-alternatives/)).
  Prefer `<video>` with controls, no autoplay, and captions.

---

## 3. Design language proposal

### Principles

1. **A lesson page is a page you read.** One column, about 66 characters
   wide. Figures may break out wider; text never does.
2. **Quiet interface, effortful learning.** Every interactive element asks
   the learner to do something (predict, write, show someone). Nothing on
   the site exists to be collected.
3. **Only essential words in the interface.** Rule 7 of the density skill
   for every label, button and caption. Lesson prose is Ben's and follows
   WRITING.md.
4. **Real anchors only.** Every image is a real screenshot, a real prompt
   with its date, or a chart drawn from real data (git history, store
   counts). No stock photos, no AI illustration, no invented examples.
5. **Progress is what you made.** No streaks, points, percentages or
   ranking. The learner's record is their bring-backs.
6. **Two homes, one text.** The repository is canonical. The site is the
   designed edition of the same words and links back to the source file.
   Every visual has a form that works on GitHub.
7. **The platform first.** Plain HTML and CSS, the native elements, a
   little JavaScript only as enhancement. The site works with JS off.
8. **Accessible as the floor.** WCAG 2.2 AA, reduced motion respected,
   captions on every video, alt text on every image, long descriptions
   for every diagram.

### Typography (six levels)

Keep **Fraunces** for display: it is already the site's voice, it is a
variable font with an optical size axis, and its soft serifs read as
human rather than corporate. Replace **Inter** for body (proposal):
**Atkinson Hyperlegible Next**, a variable face made by the Braille
Institute for low-vision readability, released free in February 2025
with seven weights and a companion **Atkinson Hyperlegible Mono** for
prompts and code ([Braille Institute](https://www.brailleinstitute.org/freefont/);
[Print on Hyperlegible Next](https://www.printmag.com/type-tuesday/atkinson-hyperlegible-next-applied-design/)).
Both are on Google Fonts. The story fits the course (a typeface made so
more people can read), and it leaves Inter's generic look behind. If Ben
prefers zero font loading for body text, `system-ui` is the fallback.

| Level | Use | Face, weight | Size (375px to 1440px) |
|---|---|---|---|
| L1 | Page title | Fraunces 600 | `clamp(2.25rem, 1.6rem + 3vw, 3.5rem)`, line-height 1.05, `text-wrap: balance` |
| L2 | Section heading, lede | Fraunces 600 (heading) or 400 (lede, the one permitted variant) | `clamp(1.375rem, 1.2rem + 0.8vw, 1.75rem)`, `text-wrap: balance` |
| L3 | Emphasized body, labels, buttons | Body 600 | 1.0625rem (17px) |
| L4 | Body | Body 400 | 1.0625rem, line-height 1.6, `text-wrap: pretty` |
| L5 | Caption, metadata, dates | Body 400, muted | 0.875rem |
| L6 | Prompts, code, numbers | Mono 400, `tabular-nums` | 0.9375rem |

To get the current site down from eight levels to six: cut the
"humanshaped.org" eyebrow (it restates the address bar), set the lede at
L2 size in regular weight, and make the footer L5.

### Color tokens (proposal, OKLCH with `light-dark()`)

Keep the orange and the warm paper; add the one token the audit shows is
missing, a darker orange for anything that must meet contrast on paper.

```css
:root {
  color-scheme: light dark;
  --paper:      light-dark(#FBF8F4, #151311);  /* page */
  --surface:    light-dark(#FFFFFF, #1F1C19);  /* dialogs, the one raised card */
  --ink:        light-dark(#1A1714, #F3EEE8);  /* text */
  --ink-muted:  light-dark(#5E5750, #B3AAA0);  /* L5; 6.71:1 and 8.1:1 */
  --rule:       light-dark(#E6DFD6, #34302B);  /* decorative lines only */
  --field-edge: light-dark(#8C8379, #6E665E);  /* form borders, needs 3:1 */
  --accent:     #FF5C35;                       /* fills, underlines, markers */
  --accent-ink: light-dark(#B83A14, #FF7A57);  /* accent as text or focus ring: 5.43:1, 7.21:1 */
  --on-accent:  #1A1714;                       /* text on orange: 5.81:1 */
  --focus:      var(--accent-ink);
  /* semantic, content only */
  --warn:       light-dark(#8A5A00, #F0B34A);
  --refusal:    light-dark(#9B2C2C, #F28B82);
}
:root[data-theme="light"] { color-scheme: light; }
:root[data-theme="dark"]  { color-scheme: dark; }
```

Contrast ratios above were computed for these hex values; `--field-edge`
and the semantic pair still need checking. Hex shown for readability;
writing them in `oklch()` lets `color-mix(in oklch, ...)` derive hover
states without new tokens. `light-dark()` is Baseline since May 2024 and
reaches "widely available" on 2026-11-13
([web-features explorer](https://web-platform-dx.github.io/web-features-explorer/features/light-dark/);
[MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/light-dark)).
The three moves get a glyph and a word each, not three colors (the
brand/semantic split).

### Spacing and layout

- 4px base: `--space-1` 0.25rem, `-2` 0.5rem, `-3` 0.75rem, `-4` 1rem,
  `-5` 1.5rem, `-6` 2rem, `-7` 3rem, `-8` 4rem, `-9` 6rem.
- Side gutter 1rem at 375px; reading measure `66ch`; wide figures up to
  `56rem` via a named-grid "breakout" (`grid-template-columns: [full-start]
  1fr [content-start] min(66ch, 100% - 2rem) [content-end] 1fr [full-end]`).
- Every Layout primitives as four utility classes: `.stack`, `.cluster`,
  `.sidebar`, `.switcher`, sized by container queries.
- One radius (10px), no shadows except on `<dialog>`.

### Components

Small, named, one canonical form each.

| Component | Built from | Notes |
|---|---|---|
| Site header | `<header>`, wordmark plus three links (Course, Cohort, Sign up) | Not sticky (focus-not-obscured is simpler that way) |
| Stage row | `<li>` in an `<ol>` | Number, title, one line from the README table, the bring-back. Used on home, map, profile |
| Three-moves mark | inline SVG glyphs | Write it down, prove it, live with it |
| Story block | `<blockquote>` + `<cite>` | Ben's actual words with app and date; no copy button |
| Prompt and result | `<figure>` with two parts | The prompt (L6, dated) and what changed (screenshot or sentence) |
| Your turn | `<textarea>` saved in `localStorage` | "Write the prompt you would send" before Ben's is revealed with `<details>` |
| Steps | `<ol>` | "Working with your agent" |
| Bring-back | one raised card per stage, the only card on the page | The "Be ready to..." line, verbatim |
| Ready check | checkbox list, `localStorage` | "When you are ready to move on"; private to the browser, never sent |
| Callout | `<aside>` with one left rule | Only for a refusal, a warning, or a fact; mirrors GitHub alerts |
| Figure | `<figure>`, `<figcaption>`, `<details>` long description | Every diagram gets a text version |
| Term | `<button popovertarget>` + anchor positioning | Glossary for "parity", "floor", "data plane" |
| Pager | `<nav>` previous / next stage | Plus "Read this stage on GitHub" |
| Video | `<video controls preload="none">` + WebVTT captions + poster | Never autoplay |
| Dialog | `<dialog>` with `command="show-modal"` | Sign-up confirmation, theme picker |
| States | empty, error, offline, unavailable | Per universal-feature-states |
| Theme switch | three-way radio (system, light, dark) | Sets `data-theme`, saved in `localStorage` |

### Page anatomy

**Home**
1. L1 "Human-shaped software", L2 lede (one sentence).
2. Two short paragraphs: computer-shaped vs human-shaped.
3. The three-moves figure.
4. The nine stages as stage rows (titles only, linked).
5. One real anchor: the Archive Watch timeline, small.
6. Next cohort: dates, cost, the one requirement ("one real app, for
   people you can name"), Sign up button.
7. "Start before the course does": template and stage 00 links.
8. Footer: who made it, privacy, contact (same place on every page).

**Course map** (`/course/`)
- L1, one sentence on how the path works.
- The ten-week table from COURSE.md as an ordered list of stage rows; stage
  03 spans weeks 4 and 5. Each row: week, stage, where the app gets to,
  what to bring back.
- The three moves repeat beside every row as a small mark, showing they
  are laps, not stages.
- If the reader has checked anything locally, their bring-backs show a
  filled marker. No percentage.
- "Talking to your agent" pinned at the end as the page to keep open.

**Stage page** (`/course/00/`, generated by hand or by the agent from the
`docs/path/` file)
1. Stage number and title; "Where you are" paragraph.
2. The opening story, with its quotes as story blocks.
3. The body sections, each with at most one figure.
4. "Your turn" before each of Ben's sample prompts.
5. "Working with your agent" steps.
6. Ready check (the "When you are ready to move on" sentence, split into
   checkboxes).
7. Bring-back card.
8. Pager, and "Read on GitHub" (the canonical text).

**Session page** (`/cohort/2026-fall/week-01/`)
Mirrors COURSE.md's three parts, in order:
1. Date, time with the reader's local time, link to join.
2. Show what you brought back: the stage's bring-back line, and "show it
   to at least two people."
3. Read one real prompt together: the prompt, with its date and app, and a
   space to write the one you will send this week.
4. Build: the four questions, large enough to put on a wall (printable).

**Cohort page** (`/cohort/2026-fall/`)
- Dates, weekly time, where the conversation lives, the ten sessions as a
  list.
- Who is in it: first names and their app's one-line "who it is for",
  only with each person's consent.
- No activity feed, no counts.

**Showcase** (`/showcase/`)
- One canonical entry per app: name, the people it is for, platforms it
  runs on, one value and the decision it changed (COURSE.md's test), a
  screenshot, a link. All words written by the student.
- Ordered by cohort and then alphabetically; no likes, no "featured"
  ranking.
- Empty state before the first cohort finishes: Ben's four apps as the
  first entries, labeled as his.

**Sign-up and onboarding** (`/join/`)
- What it costs, when it runs, what you need (a computer, Claude Code, one
  phone), the honest warnings from COURSE.md's "What I am unsure about"
  (developer account costs).
- A short form: name, email, the app you want to build and who it is for
  (a first "write it down" moment). Native validation, visible labels,
  `autocomplete` attributes, no CAPTCHA puzzle.
- Privacy note beside the form (CLAUDE.md requires it).
- After submit: the confirmation says what happens next and links to stage
  00, step 1 (start your note). That is the onboarding; no tour.
- States: sending, sent, error with the input kept, offline.

**Profile and credential** (`/people/<handle>/`, only if Ben wants it)
- The learner's app, and their ten bring-backs as evidence links
  (screenshots, store listing, the skill they wrote).
- A credential, if any, states what was made and shown, issued by Ben,
  with the evidence attached. Open Badges 3.0 is a free open standard that
  is a W3C Verifiable Credential, and some issuers offer free tiers
  ([1EdTech Open Badges 3.0](https://www.imsglobal.org/spec/ob/v3p0);
  [Certifier free tier](https://certifier.io/blog/open-badges-3-0)).
  This requires a backend or a third party; it is not $0-by-default.

---

## 4. Modern CSS and HTML for a no-build site (status October 2026)

| Feature | Use on humanshaped.org | Support |
|---|---|---|
| Cross-document View Transitions (`@view-transition { navigation: auto }`) | Stage-to-stage navigation; the stage title morphs | Chrome/Edge 126+, Safari 18.2+, Firefox partial from 144 ([caniuse](https://caniuse.com/cross-document-view-transitions)). Enhancement only |
| Scroll-driven animations (`animation-timeline: view()`) | Timeline line draws in as it scrolls past; reading-position bar | Chromium and Safari; Firefox behind a flag as of 152 per [this summary](https://www.buildmvpfast.com/blog/css-scroll-driven-animations-replace-js-2026) (unverified against Mozilla). Wrap in `@supports` |
| Container queries | Stage rows and showcase entries adapt to their column | Baseline |
| `:has()` | Style a ready-check list when all boxes are checked; form states | Baseline |
| `<dialog>`, Popover, invoker commands (`command`, `commandfor`) | Zero-JS dialogs and glossary popovers | Invokers Baseline 2025: Chrome 135, Firefox 144, Safari 26.2 ([InfoQ](https://www.infoq.com/news/2026/01/html-invoker-commands)) |
| Anchor positioning | Glossary popovers placed next to the term | Baseline January 2026, Firefox 147 ([summary](https://www.refontelearning.com/blog/css-anchor-positioning-reaches-baseline)) |
| `light-dark()`, `color-scheme` | Tokens above | Baseline 2024 |
| `text-wrap: balance` / `pretty` | Headings / paragraphs | balance Baseline; pretty in Chrome 117+ and Safari 26, not Firefox ([caniuse](https://caniuse.com/wf-text-wrap-pretty)). Harmless where unsupported |
| Variable fonts | Fraunces `opsz` and `wght`; Atkinson Next `wght` | Baseline |
| OKLCH and `color-mix()` | Token math for hover and borders | Baseline |
| `prefers-reduced-motion`, `prefers-contrast`, `forced-colors` | Every animation in `@media (prefers-reduced-motion: no-preference)`; outline borders in forced colors | Baseline |

Motion rules: one moment per page (the view transition), 150 to 300ms,
transform and opacity only, nothing that loops.

Libraries: none needed. If ever: Mermaid only to pre-render SVGs that are
then committed (do not ship its runtime to readers); no Scrollama
(`IntersectionObserver` or scroll-driven CSS covers it); no icon font
(inline SVG). The CDN rule in the artifact guidance does not bind the
site, but the "no build step, $0" rule does.

---

## 5. Making the ideas visual: site versus GitHub

| Technique | On GitHub's renderer | On the site | Notes |
|---|---|---|---|
| Mermaid in a ```` ```mermaid ```` block | Renders as SVG in any Markdown file ([GitHub support since 2022](https://github.com/github/roadmap/issues/372); [Ardalis](https://ardalis.com/github-diagrams-with-mermaid/)) | Pre-render to SVG | GitHub's Mermaid version lags; no click events; about 50 KB per block ([guide](https://mermaideditor.lol/blog/mermaid-in-github-readme)). Screen readers get a jumble; add `accTitle`/`accDescr` and a text version beside it ([Princeton library on accessible Mermaid](https://pulibrary.github.io/2023-03-29-accessible-mermaid)) |
| SVG file via `![alt](x.svg)` | Yes, scripts stripped, external fonts not loaded | Inline SVG with `currentColor` | Outline text or use system fonts in repo SVGs |
| Light/dark image pair | `<picture>` with `prefers-color-scheme` sources ([GitHub Blog](https://github.blog/developer-skills/github/how-to-make-your-images-in-markdown-on-github-adjust-for-dark-mode-and-light-mode/)) | `light-dark()` or `currentColor` | Simplest repo option: one SVG, transparent background, mid-tone strokes that read on both |
| Excalidraw sketches | As exported SVG; `.excalidraw.svg` can embed the editable scene ([Excalidraw export](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/utils/export)) | Same SVG | Hand-drawn feel suits "a teacher who builds things at night"; export both themes |
| Alerts (`> [!NOTE]`, `[!WARNING]`...) | Yes ([guide](https://frankwiles.com/til/github-markdown-alerts/)) | The callout component mirrors them | Map NOTE to fact, WARNING to warning, CAUTION to refusal |
| `<details>` | Yes | Yes | Long descriptions of diagrams; Ben's prompt revealed after the learner's attempt |
| Tables | Yes | Styled | The course map and parity matrix |
| Video | MP4/MOV/WebM uploaded through the web editor or an issue, about 10 MB on free plans ([community discussion](https://github.com/orgs/community/discussions/4772)) | `<video>` with WebVTT captions | Do not commit video to git; history keeps it forever |
| GIF | Yes, 10 MB cap | Avoid | Cannot be paused by CSS; WCAG 2.2.2 |
| Annotated screenshots | PNG/WebP with alt text | Same, plus `<figcaption>` | Bake numbered markers into the image; put the explanations in text, not in the pixels |
| Interactive explorable | No (no JS) | Yes | Link from the repo to the site version |
| Charts from data | Mermaid `xychart`/`timeline` if GitHub's version supports it (check), or SVG | Hand-built SVG from a small JSON file | Real data only |

File-size discipline: keep each repo image under about 200 KB (WebP or
optimized PNG; SVG under 50 KB), set `width` and `height` on site images,
`loading="lazy"` below the fold.

---

## 6. The ten visuals to make first

Ordered by how much each one teaches per hour of work.

| # | Visual | What it shows | Format | Where it lives |
|---|---|---|---|---|
| 1 | **The three moves** | Write it down, prove it, live with it, as a loop that each stage laps; one real example per move | Repo: Mermaid `flowchart` with `accDescr`. Site: inline SVG, `currentColor` | Template README and stage 00; site home and course map |
| 2 | **The nine-stage path by week** | 00 to 08 against the ten weeks, with each bring-back | Repo: the existing table plus a Mermaid `flowchart LR` of stages. Site: the course-map page itself (HTML list, not an image) | README "Start here"; COURSE.md; site `/course/` |
| 3 | **Archive Watch, April 17 to nine platforms** | First commit date per platform, drawn from `git log` (4,285 commits; 2,742 co-authored with Claude by end of September) | Small JSON pulled once from the repo's history; site renders SVG; repo gets a light/dark SVG pair via `<picture>` | Template README opening; site home |
| 4 | **The values ladder** | Reason in the paragraph, then a dated standing instruction, then a check; the "programme" example ending in `tools/test_us_english.py` | Repo: Mermaid. Site: SVG, possibly one small explorable (click a rung to see the real artifact) | Stage 00 and stage 08; site stage pages |
| 5 | **Prompt and result pairs** | Three of Ben's dated prompts beside what changed: the $0 Watch Together refusal, the Tidbits paid-club "one quiet row", "only essential words" with a before/after screenshot | Real screenshots (WebP), side by side, no slider | Stage 00 on both; the session page's "read one real prompt" |
| 6 | **Where the values live** | The three places (CLAUDE.md, the four questions, standing instructions) and the moment each is read | Repo: Mermaid `sequenceDiagram` (session start, proposal, crossing a line). Site: SVG | Stage 00 |
| 7 | **The four questions, for the wall** | The four questions plus "automate the mechanical, preserve the meaningful" | Printable A4/Letter PDF and SVG; plain type, no decoration | Site session page; template `docs/path/` as a linked file |
| 8 | **Two layers** | One published data plane, native consumers on each platform | Repo: Mermaid `flowchart TB`. Site: SVG | Stage 02 |
| 9 | **Floor and ceiling** | Device generations on a line, the floor chosen by measurement, newer features above it behind availability checks | Excalidraw SVG, light and dark | Stages 03 and 07 |
| 10 | **One real agent session, 60 seconds** | Stage 00 step 2: telling the agent why, and correcting the rewritten paragraph until it sounds like you | MP4 under 10 MB with captions and a transcript; poster image | Site stage 00; repo links to it rather than embedding |

Next after these: an annotated "screenshot that proved a fix" for stage 04,
and a parity matrix rendered as a grid of cells for stage 02.

---

## 7. Open questions for Ben

1. **Body typeface.** Keep Inter, move to Atkinson Hyperlegible Next and
   Mono, or use `system-ui` and load only Fraunces?
2. **Eyebrow and lede.** Fine to cut the "humanshaped.org" eyebrow and fold
   the lede into L2, to hold six levels?
3. **Stage pages on the site.** Should the site carry its own edition of
   each `docs/path/` stage (designed, with figures and "your turn" fields),
   or link to GitHub for the text and keep the site to map, cohort, join
   and showcase? Two copies drift unless the agent regenerates the site
   pages from the repo files.
4. **Learner progress.** Is a private, browser-only checklist acceptable,
   or should progress be shared with the cohort (which needs the sign-up
   backend)?
5. **Credential.** Any credential at all? If so, an evidence page Ben signs
   off on, or Open Badges 3.0 through a free issuer?
6. **Cohort space.** Where does the cohort talk: GitHub Discussions on the
   template (free, public), a Discord, or somewhere else? The cohort page
   only needs to point at it.
7. **Showcase consent and wording.** Students write their own entries;
   should Ben's four apps be the first entries, labeled as his?
8. **Video.** Is Ben willing to record a few short real sessions with
   captions, and where should they be hosted (the site repo stays small;
   YouTube or GitHub attachments)?
9. **Mermaid versus drawn diagrams.** Mermaid is free to maintain and
   renders on GitHub but looks generic; Excalidraw SVGs look hand-made but
   must be re-exported by hand. Which for the stage diagrams?
10. **Theme override.** Add a system/light/dark choice, or keep
    following the system only?
11. **Timeline data.** OK to compute the platform dates from Archive
    Watch's git history and publish them, and which date counts as a
    platform's "start" (first commit in its folder, first store listing)?
