# Week 2: the first app, and the same app on a second device

<!-- This guide: rebuilt from research note 06 (docs/research/curriculum/
06-instructional-design.md, section 4) by Claude, awaiting Ben's review,
October 7, 2026. Ben's own stories and prompts are quoted from the
stages. -->

**Where the cohort is.** Week 1's session launched the search for a
problem, and the week that followed was [stage
00](../path/00-why-we-build.md) and [stage
01](../path/01-first-prototype.md). Everyone held candidates to the ten
tests, wrote a problem statement in the form of my published examples,
revised it after critique and two real conversations, wrote the why
into `AGENTS.md`, posted the problem where other people can read it, and
then put the smallest real version of the app, with real data, in the
hands of one of the people they talked to.

So tonight is the first bring-back of the cohort, and it is the one that
answers the question week 1 asked: is this problem worth building for,
and did one real person find the first version useful? Then the session
starts the week ahead, which is [stage 02](../path/02-shape-of-an-app.md)
and [stage 03](../path/03-going-native.md): deciding what "the same
app" means, and giving it a second home.

**The same verb, in each platform's own idiom.**

## The move and the question

**Play.** This week leads with play: the second platform is built in
rounds, used on the device, written down, and numbered, until it does
the same things as the first in its own way.

The question the whole session turns on: **What has to be the same on
every device, and what should feel as if it was born there?**

Every session is one round of Write, Play, Publish at a larger size,
the same three moves as stage 00, and the principles decide what gets
written, played with, and published
([`00-curriculum-design.md`](../research/curriculum/00-curriculum-design.md)).
Tonight's publish is the bring-back. The write is the data rule and the
verb each person names. The play starts before they leave.

## The run of show

*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026, in four parts: bring back the stage's work, one thing that unblocks the next stage, start it, and the check).* Generated from [`runs-of-show.json`](runs-of-show.json) by `tools/teaching_tables.py`; change the JSON, then run it.

| Minutes (75) | Scene | Kind | What happens |
|---|---|---|---|
| 0-5 | Arrive | Talk | One line in the chat: what the person you talked to did first with your app, or what is in the way. Then what I read in your answers last week, and what I changed. |
| 5-35 | Show what you brought back | Rehearsal rooms | In your group's room. Each person in turn: say what you want to know, show it on the device, and explain one decision with your agent closed (a decision, never the code). The others ask one question to understand it, then answer the three questions: where is it going, how is it going, and what is next. The builder ends by saying what they will do next, and ready or not yet. The prompt: "Read your problem statement and the version before it, then show the app on your phone: what the real data taught you, and what the person you talked to did with it." |
| 35-38 | Break | Break |  |
| 38-45 | Two layers | Talk | Every app built from the template has two layers. The data plane holds what is the same everywhere (what exists, what is allowed, and what it is called), and it is built once. The native layer holds what should feel born on each device: its controls, its gestures, and its look. Archive Watch's contract says it in one line: no client re-implements or re-hosts any part of the pipeline. Tonight you sort your own app into those two layers. |
| 45-58 | One verb, twice | Design stage | Write the one thing your app must do on every device. Then draw it twice: once on the device you started with, and once on the device your people reach for next, each with that device's own controls. Mark what lives in the data and what lives in the device. On the board: *Blank*. |
| 58-68 | Start | Reflection | Write the one rule about your data that every platform must follow. Then, before you leave, send the first prompt of stage 02: ask your agent to read your parity matrix with you and trim what your app does not need. Stage 03, a second platform that feels born there, follows once the matrix is honest. The prompt: "What is the first prompt of stage 02 you sent tonight?" |
| 68-72 | Data, or idiom? | Question | The prompt: "Which of these belong in the data, so every platform gets them the same way? Choose every one." |
| 72-75 | What is still muddy? | Question | Anything from tonight that is not clear yet. Your leaders read every answer before the next session. The prompt: "What is still muddy for you?" |

**In the rehearsal rooms,** each builder's turn runs these scenes, 8 minutes in all: say what you want to know, then show it on the device (3), explain one decision, agent closed (2), one question, then the three answers (2), what is next, and ready or not yet (1). The room's prompt is on screen the whole time.

**At 60 minutes,** for a cohort of fewer than eight learners, everyone stays in the one call:

