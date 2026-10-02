# humanshaped.org decisions

Ben's answers of October 2, 2026, to the launch questions in
`research/README.md`, recorded as rules. `VISION.md` is the why; this
page is the what. Each entry leads with the rule.

## The system, not the first cohort

**A cohort is content, created by a teacher in the hub.** It has
classes (sessions), members, groups, and metadata (dates, time zone,
session length, size, status). Nothing about cohort 1 is hard-coded.
**Why:** Ben wants the system adaptable from the first day. **How to
apply:** every cohort detail is data a teacher edits, never a constant.

## Who it is for

**Adult creators who have never built an app** and want to solve
human-shaped problems. School-aged cohorts are possible later, not the
target. **How to apply:** write for adults new to building; no minors'
flows at launch.

## AI tools

**Students bring their own AI.** Each student invests in whatever lets
an agent work on their GitHub repository, from local models to Claude or
Gemini subscriptions. The course shows the cheapest workable ways and
never requires one vendor. OpenAI is not recommended.

## Community

**One `humanshaped` GitHub organization holds all conversation.**
Cohort conversations are private to the cohort by default; a cohort may
choose to open them.

**No covenant.** Ben, October 2: a covenant is "incredibly heavyweight
for something that we are trying to keep light and adaptable." How we
treat one another rests on the principles and on Ben's Educational Model
Spec (https://github.com/bhwilkoff/educational-model-spec), said plainly
where people meet, not in a code of conduct.

**The organization exists:** github.com/humanshaped, contact
Ben's own address.

**Teachers:** Ben only at launch, then people he invites. A request form
comes later.

**Groups:** pairs, trios or small groups, easy to change, and visible to
the students: each person knows their partners and what the partnership
expects.

**Visibility inside a cohort:** classmates see each other's
repositories and their commits and progress from inside the portal, the
upcoming meetings, and the current week's scope of work.

**Alumni:** the credential gives access to finished cohorts (not live
ones) and makes the holder eligible to mentor newcomers.

## Data

**Students own their data, on GitHub.** The hub owns only what students
choose to share while in a cohort. After someone leaves, the hub owns
nothing of theirs, and never owns their software. Storage is in the US.
**How to apply:** read from GitHub with the student's permission rather
than copying; store only membership and what was shared; leaving removes
it.

**Database:** Supabase (Ben's one existing project is BOBA, so there is
room). Cloudflare Workers for anything Supabase cannot do, and as the
fallback.

## Live sessions

**meet@humanshaped.org is the service account for every system.**
humanshaped.org is a secondary domain on Ben's Google Workspace for
Education, and meet@ is its own account, separate from Ben's, so nothing
depends on his personal login. It hosts every session. Build a tool for
creating the events and checking they work; Ben will grant Google admin
access where settings need it.

**Sessions are recorded by our own tool, at $0,** and stored on Google
Drive, always available to the cohort's members. Meet's built-in
recording needs a paid license on this edition, so it is out. **Why:**
"the goal is for this to cost $0 in ongoing costs." **How to apply:**
never propose a paid seat or license; find the $0 path.

**Checks for understanding in every live session,** and frequent
discussion or demonstration points throughout the coursework, on the
site and in the template.

**"Explain it back" is about decisions, not code.**

## The directory and the declaration

**The directory.** Apps built in a cohort are included automatically.
Apps whose repository was made from the template are automatically
considered. Only people who did not use the template but build by the
principles apply. Ben curates the directory himself, so there are no
rules for policing it.

**Declaring software human-shaped means meeting a set of specific
principles,** as Value Based Engineering does, drafted from what the
template has learned, the Educational Model Spec, and the template
itself.

**The event toolkit is for meetups and Human-Shaped Hackathons:**
resources to lead conversations or present with the principles front and
center. It needs strong branding, a logo, and well-crafted language.

## Publishing

**No publishing under a shared account.** Out of scope: people publish
for themselves once they can. The course supports web publishing on
GitHub Pages (and related tools), signing up for the app stores, and
sideloading.

## Design and content

**Explore several site designs.** Polished, and free of every
AI-design habit: it should feel hand-drawn, not algorithmic, and invite
people before it serves machines.

**The site and the template cannot drift.** The site is the visual,
highly polished version of the template's information, extending it for
people who use web pages rather than GitHub.

**Diagrams are designed for people who are not technical.** Ben will
record sessions that show what human-shaped development looks like.

**"Computer-shaped problems" is the movement's shorthand,** credited to
the Bluesky post that started it
(https://bsky.app/profile/mosheroperandi.bsky.social/post/3mgasswgabs23).
The vision runs through the template and the hub.

**The case for the method must be made plainly:** why building this way
is different from, and better than, asking an AI to make you an app.
Archive Watch's public history is a case study. Readers will not know
Ben's apps, so every example carries its context.

**The showcase:** Archive Watch, Tidbits Trivia (including Windows, live
in the Microsoft Store) and Bsky Dreams are current and maintained. BOBA
Playbook is not in active development and stands as the proof point for
large databases, huge numbers of files, camera scanning, 3D on iOS, and
pricing models.

**GitHub skills are taught throughout the cohort.** No "merge as the
ship moment" framing.

## The credential

**Issued from cohort 1 onward. The evidence is the repository.** A web
app pushed live is enough for the credential. Each additional platform
the app is published on adds a level.

## Review on production

**Push to GitHub freely.** Ben, October 2: "I prefer to let things get
reviewed on production, as no one is aware of the domain purchase or
this website yet."

## Scope of change

Ben, October 2: "You can make whatever changes are necessary to get us
up and running with an incredible universal app template and a hub
website at humanshaped.org in order to get people on board with the
Human Shaped movement."
