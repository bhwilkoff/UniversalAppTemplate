# Week 4: the app on someone else's device

<!-- Reconciled to COURSE.md's week map by Claude, awaiting Ben's review,
October 7, 2026: this session shows stages 04 and 05 and launches 06 and
07. -->

**Where the cohort is.** Week 3 was [stage 04](../path/04-seeing-it-work.md)
and [stage 05](../path/05-shipping.md). The agent started proving its
fixes with screenshots from the builder's own devices, and everyone's app
left their hands. Some went through a store, and more went through a
test track or a direct share, which cost nothing. Each builder watched
one person hold it without helping, and shipped one change because of
what that person did. Stage 05's line is "A feature nobody can install
is unfinished."

Tonight shows that work, and starts the week ahead: [stage
06](../path/06-keeping-it-running.md), one honest number about how the
app is doing out in the world ("A confident zero is worse than no
dashboard"), and [stage 07](../path/07-raising-the-ceiling.md), a log
kept while living with the app that ends in one feature the builder
wants.

This is the first of the two weeks when the teacher looks closely at
every bring-back, because it is the first time the app has been in the
hands of someone who did not build it, and what that person said is
worth more than anything the builder could say about it.

**Shipped means someone else can install it.**

## The move and the question

*Written by Claude, awaiting Ben's review (rebuilt by the method of
curriculum research note 06, October 7, 2026).*

**Publish, then write.** This week leads with publishing: tonight the
app is shown in someone else's hands, and in the week ahead an honest
number goes back to its people. Then it writes: a log of what the
builder wants, kept while using the app.

The question the whole session turns on, in plain words: **What is
happening to it when I am not holding it, and what do I want now that I
live with it?**

