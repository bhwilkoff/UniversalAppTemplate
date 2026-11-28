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

## For Ben

- **Credentials in a cohort on another subject.** A credential today
  needs an app ("Needs a repository and a live address"). In a custom
  cohort the app fields are hidden, so no learner there can earn one.
  Hide credentials for custom cohorts, or let the leader name other
  evidence? (Not changed.)

## Ben's answers (November 28)

- **Who builds cohorts:** approved teachers only (today's gate stays).
- **Where a no-GitHub host's content lives:** "We need to make sure
  this stays sustainable and free... I also want it to work well and
  seamlessly, whether they are full Human Shaped cohort members or
  simply attending a single session with someone using the add-on."
  Proposed in reply: attendees never sign in, live state stays on the
  rooms worker, and a host without a cohort keeps their sessions as
  files in their own Google Drive (`drive.file`). **Approved, November
  28:** "Yes. I approve keeping a non-cohort host's sessions in their own
  Google Drive. That aligns with the idea of all learners getting keep
  their own data too."
- **Ideas at Play:** "I'm meeting with Alexis on Thursday and it would be
  great to demonstrate what is possible. He has given me full approval
  to integrate according to the sharing/privacy/copyright info on his
  site." So I1 is done; I2 and I3 are open, and a working demo is due
  before Thursday, December 3, 2026. Follow each model's CC BY 4.0 terms
  (credit, link, note changes) and the site's privacy page.

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
- [x] B4. `copy_scenes` copies decks (scene_decks and slides) and
  pictures too.
- [x] B5. Any subject: /teach/new starts from scratch by default; the
  Human Shaped curriculum is a starting point you choose. Audit what
  still says Prep, Week N, apps, or the path in a custom cohort. Seen
  in the B1 test: a custom cohort's "Before the first session" still
  lists "Make the GitHub repository" and "Connect your agent"; the Plan
  tab's "Before the next session" and the Before tab's "Before this
  session" overlap in meaning.
- [ ] B6. Cohort groups editor (`cohorts.groups`).
- [x] B8. A new part starts with placeholder words saved as its prompt
  ("What the rooms are for", "Your question"); they should be hints
  people type over, not content.
- [ ] B7. End to end: build a non-Human-Shaped cohort "(delete me)" from
  nothing in Chrome as Ben, run a session in a real Meet call, clean up.

### A. The add-on with no GitHub (Drive storage approved November 28)

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

### I. Ideas at Play (demo for Ben's meeting with Alexis, Thursday December 3)

Findings (November 28): ~90 interactive teaching models by Alexis
Diamond (Minerva) and others, CC BY 4.0 on every model, no account
needed. Catalog and detail pages send `X-Frame-Options: DENY`;
`/play/<slug>?v=N` and the sandbox origin send no framing block. Each
model exposes `window.artifact.getState/setState`, made for shared
breakout state.

- [x] I1. Ben asked Alexis Diamond: full approval under the site's terms.
- [x] I2. A "Model" tool: pick a model, every attendee gets their own in
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
- 2026-11-28, tick 4 (B4, 829de627). copy_scenes (migration
  20261128010000, applied) carries each part's slides and speaker notes
  (scene_decks), purpose, the group workbooks its rooms answer (made the
  new session's own), and points an earlier-question part at the copied
  question; the page then copies deck and workbook pictures in storage
  and says how many it could not. Policy suite 1201 of 1201; with the
  migration taken out, exactly the two new checks fail. **Verified live
  as Ben:** Session 1 got a Talk part with an uploaded picture; Session 2
  copied it ("Copied 3 parts from session 1, with their slides and your
  notes"): the talk part has its slides and one picture in its own
  folder, the rooms part names a workbook that belongs to Session 2, and
  the copied slide draws its picture. Also fixed: plan cards began
  ", 5 min". Not yet seen: a copied workbook's pictures (Leaf Lab Notes
  had none left).
- 2026-11-28, tick 5 (B5, 23bc7e5a, ad3e2639). A new cohort starts by
  choosing "The Human Shaped course" or "Your own course" (neither picked
  ahead), and question 2 asks only who it is for. An audit agent listed
  18 places a custom cohort still showed the course; for custom cohorts
  (CohortLib.course): Getting ready drops Get set up, Add your app, and
  Connect your agent; Your app, Try my app, stage bars, the last week's
  lesson, and the leader's Apps list are hidden (`data-own-course` on the
  page, `data-course-only` on sections); people show names only; sharing
  offers feedback and questions only; the home's Your work is hidden for
  someone only in such cohorts without an app; the add-on never falls
  back to the six parts and hides the app section and Apps tool. 731
  node tests. **Verified live as Ben (leader):** the form, and the
  cohort page's gates (own-course mark, People, Apps and Your app
  hidden, two share kinds). Not yet seen: a learner's view and the
  add-on in a custom cohort (B7). Left as is: the leader's optional
  Connect your agent step, roster wording "their build", the old panel's
  path toggle, and credentials (For Ben).
