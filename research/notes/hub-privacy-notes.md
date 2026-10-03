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
