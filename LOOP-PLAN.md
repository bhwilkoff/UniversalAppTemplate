# Build loop plan

The loop Ben started on October 2, 2026: "Let's build out the site (and
continue iterating upon the template as you discover more things) with
all of the instructions you have thus far... continually read through
all of my project documentation to ensure that features and design are
according to the way in which we build."

Each tick: read this file, `VISION.md`, `DECISIONS.md`, and the
template's `AGENTS.md` and `docs/maintaining/WRITING.md`; take the next
unblocked item; build it the human-shaped way (research first, iterate,
verify what a person would see); push; log it below. "Fixed" and
"verified" stay separate words.

## Rules for every tick

- $0 ongoing. meet@humanshaped.org is the service account.
- Students own their data on GitHub; the hub stores only what they share.
- Copy in Ben's voice: flowing sentences, Oxford commas, no em dashes,
  no clipped command captions. Principles never name Ben's apps.
- Design is Commons: one type family, clay red, calm, finished.
- Push to production for review. Never commit secrets or private emails.
- Test as Ben in his own Chrome, with test data labeled "(delete me)",
  and clean it up through the site (the "Delete this draft" button on
  /teach/), never with a DELETE through the Supabase connector: its
  confirmation only appears in the Mac terminal, not in Remote Control.
- One purpose per command (edit, then commit, then push). A refused
  bundle says nothing about which part was refused.
- Template audience: anyone building alone. Site audience: community,
  cohorts, teachers, events. Put each change where its audience is.

## Milestones

Reorganized October 3, 2026, after Ben asked why the changes were
getting smaller: "Are there not larger scopes of work still to be built
out on the site or within the template?" There are. The loop now works
in milestones that span many ticks, runs two or three at once with
background agents in their own worktrees, and merges each piece when it
is verified, so a blocker on one never stalls the rest.

**Done:** sign-in and the hub's schema with tested access rules;
/account/, /teach/ (with the feedback queue and draft deletion),
/cohort/ (with Getting ready and the conversation section), /live/;
joining from /cohorts/; cohort-access and the GitHub team design;
the read-only MCP server, consent page, and /connect/; Getting set up in
the template; the mark and the printable sheets; the open directory.

**Waiting on Ben's setup** (see "Needs Ben"): the GitHub App (cohort
conversation for real) and the OAuth server switch (students' agents for
real).

**Finished October 3:**

- **M2. Becoming a teacher.** /teach/guide/ (COURSE.md read live), a
  request to teach on /teach/ for anyone signed in, approval by teachers
  with `can_approve` (Ben alone, set by hand), and each cohort's "Before
  the first session" steps. Migration 7 (teacher_requests,
  decide_teacher_request, agent-blocking policies): 79 database checks,
  50 node tests, applied; /teach/ and the guide verified live as Ben.
  Not yet exercised: a real request from a second account.
- **M6. One source for the template's design tokens.** design-tokens.json
  writes 14 platform files (tools/design_tokens.mjs) with a parity and
  contrast test in CI (passed on its first GitHub run); web, Android,
  Apple, and Windows build; the web app checked by eye at 375px in light
  and dark. The placeholder is a quiet slate on neutral gray. Not yet
  seen on an Apple or Android screen.

- **M1. The hub as a hub.** Every app's page at /apps/app/?r=owner/repo
  (its own words, where it runs, live commits, its HUMAN-SHAPED.md
  answers, its conversation on GitHub), drawn only for directory apps or
  apps a student chose to show; a "being built right now" feed on /apps/
  and the home page (at most 8 GitHub calls a visit, cached ten
  minutes, automated commits left out). Privacy written first
  (research/notes/hub-privacy-notes.md): a cohort app is public only by
  the student's own switch, and the public reads three fields through
  public_apps(), never enrollments. Migration 20261003055000 (renumbered
  to follow the teacher requests), 88 database checks, 61 node tests,
  applied; Archive Watch's page and /apps/ verified live, and a
  signed-out read of enrollments returns nothing.
- **M8. The course changes from the research,** in the template:
  COURSE.md gains the week before, groups that stay together, a check
  for understanding in every session, cameras and breaks, and one lesson
  sent back from every cohort; a new docs/path/showing-your-work.md
  (explain one decision with the agent closed, three questions for every
  bring-back, and feedback without a cohort), presented at
  /path/showing-your-work/; stages 00 to 07 end by asking for one
  decision explained. Pushed to main; the page verified live.

- **M7. Works the same with Gemini,** in the template. Found: Gemini
  CLI stopped serving free and Google AI Pro accounts on June 18, 2026
  (Google points them to Antigravity, which reads AGENTS.md and
  GEMINI.md but cuts any rule file past 24,000 bytes; AGENTS.md is
  about 49,900). GEMINI.md now imports AGENTS.md (loaded once, tested
  with Gemini CLI 0.46 and its debug log), three skills are linked into
  .agents/skills/ (symlinks: fine on Mac, Linux, and GitHub, but they
  may arrive as text files on Windows without symlink support), the
  path notes Antigravity where a step differs, and
  tools/test_agent_files.py checks the imports, links, and named
  skills. Antigravity itself is sourced, not tested. Pushed to main.

- **M3. Live sessions beyond a companion page.** /live/ gains a "show
  your work" queue (a live app, a commit, an issue or discussion, a
  share, or a link; up next, open it, mark shown) and checks for
  understanding (free text or 2 to 6 choices; the teacher sees answers
  by name, students see their own and an anonymous count only when the
  teacher shows it; never scored). Live through Supabase Realtime,
  polling every 15 seconds if that fails. Everything is deleted when the
  cohort is marked finished. A read-only `this_session` view is written
  for the MCP server but not yet deployed. Migration 20261003080000
  (renumbered to follow the credential migration), applied on the second
  try (the first expired waiting for a connector approval); the three
  tables are in supabase_realtime. 171 database checks, 85 node tests.
  Not yet seen in a real Meet session.
- **M4. The credential.** Open Badges 3.0 signed with eddsa-rdfc-2022
  as did:web:humanshaped.org (signatures byte-identical to the reference
  libraries), ten levels (the web first, then one per platform),
  /credential/?id= (checks the signature in the browser, offers the
  file), /credential/issuer/, and issuing on /teach/ for finished
  cohorts. The private key is made by Ben with
  tools/credential/make-key.mjs and never enters the repository;
  .well-known/did.json is live with no key yet. Migration 20261003070000
  applied: credentials are no longer publicly listable, a signed one
  cannot change, a revoked one stays revoked. Not yet tried in a real
  wallet.

**Ben's setup, October 3:** the organization's base permission is none
and members cannot create repositories; humanshaped/cohort-test is
private with Discussions on (so the free plan allows it); the "Human
Shaped Hub" GitHub App (App ID 5177340, installation 167581097) has its
three secrets in Supabase and is the sign-in provider, and Ben's account
carried over without a duplicate. Verified end to end: a test cohort
pointing at a secret test team (cohort-test, kept for the student-side
test) opened its conversation through cohort-access, and GitHub shows
Ben as an active maintainer. The OAuth server is on. Still to do:
dynamic client registration (and the authorization path) in the OAuth
Server settings, and unchecking "Allow members to create teams". Not
yet seen: the invitation a brand-new member gets.

