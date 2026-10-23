# Week 1: finding a problem worth building for

<!-- Written by Claude, awaiting Ben's review. Rebuilt on October 7, 2026,
from docs/research/curriculum/06-instructional-design.md, section 3, which
Ben approved as the basis for the curriculum (site DECISIONS.md, "Note 06
is the basis for the curriculum"). It replaces the first version of this
guide, which Ben rejected (site DECISIONS.md, "The first lessons missed"). -->

*Written by Claude, awaiting Ben's review (from research note 06, October 7, 2026).*

**Where the cohort is.** Everyone has kept a noticing log for five days,
one line whenever one of its four prompts happened: "I wished something
worked differently," "I gave up on something I care about," "I did
something the long way because nothing helped," or "someone I know
struggled with the same thing." Nobody has chosen a problem, and nobody
has an idea for an app yet. That is on purpose. None of my apps began as
an idea for an app. Each began with part of my life that kept bothering
me, and I wrote down why it mattered and looked around before I built
anything ([`01-mining-bens-process.md`](../research/curriculum/01-mining-bens-process.md),
phases 1 and 2).

Tonight turns those logs into one problem each, written from a line in
the log and held to real tests, with the names of two people who might
share it and the first question to ask them. The week after tonight
takes it outside the screen: it is
[stage 00](../path/00-why-we-build.md) and [stage
01](../path/01-first-prototype.md), the problem tested in two real
conversations and then the smallest real version of the app in the
hands of one of those people.

**Find the problem before the app.**

## The move and the question

**Write.** This week leads with writing: from the log, to one problem
statement, to a version revised after two real conversations. Playing
comes in the middle, when the group asks about what happened in each
log and when each problem is held to the tests, and then again in the
week, when the first version of the app is in someone's hands.
Publishing comes at the end of the week, when each person shares their
problem, who has it, and why a computer cannot simply solve it for them.

The question the whole week turns on, the driving question for the
project: **What problem in your own life is worth building something
for, and who else has it?**

It comes straight from my definition of a human-shaped problem and from
the first principle, which asks that the builder has "written down what
the problem is, who has it, and why a computer cannot simply solve it
for them" ([`PRINCIPLES.md`](../human-shaped/PRINCIPLES.md), principle
1). It names who acts (you), what you make (a problem worth building
for), and who it is for (you, and the others who have it), which is
how PBLWorks builds a driving question
([Driving Question Tubric](https://my.pblworks.org/resource/document/driving_question_tubric)).

Every session is one round of Write, Play, Publish at a larger size,
the same three moves as stage 00, and the principles decide what gets
written, played with, and published
([`00-curriculum-design.md`](../research/curriculum/00-curriculum-design.md),
[`06-instructional-design.md`](../research/curriculum/06-instructional-design.md)).

## The run of show

*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026, in four parts: bring back the stage's work, one thing that unblocks the next stage, start it, and the check).* Generated from [`runs-of-show.json`](runs-of-show.json) by `tools/teaching_tables.py`; change the JSON, then run it.

| Minutes (75) | Scene | Kind | What happens |
|---|---|---|---|
| 0-5 | Arrive | Talk | One line in the chat from your noticing log: the one you keep thinking about. Then what I read in your answers last session, and what I changed because of them. |
| 5-29 | Show what you brought back | Rehearsal rooms | In your group's room, each person reads from the log they kept for five days. The prompt: "Read three lines from your noticing log, say which one you keep coming back to, and why. Questions are about what happened, never about an app." |
| 29-32 | Break | Break |  |
| 32-39 | Computer-shaped and human-shaped | Talk | A computer-shaped problem is one a database and some code can take control of: counting, sorting, reminding. A human-shaped problem is something in your life that has gone unsolved for months or years, that you wonder about often, and that you cannot do yourself with the tools you have. It is about people's stories more than data points. This week you choose one, and your agent stays closed until you have, because the problem has to be yours before anyone helps. |
| 39-53 | Hold one to the tests | Design stage | With your agent closed, take the log line you keep coming back to and write it as a problem: what happens in your life, then "I need something that..." Put it on the board and hold it to the ten tests in stage 00, marking each yes, not yet, or I don't know. A "not yet" is the next thing to find out, not a failure. On the board: *Problem tests*. |
| 53-65 | Start | Reflection | Before you leave, name two people who might have this problem, and write three questions for them that each start "Tell me about the last time you..." Do not describe an app. This week is stage 00, then stage 01 once your problem holds: the smallest real version, live with real data, in the hands of one of those two people. The prompt: "Who are the two people you will talk to this week, and what is your first "Tell me about the last time you..." question?" |
| 65-70 | Who else has it? | Question | Only your leaders see your answer. The prompt: "How sure are you, right now, that someone besides you has this problem?" |
| 70-75 | What is still muddy? | Question | Anything from tonight that is not clear yet. Your leaders read every answer before the next session. The prompt: "What is still muddy for you?" |

**In the rehearsal rooms,** each builder's turn runs these scenes, 7 minutes in all: read three lines from your log (3), the one you keep coming back to, and why (2), one question about what happened (2). The room's prompt is on screen the whole time.

**At 60 minutes,** for a cohort of fewer than eight learners, everyone stays in the one call:

| Minutes (60) | Scene | Kind | What happens |
|---|---|---|---|
| 0-4 | Arrive | Talk | One line in the chat from your noticing log: the one you keep thinking about. Then what I read in your answers last session, and what I changed because of them. |
| 4-24 | Show what you brought back | Presenter | With everyone in the call, about five minutes each: read three lines from the log you kept for five days, say which one you keep coming back to and why, and hear one question about what happened. The prompt: "Read three lines from your noticing log, say which one you keep coming back to, and why. Questions are about what happened, never about an app." |
| 24-30 | Computer-shaped and human-shaped | Talk | A computer-shaped problem is one a database and some code can take control of: counting, sorting, reminding. A human-shaped problem is something in your life that has gone unsolved for months or years, that you wonder about often, and that you cannot do yourself with the tools you have. It is about people's stories more than data points. This week you choose one, and your agent stays closed until you have, because the problem has to be yours before anyone helps. |
| 30-42 | Hold one to the tests | Design stage | With your agent closed, take the log line you keep coming back to and write it as a problem: what happens in your life, then "I need something that..." Put it on the board and hold it to the ten tests in stage 00, marking each yes, not yet, or I don't know. A "not yet" is the next thing to find out, not a failure. On the board: *Problem tests*. |
| 42-52 | Start | Reflection | Before you leave, name two people who might have this problem, and write three questions for them that each start "Tell me about the last time you..." Do not describe an app. This week is stage 00, then stage 01 once your problem holds: the smallest real version, live with real data, in the hands of one of those two people. The prompt: "Who are the two people you will talk to this week, and what is your first "Tell me about the last time you..." question?" |
| 52-56 | Who else has it? | Question | Only your leaders see your answer. The prompt: "How sure are you, right now, that someone besides you has this problem?" |
| 56-60 | What is still muddy? | Question | Anything from tonight that is not clear yet. Your leaders read every answer before the next session. The prompt: "What is still muddy for you?" |

Every scene can be changed on the session's page before it runs, and in the Meet add-on while it runs.

**What to watch for tonight.**

- A problem that is really a measurement or a ranking, with nobody's
  story in it. Ask about it with a question, not a verdict: "Who is in
  this, and what happens to them?"
- A problem statement that names a technology ("an app that uses AI
  to...") instead of a situation in someone's life.
- A log line that is already an app idea ("an app that..."). Steer it
  back to what happened: "When did you last wish for that, and what
  were you doing?"
- A group where the questions drift from what happened toward what the
  app should do, or where nobody asks a question and only gives advice.
- Questions for the two conversations that describe an app or ask what
  someone would do, instead of asking about the last time it happened.
- Anyone who arrives without a log. Give them the four prompts and five
  minutes to write from memory. Most people can remember a week.

## The opening

> Welcome back. Here is what I read in last week's answers: [what you
> heard], and so [what you changed]. Tonight you will not build
> anything. Everything we make this week starts with a problem, and the
> problem starts with your log, so I want you to keep it open the whole
> session. By the end of tonight, each of you will have one problem from
> your own life written as well as you can write it, held up against
> some real tests, and two people outside this call you are going to
> talk to about it. Let's start with one line from your log, in the chat,
> one you don't mind sharing.

## What they bring back

The noticing log, five days of it, started at the end of the
[week before](before.md). Nobody shows the whole log, and nobody is
asked to. It is the raw material for the session, and each person
decides which lines leave it.

**What to look for.** Lines about what happened, not ideas for apps.
Lines that come back more than once across the five days, because a
thing that keeps happening is closer to my definition ("something that
has gone unsolved for months or even years") than a thing that happened
once. Lines about someone else, because human-shaped problems are
rarely one person's alone.

**Signs of "not yet."** A log that is a list of app ideas. A log with
nothing in it but "nothing happened." Neither is a problem tonight. The
first is the habit the log is meant to break, and the second is what
the prompts on screen are for.

## Show what you brought back

*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026).*

This is the cohort's first bring-back, and what comes back is the log
rather than anything on a device, because there is nothing to build
yet. Send everyone to their group's room with the prompt on screen. In
turn, each person reads three lines from their log, says which one they
keep coming back to and why, and then hears one question from the other
two about what happened. The other parts of a bring-back, from
[Showing your work](../path/showing-your-work.md), wait until there is
an app to show; tonight the one question is the whole of the feedback,
and it is about the person's life, never about an app. Say that before
the rooms open, and visit the rooms the way you always will, saying so
as you arrive so that nobody stops to perform.

Listen for two things. The first is a line that is already an app idea,
which is the habit the log is meant to break: ask when it last happened
and what the person was doing, until the line is about the situation
again. The second is a line that comes back across several days, or
that is about someone else, because both are closer to a human-shaped
problem than a thing that happened once. Note anything you hear in more
than one room, to name when everyone is back.

**At 60 minutes,** everyone stays in the one call, and each person takes
about five minutes on the main stage with the same prompt, with one
question from anyone in the call.

## Computer-shaped and human-shaped

*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026).*

This is the one thing that unblocks the week: knowing the difference
between a problem a computer can take control of and one that belongs
to people, before choosing a problem to build for. Say it in about
seven minutes, from [stage 00](../path/00-why-we-build.md). Start with
software brain, Nilay Patel's name for seeing the world as databases
waiting for the right code, and the habit's pull, that making
everything into something you can feed the agent is "so seductive and
more than a little thrilling." Then read my definition of a human-shaped
problem, and set my four computer-shaped problems beside it by their
first verbs: measure, find the best price, categorize, map
([`computer-shaped-problems.md`](../human-shaped/computer-shaped-problems.md#computer-shaped-and-human-shaped)).

Make it point at the app each person will build. The example from the
stage is Archive Watch's film notes: a blurb for ten thousand films is
cheap for a model, and a pipeline that pulls each film's notes from the
people who uploaded and reviewed it is not, so the agent will reach for
the blurb unless someone wrote down otherwise. My one line about it is
worth reading aloud: "I don't want AI making lists and writing copy.
Any time we can use metadata or user copy/categorization from
archive.org." Nobody has to agree with me. The point is that every app
in the cohort will meet that choice, and that the problem has to be the
learner's own before the agent helps, which is why it stays closed
until the end of tonight.

## Hold one to the tests

*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026).*

Alone, with the agent closed, each person takes the log line they keep
coming back to and writes it as a problem in the form of my published
examples: what happens in their life, in the first person, then "I need
something that..." and what a better life would look like, without
naming a technology
([`problem-statements.md`](../human-shaped/problem-statements.md)).
Then they put it on the design stage, from the *Problem tests*
template, and hold it to the ten tests from stage 00, marking each yes,
not yet, or I don't know:

1. Solving it would make my life better, happier, or more resonant.
2. I wonder and question about it often.
3. It has gone unsolved for months or even years.
4. I cannot solve it myself with the tools and resources I have now.
5. Real people have it, and I can name them.
6. It is not mine alone. Other people would know it when they heard it.
7. A computer cannot simply solve it for me.
8. It is about people's stories, not about data points.
9. Solving it would not make a new problem for someone else.
10. At least one person would be glad of even a first version.

Say this out loud: a "not yet" or an "I don't know" is not a failure but
the next thing to find out, and most of them are answered by talking to
people, which is what the next scene sets up. Nobody's problem passes
or fails tonight. Walk the board and watch for a statement that names a
technology ("an app that uses AI to...") or that is really a measurement
or a ranking with nobody's story in it, and ask what happens in their
life instead. In the 60-minute version the scene is the same, with the
whole call on one board.

## Start

*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026).*

Nobody leaves without the first step of stage 00 already taken. For
this week that step is not a prompt to the agent but the plan for two
conversations: each person names two people who might have this
problem, and writes three questions for them, then answers the scene's
prompt with the two names and the first question. The rules for the
questions come from the stage: ask about a specific time in the past,
never about what someone usually does or would do, ask why, listen more
than you talk, and never describe an app (Stanford d.school's interview
guidance and Rob Fitzpatrick's *The Mom Test*, both gathered in
[`06-instructional-design.md`](../research/curriculum/06-instructional-design.md)).
A good first question starts "Tell me about the last time you..." and
then stops, because the stories are what the problem is made of.

Read the answers as they come in, and help anyone whose question
pitches an app or asks for a prediction to turn it into one about the
last time. Then say what the rest of the week is: stage 00, and stage
01 once the problem holds, which is the smallest real version of the
app, on one platform and live with real data, in the hands of one of
those two people. The agent opens after the conversations, not before.

## Between tonight and next week

This is the rest of the week's round, done on their own and with their
agent:

1. **Have the two conversations.** Write notes in your own words, and
   keep them private unless you choose to share them.
2. **Revise the problem statement** with what you heard. Then write who
   has it, and why a computer cannot simply solve it for them.
3. **Write the why with your agent,** in
   [stage 00](../path/00-why-we-build.md): tell the agent why the app
   should exist and have it draft the "Why we build" paragraph in
   `AGENTS.md` until it sounds like you, name one line it will not
   cross, ask the three questions of the idea, and have the agent make
   the strongest case against it on behalf of the people outside the
   screen.
4. **Publish** a short post to the cohort: your problem, who has it, and
   why a computer cannot simply solve it. If you like, send it back to
   the two people you talked to.
5. **Build the smallest real version,** in
   [stage 01](../path/01-first-prototype.md), once the problem holds:
   one platform, real data, this week, live at an address you can open
   on your phone, and in the hands of one of the two people you talked
   to.

## The check

The question scenes at the end of the run of show, answered privately,
and shown on the main stage without names only if you choose:

1. **How sure are you, right now, that someone besides you has this
   problem?** (a scale of 5, from "Not sure at all" to "I could name
   them").
2. **What is still muddy?** (in their own words).

The scale is not a score. It tells you who is going into the
conversations with a guess and who is going in with names, and the
people at the low end are the ones to write to first.

**Also prepared,** in the cohort's question bank: "Which of these does
your problem statement do?" (several choices, from the things my
published examples do), and "Which questions for your two conversations will tell
you the most?" (a ranking).

## The task, and its evidence

**The task.** Turn a line from your log into one problem statement in
the form of my published examples, hold it to the tests, have two
conversations about it with people who might share it, and revise it
with what you heard. Then write the why, publish your problem, who has
it, and why a computer cannot simply solve it, and put the smallest
real version of the app in the hands of one of those two people.

**Evidence a person can open.** The problem statement, first version
and revised, kept in the app's note and the repository. Notes from two
conversations, each about a specific time in the past, which stay with
the student unless they choose to share them. The "Why we build"
paragraph in `AGENTS.md`, with one line the app will not cross, dated
and in the student's words. The published post. Together these are the
first principle's own evidence ([`PRINCIPLES.md`](../human-shaped/PRINCIPLES.md),
principle 1, "How you can tell"), and the first entries in the
credential's record.

