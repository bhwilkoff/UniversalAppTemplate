# Anti-patterns: what makes a site read as AI-made

October 6, 2026. Ben, after early feedback that the site "feels like it
was written/designed by AI": research the design and interface patterns
typical of AI-built sites, turn them into anti-patterns, and audit
humanshaped.org against them, keeping a modern design.

## What the research says

The clearest finding, repeated in every source: AI design looks the
same because a model answers an open request with the average of what
it was trained on. A tell is "a default nobody chose," not proof that a
model made the page, and designers shipped most of these before LLMs.
The fix is always the same move: replace a default with a decision that
comes from the subject itself.

The sources also agree that the defaults now come in **two orders**:

1. **The median** (2024 and 2025): a purple-to-blue gradient, Inter, a
   centered hero over three icon cards, untouched shadcn components,
   glass everywhere, emoji as icons.
2. **The tasteful escape** (2025 and 2026): what models produce when
   told to avoid the first order. Anthropic's own `frontend-design`
   skill lists five clusters, and the first is **a warm cream ground
   with a terracotta or clay accent**, which is Claude's own interface
   color. The others are near-black with one acid-green or vermilion
   accent, "broadsheet" hairline rules, the identical-rounded-card kit,
   and **template chrome**: tracked ALL-CAPS labels above every heading,
   `A · B · C` meta strings, monospace labels, and a `→` on every link.

A **third order** is forming: grain, hand-drawn type, scrapbook collage,
reached for to *look* human. The sources call it legitimate only when
the subject earns it, and the next reflex when it does not. So, the goal
here is not to look handmade. It is to show the people and the work that
are actually here.

### Sources

Read in full (cloned from GitHub into the session):

