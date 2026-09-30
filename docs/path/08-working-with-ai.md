# 08. Working with AI

**Where you are.** You have been building for weeks. By now the agent
has forgotten something you told it at least once, and you have had to
explain it again. This stage is about making that stop.

On September 24, 2026, I wrote this to the agent working on Archive
Watch:

> You have fully documented device testing pathways for each device.
> Please stop trying to reinvent things you already know how to do.

It had improvised a way to wake an Apple TV and install a build, step
by step, when a runbook in the same repository already said exactly how,
and the tools to do it were sitting in `tools/`. The agent was not
careless. It simply did not remember. Every session starts fresh, and
the only memory it has is what it reads.

**The agent remembers only what the repository remembers.**

Stage 00 said the same thing about values. This stage says it about
everything else: the method, the lessons, the state of the work, and
the reasons behind the choices.

## What I want

I want every session to start where the last one ended. I want every
hard lesson to be learned once, and then to be the thing the agent
reaches for first. And I want to be able to read, at any point, what was
done, what was verified, and what was only hoped.

## Where the memory lives

There are two halves. Your note, which you have kept since stage 00, is
yours: the wish, the rounds, the ledger, what other people said. The
rest is the agent's, a set of files each with one job, read at a
different moment. You will not edit those yourself. Your part is to ask
the agent to keep them, and to notice when it has not.

| File | Its job | Read |
|---|---|---|
| `CLAUDE.md` | Who the app is for, the rules, and the table of which skill to use when. | At the start of every session |
| `SCRATCHPAD.md` | The current state, the next actions, and the last two session-log entries (state found, work done, state left). Older entries move, word for word, to `docs/SESSION-LOG.md`. | At the start of every session |
| `DECISIONS.md` | Why the app is built the way it is. Each entry leads with the rule, then why, then how to apply it. | Before changing anything it covers |
| `PARITY.md` | What exists on which platform, honestly. | Before and after any feature |
| The memory folder | Corrections and confirmations from you, each with a "Why" line. | At the start of every session |
| `.claude/skills/` | Lessons that should travel to the next app. | When a request matches |

Two rules keep these useful.

**Keep what is loaded every session small.** Archive Watch's
always-loaded files grew to about 382 KB, which crowded out the code
being worked on. Rolling old decisions and old session logs into
archives, word for word, brought it to about 80 KB. The decision log now
rolls at about 50 KB. Nothing is summarized in place. A summary loses
exactly the detail the next person needed.

**A stale file is worse than no file.** A scratchpad that says a
feature is unfinished when it shipped yesterday sends the next session
to do it again. When you find drift, fix the file before doing anything
else.

## How the lessons compound

- **Corrections become memories.** When you tell the agent "don't do
  that", it saves the rule with the reason. When you say "yes, exactly
  that" about a choice that was not obvious, it saves that too. Quiet
  confirmations matter as much as corrections.
- **Recurring lessons become skills.** When the same mistake could
  happen in the next app, the lesson goes into a skill, and the template
  gets it too. `docs/PROVENANCE.md` records where every lesson came from,
  so nothing learned in one app stays trapped there.
- **Fix the doc first, then the feature.** When a design rule and a
  feature disagree, the rule is where the bug is. Change it on purpose,
  then build.
- **Commit messages quote the request.** Months later, the words you
  actually used explain a change better than anyone's summary of them.

## Honesty in the log

An agent reports what it intended. So, the log keeps two words apart:
**fixed** (the code changed) and **verified** (something outside the
agent saw it work, per stage 04). A feature is not verified because the
agent says so, and it is not shipped because it is verified (stage 05).

One more rule came from a hard week. A note in Archive Watch's docs once
said that a page in Amazon's developer console did not exist, and added:
"Do NOT re-walk the console nav." The page did exist, one menu over. The
note written to save time is what stopped anyone from looking, and
Amazon's reporting API stayed unreachable for five weeks over a
two-click setting. So now, **a negative finding says how it was found
and when it should be checked again.** An absence you searched for once
is weak evidence, and consoles change.

## Why loops depend on all of this

The loops from stage 06 are where memory matters most, because a loop
runs for hours with nobody watching each step. A loop without a plan
file forgets what it was doing. A loop without the stage 04 rules
reports fiction. A loop whose always-loaded files have grown too large
runs out of room to think. `docs/AUTONOMOUS-LOOPS.md`,
`docs/ENGINEERING-PROCESS.md` and the `autonomous-loop-cadence` skill
carry the rest.

## What it costs

Writing things down is slower than not writing them down, every single
time. A decision entry takes ten minutes. A skill takes an hour. And
written things go stale: the "Consequences" paragraph of a decision can
be wrong before the session that wrote it is over.

But, the alternative is paying for the same lesson again. Archive Watch
learned how to wake an Apple TV once. The session that forgot paid for
it a second time.

## Where AI does not belong

Go back to stage 00 before you finish. Everything in this stage makes
the agent a better builder. None of it makes the agent the right one to
write your app's words, choose what your people should see, or do the
part of the work that was supposed to be theirs. Those lines are yours
to draw, in writing, where the agent will read them.

## Working with your agent

1. **Before a session ends, ask it to write everything down.** Any time
   you are about to stop, restart, or run low on context. This was the
   middle of a long Archive Watch session in September:

   > We are close to needing to compact, please document everything we
   > might need before I do that.

2. **When you correct something twice, make it a rule.** The first of
   these came after Archive Watch's loop kept re-arming without saying
   when it would next wake; the second after a Tidbits loop stopped
   itself, again, to report that its context was running low.

   > Can you make a memory so that after every tick when you re-arm the
   > loop, you give a time when the next tick should occur?

   > If you are low on context, compact. Can't you simply add that as a
   > rule?

3. **When it reinvents something, send it back to what it wrote.** On
   September 7, the agent was rebuilding parts of Archive Watch's video
   player to fix problems we had solved months earlier:

   > I feel like we had solved all of this so so long ago as we were
   > building the last resilient player for apple's platforms. Are we
   > redoing work that has already been done and is documented already?

4. **Ask it what it is waiting on.** Instead of reading its notes, ask.
   I asked Archive Watch's agent exactly this on September 21:

   > What are the things you are wating on me for?

   And when there are decisions to make, ask for them as choices.

5. **Turn this app's lessons into skills.** When you have learned
   something the next app should not have to learn again, ask for it.
   This was the end of a long day in September, most of it spent on
   Archive Watch's social posting:

   > Document everything we have done today, as we are needing to
   > compact. (create any new skills necessary)

   Then ask the agent to bring those skills back into your copy of the
   template, so your next app starts with them.

6. **Draw the line again.** Reread your "Why we build" paragraph and your
   standing rules from stage 00. Ask the agent whether anything you have
   built since crosses them. Decide what to do about each answer
   yourself.

**When you are done with the path,** your app is shipped and running,
your agent remembers what you taught it, and the lessons from this app
are waiting for the next one. The next app starts at stage 00 again,
with a new note and a new why. It will go faster, because this time the
repository remembers.

Be ready to show one skill your app taught, and to say which mistake it
will save the next person from.
