# humanshaped.org: Claude Code Project Context

This folder is the `site` branch of bhwilkoff/UniversalAppTemplate,
checked out as a git worktree beside the template
(`../UniversalAppTemplate`, branch `main`). It is the website for
humanshaped.org: the home of Ben Wilkoff's course on building
human-shaped software with AI, and, later, how people sign up for it.

## How it is served

- GitHub Pages serves the root of the `site` branch. Deploy = commit
  and push to `site`. There is no build step.
- `CNAME` holds `humanshaped.org`. Do not remove it.
- DNS is at WordPress.com: four A records (185.199.108-111.153), `www`
  CNAME to `bhwilkoff.github.io`, and a `_github-pages-challenge` TXT
  record. The domain is verified in Ben's GitHub account.
- `site` is an orphan branch so "Use this template" never copies it.
  Never merge `site` into `main` or `main` into `site`. Site pages,
  cohort tooling and sign-up code never go on `main`; the template may
  link to humanshaped.org, the way any project links to its community.

## What the site is about

Read `VISION.md` first. It is Ben's own statement of what this site is
for, and it outranks everything else here, including `research/`.

The short form: humanshaped.org is a human-shaped learning environment.
It starts as the home of free, five-week cohorts, and it grows into the
hub for anyone building software for people instead of profit. Its
design language is its own, not borrowed from any of Ben's apps, and it
is three things at once: part learning environment, part social hub
where people see one another's apps in progress, part movement catalyst
(a toolkit for declaring software human-shaped and starting events and
communities).

**Two audiences, one method.** The template (`main`) is for anyone who
wants to build human-shaped software on their own. This site is for
anyone who wants to join the community, take or teach a cohort, or start
something of their own. Every change goes where its audience is: method
and tooling to the template, community and cohort to the site. When a
change serves both, make it in the template and have the site link to
or present it.

**Free.** The ideas, the method and the tools are free. Cohorts are
free. Anyone may become a teacher and lead a cohort, so roles,
permissions and pages are designed for many teachers from the start.

**Sign-in is GitHub.** Everyone in a cohort has a GitHub account, so
sign-in uses it, and conversation uses GitHub's own discussion features,
shown on the site.

**AI feedback is the student's own agent, using our method.** The
student connects their Claude or Gemini to the course's review skill and
context. It asks the questions the method asks, it is labeled as AI, the
student decides whether to share what it said, and it never stands in
for the teacher's feedback.

The method and the course live in the template. Read these before
writing copy:

- `../UniversalAppTemplate/docs/path/00-why-we-build.md`: human-shaped
  software, learning three ways (student, builder, human), and the
  three moves (write it down, prove it, live with it).
- `../UniversalAppTemplate/COURSE.md`: the five-week cohort.
- `research/README.md`: the build-out plan, its decisions and its open
  questions.

## How it is written

Every word on the site follows
`../UniversalAppTemplate/docs/maintaining/WRITING.md`: Ben's voice, a
teacher's register, real anchors only (never invent an anecdote), no em
dashes, none of the banned words. The site's own values are the
template's: only essential words on screen, no AI-written copy presented
as Ben's without his review, $0 to run.

## How it is built

- Plain HTML and CSS, no framework, no build step. One stylesheet,
  `assets/site.css`, holds the tokens in `:root` with a dark-mode
  override, for every page. The header and footer are plain HTML
  repeated on each page, so change them everywhere at once.
- Every page is a folder with an `index.html`, so each has a canonical
  URL. Add new pages to `sitemap.xml`.
- The reading pages (`/path/NN/`, `/principles/`, `/why/...`) never
  copy the template's text. Each names its source file with `data-doc`,
  and `assets/render.js` fetches that file from the template's `main`
  branch on raw.githubusercontent.com and renders it with marked and
  DOMPurify. Links to other path files become this site's URLs; links
  to anything else in the repository go to GitHub. To give another
  template file a page here, add it to the `SITE` map in `render.js`.
- The header's "Sign in with GitHub" goes to `/account/` on every page.
  The home page's own sign-in buttons go to `/cohorts/#join`, where a
  person chooses a cohort first.
- Mobile-first, `min-width` media queries, test at 375px before 1440px.
- Accessible contrast: text on the orange `--color-primary` is dark.

## The hub app (sign-in, cohorts, sessions)

Read `LOOP-PLAN.md` first: it holds the backlog, what is verified, and
what waits on Ben.

