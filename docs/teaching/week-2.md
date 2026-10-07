# Week 2: the same app on a second platform

**Where the cohort is.** This week everyone read and trimmed a parity
matrix, decided at least one rule about their data that the pipeline
now enforces, and got a second platform running on their own device.
That is stages [02](../path/02-shape-of-an-app.md) and
[03](../path/03-going-native.md), whose two lines carry the week: "Same
verb, native idiom," and "The floor is a floor, not a ceiling."

Stage 03 also asks each app to stop wearing the template's look. In
the cohort, that part waits for week 3, so tonight's bring-back is
about what the app does on two platforms, and not yet about how it
looks.

**The same verb, in each platform's own idiom.**

## The move and the question

*Written by Claude, awaiting Ben's review (curriculum milestone C5, October 7, 2026).*

**Play.** This week leads with play: rounds of using the app on the device, each one written down and numbered, until a second platform matches the first.

The question the whole session turns on: **What is still wrong, and how do I say it so it gets fixed?**

Every session is one round of Write, Play, Publish at a larger size,
the same three moves as stage 00, and the principles decide what gets
written, played with, and published
([`00-curriculum-design.md`](../research/curriculum/00-curriculum-design.md)).

## The run of show

| Minutes (75) | Scene | Kind | What happens |
|---|---|---|---|
| 0-7 | Arrive | Talk | One line in the chat: shipped or stuck. Then what I heard in last week's answers, and what I changed because of it. |
| 7-37 | Show what you brought back | Rehearsal rooms | Groups of three. The room's prompt: "Show one verb on both platforms, and one cell your eyes proved wrong." |
| 37-40 | Break | Break |  |
| 40-47 | One value at work | Presenter | One decision a value changed this week, and what it cost. The audience: "Listen for the value at work, and what it cost." |
| 47-62 | Read one real prompt | Design stage | A doubled-up feed, three fixes in, from stage 04. Write the prompt you would send before you see the real one. On the board: *Read one real prompt*. |
| 62-70 | Start | Reflection | Hand the testing to your agent: ask it to prove its next fix on your device before it tells you it is done. Then: "What is the first prompt you will send this week?" |
| 70-73 | Check for understanding | Question | "Which of these real commit messages is a round, and which is a first draft? Choose every round." (any that fit) |
| 73-75 | What is still muddy? | Question | "What is still muddy?" (in their own words) |

**In the rehearsal rooms,** each builder's turn runs these scenes, 10 minutes in all: their question (1), show it, and one decision (4), one clarifying question (1), the three questions (3), what comes next (1). The room's prompt is on screen the whole time.

