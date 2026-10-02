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
- Approval screens when creating the Supabase project and the GitHub
  OAuth app.
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
