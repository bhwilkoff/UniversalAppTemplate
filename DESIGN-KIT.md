# The Human Shaped design kit

Binding, like PAGES.md. PAGES.md says which page holds what; this file says
what every page is built from and how it speaks. Before adding a sentence,
a page, or a control, find the part below that does the job. If none fits,
add the part here first, with its research, then build it in `assets/ui.js`.

Ben, October 21, 2026: "You are still building a site that is explaining
everything as text rather than actually building a sustainable platform
that has design elements and a common language that can continue to be
built upon," and "I want this to be fully research based, just as
everything else we do (in the cohorts) needs to be."

**Research:** research/notes/design-kit-research.md (GOV.UK Design
System, GitHub Primer, Shopify Polaris, Material 3, Apple HIG, Nielsen
Norman Group, WCAG 2.2, the ARIA practices guide, and how Slack, Drive,
GitHub, Canvas, and Discourse show who can see something), with the audit
of every surface in research/notes/audit-2026-10-21/ and the navigation
research in research/notes/navigation-and-wayfinding-notes.md. Each rule
below names the section of the research note it comes from (R§).

**Code:** every part is built by `assets/ui.js` (`UI.status`,
`UI.visibility`, `UI.confirm`, …) and styled in `assets/site.css` under
"The hub's shared pieces". No page draws a part by hand.
**Check:** `tools/test/design-kit.test.mjs` fails on the rules a test can
check (R§7). The rest are part of every page review, at 375 and 1280 px,
light and dark.

## How the interface speaks (R§5)

1. **A sentence only for a refusal, a warning, or a fact you cannot see by
   looking**, and then one short sentence. A sentence that explains a
   control, restates what happened, says who can see something, or names
   where an action lives is a missing part.
2. **Sentence case** everywhere; no colon after a label.
3. **Short**: a field label three words at most; a tab or row-of-links
   item one or two words; a status one or two; a result three.
