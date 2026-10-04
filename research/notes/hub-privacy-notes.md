# Cohort apps in public: a proposal

*Written 2026-10-03 for milestone M1 ("the hub as a hub"), before any
page reads cohort data in public. Not reviewed by Ben. It proposes one
narrow change to the database (migration
`20261003055000_public_apps.sql`) and says what the public
pages do until Ben decides.*

## What is already decided

- **The directory.** "Apps built in a cohort are included
  automatically" (`DECISIONS.md`).
- **Students own their data, on GitHub.** The hub "owns only what
  students choose to share while in a cohort", and after someone leaves
  it owns nothing of theirs.
- **Conversation is private to the cohort by default,** and a cohort
  may choose to open it.
- **The research,** for the showcase: "Students write their own entries
  later, opt in, and choose what to show" (`research/README.md`, 11).

Today, who is in a cohort is visible only inside it: `enrollments` can
be read by the person, their classmates, and their teachers, and the
public (the `anon` role) reads none of it. The policy tests check that
someone outside the cohort sees no roster.

## The tension

"Included automatically" and "only what students choose to share" pull
in different directions. A public repository is already public on
GitHub, and yet saying in public that a particular GitHub account is in
a Human Shaped cohort is a new fact the hub would be publishing about a
person. Someone may be happy to build in the open and still not want
their name tied to a course, an employer may be watching, or the app
may be a private matter that happens to live in a public repository.

So I read "automatically" as "without having to apply or wait for Ben",
not "without asking the student".

## The proposal: the student's own switch

One column, `enrollments.app_public`, false by default. On `/cohort/`,
under "Your app", the student sees a checkbox to show their app on
humanshaped.org/apps/, with a sentence saying what that publishes.

- **Only the student can turn it on.** A trigger refuses the change
  from anyone else, teachers included. A teacher, or Ben, can turn it
  off (moderation, or a student who asks by email), and never back on.
- **Leaving turns it off.** When the status becomes `left`, the trigger
  sets it back to false, alongside `leave_cohort` already clearing the
  app's name, repository, and address.
- **The public reads three fields and nothing else.** A function,
  `public.public_apps()`, returns the app's name, its repository, and
  its address for every shown app in a cohort that is not a draft. It
  does not return the cohort, the person's name, their GitHub profile,
  when they joined, or anything they shared. `enrollments` stays closed
  to the public, so the roster is still private.
- **An agent cannot turn it on,** because migration 6 already makes
  every agent token read-only.

