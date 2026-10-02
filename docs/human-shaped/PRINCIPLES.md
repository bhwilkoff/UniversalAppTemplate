# The Human-Shaped Principles

*Version 0.3, October 2, 2026. Drafted by Ben Wilkoff from four apps
built with an AI agent, the Educational Model Spec, and this template,
and open to argument.*

I want anyone to be able to say "my app is human-shaped" and have it
mean something about how the app was made and how it was shipped, not
only about what its builder hoped for. So, these principles are written
as guidelines for making and shipping, each one something you can do
and something another person can check, and each one is meant to make
sense to someone who has never written a line of code or worked with an
AI agent. The explanations further down say where each principle came
from and what it looks like in a real app, for when you want to go
deeper.

## The principles

Human-shaped software should:

1. **Start from a human-shaped problem,** one that affects real people
   in the real world, people the builder can name.
2. **Increase what people are able to do,** rather than how much profit
   can be made from them.
3. **Have its values written down as guardrails** that both the people
   and the AI agents building it follow.
4. **Get better through iteration,** so that no first draft of a
   feature, a design or a piece of writing is ever what ships.
5. **Be built on research,** so the builder always knows whose shoulders
   they stand on, from the services and frameworks it uses to the
   authors and design patterns it borrows.
6. **Make every decision with feedback,** from another person, an AI
   agent, or the project's own documentation, and never alone.
7. **Be tested the way people will actually use it,** on real devices,
   by what a person can see, hear and do, including people who use it
   differently from the builder, and not only by what a machine can
   check.
8. **Treat its documentation as seriously as its code,** so that it grows
   and changes along with the code, in the builder's own words and not
   only the agent's.
9. **Share its code, tools and lessons** as openly as the problem it
   solves allows.
10. **Count learning as success,** so that if the builder learned at least
    one real thing in making it, the work was worth doing.
11. **Let people own their data,** and make every decision about what
    happens to it.
12. **Create no new human-shaped problems** while solving the one it set
    out to solve.
13. **Speak in the builder's own voice,** so that every word people read
    in it was shaped by a human, and nothing a machine does in it
    pretends to be a person.
14. **Credit everything that made it possible:** the people, the
    communities, the AI agents, the tools and the process.
15. **Bring joy to at least one person** in the form it ships today, even
    if that person is only the builder.

## What each principle means

Each explanation says what the principle asks, where it came from, and
how you can tell whether an app meets it. Not every principle will fit
every app at first, and "not yet, and here is what I am doing about it"
is an honest answer in a declaration, where silence is not.

## 1. A human-shaped problem

**Start from a human-shaped problem, one that affects real people in
the real world, people the builder can name.**

Some problems are computer-shaped, which means you can hand them to a
machine and be done with them. Learning, community and relationships
are not like that, because they only happen when a person does the
work, and those are the problems this kind of software is for. Naming
the people matters because it keeps the problem honest: an app for
"users" can drift toward whatever is easiest to build, while an app for
the people at your Thursday trivia night has to work for them.

**How you can tell:** the builder has written down, in their own words,
what the problem is, who has it, and why it is not one a computer can
simply solve for them.

## 2. More possible, not more profit

**Increase what people are able to do, rather than how much profit can
be made from them.**

When Tidbits Trivia's agent was deciding how much of a new paid club to
put behind locks, I answered with the reason the app exists: "the whole
point of Tidbits Trivia is that we are the world's best trivia app with
the least amount behind a paywall." And when Archive Watch's agent
designed a watch party around a paid voice server, I stopped it,
because "the goal of this app (and all of my apps) is for them to cost
$0 to run." An app can make money and still be human-shaped. It cannot
make its money by taking something away from the people it serves.

**How you can tell:** the core of the app works without paying, any
price is stated plainly, and nothing in it is designed to keep people
using it longer than they want to.

## 3. Values as guardrails

**Have its values written down as guardrails that both the people and
the AI agents building it follow.**