These are the scenes a new cohort is made with on humanshaped.org, from
[`runs-of-show.json`](runs-of-show.json), and every one of them can be
changed in the class builder, before the session and during it. To fit 60 or 90 minutes, use the table in the [guides' index](README.md).

**What to watch for tonight.**

- Play that is not being written down. A round that is not in the note did not happen.
- The same complaint sent to the agent three times. That is a stuck moment, and the ladder below starts there.

## The opening

> Welcome back. Last week you told me [what you heard], so tonight
> [what changes]. Last week was the first bring-back, and this week
> should feel a little more familiar. One thing to try: before you
> show, say in one line what you want your partners to tell you. "Does
> search feel like it belongs on Android?" gets you a better answer than
> "What do you think?"

## What they bring back

The cohort's bring-back for this week, from `COURSE.md`: one verb shown
on both platforms, each in its own idiom, and one cell their own eyes
proved wrong. The stages' own lines ask for a little more:

> Be ready to show your matrix and one cell the audit or your own eyes
> proved wrong, and to explain the rule about your data that you
> decided, and why you drew it where you did.

> Be ready to name the oldest device your app will run on and why you
> chose it, the newest feature it will not show there, and why its new
> look fits the people it is for.

**The bar.** For stage 02: "there is a matrix you have read and trimmed,
one rule about your data that you decided and the pipeline now
enforces, and every Share button points at your web address." For
stage 03, in the cohort's version: "the second platform is on your own
device, it does the same things as the first in its own idiom, ... and
you have chosen its floor from a measurement." The look comes next
week.

**What to look for.**

- One verb (search, save, share) done on both platforms, with each
  platform's own controls. The same result reached in two different
  ways is right. The same screen squeezed onto a second device is not.
- A matrix with marks on it: rows struck out, cells questioned.
- One cell the student's own eyes proved wrong, and what they said to
  the agent about it.
- A rule about the data that the student decided, said in their words,
  with the reason it sits where it does.
- A floor chosen from what the agent measured, which the student can
  explain in a sentence.

**Signs of "not yet."** A second platform that only runs in a
simulator. A matrix nobody has read. "The agent picked the floor." A
Share button that still points somewhere other than the app's own web
address.

## On the design stage: one real prompt

Put the board on the main stage from the *Read one real prompt* template: the situation, the prompt each person would send, a partner's, and then the real one, side by side.

**The situation.** From stage 04, in Bsky Dreams' first month. The feed
was showing posts twice. The agent had tried three fixes, none of them
had worked, and it was still telling me that they did. Ask everyone what they would send now, alone,
then compared with a partner. Then show the real prompt:

> You have clearly not found the root cause of the issue, nor are you
> actually testing to make sure that it is fixed before telling me
> that it works. Please create a test for how you will determine if a
> post is rendered a signgle time and continue to work until your
> code passes that test.

**What to talk about.** The prompt stops asking for a fourth fix, and
asks instead for a way to see the problem. That is the move stage 04
is built on: the agent is never the tester, and every "fixed" should
point at something a person could look at. Ask what in their own app
they have taken the agent's word for.

## Start

Everyone begins [stage 04](../path/04-seeing-it-work.md) by telling
their agent, in their own words, that it should see what they see and
that they should not be the one testing its work, and asking it to set
itself up to test on their device. One phone is enough. They send it
before they leave.

## The check

The question scenes at the end of the run of show, answered privately, and
shown on the main stage without names only if you choose:

1. **Which of these real commit messages is a round, and which is a first draft? Choose every round.** (any that fit). Choices: UX round 7; Round 3; UI feedback pass; M0 setup; M1: Search Mode.
2. **What is still muddy?** (in their own words).

**Also prepared,** from this guide's first version, for when you want the stage's own question instead: "What has to be the same about your app on both platforms, and what should be different?"

The answer you hope for has the data, the decisions, and the verbs on
one side, and the controls, gestures, and layouts on the other. An
answer that says "everything should look the same" is worth a word.

## The task, and its evidence

*Written by Claude, awaiting Ben's review (curriculum milestone C5, October 7, 2026).*

**The task.** Run two numbered rounds. Read and trim the parity matrix. Run a second platform on your own device.

**Evidence a person can open.** The rounds in the note and the history; the matrix, with one cell your eyes proved wrong.

**On the credential.** Recognition: "Took another round instead of shipping a first draft." Students do the thing itself, and what they
make is the evidence; nobody writes a report about it
([`05-inquiry-and-evidence.md`](../research/curriculum/05-inquiry-and-evidence.md)).

## When someone is stuck

Every entry in the [stuck library](../stuck/README.md) starts with a
question to ask yourself, then what to try, then who to ask. This week,
point people to:

- [Stuck playing](../stuck/playing/README.md), for when the agent fixes what you cannot see, a bug keeps returning, or the tools themselves are stuck.
- [Stuck writing](../stuck/writing/README.md), for when the hum, the why, or what comes next will not come.

And the ladder for any of them: name the kind of stuck, write three
lines (what you tried, what you expected, what you saw), ask the agent
for a way to understand it rather than the fix, look on the device and
at the last thing that worked, then your trio, then the teacher. About
twenty minutes before the trio is a default each person can move.

## The close

> Answer the two questions on the live page before you go. This week
> your agent starts testing its own work on your device, and your app
> gets a look of its own. Next week, bring a screenshot that proved a
> fix, and your app's new look beside the template's. And this week,
> you will also get the names of two apps from outside your group. Open
> them on your own device, and leave their builders the three
> questions in writing.

## After the session

Read the checks, write your two sentences, and reach out within two
days to anyone who missed the session or brought nothing back. This
week has two more steps.

1. **Check every group, privately.** Ask each person, in a message only
   you see: "Is your group working for you?" Change any group that is
   not, quietly, before week 3.
2. **Set up the look across groups.** Send each person the names of two
   apps from outside their group, so that during week 3 everyone opens
   two classmates' apps on their own device and leaves the three
   questions in writing. Spread the pairings so that every app gets two
   visitors.

Keep asking permission for week 3's prompt situation from anyone who
writes that they are stuck.

Next week, proof that it works.
