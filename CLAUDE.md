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
  Never merge `site` into `main` or `main` into `site`, and never add
  anything about this site to `main`.

## What the site is about

The method and the course live in the template. Read these before
writing copy:

- `../UniversalAppTemplate/docs/path/00-why-we-build.md`: human-shaped
  software, learning three ways (student, builder, human), and the
  three moves (write it down, prove it, live with it).
- `../UniversalAppTemplate/COURSE.md`: the shape of the course.
- `../UniversalAppTemplate/docs/research/values-based-approaches.md`:
  where the ideas came from.

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
