# Week 3: proof that it works, and someone else's hands

<!-- This guide: rebuilt from research note 06 (docs/research/curriculum/
06-instructional-design.md, section 4) by Claude, awaiting Ben's review,
October 7, 2026. Ben's own stories and prompts are quoted from the
stages. -->

**Where the cohort is.** Week 2 was [stage 02](../path/02-shape-of-an-app.md)
and [stage 03](../path/03-going-native.md). Everyone read and trimmed a
parity matrix, wrote at least one rule about their data that the
pipeline now enforces, got a second platform running on their own device
in its own idiom, chose a floor from a measurement, and gave the app a
look that comes from its why. Everyone also opened two apps from outside
their group and left the three questions in writing.

Tonight shows that work, and starts the week ahead: [stage
04](../path/04-seeing-it-work.md), where the agent stops relying on the
builder to find its mistakes, and [stage 05](../path/05-shipping.md),
where the app reaches a device the builder did not build it on. This is
the week the app leaves your hands.

Everything tonight points at each learner's own app: they show last
week's work on their own device, hear why an agent's "fixed" is not
evidence, write the prompt that would make their own agent prove one of
its fixes, and leave having sent the first prompt of stage 04 and named
the person who will hold their app this week.

**The agent is never the tester.**

## The move and the question

**Play, then publish.** This week leads with play, because proof comes
from using the app on the device, and ends with publish, because the
week ends with the app in someone else's hands.

The question the whole session turns on: **How do I know it works, and
what happens when someone I did not build it with holds it?**

Every session is one round of Write, Play, Publish at a larger size,
the same three moves as stage 00, and the principles decide what gets
written, played with, and published
([`00-curriculum-design.md`](../research/curriculum/00-curriculum-design.md)).

## The run of show

*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026, in four parts: bring back the stage's work, one thing that unblocks the next stage, start it, and the check).* Generated from [`runs-of-show.json`](runs-of-show.json) by `tools/teaching_tables.py`; change the JSON, then run it.

| Minutes (75) | Scene | Kind | What happens |
|---|---|---|---|
| 0-5 | Arrive | Talk | One line in the chat: the cell in your parity matrix that your own eyes proved wrong. Then what I read in your answers last week, and what I changed. |
| 5-35 | Show what you brought back | Rehearsal rooms | In your group's room. Each person in turn: say what you want to know, show it on the device, and explain one decision with your agent closed (a decision, never the code). The others ask one question to understand it, then answer the three questions: where is it going, how is it going, and what is next. The builder ends by saying what they will do next, and ready or not yet. The prompt: "Show your matrix and the cell your eyes proved wrong, then your app on the oldest device it supports: the newest feature that device will not show, and why the new look fits your people." |
| 35-38 | Break | Break |  |
| 38-45 | Why the agent cannot grade itself | Talk | An agent reports what it intended. "I fixed it" is true about the code and says nothing about the app, and everything short of the real device lies a little: the simulator allows what a real device forbids, and a log line that says "shown" does not mean a person could read it. So the agent does the testing, and the evidence comes from outside it: a picture of the actual screen, a number read from the device, or a person holding it. The agent is never the tester. |
| 45-58 | What would you ask to see? | Design stage | Take one thing your agent said it fixed this week. On the board, write the prompt you would send asking it to prove the fix, and what the screen would look like if the fix had not worked. Then read a partner's, and change yours if theirs asks for better evidence. On the board: *Read one real prompt*. |
| 58-68 | Start | Reflection | Before you leave, send the first prompt of stage 04: ask your agent to prove its next fix on your own device, with a screenshot. Then plan stage 05: the person who will hold your app this week, the device they will hold it on, and the free way it gets there, a link, a test track, or the web. The prompt: "Who will hold your app this week, on which device, and how will it get there for free?" |
| 68-72 | What do you ask to see? | Question | In your own words. Only your leaders read it. The prompt: "When your agent says something is fixed, what do you ask to see, and why is its word not enough?" |
| 72-75 | What is still muddy? | Question | Anything from tonight that is not clear yet. Your leaders read every answer before the next session. The prompt: "What is still muddy for you?" |

**In the rehearsal rooms,** each builder's turn runs these scenes, 8 minutes in all: say what you want to know, then show it on the device (3), explain one decision, agent closed (2), one question, then the three answers (2), what is next, and ready or not yet (1). The room's prompt is on screen the whole time.

**At 60 minutes,** for a cohort of fewer than eight learners, everyone stays in the one call:

