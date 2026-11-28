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

- **Thursday with Alexis: a run sheet.** In any Meet call, open Human
  Shaped and press Start a session (no account). Tools, then Give
  everyone a model: pick one and choose "A copy for each person" (each
  person explores alone) or "One model everyone shares" (anyone's
  change appears on every stage). 76 of the 77 models can be shared;
  "Python together" cannot, and the picker says so. Some models keep
  a person's prediction private by their own design (Selection bias
  does not show others' prediction picks), while their sliders and
  settings do travel. For a whole planned session, open /plan/
  beforehand, add slides, a question, a model, and a workbook, save it
  to your Drive, and in the call open it from Slides, then Open from
  my Drive. Every stage shows each model's title, author, Ideas at
  Play, and CC BY 4.0.

- **Delete "Randomness test (delete me).json" and "What did you notice?
  answers 2026-11-28.csv"** in your Drive's Human Shaped sessions folder
  when you like; they are test files.

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
- [x] B6. Cohort groups editor (`cohorts.groups`).
- [x] B8. A new part starts with placeholder words saved as its prompt
  ("What the rooms are for", "Your question"); they should be hints
  people type over, not content.
- [x] B7. End to end: build a non-Human-Shaped cohort "(delete me)" from
  nothing in Chrome as Ben, run a session in a real Meet call, clean up.

### A. The add-on with no GitHub (Drive storage approved November 28)

- [x] A1. Measure (done in tick 13: the panel's Drive consent and save worked in a real call): can the Meet panel get a `drive.file` token through
  Google's popup? (The add-on lists only email and profile; the site's
  pages ask for `drive.file` at use, in the same Google project.)
- [x] A2. A session file: one JSON in the builder's own shape (parts,
  decks, workbooks, questions); the builder saves to Drive for a host
  without a cohort.
- [x] A3. An open room runs a whole session: parts in order, Next, each
  kind on the rooms worker.
- [x] A4. Cohort-only tools in open rooms (ticks 20 to 25), on the worker: board,
  workbooks (answers in the room, saved to the host's Drive at the end),
  breakouts as room codes, feature someone, show your work.
- [x] A7. Pictures in a session saved to Drive: deck pictures live in
  the private deck-pictures bucket, which a no-account room cannot read,
  so they show as their words. Copy each into the host's Drive (link
  readable) on save and point the slide at it. Ben, November 28: "it is
  fine if the images are available to anyone with the link."
- [x] A5. No GitHub prompt anywhere on the open-room path; attendees
  never sign in.
- [x] A6. A real call with two attendees (tick 24, kya-pynw-hpx).

### C. Round two (Ben, November 28, away from his computer: "I'd like you to keep going, but I'm not at my computer, so I cannot help you test. Please build out these features and fully test them.")