**On the credential.** Recognitions this week can name "Asked for
feedback and used it," for a statement revised after the two
conversations; "Helped a classmate see their work more clearly," for a
question in the group that turned someone's log line back toward what
happened; and "Wrote
it in their own voice," for a problem statement nobody could mistake
for anyone else's. Students do the thing itself, and what they make is
the evidence; nobody writes a report about it
([`05-inquiry-and-evidence.md`](../research/curriculum/05-inquiry-and-evidence.md)).

## When someone is stuck

Every entry in the [stuck library](../stuck/README.md) starts with a
question to ask yourself, then what to try, then who to ask. This week,
point people to:

- [Stuck writing](../stuck/writing/README.md), for when no line in the
  log looks like a problem, the statement will not come, or the
  conversations feel too awkward to ask for.
- [Stuck publishing](../stuck/publishing/README.md), for when sharing
  the problem with the cohort feels too exposed.

And the ladder for any of them: name the kind of stuck, write three
lines (what you tried, what you expected, what you saw), look at the
last thing that worked, then your group, then the teacher. This week
most of it happens with the agent closed, so the first rung is usually
the log itself: read it again from the start.

## The close

> Answer the two questions on the live page before you go, and I will
> read every one. This week, have your two conversations before you
> write anything else. Ask about the last time it happened, and listen
> for the story. Then come back to your statement, and let what you
> heard change it.

## After the session

Read the checks and write your two sentences. Reach out within two days to anyone who missed the
session, came without a log, or put themselves at the low end of the
scale, and offer to help them find their two people.

Next week, everyone brings back a problem that has met real people,
and the first version of the app on their phone.
