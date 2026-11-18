# Week 3: proof that it works, and someone else's hands

<!-- This guide: rebuilt from research note 06 (docs/research/curriculum/
06-instructional-design.md, section 4) by Claude, October 7, 2026, and
rewritten on November 18, 2026, at Ben's request, on the routine in
docs/teaching/leading-a-session.md. Awaiting Ben's review. Ben's own
stories and prompts are quoted from the stages. -->

**Where the cohort is.** Week 2 was [stage 02](../path/02-shape-of-an-app.md)
and [stage 03](../path/03-going-native.md). Everyone read and trimmed a
parity matrix, wrote at least one rule about their data that the
pipeline now enforces, got a second platform running on their own device
in its own idiom, chose a floor from a measurement, and gave the app a
look that comes from its why. Everyone also opened two apps from outside
their group and wrote down what they did and what happened.

Tonight everyone tries those apps together, and the week ahead is
[stage 04](../path/04-seeing-it-work.md), where the agent stops relying
on the builder to find its mistakes, and [stage
05](../path/05-shipping.md), where the app reaches a device the builder
did not build it on. This is the week the app leaves your hands.

**The agent is never the tester.**

## The move and the question

**Play, then publish.** This week leads with play, because proof comes
from using the app on the device, and ends with publish, because the
week ends with the app in someone else's hands.

The question the week turns on: **How do I know it works, and what
happens when someone I did not build it with holds it?** Tonight that
question is asked about each app in turn, while people are holding it.

## The run of show

*Written by Claude, awaiting Ben's review (the routine of November 18, 2026, in [`leading-a-session.md`](leading-a-session.md): your plans from last week, try each app, write your next round, your questions).* Generated from [`runs-of-show.json`](runs-of-show.json) by `tools/teaching_tables.py`; change the JSON, then run it.

| Minutes (75) | Scene | Kind | What happens |
|---|---|---|---|
| 0-8 | Your plans from last week | Talk | My plan was ___  What happened was ___ |
| 8-38 | Try each app | Rehearsal rooms | In your group's room, nine minutes for each builder: their question, three quiet minutes trying it, what you did and what happened, "I wonder if", then one decision and what changes first. The prompt: "Show your app, and ask one question about it." |
| 38-41 | Break | Break |  |
| 41-50 | What we saw | Talk | One person from each group: one thing someone did with an app  Then what it suggests |
| 50-69 | Write your next round | Reflection | I tried my app, and here is what I saw: 1. ___ 2. ___ 3. ___  Start with ___  This is done when ___  It must never ___ The prompt: "Paste the round you are sending to your agent." |
| 69-75 | Your questions | Question | Only your leaders read the answers. The prompt: "What questions do you still have?" |

**In the rehearsal rooms,** each builder's turn runs these scenes, 9 minutes in all: the builder's question (1), try it quietly (3), what you did and what happened (2), i wonder if (1), one decision, and what changes first (2). The room's prompt is on screen the whole time.

**At 60 minutes,** for a cohort of fewer than eight learners, everyone stays in the one call:

| Minutes (60) | Scene | Kind | What happens |
|---|---|---|---|
| 0-6 | Your plans from last week | Talk | My plan was ___  What happened was ___ |
| 6-42 | Try each app | Presenter | The builder asks one question about the app  Everyone tries it, quietly, for three minutes  I tried to ___. What happened was ___. I expected ___.  One "I wonder if", then the builder explains one decision and what they will change first The prompt: "Show your app, and ask one question about it." |
| 42-56 | Write your next round | Reflection | I tried my app, and here is what I saw: 1. ___ 2. ___ 3. ___  Start with ___  This is done when ___  It must never ___ The prompt: "Paste the round you are sending to your agent." |
| 56-60 | Your questions | Question | Only your leaders read the answers. The prompt: "What questions do you still have?" |

Every scene can be changed on the session's page before it runs, and in the Meet add-on while it runs.

**What to watch for tonight.**

- A second platform that only runs in a simulator.
- A look chosen because the builder likes it, with no line back to the
  people the app is for.
- A "fixed" that the builder has only the agent's word for, with no
  picture of the screen or person who saw it.
- Anyone who has not yet named a person outside the cohort whose device
  the app could reach this week.

## What they show

Before the session, read each person's answer on the session page (what
they want someone to try, and the one thing they want to know), open
every app at its address, and look at each repository's history,
branches included. Write a slide for each builder with their name,
their app, and what changed this week, and read the notes from the two
visitors each app had during the week, because they often name what is
worth trying first.

The stages ask each builder to be ready for this:

> Be ready to show your matrix and one cell the audit or your own eyes
> proved wrong, and to explain the rule about your data that you decided,
> and why you drew it where you did.

> Be ready to name the oldest device your app will run on and why you
> chose it, the newest feature it will not show there, and why its new
> look fits the people it is for.

**The bar.** A matrix the builder has read and trimmed, one rule about
their data that the pipeline enforces, and a second platform on their
own device that does the same things as the first in its own idiom,
with a floor chosen from a measurement and a look that is theirs rather
than the template's. **Signs of "not yet"** are a matrix nobody has
read, "the agent picked the floor," and an app that still wears the
template's colors and type.

## Your plans from last week

