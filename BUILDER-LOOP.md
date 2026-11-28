# Builder loop

The loop Ben started on November 28, 2026:

> 1. Create a fully functional course/lesson builder that allows you to
> create a cohort from scratch, including all cohort sessions, slide
> decks, outcomes, exchanges, and all other aspects that I have
> previously used Claude to help build. I'd like for folks to be able to
> fully build out content, whether it is about human shaped software
> development or any other content area.
> 2. Make it so that people can use the add-on without a GitHub account
> or any other dependencies. Ideally, they could use it as a
> fully-functional video conferencing enhancement that transforms any
> Google Meet session into a teaching and learning opportunity.
> 3. Research the feasibility of utilizing activities from
> https://ideasatplay.org as another "tool" within our add-on with full
> functionality for any of the activities such that each Google meet
> attendee can use the artifact fully on their own within the meeting.

Each tick: read this file, take the next unblocked item, build it,
test it as a person would (Chrome, live site, labeled "(delete me)"
data), commit, push, and log it below. "Fixed" and "verified" stay
separate words. One tick, one commit.

## Ben's answers (November 28)

- **Who builds cohorts:** approved teachers only (today's gate stays).
- **Where a no-GitHub host's content lives:** "We need to make sure
  this stays sustainable and free... I also want it to work well and
  seamlessly, whether they are full Human Shaped cohort members or
  simply attending a single session with someone using the add-on."
  Proposed in reply (waiting on his yes): attendees never sign in, live
  state stays on the rooms worker, and a host without a cohort keeps
  their sessions as files in their own Google Drive (`drive.file`).

## Backlog

### B. The builder (approved teachers, Supabase)

What the mapping found: a course on any subject can already exist as a
custom cohort; what is missing is editors. Today these are written only
by the Course Builder import or by SQL.

- [x] B1. Session: edit `before`, `readings`, and the session's
  `outcomes`; cohort: edit `outcomes` (on /teach/cohort/edit).
- [x] B2. Workbooks: create, rename, reorder, delete; edit blocks (text,
  free, choice, table, file) with images in `workbook-files`.
- [x] B3. Part settings for every config key: show (a page or document
  on the stage), results_of, feature and feature_count, show_tally,
  rerun_of; rooms: groups, group_size, sorting, group_docs, workbooks.
  A deck on every part kind, not only talk and reflection.
- [ ] B4. `copy_scenes` copies decks (scene_decks and slides) and
  pictures too.
- [ ] B5. Any subject: /teach/new starts from scratch by default; the
  Human Shaped curriculum is a starting point you choose. Audit what
  still says Prep, Week N, apps, or the path in a custom cohort. Seen
  in the B1 test: a custom cohort's "Before the first session" still
  lists "Make the GitHub repository" and "Connect your agent"; the Plan
  tab's "Before the next session" and the Before tab's "Before this
  session" overlap in meaning.
- [ ] B6. Cohort groups editor (`cohorts.groups`).
- [ ] B8. A new part starts with placeholder words saved as its prompt
  ("What the rooms are for", "Your question"); they should be hints
  people type over, not content.
- [ ] B7. End to end: build a non-Human-Shaped cohort "(delete me)" from
  nothing in Chrome as Ben, run a session in a real Meet call, clean up.

### A. The add-on with no GitHub (storage design waits on Ben's yes)

- [ ] A1. Measure: can the Meet panel get a `drive.file` token through
  Google's popup? (The add-on lists only email and profile; the site's
  pages ask for `drive.file` at use, in the same Google project.)
- [ ] A2. A session file: one JSON in the builder's own shape (parts,
  decks, workbooks, questions); the builder saves to Drive for a host
  without a cohort.
- [ ] A3. An open room runs a whole session: parts in order, Next, each
  kind on the rooms worker.
- [ ] A4. Cohort-only tools in open rooms, on the worker: board,
  workbooks (answers in the room, saved to the host's Drive at the end),
  breakouts as room codes, feature someone, show your work.
- [ ] A5. No GitHub prompt anywhere on the open-room path; attendees
  never sign in.
- [ ] A6. A real call with two attendees.

### I. Ideas at Play

Findings (November 28): ~90 interactive teaching models by Alexis
Diamond (Minerva) and others, CC BY 4.0 on every model, no account
needed. Catalog and detail pages send `X-Frame-Options: DENY`;
`/play/<slug>?v=N` and the sandbox origin send no framing block. Each
model exposes `window.artifact.getState/setState`, made for shared
breakout state.

- [ ] I1. Ben decides whether to tell or ask Alexis Diamond
  (hello@ideasatplay.org) before we frame or host copies.
- [ ] I2. A "Model" tool: pick a model, every attendee gets their own in
  the panel, the host can put one on the stage; version pinned; the
  "Cite this" credit shown.
- [ ] I3. After I1: shared state for pairs or rooms through the room,
  using the model's getState/setState.

## Log

- 2026-11-28: loop planned from three mapping reports.
- 2026-11-28, tick 1 (B1, 21e0d731). Cohort form question 8 "What will
  people practice?" writes `cohorts.outcomes` (new ones get `o:` ids,
  imported ones keep id and ref); the session's Before tab gives leaders
  a form for `before`, `readings`, and `outcomes`. New kit part
  `UI.editRows` (DESIGN-KIT.md). 723 node tests pass. **Verified live as
  Ben:** made "Plant Biology test (delete me)" (custom, draft) with two
  outcomes, Session 1 "How Leaves Make Food" with words, a reading, and
  one outcome; the rows read back from the database as typed. Not yet
  seen: a learner's view of these (same drawing code the imports use).
  The test cohort stays for B2 to B7, then goes.
- 2026-11-28, tick 2 (B2, c08596f7, b6128b77). /teach/workbook/?w= is a
  workbook's own page (PAGES.md): title, who answers it, blocks of every
  kind (words, question, choice, table, link to hand in), move and
  remove, pictures into workbook-files, what people see, Delete. "Add a
  workbook" and "Change" on the session's Before. A new block takes a
  key no block has had (WorkbookLib.nextKey), so moving or adding never
  moves an answer; pictures no block names leave the bucket on save.
  727 node tests. **Verified live as Ben:** made "Leaf Lab Notes" with
  all four answerable kinds plus words, moved the table up (keys stayed
  b1 b2 b4 b3 in the database), added a picture (signed link drew in the
  preview), removed it and saved (the file left storage). Not yet seen:
  Delete workbook (at cleanup), a group workbook dealt to rooms (B3).
- 2026-11-28, tick 3 (B3, 6fcc8386, c7363dc6, b5b976ab). Every part's
  page has "In the call": a page or document on the stage, whom to
  feature and how many, an earlier question's answers, a question's
  counts and rerun, and for rooms how many (rooms or people each), who
  goes where, documents and group workbooks dealt to them
  (ShowLib.callConfig, tested). Any part can have slides (the add-on
  already draws them beside a question and in the corner of others); on
  parts other than Talk and Writing they sit after the part's fields.
  An empty plan now offers Add a part, and the Human Shaped six parts
  only to weekly cohorts. 729 node tests. **Verified live as Ben:** a
  question part saved feature random x2 and show_tally; a rooms part
  saved 3 rooms at random, a room document, and the group workbook
  Leaf Lab Notes (made group on its page); the database's own
  scene_config_ok accepted both, and the form reloads them. Not yet
  seen: these parts run in a real Meet call (the add-on's handling is
  the one imports already use). One Chrome tab stopped answering
  ("Cannot access a chrome-extension:// URL of different extension")
  after a save; a new tab worked.