The session is designed backward
([note 06](../research/curriculum/06-instructional-design.md), section 4)
from two things: tonight's bring-back (the screenshot that proved a fix,
the app in someone else's hands, what they did first beside the guess
the student wrote, and one change made because of it) and next week's
(one honest number taken back to a person, and one feature from the
student's own use). Ben's own material is what students reason with
tonight: the forty-one versions Archive Watch had verified and shipped to
nobody (stage 05), which sits behind the bring-back, and the rules Pulse
follows for an honest number (stage 06), which the talk after the break
turns into each person's choice of number. Neither is an answer to
repeat. Each is a test the student holds their own app to.

Every session is one round of Write, Play, Publish at a larger size, the
same three moves as stage 00, and the principles decide what gets
written, played with, and published.

## The run of show

*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026, in four parts: bring back the stage's work, one thing that unblocks the next stage, start it, and the check).* Generated from [`runs-of-show.json`](runs-of-show.json) by `tools/teaching_tables.py`; change the JSON, then run it.

| Minutes (75) | Scene | Kind | What happens |
|---|---|---|---|
| 0-5 | Arrive | Talk | One line in the chat: who held your app this week, or what is in the way. Then what I read in your answers last week, and what I changed. |
| 5-35 | Show what you brought back | Rehearsal rooms | In your group's room. Each person in turn: say what you want to know, show it on the device, and explain one decision with your agent closed (a decision, never the code). The others ask one question to understand it, then answer the three questions: where is it going, how is it going, and what is next. The builder ends by saying what they will do next, and ready or not yet. The prompt: "Show the screenshot that proved a fix, and what it would have looked like if the fix had failed. Then show your app on the other person's device beside the guess you wrote before they held it: what did they do first?" |
| 35-38 | Break | Break |  |
| 38-45 | Numbers that tell the truth | Talk | Once other people hold your app, you can no longer see it by using it yourself, so you read numbers about it. Stage 06's rules keep those numbers honest. A reader that cannot read says so, and a missing number is empty, never zero. Count only what servers and stores already see, with no tracking added to the app. And a number you aim at stops telling you the truth, so you read it, you do not chase it. |
| 45-58 | Choose your number | Design stage | Write the one number about your app you will read this week, where it comes from, and what it would look like if its reader could not read. Hold it to the rules on the board, then name the person you will show it to. On the board: *Blank*. |
| 58-68 | Start | Reflection | Before you leave, send the first prompt of stage 06, with the number you chose tonight. Then start the log for stage 07: each time you use your own app this week and want it to do something it does not, write one line. Next week's feature comes from that log, not from a list. The prompt: "What is one thing you have already wanted your app to do while using it yourself?" |
| 68-72 | What did they notice first? | Question | The prompt: "Rank what the other person noticed first." |
| 72-75 | What is still muddy? | Question | Anything from tonight that is not clear yet. Your leaders read every answer before the next session. The prompt: "What is still muddy for you?" |

**In the rehearsal rooms,** each builder's turn runs these scenes, 8 minutes in all: say what you want to know, then show it on the device (3), explain one decision, agent closed (2), one question, then the three answers (2), what is next, and ready or not yet (1). The room's prompt is on screen the whole time.

**At 60 minutes,** for a cohort of fewer than eight learners, everyone stays in the one call:

| Minutes (60) | Scene | Kind | What happens |
|---|---|---|---|
| 0-4 | Arrive | Talk | One line in the chat: who held your app this week, or what is in the way. Then what I read in your answers last week, and what I changed. |
| 4-26 | Show what you brought back | Presenter | With everyone in the call, about five minutes each. Each person in turn: say what you want to know, show it on the device, and explain one decision with your agent closed (a decision, never the code). The others ask one question to understand it, then answer the three questions: where is it going, how is it going, and what is next. The builder ends by saying what they will do next, and ready or not yet. The prompt: "Show the screenshot that proved a fix, and what it would have looked like if the fix had failed. Then show your app on the other person's device beside the guess you wrote before they held it: what did they do first?" |
| 26-32 | Numbers that tell the truth | Talk | Once other people hold your app, you can no longer see it by using it yourself, so you read numbers about it. Stage 06's rules keep those numbers honest. A reader that cannot read says so, and a missing number is empty, never zero. Count only what servers and stores already see, with no tracking added to the app. And a number you aim at stops telling you the truth, so you read it, you do not chase it. |
| 32-43 | Choose your number | Design stage | Write the one number about your app you will read this week, where it comes from, and what it would look like if its reader could not read. Hold it to the rules on the board, then name the person you will show it to. On the board: *Blank*. |
| 43-52 | Start | Reflection | Before you leave, send the first prompt of stage 06, with the number you chose tonight. Then start the log for stage 07: each time you use your own app this week and want it to do something it does not, write one line. Next week's feature comes from that log, not from a list. The prompt: "What is one thing you have already wanted your app to do while using it yourself?" |
| 52-56 | What did they notice first? | Question | The prompt: "Rank what the other person noticed first." |
| 56-60 | What is still muddy? | Question | Anything from tonight that is not clear yet. Your leaders read every answer before the next session. The prompt: "What is still muddy for you?" |

Every scene can be changed on the session's page before it runs, and in the Meet add-on while it runs.

**What to watch for tonight.**

- Anyone who has not handed the app to another person yet. Visit every
  group (or, at 60 minutes, write to them in the chat), ask privately
  what is in the way, and help them find the free way today.
- "It works on mine," said as if it settled anything, and a fix the
  agent called done with no screenshot behind it.
- A guess that matched exactly what the person did. It usually means the
  guess was written after, or the person was helped.
- A number nobody questioned, especially a zero.

## The opening

> Welcome back. Last week you told me [what you heard], so [what
> changes]. This week your app reached someone who did not build it,
> and tonight I want to hear what they said, in their words. I will be
> visiting every group and staying a little longer than usual, which
> only means that this is the week the app stops being only yours.

In a 60-minute session, with everyone in one call, say instead that you
will be listening to each person's turn a little more closely than
usual.

## What they bring back

The cohort's bring-back: the proof that a fix worked, the app on
someone else's device, and what that person said. The stages' own lines:

> Be ready to show the screenshot that proved a fix, to say what it would
> have looked like if the fix had not worked, and to explain which of your
> devices the agent may never touch, and why.

> Be ready to show your app installed on a device you did not build it
> on, to say what that person did first, and, if it is in a store, to
> explain one thing you rewrote in its listing, and why.

**The bar, in the cohort's version.** A fix the agent proved with a
screenshot from the student's own device, and the app installed on a
device the student did not build it on, through a test track, a direct
share, or a store, with one change shipped because of what that person
did. The stages' full bars (a store listing a stranger could install
from, every device given a role) often land after the cohort ends.
Saying "not yet" to those tonight is ordinary and costs nothing.

