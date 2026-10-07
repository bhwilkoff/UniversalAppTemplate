# 00. Why we build

**Where you are.** You have your own copy of this template, and maybe an
idea for an app, or maybe only a feeling that something in your life
should be easier than it is. Nothing is built yet, and that is exactly
the right moment for this stage.

<!-- Written by Claude, awaiting Ben's review (curriculum C1). -->
**The question.** What has hummed in your life for months, and who else
hears it?

On September 26, 2026, deep into building Archive Watch, I told the
agent I was working with this, and it became one of the project's
standing instructions:

> I don't want AI making lists and writing copy. Any time we can use
> metadata or user copy/categorization from archive.org.

Archive Watch had 4,306 commits by the end of that month, and 2,753 of
them carry Claude's name as co-author. It runs on iPhones, iPads, Macs,
Apple TVs, Android phones, Google TVs, Fire TVs, Rokus and the web. An
AI wrote most of the code, and yet the rule I cared about most that week
was a limit on what AI is allowed to do *inside* the app.

Both of those are true at once. This template is built to hold them
together, and the reason starts with something I wrote six months
earlier.

## Computer-shaped problems

Nilay Patel calls it software brain: seeing the whole world as a set of
databases, each one waiting for the right code to take control of it.
In March I typed a page about that habit in myself. Community is not a
computer-shaped problem, and neither are relationships or learning. And
yet there are so many computer-shaped problems, and making everything
into something I can feed into the Claude Code window is "so seductive
and more than a little thrilling."

The page ends here:

> Sometimes the window isn't showing me the future. It is just showing
> me another way to avoid the hard work of living.

This template is for building software with that window open. So, how
do you keep the window from doing the part that was supposed to be
yours, or your users' part, the part where the learning happens?

You write it down.

**An agent keeps only the values you write down.**

An agent building your app will do whatever satisfies the request most
cheaply. Writing a blurb for ten thousand films is cheap for a model.
Building a pipeline that pulls each film's notes from the people who
actually uploaded and reviewed it is not. Left alone, the agent will
reach for the blurb, and it is not wrong to: nobody told it otherwise.
The values have to live where the agent reads them, at the moment it
makes the choice.

## Human-shaped software

I call what this template builds *human-shaped software*. A
computer-shaped problem is one you can hand to the window. Learning,
community, and relationships are not, because they only happen when a
person does the work. Human-shaped software uses AI as a tool that
people wield for human purposes, built around those parts rather than
over them. It takes the mechanical work off people's hands and leaves
them the learning
([computer-shaped problems](../human-shaped/computer-shaped-problems.md)
tells the longer story, with examples of each shape).

Learning is the frame for everything in this template, and it runs in
three directions at once.

- **As a student,** you are learning a way of building, one stage at a
  time. Every stage ends with something to bring back and show another
  person, because a method is learned by showing it, not by reading it.
- **As a builder,** you are learning what your app is. The agent writes
  the code. Deciding what to build, judging what came back, and using it
  every day are yours, and they are where you learn. Hand those to the
  agent and the app gets built while you learn nothing.
- **As a human,** you are deciding, at every step, what to hand to the
  window and what to keep. The app should leave the people who use it
  more capable, and building it should do the same for you.

So, every round of every stage makes the same three moves:

1. **Write.** Writing gets it out of your head. The values, the
   features you want, the feedback you hear, and everything else you
   think is important go where you and the agent can both read them,
   because a value you have not written down is one the agent cannot
   keep.
2. **Play.** Playing makes your thinking tangible. Whatever came back
   from the agent, you use it, test it, and probe it on a real device,
   and you think about what to try next. The agent is never the tester
   (stage 04), so every "it works" is something you have played with
   yourself.
3. **Publish.** Publishing releases the work into the world so that
   other people can play with it too, which gives your work a real
   audience. Human-shaped problems are rarely yours alone. They tend to
   be shared by many people, and sometimes by nearly everyone, so the
   people who play with what you publish tell you what to write next.

**Write, play, publish.**

The moves are not stages. Each round of each stage makes all three, and
the principles decide what you write, what you play with, and what is
ready to publish. This stage is where the first move starts.

## Find your hum

<!-- Written by Claude, awaiting Ben's review (curriculum C1). The
definition is Ben's October 6, 2026 piece, as quoted in
computer-shaped-problems.md, where "inawing" and "It'is" were corrected to
"gnawing" and "It is". -->

Every app in this course starts before the app. It starts with a
problem you have lived with, and in October I wrote down what I mean by
that:

> A human-shaped problem is something, really anything, in your life
> that will in some way make your life better, happier, or more deeply
> resonant with the universe if you could only solve for it. It is
> something that is the gentle hum of worry or concern that you have
> about an area of your life. [...] It is something that has gone
> unsolved for months or even years, something that is present in a
> gnawing way. And most of all, it is something that you cannot do
> yourself. Your current tools and resources are insufficiently up to
> the challenge.

