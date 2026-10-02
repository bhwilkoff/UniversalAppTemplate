# Three directions for humanshaped.org

October 2, 2026. Three static mockups, each a home page and a stage page
(stage 00, Why we build, in its real text). They are proposals for Ben to
react to. Nothing here changes the live site: `index.html` and
`styles.css` at the root are untouched.

Open them from disk, or serve the folder (`python3 -m http.server`) and
visit `design/directions/<name>/`. Add `?dark` or `?light` to any page to
force a theme. Each page also has a theme button in its header that
remembers the choice. Screenshots at 375px and 1440px, light and dark,
are in each direction's `shots/` folder.

| | Margins | Broadside | Workbench |
|---|---|---|---|
| Feels like | A teacher's field notebook | A riso-printed zine you get handed at a meetup | The noticeboard by the door of a shared workshop |
| Mark | A pencil-drawn screen that grew a head, beside a handwritten wordmark | A lino-cut stamp: a person carved out of a square, on a rough pink disc | A parcel tag with a person drawn on it in marker, "HUMAN SHAPED" in stencil |
| Type | Newsreader (text and titles), Kalam (the margin notes) | Bowlby One (poster heads), Source Serif 4 (text), Courier Prime (labels) | Big Shoulders Stencil (heads), Atkinson Hyperlegible Next (text), Permanent Marker (labels) |
| Color | Paper, graphite, one red pencil, one blue pen | Newsprint, black ink, fluorescent pink, a yellow for the one thing to do | Pegboard tan, white paper, forest green, a red stamp |
| Strongest at | The learning environment | The movement and the toolkit | The social hub |

## The pitfalls, checked

Ben asked for pages that read as polished but carry none of the habits
of AI-made design. This is the list each mockup was checked against.

| Pitfall | Margins | Broadside | Workbench |
|---|---|---|---|
| Purple or blue gradients | None. No gradients at all, except a highlighter stroke | None | None |
| Glassmorphism, blur | None | None | None |
| Hero plus three feature cards | No. Hero is text in a column with a note in the margin | No. A poster head, then a "versus" fold | No. A pinned poster beside two smaller pieces of paper |
| Inter everywhere | Newsreader and Kalam | Bowlby One, Source Serif 4, Courier Prime | Big Shoulders Stencil, Atkinson Hyperlegible Next, Permanent Marker |
| Emoji as icons | None. Icons are drawn SVG | None | None. The only logo borrowed is GitHub's, on its sign-in button |
| Sparkle or AI iconography | None | None | None |
| Uniform rounded cards with drop shadows | No cards. Rules and space separate things | Hard rules and one offset block shadow on the yellow call to action | Paper at small, different angles, no radius, no blur shadow |
| Stock 3D blobs | None | None | None |
| Everything centered | Text column sits left of centre with the margin column beside it | Left-aligned, newspaper columns | Left-aligned board, pieces offset |
| "Get started for free" | "Sign in with GitHub to join" | Same | "Sign in with GitHub" |
| Bento grid by default | No grid of tiles anywhere | Classifieds in flowing newspaper columns | Tickets of different widths, rotated, with one blank ticket |
| Tailwind defaults (slate grays, 0.5rem radius, indigo) | Warm graphite neutrals, no radius | Black and newsprint, no radius | Warm browns, irregular radius only on the button |
| Perfect symmetry | Margin notes, staggered app entries | Staggered moves, a rotated pink head | Every piece of paper turned a little differently |
| Lorem ipsum or invented copy | None. All copy from stage 00, COURSE.md, VISION.md, DECISIONS.md and the showcase facts | Same | Same |

The hand-made feel comes from drawn SVG paths written with deliberately
uneven curves (no circles or rectangles where a pencil would wobble), and
paper grain made with an SVG noise filter in CSS, never an image file.

## Accessibility

Every text pair below was computed with the WCAG 2.x formula. All pass
AA (4.5:1 for text, 3:1 for focus rings and form edges).

**Margins.** Light: ink 14.03:1, muted 6.44:1, red 5.84:1, blue pen
7.64:1, form edge 3.98:1, ink on highlighter 11.36:1. Dark: ink 13.96:1,
muted 7.63:1, red 7.78:1, pen 9.58:1, form edge 4.21:1. The focus ring is
3px of the red pencil with a 3px offset, so it passes in both themes
(5.84:1 and 7.78:1), which fixes the current site's 2.9:1 orange ring.

**Broadside.** Light: ink 15.72:1, muted 7.71:1, ink on pink 6.17:1, ink
on yellow 14.35:1, pink-as-text 5.90:1. Dark: ink 15.72:1, muted 9.11:1,
ink on pink 7.24:1, pink-as-text 7.98:1. The bright pink is 2.55:1 on the
paper, so it is a fill only, never text and never a focus ring. Focus is a
3px ink outline (15.72:1) with a pink halo outside it.

**Workbench.** Light: ink 16.56:1 on paper and 12.04:1 on the board,
muted 7.50:1, muted on the board 6.49:1, green 7.94:1 on paper and 5.78:1
on the board, paper on the green button 7.94:1, stamp red 6.53:1. Dark:
ink 12.06:1 and 14.19:1, muted 6.97:1, green 8.29:1 and 9.76:1, ink on the
green button 9.76:1, stamp 6.77:1. Focus is a 3px green outline.

