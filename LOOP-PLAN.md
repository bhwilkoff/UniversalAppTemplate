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

**In progress:**

- **M3. Live sessions beyond a companion page** (agent, started October 3).

**Next:**

- **M4. The credential:** Open Badges 3.0 issued from humanshaped.org,
  with a public verification page and the teacher's issuing flow.
- **M5. The movement toolkit, finished:** a meetup guide, a
  Human-Shaped Hackathon kit, and brand assets.
- **M7. Works the same with Gemini:** agent-neutral setup across the
  path, tested on a fresh copy with Gemini CLI.
- Smaller: show the cohort's discussions on /cohort/ and /live/ once the
  GitHub App exists; design iteration two from Ben's notes.

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
  5. All new copy from M1, M2, and M8 is drafted in Ben's voice and
     waits for his read.

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

## Where to pick up

1. Check on the milestone agents (M1, M2, M6). Review each branch they
   report, run its tests and look at it, merge what is verified into
   `site` (or `main` for the template), apply any migration after the
   policy tests pass, and push.
2. If the OAuth server is on, test a real agent connection (ask Ben
   before approving in his browser).
3. When a milestone finishes, start the next one from the list.
