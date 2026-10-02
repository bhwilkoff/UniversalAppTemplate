# Round 2: two directions for humanshaped.org

October 2, 2026. Ben turned down all three round-1 directions (in
`design/directions/`), and his notes on them are the brief for this
round. Before designing anything, I rendered and studied about thirty
well-regarded sites; the notes and the five principles that came out of
that are in `design/research/README.md`. This round has two directions
rather than three, and each one has a home page and a stage page (stage
00, Why we build, in its real text). Nothing here touches the live
`index.html` or `styles.css`.

Open them from disk, or serve the folder (`python3 -m http.server`) and
visit `design/round-2/<name>/`. Add `?dark` or `?light` to force a
theme; the moon button in the header switches it and remembers the
choice. Screenshots at 375px and 1440px, light and dark, are in each
direction's `shots/` folder.

| | Reading Room | Commons |
|---|---|---|
| Feels like | A well-made book from a small press | A clear, friendly hub for a community |
| Type | Literata only, roman and italic (one family, built for reading on screens) | Commissioner only (one humanist sans, built for text and interface) |
| Color | Warm paper, ink, one moss green | Off-white paper, ink, one clay red, a soft stone tint for alternate sections |
| Mark | The raised hand: a lowercase "h" that is also a person with a hand up | The joined hyphen: "human-shaped" with the hyphen drawn as an arch |
| Layout | Each section is a heading on the left and its text on the right, separated by hairlines | Alternating bands, flat cards for the apps and the cohort steps, a five-week card beside the hero |
| Strongest at | The learning environment: the stage page is the best reading on either site | The hub and the movement: what a cohort is, and how your app is seen, is clear at a glance |

## How each answers Ben's feedback

**"The workbench feels way too 'work in progress'."** Neither direction
has a tilted, taped, pinned, dashed or stamped element anywhere. There
are no placeholder boxes ("your app here", "dates not set"). Where
something does not exist yet, a full sentence says what will happen:
"The first cohort's dates will be posted here, and signing in is how you
will hear about them first." The layouts sit on a grid and stay there.

**"The chunky font is not at all polished nor does it feel particularly
human."** Each direction uses one family, chosen for long reading:
Literata (a book face made for screens, with optical sizes so the
headline and the text are cut differently) and Commissioner (a
low-contrast humanist sans, warm at small sizes and confident large).
No stencil, poster, marker or slab faces.

**"I do like the sign in with GitHub design and the overall ease of
understanding."** Both keep it: a dark, plainly labeled "Sign in with
GitHub" button with GitHub's mark, in the header and the hero, and once
more at the end. It is the only filled button on either page, so it is
always the obvious next step, and a short sentence under it says why
GitHub ("that is where your app will live"). Commons goes furthest on
ease of understanding: the five weeks sit beside the hero, and "how a
cohort works" is three drawn steps (your app lives on GitHub, it gets a
page here, your cohort talks it through).

**"So many different fonts going on at once. It is hard to know where
your eyes should look."** One family per direction, and one focal point
per section: a single headline, then its text, then at most one figure
or one list. Hierarchy comes from size and space, not from changing
typefaces, colors or caps.

**"The logo absolutely doesn't work and the colors are all wrong."**
Both palettes are paper, ink and one muted accent, used only for links,
the focus ring and a few small labels. Nothing fluorescent, no
gradients. Both logos are drawn below with their reasoning.

**"The code-like fonts are not a good match."** No monospace anywhere,
including the file names on the stage page (`AGENTS.md` is set in the
text face, in bold).

**"The 'handwritten' fonts in the margins read as AI callouts trying to
be human."** No script fonts and no margin notes. Warmth comes from real
things set carefully: Ben's own apps in their own words, real dates and
counts ("4,306 commits by the end of September"), and two small drawings
of the difference between computer-shaped and human-shaped work (one
film with five identical generated blurbs beside it, and the same film
with three people and their notes, each a different length).

**"All of the language is the AI 'short sentences and commands
punctuated by periods'."** Every line was rewritten in the voice of
BEN.md: first person where it is Ben, sentences that carry an idea
through a clause ("A cohort runs for about five weeks, with one live
session each week on Google Meet, and every person in it builds one real
app of their own for people they can actually name."), headings that
are statements, no captions written as commands, no runs of short
sentences, no em dashes and none of the banned words (checked with a
search across every page). The stage page keeps Ben's own text from
`00-why-we-build.md`, with a few joins and trims.

**"These all seem like extremely tired attempts at designing for a
movement."** The research names the costume (riso pink, stamps, stickers,
tilted polaroids, condensed caps, marker fonts) and both directions
leave all of it out. They borrow instead from the places that feel
cared-for without trying: the Recurse Center's plain paragraphs, Stripe
Press's restraint, the Public Domain Review's wordmark, Things' one
focal point per screen.

