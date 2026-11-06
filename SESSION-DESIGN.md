# The session page's design

Binding for `/session/`, like DESIGN-KIT.md and ADDON-DESIGN.md. Fix this file first, then the page.

Ben, November 6, 2026: "Ideally, I'd like it to be easy to navigate, well designed with strong design language and interface elements, and I'd like it to be visual. Right now the slides are being edited as plain text, but they should render and be editable as a WYSIWYG experience."

The page prepares a session and holds what came of it. A session is run only in the add-on (DECISIONS.md), so nothing here is a live control.

## The shape

```
Week 2                                  [Join the call]
Wed, Nov 11, 1:00 to 2:00 PM   Ready
(0) (1) [2] (3) (4) (5)

Before 0 of 4   Plan   Recording   Details

[====|==|========|=====|===|=======|==]  60 of 60 minutes
+-------+ +-------+ +-------+ +-------+
| slide | | slide | | stage | | slide |
+-------+ +-------+ +-------+ +-------+
0:00 Talk 0:06 Talk 0:10 Show 0:26 Talk
```

| View | Holds |
|---|---|
| Before | A learner: the questions to answer, the exchange to reply to, what to bring. A leader: who has answered, each answer, and the questions themselves, which they add, change, and remove here. |
| Plan | The hour as a bar, then every part as a picture of its main stage, in order. |
| A part | Its own address. Slides fill the page; any other kind shows its stage and its few fields. |
| Recording | The recording. Appears once there is one. |
| Details | A leader's title, challenge, and recording link. |

The page opens where the person is needed: a leader on Plan, a learner on Before, and anyone on Recording once it exists.

## The slide studio

A part's slides are edited on the slide itself.

```
+------+ +---------------------------+ +---------+
| 1    | |                           | | Layout  |
| 2 <  | |   the slide, as it will   | | Reveal  |
| 3    | |   appear on the stage     | | Icon    |
|      | |                           | | Add     |
| + Add| +---------------------------+ | a table |
|      | | Your notes for this slide | | ...     |
+------+ +---------------------------+ +---------+
```

- Click any words and type over them, in place, at their real size. Enter adds the next point; Backspace on an empty line removes it.
- The renderer always draws the slide. The editor only ever sits on top of it, so what a leader sees is what the stage shows.
- The deck stays text underneath, in the same format. "Edit as text" is always one press away, and nothing a leader can write there is lost here.
- A table's cells and a diagram's labels are typed on the slide too: Tab and Enter move between cells, and Tab past the last cell adds a row. The side panel holds only structure (rows, columns, a diagram's branches). A chart's numbers keep a grid there, because a bar has no words to type over.
- Everything saves itself and says so. Undo walks back every change.
- A learner sees the same slides and film strip, with no tools and no notes.

## Rules

1. One view at a time. A view fits its purpose, and no view holds another's work.
2. Each part has its own address, and Back returns to the plan (one content type, one page).
3. Show the thing, not a description of it: a part is a picture of its stage.
4. One filled button in view.
5. Role, state, and privacy show through the kit's shared pieces, never a caption.
6. No live controls, ever.
7. Designed at 375px first. The film strip lies across the top, and the side panel follows the slide.
8. Nothing here counts a learner's progress or compares people. A leader sees who answered, as names.
9. Every field, select, and button is the site's own (DESIGN-KIT.md), with nothing restyled here. Size comes from the kit's `.small`, color from its button classes.
10. A part saves itself, on purpose: this inverts the kit's rule that text saves with a button, because a slide edited in place has no moment to press Save.
11. Slides are always drawn in the stage's dark colors; the page around them follows light and dark.
