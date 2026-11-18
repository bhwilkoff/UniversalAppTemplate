# Week 4: the app on someone else's device

<!-- Reconciled to COURSE.md's week map by Claude, October 7, 2026, and
rewritten on November 18, 2026, at Ben's request, on the routine in
docs/teaching/leading-a-session.md. Awaiting Ben's review. This session
tries the work of stages 04 and 05 and starts 06 and 07. -->

**Where the cohort is.** Week 3 was [stage 04](../path/04-seeing-it-work.md)
and [stage 05](../path/05-shipping.md). The agent started proving its
fixes with screenshots from the builder's own devices, and everyone's app
left their hands. Some went through a store, and more went through a
test track or a direct share, which cost nothing. Each builder watched
one person hold it without helping, and shipped one change because of
what that person did. Stage 05's line is "A feature nobody can install
is unfinished."

The week ahead is [stage 06](../path/06-keeping-it-running.md), one
honest number about how the app is doing out in the world, and [stage
07](../path/07-raising-the-ceiling.md), a log kept while living with the
app that ends in one feature the builder wants. This is the first of the
two weeks when the teacher looks closely at every build, because it is
the first time the app has been in the hands of someone who did not
build it, and what that person did is worth more than anything the
builder could say about it.

**Shipped means someone else can install it.**

## The move and the question

**Publish, then write.** This week leads with publishing: tonight the
app is tried by everyone, with what an outside person did beside it,
and in the week ahead an honest number goes back to its people. Then it
writes: a log of what the builder wants, kept while using the app.

The question the week turns on: **What is happening to it when I am not
holding it, and what do I want now that I live with it?** Tonight it is
asked about each app in turn, as who used it this week and what they
did first.

## The run of show

*Written by Claude, awaiting Ben's review (the routine of November 18, 2026, in [`leading-a-session.md`](leading-a-session.md): your plans from last week, try each app, write your next round, your questions).* Generated from [`runs-of-show.json`](runs-of-show.json) by `tools/teaching_tables.py`; change the JSON, then run it.

| Minutes (75) | Scene | Kind | What happens |
|---|---|---|---|
| 0-8 | Your plans from last week | Talk | My plan was ___  What happened was ___ |
| 8-38 | Try each app | Rehearsal rooms | In your group's room, nine minutes for each builder: their question, three quiet minutes trying it, what you did and what happened, "I wonder if", then one decision and what changes first. The prompt: "Show what happened when someone else used your app, and ask one question about it." |
| 38-41 | Break | Break |  |
| 41-50 | What we saw | Talk | One person from each group: one thing someone did with an app  Then what it suggests |
| 50-69 | Write your next round | Reflection | I tried my app, and here is what I saw: 1. ___ 2. ___ 3. ___  Start with ___  This is done when ___  It must never ___ The prompt: "Paste the round you are sending to your agent." |
| 69-75 | Your questions | Question | Only your leaders read the answers. The prompt: "What questions do you still have?" |

**In the rehearsal rooms,** each builder's turn runs these scenes, 9 minutes in all: the builder's question (1), try it quietly (3), what you did and what happened (2), i wonder if (1), one decision, and what changes first (2). The room's prompt is on screen the whole time.

**At 60 minutes,** for a cohort of fewer than eight learners, everyone stays in the one call:

| Minutes (60) | Scene | Kind | What happens |
|---|---|---|---|
| 0-6 | Your plans from last week | Talk | My plan was ___  What happened was ___ |
| 6-42 | Try each app | Presenter | The builder asks one question about the app  Everyone tries it, quietly, for three minutes  I tried to ___. What happened was ___. I expected ___.  One "I wonder if", then the builder explains one decision and what they will change first The prompt: "Show what happened when someone else used your app, and ask one question about it." |
| 42-56 | Write your next round | Reflection | I tried my app, and here is what I saw: 1. ___ 2. ___ 3. ___  Start with ___  This is done when ___  It must never ___ The prompt: "Paste the round you are sending to your agent." |
| 56-60 | Your questions | Question | Only your leaders read the answers. The prompt: "What questions do you still have?" |

Every scene can be changed on the session's page before it runs, and in the Meet add-on while it runs.

**What to watch for tonight.**

- Anyone who has not handed the app to another person yet. Write to
  them privately before the session, ask what is in the way, and help
  them find the free way.
- "It works on mine," said as if it settled anything, and a fix the
  agent called done with no screenshot behind it.
- A guess that matched exactly what the person did. It usually means the
  guess was written after, or the person was helped.
- A number nobody questioned, especially a zero.

## What they show

Before the session, read each person's answer on the session page (what
they want someone to try, and the one thing they want to know), open
every app at its address, and look at each repository's history,
branches included. Write a slide for each builder with their name,
their app, what changed this week, and, where they wrote it down, what
the outside person did first.

The stages ask each builder to be ready for this:

> Be ready to show the screenshot that proved a fix, to say what it would
> have looked like if the fix had not worked, and to explain which of your
> devices the agent may never touch, and why.

> Be ready to show your app installed on a device you did not build it
> on, to say what that person did first, and, if it is in a store, to
> explain one thing you rewrote in its listing, and why.

