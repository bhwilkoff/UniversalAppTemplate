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

## Added after the first test

- Tables, charts, and diagrams now take the site's palette, in `tools/deck-kit/entry.ts`: each of the renderer's colors maps to one of ours, and a table with no chart is drawn as a plain table, not a spreadsheet.
- `{.build}` on a headline shows a slide's lines one at a time. `show_state.slide` counts stops, not slides (`SlidesLib.frames`).
- A click on words in a session page preview selects them in the text.
- Everyone can read a part's slides in the plan.

## Not done

- Pictures on a slide. The format has icons but no images.