- **Cohort conversation on the site.** /cohort/ shows the five newest
  discussions from the cohort's private repository, opens a thread in
  place, and posts replies and new conversations as the student through
  GitHub's GraphQL API with their own GitHub App token (kept in
  sessionStorage, removed from supabase-js's saved copy); /live/ shows
  the newest three with "Add it to the queue". **Verified for real as
  Ben** with a labeled test cohort on the cohort-test team: the page read
  the repository's discussions, and a conversation started on the page
  reached GitHub as discussion #2 by bhwilkoff in General (then deleted,
  with the test cohort). That settles the open question of whether the
  App's Discussions permission covers posting. Note for testing: after a
  deploy, browsers keep the old scripts for up to ten minutes.
- Ben finished his setup: dynamic client registration is on (the OAuth
  server lists /auth/v1/oauth/clients/register) and members can no
  longer create teams.

- **M5. The movement toolkit, finished.** /start/meetup/ (a 90-minute
  evening with 60-minute timings, the host's opening and closing words,
  four social rules said aloud, an announcement to copy, access notes,
  and a one-page run sheet), /start/hackathon/ (one-day and half-day
  schedules, why there are no prizes, an organizer's checklist, and two
  printable sheets), and /start/brand/ (the wordmark in four versions,
  the icon with the arch high, meetup and hackathon lockups, the two
  marks, colors with contrast ratios, Commissioner, and usage rules),
  all generated by tools/mark/make_brand.py from outlined letters.
  Research in research/notes/toolkit-notes.md. Verified live; every page
  labels its copy as a draft awaiting Ben's read.

- **Submitting and hiding** (Ben's decisions, October 3). The student's
  switch is their "it is ready"; from the start of the second-to-last
  session, anyone who has not submitted sees one calm note naming what
  is missing, and their teacher sees who has not yet. A teacher can hide
  an app from public view (app_hides, with a reason only the student and
  their teachers see); it stays on the cohort's own pages. Migration
  20261003090000 applied (after two expired connector approvals, with
  Ben at the Mac). 194 database checks, 110 node tests.

- **Students' agents, connected for real** (October 3, 20:55 UTC). Ben
  added "Human Shaped" as a custom connector on claude.ai: Claude
  detected OAuth and dynamic registration by itself, registered as a
  client named "Claude" (auth.oauth_clients, dynamic), Ben allowed it on
  /oauth/consent/ (one consent recorded), and the mcp function answered
  five signed-in requests with 200 after two expected 401s. The mcp
  function now deploys with tools/deploy-mcp.sh through Supabase's own
  CLI (Ben's access token in ~/.humanshaped/supabase-token, never in the
  repository), so deploys need no connector approval. Still to confirm:
  a tool's answer in a real conversation.

**Finished October 3, afternoon, after Ben's decisions:**

- **M11, finished.** COURSE.md carries every adopted move (six session
  parts: Arrive, Show, One value at work, Read one real prompt, Start,
  and a private check with "what is still muddy?"; "Ready, or not yet";
  groups of three; four rules for how we talk; when someone goes quiet;
  feedback from your own agent; teaching a cohort of your own), and
  showing-your-work.md matches. docs/teaching/ holds an index (the arc
  at 60, 75, and 90 minutes) and a guide for the week before and each
  of weeks 1 to 5. Sessions come at the end of their week (a decision
  for Ben to confirm). Pushed to main; copy awaits Ben.
  **To align the site after M12 merges:** cohort-lib.js PARTS (Build
  becomes Start, Close becomes the private check, a 3-minute break after
  Show, the guides' minutes 7/25/3/6/22/9/3, the bring-back steps in
  Show's text, week 5's different agenda); /cohort/'s "this week" stages
  with end-of-week sessions; render.js SITE entries and pages for
  docs/teaching/; /cohorts/ copy that still says "a pair, a trio" and
  "everyone builds".
- **M12, finished.** One Meet link per group (groups.meet_url; the
  Meet script makes one recurring room per group and checks them; the
  room is the first button on /cohort/ and /live/ during the group
  part), closing the loop on checks (/teach/ shows last session's
  answers and a "what I heard, and what changes" note that /live/ shows
  during Arrive), the trio protocol on /live/ (each group's order,
  rotating weekly, each builder's "what I want to know", and step
  timers), ready or not yet on bring-backs (a partner or teacher
  confirms; changing the mark clears confirmations), and a teachers-only
  "not seen this week" list worked out in the page, never stored.
  Migration 20261003100000 applied through Supabase's Management API
  with Ben's access token (no connector approval) and recorded in the
  migration history. 230 database checks, 123 node tests. Not yet run
  in a real Meet session or as meet@.
- **The site follows COURSE.md.** /live/'s agenda has the six parts and
  the break with the weekly guide's minutes (the break dropped for an
  hour or less); the template's weekly guides are read live at
  /teach/guide/weeks/, /teach/guide/before/, and /teach/guide/week-1/ to
  week-5/ (verified live); /cohorts/ describes the new session and
  groups of three; the mcp server redeployed with tools/deploy-mcp.sh.
  Still open: /cohort/'s "this week" stages assume a session opens its
  week, while COURSE.md now puts it at the end (Ben to confirm which).

**Database changes now go through** Supabase's Management API
(`POST /v1/projects/<ref>/database/query`) with the token in
~/.humanshaped/supabase-token, then a row in
supabase_migrations.schema_migrations, so no connector approval is ever
needed. Functions deploy with tools/deploy-mcp.sh.
- **M13, finished.** AGENTS.md went from 49,871 to 21,820 bytes with no
  rule dropped: platform sections moved unchanged into docs/platforms/
  (web, apple, android, windows, tv, design-system, shared-data), with
  an index in AGENTS.md saying when to read each and the hard rules
  every platform shares kept in place. docs/maintaining/AGENTS-MD-MAP.md
  maps every old line to its new home; tools/test_agent_files.py fails
  at 24,000 bytes or on a missing linked doc (seen failing, then
  passing). setup.md and the README name Antigravity as Google's route,
  "for now, and this may change". Pushed to main; copy awaits Ben.


**Proposed from the teaching research** (research/notes/
facilitation-assessment-social-learning-notes.md, October 3; waiting on
Ben before COURSE.md or the tools change):

- COURSE.md: an "Arrive" part where the teacher says what last week's
  checks showed and what changed; the builder says what they want to
  know and partners ask one clarifying question before the three
  questions; "one value at work" as its own part; fade the prompt
  reading through the cohort's own stuck moments, with a volunteer in
  week 5; "Build" becomes "Start" (everyone sends the week's first
  prompt before leaving); checks answered privately, with "what is
  still muddy?"; a "Ready or not yet" section using each stage's bar;
  a strong and a weak bring-back shown in the week before; trios by
  default, checked at the end of week 2; four social rules said aloud;
  the teacher reaches out within two days of a missed week; writing
  down what you agree and disagree with before acting on an AI review;
  new teachers co-lead one session first.
- Tools, in order: one Meet link per group (Workspace for Education
  Fundamentals has no breakout rooms, so check humanshaped.org's
  edition first); close the loop on checks (/teach/ shows last
  session's answers and one "what I heard, and what changes" line that
  appears on /live/); the trio's protocol on /live/ with a timer and
  each presenter's question; "Ready or not yet" on each bring-back; a
  teachers-only "not seen this week" list; weekly facilitator guides in
  the template; a week 3 look across groups.
