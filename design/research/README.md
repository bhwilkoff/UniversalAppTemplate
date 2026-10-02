# Design research for round 2

October 2, 2026. Ben turned down all three round-1 directions and asked
for more web design research before the next try, because the first
three read as "extremely tired attempts at designing for a movement."
These are the notes from that research. Every site below was rendered
in headless Chrome at 1440px and looked at, not described from memory.
The screenshots live in `shots/`, which is git-ignored on purpose: they
are other people's work, so we keep only our notes.

Headless Chrome rendered most sites in their dark theme, which turned
out to be useful: it showed which designs hold up in both.

## What I looked at

**Publications and essays.** Rest of World, The Marshall Project, The
Public Domain Review, Every, The Creative Independent, Craig Mod (home
and an essay), Robin Sloan, Ink & Switch (home and the local-first
essay), Maggie Appleton, Stripe Press (a book page; the home page draws
everything in WebGL and rendered empty).

**Movements, schools and nonprofits.** Recurse Center (home and About),
Small Technology Foundation, Processing Foundation, Hack Club, Nicky
Case. Mozilla Foundation and New_ Public sat behind a bot check and a
cookie wall, and Low-tech Magazine timed out, so they are not counted.

**Software made with care.** Things (Cultured Code), iA, Panic, Linear,
Readwise, Are.na, Kinopio, Buttondown.

**Galleries, to find more.** Minimal Gallery and siteinspire. Both are
mostly agency sites built to impress other designers, which is a
useful warning in itself: very little in either gallery is trying to
invite a beginner in.

## Site by site

| Site | Type | Palette | What it does well | What to avoid |
|---|---|---|---|---|
| Recurse Center | One grotesque sans in two weights (light for section heads, bold for the hero) | White, near-black, one green for buttons and links | Real photos of real people working, a single quote with a name and a batch date, and a 60ch column. The hero is one sentence | The three photos in a row are a pattern; the purple quote mark is a second accent it does not need |
| Recurse, About | Same sans | Same | A long page that is easy to read because it is just good paragraphs and a quiet "further reading" list beside them | Nothing; this is the model for our stage page's calm |
| The Public Domain Review | A transitional serif for everything, with italic used as a second voice in the wordmark | Paper white, ink, one deep navy | The wordmark is just type set with care (*The* in italic, *Review* in italic caps). Tags are colored text, not pills | Busy sidebars on both sides |
| Stripe Press, book page | One serif, roman and italic | A soft wash, ink, hairline rules | Italic section labels ("Praise", "Author") after a short rule. Purchase links are a plain bordered list. Utterly confident because almost nothing is on the page | The pastel gradient wash is a signature we must not copy |
| Craig Mod | A humanist sans for UI, a serif for the essays | Charcoal, cream text, one blue button | The essay column is the best long reading of the set: about 70ch, generous leading, section breaks as a short centred rule | The home page stacks newsletter form, laurels and shop; too many asks at once |
| Ink & Switch, local-first essay | A text serif, a humanist sans for heads, notes in the margin | White, black, a grey contents block | Margin notes that are real footnotes, not decoration. Authors named at the top | We already tried margin notes; Ben read ours as fake. The difference is that theirs are citations |
| Maggie Appleton | A display serif for the hero, a light sans for the rest | Warm dark, one pink | Drawn illustrations in one consistent hand, each made for its essay | The hero sentence in two greys is a tell of the 2022 portfolio style |
| Robin Sloan | A blackletter display wordmark, a humanist sans for everything else | Paper grey, ink, one orange | A personal site that reads like a letter; a live count of library holds is warmth from real data | Blackletter is a personality only he can carry |
| The Creative Independent | A serif for the letter, a monospace for the quotes | White, black, pastel highlights | "Dear reader," as the opening. Every quote has a named person | The collage of tints and the mono is the busy register Ben disliked in Broadside |
| Rest of World | A grotesque for heads, a serif for decks | White, one electric blue, illustration color | The wordmark's diacritics are an idea carried in type alone | A news homepage: dense, many focal points |
| The Marshall Project | A serif for headlines, a mono for labels | Off-white, black, one red | Long list with an image left and the story right; easy to scan | Mono labels again |
| Every | A display serif with swash caps | Black, one pale blue | Confident editorial grid | Collage illustration and AI-product cards; the house style of AI media |
| Small Technology Foundation | A geometric sans | Teal, black, many tinted pills | Two real people in the header, talking through tin cans. You know who is behind it | Rotated multicolor pills, emoji hearts. Warm, but not polished |
| Processing Foundation | A geometric sans | White, violet, coral | A group photo of real contributors, captioned with where and when | Tick marks and corner brackets on every block: decoration standing in for structure |
| Hack Club | A soft serif for the hero, a sans for UI | Dark plum, cream, rainbow word | The real photos are what work | Tilted polaroids, stickers, rainbow gradient text: the "movement" kit we have to avoid |
| Nicky Case | A grotesque, hand drawings | White, black, one red | One drawn character, everywhere, so the hand is consistent | "Shtuff" voice; the hand-drawn look is earned over a decade |
| Things | One rounded sans | Pale blue-grey, one blue | One focal point per screen: the icon, then the sentence, then the product. Nothing competes | Product renders; we have no product to render yet |
| iA | One sans, large and light | White and black panels, one blue | Each section is one name, one line and one button | The floating 3D toolbar pieces |
| Panic | One sans | Grey, one violet | Their real work (app and game icons) is the decoration | Icon wall only works for a company with forty years of icons |
| Linear | One grotesque | Near-black | Total control of type and spacing | The 2020s SaaS template: dark, glow, logo strip, three line drawings |
| Readwise | A serif for heads, a sans for text | Peach gradient | A serif headline with one italic word is friendly | Gradient hero, three pastel icons: the AI-landing-page shape |
| Are.na | One grotesque, small | Black (in dark mode), grey | "Are.na is a. b. c." as a list; "For the last 15 years and 54 days". Real channels with real names ("Eco-Beige, by Evan Collins") | Very cool, very insider |
| Kinopio | A heavy display, a sans | White, green, bright accents | Warm, specific product; "No ads or AI crap" | Many colors and moving parts |
| Buttondown | A humanist sans, italic for emphasis | Black, one blue | Named testimonials in plain boxes | Flat-vector people with floating envelopes: the most generic illustration style on the web |