All three: a skip link, visible labels on every field, 44px targets on
the header controls, headings in order, `<details>` for the "read mine
after you write yours" reveal, no sticky header (WCAG 2.4.11), and no
motion at all, so there is nothing for `prefers-reduced-motion` to stop.
The rotated paper in Workbench is under 1.5 degrees and never applies to
the reading sheet on the stage page.

## Margins

**What it feels like.** Opening a notebook someone has been keeping
carefully. A red margin line runs down the page; to its left, short
handwritten notes in blue ("Not stages. Laps.") annotate the printed
text to the right. The two-shapes figure and the three moves are drawn in
pencil. It is the quietest of the three, and the closest to the density
skill: rules and space do the separating, and there is almost no chrome.

**Strengths.** It is the best reading experience, by a distance, and the
stage page is where people will spend most of their time. The margin is
a natural home for the things the course needs beside the text: "week 1
in a cohort", a link to the GitHub source, later a classmate's comment
or the teacher's note. Ben's own practice of a running note per app fits
it exactly. The red pencil focus ring passes.

**Risks.** Handwriting fonts tip into whimsy quickly; Kalam is kept to
one level (the margin notes) and must stay there. On a wide screen the
right third of the home page is empty, which reads as calm in a notebook
but may read as unfinished to some. It is the weakest of the three at
"movement": the mark is gentle, and a meetup poster made from it would
be quiet.

**How it extends.** *Cohort page:* a two-page spread, dates and the
session list on the right, the members' names and their apps' one line
"who it is for" written in the margin. *App page:* a specimen entry that
grows: the student's why paragraph at the top, then a dated log of their
bring-backs down the page, with partner and teacher comments as margin
notes (labeled as AI when they come from the student's agent). *Session
page:* the three parts of a session as three numbered pencil circles,
with the "four questions" block printable on its own.

## Broadside

**What it feels like.** A two-colour risograph zine: heavy wood-type
heads, a pink plate printed slightly off the black one, a typewriter
face for captions, and a toolkit that is literally a flyer with tear-off
tabs. It is loud, warm, and political in the way a community poster is.

**Strengths.** It is the strongest brand. The stamp mark works at
favicon size, on a sticker, on a T-shirt and on a slide, and "THIS
SOFTWARE IS HUMAN SHAPED" around it is the declaration badge already
made. A Human-Shaped Hackathon poster, a meetup flyer and a README badge
all come out of this system with no extra design work. The numbered
sections ("No. 1 The method") make a long home page easy to scan.

**Risks.** Poster type is tiring for long reading, so the stage page
leans on Source Serif and keeps Bowlby One for heads only. Uppercase
headlines are harder for some readers and must never carry a sentence.
Fluorescent pink is a fill only (2.55:1 on paper). Riso style is
fashionable, so it could date; the cure is restraint with the
misregistration, which is used on the title and the numerals only.

**How it extends.** *Cohort page:* an issue of the zine. "Cohort 1,
Issue 3" as the masthead, the week's scope as the lead story, members as
a printed roster. *App page:* a classified that grows into a feature,
with the student's own words as the pull quote. *Session page:* a
programme you could print and hand out, the four questions as a full
poster at the end.

## Workbench

**What it feels like.** The board inside the door of a shared workshop:
pegboard, things pinned and taped up, a sign-up sheet on a clipboard,
work tickets for each app in progress, a "take one" pile for the toolkit.
It is the most social of the three. You can tell other people are here.

**Strengths.** It shows the social hub best. "On the bench" turns the
showcase into work in progress rather than a gallery of finished things,
which is what the vision asks for ("see their works in progress as they
are building"). The blank ticket is an honest empty state. Atkinson
Hyperlegible Next is the most readable body face of the three, and has
the right story for a learning site. The tag mark reads as "something
someone made, with a person on it."

**Risks.** It is the busiest, and the easiest to overdo: more tape, more
pins and more rotation would turn it into a skeuomorphic theme. Pegboard
dots are a regular pattern, the most "generated" texture here, so they
stay faint. Paper on a board means every section is a container, which
pulls against the density skill's "no tinted boxes"; it works only
because the pieces are few and different sizes. Permanent Marker is
a familiar face and should stay on two- to four-word labels.

**How it extends.** *Cohort page:* the cohort's own board, one ticket per
member pinned by group (pairs and trios sit together, so each person can
see their partners), the next session as a note at the top. *App page:*
the ticket opened into a full sheet, with the repository's recent commits
as a clipped log and GitHub Discussion threads as notes pinned beside it.
*Session page:* the clipboard, with three sections to tick through live.

## Recommendation

**Margins for the learning environment, with Broadside's mark for the
movement.**

Most hours on this site will be spent reading a stage and writing in
the margins of one's own app, and Margins is the only one of the three
built first for that. It also fits the template best: one column,
almost no chrome, six type levels, and a margin that gives teacher
notes, partner comments and GitHub links a place without adding boxes.

But Margins is too quiet to start a movement on its own. Broadside's
stamp is the strongest mark of the three, and the toolkit needs exactly
what it does well: a declaration badge, a meetup flyer, a hackathon
poster. So, I would take the stamp (redrawn in Margins' red and
graphite, with the pink kept as the toolkit's one loud colour) as the
logo, and use Broadside's printed style only inside the toolkit pages,
where a person is making something to hand out.

Workbench is the best answer to "people see one another's apps in
progress", and its "on the bench" ticket is worth keeping as the
showcase entry in either direction. As a whole site, it asks for the
most decoration to work, and that is the habit this site is trying to
avoid.

If Ben prefers one direction whole rather than a blend, Margins is the
safest to build and Broadside is the boldest.
