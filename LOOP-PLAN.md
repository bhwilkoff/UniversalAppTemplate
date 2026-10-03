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
- Template audience: anyone building alone. Site audience: community,
  cohorts, teachers, events. Put each change where its audience is.

## Backlog (in order)

1. **Directory, static first.** A nightly GitHub Action on `site` that
   finds `HUMAN-SHAPED.md` declarations and template-born repositories
   (the `template_repository` field), reads cohort membership when it
   exists, and publishes `data/directory.json`; an `/apps/` section that
   renders it alongside the four founding apps. $0, no backend.
2. **AI review skill in the template** (`human-shaped-review`): runs in
   the student's own Claude or Gemini, asks the principles' questions
   rather than grading, labels itself as AI, writes its notes to a file
   the student can choose to share.
3. **"Make it look like itself" step in the template**: a skill that
   proposes three looks from the app's own why, plus a stage 03 step.
4. **Sign in with GitHub (Supabase).** Free project, GitHub OAuth app
   under the `humanshaped` org, a one-page proof from the static site,
   then the schema: cohorts (with sessions, members, groups, metadata),
   roles (teacher), shares, directory listings, credentials. Row-level
   security. Needs Ben for the approval screens.
5. **Teacher tools**: create and edit a cohort and its sessions in the
   hub; hand the cohort to the Meet events script.
6. **Cohort page**: classmates' repositories and recent commits from
   GitHub, the next session, this week's challenge, groups.
7. **Session page** beside Meet, and a small read-only Worker feed and
   MCP endpoint so a student's AI knows what the session is about.
8. **Toolkit**: printable principles, the "human-shaped" mark for
   READMEs and sites, a meetup guide, and a Human-Shaped Hackathon kit.
9. **Setup week** pages, ending at the first win.
10. **Credential**: Open Badges 3.0, issued from humanshaped.org, a base
    level for a live web app and a level for each further platform.
11. **Template passes**: Oxford commas across the path, the vision woven
    through, lanes for agents other than Claude, COURSE.md pedagogy
    changes from the research (week 0, groups, checks for understanding).
12. **Design iteration two** on the live site from Ben's notes.
13. **One source for the template's design tokens.** Found while
    writing item 3: the platforms' placeholder palettes disagree (the
    web starter is white with a blue accent; Android's is dark navy with
    an orange primary), which breaks the lockstep-token rule in
    AGENTS.md. A `design-tokens.json` with a small tool that writes the
    web, Apple, Android, and Windows token files, and a parity test.

## Needs Ben

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
  images. Copy is mine and waits for Ben's review.

## Where to pick up

1. Confirm Ben authorized: `select github_login from public.profiles`
   should list `bhwilkoff`, and `public.teachers` should hold him. If
   not, ask him to visit humanshaped.org/account/ and click Authorize.
2. Test for real, signed in as Ben: create a draft cohort in /teach/,
   make its sessions, open it, see /cohort/ and /live/. Then point the
   header "Sign in with GitHub" buttons (every page) at /account/.
3. Continue the backlog at item 8 (toolkit), then 9 to 13.
