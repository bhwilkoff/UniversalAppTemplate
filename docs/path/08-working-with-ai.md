# 08. Working with AI

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

Each file has one job, and is read at a different moment.

| File | Its job | Read |
|---|---|---|
| `CLAUDE.md` | Who the app is for, the rules, and the table of which skill to use when. | At the start of every session |
| `SCRATCHPAD.md` | The current state, the next actions, and an append-only session log: state found, work done, state left. | At the start of every session |
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

## Loops

This template was reorganized by a loop: an agent working in
five-minute ticks, reading its own plan at the start of each one
(`docs/maintaining/RESTRUCTURE-PLAN.md`), doing the next thing, sending
slower work to helper agents in the background, and writing down what it
did before the tick ended. Archive Watch ran loops like that for days.

They work because of everything above. A loop without a plan file
forgets what it was doing. A loop without the stage 04 rules reports
fiction. A loop without a small always-loaded context runs out of room
to think. `docs/AUTONOMOUS-LOOPS.md`, `docs/ENGINEERING-PROCESS.md` and the
`autonomous-loop-cadence` skill carry the rest.

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

## What to do

1. Read your `SCRATCHPAD.md`. Is the current state true today? Fix it
   if not.
2. Find one thing you corrected your agent on this week. Make sure it
   is saved as a memory with a "Why" line.
3. Find one lesson from your app that the next app should not have to
   learn. Write it as a skill (see `.claude/skills/README.md`, "Adding
   your own").
4. Write the decision you are least sure about, leading with the rule,
   and say what would make you change it.

Be ready to show the skill you wrote, and to say which mistake it will
save the next person from.