**What to look for.**

- The app running on a device that belongs to someone else, or at least
  one the student did not build it on, shown or described with that
  person's words copied into the note.
- One thing the student decided about what that person said: what they
  will change, and what they will not.
- A screenshot from the student's own device that proved a fix, and the
  student able to say what it would have shown if the fix had failed.
- If they are in a store, one thing in the listing they rewrote in their
  own words.

**Signs of "not yet."** The app only on the student's own devices. A
fix the agent called done with no screenshot behind it. A store listing the agent
wrote that the student has not read aloud.

## Show what you brought back

*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026).*

Send everyone to their group's room with the prompt on screen: the
screenshot that proved a fix, what it would have looked like if the fix
had failed, and then the app on the other person's device beside the
guess the builder wrote before that person held it. Each builder's turn
follows the six steps of [showing your work](../path/showing-your-work.md),
about eight minutes in all, and the decision they explain with the agent
closed is one of their own: why this fix, why this way of sharing it, or
what they changed after watching someone else hold it. Visit every room,
say so as you arrive, and stay a little longer than usual this week.

The bring-back carries the difference between a fix that is verified
and one that is shipped, which no longer needs a scene of its own. If a
builder shows a screenshot that proved a fix but the fix is not yet on
the other person's device, that is stage 05's opening story in small: on
September 13, Archive Watch's repository was 41 versions ahead of the
App Store, every one of them verified on real devices and shipped to
nobody. Ask which version the other person is holding, and let "not
yet" be an ordinary answer. Listen, too, for "it works on mine," and
for the one thing the first outside users noticed in more than one
room, because it is what you name when everyone comes back.

At 60 minutes, everyone stays in the one call and takes about five
minutes each, so keep the decision and the three answers short, and let
the rest of the call ask the one question.

## Numbers that tell the truth

*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026).*

A short talk after the break, built from what everyone just showed:
once someone else holds the app, the builder can no longer see it by
using it themselves, so they read numbers about it instead. Tell the
story at the top of [stage 06](../path/06-keeping-it-running.md) in a
sentence or two, the Mac that read zero because Apple reports Mac sales
under product codes nobody had told the collector about, and the Roku
whose missing column was read as zero and drawn as a flat line for four
days, and its line, "A confident zero is worse than no dashboard."

Then put the rules on the board, from "The rules Pulse lives by" in
stage 06: a reader that cannot read says so, and a missing number is
empty, never zero; count only what servers and stores already see, with
no tracking added to the app; and a number you aim at stops telling you
the truth, so you read it rather than chase it. The rules stay on the
board for the next scene. Whoever brought a store's numbers or a web
counter back tonight is the example to point at, not Archive Watch.

## Choose your number

*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026).*

On a blank board, each person writes the one number about their own app
they will read this week, where it comes from (a store, a test track, a
web counter, or the repository on GitHub, if that is where the app
lives), and what it would look like if its reader could not read. Then
they hold it to the rules still on the board: would a failed source say
so, is a missing value shown as empty rather than zero, and would they
be tempted to make it go up for its own sake? The last is Goodhart's law
in Marilyn Strathern's words, "When a measure becomes a target, it
ceases to be a good measure" ("'Improving ratings': audit in the British
University system," *European Review* 5, no. 3, 1997), and anyone who
answers yes chooses another number.

