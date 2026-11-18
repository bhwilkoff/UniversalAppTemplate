# Week 2: the first app, and the same app on a second device

<!-- This guide: rebuilt from research note 06 (docs/research/curriculum/
06-instructional-design.md, section 4) by Claude, October 7, 2026, and
rewritten on November 18, 2026, at Ben's request, on the routine in
docs/teaching/leading-a-session.md. Awaiting Ben's review. Ben's own
stories and prompts are quoted from the stages. -->

**Where the cohort is.** Week 1's session found each person's problem
and sent their first prompt, and the week that followed was [stage
00](../path/00-why-we-build.md) and [stage
01](../path/01-first-prototype.md). Everyone revised their problem
statement after two real conversations, wrote the why into `AGENTS.md`,
posted the problem where other people can read it, and put the smallest
real version of the app, with real data, in the hands of one of the
people they talked to.

So tonight is the first time anyone in the cohort tries anyone else's
app, and the week ahead is [stage 02](../path/02-shape-of-an-app.md) and
[stage 03](../path/03-going-native.md): deciding what "the same app"
means, and giving it a second home.

**The same verb, in each platform's own idiom.**

## The move and the question

**Play.** This week leads with play: the app is tried tonight by other
hands, and in the week ahead the second platform is built in rounds,
used on the device, written down, and numbered, until it does the same
things as the first in its own way.

The question the week turns on: **What has to be the same on every
device, and what should feel as if it was born there?** It is the
question the leader listens with during Try each app, and nobody is
asked to answer it in the abstract.

## The run of show

*Written by Claude, awaiting Ben's review (the routine of November 18, 2026, in [`leading-a-session.md`](leading-a-session.md): your plans from last week, try each app, write your next round, your questions).* Generated from [`runs-of-show.json`](runs-of-show.json) by `tools/teaching_tables.py`; change the JSON, then run it.

| Minutes (75) | Scene | Kind | What happens |
|---|---|---|---|
| 0-8 | Your plans from last week | Talk | My plan was ___  What happened was ___ |
| 8-38 | Try each app | Rehearsal rooms | In your group's room, nine minutes for each builder: their question, three quiet minutes trying it, what you did and what happened, "I wonder if", then one decision and what changes first. The prompt: "Show your app with its real data, and ask one question about it." |
| 38-41 | Break | Break |  |
| 41-50 | What we saw | Talk | One person from each group: one thing someone did with an app  Then what it suggests |
| 50-69 | Write your next round | Reflection | I tried my app, and here is what I saw: 1. ___ 2. ___ 3. ___  Start with ___  This is done when ___  It must never ___ The prompt: "Paste the round you are sending to your agent." |
| 69-75 | Your questions | Question | Only your leaders read the answers. The prompt: "What questions do you still have?" |

**In the rehearsal rooms,** each builder's turn runs these scenes, 9 minutes in all: the builder's question (1), try it quietly (3), what you did and what happened (2), i wonder if (1), one decision, and what changes first (2). The room's prompt is on screen the whole time.

**At 60 minutes,** for a cohort of fewer than eight learners, everyone stays in the one call:

| Minutes (60) | Scene | Kind | What happens |
|---|---|---|---|
| 0-6 | Your plans from last week | Talk | My plan was ___  What happened was ___ |
| 6-42 | Try each app | Presenter | The builder asks one question about the app  Everyone tries it, quietly, for three minutes  I tried to ___. What happened was ___. I expected ___.  One "I wonder if", then the builder explains one decision and what they will change first The prompt: "Show your app with its real data, and ask one question about it." |
| 42-56 | Write your next round | Reflection | I tried my app, and here is what I saw: 1. ___ 2. ___ 3. ___  Start with ___  This is done when ___  It must never ___ The prompt: "Paste the round you are sending to your agent." |
| 56-60 | Your questions | Question | Only your leaders read the answers. The prompt: "What questions do you still have?" |

Every scene can be changed on the session's page before it runs, and in the Meet add-on while it runs.

**What to watch for tonight.**

- A problem statement that has not changed since week 1's session. The
  conversations should have moved it, even by a word.
- "My friend liked it," with nothing about what the person did. What
  they did first is the evidence; what they said about it comes second.
- A first version that grew past the smallest thing. It is not wrong,
  but ask what the person used, and what nobody touched.
- An app that behaves differently on two people's devices because each
  device worked something out for itself.
