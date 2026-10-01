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

- Plain HTML and CSS, no framework, no build step. `styles.css` holds
  the tokens in `:root` with a dark-mode override.
- Mobile-first, `min-width` media queries, test at 375px before 1440px.
- Accessible contrast: text on the orange `--color-primary` is dark.

## Sign-ups (not built yet)

The sign-up backend is undecided. Whatever is chosen: student names,
emails and any keys never go in this repository (it is public). Keep the
data in the sign-up service, and add a short privacy note beside the
form.