Each person ends by naming, under their number, the person they will
show it to this week, because stage 06 is not done until one honest
number has gone back to a person with what they said about it. Walk the
board while they write, and talk about the number someone changed
tonight, and why. A zero nobody has questioned is the one to ask about.
At 60 minutes, the board is the same and the time is shorter, so let the
naming wait until the end if the numbers are slow to come.

## Start

*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026).*

Before anyone leaves, they send the first prompt of
[stage 06](../path/06-keeping-it-running.md) with the number they chose
tonight, asking the agent for one page that shows how the app is doing
without opening a single store console. Then they begin
[stage 07](../path/07-raising-the-ceiling.md) the way it begins: a log
kept while using their own app, one line each time they want it to do
something it does not (the moment, what they were doing, and what was
missing). Next week's feature comes from that log, not from a list, and
the reflection's prompt, the one thing they have already wanted their
app to do, is its first line. Watch for anyone who writes a feature they
have read about rather than one they reached for, and ask them when they
last wanted it.

Before next week, each person shows their number to the person they
named tonight, and asks what it means to them and what it misses.

## The check

The question scenes at the end of the run of show, answered privately,
and shown on the main stage without names only if you choose:

1. **Rank what the other person noticed first.** (a ranking). Choices:
   What it is for; How it looks; What it does first; Something that
   broke; How fast it is.
2. **What is still muddy?** (in their own words).

**Also prepared,** in the cohort's question bank: "What is the
difference between a fix that is verified and a fix that is shipped?",
"In one word, how did it feel to hand it over?", and "What is one thing about your app you can
no longer see by using it yourself, and how will you find out about
it?"

Good answers name something real (a crash on a device they do not own,
what strangers say about it, a store's numbers) and an honest way to
hear about it. An answer that says "I'll just keep using it" is worth a
word.

## The task, and its evidence

*Written by Claude, awaiting Ben's review (curriculum milestone C5, October 7, 2026).*

**The task, this week.** Read one honest number about your app, hold it to Pulse's rules, and take it back to a person. Keep a log while using your own app, and let it lead you to one feature you want.

**Evidence a person can open.** The number, its source, and what the person said it misses; the log, with the moment each want came from; the first sketch of the feature and the want it traces to.

**On the credential.** Recognitions: "Asked for feedback and used it." Tonight's bring-back (the proof, the install link, what the person did first, and the change it led to) is already evidence for "Got it onto someone else's device" and "Tested it the way people will actually use it." Students do the thing itself, and what they
make is the evidence; nobody writes a report about it
([`05-inquiry-and-evidence.md`](../research/curriculum/05-inquiry-and-evidence.md)).

## When someone is stuck

Every entry in the [stuck library](../stuck/README.md) starts with a
question to ask yourself, then what to try, then who to ask. This week,
point people to:

- [Stuck publishing](../stuck/publishing/README.md), for when you are not ready to show anyone, cannot get it onto another device, or do not know when it is enough.

And the ladder for any of them: name the kind of stuck, write three
lines (what you tried, what you expected, what you saw), ask the agent
for a way to understand it rather than the fix, look on the device and
at the last thing that worked, then your trio, then the teacher. About
twenty minutes before the trio is a default each person can move.

## The close

> Answer the two questions on the live page before you go. Next week is
> the last session, and it is open to anyone you would like to invite.
> Bring your one honest number with what its people said about it, and
> the feature you wanted from your own use.

## After the session

Read the checks, write your two sentences, and reach out within two
days to anyone who missed the session or brought nothing back. Then do
this week's close look: for each person, read what their app's first
outside user said and what they decided about it, and write them a
few sentences back. Ask anyone who has said "not yet" about the same
stage twice for fifteen minutes before week 5. And send the invitation
for the final showing, so that guests can come.

Next week, everyone's work, shown to everyone.