- Never build: points, streaks, leaderboards, like counts, attendance
  or camera tracking, scored quizzes, AI summaries or grading of
  students, automatic partner rotation, or a second chat space.

**Running (October 3, evening):**

- **M14. Site-wide accessibility and quality audit** (WCAG 2.2 AA, axe on
  every page in both themes at 375 and 1280, links, headers, mechanical
  copy fixes; voice rewrites listed for Ben's copy audit).
- **M15. The classroom on Meet, research first** (Ben, October 3: "we
  might need to do some research on how to make add-ons for Meet and/or
  chrome extensions"): Meet add-ons (side panel, main stage, shared
  state, private-to-domain publishing, outside guests), the Meet REST
  API and meet@ automation on Education Fundamentals, Chrome extensions
  on meet.google.com, and the student's own AI in the session. Then a
  phased plan and a first prototype. Known so far: tools/meet-events
  (events, per-group rooms, checks) and tools/session-recorder have
  never run against the real Google services.
  **Research done** (research/notes/meet-addons-and-extensions-notes.md):
  a Meet add-on published privately to Ben's organization (no review,
  no fee; only accounts inside it can install it, so teachers first,
  and students see its main stage through screen share); /live/ stays
  the students' page (any browser, phones included); no student Chrome
  extension (installs, phones, fragility, privacy); Education
  Fundamentals confirmed to lack breakout rooms, polls, Q&A, recording,
  transcripts, and attendance, but allows 24-hour meetings and
  co-hosts; Google's Co-Doing API is closed to new signups, so shared
  state stays on Supabase Realtime; Gemini in Meet is a paid add-on, so
  students' own agents use the hub's this_session tool. Phases: 0, a dry
  run of meet-events and the recorder; 1, the private teacher add-on
  (building now); 2, TRUSTED room access and meeting codes stored so the
  add-on knows the cohort and group; 3, a public listing only if cohort
  1 asks, which needs /privacy/ and /terms/ and Google's review.

**The classroom on Meet, designed** (research/notes/meet-classroom-design.md,
October 3): Ben's 14 wishes mapped to $0 mechanisms. Shared state stays
in the hub (Supabase Realtime), seen on /live/, in the add-on, and
through the teacher's screen share. Not possible on Meet today, with
the alternatives: rearranging others' video tiles (pin for everyone,
roles on /live/), silent listening to a room (the teacher joins
visibly), saving Meet's chat on Education Fundamentals (a GitHub thread
per session). Per-student talk time is declined on purpose (Ben's item
13); the teacher's own talk time is measured on their computer only.
Milestones: C0 dry run and /privacy/, /terms/, /support/ (Ben approves
the words); C1 live_signals (send to rooms, call back, cards, on stage,
recording notice); C2 rooms made by meet@ through the Meet REST API with
members added, and a room board; C3 the add-on submitted for public
listing early; C4 an Excalidraw board synced through Realtime, plus a
Slides deck per session; C5 the session's GitHub thread; C6 teacher MCP
tools and commits during class; C7 follow-ups; C8 recorder clips and a
Chrome Web Store listing; C9 branding.

**The Meet add-on prototype (M15, merged October 3):** /addon/ is the
side panel, a launcher of activities (Now, Queue, Checks; new tools join
its ACTIVITIES list), with each part's timer, the "what I heard" note,
the trio order (only that group in a group room), "put it on the stage",
and the teacher's check controls; /addon/stage/ is the main stage, told
what to show by the teacher's panel and reading no data itself. Sign-in
inside Meet tries the Storage Access API, then a popup to
/account/?handoff=meet that posts the session back to this origin only.
tools/meet-addon/deployment.json and README carry Ben's setup (test with
Install; choose public or private visibility later, since Google makes
it permanent). 139 node tests. Only a real Meet can show whether its
frame allows storage access and popups, what startActivity shows others,
and mobile.

**Classroom milestones merged October 3, evening** (all applied
through the Management API, 346 database checks and 190 node tests):
- **C1, live signals** (20261003140000): "go to your rooms" with a
  countdown and each person's own room first, "come back", cards with
  the teacher's text and saved presets, /card/ for screen share, who is
  on stage (with how to pin for everyone), and "recording now".
- **C4, the board** (20261003150000): Excalidraw (MIT, bundled into the
  site because the CDN build loads several Reacts) at /board/?c=&s=,
  group boards, lock and clear for teachers, PNG/SVG/.excalidraw
  downloads, a stage view for the add-on, element-by-element saves, and
  private Realtime channels with rules that cover only board: topics. A
  lock stops saving at once but not strokes from already-connected
  people until they reconnect. The per-session Slides deck is not built.
- **C6 and C7, teacher tools and follow-ups** (20261003130000):
  cohort_roster, student_work, class_now, and a check_this_code prompt
  on the MCP server for teachers only (redeployed), commits during class
  on /live/, follow-up cards on /teach/ with drafts kept in the browser,
  and notes the student reads under "From your teacher".
- **M14, accessibility audit:** 0 axe violations in 192 runs; live
  regions narrowed so screen readers no longer re-read whole pages.

**Workspace admin, done October 3 with Ben signed in:** a "Live
sessions" organizational unit, with meet@humanshaped.org moved into it.
Already in place and checked: Drive sharing outside the organization,
outside guests joining Meet, external Calendar invitations, Google Cloud
and Apps Script on, and Marketplace installs allowed. Next, as meet@
(Ben signs meet@ into Chrome; Claude never types passwords): the Cloud
project, its APIs and consent screen, clasp for meet-events, and the
add-on deployment.

**As meet@, done October 3 (Ben said yes to Google's API Services User
Data Policy):** Cloud project `human-shaped` (number 1086485459450) with
the Marketplace SDK, Workspace add-ons API, Apps Script API, and Meet
REST API enabled; the consent screen created; HTTP deployment
`human-shaped` created from tools/meet-addon/deployment.json and
installed for meet@. Left: the Admin console's Meet add-ons setting
(it asked for Ben's password again), clasp login for meet-events (Ben's
browser click), Script Properties and whoAmI, and a test call.

**Next: the gaps against VISION.md and COURSE.md** (gap analysis,
October 3, after every C milestone that does not wait on Ben merged):

- **G1. A teacher other than Ben sets up a cohort alone:** a provisioning
  function makes the private repository (Discussions on) and secret
  team through the GitHub App, and meet-events reads a queue of setup
  requests as meet@. 4 to 6 days, migration, research first on App
  permissions and Apps Script polling Supabase.
- **G2. A builder outside a cohort has a place on the hub:** their own
  app record and public switch, a builder page, and MCP context when
  working alone. 4 to 5 days, migration, moderation notes first.
- **G3. The path is interactive:** agent prompts as steps with copy
  buttons, a "ready / not yet" self-check, "bring this back" into the
  cohort or saved privately, and progress per person (no points). 3 to
  5 days. Building now.
- **G4. Reaching a person off the site:** the missed-session reach-out
  and replies, through a $0 channel. 2 to 3 days, research first.
- **G5. Events and community on the site:** a published events.json
  and community threads by a nightly workflow, and each app's
  conversation on its page. 3 to 4 days.
- **G6. Template, week 4 for free, and each app its own identity:** an
  identity step (applicationId and bundle ID were com.example.appname),
  a signed APK artifact, and free sharing in stage 05. 2 days. Building
  now.