An agent keeps only the values you write down. In every app built from
the Universal App Template, a short "Why we build" paragraph sits at the
top of the file the agent reads at the start of every session, and below
it are standing instructions, each one dated and in the builder's own
words, earned the day the agent crossed a line. The strongest of them
become checks: when I found "programme" on a label in Archive Watch, the
rule about spelling became a test that reads every string a person can
see, so the agent cannot cross it without being told.

**How you can tell:** the values are in the repository, in the file the
agent reads, dated and in the builder's words, and at least one of them
has visibly changed a decision.

## 4. Iteration, never a first draft

**Get better through iteration, so that no first draft of a feature, a
design or a piece of writing is ever what ships.**

On April 19, Archive Watch's commits run from "UI feedback pass" through
"round 7" in a single day, each round coming from me using the app on
the Apple TV and sending back what was wrong. The design of the
humanshaped.org website went through two full rounds of directions
before one was chosen. An agent will happily hand you a finished-looking
first draft, and the discipline is to treat it as the start of the
conversation.

**How you can tell:** the history shows rounds of feedback before each
feature shipped, in commits, notes or design drafts.

## 5. Built on research

**Be built on research, so the builder always knows whose shoulders they
stand on, from the services and frameworks it uses to the authors and
design patterns it borrows.**

The first thing the agent made for Archive Watch, on April 17, was not a
screen but a set of research notes on where film information could come
from. In this template, "research first, then build" is one of the moves
for anything new or anything that has failed twice, and every borrowed
idea in the method carries its credit. Knowing your sources is how you
know what you are allowed to use, what will break when a partner
changes, and whom to thank.

**How you can tell:** the repository records the research behind its
major choices, and the data sources, services and borrowed ideas are
named.

## 6. Decisions with feedback

**Make every decision with feedback, from another person, an AI agent,
or the project's own documentation, and never alone.**

Even working by myself, I never decided alone. At the start of each
milestone I asked the agent what it still needed to know, and answered
its questions in numbered lists. The decision log held what had already been decided, so
nobody decided it twice. Testers, a Reddit thread and a trivia night
told me what I could not see. A decision made with feedback can still be
wrong, but it is never made blind.

**How you can tell:** major decisions are recorded with their reasons,
and the record shows where the feedback came from.

## 7. Tested the way people use it

**Be tested the way people will actually use it, on real devices, by
what a person can see, hear and do, including people who use it
differently from the builder, and not only by what a machine can
check.**

On August 14, a version of Archive Watch reached my Apple TV with
stuttering audio and late captions after the agent had called it tested,
and I wrote back: "I should not be the one testing your work." From then
on, the agent tested on real devices and graded what a person would see
there, a screenshot of the actual screen rather than its own report.
Testing the way people use an app also means people who are not like
you: an older phone, a screen reader, a slow connection, someone new to
the subject.

**How you can tell:** claims that something works point to evidence from
real devices or real people, and the app says plainly where it does not
work yet.

## 8. Documentation as seriously as code

**Treat its documentation as seriously as its code, so that it grows and
changes along with the code, in the builder's own words and not only
the agent's.**

On September 24, Archive Watch's agent improvised a way to test on an
Apple TV that was already written down in its own repository, and I told
it: "You have fully documented device testing pathways for each device.
Please stop trying to reinvent things you already know how to do." The
documentation is the only memory an agent has, and it is how the next
person, or the builder six months from now, understands why the app is
the way it is. When the docs say one thing and the code does another,
fix the doc first.

**How you can tell:** the repository has current documentation of its
decisions, state and design, and the builder's own words appear in it.

## 9. Shared openly

**Share its code, tools and lessons as openly as the problem it solves
allows.**

Every lesson from four apps went back into the Universal App Template,
which anyone can copy for free, and Archive Watch's own history is public
enough to be a case study. Some problems call for privacy (an app about
health or children may not be able to share everything), which is why
this principle asks for as much openness as the problem allows, not
more.

**How you can tell:** the code or at least the lessons are public, under
a license that lets others use them, and anything kept private has a
stated reason.

## 10. Learning is success

**Count learning as success, so that if the builder learned at least
one real thing in making it, the work was worth doing.**

