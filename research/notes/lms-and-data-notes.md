# LMS features and no-cost data for humanshaped.org

Research notes, 2026-10-01. Written for Ben ahead of a launch in about two
weeks. Every factual claim has its source beside it. Where I could not
verify something from a primary source, it says so. Prices and limits are
as read on 2026-10-01; free tiers change often (two of the vendors below
changed theirs this year), so re-check the one you pick on the day you
build.

Constraints these notes respect: static GitHub Pages site (`site` branch,
no build step), $0 to run, no tracking, no student names or emails in the
public repo, learning-oriented, honest about limits.

---

## Headline findings (read these first)

1. **GitHub Classroom is gone.** Sign-ups closed 2026-05-26 and the
   website, APIs and services were decommissioned 2026-08-28. Repos and
   orgs are unaffected. Do not plan around it.
   (https://github.blog/changelog/2026-08-27-github-classroom-deprecated/,
   https://github.blog/changelog/2026-05-26-github-classroom-sign-ups-are-no-longer-available/)
2. **InstantDB Cloud is shutting down.** New sign-ups closed; cloud apps
   stop 2027-08-31. (https://www.instantdb.com/essays/instant_team_joins_openai)
   Rule it out.
3. **Xata no longer has a free tier** on its managed cloud (trial credit
   only). Secondary sources agree; I could not load an official Xata
   pricing page to confirm. (https://agentdeals.dev/vendor/xata,
   https://layerbase.com/blog/xata-alternatives)
4. **Supabase pauses free projects after 1 week of inactivity**, and the
   built-in auth email sends only 2 messages per hour and only to your own
   team's addresses, so magic-link sign-in needs a separate email sender.
   (https://supabase.com/pricing, https://supabase.com/docs/guides/auth/auth-smtp)
5. **Firebase's free plan sends only 5 email-link sign-in emails per day**
   and cannot deploy new Cloud Functions. (https://firebase.google.com/docs/auth/limits,
   https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)
6. **Every student already needs a GitHub account** (the course is built on
   a GitHub template repo). That makes "Sign in with GitHub" the sign-in
   that costs nothing extra, needs no email sender, and teaches nothing
   false. It is the single most useful fact for the decisions below.
7. **Vercel's free (Hobby) plan forbids commercial use**, defined to include
   "advertising the sale of a product or service" and processing payment.
   If the course is paid, Vercel Hobby is out.
   (https://vercel.com/docs/limits/fair-use-guidelines)

---

## TOPIC 1. LMS features on a static site

### 1.1 Survey of open-source LMSs (what they do, what to learn from them)

These are server applications. None of them can run on GitHub Pages; the
point of surveying them is to see which features a cohort project course
actually needs, then rebuild only those.

| System | What it is | Feature worth learning from | Fit for humanshaped.org |
|---|---|---|---|
| **Moodle** (5.1, Oct 2025; 5.2 in 2026) | PHP, the most-installed open LMS | 5.1 added an Activities overview where students see due dates, completion requirements and submission status in one place; activity chooser grouped by purpose (assessment, collaboration, communication) (https://elearning.3rdwavemedia.com/blog/whats-new-in-moodle-5-1/7254/, https://www.catalyst-ca.net/blog/level-up-educator-experience-introducing-moodle-5-1). Has a site-level "cohorts" concept separate from per-course groups (https://docs.moodle.org/en/Cohorts; page returned 403 to my fetcher, concept from prior knowledge, not re-verified). Added AI provider integrations (Ollama, DeepSeek) with course-level controls (same Moodle 5.1 sources). | Too heavy to host at $0. Copy the one-page "where am I, what's due, what did I submit" overview. |
| **Canvas LMS** | Ruby on Rails, AGPLv3, same code Instructure runs in production (https://github.com/instructure/canvas-lms, https://github.com/instructure/canvas-lms/wiki/FAQ) | Modules with prerequisites, rubric-based feedback, a calendar that aggregates every course's due dates. | Self-hosting is a multi-service Rails stack; not $0. Copy: the per-cohort calendar feed. |
| **Open edX** (Teak 2025, Ulmo Jan 2026) | Python/Django MOOC platform | Ulmo added "Smart Notifications" for new posts and announcements in-platform and by email, plus anti-spam tools for forums (https://docs.openedx.org/en/latest/community/release_notes/ulmo/ulmo_marketing_notes.html, https://discuss.openedx.org/t/what-s-new-in-ulmo/18637). Forums moved from Ruby to Python (https://openedx.org/blog/discover-the-open-edx-teak-release/). Built-in cohorts that partition discussion by cohort (long-standing feature; not re-verified in 2026 docs). | Far too heavy. Copy: discussion partitioned by cohort. |
| **Sakai** | Java, higher-ed consortium | Mature gradebook; assignments accept inline text, attachments, video, offline, LTI (https://openeducat.org/comparisons/open-source-lms-comparison/, secondary). | Not a fit. |
| **ILIAS** | PHP, European public sector | Privacy-by-design, GDPR-aligned, competency-based learning, full e-exam flow (https://openeducat.org/comparisons/open-source-lms-comparison/, secondary). | Not a fit; competency model is interesting for badges. |
| **Chamilo** | PHP/MySQL, lightweight | Runs on modest hardware (same secondary source). | Still a server. Not a fit. |
| **Forma LMS** | PHP, corporate compliance | Audiences, timed renewals, course report dashboard (same secondary source). | Compliance orientation is the opposite of this course. |
| **GitHub Classroom** | Assignment repos from templates | Was the obvious fit. **Decommissioned 2026-08-28** (https://github.blog/changelog/2026-08-27-github-classroom-deprecated/). Codio and Classroom50 are named successors (https://www.codio.com/blog/extending-github-education, https://www.michaellydeamore.com/blog/classroom50-from-ghclassroom/). | Out. Students use "Use this template" on UniversalAppTemplate directly, which is what the course already does. |
| **Just the Class** (Just the Docs) | Jekyll course template for GitHub Pages | Announcements, course calendar, staff page, weekly schedule, no special plugins (https://github.com/kevinlin1/just-the-class, https://kevinl.info/just-the-class/). | Closest static analog. Needs Jekyll (GitHub Pages builds it), which breaks the site's "no build step, plain HTML" rule only mildly. Copy its information architecture, not its stack. |
| **Carpentries Workbench** | R packages (sandpaper/varnish/pegboard) building lesson sites from Markdown (https://carpentries.github.io/workbench/, https://github.com/carpentries/sandpaper) | Learner view and instructor view of the same lesson; offline use; lesson versioning (https://carpentries.github.io/sandpaper-docs/aio.html). | Requires R; wrong stack. Copy the instructor view idea: each stage page has a "for the teacher" section. |
| **Jupyter Book 2 / MyST** | Released Nov 2025 on the MyST Document Engine (https://blog.jupyterbook.org/posts/2025-11-04-why-make-a-major-release/, https://jupyterbook.org/) | Workshop template for course sites (https://jupyter-book.github.io/workshop-template/a-myst/). | Node build step. Not needed; the path docs are already Markdown on GitHub. |
| **MIT OCW / OpenLearn style** | Open course pages, no accounts for reading | Everything readable without signing in. | Adopt this as a principle: reading the path never needs an account. |

### 1.2 Which features matter for a cohort project course

The course shape (COURSE.md in the template): one app per student, ten
weeks, each week's "Be ready to..." line is the work to bring back, and
each session starts with showing that work to at least two others. That
makes the LMS small: the unit of work is a *stage*, the evidence is a
*link to something a person can look at*, and the assessment is
*conversation*, not points.

### 1.3 Ranked feature list for humanshaped.org

**Must have for launch** (in priority order)

| # | Feature | Where it lives | Why (tied to values) |
|---|---|---|---|
| 1 | **Interest / sign-up form with a privacy note** | Site form posting to the backend (Topic 2); data never in the repo | CLAUDE.md for the site already requires this. Without it there is no course. |
| 2 | **Course pages: the nine stages, readable with no account** | Static pages on the site linking to (or rendered from) `docs/path/` | OCW principle: the method is open. Reading never requires sign-in; no tracking of who reads. |
| 3 | **Cohort schedule + calendar feed** | Static JSON per cohort plus a hand-written `.ics` file per cohort on the site | Several cohorts at once means dates differ per cohort. An `.ics` is a static file, costs nothing, and lands in each student's own calendar. (Canvas calendar feed is the model.) |
| 4 | **Sign in with GitHub** | Backend auth (Topic 2) | Students need GitHub anyway; no email sender, no passwords to hold. |
| 5 | **Enrollment in a cohort** (instructor-approved) | Backend table; Ben adds students | Multiple concurrent cohorts need a cohort id on everything. |
| 6 | **Stage progress: "I brought this back"** | Backend; one row per student per stage, written by the student | Moodle 5.1's overview page, minus grades. The student marks their own progress, which keeps judgment theirs. |
| 7 | **Submission = a link plus one sentence** | Backend row: URL to the live app, screenshot, commit or PR, plus the student's sentence | The course's own rule: "It works" points at something a person can look at. No file hosting (costs, privacy, moderation). |
| 8 | **Announcements** | A static page on the site + an Atom feed file, and the same text posted in the cohort's GitHub Discussions "Announcements" category so GitHub emails it | $0 email delivery: GitHub sends Discussions notifications; the site never holds a mailing list. |
| 9 | **Discussion per cohort** | GitHub Discussions in a **private repo per cohort** in a free GitHub org | Private discussions are visible only to people with repo access (https://docs.github.com/en/discussions/quickstart); GitHub Free orgs allow unlimited private repos and collaborators (https://docs.github.com/en/get-started/learning-about-github/githubs-plans). Building forums yourself is the biggest moderation and spam cost an LMS has. |
| 10 | **Accessibility to WCAG 2.2 AA** | Site CSS/HTML | Not optional for a course about human-shaped software. Static HTML makes this cheapest to get right. |
| 11 | **Student can see, export and delete their own data** | One page + one backend call | Privacy value made concrete; also the cheapest moment to build it is before there is data. |

**Later** (after the first cohort teaches you what is missing)

| Feature | Notes |
|---|---|
| **Peer feedback pairing** ("show it to two others") | A table of who showed whom, written after class. Only if the in-person/online show-and-tell needs help remembering. |
| **Instructor feedback on a submission** | A comment row tied to a submission, visible to that student. At first, feedback happens in the session and in Discussions. |
| **Cohort gallery** of apps, opt-in public | Each student chooses whether their app appears on humanshaped.org. Good for recruiting the next cohort; must be opt-in per student. |
| **Badges per stage, as Open Badges 3.0** | OB 3.0 is a W3C Verifiable Credential with a cryptographic proof, final since June 2024 (https://www.imsglobal.org/spec/ob/v3p0, https://www.imsglobal.org/spec/ob/v3p0/impl). Signing needs a private key in a serverless function, never in the browser. A badge should certify "showed this work to people", not "clicked done". |
| **Instructor dashboard across cohorts** | Read-only view of progress rows; build once there are two cohorts. |
| **Per-stage "for the teacher" notes** | From the Carpentries instructor view; useful once others teach with the template. |
| **Office hours booking** | Use an existing free calendar booking page; do not build. |

**Never** (and why)

| Feature | Why not |
|---|---|
| **Gradebook with points, weights, letter grades** | COURSE.md: "A value is worth what it changed." The course assesses decisions shown to people. Points would teach students to optimise the number. |
| **Auto-graded quizzes** | Nothing in the path is recall. |
| **AI-written feedback on submissions** | Fails the learning-orientation test: it replaces the human judgment the course exists to build, and the template forbids AI-written copy in the product. |
| **Engagement analytics, time-on-page, read tracking** | Site value: no tracking. Progress is what the student says they brought back. |
| **Leaderboards / streaks** | Make people more passive about the work and more anxious about the count. |
| **Hosting uploaded files or video** | Storage and egress kill free tiers (template skill `zero-cost-hosted-backend`), and moderation of uploads is real work. Link out instead. |
| **Building your own forum** | GitHub Discussions already does threading, notifications, moderation, Markdown and accessibility. |
| **SCORM / LTI / xAPI** | Interop with institutional LMSs nobody in this course uses. |
| **Proctoring** | Self-evident. |

### 1.4 What lives in GitHub vs. the site vs. the backend

| Need | GitHub | Site (static) | Backend |
|---|---|---|---|
| Course content (stages) | Source in `docs/path/` on `main` | Rendered pages | none |
| Schedule, `.ics`, announcements archive | | Yes | none |
| Announcements delivered by email | Discussions "Announcements" category (notifications) | Link to it | none |
| Discussion, Q&A, show-and-tell | Discussions in a private per-cohort repo | Link only | none |
| A student's app and code | The student's own repo made from the template | | URL stored |
| Help requests that need tracking | Issues in the cohort repo | | |
| Instructor planning across cohorts | GitHub Projects board | | |
| "One thing someone else changed about it" (week 9) | A PR from a classmate to the student's repo | | URL stored |
| Sign-up, roster, enrollment, progress, submissions | | Forms and views | Yes |

Privacy note on GitHub: in a **public** repo, anything a student writes in
Issues or Discussions is public under their GitHub username, and giscus
requires a public repo (https://giscus.app/). That is why discussion goes
in a private cohort repo, and giscus (comments on public site pages) is at
most a "later" option for public, opt-in commentary.

---

## TOPIC 2. No-cost databases and auth

### 2.1 What the course needs from a backend

Small volume. Rough upper bound: 4 concurrent cohorts x 25 students x 9
stages x a few writes per stage = a few thousand rows per term. Every free
tier below handles that volume. The real discriminators are: **pausing
rules, sign-in options at $0, access control from a static client,
portability, and vendor risk.**

### 2.2 Comparison

| Service | Free tier (verified 2026-10-01) | Pausing / inactivity | Auth at $0 | Access control from a static client | Portability | Vendor risk |
|---|---|---|---|---|---|---|
| **Supabase** | 500 MB DB, 1 GB file storage, 50,000 MAU, 5 GB egress, 500,000 Edge Function invocations, 2 active projects, no automatic backups (https://supabase.com/pricing) | Paused after 1 week of inactivity (https://supabase.com/pricing); restorable from Studio for 1 year, then backup download only (https://supabase.com/docs/guides/platform/upgrading). Activity is measured by API/database traffic, not dashboard visits (secondary: https://tellmewhendown.com/blog/why-supabase-pauses-your-project) | GitHub, Google and other OAuth providers on free (https://supabase.com/pricing, https://supabase.com/docs/guides/auth/social-login/auth-github). Magic link needs custom SMTP: default sender is 2 emails/hour, team addresses only (https://supabase.com/docs/guides/auth/auth-smtp) | **Postgres row-level security** with `auth.uid()`. Pitfall: new public tables get grants for `anon`, and policies do not remove grants; revoke explicitly (https://supabase.com/docs/guides/database/postgres/row-level-security) | Plain Postgres; `pg_dump` | Well funded, open source (self-hostable). Ben already uses it (template skill `zero-cost-hosted-backend`), and a Supabase MCP is connected in his Claude setup. |
| **Firebase** (Firestore + Auth, Spark) | Firestore 1 GiB, 50K reads/day, 20K writes/day, 20K deletes/day; Auth 50K MAU (https://firebase.google.com/pricing) | Spark quotas shut off service when exceeded rather than billing (https://firebase.google.com/docs/projects/billing/firebase-pricing-plans). No inactivity pause found. | GitHub and Google providers; **email-link sign-in limited to 5 emails/day on Spark** (https://firebase.google.com/docs/auth/limits) | Firestore Security Rules (good, but a separate rules language) | Export is NoSQL JSON; harder to move | Google. No new Cloud Functions on Spark (https://firebase.google.com/docs/projects/billing/firebase-pricing-plans). Not open source. |
| **Cloudflare D1 + Workers** | Workers: 100,000 requests/day, 10 ms CPU/invocation (https://developers.cloudflare.com/workers/platform/pricing/). D1: 5M rows read/day, 100K rows written/day, 5 GB total (https://developers.cloudflare.com/d1/platform/pricing/); 10 databases, 500 MB each, 50 queries per invocation, 7-day Time Travel (https://developers.cloudflare.com/d1/platform/limits/) | No inactivity pause found in docs | No built-in user auth. GitHub OAuth must be written in the Worker (the client secret lives there). Email sending from Workers needs the $5 paid plan except to verified addresses (https://developers.cloudflare.com/email-service/platform/pricing/; secondary summary https://www.sequenzy.com/versus/cloudflare-email-vs-resend). Cloudflare Access free for up to 50 users (secondary: https://costbench.com/software/business-vpn/cloudflare-zero-trust/free-plan/; official page did not state it) | **No RLS**: every access rule is Worker code. More to get wrong, but easy to read. | SQLite; `wrangler d1 export` | Low. EU jurisdiction option, set only at creation (https://developers.cloudflare.com/d1/configuration/data-location/). Cloudflare MCP connected in Ben's setup. |
| **Turso** | 100 databases, 5 GB, 500M rows read, 10M rows written per month (https://turso.tech/pricing) | Free DBs archived after 10 days of inactivity per older docs (https://docs.turso.tech/cli/group/unarchive); Turso says cold starts are gone (https://turso.tech/blog/turso-cloud-debuts-the-new-developer-plan). Current archiving rule not confirmed. | None built in | None from a browser; needs a server/Worker in front | SQLite | Free quota was cut this year (secondary: https://www.budgetforge.dev/tools/turso-pricing-2026). |
| **Neon** | 1 GB per project, 20 GB account, 100 CU-hours per project, 5 GB egress; writes blocked (not deleted) at limits (https://neon.com/pricing) | Compute scales to zero after 5 minutes (cold start), cannot be disabled; data is kept (https://neon.com/pricing) | Neon Auth (managed Better Auth), up to 60K MAU on free (https://neon.com/pricing, https://neon.com/docs/auth/authentication-flow) | Data API (PostgREST) honours Postgres RLS (https://neon.com/docs/data-api/overview, https://neon.com/docs/data-api/access-control) | Plain Postgres | Owned by Databricks (prior knowledge, not re-verified). Auth + Data API are newer than Supabase's equivalents. A credible Supabase alternative without the 7-day pause. |
| **PocketBase** | Free software, single binary, SQLite, pre-1.0 (v0.40.x), volunteer-run with "no promises for maintenance and support" (https://pocketbase.io/faq/) | Depends on host. PocketBase Cloud (unaffiliated third party) free: 1 instance, 50 MB disk, $0 Stripe subscription required (https://pocketbasecloud.com/docs/platform/pocketbase-cloud-vs-pockethost/). PocketHost: trial, not free (https://pockethost.io/docs/limits, secondary) | Built-in OAuth (incl. GitHub) and email | API rules per collection (row-level filters) | SQLite file | Self-host means Ben runs a server; no honest $0 host found. Not recommended for launch. |
| **Appwrite Cloud** | 2 projects, 5 GB bandwidth, 2 GB storage, 75K MAU, 1 database, 2 functions per project (secondary: https://agentdeals.dev/vendor/appwrite-cloud; function cut to 2 confirmed at https://appwrite.io/changelog/entry/2026-01-08) | Paused after 7 days without "development activity in the Console" (https://appwrite.io/changelog/entry/2026-02-20-1). Worse than Supabase: activity is defined as console use, not traffic. | OAuth, magic link | Document-level permissions | Export via CLI | Pausing rule tied to console activity is a poor fit for a site that runs between cohorts. |
| **Convex** | 1M function calls, 0.5 GB DB, 1 GB files, 1 GB egress, 1–6 developers (https://www.convex.dev/pricing) | Idle deployments (no calls for 30 days) have fees waived; no auto-pause of free found (https://docs.convex.dev/production/state/limits, secondary) | Convex Auth (prior knowledge, not re-verified) | Access checks in server functions | Proprietary data model; export exists | Reactive TypeScript backend; needs a build/deploy step. Over-built for this. |
| **InstantDB** | Cloud closing 2027-08-31, sign-ups closed (https://www.instantdb.com/essays/instant_team_joins_openai) | | | | | **Ruled out.** |
| **Xata** | No managed free tier (secondary: https://agentdeals.dev/vendor/xata) | | | | | **Ruled out.** |
| **Airtable** | 1,000 records per base, 1,000 API calls per workspace per month, 5 editors (https://support.airtable.com/docs/airtable-plans) | | No end-user auth | API key cannot be exposed in a browser; needs a proxy | CSV | 1,000 API calls/month is too few for live progress. Fine as an admin view only. |
| **Google Sheets** | 300 read and 300 write requests per minute per project, 60 per user (https://developers.google.com/workspace/sheets/api/limits) | | Google only | No row-level security | CSV | Workable for a sign-up form via Google Forms, but student data then lives in Ben's Google account with no per-row access. Fine as a stopgap for interest sign-ups only. |
| **GitHub as the database** | Private cohort repo: Discussions, Issues, Projects; unlimited private repos and collaborators on GitHub Free orgs (https://docs.github.com/en/get-started/learning-about-github/githubs-plans) | None | GitHub OAuth, but a browser cannot complete it alone: GitHub added PKCE in July 2025 (https://github.blog/changelog/2025-07-14-pkce-support-for-oauth-and-github-app-authentication/) yet the web flow still requires the client secret and token endpoints lack CORS (https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps; secondary analysis in search results). A small Worker or Supabase must do the exchange. | Repo permissions only; no per-row privacy inside a repo | Git + API | Excellent for discussion and announcements; poor for progress tables or anything private between student and teacher. giscus: data in Discussions, no tracking, needs a public repo (https://giscus.app/). |
| **Netlify Functions** | Free plan is "300 credit limit" (https://www.netlify.com/pricing/); what happens on overage not stated on the page | | | | | Adds a second host beside GitHub Pages for no gain over a Worker. |
| **Vercel Functions** | Hobby: 1M invocations, 4 hours active CPU (https://vercel.com/docs/limits/fair-use-guidelines) | | | | | **Non-commercial only** (same source). Out if the course charges. |

Email for magic links, if wanted: Resend free is 3,000 emails/month, 100
per day, 3 domains (https://resend.com/pricing). Enough for a cohort, and
it plugs into Supabase as custom SMTP.

### 2.3 Modelling several cohorts at once (multi-tenancy)

One database, one `cohort_id` on every cohort-scoped row, and access rules
that join through `enrollments`. Do not create a database or project per
cohort: Supabase allows 2 active free projects (https://supabase.com/pricing)
and D1 allows 10 databases (https://developers.cloudflare.com/d1/platform/limits/),
and both would multiply migrations. A student in two cohorts (a repeat
taker, or a student who becomes a mentor) is just two enrollment rows with
different roles.

### 2.4 Recommendation

**Primary: Supabase (Postgres + Auth + RLS), Sign in with GitHub, static
site calls it with supabase-js from a CDN.**

- Why: auth is built in, so there is no OAuth code to write before launch;
  RLS lets the static site talk to the database directly with the
  publishable key, and the access rules are declarative and testable; it
  is plain Postgres, so the data leaves with one `pg_dump`; it matches the
  template's own `zero-cost-hosted-backend` skill, so the course's backend
  is an example of the method it teaches; Ben's agent already has a
  Supabase MCP.
- The pause: a live cohort generates traffic daily, so pausing only matters
  between cohorts. Options, in order: (a) accept it and restore before the
  next cohort (1-year restore window); (b) a weekly GitHub Actions job that
  runs one real read. Option (b) is common practice but works around the
  vendor's intent; I would choose (a) and say so in DECISIONS.md.
- The sign-up form for people who are not yet students (no GitHub needed):
  an `interest` table with an insert-only RLS policy for `anon` and
  Cloudflare Turnstile or a honeypot against spam. Insert-only means the
  public key can add a row but never read one.
- Email: only if magic link is wanted; add Resend as custom SMTP.
- Region: pick at project creation (US or EU) and write the choice in the
  privacy note.
- Spend Supabase's second free project slot carefully: if Ben already runs
  two active free projects for other apps, this one will not fit. (Open
  question below.)

**Fallback: Cloudflare D1 + one Worker, GitHub OAuth done in the Worker,
a signed session cookie.**

- Why: no inactivity pause; 100,000 requests/day is far beyond need;
  SQLite export is one command; EU jurisdiction available; Ben knows
  Workers.
- Cost: every access rule is hand-written in the Worker, and OAuth plus
  sessions is a few hundred lines that must be right. That is more surface
  to get wrong in two weeks, which is why it is the fallback.
- Note: Ben said he may not want Cloudflare for database work; Neon (Auth
  + Data API + RLS, no long pause) is the closest drop-in alternative to
  Supabase if both Supabase and D1 are rejected.

**Not recommended:** Firebase (5 magic-link emails/day, NoSQL rules
language, no functions on free), Appwrite (pauses on console inactivity),
PocketBase (needs a host; no honest $0), Airtable/Sheets (no per-row
privacy), InstantDB and Xata (shutting down / no free tier), Vercel (no
commercial use).

### 2.5 Minimal schema sketch (Postgres / Supabase)

```sql
-- People. id = auth.users.id. GitHub login comes from the OAuth identity.
profiles (
  id            uuid primary key references auth.users on delete cascade,
  display_name  text not null,          -- what classmates see; student chooses
  github_login  text,
  created_at    timestamptz default now()
)
-- Email stays in auth.users only; never copied into a readable table.

cohorts (
  id          text primary key,         -- '2026-fall-a'
  title       text not null,
  starts_on   date not null,
  ends_on     date not null,
  discussion_url text,                  -- the private cohort repo's Discussions
  status      text check (status in ('planned','open','running','closed'))
)

enrollments (
  cohort_id  text references cohorts on delete cascade,
  user_id    uuid references profiles on delete cascade,
  role       text check (role in ('student','mentor','teacher')),
  status     text check (status in ('invited','active','withdrawn','completed')),
  primary key (cohort_id, user_id)
)

stages (                                -- static reference data, 9 rows
  id     text primary key,              -- '00'..'08'
  title  text not null,
  week   int[]                          -- e.g. {4,5} for stage 03
)

stage_progress (
  cohort_id   text,
  user_id     uuid,
  stage_id    text references stages,
  state       text check (state in ('started','brought_back')),
  updated_at  timestamptz default now(),
  primary key (cohort_id, user_id, stage_id),
  foreign key (cohort_id, user_id) references enrollments on delete cascade
)

submissions (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   text,
  user_id     uuid,
  stage_id    text references stages,
  url         text not null,            -- live app, screenshot, commit, PR
  note        text,                     -- the student's own sentence
  visibility  text check (visibility in ('teacher','cohort','public')) default 'cohort',
  created_at  timestamptz default now(),
  foreign key (cohort_id, user_id) references enrollments on delete cascade
)

badges (                                -- definitions
  id text primary key, stage_id text references stages,
  title text, criteria text             -- "showed X to two people", not "clicked done"
)

awards (
  badge_id   text references badges,
  user_id    uuid references profiles on delete cascade,
  cohort_id  text references cohorts,
  awarded_by uuid references profiles,  -- a teacher; never self-awarded
  evidence_submission uuid references submissions on delete set null,
  awarded_at timestamptz default now(),
  primary key (badge_id, user_id, cohort_id)
)

interest (                              -- pre-enrollment sign-ups, no account
  id uuid primary key default gen_random_uuid(),
  name text, email text, why text,
  created_at timestamptz default now()
)
```

Access rules (RLS; revoke default grants from `anon` on every table first,
per https://supabase.com/docs/guides/database/postgres/row-level-security):

| Table | Read | Write |
|---|---|---|
| `profiles` | Self; and anyone sharing an active enrollment in the same cohort | Self only |
| `cohorts`, `stages`, `badges` | Everyone (public reference data) | Teacher role only (or service key from Ben's admin tool) |
| `enrollments` | Self; classmates in the same cohort (roster); teachers of that cohort | Teacher of that cohort only |
| `stage_progress` | Self; teachers of that cohort. Classmates: not by default | Self only (insert/update own rows, own active enrollment) |
| `submissions` | Self; teacher of the cohort; cohort members when `visibility in ('cohort','public')`; `anon` when `public` | Self only; teacher may not edit a student's words |
| `awards` | Self; cohort; public if the student opts in | Teacher of that cohort only |
| `interest` | Nobody via the API (Ben reads it in the dashboard) | `anon` insert only |

Helper: a `security definer` function `is_member(cohort, role)` that checks
`enrollments` for `auth.uid()`, used by every policy, so the cohort rule
lives in one place.

For the D1 fallback the same tables apply (SQLite types), and the table
above becomes `if` checks in the Worker before each query.

---

## Open questions for Ben

1. **Is the course paid?** If yes: Vercel Hobby is excluded, and payment
   should go through a hosted checkout outside the LMS. It also decides
   whether the sign-up form is "interest" or "enrollment".
2. **How many active Supabase free projects do you already have?** The
   limit is 2 (https://supabase.com/pricing). If both are used, either
   pause one, use Neon, or take the D1 fallback.
3. **Is requiring a GitHub account at enrollment acceptable?** It is needed
   for the course anyway, but it means the very first step of the course is
   a GitHub sign-up. Interest sign-ups would still need no account.
4. **Where does discussion happen: GitHub Discussions in a private repo per
   cohort, or somewhere you already run (Discord, Slack, Zoom chat)?** The
   notes assume GitHub, for $0 notifications and because students live
   there all course.
5. **What is "cohort-visible" by default?** Should classmates see each
   other's progress, or only submissions the student shares? The schema
   defaults to: roster and shared submissions visible, progress private.
6. **Data residency:** US or EU region? Any students outside the US who
   would expect GDPR language in the privacy note?
7. **Retention:** how long after a cohort ends do you keep student rows,
   and is "delete my data" a button or an email to you?
8. **Badges at launch or later?** Recommendation is later, issued by you
   after the show-and-tell, and only if they mean "showed this to people".
9. **The "no build step" rule vs. rendering `docs/path/` on the site:**
   link to the Markdown on GitHub at launch, or hand-convert stage pages to
   HTML? (A build step such as Just the Class/Jekyll would break the site's
   current rule.)
10. **Is Cloudflare still acceptable as the fallback**, given you said you
    may not want it for database work? If not, Neon is the fallback.

## Things I could not verify

- Moodle cohorts page returned 403; the cohort concept is from prior
  knowledge.
- Open edX cohort-partitioned discussions: not re-verified in 2026 docs.
- Xata, Appwrite free limits, Cloudflare Access 50-user free tier, Turso
  archiving rule, Convex idle policy: from secondary sources or partially
  official pages, as marked.
- Netlify free-plan overage behaviour and commercial-use terms: not stated
  on the pricing page.
- Whether supabase-js's browser OAuth flow needs any server piece on a pure
  static site: Supabase docs now recommend server-side PKCE with cookies
  (https://supabase.com/docs/guides/auth/social-login/auth-github); the
  browser client has historically worked from static pages with
  localStorage sessions. Prove it with a one-page prototype on the `site`
  branch before committing to it.