On the public pages, a shown app is labeled "being built in a cohort",
with no cohort named. Its page reads everything else (commits, the
declaration, the repository's description) live from GitHub, so a
private or deleted repository simply says so.

## What it costs

- **A second way into the public list.** Shown cohort apps skip Ben's
  curation, which is what "included automatically" asks for, but it
  means a student could show something that does not belong. The
  answer is the off switch above, which teachers and Ben hold.
- **One more function the public can call.** Supabase's security check
  will list `public_apps` beside `leave_cohort` and `delete_my_account`
  as callable on purpose. It is read-only and returns three fields.
- **The repository's owner is visible.** `owner/repo` names a GitHub
  account. That is the point of showing a repository, and the student
  has chosen it, but the checkbox says so plainly.

## The alternatives

1. **Nothing in public from the hub; the directory only.** Ben adds a
   listing file (status `cohort`) to github.com/humanshaped/directory
   for each student who asks. No migration, and Ben sees every listing,
   but it is slower, it depends on Ben's time, and the student has no
   switch of their own to take it down.
2. **The directory's nightly scan.** Template-born public repositories
   already show up in `candidates.json`. That finds apps whether or not
   their builder is in a cohort, says nothing about cohorts, and still
   waits on Ben to list them. It is the right path for people outside a
   cohort and does not need changing.
3. **Everything public by default, with an opt-out.** Closest to the
   literal word "automatically", and the one I would not choose,
   because it publishes a fact about a person before they have read
   what it means.

## Until Ben decides

The public pages (`/apps/`, `/apps/app/`, and the home page's feed) read
only `directory.json` and GitHub, plus `public_apps()` when it exists.
Before the migration is applied, that call fails quietly and nothing
from the hub appears. The checkbox on `/cohort/` stays hidden until the
column exists. An app page is drawn only for repositories in the
directory or shown by their student, so `/apps/app/?r=` cannot dress an
arbitrary repository in the site's name.

## Checks

`supabase/tests/test_policies.py` gains nine checks for this rule (the
public sees nothing until a student shows their app, the roster stays
private, a teacher, a classmate, and an agent cannot turn it on, the
student can, the public reads exactly three fields, a teacher can turn
it off, and leaving turns it off).

## After Ben's decision (October 3, 2026)

Ben settled both open questions: the student opts in "when they say that
the app is ready", every student submits by the end of the cohort, and a
teacher can keep an app out of public view while it stays part of the
cohort. Migration `20261003090000_app_submissions.sql` builds that.

- **Two switches, never crossed.** `app_public` is the student's "it is
  ready", and only the student moves it, in either direction (until now
  a teacher could turn it off). A teacher's hide is a row in
  `app_hides`, so hiding an app never makes a student look as if they
  had not submitted.
- **Why a table of its own.** Classmates can read every column of one
  another's enrollment, and a teacher's reason for hiding an app is
  between the teacher and the student. The student and the cohort's
  teachers read it; nobody else does, and no student or agent can write
  it.
- **Near the end, not all along.** The cohort page tells a student what
  their app still needs only from the second-to-last session (week 4,
  where the course has the app on someone else's device), and the
  teacher sees who has not submitted, by name, from the same day. It is
  one note and one list, with no reminders, counts, or streaks, in line
  with the "never build" list in
  `facilitation-assessment-social-learning-notes.md`.
- **Leaving** takes the hide with it, as it already takes the app's name,
  repository, and address.

The database checks gain 23 for this (171 to 194).

## Apps outside a cohort (October 4, 2026)

*Written by Claude, awaiting Ben's review.* VISION.md asks the hub to be
"a digital hub for anyone building software for people instead of
profit", with "many different entry points." Until now an app reached
the hub in two ways only: a cohort enrollment, where a teacher stands
beside the student, or the directory's "Ask to list my app" issue form,
which Ben reads himself before a listing goes in. Someone building on
their own, with no cohort running, had neither a teacher nor a place.
Migration `20261004010000_builder_apps.sql` gives them one, built from
the same two switches as cohort apps.

**Who can show what.**

- **The builder's own switch.** A signed-in person keeps one app of
  their own in `builder_apps`: its repository, a name, and where it runs.
  It is private until they turn on "Show it on the apps page," and only
  they can move that switch, either way. One app each keeps the account
  page simple; a builder with several can list the rest through the
  directory.
- **What the public sees** is exactly what it sees of a cohort app: the
  name, the repository, and the address, through `public_apps()`, which
  now also says whether each app comes from a cohort or from its builder,
  so /apps/ can say "Shown here by the person building it" rather than
  claim a cohort or a review that did not happen. Nothing names the
  person; the public cannot read `builder_apps` at all.
- **A cohort app wins.** If the same repository is both, /apps/ lists it
  once, as the cohort's, since that is the one a teacher has seen.

**Moderation without a teacher.**

- **Who decides.** With no teacher, the hide belongs to the people who
  already decide who teaches here: teachers with `can_approve` (Ben
  first). They can read builders' apps that are shown, and only those,
  so they can hide one; they never see an app its builder kept private.
- **The hide is its own row** (`builder_app_hides`), as with `app_hides`,
  so taking an app off the page never moves the builder's switch, and the
  builder always sees on their account page that it is hidden and why.
  Only an approver writes it, in their own name, and no AI agent can.
- **Anyone can say something is wrong.** A builder's app page carries one
  line, "tell us in the open directory," which opens a new issue in
  github.com/humanshaped/directory with only the app named. The directory
  is already where Ben reads listings, so reports land beside them, in
  the open, where the builder can answer too. Cohort apps and directory
  listings do not carry the line: their teachers and their listing are
  already the way to raise it.
- **Not built, on purpose:** a reporting form that collects anything
  about the person reporting, automatic hiding after some number of
  reports (a pile-on could take down anyone's work), and any review
  before a builder's app appears. The trade is the same one the open
  directory makes: shown first, and taken down by a person who has read
  why, with the reason given to the builder.

**For the builder's own agent.** The hub's MCP server has a `my_app` tool,
and `my_work` answers with it for someone in no cohort, instead of only
saying they are not in one: their app, whether it shows and why not, and
their own marks on the path. It says plainly that there is no teacher, so
the agent asks the method's questions and labels its feedback as an AI's.

The database checks gain 22 for this.