## What "clean, polished and human" has in common

1. **One or two type families, and the second one has a job.** Recurse,
   Things, iA and Panic use one family. Stripe Press, the Public Domain
   Review and Craig Mod use a serif and get their second voice from
   italic, not from another typeface. Where a site pairs two, one is for
   reading and one is for interface. None of the polished sites uses a
   monospace for labels or a script for warmth.
2. **A short type scale, used strictly.** Usually a big display size for
   one sentence, a section head, body, and a small size. Hierarchy comes
   from size and space, rarely from weight, almost never from color or
   caps.
3. **A reading measure of 60 to 70 characters,** with line height
   around 1.5 to 1.6. Recurse, Craig Mod and Stripe Press all sit there.
4. **One accent color, low in saturation, used for action only.**
   Recurse's green, Stripe Press's ink, Craig Mod's blue, the Public
   Domain Review's navy. The page is mostly paper and ink.
5. **One focal point per section.** Things is the purest example: icon,
   sentence, product, in that order, with nothing beside them.
6. **Warmth from real things, not from texture.** Real people with real
   names (Recurse's "Funmi, Winter 2, 2026", Are.na's channel owners,
   TCI's quoted artists), real counts ("15 years and 54 days", Robin
   Sloan's library holds), real work (Panic's icons). None of the
   polished sites uses paper grain, tape, pins or rotation.
7. **Wordmarks are type set with care.** The Public Domain Review's
   italics, Stripe Press's interlaced S, Rest of World's diacritics,
   Recurse's small pixel computer. One small idea, executed precisely,
   never a badge or a stamp.
8. **Buttons are plain and few.** One filled style for the one action,
   a text link for everything else.
9. **Space is the separator.** Rules are hairlines; cards, where they
   exist, are flat and quiet.

## What reads as "AI-generated" or "a tired movement"

- Bold condensed uppercase headlines, riso pink and yellow, stamps,
  stickers, tilted paper, tape and polaroids (Hack Club, Small Tech, our
  Broadside and Workbench). It was fresh around 2018 and is now the
  default "grassroots" costume.
- Script or marker fonts as a sign of humanity (our Margins and
  Workbench). It reads as a callout trying to be friendly.
- Monospace labels and numbered "No. 1" badges on a site that is not
  about code (Marshall, TCI, our Broadside). It signals "tech" to
  people who are not technical.
- Hero, three icons, three short captions (Readwise, Linear). The
  captions are always commands or fragments.
- Pastel gradient washes, glow and floating 3D objects.
- Flat-vector people with oversized limbs (Buttondown).
- Copy in strings of short declaratives and two-word fragments. Every
  polished site above writes in full sentences; Recurse's About page is
  nothing but full paragraphs, and it is the most persuasive page in
  the set.
- Placeholders presented as content: dashed "your app here" boxes, "not
  set yet" notes, draft stamps. They make the whole site feel unfinished.

## Five principles for round 2

1. **Type does the work, in at most two families.** One serif for
   reading, and at most one humanist sans for the interface. Italic is
   the second voice. No monospace, no script, no display poster type, no
   all-caps headlines.
2. **One focal point per section, and one action per page.** Each
   section leads with a single sentence or a single figure. "Sign in
   with GitHub" is the one filled button; everything else is a link.
3. **Paper, ink and one accent.** A warm neutral background, a near-black
   text color, one muted accent for action and focus, and nothing
   saturated. Dark mode is the same three, inverted with care.
4. **Warm because it is real.** Ben's actual apps, actual dates, actual
   counts and actual words, set beautifully. No texture, no tilt, no
   tape, and no placeholder that admits the site is unfinished. Where
   something does not exist yet, the copy says when and how it will,
   in a full sentence.
5. **Written the way Ben talks.** Full sentences that carry an idea
   through a clause, a short one only as a landing, and headings that
   are statements. If a line could be a caption on any startup's page,
   it gets rewritten.