Open by saying what you read in last week's questions and what you
changed because of it. Then put up the table: each person, the "Start
with" line they read aloud at the end of week 2, and what their app does
today. In a fixed order, each person says "My plan was ___" and "What
happened was ___," in about thirty seconds. "Not started yet" is an
ordinary answer, said plainly and passed over, and when someone changed
their plan, ask what changed it.

## Try each app

Every builder gets the same nine minutes, in the same order as the
plans: their one question (1 minute), everyone trying it quietly in
their own working copy (3 minutes), what each person did and what
happened (2 minutes), one "I wonder if" (1 minute), and one decision,
with the agent closed, and what they will change first (2 minutes).
Each builder presses Show my app to everyone, and you press Show it.
Nobody says what they think until they have said what they did, the
builder listens and writes, and you call on people by name after the
three minutes.

This week the thing to listen for is the word "works." When a builder
says something works, or that the agent fixed it, ask what they saw on
their own screen. An agent reports what it intended, so "I fixed it" is
true about the code and says nothing about the app, and everything short
of the real device lies a little: a simulator lets the app write where a
real Apple TV forbids it, and a log line that says "caption shown" does
not mean a person could read it. A builder who can say what they saw,
or what a screenshot from the device shows, has evidence; a builder who
can only repeat the agent has the next line of their round. The three
quiet minutes are themselves stage 05 in small, because several people
who did not build the app are holding it, so when someone gets stuck,
ask the builder what they would have explained, and then point out that
the person they hand it to this week will not have them there to
explain it.

A builder with nothing new to try still gets their nine minutes: they
say who the app is for and what its first screen would show, each
person asks one question to understand it, and they leave with that
prompt half written. In the 75-minute version, groups of three try one
another's apps in rooms, and after the break one person from each group
says one thing someone did with an app, then what it suggests.

## Write your next round

Show a real round first. One from stage 04 fits this week well: in Bsky
Dreams' first month the feed was showing posts twice, the agent had
tried three fixes that did not work and was still saying they did, so
my round stopped asking for a fourth fix and asked for a way to see the
problem:

> You have clearly not found the root cause of the issue, nor are you
> actually testing to make sure that it is fixed before telling me
> that it works. Please create a test for how you will determine if a
> post is rendered a signgle time and continue to work until your
> code passes that test.

Then the form:

- I tried my app, and here is what I saw: 1. ___ 2. ___ 3. ___
- Start with ___
- This is done when ___
- It must never ___

This week "This is done when" is something they will see on their own
device, which is the first prompt of stage 04 in one line: the agent
proves its fix with a screenshot from that device, and one phone is
enough. A line that says only "make sure it works" still leaves the
agent grading itself, so ask what the screen would look like if the fix
had not worked. The round can end with who holds the app next, on which
device, and how it gets there for free, a link, a test track, or the
web (stage 05's "Sharing it for free" says what each costs, and the web
version is the only free way to reach someone's iPhone). Tell them the
one thing that makes that person worth asking: give them one thing to
do, then watch without explaining, and write down what they did, where
they paused, and what they said, in their words.

Everyone writes in the box in their panel and sends the same words to
their agent before the part ends. In the last two minutes each person
reads their "Start with" line aloud, in the same order, with no applause
and no comment, and those lines open week 4.

## Your questions

One private question in the panel: "What questions do you still have?"
Only the leaders read the answers. Answer two or three aloud, the rest
before week 4, and open week 4 by saying what you read.

The week's own question goes on the session page before week 4, beside
each builder's own question: "How do you know your last fix is real?"
The answer you hope for names evidence from outside the agent, a
screenshot from the device, a measurement, or a test that could have
failed, and an answer that trusts the agent's report is worth a word
before the session.

## The task, and its evidence

**The task, this week.** Have the agent prove a fix on your own device,
give your devices roles, and put the app on a device you did not build
it on, then watch one person use it.

**Evidence a person can open.** The screenshot that proved a fix, and
what it would have shown if the fix had failed; the app installed on
someone else's device; what that person did first, in their words.

**On the credential.** Recognitions: "Tested it the way people will
actually use it," "Got it onto someone else's device," and "Helped a
classmate see their work more clearly." Students do the thing itself,
and what they make is the evidence; nobody writes a report about it
([`05-inquiry-and-evidence.md`](../research/curriculum/05-inquiry-and-evidence.md)).

## When someone is stuck

Every entry in the [stuck library](../stuck/README.md) starts with a
question to ask yourself, then what to try, then who to ask. This week,
point people to:

- [Stuck playing](../stuck/playing/README.md), for when the agent fixes
  what you cannot see, a bug keeps returning, or the tools themselves are
  stuck.
- [I cannot get it onto someone else's device](../stuck/publishing/someone-elses-device.md).

And the ladder for any of them: name the kind of stuck, write three
lines (what you tried, what you expected, what you saw), ask the agent
for a way to understand it rather than the fix, look on the device and
at the last thing that worked, then your group, then the teacher. About
twenty minutes before the group is a default each person can move.

## The close

> Answer the question in your panel before you go. Next week, bring a
> screenshot that proved a fix, and your app on a device you did not
> build it on, with what that person did and said, in their own words,
> in your note.

## After the session

Read the answers and write what you will say about them at the start of
week 4, and reach out within two days to anyone who missed the session
or did not send a round. Week 4 is also the first of the sessions where
you look closely at every build, so set aside time the day after it.

Next week, the app in someone else's hands.