| Minutes (60) | Scene | Kind | What happens |
|---|---|---|---|
| 0-4 | Arrive | Talk | One line in the chat: what the person you talked to did first with your app, or what is in the way. Then what I read in your answers last week, and what I changed. |
| 4-26 | Show what you brought back | Presenter | With everyone in the call, about five minutes each. Each person in turn: say what you want to know, show it on the device, and explain one decision with your agent closed (a decision, never the code). The others ask one question to understand it, then answer the three questions: where is it going, how is it going, and what is next. The builder ends by saying what they will do next, and ready or not yet. The prompt: "Read your problem statement and the version before it, then show the app on your phone: what the real data taught you, and what the person you talked to did with it." |
| 26-32 | Two layers | Talk | Every app built from the template has two layers. The data plane holds what is the same everywhere (what exists, what is allowed, and what it is called), and it is built once. The native layer holds what should feel born on each device: its controls, its gestures, and its look. Archive Watch's contract says it in one line: no client re-implements or re-hosts any part of the pipeline. Tonight you sort your own app into those two layers. |
| 32-43 | One verb, twice | Design stage | Write the one thing your app must do on every device. Then draw it twice: once on the device you started with, and once on the device your people reach for next, each with that device's own controls. Mark what lives in the data and what lives in the device. On the board: *Blank*. |
| 43-52 | Start | Reflection | Write the one rule about your data that every platform must follow. Then, before you leave, send the first prompt of stage 02: ask your agent to read your parity matrix with you and trim what your app does not need. Stage 03, a second platform that feels born there, follows once the matrix is honest. The prompt: "What is the first prompt of stage 02 you sent tonight?" |
| 52-56 | Data, or idiom? | Question | The prompt: "Which of these belong in the data, so every platform gets them the same way? Choose every one." |
| 56-60 | What is still muddy? | Question | Anything from tonight that is not clear yet. Your leaders read every answer before the next session. The prompt: "What is still muddy for you?" |

Every scene can be changed on the session's page before it runs, and in the Meet add-on while it runs.

**What to watch for tonight.**

- A problem statement that has not changed since week 1's session. The
  conversations should have moved it, even by a word.
- "My friend liked it," with nothing about what the person did. What
  they did first is the evidence; what they said about it comes second.
- A first version that grew past the smallest thing. It is not wrong,
  but ask what the person used, and what nobody touched.
- A second-device drawing that is the first screen squeezed smaller or
  stretched wider, rather than something that device's own people would
  recognize.
- A rule about the data that is really about the look ("the button is
  blue"), which belongs to each device, not to the data.
- A first prompt of stage 02 that is written in the note but not yet
  sent to the agent.

## The opening

> Welcome back. Last week was the first time anyone in this cohort had
> to say what problem they were building for, out loud, to people they
> had just met, and then go and ask strangers about it. That is harder
> than anything the agent did this week. Tonight is the first
> bring-back. Before you show, say in one line what you want your
> partners to tell you. "Does my problem statement say who has it?"
> gets you a better answer than "What do you think?"

## What they bring back

The cohort's bring-back, from `COURSE.md`: the problem statement and the
version before it, what they heard in their two conversations, the why,
the one rule, and the app on their phone, with what the real data
taught them and what the person they talked to did with it. The stages'
own lines ask for the same:

> Be ready to share your problem statement and the version before it, what
> you heard in your two conversations, your "why we build" paragraph, and
> your one rule, and to explain why you drew that line where you did and
> what it will cost you.

> Be ready to show the app on your phone, to name one thing the real data
> taught you that fake data would have hidden, to say what the person you
> talked to did with it and whether it did what your problem statement
> says, and to explain why you started on the platform you chose.

**The bar.** For stage 00: the note starts with a problem statement in
the student's own words, revised after critique and after two real
conversations, with who has it and why a computer cannot simply solve
it, and the problem is posted where other people can read it. For stage
01: the app is live at a real address, full of real data a pipeline
brought in, after at least two rounds from the student's own phone, and
one of the people they talked to has used it.

**What to look for.**

- Two versions of the problem statement, and a reason for the change
  that came from a conversation.
- A conversation note about a specific past time ("the last time you
  tried to..."), not an opinion about the idea
  ([note 06, finding a problem worth solving](../research/curriculum/06-instructional-design.md)).
- The app on a real phone, at a real address, with real items in it.
- What the person did first, written in their words, and a sentence on
  whether it matched the problem statement.

**Signs of "not yet."** A problem statement that names a feature
instead of a problem. Conversations that were really pitches. An app
that only exists on the builder's computer. Typed-in sample data.

## Show what you brought back

*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026).*

Each group goes to its room with the prompt on screen, and each person
takes about eight minutes, with someone in the group keeping time. They
say in one line what they want to know, read their problem statement and
the version before it, and then show the app on their phone, naming what
the real data taught them and what the person they talked to did with
it. The decision they explain with the agent closed is one the stages
ask for: why they drew their one rule where they did, or why they
started on the platform they chose. Their partners ask one question
before saying anything, then answer where it is going, how it is going,
and what is next, and the builder ends with what they will do next and
whether stages 00 and 01 are ready or not yet. A partner who saw the app
in their own hand can confirm "ready," because the app on a device is
evidence and "it works" is only a claim.

You visit the rooms, say so as you arrive so that nobody stops to
perform, and listen for one thing that comes up in more than one group,
which you can name when everyone is back together. At 60 minutes there
are no rooms: everyone stays in the call and presents in turn, about
five minutes each, so you keep the time yourself and the whole call
answers the three questions, which means keeping each answer to a line.

## Two layers

*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026).*