| Minutes (60) | Scene | Kind | What happens |
|---|---|---|---|
| 0-4 | Arrive | Talk | One line in the chat: the cell in your parity matrix that your own eyes proved wrong. Then what I read in your answers last week, and what I changed. |
| 4-26 | Show what you brought back | Presenter | With everyone in the call, about five minutes each. Each person in turn: say what you want to know, show it on the device, and explain one decision with your agent closed (a decision, never the code). The others ask one question to understand it, then answer the three questions: where is it going, how is it going, and what is next. The builder ends by saying what they will do next, and ready or not yet. The prompt: "Show your matrix and the cell your eyes proved wrong, then your app on the oldest device it supports: the newest feature that device will not show, and why the new look fits your people." |
| 26-32 | Why the agent cannot grade itself | Talk | An agent reports what it intended. "I fixed it" is true about the code and says nothing about the app, and everything short of the real device lies a little: the simulator allows what a real device forbids, and a log line that says "shown" does not mean a person could read it. So the agent does the testing, and the evidence comes from outside it: a picture of the actual screen, a number read from the device, or a person holding it. The agent is never the tester. |
| 32-43 | What would you ask to see? | Design stage | Take one thing your agent said it fixed this week. On the board, write the prompt you would send asking it to prove the fix, and what the screen would look like if the fix had not worked. Then read a partner's, and change yours if theirs asks for better evidence. On the board: *Read one real prompt*. |
| 43-52 | Start | Reflection | Before you leave, send the first prompt of stage 04: ask your agent to prove its next fix on your own device, with a screenshot. Then plan stage 05: the person who will hold your app this week, the device they will hold it on, and the free way it gets there, a link, a test track, or the web. The prompt: "Who will hold your app this week, on which device, and how will it get there for free?" |
| 52-56 | What do you ask to see? | Question | In your own words. Only your leaders read it. The prompt: "When your agent says something is fixed, what do you ask to see, and why is its word not enough?" |
| 56-60 | What is still muddy? | Question | Anything from tonight that is not clear yet. Your leaders read every answer before the next session. The prompt: "What is still muddy for you?" |

Every scene can be changed on the session's page before it runs, and in the Meet add-on while it runs.

**What to watch for tonight.**

- A second platform that only runs in a simulator.
- A look chosen because the builder likes it, with no line back to the
  people the app is for.
- A "fixed" that the builder has only the agent's word for, with no
  picture of the screen or person who saw it.
- Anyone who has not yet named a person outside the cohort whose device
  the app could reach this week.

## The opening

> Welcome back. Two weeks ago your app was an idea and a problem
> statement. Tonight it runs on two devices and wears its own look. This
> week it leaves your hands, and that changes what "done" means: it is
> no longer done when it works for you. Before you show, say in one line
> what you want your partners to tell you.
>
> After the break, we will take one thing your agent told you it fixed
> this week, and work out what you would ask to see before you believed
> it.

## What they bring back

The cohort's bring-back, from `COURSE.md`: one verb on both platforms,
each in its own idiom, one cell their own eyes proved wrong, and the
app's own look beside the template's. The stages' own lines:

> Be ready to show your matrix and one cell the audit or your own eyes
> proved wrong, and to explain the rule about your data that you decided,
> and why you drew it where you did.

> Be ready to name the oldest device your app will run on and why you
> chose it, the newest feature it will not show there, and why its new
> look fits the people it is for.

**The bar.** For stage 02: "there is a matrix you have read and trimmed,
one rule about your data that you decided and the pipeline now
enforces, and every Share button points at your web address." For stage
03: the second platform is on the student's own device, does the same
things as the first in its own idiom, has a floor chosen from a
measurement, and looks like the student's app rather than the template.

**What to look for.**

- One verb (search, save, share) done on both platforms, with each
  platform's own controls. The same result reached in two different
  ways is right. The same screen squeezed onto a second device is not.
- A matrix with marks on it: rows struck out, cells questioned.
- A rule about the data that the student decided, said in their words,
  with the reason it sits where it does.
- A floor chosen from what the agent measured.
- A look that came from choosing among directions, explained by who the
  app is for.

**Signs of "not yet."** A matrix nobody has read. "The agent picked the
floor." An app that still wears the template's colors and type.

## Show what you brought back

*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026).*