4. **Buttons are verbs naming the thing** ("Make a poll", "Delete this
   draft"); the noun drops when the page is about that thing; Save,
   Cancel, Continue, and Close stand alone.
5. **One verb per kind of action**: **Remove** takes something out and it
   can come back; **Delete** ends it for good (red, confirmed); **Hide**
   and **Show** change who sees it; **Leave** ends your own place in
   something; **Take back** withdraws your own answer. The result reuses
   the verb ("Removed").
6. **One name per thing** (the lexicon below).
7. **Status words are adjectives or past forms**, never verbs.
8. **Errors say what is wrong in the field's own terms**: "Enter a title",
   "Title must be 120 characters or fewer". Never "please", "sorry",
   "oops", "invalid", "something went wrong", or the database's words.
9. **Never** "easy", "quick", "just", "click here", exclamation marks,
   ampersands, or emoji in interface text.
10. **Times on the reader's clock, written out** ("Tue Feb 2, 6:00 PM
    your time"), never an ISO date or 24-hour time.

### The lexicon (one name per thing)

| Say | Not |
|---|---|
| group | trio, room, rehearsal room (a group's Meet link is its room) |
| the apps page | humanshaped.org/apps/, the app directory |
| live session | main session, main room, session page |
| Open (a cohort, a poll, an exchange taking part) | Open for joining, Open for people to join, Taking answers |
| exchange | thread, video thread |
| leader (anyone who leads a cohort), learner (anyone in one, including someone returning) | teacher, co-teacher, student, mentor, instructor, facilitator (Ben, October 22, 2026: "the people inside of the system are either Learners or Leaders") |
| Leading (the area), Leader's guide | Teaching, the teaching page, the teaching guide |
| Human Shaped, humanshaped.org | the hub (a metaphor, not a label; Ben, October 22, 2026) |
| Admin, Roles | Running the hub |
| Overview (an area's first page) | desk, dashboard (the site's metaphors are teaching and performance: run of show, scenes, main stage, rehearsal, the showing; Ben, October 21, 2026) |

## The parts

### Page header (R§6.1)
Crumbs → `h1` naming the thing (its real name, never a slogan, and no
full stop: "Teaching", not "Run a cohort.") → one line with its status and
visibility → facts → actions → the area row or cohort bar. No intro
paragraph on a hub page (a page that has sign-in states). The document
title is most specific first. Ben, October 21, 2026, of the old /teach/
intro: "It still reads to me as overly explainatory and unpolished."

### Paragraph length
On a hub page no paragraph runs past 20 words, and no sentence a script
builds runs past 22, outside a notice or a closed disclosure. Steps in
someone else's app (Meet, a phone's recorder), a session plan's own words,
and queries are content, marked `kit: content` on their line.

### Facts — `UI.facts([[name, value], …])` (R§6.1, R§2.3)
The few facts a person checks most about one thing, as a `<dl>`. Names one
or two words; values short. An empty fact is left out. Never a sentence or
an "A · B · C" string.

### Status label — `UI.status(thing, state)` (R§6.4)
A thing's state as an icon and a word, inline, with no box, fill, or pill.
The word always carries the meaning. Five tones:

| Tone | Icon | Means |
|---|---|---|
| done | check-circle | finished, nothing left to do |
| active | circle (filled, thistle) | open, running, live now |
| waiting | circle-dashed | not started, or waiting on someone |
| off | minus-circle | draft, closed, hidden, not possible yet |
| problem | warning-circle | something is wrong and needs fixing |

The registry is the only source of status words (`UI.STATUS` in ui.js
mirrors it; a test checks they match):

- cohort: Draft (off), Open (active), Running (active), Finished (done)
- session: Planned (waiting), Ready (active), Live now (active), Finished (done)
- poll: Open (active), Closed (off), Answered (done)
- request to teach: Waiting (waiting), Approved (done), Declined (off)
- credential: Not earned yet (off), Waiting to be signed (waiting), Signed (done), Revoked (problem)
- app: Submitted (done), Not submitted (waiting), Hidden (off)
- invitation: Invited (waiting), Joined (done), Failed (problem)
- exchange: Open (active), Closed (off)
- task: Done (done), To do (waiting), Optional (waiting), Cannot start yet (off)
- connection: Live (active), Checking (waiting), Offline (problem)
- key: Ready (done), Not chosen (waiting)
- work: Ready (done), Not yet (waiting), Confirmed (done)
- showing: Open to guests (active)
- right: Held (done), Not held (off)
- action: Saving (waiting), Signing (waiting), Failed (problem)

### Visibility marker — `UI.visibility(audience)` (R§6.5, R§2.15)
Who can see this, as an icon and fixed words, narrow to wide. Each word is
defined once, in a popover on the marker. The narrowest audience that
works is the default and is always shown. Widening to a link or everyone
is a confirm step. When a thing and its file differ, show both, each
labeled ("Exchange" Your cohort, "Video file" Anyone with the link).

| Audience | Words | Icon |
|---|---|---|
| device | On this device | device-mobile |
| me | Only you | lock-simple |
| teachers | You and your leaders | user |
| staff | Only leaders | user |
| approvers | You and approvers | user |
| them | Them and leaders | user |
| cohort | Your cohort | users |
| members | Human Shaped members | users-three |
| link | Anyone with the link | link |
| public | Everyone | globe-simple |

A public place is a fact, not an audience ("On GitHub").

### Count — `UI.count(n, noun)` (R§6.6)
How many things wait, always beside its noun, never zero (absent instead),
never a score, streak, or comparison. No pill.

### Rows — `UI.rows()`, `UI.row({…})` (R§6.7)
One thing per row: its title (the row's only link to its page) → a meta
line of short facts → status and visibility → at most two secondary
actions, danger last. No filled buttons in rows.

### Empty state — `UI.empty(text, action)` (R§6.8)
One line of at most eight words saying what is absent ("No polls yet"),
and at most one action, a verb naming the thing ("Make a poll"). Never
while loading, never for errors.

### Checklist (R§6.9)
Setup tasks in any order, each a short imperative naming the thing, with
the task registry's status; a count above ("2 of 5 done"); gone when all
are done. Never for learning progress.

### Field, hint, error (R§6.10)
Label three words at most; "(optional)" written in the label; a hint only
when most people need it, one short sentence, no link; who will see the
answer is a visibility marker beside the label. Errors as in the writing
rules, beside the field; three or more get a summary at the top. Save is
never disabled. Toggles save at once; text, checkboxes, and selects save
with a button; never both in one form.

### Disclosure — `UI.disclosure(summary, content)` (R§6.11)
Native `<details>`, closed by default, for detail only some people need.
The summary names what is inside ("Set up Meet by hand"), never "More" or
"Learn more". Two levels deep at most.

### Toolbar — `.ui-toolbar` (R§6.12)
The actions on the page's thing, in one row: one filled button first (the
next step for the thing's state), up to three secondary, danger last; more
go in "More actions". No border or fill around it.

### Confirm — `UI.confirm({title, body, action})` (R§6.13)
A native `<dialog>` before something hard to undo: deleting, removing a
person, leaving, revoking, widening who can see something, giving or
taking admin. Title a question naming the thing ("Delete this poll?");
one sentence of consequence; Cancel, then the action repeating the verb
("Delete poll"), focus starting on Cancel, Esc cancels. Never for what can
be undone; never `window.confirm`, "Click again", or an arming button.

### Inline status — `UI.say(element, text, tone)` (R§6.14)
What just happened, beside the control that did it, in three words at
most ("Saved", "Link copied", "Not saved: <reason>"), in a `role="status"`
element present from the start, kept until the next action. No toasts. A
button's label never flips to carry a result.

### Notice — `.ui-notice` (R§6.15)
The home of the sentences the writing rules allow, one per page: a
warning (icon, bold first line) or a refusal (lock icon). A tinted inset
panel with no stripe. Live-session signals are the one exception to one
per page.

### Page gate — `UI.gate(kind)` (R§6.15)
The whole page closed or empty, one fixed line and one action each:
- signed out: "Sign in to open this" + Sign in with GitHub
- not a member: "Only people in this cohort can open this" + Go to your home
- not a leader: "Only leaders can open this" + Ask to lead
- not an admin: "Only admins can open this" + Go to your home
- missing: "Nothing is at this address" + Go to your home
- error: "This could not load" + Try again, the error in "Error details"

### Tabs — `UI.tabs(...)` (R§6.16, R§6.2)
Sections of one thing as a row of links, each with its own address
(`?t=`), the current one marked by weight and an underline; switching does
not reload, and the address always changes, so a section can be shared.
Items that do not fit fold into "More". Never stacked under another row.

### Segmented control (R§6.16)
Filters one list in place: two to five noun choices, buttons with
`aria-pressed`, a status line naming the result ("5 apps").

### Loading — `.ui-skeleton` (R§6.17)
Nothing for the first second, then rows shaped like the real ones. No
loading sentences; a hidden status names what loads.

### Role tag — `UI.tag('Leader' | 'Learner')`
A person's role in one cohort, as a plain tag beside their name or the
cohort's name: Leader or Learner, and Returning for a learner who has come
back. Never a sentence saying what the role allows; the sections and
buttons in front of them are what it allows.

### Navigation
PAGES.md, "How you find your way": the signed-in sidebar (each item an
icon and a name; it collapses to its icons from 64rem, each icon naming
itself in a tip on hover and focus), the cohort's one row of sections,
breadcrumbs that end at the parent. Sidebar icons are Phosphor's regular
weight, from `assets/icons.svg`; never emoji.

## What it never uses (R§4)
Tracked capitals, a label above a heading unless it carries information,
colored stripes, pills, rows of identical icon cards, color outside inset
panels, emoji as interface, a toast, a browser dialog.