This is the one thing that unblocks stage 02, and it is a short talk
(seven minutes, or six at 60), drawn from stage 02's "Two layers." Every
app built from the template has a data plane, built once, that decides
what exists, what is allowed, and what it is called, and a native layer
on each device that carries its controls, its gestures, and its look.
Put Archive Watch's line on screen, "No client re-implements or
re-hosts any part of the pipeline," and tell the Roku story from the top
of stage 02 in a sentence or two: the web quietly coped with a broken
record and hid it, and the platform that trusted the data was the one
that crashed. That is why the rule about the data is written down before
a second platform exists.

End the talk by turning it toward their own apps, which is what the
next scene does: everyone already has one platform with real data in it,
so ask them to think, as you finish, which of their app's answers would
be wrong if a second device worked them out for itself. Listen
afterward for anyone who hears "two layers" as front end and back end;
the point is which decisions are made once, not where the code runs.

## One verb, twice

*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026).*

Put the board on the main stage from the *Blank* template, with everyone
in the one call in both versions of the session. Each person writes the
one thing their app must do on every device (search, save, play,
answer), then draws it twice: on the device they started with, and on
the device their people reach for next, each with that device's own
controls. Then they mark which parts live in the data and which live in
the device.

Choosing the second device belongs here. Stage 03's order is a model,
not an answer: Archive Watch began on the Apple TV because an app for
watching old films on a couch belonged where its people were, and the
others followed once the data was clean. Ask each person where the two
people they talked to already reach, and draw that one. Stage 02's line
is "Same verb, native idiom," so point at any drawing that is the first
screen squeezed smaller, and ask what that device's people already know
how to do. Expect a few minutes fewer at 60 (eleven instead of
thirteen), which is enough for the verb and two small drawings.

## Start

*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026).*

Everyone writes, from the marks on their drawing, the one rule about
their data that every platform must follow, and then sends the first
prompt of [stage 02](../path/02-shape-of-an-app.md) before they leave:
telling the agent every platform they plan to reach, including the
device they just drew, and asking it to write the parity matrix for
everything the app already does, so they can read it together and trim
what the app does not need. My own prompt from June 10 is a fair
model to put on screen: "continue working on our parity matrix across
all platforms to make sure we can launch on all platforms with the same
features across the board." In Claude Code, plan mode lets them read the
promises before anything is built, and in Antigravity, `/plan` does the
same. [Stage 03](../path/03-going-native.md), the second platform that
feels born there, follows once the matrix is honest.

Keep a room open for anyone who gets stuck sending it, and read the
reflection's answers ("What is the first prompt of stage 02 you sent
tonight?") as they arrive. A prompt that asks the agent to build the
second platform tonight has skipped the matrix, and a rule about how
something looks has put an idiom in the data; either is worth a word
before the week starts. At 60 minutes this scene runs nine minutes
instead of ten.

## The check

*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026).*

The two question scenes, answered privately, and shown on the main stage
without names only if you choose:

1. **Data, or idiom? Which of these belong in the data, so every
   platform gets them the same way? Choose every one.** (any that fit).
   Choices: a film's title and year; whether a film is saved; a trivia
   question's correct answer; swipe to go back; the size of the play
   button.
2. **What is still muddy?** (in their own words).

The answer you hope for to the first puts the title, the saved state,
and the correct answer in the data, and leaves the gesture and the
button size to each platform. Anyone who chose the gesture is worth a
word before stage 02's matrix, and so is anyone whose Start answer
named a rule about the look.

## The task, and its evidence

**The task, this week.** Read and trim the parity matrix, write one rule
about your data that the pipeline now enforces, run a second platform on
your own device in its own idiom, and give the app a look that comes
from its why (stage 03's last steps).

**Evidence a person can open.** The matrix with one cell your own eyes
proved wrong; the rule in the data contract; the second platform on your
device; the look beside the template's.

**On the credential.** Recognitions: "Took another round instead of
shipping a first draft," and, from tonight's bring-back, "Asked for
feedback and used it" and "Wrote down what they value." Students do the thing itself, and what they make is
the evidence; nobody writes a report about it
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
at the last thing that worked, then your trio, then the teacher. About
twenty minutes before the trio is a default each person can move.

## The close

> Answer the questions on the live page before you go. This week your
> app gets a second home, in its own idiom, and a look that comes from
> its why. Next week, bring your matrix with one cell your eyes proved
> wrong, the rule about your data and why you drew it there, and the
> second platform on your device, with its new look beside the
> template's.

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

Next week, the second platform, and proof that it works.