- 2026-11-28: Ben approved Drive storage for hosts without a cohort, and
  Alexis Diamond approved integrating Ideas at Play; order from here:
  I2 (demo by Thursday), then A1 to A6 and I3, with B6 to B8 between.
- 2026-11-28, tick 6 (I2, 2a4d9eb4). "Give everyone a model": a host
  picks one of 78 Ideas at Play models (assets/ideas-at-play.json, read
  from their own pages by tools/ideas-at-play/catalog.py: title, author
  from the page's own Cite this, newest version, description; every one
  CC BY 4.0) and it goes on the main stage through the room's existing
  site message, so each person's stage is their own working copy. In
  open rooms (open-room.js) and cohort calls (cohort-room.js, addon.js
  tile). Every stage credits it: title (linked), author, Ideas at Play,
  CC BY 4.0. **Verified outside Meet:** a host client in one tab found
  "Do Random Events Cluster?" by search and put it up; an attendee stage
  in a second tab drew it with the credit, and clicking a star field
  scored ("Correct. Field A is the real random one"). Room
  tst-modl-dmo ended. Not yet seen: a real Meet call, phone width, and
  the panel tile itself (the panel page refused the browser tool,
  "Cannot access a chrome-extension:// URL of different extension").
  **Later, in a real Meet call** (dpd-bgdq-cdv, benwilkoff@gmail.com, mic
  and camera off): the Tools tab shows "Give everyone a model"; the
  search list drew; "A Line That Predicts Earnings" filled the main
  stage with its credit; clicking its "2 Guess first" step worked.
- 2026-11-28, tick 7 (A1 begun, A2 begun, a233b945). MyDrive
  (assets/my-drive.js, drive.file only): a "Human Shaped sessions" folder
  in the host's Drive, one JSON session file each (`kind:
  human-shaped-session`, `version: 1`, `parts`), list, save, open. The
  open room's Slides tab has "Keep them in your Drive" (Save to my Drive,
  Open from my Drive) above "Or keep them in GitHub". **Measured in a
  real Meet call:** Save to my Drive in the panel showed "Saving to your
  Drive…" and no "could not open" error after 14 seconds, so Google's
  window seems to open outside the tabs the browser tool sees; granting
  Drive is Ben's click, so it waits on him. Still to do: the lobby says
  "Nothing is kept after the call", now not quite true.
- 2026-11-28, tick 8 (B8, 29ef583d). A new part starts with no prompt;
  the prompt box and the question box carry hints instead
  ("What will you try before next time?", "What would you like everyone
  to answer?"). The open room's lobby now says "The room is erased when
  the call ends" (its slides can be kept in Drive). **Verified live as
  Ben:** a new Writing part in Session 2 has an empty prompt with its
  hint. The Drive window from tick 7 still waits on Ben.
- 2026-11-28, A1 answered by Ben: "It opened the sign-in window." So
  Google's Drive window does open from inside Meet's side panel (as its
  own Chrome window). Still to see: that the panel gets the token back
  and the file lands in Drive once the account is chosen.