Send the groups to their rehearsal rooms with the prompt on screen, and
someone in each room keeping time. Each builder says in one line what
they want to know, then shows their matrix with the cell their own eyes
proved wrong, and the app running on the oldest device it supports,
naming the newest feature that device will not show and why the new
look fits the people it is for. They explain one decision with the
agent closed, their partners ask one question before answering the
three, and the builder ends with what is next, and ready or not yet.
Visit the rooms, say so as you arrive, and listen for the bars and the
signs of "not yet" above, especially a second platform shown only in a
simulator, which is exactly what the talk after the break is about.

In the 60-minute version there are no rooms: everyone stays in the
call, each person gets about five minutes, and the whole cohort plays
the partners, so keep the question and the three answers to one or two
voices each.

## Why the agent cannot grade itself

*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026).*

A short talk, taken from [stage 04](../path/04-seeing-it-work.md)'s
section of the same name. An agent reports what it intended, so "I
fixed it" is true about the code and says nothing about the app, and
everything short of the real device lies a little: a simulator lets the
app write where a real Apple TV forbids it, and a log line that says
"caption shown" does not mean a person could read it. So the agent does
the testing, and the evidence comes from outside it, a picture of the
actual screen, a number read from the device, or a person holding it.
If there is time, name the rungs of stage 04's ladder (doors,
simulators, real devices, a person) and say that the agent should use
the cheapest rung that can actually see the bug.

One story from stage 04 makes the point well. In Bsky Dreams' first
month the feed was showing posts twice, the agent had tried three fixes
that did not work, and it was still saying they did, so the prompt
stopped asking for a fourth fix and asked for a way to see the problem:

> You have clearly not found the root cause of the issue, nor are you
> actually testing to make sure that it is fixed before telling me
> that it works. Please create a test for how you will determine if a
> post is rendered a signgle time and continue to work until your
> code passes that test.

End by asking everyone to think of one thing in their own app they have
taken the agent's word for, because that is what they bring to the
board next. The talk is the same in the 60-minute version, a minute
shorter.

## What would you ask to see?

*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026).*

Put up the board from the *Read one real prompt* template, but tonight
every learner fills it from their own app rather than from someone
else's situation. Each person picks one thing their agent said it fixed
this week, writes the prompt they would send asking it to prove the fix
on their device, and writes what the screen would look like if the fix
had not worked. Then they read a partner's and change their own if the
partner's asks for better evidence. The second line is the one to watch
for, because a person who can say what failure would look like has a
test that could fail, and a prompt that only says "make sure it works"
still leaves the agent grading itself. In the 60-minute version the
partners are whoever sits next to them on the board, and you can read
one or two aloud to the whole call.

## Start

*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026).*

Everyone sends the first prompt of [stage 04](../path/04-seeing-it-work.md)
before they leave, asking their agent to prove its next fix on their own
device with a screenshot, and one phone is enough. The prompt from the
board is usually the right one to send. Then they plan [stage
05](../path/05-shipping.md) by answering the prompt on screen: who will
hold the app this week, on which device, and how it gets there for
free, a link, a test track, or the web (stage 05's "Sharing it for
free" says what each free way costs, and the web version is the only
free way to reach someone's iPhone).

While they plan, say the one thing that makes the person worth asking:
give them one thing to do, then watch without explaining, and write
down what they did, where they paused, and what they said, in their
words. The urge to explain is strong, and every explanation hides
something the person would have found confusing, so ask everyone to
write the one thing they will ask their person to do. This scene runs
the same way in both versions, with a room open, or in the 60-minute
version a few minutes after, for anyone whose prompt gets stuck.

## The check

The question scenes at the end of the run of show, answered privately,
and shown on the main stage without names only if you choose:

1. **When your agent says something is fixed, what do you ask to see,
   and why is its word not enough?** (in their own words).
2. **What is still muddy?** (in their own words).

**Also prepared:** "How do you know your last fix is real?"

The answer you hope for names evidence from outside the agent: a
screenshot from the device, a measurement, or a test that could have
failed. An answer that trusts the agent's report is worth a word.

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
at the last thing that worked, then your trio, then the teacher. About
twenty minutes before the trio is a default each person can move.

## The close

> Answer the questions on the live page before you go. Next week, bring
> a screenshot that proved a fix, and your app on a device you did not
> build it on, with what that person did and said, in their own words,
> in your note.

## After the session

Read the checks, write your two sentences, and reach out within two
days to anyone who missed the session or brought nothing back. Week 4 is also the first of the
sessions where you look closely at every bring-back, so set aside time
the day after it.

Next week, the app in someone else's hands.