**The bar, in the cohort's version.** A fix the agent proved with a
screenshot from the builder's own device, and the app installed on a
device they did not build it on, through a test track, a direct share,
or a store, with one change shipped because of what that person did.
The stages' full bars (a store listing a stranger could install from,
every device given a role) often land after the cohort ends, and "not
yet" to those is ordinary and costs nothing. **Signs of "not yet"** are
the app only on the builder's own devices, a fix with no screenshot
behind it, and a store listing the agent wrote that the builder has not
read aloud.

## Your plans from last week

Open by saying what you read in last week's questions and what you
changed because of it. Then put up the table: each person, the "Start
with" line they read aloud at the end of week 3, and what their app does
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
three minutes. This week the builder's question is often about what the
outside person did, so the room tries the app knowing what a stranger
tried first.

Ask each builder who used it this week, and what they did first. If a
builder has a screenshot that proved a fix but the fix is not on the
other person's device yet, that is stage 05's opening story in small:
on September 13, Archive Watch's repository was 41 versions ahead of the
App Store, every one of them verified on real devices and shipped to
nobody. Ask which version the other person is holding, and let "not
yet" be an ordinary answer. Listen, too, for the first numbers. Once
someone else holds the app, the builder can no longer see it by using
it themselves, so when a builder mentions a store's numbers or a web
counter, ask where the number comes from and what it would show if its
reader could not read. Stage 06's line is "A confident zero is worse
than no dashboard," and its story is short enough to tell in that
moment: the Mac that read zero because Apple reports Mac sales under
product codes nobody had told the collector about, and the Roku whose
missing column was drawn as a flat line for four days. For the decision,
good ones this week are why this fix, why this way of sharing it, or
what the builder changed after watching someone else hold it.

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

This week one line can name what they will watch for when they are not
holding the app, which is stage 06's first prompt: one page that shows
how the app is doing without opening a store console, built on one
number. "It must never" is where the rules Pulse lives by belong, in
the builder's own words: a reader that cannot read says so, and a
missing number is empty, never zero; count only what servers and stores
already see, with no tracking added to the app; and a number you aim at
stops telling you the truth (Marilyn Strathern's version of Goodhart's
law, "When a measure becomes a target, it ceases to be a good measure,"
*European Review* 5, no. 3, 1997). The round also starts stage 07 the
way it begins, with a log kept while using their own app, one line each
time they want it to do something it does not. A want they read about
rather than reached for is worth asking about: when did they last want
it?

Everyone writes in the box in their panel and sends the same words to
their agent before the part ends. In the last two minutes each person
reads their "Start with" line aloud, in the same order, with no applause
and no comment, and those lines open week 5.

## Your questions

One private question in the panel: "What questions do you still have?"
Only the leaders read the answers. Answer two or three aloud, the rest
before week 5, and open week 5 by saying what you read.

The week's own question goes on the session page before week 5, beside
each builder's own question: "What is one thing about your app you can
no longer see by using it yourself, and how will you find out about
it?" Good answers name something real (a crash on a device they do not
own, what strangers say, a store's numbers) and an honest way to hear
about it. The rest of this week's questions, including "What is the
difference between a fix that is verified and a fix that is shipped?",
stay in the cohort's question bank.

## The task, and its evidence

**The task, this week.** Read one honest number about your app, hold it
to Pulse's rules, and take it back to a person. Keep a log while using
your own app, and let it lead you to one feature you want.

**Evidence a person can open.** The number, its source, and what the
person said it misses; the log, with the moment each want came from;
the first sketch of the feature and the want it traces to.

**On the credential.** Recognitions: "Asked for feedback and used it."
Tonight's work (the proof, the install link, what the person did first,
and the change it led to) is already evidence for "Got it onto someone
else's device" and "Tested it the way people will actually use it."
Students do the thing itself, and what they make is the evidence;
nobody writes a report about it
([`05-inquiry-and-evidence.md`](../research/curriculum/05-inquiry-and-evidence.md)).

## When someone is stuck

Every entry in the [stuck library](../stuck/README.md) starts with a
question to ask yourself, then what to try, then who to ask. This week,
point people to:

- [Stuck publishing](../stuck/publishing/README.md), for when you are not ready to show anyone, cannot get it onto another device, or do not know when it is enough.

And the ladder for any of them: name the kind of stuck, write three
lines (what you tried, what you expected, what you saw), ask the agent
for a way to understand it rather than the fix, look on the device and
at the last thing that worked, then your group, then the teacher. About
twenty minutes before the group is a default each person can move.

## The close

> Answer the question in your panel before you go. Next week is the
> last session, and it is open to anyone you would like to invite.
> Bring your one honest number with what its people said about it, and
> the feature you wanted from your own use.

## After the session

Read the answers and write what you will say about them at the start of
week 5, and reach out within two days to anyone who missed the session
or did not send a round. Then do this week's close look: for each
person, read what their app's first outside user did and what they
decided about it, and write them a few sentences back. Ask anyone who
has said "not yet" about the same stage twice for fifteen minutes
before week 5. And send the invitation for the final showing, so that
guests can come.

Next week, everyone's work, shown to everyone.
