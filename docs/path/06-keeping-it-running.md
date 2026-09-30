# 06. Keeping it running

**Where you are.** Your app is in a store. Strangers can install it, and
you can no longer see everything that happens to it by using it
yourself.

On September 14, 2026, five days after Archive Watch's dashboard went
live, I sent the agent this:

> No macOS or Roku items on Reach ... I also don't see the 'estate'
> information on the Overview pulling correctly for multiple platforms.

Two things were wrong, and one of them was the worst thing a dashboard
can do. The Mac had been reading zero because Apple reports Mac sales
under a different family of product codes, and nothing had told the
collector about them. The Roku was worse. Its reports arrive on four
different schedules, and only one of them carries installs. On a day
when a different report arrived alone, the code read the missing column
as zero and drew a flat line for four days: a platform with 112 installs
reported as having none.

**A confident zero is worse than no dashboard.**

It reads as news, maybe bad news, but believable. Nobody checks it
again. A blank that says "I could not read Roku today" gets checked the
same morning.

## What I want

Once an app is in folks' hands, I want to know how it is doing without
opening nine store consoles, and I want to trust what I read. I want
the problems to come to me: a crash with a fix already written, a
two-star review nobody has answered, a build that failed overnight. And
I want the good news too, because a list of only problems is a hard
thing to open every morning.

## Pulse

`pulse/` is that page, and `tools/pulse_collect.py` is what fills it.
Once a day, a GitHub Actions workflow reads every channel the app has:

- the stores (App Store Connect, Google Play, the Amazon Appstore,
  Roku): submissions, versions, ratings, reviews, downloads, installs,
  crash clusters.
- search (Google Search Console): what people type to find the app, and
  which pages Google cannot index.
- the app's own server, if it has one: small daily counts of things
  like visits, never tied to a person.
- the open web: posts about the app, and replies to its own posts.
- the CI fleet: which workflows failed, and which ones stopped doing
  their job while staying green.

It writes one file, `ops/pulse.json`, and the page draws it. The page
opens on two lists, **Needs attention** and **Going well**, and each
item opens a drawer with every fact behind it.

The history of how it got that way is short and a little humbling. It
started on September 9 with 23 readers. Its first run in CI found three
bugs, one of them counting Archive Watch's own posts as mentions of
itself. Within a week it had a rule against drawing zeros, a guard that
refuses to save a reading when a third of its readers are dark, and one
view per audience instead of one view for everyone. By September 25 it
had been redesigned around the two lists. The full story, with every
commit, is in `docs/PRODUCT-PULSE.md`.

## The rules Pulse lives by

These came from real mornings, and each has a test.

- **A reader that cannot read says so.** Every source is read on its
  own. If it fails, the failure is written into the reading and shown
  on the page. A missing column is empty, never zero.
- **Not configured is its own state.** A store you have not set up yet
  is "not configured", not "broken", and it does not count against the
  day's reading.
- **Refuse a bad day rather than save it.** If a third or more of the
  configured readers are dark, the collector will not write. Yesterday's
  good reading stays up.
- **Count only what servers and stores already see.** Archive Watch
  never added a tracking ping to the app. The counts come from the
  stores, the web host, and a tally the server was already keeping.
- **Wait for the stores.** Google Play's install numbers arrive up to
  two weeks late. The alarm waits for the measured delay, not a guess.

## The CI fleet

Pulse watches the app. Something also has to watch the machinery.

On September 8, the agent found that Archive Watch's catalog had not
published since September 6. One step in the publishing workflow ran a
command that needed a GitHub token and did not have one. And the
auditor that was supposed to catch a broken workflow had been told to
skip that workflow entirely, so it said nothing for two days.

`docs/CI-FLEET.md` carries what came out of that, and out of running
fifty workflows for one app:

- **A green run must have done something.** The health auditor
  (`tools/audit_workflow_health.py`) checks that each workflow actually
  produced what it exists to produce, not just that it exited cleanly.
- **A red X means this run could not do its job.** Reporters, like
  Pulse and the auditor itself, never fail because of what they found.
  They write it down. Findings go to one issue that closes itself when
  the problem is gone.