So, before you write a single thing about an app, you write down hums.
Not one, three, because the first one you think of is usually the
loudest rather than the truest. Then you sort, because most problems can
be told in either shape, and the shape you tell it in decides what you
will build: stories to be told and added to, or data points to be
counted. [Sort the hum](../human-shaped/hum-sort.md) has my eight
examples, mixed together, for sorting before you read my answer.

Then you write the other shape of your own problem: its computer-shaped
twin, the version that counts and ranks and optimizes. Writing the twin
is how you see what your app must never become.

Last, two questions, and they are older than any agent. Neil Postman
asked them of every new technology: "What is the problem to which this
technology is the solution?" and "Whose problem is it?" (*Building a
Bridge to the 18th Century*, 1999, as gathered in the
[curriculum research](../research/curriculum/02-landscape.md)). A
human-shaped problem is rarely yours alone, so name two people outside
your screen who hear the same hum. They are who you will publish to
first, at the end of the next stage.

## Where the values live in this template

There are three places, and each one is read at a different moment.

1. **`AGENTS.md`, "Why we build."** Your agent loads this file at the
   start of every session (`CLAUDE.md` imports it for Claude Code, and
   `GEMINI.md` for Gemini). The paragraph at the top is the one I wrote
   for every app I build:

   > Every feature in this app is built in service of human learning and
   > growth, not to replace thinking, but to deepen it. [...] The goal is
   > never a slick product. It is a tool that makes someone more human.

   The paragraph sounds abstract until it has to decide something. In
   July, Tidbits Trivia's agent was deciding how much of a new paid club
   to put behind locks, and I answered with the reason the app exists:

   > the whole point of Tidbits Trivia is that we are the world's best
   > trivia app with the least amount behind a paywall.

   That one sentence decided the design: one quiet row for the club,
   and everything else free. Your app's paragraph will do the same work
   for questions you cannot see yet.

2. **The four questions** (the `learning-orientation-design` skill). Before
   any feature is built, the agent asks:

   1. Does it deepen understanding?
   2. Does it invite participation?
   3. Does it support human agency?
   4. Is it clear rather than clever?

   A "no" to any of them is a redesign, and it happens at the proposal,
   not after the code exists. The questions came from BOBA Playbook, a
   trading-card app, where search shows its filter tokens (Weapon: Fire,
   Treatment: Battlefoil) instead of hiding them behind a "for you" box.
   Folks who search that way learn how the catalog is organized. Folks
   handed a "for you" box learn nothing, and come to depend on it.

3. **Standing instructions.** These are the dated rules, in your own
   words, that an app earns as you build it. I did not write mine in
   advance. I said each one the moment the agent crossed it, and asked
   for it to be written down. Archive Watch earned three in one week:

   - **Only essential words on screen.** "You and I are having a
     conversation, but not everything I say or what you discover needs
     to be listed in the interface." A caption stays only if it explains
     why something is disabled, warns about something the person could
     not otherwise know, or states a fact they cannot find by looking.
   - **No AI-written lists or copy in the product.** Lists and notes come
     from data and from people. A human editor may write. A model may
     not.
   - **Side doors stay out of the way.** Finding and playing a film is
     the app. Feeds for other apps are documented on the website, never
     a button in the app.

   Tidbits Trivia earned another: a computer opponent that fills in
   while nobody else is online must be labeled as a computer opponent.
   A labeled bot is an honest way to get a game started. A bot dressed
   as a person manufactures a relationship that does not exist.

   A rule in your own words, with a date, is also your name on the
   decision. Anyone who reads it later, including the agent, knows who
   drew the line and why.

Values climb, too. A value starts as a reason in the paragraph. The day
the agent crosses it, it becomes a standing instruction. Once you know
exactly what it means, it can become a check: a test that fails when the
line is crossed, so the agent cannot cross it without being told. In
Archive Watch I found "programme" on a label and assumed there was
already a rule about spelling. There was not. Now there is a rule, and
`tools/test_us_english.py` checks every string a person can see, because
a rule nobody checks drifts again. Stage 08 comes back to this ladder.

## What it costs

These rules are slower. Pulling Archive Watch's notes from archive.org's
own metadata, and from the words of the people who uploaded and reviewed
each film, meant building a pipeline and keeping it running. A model
could have written ten thousand blurbs in an afternoon, and a lot of
folks would never have known the difference.

I could be wrong about where the line sits for your app. Maybe a model
summarizing a long document is exactly what your people need, and it
leaves them more capable instead of less. But, I want you to draw the
line on purpose, in writing, before the agent draws it for you by
default.

## Working with your agent

<!-- Steps 1 to 4 and the intro line: written by Claude, awaiting Ben's
review (curriculum C1). -->
Steps 1 to 4 are yours alone, with the agent closed, because they are
writing, and the hum has to be yours before anyone helps you shape it.
From step 5 on, open your agent (Claude Code, or Antigravity for Gemini)
in your copy of the template. Those steps are conversations, and
`talking-to-your-agent.md` has the moves.