- **G7. Alumni and mentors:** credential holders return to finished
  cohorts as mentors, and enrollments are marked finished. 2 days,
  migration. Building now.

## Needs Ben

- **Decisions from the milestones,** all with a default already built:
  1. Cohort apps in public: the default is the student's own opt-in;
     DECISIONS.md says "included automatically" (M1, hub-privacy-notes).
  2. May a teacher take down an app a student chose to show? (Built:
     yes.)
  3. Pairs or trios chosen by each teacher; students lead the prompt
     reading by the last week; cohort lessons come back to the template
     as an issue or pull request (M8, COURSE.md).
  4. The template's new placeholder palette, a quiet slate on neutral
     gray (M6).
  5. All new copy from M1, M2, M7, and M8 is drafted in Ben's voice and
     waits for his read (Ben, October 3: a copy audit comes later).
  6. Shorten AGENTS.md below 24,000 bytes so Antigravity reads all of
     it (moving platform detail into docs it points to)? Recommended.
  7. Which Google lane the course names, now that Gemini CLI is paid
     and Antigravity's free limit is unpublished.
  8. Link all of the template's skills into .agents/skills/, or keep
     three links and the pointer skill?
  9. Toolkit (M5): may anyone call an event a Human-Shaped Meetup or
     Hackathon without asking, as long as it keeps the guides' parts?
     Name the outside sources on each page, or only in the notes? The
     minimum sizes (wordmark 100px or 25mm, icon 16px)? Ship the white
     wordmark on clay?
  10. Credential (M4): a hashed email so Credly can import it; a $0
      status list so wallets see revocation; whether "published" means
      a store listing only; whether each Apple device is its own level.
  11. Discussions: Announcements and Polls left to GitHub for everyone;
      "Sign in again" by hand rather than automatically.

- **Connecting students' agents, once** (core item 3; the design and
  sources are in `research/notes/agent-connection-notes.md`). In the
  Supabase dashboard for humanshaped-hub: Authentication, OAuth Server,
  switch on the OAuth 2.1 server and dynamic client registration, and
  set the Authorization Path to `/oauth/consent/`. Then review the
  consent page's words when it exists, and try connecting once yourself
  from claude.ai, Claude Code, and Gemini CLI before anything links to
  it.