- `funboy322/avoid-ai-design`, its tells catalog, which cites Adrian
  Krebs's study of about 1,400 Show HN sites, Anthropic's
  `frontend-design` skill, and a Reddit-mined ranking of AI-site
  complaints (https://github.com/funboy322/avoid-ai-design). Its
  zero-dependency scanner was run on this site (below).
- `conorbronsdon/avoid-ai-writing`, its patterns catalog for prose
  (https://github.com/conorbronsdon/avoid-ai-writing).
- `pbakaus/impeccable`, `hardikpandya/stop-slop`, `Leonxlnx/taste-skill`,
  and the tropes.fyi gist (ossa-ma), for corroboration.

Read through search summaries (the pages themselves are blocked from
this session): Wikipedia's "Signs of AI writing"; 925studios, TeneX
Studio, NewWebsite.ai, Developers Digest and The Fountain Institute on
AI design tells; Anthropic's "Improving frontend design through Skills";
and several write-ups on eyebrow labels and "not X, it's Y."

## The anti-patterns, and where this site stands

Severity follows the catalog: **P0** a layperson notices, **P1** a
designer or developer notices, **P2** craft. "Here" is what the site does
today.

### Design

| # | Anti-pattern | Here | Severity |
|---|---|---|---|
| D1 | **Cream ground and a clay or terracotta accent** (the Claude look) | Yes: paper `#F7F6F2`, clay `#A23F22`, light clay `#F0A184`. This is the cluster by name. | P1, and the one people describing "the AI look" now point to |
| D2 | **Tracked ALL-CAPS labels above headings** ("eyebrows") | Yes: a kicker above most section headings, plus uppercase labels in the footer, the principles, the case study, and the week list | P1 |
| D3 | **An arrow on every link** | Yes, added on October 6 to every link that stands on its own | P1 |
| D4 | **Identical icon-topped cards in a row of three** | Yes: "Ways in" on the home page and "Host one" on Events (a Phosphor icon, a title, a line) | P0 |
| D5 | **One radius and a soft shadow or grey border on every surface** | Mostly: `--radius: 14px` on 40 surfaces, a 1px rule around nearly every card | P1 |
| D6 | **A colored stripe on a card's top or left edge** | Yes: the principles card on the home page has a clay top border, and notices use a clay left stripe | P1 |
| D7 | **Decorative 01 / 02 / 03 numbers** | No: the numbers here mark real sequences (the stages, the fifteen principles) | Keep |
| D8 | **The stock section order** (hero, logos, features, how it works, stats, CTA) | Partly: the home page runs hero, showcase, idea, method in three cards, ways in in three cards, sign-in band | P1 |
| D9 | **A hero that could front any product** | No: the headline and pitch are specific to this work | Keep |
| D10 | **Placeholder or stock imagery** | No: the apps' real App Store screens. But there are no people at all: no photo of Ben, a cohort, or an event | Gap |
| D11 | **Same fade-up motion on everything** | No: the site barely animates | Keep |
| D12 | **Muted text below contrast AA** | To check: the scanner flags `--band-muted` on white; on the dark band it passes | Check |
| D13 | **No visible keyboard focus** | The scanner looks only in each page's HTML; focus styles live in `site.css` | Check in the render |
| D14 | **Pill badges and status chips with nothing behind them** | No | Keep |
| D15 | **A four-column footer** | No: three short columns and one line | Keep |

### Writing

| # | Anti-pattern | Here | Severity |
|---|---|---|---|
| W1 | **"Not X, but Y" and its cousins** ("rather than," "instead of," "never X") as a habit | Frequent in the site's own copy ("rather than for profit," "never a replacement," "instead of a session") | P1 when stacked |
| W2 | **Reflexive groups of three**, especially after a colon | Frequent: "the ideas, the method, and the tools," "who it is for, when it meets, how many people can join, and who can see it" | P1 when it is padding |
| W3 | **Bold one-line pull-quotes and aphorisms** ending a section | Several, mostly in Ben's own template writing ("An agent keeps only the values you write down.") | Ben's voice: keep where he wrote them, cut ones Claude added |
| W4 | **Labels instead of sentences** (kicker + heading + one line) | The kicker pattern again (D2) | P1 |
| W5 | **Meta-commentary about the page** ("This page says...") | Mostly removed on October 5 | Check |
| W6 | **Words on the WRITING.md banned list** | Rare; "leveraged" stays only in Ben's quoted piece | Keep checking |
| W7 | **Uniform rhythm**: every paragraph the same length, every card one sentence | Yes in the card rows (D4) | P2 |
| W8 | **Copy with no person in it**: no names, dates, or "I" | The template's pages have Ben's "I" and real dates; the site's own pages mostly speak as no one | Gap |

## What would make it read as made by people

The sources agree on what works, and none of it is a new trend:

1. **Choose from the subject.** Colors, type, and the one signature
   detail should come from what this work is made of. Here that is
   GitHub, a phone or TV in someone's hand, the arch in the wordmark, a
   cohort meeting on a call, the commits of real apps.
2. **Show real people and real work.** The App Store screens were the
   right move. A photo of Ben, a screenshot of a real session, a real
   commit message, or a real quote from a builder would do more than any
   style change.
3. **Fewer, larger decisions.** One structural idea per page instead of
   bands of equal cards. Vary width, density, and emphasis by what
   matters.
4. **Labels only when they carry information.** A section heading should
   say the thing; a label above it should exist only if it says
   something the heading does not (a date, a count, a name).
5. **Write as a person.** Sentences that name who and when, an "I" where
   Ben is speaking, and lists only where things are really a list.

## The audit plan

Done in passes, each verified at 375 and 1280 pixels in both themes,
then pushed:

1. **Template chrome (D2, D3, D6).** Remove most kickers, keeping only
   those that carry information; take the arrows off links and give
   standalone links one plain treatment; drop the colored stripes.
2. **Card rows (D4, D5, D8, W7).** Rebuild "Ways in" and Events' "Host
   one" without identical icon cards; vary radius and borders by role;
   give the home page one structural idea.
3. **Copy (W1 to W8).** A pass over every page the site itself writes
   (not Ben's template pages, which are his voice) for stacked
   negations, padded threes, labels, and copy that speaks as no one.
4. **Palette (D1).** Needs Ben's decision, since the clay is in the
   wordmark, the marks, the brand kit, and the social image. Options
   below.
5. **People (D10, W8).** Needs things only Ben has: a photo, a real
   quote, a session screenshot.

### The palette decision (D1)

The cream and clay were chosen before this cluster had a name, but they
now sit almost exactly on it. Three ways to go:

- **A. Keep the clay, change the ground.** A cooler or brighter white
  and a true ink, so the clay reads as one signal instead of the
  "warm editorial" pair. Smallest change; the marks and wordmark stay.
- **B. A new accent from the subject.** For example, a color drawn from
  something this work actually touches. Bigger change: the marks, brand
  kit, and social image are redrawn.
- **C. Keep both, and change everything around them.** If the clay is
  part of the identity, remove the other cluster signals (D2 to D6) and
  see whether the palette still reads as a template once they are gone.

Recommendation: start with C (passes 1 to 3 are needed anyway), look at
the result together, and decide between A and B with the page in front
of us.

## Where the audit stands (October 6, evening)

- **Pass 1, template chrome: done.** Labels above headings only where they
  carry information; no tracked capitals; no arrows on links; no colored
  stripes.
- **Pass 2, card rows: done.** The home page's three card rows became one
  idea each (a typographic contrast, the three moves as rows, and one
  closing band with the cohort as the main way in); Events' hosting row
  became two guides and a line. The scanner now reports only shadows on
  the app screenshots and the principles card, which are things that
  really sit above the page.
- **Pass 3, the site's own copy: done for the public pages.** The visible
  "these words are a draft, written with an AI agent" note on the brand
  kit is gone (the page is listed for Ben's review instead); the
  free-and-yours reassurance and "a problem only people can solve" are
  each said once; colon-led threes, stacked "rather than," and the
  aphorism endings were rewritten. The meetup and hackathon guides keep
  their lists, which are real agendas.
- **Pass 4, the palette: waiting on Ben** (options A, B, C above). With
  the chrome and the cards gone, the cream and clay are now the main
  signal left from the second-order cluster.
- **Pass 4, palette directions drawn (October 6, night):** Pencil (write),
  Sleeve (the headline), and Riso (publish), each on the real hero, the
  arch and the marks, light and dark, on a design canvas for Ben to choose.
- **Pass 5, people: begun.** Ben's own photos (September 30): his desk on
  /about/ under "Who makes it" and his testing devices beside the weeks on
  /cohorts/. Both were cropped below the menu bars, so no bookmarks or
  window titles show, and saved without metadata. Still wanted: a real
  quote from a builder and a screenshot of a real session.