This whole method is built around learning in three directions: as a
student of the method, as a builder discovering what your app is, and
as a human deciding what to hand to the machine and what to keep. An app
that never finds an audience can still be a success by this measure,
and an app with a million downloads that taught its builder nothing has
missed something.

**How you can tell:** the builder can say what they learned, and the
lesson is written down where the next builder can find it.

## 11. People own their data

**Let people own their data, and make every decision about what happens
to it.**

Archive Watch keeps people's saved films on their own devices and in
their own iCloud or Google Drive rather than on a server of mine, so
nothing they made disappears if I stop paying for something. People
should be able to see what an app keeps, take it with them, and delete
it.

**How you can tell:** the app collects only what it needs, says what it
keeps, and offers a way to export and delete it.

## 12. No new problems

**Create no new human-shaped problems while solving the one it set out
to solve.**

Solving one problem can quietly create another: a feature that
manufactures loneliness, a notification that steals attention, a test
run that leaves a film playing on every speaker in someone's house (that
last one happened while building Archive Watch, and it is why the
testing tools now leave a room as they found it). Before a big feature,
ask the agent to argue the strongest case against it on behalf of the
people it touches, including the people who will never open the app.

**How you can tell:** the builder has asked, in writing, whom the app
could harm, and has answered.

## 13. The builder's own voice

**Speak in the builder's own voice, so that every word people read in it
was shaped by a human, and nothing a machine does in it pretends to be a
person.**

On September 26 I told Archive Watch's agent: "I don't want AI making
lists and writing copy." The words in the app come from the people who
uploaded and reviewed each film, or from me. The same goes for anything
automated: Tidbits Trivia fills an empty game with a computer opponent,
and it is always labeled as one, because a bot dressed as a person
manufactures a relationship that does not exist.

**How you can tell:** the words in the app were written or chosen by a
person, and every automated part says what it is.

## 14. Credit everything

**Credit everything that made it possible: the people, the communities,
the AI agents, the tools and the process.**

By the end of September, 2,753 of Archive Watch's 4,306 commits carried
Claude's name as co-author, and the notes in the app are the words of
the people who uploaded and reviewed each film rather than a model's. Credit is honesty about how the thing was made,
and it is also a thank-you to the communities whose work made it
possible.

**How you can tell:** the app and its repository credit the people,
sources, agents and tools behind it.

## 15. Joy for at least one person

**Bring joy to at least one person in the form it ships today, even if
that person is only the builder.**

On September 14, with Archive Watch's "Party Play" running on the TVs
beside me while I worked, I typed: "I've been leaving the 'Party Play'
going on my TVs to enjoy ambient videos as I work and I realized that I
wanted three different features to be built into the view that don't
currently exist." The app was already a joy to use, and that joy is
where the next round of work came from. An app nobody enjoys, including
its builder, is not finished.

**How you can tell:** the builder can name someone who enjoys the app as
it is today, and that someone may be the builder.

## Declaring software human-shaped

To declare an app human-shaped, copy `HUMAN-SHAPED-template.md` from
this folder into the root of your repository as `HUMAN-SHAPED.md`, and
answer each principle with *meets*, *not yet* or *does not apply*, a
sentence in your own words, and a link to the evidence. The
humanshaped.org directory reads that file. Apps built in a cohort are
included in the directory, apps built from this template are
considered, and anyone else who builds by these principles can ask to be
included.

When something changes, change your answer and say what changed and
when, rather than deleting the old answer. A declaration that records
its own corrections is more trustworthy than one that never needed any.

## Where these came from

The principles came from Archive Watch, Tidbits Trivia, Bsky Dreams and
BOBA Playbook, and from the Universal App Template, where the method
lives. They also draw on the
[Educational Model Spec](https://github.com/bhwilkoff/educational-model-spec),
Value Based Engineering and IEEE 7000 (values made into requirements
and checked), Value Sensitive Design (the people an app touches who
never use it), Design Justice (who benefits and who pays),
constructionism (learning by making), local-first software (data that
outlives the app), and Microsoft's guidelines for human-AI interaction
(automation that says what it is). The fuller story of each borrowing is
in `docs/research/values-based-approaches.md`.