- A rule about the data that is really about the look ("the button is
  blue"), which belongs to each device, not to the data.

## What they show

Before the session, each person answers one question on the session
page: what they want someone to try, and the one thing they want to know
about it. Read every answer, open every app at its address, and look at
each repository's history, branches included, so that "what changed
this week" is a fact from the commits. Then write a slide for each
builder with their name, their app, and what changed.

The stages ask each builder to be ready for this:

> Be ready to share your problem statement and the version before it, what
> you heard in your two conversations, your "why we build" paragraph, and
> your one rule, and to explain why you drew that line where you did and
> what it will cost you.

> Be ready to show the app at its address, to name one thing the real data
> taught you that fake data would have hidden, to say what the person you
> talked to did with it and whether it did what your problem statement
> says, and to explain why you started on the platform you chose.

**The bar.** The app is live at a real address, full of real data a
pipeline brought in, after at least two rounds from the builder's own
device, and one of the people they talked to has used it. **Signs of
"not yet"** are an app that only exists on the builder's computer, and
typed-in sample data. Both are worth seeing on your own before the
session, so that nobody discovers them in front of the group.

## Your plans from last week

Open by saying what you read in last week's questions and what you
changed because of it. Then put up the table: each person, the "Start
with" line they read aloud at the end of week 1, and what their app does
today. In a fixed order, each person says "My plan was ___" and "What
happened was ___," in about thirty seconds. "Not started yet" is an
ordinary answer, said plainly and passed over, and when someone changed
their plan, ask what changed it, because that is usually the most useful
thing anyone says in the hour.

## Try each app

Every builder gets the same nine minutes, in the same order as the
plans. They ask their one question (1 minute), everyone tries the app
quietly in their own working copy (3 minutes), each person says what
they did and what happened (2 minutes), anyone offers one "I wonder if"
(1 minute), and the builder explains one decision, with the agent
closed, and what they will change first (2 minutes). Each builder
presses Show my app to everyone in their panel, and you press Show it.
Nobody says what they think of the app until they have said "I tried to
___," "What happened was ___," and "I expected ___," and the builder
listens and writes rather than explaining. Call on people by name after
the three minutes, and wait after each answer.

People will be trying each app on different devices, a phone, a laptop,
a tablet, and that is this week's material. When two people report
different things, ask what differed, and listen for which of the
differences are in the data and which are in the device. A title, a
saved state, or a correct answer that differs between two devices is a
rule about the data that nobody has written down yet, and that is the
moment to tell the Roku story from the top of stage 02 in a sentence:
the web quietly coped with a broken record and hid it, and the platform
that trusted the data was the one that crashed. A gesture or a button
that differs is each device doing its own job, which stage 02 calls
"Same verb, native idiom." For the decision, the stages offer two that
fit this week: why the builder drew their one rule where they did, or
why they started on the platform they chose.

A builder with nothing new to try still gets their nine minutes: they
say who the app is for and what its first screen would show, each
person asks one question to understand it, and they leave with that
prompt half written. In the 75-minute version, groups of three try one
another's apps in rooms, and after the break one person from each group
says one thing someone did with an app, then what it suggests.

## Write your next round

Show a real round first, a numbered list someone sent their agent after
using their app (your own, or one shared with permission), and then the
form:

- I tried my app, and here is what I saw: 1. ___ 2. ___ 3. ___
- Start with ___
- This is done when ___
- It must never ___

The numbered lines come from what people just said they did with each
app. This week, "This is done when" names what they will see in the app
with its real data, and "It must never" is a good place for the one rule
about their data that every platform must follow. For anyone starting
stage 02, the "Start with" line is usually the parity matrix, and my own
prompt from June 10 is a fair model to put on screen: "continue working
on our parity matrix across all platforms to make sure we can launch on
all platforms with the same features across the board." In Claude Code,
plan mode lets them read the promises before anything is built, and in
Antigravity, `/plan` does the same. A round that asks the agent to build
the second platform tonight has skipped the matrix, and a rule about how
something looks has put an idiom in the data, so either is worth a word.

Everyone writes in the box in their panel and sends the same words to
their agent before the part ends. In the last two minutes each person
reads their "Start with" line aloud, in the same order, with no applause
and no comment, and those lines open week 3.

## Your questions

One private question in the panel: "What questions do you still have?"
Only the leaders read the answers. Answer two or three aloud, the rest
before week 3, and open week 3 by saying what you read.

The week's own question goes on the session page before week 3, beside
each builder's own question: "Which of these belong in the data, so
every platform gets them the same way?" with the choices a film's title
and year, whether a film is saved, a trivia question's correct answer,
swipe to go back, and the size of the play button. The answer you hope
for puts the first three in the data and leaves the gesture and the
button to each platform.

## The task, and its evidence

**The task, this week.** Read and trim the parity matrix, write one rule
about your data that the pipeline now enforces, run a second platform on
your own device in its own idiom, and give the app a look that comes
from its why (stage 03's last steps).

**Evidence a person can open.** The matrix with one cell your own eyes
proved wrong; the rule in the data contract; the second platform on your
device; the look beside the template's.

**On the credential.** Recognitions: "Took another round instead of
shipping a first draft," and, from tonight, "Asked for feedback and used
it" and "Wrote down what they value." Students do the thing itself, and
what they make is the evidence; nobody writes a report about it
([`05-inquiry-and-evidence.md`](../research/curriculum/05-inquiry-and-evidence.md)).

## When someone is stuck

Every entry in the [stuck library](../stuck/README.md) starts with a
question to ask yourself, then what to try, then who to ask. This week,
point people to:

- [Stuck writing](../stuck/writing/README.md), for when the problem, the
  why, or what comes next will not come.
- [Stuck playing](../stuck/playing/README.md), for when the agent fixes
  what you cannot see, a bug keeps returning, or the tools themselves are
  stuck.
- [I am not ready to show anyone](../stuck/publishing/not-ready.md), for
  anyone who did not put the app in a real person's hands.

And the ladder for any of them: name the kind of stuck, write three
lines (what you tried, what you expected, what you saw), ask the agent
for a way to understand it rather than the fix, look on the device and
at the last thing that worked, then your group, then the teacher. About
twenty minutes before the group is a default each person can move.

## The close

> Answer the question in your panel before you go. This week your app
> gets a second home, in its own idiom, and a look that comes from its
> why. Next week, we try it on both.

## After the session

Read the answers and write what you will say about them at the start of
week 3, and reach out within two days to anyone who missed the session
or did not send a round. This week has two more steps.

1. **Check every group, privately.** Ask each person, in a message only
   you see: "Is your group working for you?" Change any group that is
   not, quietly, before week 3.
2. **Set up the look across groups.** Send each person the names of two
   apps from outside their group, so that during week 3 everyone opens
   two classmates' apps on their own device and writes down what they
   did and what happened. Spread the pairings so that every app gets two
   visitors.

Next week, the second platform, and proof that it works.
