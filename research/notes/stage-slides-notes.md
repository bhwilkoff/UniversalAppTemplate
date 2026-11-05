# Slides on the main stage

*Written by Claude, November 4, 2026.*

## What was looked at

Tiny Little Office (https://github.com/aboard-io/tinylittleoffice, MIT), at commit
2e62769: ten apps in TypeScript, built with Vite, with a Lit editor for each.

| Part | Taken | Why |
|---|---|---|
| The deck format | Yes | Plain text a leader or an agent can write, with no file or app |
| Renderer (`deckPages`) | Yes | Draws SVG with no page around it; measures words to fit |
| Fit checks (`lintDeck`) | Yes | Says a headline is cut before anyone sees it on a stage |
| Sheet and diagram | Yes | Tables, charts, and diagrams on a slide |
| Its editor | No | Needs Lit and a build step, and a narrow Meet panel has no room for it |
| Links as documents | No | A session already has a home; a deck in a URL has no clock or questions |
| Maps, calendars, animation | No | Not asked for, and they add weight |

The bundle is 77 KB compressed, and only the stage loads it at once; the editor
fetches it when opened.

## Checked before building

- Text with script, image, and event attacks, drawn in Chrome: all shown as words,
  and nothing ran. Slide text reaches every stage, so this stays a rule: draw
  only through the deck kit.
- Learners can read `scenes`, so speaker notes cannot live there.

## Not done yet

- Charts and diagrams sit on a white card, in the renderer's blue.
- Bullets do not appear one at a time.
- Clicking on a slide to change its words: the words are changed in the text.
- A deck in the plan on the session page is shown to learners only as the part's words.
