# 06. Keeping it running

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

The guardian workflows ship switched off. Turn them on when your repo
has scheduled workflows worth guarding.

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

Pulse needs credentials for every store it reads, and each store's are
set up differently. `docs/PRODUCT-PULSE.md` walks through each one. Until
you add them, the page is honest and mostly empty.

The CI fleet costs attention. Every scheduled workflow is one more thing
that can fail quietly. Add one only when the work it does is worth
watching.

## What to do

1. Copy `ops/pulse.config.example.json` to `ops/pulse.config.json` and
   fill in your app's identity.
2. Run `python3 tools/pulse_collect.py` with no credentials. Every
   reader should say "not configured" or explain why it is dark. None
   should say zero.
3. Open `pulse/?fixture` in a browser to see the page with sample data,
   then `pulse/` to see yours.
4. Add the credentials for one store, run it again, and read the result
   next to that store's own console. Do the numbers agree?
5. When you have more than one scheduled workflow, turn on
   `workflow-health.yml`.

Be ready to show one number Pulse read correctly, and one reader that
told you honestly it could not.
