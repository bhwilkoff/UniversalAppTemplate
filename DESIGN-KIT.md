# The Human Shaped design kit

Binding, like PAGES.md. PAGES.md says which page holds what; this file says
what every page is built from. Before adding a sentence to a page, find the
part below that makes it unnecessary. If none fits, add the part here first,
with its research, then use it.

Ben, October 21, 2026: "You are still building a site that is explaining
everything as text rather than actually building a sustainable platform
that has design elements and a common language that can continue to be
built upon," and "I want this to be fully research based, just as
everything else we do (in the cohorts) needs to be."

Sources: research/notes/design-kit-research.md (the systems and studies
behind each part), research/notes/navigation-and-wayfinding-notes.md,
research/notes/links-and-actions-notes.md, research/notes/design-patterns.md,
research/notes/ai-design-anti-patterns.md, and the audit of every surface
in research/notes/audit-2026-10-21/.

Code: `assets/ui.js` builds each part (`UI.status`, `UI.visibility`, …);
`assets/site.css` styles them under "The hub's shared pieces".
`tools/test/design-kit.test.mjs` fails when a page breaks a rule it can
check.

## The writing rule

A sentence on screen is allowed only when it is one of these, and then it
is one short sentence:

1. **A refusal**: what you cannot do here, and why ("Only the people in
   this cohort can see it.").
2. **A warning**: what a step will do that cannot be undone or will be
   seen by others ("Its page will say it was revoked.").
3. **A fact you cannot see by looking**: where something goes, who sends
   it, what happens later ("Your video stays in your Google Drive.").

Everything else is a part: who can see something is a visibility marker,
a state is a status label, a count is a count, an empty list is an empty
state, rare detail is a disclosure, how a feature works belongs in the
guide. Labels are a few words; buttons are verbs that name the thing
("Sign all", "Add the group"); success is "Saved", not a paragraph.

## The parts

### Page header
- **What**: crumbs (PAGES.md), the heading that names the thing, then
  facts, then the toolbar.
- **Words**: the heading is the thing's name ("Kit test", "Signing"),
  never a slogan.
- **Not**: an intro paragraph under the heading on a hub page.

### Facts (`UI.facts`)
- **What**: the few facts about one thing a person checks most (status,
  when, length, how many), as names and values.
- **When**: a page or row about one thing with more than one fact. Never a
  run-on sentence or an "A · B · C" string.
- **Accessibility**: a `<dl>`; names stay visible (not placeholders).

### Status label (`UI.status(tone, word)`)
- **What**: a thing's state as an icon and one or two words.
- **Tones**: `done` (finished, signed, open, verified), `waiting` (to do,
  with someone else), `time` (happening now, running), `off` (draft,
  closed, not set), `alert` (failed, revoked, needs attention).
- **Words, fixed per kind of thing**:
  - cohort: Draft, Open for joining, Running, Finished
  - poll: Taking answers, Closed
  - credential: Not recorded, With the signer, Signed, Revoked
  - request to teach: Waiting for an answer, Approved, Declined
  - exchange: Open, Closed to new videos
  - an app: Not on the apps page, On the apps page, Hidden by a teacher
  - work: Ready, Not yet, Confirmed
  - a step: Done, To do, Optional
  - a signing key: Key ready, No key chosen
  - an action under way: Signing, Saving
- **Accessibility**: the word carries the meaning; the icon and color only
  repeat it (WCAG 1.4.1).
- **Not**: a pill with a colored fill, or a sentence ("Draft, visible only
  to you").

### Visibility marker (`UI.visibility(who)`)
- **What**: who can see this, as an icon and fixed words, everywhere
  privacy used to be explained in prose.
- **Audiences**: Only you · You and your teachers · Only teachers · Your
  cohort · Human Shaped members · Anyone with the link · Everyone ·
  Public on GitHub · Stays on this computer.
- **When**: beside the field, section, or row it describes. Two markers
  when two things differ (an exchange for "Your cohort" whose video file is
  "Anyone with the Drive link").
- **Not**: "Only you and the cohort's teachers can read these" in a
  paragraph.

### Count (`UI.count`)
- **What**: how many things wait, beside the name of where they are.
- **Not**: a sentence ("Someone is waiting for your feedback"), a score,
  a streak, or a comparison with anyone.

### Rows (`UI.rows`, `UI.row`)
- **What**: a list of things of one kind: the title (a link when it has a
  page), one meta line, a status, and at most two actions on the right.
- **When**: every list of cohorts, polls, exchanges, people, credentials,
  queue items.
- **Not**: a card per item with its own paragraph.

### Empty state (`UI.empty(text, action)`)
- **What**: one short line saying what is missing, and at most one action
  that fills it ("No cohorts yet" + "Plan a cohort").
- **Not**: "When one opens, it will be listed here."

### Disclosure (`UI.disclosure`, `<details class="ui-disclosure">`)
- **What**: detail most people never need, closed until asked for: a
  manual fallback, the why behind a rule, outside steps (Meet, a phone's
  recorder).
- **Not**: a place to hide what everyone needs.

### Toolbar (`.ui-toolbar`)
- **What**: the actions for the thing on the page, in one row: at most one
  filled button, first; then outlined ones; red only for what is hard to
  undo, last (DECISIONS.md, "Actions and links").
- **When**: a page or tab with more than one action.

### Tabs (`UI.tabs`)
- **What**: sections of one thing, each with its own address (`?t=`),
  shown one at a time, drawn as a row of links with the current one
  marked.
- **When**: a page whose jobs a person does at different times (the
  teaching page). Never stacked under another row of links.

### Confirm step
- **What**: a hard-to-undo action asks once more, on the page, with the
  button naming the consequence ("Delete Kit test, with its sessions").
- **When**: deleting, revoking, removing someone, giving or taking admin.
  Not for reversible changes.
- **Not**: `window.confirm`, or no confirmation at all on a delete.

### Inline status (`.ui-inline-status`, `role="status"`)
- **What**: the result of an action, next to the control that caused it,
  in a word or two ("Saving", "Saved", "Not saved: <reason>").
- **Not**: a paragraph of what happens next.

### Notice
- **What**: the only place for a sentence that warns or refuses, in an
  inset panel.

### Navigation
- PAGES.md, "How you find your way": the signed-in sidebar, an area's row
  of links, a cohort's header, breadcrumbs that end at the parent.

## What it never uses

From research/notes/ai-design-anti-patterns.md: no tracked capitals, no
label above a heading unless it carries information, no colored stripes,
no rows of identical icon cards, color in inset panels only, no emoji as
interface.