## The logos

Both marks were drawn in SVG on a 32-unit grid, checked at 16px, 32px
and 200px, and need no detail that disappears small. I also drew and
rejected three "person inside a shape" marks (a figure between brackets,
in a ring, in a doorway): at every size they read as a default user
avatar, which is the habit to avoid.

**Reading Room: the raised hand.** A lowercase "h" whose stem rises
past a round head, so the letter is also a person with a hand up. A
raised hand is the oldest gesture in a classroom: asking, offering,
"I'm here." It says learning and participation without a sparkle or a
screen, it is the first letter of "human", and it is three strokes, so
it holds at 16px (the favicon is the mark reversed out of a moss
rounded square) and works as a die-cut sticker. Set beside the wordmark
"Human *Shaped*", with Shaped in Literata italic.

**Commons: the joined hyphen.** The wordmark is "human-shaped" in
lowercase, with the hyphen drawn as a small clay arch. The hyphen is
what makes two words into one idea, and drawing it as an arch turns
it into a bridge, a shoulder, a doorway: something human joining the
two. It is a typographic idea in the tradition of the Public Domain
Review's italics and Rest of World's accents, so the logo is mostly
just the name, set well. Alone, the arch becomes the favicon (cream on a
clay rounded square), and on a sticker or a README badge it reads as
"human⌒shaped" without explanation.

## Accessibility

Ratios computed with the WCAG 2.x formula (`contrast.py` in the
session scratchpad); all pass AA, and most pass AAA.

**Reading Room.** Light: ink 15.90:1, muted 6.67:1, moss 7.35:1, muted
on the tinted surface 6.06:1, paper on the ink button 15.90:1, paper on
the moss hover 7.35:1. Dark: ink 14.57:1, muted 7.41:1, moss 9.27:1,
ink-on-light button 14.57:1. Focus is a 3px moss outline with a 3px
offset (7.35:1 light, 9.27:1 dark). Hairline rules are decorative; the
figure's outlines (3.32:1 light, 3.24:1 dark) pass the 3:1 for
graphics.

**Commons.** Light: ink 15.64:1, muted 6.22:1, clay 5.94:1, clay on
the stone tint 5.21:1, muted on white cards 6.73:1, white on the ink
button 16.91:1, white on the clay hover 6.42:1. Dark: ink 15.13:1,
muted 7.86:1, clay 8.76:1, clay on cards 8.08:1. The closing band is
dark in both themes (text 14.11:1 light, 12.54:1 dark; muted 7.33:1 and
7.46:1), and inside it the focus ring switches to light clay (8.16:1
and 7.26:1), because clay on near-black would fail.

Both: a skip link, one `h1` per page and headings in order, every
control at least 40px (44px on wider screens), labelled icon buttons,
decorative SVG hidden from screen readers, no motion at all, no sticky
header (the stage page's contents column is sticky beside the text,
never over it), and `text-wrap: balance` on headings so no line ends
in a lone word. Both were built at 375px first; the stage page's
contents move below the article on phones so the reading starts at
once.

## Recommendation

**Commons for the site, with Reading Room's stage page as the reading
mode inside it.**

Ben's clearest praise in round 1 was for ease of understanding and the
sign-in, and Commons is the stronger of the two at both. A newcomer
learns in one screen that this is free, that it is five weeks, what
each week asks of them, and what to press. Its flat cards and the three
drawn steps of a cohort give the hub's future pages (a cohort, an app,
a session) an obvious, finished shape to grow into, and the joined
hyphen is the more ownable mark for a toolkit, a badge or a hackathon
poster, because it is the name itself.

But the stage pages are where people will spend their hours, and
Reading Room reads better: a book face, a 38rem column, italic theses
and quiet hairlines. Literata and Commissioner pair well, so the cost
of taking both is one family on the reading pages and one everywhere
else, which keeps within the two-family rule.

If Ben would rather take one direction whole, Reading Room is the
calmer and more literary of the two, and Commons is the warmer and
easier to understand. I would ship either without apology. Neither
looks like Archive Watch, Tidbits Trivia, Bsky Dreams or BOBA Playbook.