- **Database:** Supabase project `humanshaped-hub` (ref
  `bifrieqzkihuxfzttgvd`, free plan, us-west-1, org "Learning is Change,
  Inc"). Schema and row-level security in `supabase/migrations/`, applied
  in order. `supabase/tests/test_policies.py` runs them against a local
  throwaway Postgres as four people and as a student's AI agent (599
  checks; agents' tokens carry a `client_id` and can only read); run it
  before applying
  any new migration, and see it fail when a rule is opened on purpose.
  Access-rule helpers live in the `private` schema, out of the API.
- **Sign-in:** GitHub, through the "Human Shaped" OAuth app owned by the
  `humanshaped` org (client ID `Ov23li0LEW1AbQLRdNjs`; its secret lives
  only in Supabase). Supabase Site URL is https://humanshaped.org and the
  redirect allow-list is `https://humanshaped.org/**`. Ben's GitHub
  account (`bhwilkoff`) becomes a teacher on its first sign-in, with
  `can_approve`. Others ask to teach on /teach/ (`teacher_requests`),
  and a teacher with `can_approve` decides there through
  `decide_teacher_request`, which adds the `public.teachers` row. Only
  a change by hand gives someone `can_approve`.
- **Pages:** `/account/` (sign in, cohorts, join, leave, delete),
  `/teach/` (a teacher's cohorts, sessions, groups, roster, and the Meet
  script setup), `/cohort/?c=<slug>` (this week, next session, group,
  your app, classmates' apps with live GitHub commits, bring-backs and
  feedback), `/live/?c=<slug>` (the page beside Google Meet: agenda with
  timers, this week's stages, the "show your work" queue, checks for
  understanding with an anonymous count the teacher may show, and what
  people brought back; Realtime nudges it to read again, with a
  fifteen-second read as the fallback). `/cohorts/`
  lists open cohorts from the database, and its "Join with GitHub" goes
  to `/account/?join=<slug>`, where the person confirms. /teach/ opens
  with requests to teach (for approvers) and the feedback queue, shows
  a cohort's "Before the first session" steps, and gives everyone else
  the request form. `/teach/guide/` is the teaching guide, with
  `COURSE.md` rendered live.
- **The public hub:** `/apps/app/?r=<owner>/<repo>` is every app's page
  (its words, where it runs, live commits, its HUMAN-SHAPED.md answers,
  and its conversation on GitHub), drawn only for apps in the directory
  or shown by their student; `/apps/` and the home page carry a feed of
  recent work across apps (at most 8 GitHub calls a visit, cached ten
  minutes, automated commits left out). Cohort apps appear in public
  only by the student's own switch (`enrollments.app_public`,
  migration 20261003055000, `public_apps()`; see `research/notes/hub-privacy-notes.md`), which is also their "it is ready": every app is submitted by the cohort's end (`submit-lib.js`, loaded on /cohort/ and /teach/). A teacher can keep an app off /apps/ with `app_hides` (migration 20261003090000), which never touches the student's switch.
- **Scripts:** `assets/hub-config.js` (public URL and publishable key),
  `hub.js`, `cohorts.js`, `teach.js` with `teach-lib.js`, `cohort.js` and `live.js`
  with `cohort-lib.js` and `live-lib.js`, and `apps.js` with `apps-lib.js`. Pure logic lives in the `-lib.js` files with
  tests in `tools/test/` (`node --test tools/test/*.mjs`, 110 tests).
- **The cohort's conversation:** `discussions.js` with `discussions-lib.js`
  reads and posts the cohort repository's GitHub Discussions on /cohort/
  and /live/ with the student's own GitHub token. That token is kept in
  `sessionStorage` only (and removed from supabase-js's saved session in
  `localStorage`), sent only to api.github.com, and treated as expired
  after 7.5 hours; see part 7 of research/notes/cohort-conversation-notes.md.
- **Students' own agents** (research/notes/agent-connection-notes.md):
  the `mcp` Edge Function (`supabase/functions/mcp/`, answers in
  `shape.js`) is a read-only MCP server reached through Supabase Auth's
  OAuth server, with its consent page at `/oauth/consent/` and the steps
  at `/connect/`. Deploy it with verify_jwt off and with
  `assets/cohort-lib.js`, `assets/teach-lib.js`, and `assets/live-lib.js`
  beside it, whole.
  Agents' tokens carry a `client_id`, and migration 6 makes them
  read-only everywhere.
- **Cohort conversation** (research/notes/cohort-conversation-notes.md):
  each cohort gets a private repository in `humanshaped` with
  Discussions and a secret team. The `cohort-access` Edge Function
  (`supabase/functions/cohort-access/`, rules in `plan.js`) adds a
  person to the team when they ask after joining and removes them after
  leaving, and records it in `github_access`. Deploy it with the
  Supabase tools; its GitHub App secrets live only in Supabase.
- **Students own their work.** Repositories and commits are read live
  from GitHub, never copied. The database holds membership, sessions,
  groups, what people choose to share, feedback, calendar emails (only
  the student and teachers can see them), credentials, and each live
  session's queue, questions, and answers, which are deleted when the
  cohort is marked finished.
- **The credential:** Open Badges 3.0, issued by `did:web:humanshaped.org`
  (`.well-known/did.json` holds only public keys), signed with
  `eddsa-rdfc-2022` by `tools/credential/` on the signer's own computer.
  The private key never goes in this repository or a web page. Logic in
  `assets/credential-lib.js`; pages `/credential/?id=<id>` and
  `/credential/issuer/`; issuing on `/teach/` for finished cohorts. See
  `tools/credential/README.md` and `research/notes/credential-build-notes.md`.
- **Directory:** github.com/humanshaped/directory (listings as files,
  nightly scan, issue form). `/apps/` reads its `directory.json`.
- **Meet tools:** `tools/meet-events` (Apps Script as
  meet@humanshaped.org) and `tools/session-recorder` (the $0 host-side
  recorder). Neither has run against the real Google services yet.

## This Mac

`sh tools/doctor.sh` says what is ready here (node, gh, clasp as meet@,
the Supabase token, the credential signing key, the published did.json
and community.json) and how to fix anything missing. Keys live only in
`~/.humanshaped/`, never in this repository.

## Sign-ups

The sign-up backend is undecided. Whatever is chosen: student names,
emails and any keys never go in this repository (it is public). Keep the
data in the sign-up service, and add a short privacy note beside the
form.