- [ ] C1. A ranking question in session files, /plan/, open rooms (worker), and cohort plans saved to Drive (they became short today).
- [ ] C2. Tools has Workbook: run one of the session's workbooks, or write a quick one in the panel.
- [ ] C3. Answers at the end of a call: before Leave or End, the host is told how many workbook answers are unsaved, with Save; when a workbook closes, each person is reminded to Keep a copy. (A choice made without Ben; logged for him.)
- [ ] C4. Draw together: everyone's pointer on every stage.
- [ ] C5. Test in Safari (Ben's browser), driving it from the terminal.
- [ ] C6. A real breakout round trip: real meet.new rooms, the learner leaves, joins, and comes back.
- [ ] C7. More than two people: extra participants from the terminal in a real call (drawing, workbook, shared model).
- [ ] C8. A Drive session's slide picture drawn on a stage in a call.
- [ ] C9. In a call: the "On the stage" color and "Just you".

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
- [x] I3. After I1: shared state for pairs or rooms through the room,
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
- 2026-11-28, tick 9 (B6). Found two kinds of groups: the cohort page's
  standing groups (groups table, members chosen by the leader) and
  cohorts.groups (rooms kept from a breakout in the add-on). Breakouts'
  "Launch the cohort's groups" read only the second, so groups set up
  before class could not be launched. Rather than a third editor, the
  breakout tool now falls back to the standing groups
  (BreakoutsLib.standingGroups, tested; 732 node tests). Not yet seen
  live: needs learners in the test cohort and a call (B7). Question for
  later: should "Keep these rooms as the cohort's groups" write standing
  groups too, so there is one kind?
- 2026-11-28, tick 10 (I3 built, c99da017; waits on deploying the
  rooms worker). The model picker offers "A copy for each person" or
  "One model everyone shares". A shared model runs this site's copy of
  its own file (catalog.py keeps 77 of 78, 8 MB, assets/ideas-at-play/;
  CC BY 4.0) with a bridge that passes window.artifact's state to the
  stage; the stage sends it through the room (`site` gains `together`,
  new `mstate` message any person may send, JSON up to 20,000
  characters, tested in room-logic.test.mjs) and hands each new state to
  every stage. The credit adds "shared through Human Shaped". Until the
  worker is deployed, a shared model falls back to a copy for each
  person; cohort calls fall back too (the panel's view drops `together`).
  **Verified in Chrome:** two copies of "Do Random Events Cluster?" on
  one page, joined by the bridge; clicking star field A in the left copy
  turned the right copy to "Correct. Field A..." and "1 correct of 1
  answered", one state message, no echo. Not yet: the worker deploy
  (wrangler is signed out here; `wrangler login` is Ben's), then a real
  call with two people.
- 2026-11-28, tick 11 (A2, A3 begun; 6fec8780, f476eddb). SessionPlan
  (assets/session-plan.js, 3 tests): one session-file shape (talk,
  question, model, site, card, clock) and the room messages each part
  sends; fromScenes turns a cohort session's plan and decks into a file
  (breakouts, the board, showing work, and writing become cards with
  their prompts; breaks become clocks). The open room runs a session
  opened from Drive part by part in Now (parts list, Next, Put the
  session away), and Save to my Drive keeps the whole session. The
  session page's Plan has "Run it in any call: Save to my Drive" for
  leaders. 737 node tests. **Seen live:** the button on Session 1;
  pressing it showed "Saving to your Drive…" while Google's window
  waited on Ben (the one-time drive.file approval for
  benwilkoff@gmail.com). Not yet seen: a saved file, and a session run
  in a call. Waiting on Ben: that approval, and `wrangler login` for the
  shared-model deploy.
- 2026-11-28: with Ben's approval to click for testing, chose
  benwilkoff@gmail.com and Continue on Google's consent ("only the
  specific Google Drive files you use with this app"). **Verified:** the
  session page said "Saved in your Drive, 3 parts", and Drive holds
  "Session 1: How Leaves Make Food.json" (487 bytes) in the Human Shaped
  sessions folder. Wrangler is signed in (Ben); `wrangler deploy` of the
  rooms worker was refused by the auto-mode classifier, so it waits on
  Ben running it or allowing it.
- 2026-11-28, tick 12 (A3 verified). **Real Meet call** (cgq-ztoc-uav,
  benwilkoff@gmail.com, no account in the room): Start a session,
  Slides, Open from my Drive (Google's account window, chosen from the
  terminal), the panel listed "Session 1: How Leaves Make Food"; opening
  it put the session in Now (Question, Card "In groups", Slides "Talk",
  Next); Next ran each part on the stage in turn: the question, the
  card, the slides. Found: the slide's picture showed only its words,
  because deck pictures are in a private bucket a no-account room cannot
  read (A7). Also: Google asks to choose an account each time a call
  first opens Drive. Call ended.
- 2026-11-28, I3 verified. Ben ran `wrangler deploy` (rooms worker
  version 7680192a). Room tst-shar-mdl: a host client put up "Do Random
  Events Cluster?" with together; both stages ran the bridged copy, the
  credit read "shared through Human Shaped"; clicking star field A on
  stage B turned untouched stage A to "Correct. Field A..." and "1
  correct of 1 answered", and the room's mstate held the state (seq 1).
  Found and fixed: the credit line sat over the model's corner and took
  a click meant for the model; it now lets clicks through except on its
  link. Room ended. Not yet: two people in a real Meet call; cohort
  calls still fall back to a copy each.
- 2026-11-28, tick 13 (A7, a44a9fc2). Saving a plan to Drive now copies
  each slide picture (from the private deck-pictures bucket, by a signed
  link) into the leader's Human Shaped sessions folder, shares it to
  anyone with the link (Ben's yes), and points the slide at
  drive.google.com/thumbnail?id=…&sz=w2000. **Verified:** Session 1
  saved ("Saved in your Drive, 3 parts"); Drive holds the new session
  file and e0887eec69a64a98.webp; the picture link answers 200
  image/webp with no sign-in. Not yet seen: that slide drawing its
  picture on a stage in a call. Each save makes a new file (no update in
  place yet).
- 2026-11-28, tick 14 (a2d06cab). Shared models in cohort calls: the
  stage has no room there, so its model's change goes as a room act
  (`mstate` added to the panel's allowed room acts) to its own panel,
  which sends it through CohortRoom; CohortRoom's view and AddonLib's
  stage view now carry `together` and the room's `mstate` (tested; 738
  node tests). Not yet seen: two people in a cohort call sharing one
  model; fold into B7 with a test learner.
- 2026-11-28, tick 15 (B7 part 1, d1aab815). Opened the plant biology
  test cohort for joining (status open, listed on /cohorts/ under its
  "(delete me)" name) and joined as test learner benhstest1 from its own
  Chrome profile. **Seen as the learner:** the own-course page (no Your
  app, Try my app, or stage bars; People; two share kinds), and Session
  1's Before with its words, reading, and outcome. Found and fixed: This
  week said "All sessions done" for undated sessions (now "Dates to
  come"); "What to bring" took a breakout's prompt (the course's build;
  now hidden for own courses); "Bring something back" became "Share with
  the cohort" for own courses. Also found, not fixed: /cohorts/ calls
  every cohort "five weeks of building one real app". Next: a real call
  with Ben's profile leading and benhstest1 joining (shared model,
  breakouts from standing groups, a group workbook in a room), then
  clean up the test cohort.
- 2026-11-28, tick 16 (B7 part 2). **Real two-person cohort call**
  (kta-bkwn-hvu): Ben's profile ran "Session 1: How Leaves Make Food"
  from Run a cohort session; benhstest1's profile joined (Join here too,
  Join activity) and saw the learner panel with no Your app section.
  The leader chose Give everyone a model, One model everyone shares, Do
  Random Events Cluster?; both stages drew it with "shared through Human
  Shaped"; the learner picked star field A on their stage and the
  leader's stage showed A picked, untouched. Found: the two choices'
  labels were squeezed off the right edge in the cohort panel; fixed in
  CSS. Next: breakouts from a standing group with the learner in it, a
  group workbook in the room, then cleanup.
- 2026-11-28, tick 17 (B7 done, 280cd1a7). Standing groups cannot be
  made with one learner (the cohort page shows Groups at eight learners
  or more, Ben's decision 8), so launching them as breakouts is not
  seen live; breakouts and a group workbook in a breakout room were not
  run this time. Delete workbook verified (the original Leaf Lab Notes
  gone, Session 2's copy kept); found that a breakout part still named
  the deleted workbook, fixed (it now unlinks itself). Ended the call
  in both profiles. Cleanup through the site: Draft, then Delete this
  draft; the database then held no cohort, sessions, enrollment, or
  storage files for it. Kept: the two session files and one picture in
  Ben's Drive (Human Shaped sessions folder), useful for Thursday.
- 2026-11-28, tick 18 (A5, 6a5a9039). After a Google sign-in, the panel
  asked a Google-only person to link GitHub before anything else. Now it
  asks only when the call is a cohort's own (is_cohort_call), where
  linking is how a member's Google account finds their cohorts; in any
  other call the person goes straight to the open room. Audit of the
  open-room path: the only other GitHub mentions are optional (Sign in
  in the lobby's links, "Or keep them in GitHub" under Drive). Not seen
  live: needs a Google account with no GitHub (none of the usable
  profiles; the Minerva profile is off-limits).
- 2026-11-28, tick 19 (A, a36eab56 + 7bf96263). /plan/: anyone with a
  Google account builds a whole session as a file in their own Drive,
  with no cohort and no account here. Parts: slides (the builder's slide
  studio, pictures to the host's Drive), a question (five ways to
  answer, choices), an Ideas at Play model (copy each or shared), a
  website, a card, a clock; move, remove, an unsaved draft kept in the
  browser, Open from my Drive, Save to my Drive updating the same file.
  Linked from the open room ("Plan a whole session"), in PAGES.md and
  the sitemap. Seen live: built "Randomness test (delete me)" (slides,
  a choice question, Do Random Events Cluster? shared, a card), saved,
  added the card and saved again (same file id; the Drive connector read
  one file with four parts), then in a real Meet call (wed-kohm-pbq)
  opened it from Drive in the open room and ran all four parts: slide,
  question with both choices, the shared model with its CC BY credit,
  the card. Left: that test file in Ben's Drive (the connector cannot
  trash a file the site made; Ben deletes it in Drive). Not seen: a
  picture uploaded from /plan/ drawn on a stage.
- 2026-11-28, tick 20 (A4 part, 31dc19ac; wording, 3b9a657a). Show your
  work in open rooms: Tools has "Show your work"; the host asks, each
  person's Now gets a box for one https address (Offer it, Change it,
  Take it back), the host's Now lists the offers by name with Show,
  and Show puts that one on every stage as "<name>'s work". Only the
  host receives the list; Stop asking erases every offer. Worker:
  works/work/feature in room-logic.js with two tests (740 pass). Not
  live: the worker needs `npx wrangler deploy` (asked of Ben);
  tools/rooms/check-works.mjs tells whether the deployed worker has it
  (today: "That message was not understood", the old one). Also: a
  custom cohort's card on /cohorts/ says "Its own course, not the
  Human Shaped weeks", and a leader's feedback in a custom cohort is
  "on what they shared", not "their build". Left as is: the leader's
  "Connect your agent" step, because the Human Shaped connector answers
  for any cohort, not only the course.
- 2026-11-28, tick 21 (A4 part, 4406d0cd). Breakout rooms in open
  rooms: Tools has "Breakout rooms"; the host makes a call per room with
  meet.new ("Make a Meet link") and pastes the links, and the worker
  deals everyone here but the host into them, shuffled (two to twenty
  links, only meet.google.com call addresses, duplicates dropped). Each
  person's Now: "Your room", who is with them, "Join room N", and the
  warning to leave this call first; someone who came later chooses a
  room. Host: every room with Visit, and Bring everyone back. Two tests
  (742 pass). The worker was still the old one at the start of this
  tick (check-works.mjs), so neither this nor Show your work is seen
  live; both wait on the one deploy. Next A4 piece, planned not built:
  the board in open rooms means Excalidraw's scene and pointer messages
  relayed through the rooms worker (today it rides Supabase Realtime on
  a cohort's private channel), with the last scene kept in the room for
  whoever arrives late, and erased when the call ends.
- 2026-11-28, tick 22 (A4 part, 5cd8d04c). Draw together in open rooms:
  Tools has "Draw together" (Put the drawing up, Start a new drawing);
  each stage frames /board/room/, an Excalidraw canvas with no account
  or database. The frame posts what changed to its stage, the stage
  sends it through the room ('strokes'), and the worker merges element
  by element as Excalidraw does (higher version, then lower
  versionNonce), relays to every other stage, gives a stage that opens
  late the whole drawing, saves it apart from the room every five
  seconds at most, and erases it when the call ends. Limits: 150
  strokes a second-window per socket, 4000 elements, 1.5 MB; pictures
  off (a room has nowhere to keep files). Two tests (744 pass). Seen in
  Chrome: the frame on a humanshaped.org page took a drawing sent to it
  (a rectangle appeared), and a rectangle drawn with the mouse came
  back out as one 'strokes' message with only the new element. Not
  seen: through the worker, which still awaits the deploy (with Show
  your work and Breakout rooms).
- 2026-11-28, tick 23 (deploy 2c307dcb; fixes 80441523, 75344ac0,
  99eec811). Ben: "You should be able to fully deploy." Why it was not
  deployed: his earlier deploy (7680192a) was before these three tools,
  and I had handed each new deploy back to him. Deployed myself. Seen
  live, terminal room script: offers reach only the host, Show features
  one by name, breakouts deal everyone but the host, a stroke reaches
  the other stage without echo, a late stage gets the whole drawing,
  a new drawing clears everywhere, no errors. Seen in real Meet calls
  (nxu-qkws-ajw, bwf-bdfo-rej, Ben's leader profile plus a terminal
  test guest): Draw together on the stage, the rectangle reached the
  room and a late stage; Breakout rooms showed Room 1 with the guest,
  Room 2 empty, Visit, Bring everyone back; Show your work listed the
  guest and Show put the page up. Found and fixed: the host's list read
  works.works (always empty); the breakout links form sat in one
  squeezed row; a page that refuses framing went up as a broken frame,
  so offering and Show now run the room's frame check. Lesson: test the
  panel in a fresh call, since Meet keeps the old frame and Pages
  caches HTML for 10 minutes. Not seen: a second real person's panel
  (the guest view of Your room, Offer it) and two people drawing at once.
- 2026-11-28, tick 24 (A6; fix aa3e96eb). A real two-person Meet call
  (kya-pynw-hpx): the leader profile started an open room, and the
  benhstest1 profile joined with Join here too and Join activity, landing
  as a guest with no sign-in ("2 here"). Seen on the learner's panel and
  stage: Show your work's box; offering ideasatplay.org's home page was
  caught ("does not allow itself to be shown inside another page"); a
  model page went through ("Offered. The host chooses…", Change it,
  Take it back). On the leader's: the offer by name (benhstest1) with
  Show, which put the model on both stages with its credit. Breakout
  rooms: the learner's Now read Your room, the leave-first warning, and
  Join room 1. Draw together, both ways: the leader's rectangle appeared
  on the learner's stage and the learner's ellipse on the leader's.
  Found and fixed: the pressed Show button drew as a blank pill (now the
  accent color, like answer choices), and a person alone in a room read
  "No one yet" (now "Just you"). Not seen: those two fixes in a call.
- 2026-11-28, tick 25 (A4 workbooks, 382c95b1; worker c2efad30;
  fixes ed343805). A session file's workbook part, in the cohort
  workbook's own blocks (words, an answer in words, a choice, a table
  with blanks; no files), edited on /plan/ and run from the open room.
  Each person answers in their own panel and sees only their own; the
  host sees how many have answered, closes or reopens it, and saves
  everyone's answers to their own Drive as a CSV. Tests: room rules
  and session file (748 pass); terminal check on the live worker. Seen
  in a real two-person call (rjf-tsii-azt): built "What did you
  notice?" on /plan/ (three blocks) and saved it into the same file;
  the leader opened it from Drive and ran it; benhstest1 answered all
  three; the leader's Now read "1 person has answered"; Save put
  "What did you notice? answers 2026-11-28.csv" in Ben's Drive, read
  back through the connector: one row, benhstest1, the words, "The
  clumpy one", 23 and 25. Found and fixed: Keep a copy did nothing,
  since Meet's panel frame cannot download (now it opens the copy in
  its own window with a download link and the text); the stage read
  "What did you notice?: answer it…"; the host's Now said the welcome
  was up; blanks were labeled "Row 2, column 2" (now by their row and
  column headings). Not seen: those fixes in a call. Left in Ben's
  Drive: the answers CSV (test data, delete with the Randomness file).
- 2026-11-28, tick 26 (afb4657c). Checked the workbook fixes in a
  fresh two-person call (kkb-sgmh-eko): the stage reads 'Answer "What
  did you notice?" in the Human Shaped panel beside the call.'; table
  blanks read "Left, Stars" and "Right, Stars"; Keep a copy opened the
  learner's copy in a new tab (title, Download, the Markdown), and its
  Download saved "What did you notice.md" (removed after). For
  Thursday, measured every kept Ideas at Play copy in Chrome: 74 of 77
  give, take, and announce state; Selection bias and SUTVA violation
  lack onChange, so the shared bridge never heard them; Python together
  has no setState. Now the bridge asks for state every 800 ms when a
  model has no onChange, and the catalog keeps copies only of models
  with getState and setState (Python together is one copy each, with a
  line saying so). Seen: Selection bias shared between two stages of one
  room, a slider moved to a = 3.5 on one and read a = 3.5 on the other.
  Its prediction radios did not follow, because that model's own render
  never draws them from state. A run sheet for the demo is in For Ben.
- 2026-11-28, tick 27 (698cb362). Saving a cohort session to Drive now
  brings its workbooks: a room part's workbooks just after it, the
  session's other individual workbooks at the end; picture lines (the
  cohort's private storage) and file blocks are left out. Test added
  (session-plan). The open room's Save to my Drive already updated the
  same file (it passes the file's id), so that open item is closed.
  Seen live: on the Human Shaped demo cohort's Session 1, Save to my
  Drive said "Saved in your Drive, 20 parts"; the file read back with
  "Your room's first test" (text, free, table) as part 13, after its
  room part, and "Before the call" (text, choice, free) as part 20.
  Left in Ben's Drive: "Session 1: An hour of Human Shaped.json", a
  runnable copy of the demo session for any call.