1. **Write down three hums.** Open a plain note, in whatever notes app
   you already use. You will keep it for the life of the app, and it is
   where your prompts will be drafted from now on. At the top, write
   three things that have hummed in your life for months, each in a
   sentence or two, in your own words. Then write your first answer to
   this stage's question, before you read further.

2. **Sort before you choose.** Sort my eight examples in
   [Sort the hum](../human-shaped/hum-sort.md), with your group if you
   are in a cohort, then put your own three on the same two sides. Choose
   one hum that is human-shaped. If none of yours is, that is worth
   knowing: write three more.

3. **Write its computer-shaped twin.** Under the hum you chose, write
   the same problem in the other shape, the version that counts, ranks,
   or optimizes. Keep it in your note. It is the app you are choosing not
   to build.

4. **Name two people who hear the same hum.** Write their names, and
   one line each on how you know it hums for them too. Then answer
   Postman's two questions about your hum in your note: what is the
   problem to which this app is the solution, and whose problem is it?

5. **Start your note with the why.** Above the hum, write the why: who
   the app is for, and what you hope it does for them.

6. **Tell the agent why.** Say what you wrote, the way you would to a
   friend. Then ask the agent to rewrite the "Why we build" paragraph in
   `AGENTS.md` from what you said, and to read it back to you. Correct it
   until it sounds like you and not like a company. Five sentences or
   fewer.

7. **Name one line you will not cross.** Something the app will never
   do, or never let AI do inside it, even if doing it would work. Say it
   plainly and say why. Mine
   usually came out the moment the agent proposed crossing one. In
   September, the agent designed Archive Watch's Watch Together feature
   around a paid voice server, and I stopped it:

   > It is absolutely not acceptable. The goal of this app (and all of
   > my apps) is for them to cost $0 to run.

   You do not have to wait for the agent to cross yours. Say it now, and
   ask the agent to add it to the standing instructions in `AGENTS.md`
   with today's date and your words in quotes. You will add more of
   these as you build.

8. **Ask three questions of the idea.** Work through these with the
   agent, and write your answers in your note.

   1. **Should it exist at all?** If something already does this, what
      does yours give people that it does not? This one comes back before
      every big feature. Nine days into BOBA Playbook, the agent built a
      price feature that leaned on another site's prices, and I asked it
      out loud:

      > This is NOT what I want. I want my app to be indpendent from
      > Radish. You can look at the stucture from Radish, but if we are
      > just using Radish, there is no reason for this feature to exist.
      > People should just go to radish, right?

   2. **Who does it touch?** Name the people who will use it. Then name
      the people outside the screen: the ones whose work it shows, whose
      data it uses, or whose lives it changes without their ever opening
      it. For Archive Watch, those are the people who uploaded and
      reviewed each film on archive.org, and the people on screen in the
      films. For Tidbits Trivia, they are the volunteers who wrote every
      fact on Wikipedia and Wikidata.
   3. **What will people learn from using it every day, and what will
      they stop learning?**

   Then ask the agent to argue the strongest case against your idea, on
   behalf of the people outside the screen. It is a second voice where
   there was only yours. It does not replace asking real people, and
   stage 07 comes back to that.

9. **Test it against the four questions.** Ask the agent to run the
   `learning-orientation-design` skill against your idea and tell you
   where it fails. Where it does, change the idea now, while it is only
   words. The same test applies to every feature from here on.

10. **Let it ask you the rest.** Ask the agent what it still needs to
   know before it starts. This is how I opened each early milestone of
   BOBA Playbook, starting the first evening:

   > Great. Let's begin on M2. Do you have any question at the beginning
   > of this milestone that are unanswered by the current documentation?

   Answer in your note first, numbered to match its questions, saying
   only what each decision needs. It is a habit that lasts. Here is
   Archive Watch, months later, answering five of the agent's questions
   in one message:

   > 1. Yes. Move forward with a single clock. If you need a time zone
   > to organize around, you can choose UTC, but all times should show
   > as their local times when they look at channels. [...]
   > 3. The wording is fine for now.
   > 4. You can use the Apple TVs whenever you want right now.

   The agent records your answers as decisions, with the why first.

**When you are ready to move on,** your note holds three hums, the one
you chose with its computer-shaped twin, and the two people who hear it
too. It starts with the why and your answers to the three questions, the
"Why we build" paragraph in `AGENTS.md` sounds like you, there is one
rule in your own words, and the agent has what it needs to start. You have written. Stage 01 is the
first chance to play with something you can hold, and to publish it for
someone else to try.

Every stage ends the way this one does, with something to show and a
decision to explain in your own words, with the agent closed. [Showing
your work](showing-your-work.md) says how, in a cohort or on your own.

Be ready to share your hum and its computer-shaped twin, your "why we
build" paragraph, the two people who hear the same hum, and your one
rule, and to explain why you drew that line where you did and what it
will cost you.