- **Cohort conversation setup, once** (core item 2; the design and its
  sources are in `research/notes/cohort-conversation-notes.md`). Each
  cohort gets a private repository in `humanshaped` with Discussions on
  and a secret team of its members, and sign-in moves from the OAuth app
  to a GitHub App, because an OAuth app can only reach private
  discussions with the `repo` scope (full access to every private
  repository a student can reach, confirmed in GitHub's GraphQL guide),
  while a GitHub App's token reaches only discussions, only where the
  app is installed. Ben's steps:
  1. Organization settings, Member privileges: base permission "No
     permission"; members cannot create repositories or teams.
  2. Make one private test repository and switch on Discussions (this
     confirms Discussions works on private repositories on the free
     plan, which no GitHub page states outright).
  3. Create a GitHub App owned by `humanshaped`: callback
     `https://bifrieqzkihuxfzttgvd.supabase.co/auth/v1/callback`, user
     token expiry on, webhooks off; permissions Discussions read and
     write, Members read and write (organization), Email addresses read.
  4. Install it on the organization.
  5. Put its client ID and secret into Supabase's GitHub provider, and
     its private key and app ID into Edge Function secrets (never the
     repository). The agent can do this step if Ben pastes nothing into
     chat and enters the secrets himself.
  6. After a test sign-in works, delete the old OAuth app.

- **A search token for the directory scan.** GitHub's code search
  refuses a workflow's built-in token. Create a fine-grained personal
  access token (public repositories, read-only) and add it as the
  `DIRECTORY_SEARCH_TOKEN` secret on humanshaped/directory. Until then
  the directory still publishes, and the scan warns instead of failing.

- **The site's own declaration and harm answer, in Ben's words.** The
  test review found no `HUMAN-SHAPED.md` for the hub and no written
  answer to "whom could this harm?" (principle 12). Both have to be
  Ben's words (principle 13), so they wait for him.
- **Confirm the licenses:** CC BY 4.0 for the words and MIT for the code
  (`LICENSE.md`), chosen as the open default.
- **A real test of the session recorder** before cohort 1, since the
  site promises recorded sessions.
- **Authorize "Human Shaped" once on GitHub** (the secret is saved and
  the hand-off to GitHub is verified; the agent's browser cannot click
  Authorize for an account owner). Then the agent makes Ben the first
  teacher and tests /account/, /teach/, and /cohort/ for real.
- ~~Turn on GitHub sign-in~~ (done by Ben). The GitHub sign-in app is registered under the humanshaped
  organization (client ID `Ov23li0LEW1AbQLRdNjs`). On its settings page
  (github.com/organizations/humanshaped/settings/applications/3900551),
  click "Generate a new client secret". Then in Supabase, humanshaped-hub,
  Authentication, Sign In / Providers, GitHub: switch it on, paste the
  client ID and the secret, and save. Then sign in once at
  humanshaped.org/account/ so the agent can make Ben the first teacher.
- The Google Admin and Cloud setup steps in `tools/README.md`.

## Log

- 2026-10-02: loop started. Plan written.
- 2026-10-02, item 1 (directory). Built github.com/humanshaped/directory:
  four founding listings as files, `tools/scan.py` (exact file-name
  markers, confirmed against `template_repository`, lineage includes
  DualAppTemplate and QuadAppTemplate), a nightly workflow, and an
  "Ask to list my app" issue form. Verified: local scan; a negative
  control found Archive Watch when it was not excluded; the workflow
  runs green and publishes directory.json; the token gap warns. /apps/
  now draws non-founding listings from directory.json (checked with a
  fake listing in a local render). Fixed missing Oxford commas across
  the site (footer and five sentences). Not yet verified: a real
  candidate from someone else's template-born repo.
- 2026-10-02, item 2 (AI review). Added `human-shaped-review` to the
  template (.claude/skills, reachable from Gemini through the pointer
  skill), registered in AGENTS.md and the catalog (145 skills, 55 Ben's),
  and taught in the talking guide and stage 08 step 8. Fixed, pushed.
  Verification in progress: an agent is running the skill against
  humanshaped.org itself, to see whether the output is useful and
  honest before calling it done.
- 2026-10-02, item 2 verified. A test run of the skill against the hub
  produced an honest review (2,600 words) and six problems with the
  skill: template-only file paths, softened grades, an impossible
  "visitor's view" from a fetch, no place for cross-cutting gaps, no
  length target, and a conflict over sample prompts. All six fixed in
  the template. Acting on the review's findings: the template LICENSE
  placeholder is filled, the site now has LICENSE.md (CC BY 4.0 words,
  MIT code) and a credit line in every footer naming the agent, the
  typeface, and the license. Left for Ben: the hub's declaration and
  harm answer, in his words.
- 2026-10-02, item 3 (look). Added `make-it-look-like-itself` to the
  template (research real references first, three directions on the
  real core screen, the chosen look on every platform at once, the
  machine-made-design tells to avoid), stage 03 step 8, the catalog
  (146 skills, 56 Ben's), an AGENTS.md row, and a comment in the web
  stylesheet marking its look as a placeholder. Web tests pass. Fixed,
  not yet verified on a real app: the first true test is a cohort
  member's week 3. Found and logged item 13 (palettes disagree across
  platforms).
- 2026-10-02, item 4 (sign-in), most of it. Supabase project
  `humanshaped-hub` created on the free plan (us-west-1). Schema and row
  level security written, tested locally against real Postgres as four
  people (26 checks, seen to fail when a rule was opened on purpose; the
  test caught a real bug where a teacher could not read back a new
  cohort), and applied. Supabase's security check then flagged seven
  helpers callable through the API; moved to a private schema, tests
  still pass, only leave_cohort and delete_my_account remain, on
  purpose. GitHub sign-in app registered under humanshaped; Supabase
  Site URL and redirect allow-list set. /account/ built (sign in, your
  cohorts, open cohorts, join, leave, sign out, delete account) and
  checked signed out and with a GitHub error. Not linked from the header
  until Ben switches the provider on and a real sign-in is verified.
- 2026-10-02, item 5 (teacher tools). /teach/ built: a teacher's
  cohorts, a form for a new one (title, address, description, first day,
  weeks, session day, time, length, time zone, places, status, open
  conversations), "make the weekly sessions" (each session's time kept
  in the cohort's own time zone across daylight saving changes), each
  week's title, challenge, Meet link, and recording link, the roster,
  groups with checkboxes, and "copy the setup for the Meet script" in
  exactly the shape tools/meet-events reads. calendar_contacts added so
  invitations need no email on the roster (30 database checks pass).
  Verified: 8 tests for the date and setup calculations; the page drawn
  against a stand-in database in light and dark, which caught the
  template's known `[hidden]` versus `display` trap on the form, now
  fixed. Not yet verified against the real database: that waits for
  Ben's first sign-in.
- 2026-10-02, item 6 (cohort page). /cohort/?c=<slug> built: this week's
  challenge, the next session (with "Join the session now" while it is
  live), recordings, your group and who is in it, your app's name,
  repository, link, and an optional calendar email, everyone's app with
  its three latest commits read live from GitHub (cached ten minutes,
  using the visitor's own GitHub sign-in when present, and honest about
  private or missing repositories), and bring-backs with feedback.
  /account/ links to it. Verified: 8 tests for the week and commit
  helpers; the page drawn against a stand-in database with real commits
  from GitHub. GitHub sign-in verified up to GitHub's Authorize screen.
- 2026-10-02, item 7 (session page). /live/?c=<slug> built for keeping
  open beside Meet: the week's title and challenge, Join and cohort-page
  buttons, the recording notice, the agenda from the course's session
  shape scaled to the cohort's session length with a silent timer for
  each part, links to the week's stages of the path, and the
  bring-backs shared since the last session. The Meet setup now points
  at /live/?c=<slug> (a static site cannot serve /live/<slug>/). Ben's
  account is promoted to teacher automatically on first sign-in
  (migration 4, 31 database checks pass, applied). Verified: 19 page
  logic tests; the page drawn against a stand-in database. Not yet
  verified for real: everything behind sign-in, which waits for Ben's
  one Authorize click.
- 2026-10-02: **loop closed** at Ben's request (restart). Next session
  starts here.
- 2026-10-03: loop resumed. Re-read the vision, decisions, research,
  WRITING.md, COURSE.md, and the principles. Checking Ben's sign-in by
  reading the hub's database was refused by the session's permission
  check, so it waits for Ben to report what /account/ shows (opened for
  him in Chrome; the Chrome extension was not connected).
- 2026-10-03, item 8 (toolkit), the mark. Researched how other marks
  earn trust (Not By AI links each badge to a page explaining how the
  work was made, and asks that it not be altered) and how GitHub themes
  README images (`<picture>` with prefers-color-scheme, github.com only).
  Built two marks, "working toward" and "declared", matching the status
  key in HUMAN-SHAPED.md, in light and dark, with every letter drawn as
  an outline from Commissioner so they render without the web font
  (`tools/mark/make_mark.py`, HarfBuzz shaping, arch position matched to
  the live wordmark by eye at 3x). /start/#mark shows both and gives one
  snippet that links the mark to the builder's own declaration, with a
  copy button. Verified: rendered in true 375px frames, light and dark;
  GitHub's Markdown renderer keeps the `<picture>` and proxies both
  images, and after the push GitHub's image proxy served the live SVG
  (200, image/svg+xml). The template's PRINCIPLES.md now points
  declarers to the mark. Copy is mine and waits for Ben's review.
- 2026-10-03, item 8 (toolkit), the sheets. /start/sheets/ prints the
  fifteen principles and the four questions, one sheet each, with their
  words read live from the template's markdown (assets/sheet-lib.js, 4
  new tests, 23 in all, two of them against the real files). Verified by
  printing to PDF: two pages, each on one sheet. Then Ben asked for the
  core functionality before side quests, so the backlog is reordered.

- 2026-10-03, core item 1, partly verified for real. Ben signed in:
  /account/ shows @bhwilkoff, /teach/ shows the teacher view (migration
  4 made him a teacher), and a draft cohort, "Test cohort (delete me)"
  at test-cohort, was created through the real form. The session's
  permission check then refused further steps against production, so
  sessions, /cohort/, /live/, shares, and feedback for real wait on
  Ben adding permission rules (or clicking through himself). The test
  cohort is a draft and can be deleted from the database by its teacher
  (cohorts_delete allows drafts). Teachers read their own cohort's
  /cohort/ page without joining, because in_cohort includes teaches.
- 2026-10-03, core item 4 (teacher feedback queue). /teach/ now opens
  with "Waiting for your feedback": every request for feedback and every
  question in the teacher's cohorts with no answer yet from one of that
  cohort's teachers, oldest first, with an answer box on each.
  TeachLib.waitingForFeedback has 2 new tests (25 in all). Fixed in
  passing: textareas in inline forms (the cohort page's feedback box)
  had no styles. Verified against a stand-in database in a local render.
  Not yet verified against the real database. Research for core item 2
  (cohort conversation) is running.

- 2026-10-03, core item 5 (joining from the front door). /cohorts/
  reads open cohorts from the hub (anyone may read non-draft cohorts) and
  lists each with its dates, places, and weekly time in the cohort's
  zone and the reader's own (TeachLib.scheduleText, 4 new tests, 29 in
  all, including a session that falls on the next day for the reader).
  "Join with GitHub" goes to /account/?join=<slug>, which carries the
  choice through GitHub sign-in, puts that cohort first, and still asks
  the person to click Join. /account/ now tells a teacher where /teach/
  is. Since Ben's real sign-in worked, the header's "Sign in with
  GitHub" on all 25 pages now goes to /account/. Verified against a
  stand-in database at 375px and 430px. Then verified on production,
  signed in as Ben (reading only): /account/ shows the teacher link, and
  /teach/ reads the real database for the queue without an error
  ("Nothing is waiting for you right now"). Not yet verified for real: a
  real open cohort (the test cohort stays a draft). Found: signed in,
  /account/'s heading and the header button still say "Sign in with
  GitHub"; they should say who you are.

- 2026-10-03, core item 2, research. A research agent read GitHub's
  and Supabase's docs (34 sources) and recommended private repositories
  per cohort with Discussions, secret teams, and a GitHub App for
  sign-in. Checked the deciding claim myself in GitHub's GraphQL guide:
  private discussions need the `repo` scope through an OAuth app. Still
  to prove on the first real build: one real post through the App's
  Discussions permission, and that moving sign-in to the App keeps
  existing Supabase accounts.

- 2026-10-03, core item 2, the database. Migration 5 gives each cohort
  a private repository and team name (teachers set them; the repository
  must be in humanshaped) and adds github_access, where the server
  function records whether each person is invited, a member, or
  removed; only that function writes it, and only the person and their
  teachers read it. 8 new database checks, 39 of 39 pass, and opening
  the read rule on purpose failed the two checks that guard it. Applied
  to production; Supabase's security check shows only the two functions
  that are callable on purpose. Ben added this project to his auto mode
  settings. The header names the signed-in person (verified in
  production). CLAUDE.md now says 39 database checks.

- 2026-10-03, **core item 1 done: the hub works end to end, for real.**
  Signed in as Ben in his own Chrome: made a draft test cohort, made its
  five weekly sessions (week 5 correctly moves from MDT to MST after
  daylight saving ends), saved week 1's title and challenge, opened
  /cohort/ as its teacher, shared a request for feedback, saw it in the
  /teach/ queue, answered it there (it left the queue), saw the answer
  on /cohort/, and opened /live/ with its agenda. Two bugs found and
  fixed, both verified live: the cohort page called a teacher "Someone"
  (it only knew enrolled students' names), and the "Your app" form
  showed to people who had not joined because a class's display: grid
  beat the hidden attribute (now `[hidden] { display: none !important }`
  site-wide). The test cohort was then deleted; the hub holds no
  cohorts, sessions, shares, or feedback. Still untested for real: a
  student joining (needs a second GitHub account and an open cohort).

- 2026-10-03, core item 2, the server function. `cohort-access`
  (Supabase Edge Function, deployed) adds a person to their cohort's
  GitHub team when they ask to join and takes them off when they have
  left, as a member or, for teachers, a maintainer, and records the
  answer (member, invited, removed, failed) in github_access. Nobody can
  ask for someone else. Its rules live in plan.js with 7 node tests (36
  in all). Verified live from Ben's browser: no cohort 400, unknown
  cohort 404, signed out 401, and the call from humanshaped.org passes
  the browser's cross-site check. Not yet verified: the GitHub step,
  which needs Ben's GitHub App and its three secrets
  (GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY, GITHUB_APP_INSTALLATION_ID).

- 2026-10-03, core item 2, wiring. Joining on /account/ asks
  cohort-access to open the cohort's GitHub team, and leaving asks it to
  close it. /cohort/ has a "The cohort's conversation" section that
  reads github_access: not set up yet, open it, accept GitHub's
  invitation, or open the conversation on GitHub. /teach/ has fields for
  the repository and the team. Verified on production as Ben with a
  labeled test cohort: the fields saved, the button reached the live
  function, and its answer stayed on screen. Two fixes from that test:
  a teacher saw "not in this cohort" on a new cohort with no sessions
  or people yet (the page now asks cohort_teachers directly), and the
  not-set-up answer showed a library's error text (now a plain
  sentence, with the detail in the function's log). Test cohort
  deleted.

- 2026-10-03: "Delete this draft" on /teach/ (drafts only, asks once on
  the page). Verified on production: made a labeled draft, deleted it
  with the button, and the list was empty again.

- 2026-10-03, core item 6 (setup week), first part. The template had no
  page before stage 00, which assumes a copy and an agent already exist.
  Wrote `docs/path/setup.md` in the template ("Getting set up"): the
  honest costs, the three things only a person does (a GitHub account,
  a copy, an agent subscription), two requests that let the agent do
  the rest, the cloud way for anyone with only a phone, and the first
  win. Linked from the template's README and COURSE.md, and presented
  at /path/setup/ (read live, listed before stage 00 on all 11 path
  pages). Verified rendering on production. Copy is mine, anchored in
  the October 1 step count, and waits for Ben's review. Still to do for
  setup week: the cohort-only steps (join, accept the GitHub invitation,
  the setup session) checked off on the cohort page. Research for core
  item 3 (connecting the student's agent) is running.

- 2026-10-03, core item 3, research and the safety rule first. A
  research agent recommended OAuth through Supabase Auth's own OAuth 2.1
  server (no extra charge, registers MCP clients automatically) and an
  MCP server on an Edge Function, because claude.ai's connectors (the
  free plan included) can only identify a student through OAuth; a
  connector added on claude.ai also reaches Claude Code. Checked the
  deciding claims in Supabase's docs myself, including the client_id
  claim on agents' tokens. Built the rule before the door: migration 6
  makes every agent token read-only (restrictive policies on every
  table, no reading calendar emails, and leave_cohort and
  delete_my_account refuse agents). 10 new checks, 49 of 49, 8 failed
  with the rule opened on purpose. Applied; /account/ and /teach/ work
  as before.

- 2026-10-03, core item 3, built and waiting on one setting. The `mcp`
  Edge Function (deployed, verify_jwt off as Supabase's guide requires)
  serves read-only tools my_cohorts, this_week, next_session, my_group,
  my_work, and method, the method as resources, and two prompts
  (review_this_week, prepare_for_session) that keep the words and the
  choice to share with the student. Every query runs as the student
  under row-level security. The answers live in shape.js with 7 tests
  (43 in all), and cohort-lib.js and teach-lib.js now load in Deno so
  the site and the server share the week and schedule logic (the first
  deploy sent a trimmed teach-lib; the next deploy sends the whole
  file). /oauth/consent/ (sign in, what it can and can never read,
  Allow or Not now, all on the page) and /connect/ (steps for Claude,
  Claude Code, and Gemini CLI, with `-s user`). Verified on production:
  an unsigned call gets 401 with the protected-resource metadata, which
  names the hub's Supabase Auth; the consent page reaches Supabase's
  OAuth API ("OAuth server is disabled"); both pages render. Not yet
  verified: a real agent connecting and calling a tool, which needs
  Ben's setting, and then one approval in his browser.

- 2026-10-03, core item 6 (setup week), second part. /cohort/ opens
  with "Getting ready" for people in the cohort: read Getting set up and
  make a copy, add the app's repository, add its live address (the
  first win), open the cohort's conversation, and connect an agent.
  Each step is checked off by what the hub can already see
  (CohortLib.setupSteps, 2 new tests, 45 in all); the agent step is
  offered and never marked, because the hub cannot see it. The card
  disappears once every step it can see is done. Verified against a
  stand-in at 375px and 430px, light and dark. The OAuth server was
  still off at the start of this tick.
- 2026-10-03, notes to students (Ben's request). Notes are no longer
  deleted when a cohort finishes or a student leaves; the student reads
  every note on /account/ ("Notes from your teachers", across cohorts)
  and can remove any. The author can correct a note's or feedback's
  words from /teach/'s follow-ups (Edit), a trigger keeps everything but
  the words fixed and sets `edited_at`, and /cohort/ and /account/ show
  "edited". Migration 20261003160000 applied through the Management API;
  351 database checks (2 fail with the edit rule opened), 190 node tests.
- 2026-10-03, C5, the session thread (merged). /live/ has "This
  session's thread": a teacher opens a GitHub discussion in the cohort
  repository with their own token, its number is kept on the session
  (`sessions.discussion_number`, migration 20261003170000, applied), and
  everyone reads it every 20 seconds and posts as themselves. The add-on
  has a Thread tab that links to it. 358 database checks, 198 node
  tests. Verified live as Ben on a "(delete me)" draft cohort linked to
  cohort-test: the thread opened (category General), a post from /live/
  landed on GitHub as bhwilkoff, and both were then deleted. Not yet
  tried: a student's post, and the tab inside Meet. Wording awaits Ben.
- 2026-10-03, C2, rooms and the room board (merged, migration
  20261003180000 applied). /live/ "The rooms" and the add-on's Rooms
  activity: each group's room link, trio step and whose turn, "We would
  like the teacher" (the teacher's "I am here" clears it), and a step
  timer records its step (`live_room_state`, in Realtime, deleted at
  finish; `groups.meet_space`). tools/meet-events makes TRUSTED rooms
  through the Meet REST API (members, teachers as co-hosts) when the
  Script Property ROOMS_VIA_MEET_API is true; Calendar rooms stay the
  fallback. 382 database checks, 206 node tests, 15 meet-events tests.
  Waits on Ben: enable the Meet REST API in human-shaped and allow the
  new scopes on the next whoAmI. Verified live as Ben on a "(delete
  me)" draft cohort, then deleted: the board at 375px with no sideways
  scroll, Start and Next step, and a second page seeing the change in
  2 seconds through Realtime. That test found and fixed a bug (a group
  with nobody on the hub stuck at step 1; 207 node tests now). Not yet
  seen: a student asking for the teacher, and the board inside Meet.
- 2026-10-03, C0 pages (merged): /privacy/, /terms/, and /support/,
  marked "Written by Claude, awaiting Ben's review", in the footer of
  every page and the sitemap; deployment.json has termsUri. /cohorts/
  #data no longer says leaving lets go of everything (notes stay).
  Checked live: Supabase Auth does keep the email GitHub gives (1 of 1
  users). For Ben before a public listing: the legal name and address
  (placeholders in comments on /terms/ and /support/), whether meet@ is
  read as the support address, and the words themselves.
- 2026-10-03, C9 (merged): the welcome on the add-on's main stage
  (cohort, week, challenge, "First: Arrive.") until a part starts, with
  "Put the welcome on the stage" in the panel and a /card/ twin; four
  1920x1080 Meet backgrounds (paper, evening, each with and without the
  arch high on the right) from tools/mark/make_backgrounds.py on
  /start/brand/; a cohort background drawn in the browser on /cohort/;
  an OBS section on /teach/guide/. 211 node tests. For Ben: choose the
  backgrounds, review the words. Not yet seen in a real call.
- 2026-10-03, C8 (merged, migration 20261003190000 applied): the
  recorder (0.2.0) marks moments (popup button, Alt+Shift+M) and makes
  clips on its finish page; it counts the host's own talk share from
  their microphone against the tab's mixed audio, opt-in, keeping no
  sound and knowing nothing about who else spoke, with keep or let go.
  /live/ "Your own talk": a `talk` signal everyone sees, and the share
  typed and saved to `session_notes` (teachers write, cohort reads,
  deleted at finish). STORE-LISTING.md drafted. 400 database checks,
  214 node tests, 24 recorder tests. For Ben: the one-time $5 Chrome
  Web Store fee (his decision; unpacked works free), an icon, and the
  listing words. Only a real call shows clip seeking in WebM, the level
  thresholds, and the shortcut inside Meet.
- 2026-10-03, G6 (template, merged to main as 51d94c2):
  tools/set_app_identity.py sets each app's own identifier and name
  everywhere a device or store reads them (Android, Apple, web, Windows,
  Play upload), with --check failing in a copy that still says
  com.example.appname; stage 03 asks for it as a conversation. The
  Android workflow keeps the debug APK 30 days and publishes a shared
  APK on a `v*-share` tag. Stage 05 "Sharing it for free", cited
  (limited distribution, adb, Apple's 7-day personal team, the web).
  COURSE.md no longer says a test track is free. Not yet run: a share
  tag on GitHub, and a build after an identity change.
- 2026-10-03, G7 (merged, migration 20261003200000 applied): finishing
  a cohort marks its members finished (reopening undoes it), and they
  keep reading it. `join_as_mentor` lets someone holding an unrevoked
  credential join an open or running cohort as a mentor; only teachers
  change roles (a trigger), which also closed a gap where someone who
  left could re-enroll themselves. /account/ offers "Help a new cohort
  as a mentor", /teach/'s roster switches roles, /cohort/ labels
  mentors. Mentors can do what students can and nothing more. 432
  database checks, 217 node tests. Not yet rendered with a real
  credential holder.
- 2026-10-03, G3 (merged, migration 20261003210000 applied): each
  stage's numbered steps get "Done", each quoted prompt "Copy these
  words", the bar a private "Ready to move on / Not yet", and "Be ready
  to" a "Bring it back" link into the cohort's bring-back form (or a
  private note when not in a cohort). Read from the rendered Markdown's
  shape only, no markers in the template. Marks live in the browser when
  signed out and in `stage_marks` (owner only) when signed in, merged on
  sign-in. /path/ shows "Marked ready", /account/ "Your path". 454
  database checks, 226 node tests. Checked signed out at 375px, and live
  signed in as Ben: a step and the ready choice were saved to
  stage_marks, then removed. Not yet tried: merging browser marks on
  sign-in, and "Bring it back" from a real cohort.
- 2026-10-04, G5 (merged): /events/ (coming up and already happened,
  with write-ups), the next events and newest community threads on
  /start/, and each app's newest issues on /apps/app/ (Discussions only
  for visitors signed in with GitHub). The data comes from community.json,
  built nightly by tools/community/ once its four files are copied into
  the public humanshaped/community repository (waits on Ben's yes, since
  it is a push to another repository).
- 2026-10-04, G4 (merged, migration 20261003220000 applied, `notices`
  deployed with its secret set from ~/.humanshaped/notices-secret): each
  person chooses on /account/ whether teachers may email them and
  whether meet@ may send a once-a-day "something is waiting" notice;
  /teach/ opens the teacher's own mail with their draft for people who
  allowed it. research/notes/reach-notes.md holds the reasons. Checked
  live: a wrong secret gets 401, the right one answers. Left: the Script
  Properties (NOTICES_URL, NOTICES_SECRET, NOTICES_ON), the mail
  permission on whoAmI, and a daily trigger, all as meet@.
  476 database checks, 238 node tests, 19 meet-events tests.
- Admin console, October 4: Meet's "Supplemental add-ons" (Google's and
  third-party) were already on for All Users, so Live sessions has them.
- meet-events as meet@, October 4: clasp signed in as meet@ (Ben's
  click), the Apps Script API turned on in meet@'s settings, the project
  "Human Shaped live sessions" created and pushed (the server copy
  matches Code.gs; .clasp.json stays out of git), linked to Cloud
  project 1086485459450, and NOTICES_URL set. Left for Ben: paste
  NOTICES_SECRET (from ~/.humanshaped/notices-secret, copied to his
  clipboard), run whoAmI and press Allow, then a test cohort for
  setupCohort.
- 2026-10-04, G2 (merged, migration 20261004010000 applied, mcp
  redeployed): a builder outside any cohort keeps one app on /account/
  ("Your own app", off until they switch "Show it on the apps page"),
  shown on /apps/ as "Shown here by the person building it"; teachers
  with can_approve can hide one with a reason; reports go to public
  issues in the directory. public_apps() gained a `kind` column (checked
  live as anon: 200). The MCP server's `my_app` gives the builder's own
  context. 498 database checks, 245 node tests. Checked live as Ben:
  /account/ shows "Your own app" and "How your teachers can reach you";
  a pasted GitHub address saved as owner/name with show off, stayed out
  of public_apps(), and "Take it off the hub" removed it.
- 2026-10-04, G1 (merged, migration 20261004000000 applied,
  cohort-access redeployed, setup-queue deployed with its secret from
  ~/.humanshaped/setup-queue-secret): /teach/'s "Before the first
  session" makes the cohort's private repository (Discussions on) and
  secret team through the GitHub App, idempotent and refusing names it
  did not make; and asks meet@ for the weekly event, Meet link, and
  group rooms through `setup_requests`, which meet@'s script claims
  through setup-queue (processSetupRequests, off until SETUP_QUEUE_ON).
  Checked live: setup-queue refuses a wrong secret and answers the right
  one. 514 database checks, 254 node tests, 24 meet-events tests.
  Waits on Ben: the GitHub App "Human Shaped Hub" needs Repository
  permissions, Administration: Read and write, accepted on the
  installation; then SETUP_QUEUE_URL, SETUP_QUEUE_SECRET, and
  SETUP_QUEUE_ON in Script Properties and a trigger, as meet@.
- G1 checked live, October 4: the GitHub App already had Administration
  write on its installation. On a "(delete me)" draft cohort, "Make the
  cohort's private repository and team" made humanshaped/provision-test
  (private, Discussions on) and a secret team with read access and Ben
  in it, and saved both on the cohort. The team and cohort are deleted;
  the repository waits for Ben to delete it (Ben's gh token cannot).
- Every gap from the October 3 analysis (G1 to G7) is built.

**Next: the second gap analysis (October 4)**
- **H1 (merged, migration 20261004020000 applied):** /teach/guide/
  rewritten to match the hub (six parts, trios, the repository button,
  meet@ calls and rooms, /live/, the board, the add-on in testing,
  follow-ups, notes, reaching out, finishing, credentials, mentors, the
  teacher's agent), all marked for Ben's review; setup steps gain
  groups, rehearse /live/, and connect your agent; a Teachers section
  adds and removes co-teachers (a trigger keeps the maker and at least
  one teacher); "Open the live page" on each cohort. 524 database
  checks. The new delete rule was not seen failing when opened (the
  agent's attempt was refused by the classifier as weakening security).
- **Ben's go-ahead, October 4:** humanshaped/community now holds the
  publish workflow, its builder and tests, the "Tell us about your
  event" form, and events/ (e75da2a); the first run published
  community.json (0 events, 0 threads, since its Discussions are empty).
  The credential signing key exists at ~/.humanshaped/credential-key-1.json
  (mode 600; Ben should keep a copy in his password manager), its public
  half is live in did.json, and a test credential signed with it checked
  out against the live did.json and was discarded. `sh tools/doctor.sh`
  reports what this Mac has ready (tools, accounts, keys, published
  files) without printing a secret.
- **H2. The credential's last step:** the holder never finds it on
  /account/ or /cohort/; signing is one person by hand; Ben cannot
  attach a signed file for a cohort he does not teach. 2 days,
  migration. Building (the key exists).
- **H3. The solo builder's route:** /connect/ still says it waits on a
  setting; /account/ and /path/ do not link /connect/; no review prompt
  built on `my_app`; the home page's "Going alone" skips /path/setup/;
  the template README and "On your own" never point to humanshaped.org.
  1.5 days. **Merged** (site; template README and "On your own" on
  main): /connect/ fixed and linked from /account/ and /path/, "Going
  alone" starts at /path/setup/, classmates' shown apps link to their
  hub pages, and the MCP prompt `review_my_own_work` (mcp redeployed).
- **H4 (merged):** the controls for rooms, cards with presets, on
  stage, recording, and talk share come from one place
  (SignalsLib.controlsHtml) on both /live/ and the add-on, which gains
  an Everyone activity for teachers and a Board activity (opened in a
  tab; the stage cannot sign in). /teach/ says the add-on is meet@-only
  until listed. tools/meet-addon/README.md "Who can use it": private
  reaches humanshaped.org only, public or unlisted needs Google's review
  and is permanent, so teachers elsewhere use /live/ beside Meet. 266
  node tests. Not yet seen in a real call.
- **H4, as planned:** no C1 signals, board, or talk share
  in the panel; /teach/ and the guide never mention it; teachers outside
  humanshaped.org cannot use a private add-on. 2 to 3 days, research on
  distribution.
- **H5 (merged, migration 20261004030000 applied):** a teacher opens a
  session to guests as a public showing (and may share its Meet link);
  /showcase/?c= tells guests when, how to come (Ask to join, honestly),
  the apps students chose to show, and how to be a good guest;
  /events/ and /start/ list showings beside community events; /teach/
  and /cohort/ offer "Send a lesson back to the template" as a
  prefilled issue carrying only the cohort's title. Also fixed /cohort/'s
  stale line that said notes are deleted at the end. 536 database
  checks, 272 node tests. Not yet tried signed in.
- **H5, as planned:** a public showcase page
  with guests, /events/ fed by it, and a prefilled "send a lesson back"
  issue. 2 days, migration.
- **H6 (merged to main as ab37f0c):** stage 06's bar accepts the free
  readers Pulse already has (web counter, GitHub) when there is no
  store; stage 04 names week 3's "make it look like itself" (stage 03
  step 9). Stage 08 already had its bar ("When you are done with the
  path"), which path-lib.js reads. WEEK_STAGES left as is.
- **meet@ by its own Google identity (merged, deployed October 4):**
  notices and setup-queue accept meet@'s Google ID token (signature,
  issuer, expiry, the project's audience, verified email, meet@, and
  hd humanshaped.org; supabase/functions/_shared/google-id.js, tested),
  with the old secret only as a fallback, so Ben pastes nothing. The
  script carries the function URLs. Checked live: a bad token gets 401
  "shape", the old secret still answers. Pushed to meet@'s script;
  waits on Ben's Allow, then whoAmI's printed aud can be pinned in
  GOOGLE_ID_AUDIENCES.
- **meet@'s script live, October 4:** Ben pressed Allow; whoAmI runs as
  meet@ with hd humanshaped.org and the project's audience (pinned in
  GOOGLE_ID_AUDIENCES). sendNotices and processSetupRequests both
  reached the hub by meet@'s identity (0 notices, no requests). The old
  shared secrets are unset and deleted, and a secret call now gets 401.
  NOTICES_ON and SETUP_QUEUE_ON are true; triggers: processSetupRequests
  every 15 minutes, sendNotices daily 5 to 6 pm.
- Seams: /teach/ to /live/, classmates' apps to /apps/app/, the event
  issue form not yet in humanshaped/community.

## Where to pick up

1. Check on the milestone agents (M1, M2, M6). Review each branch they
   report, run its tests and look at it, merge what is verified into
   `site` (or `main` for the template), apply any migration after the
   policy tests pass, and push.
2. If the OAuth server is on, test a real agent connection (ask Ben
   before approving in his browser).
3. When a milestone finishes, start the next one from the list.