- **Gates are checked by a script.** `tools/check_workflow_gates.py`
  refuses a reporter that can fail on its findings, and any step that
  calls GitHub without a token in scope. That second check is the
  September 6 bug.
- **No run may destroy work.** Writers take a lock, publish what they
  finished before a time limit, and never replace an artifact with a
  smaller one.

The guardian workflows ship switched off. Ask the agent to turn them
on once your app has scheduled work worth guarding.

## Loops

This template was reorganized by a loop: an agent working in timed
ticks, reading its own plan at the start of each one, doing the next
thing, and writing down what it did. Archive Watch ran loops like this
for days. `docs/AUTONOMOUS-LOOPS.md` holds the discipline that made
them safe:

- The agent is never the tester (stage 04).
- "Verified" and "merely fixed" are different words in the session log.
- The files every session loads stay small. Old decisions and old
  session logs roll into archives, word for word, instead of being
  summarized.
- The loop reads its own plan and runbooks before inventing a new way
  to do something.

## What it costs

Pulse needs a key from every store it reads, and each store hands them
out differently. The agent knows the way to each one
(`docs/PRODUCT-PULSE.md`), but only you can log in and create them.
Until you do, the page is honest and mostly empty.

The CI fleet costs attention. Every scheduled workflow is one more thing
that can fail quietly. Add one only when the work it does is worth
watching.

## Working with your agent

1. **Ask for one page.** Tell the agent what you want to be able to see
   without opening a single store console. On September 9, this is how
   I asked for Archive Watch's:

   > a single place for me to go in order to understand what our users
   > are enjoying or requesting of the app AND to understand the
   > performance of the various platform's apps.

   It sets up Pulse, fills in your app's identity, and tells you which
   accounts it needs a key from. Do the key steps the way you did in
   stage 05.

2. **Read the page, not the stores.** Open Pulse each morning for a
   week, and ask the agent to act on what it shows. The first day
   Archive Watch's Pulse was live:

   > Can you use this page to identify all of the crashes and other
   > issues that need to be addressed. Additionally, all reviews that
   > have been responded to should not show up under the 'needs you'
   > section.

   Two weeks later, after it had been redesigned around a "Needs
   attention" list:

   > Take a look at 'Needs Attention' section of the Archive Watch Pulse
   > and see what you can directly address and solve for?

   When something looks wrong or missing, say what you see, the way the
   story at the top of this page began.

3. **Treat every failure email as a bug in the machinery.** Forward it,
   and ask for the whole class of failure to end, not just this run.
   On August 23, Archive Watch's scheduled workflows were emailing me
   about failures that were not really failures:

   > I want to stop getting alerts for failed GitHub actions. Can you fix
   > it so that if it isn't broken, it doesn't fail?

4. **Bring in real people.** Post about your app somewhere your people
   are. Bring what they say back to the agent. The day after I posted
   Archive Watch on Reddit:

   > I posted about the app with links to all of the platforms on Reddit
   > yesterday [...] I'd like you to use the comments/feedback from the
   > users on this post to identify issues that need to be solved across
   > all platforms.

5. **Run your first loop.** Pick a job too big for one sitting, draft
   the loop prompt in your notes, and start it with `/loop`. Give it the
   goal, a numbered list of what to look for, and what "done" means. My
   best one opened Archive Watch's full database audit in late
   September:

   > /loop It is now time to do a full audit of our database looking for
   > the following issues and fixing them or further enhancing them
   > wherever they exist:
   > 1. Malformed metadata, including poorly structured
   > descriptions/summaries, issues with years/dates, categorization,
   > cast/crew info [...]
   > 2. Non-professional posters or backdrops. [...]
   > 3. Incorrect copyright data or incorrectly categorized films as
   > Creative Commons, public domain, or otherwise copyright free works
   > [...]
   >
   > The goal is that every single entry for every single title has
   > exclusively accurate information and that the information will only
   > improve over time with our processes set up on Github

   Watch the first few ticks. When a tick does nothing new, say so. When
   the job is done, stop it and ask for a summary of what changed and
   what is waiting on you.

**When you are ready to move on,** Pulse reads at least one store
honestly, a failure email has become a fix instead of a habit, and you
have run a loop from start to stop.

Be ready to show one number Pulse read correctly, one reader that told
you honestly it could not, and what your loop finished.
