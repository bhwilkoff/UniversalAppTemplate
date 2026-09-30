# 00. Why we build

**Where you are.** You have an idea for an app and your own copy of this
template. Nothing is built yet, and that is exactly the right moment for
this stage.

On September 26, 2026, deep into building Archive Watch, I told the
agent I was working with this, and it became one of the project's
standing instructions:

> I don't want AI making lists and writing copy. Any time we can use
> metadata or user copy/categorization from archive.org.

Archive Watch had 4,285 commits by the end of that month, and 2,742 of
them carry Claude's name as co-author. It runs on iPhones, iPads, Macs,
Apple TVs, Android phones, Google TVs, Fire TVs, Rokus and the web. An
AI wrote most of the code, and yet the rule I cared about most that week
was a limit on what AI is allowed to do *inside* the app.

Both of those are true at once. This template is built to hold them
together, and the reason starts with something I wrote six months
earlier.

## Computer-shaped problems

In March I typed a page about something I had read on Bluesky: that
we are only looking to solve "computer-shaped problems." Community is not
computer-shaped. Relationships are not. Learning is not. And yet there
are so many computer-shaped problems, and making everything into
something I can feed into the Claude Code window is "so seductive and
more than a little thrilling."

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

## Where the values live in this template

There are three places, and each one is read at a different moment.

1. **`CLAUDE.md`, "Why we build."** Claude Code loads this file at the
   start of every session. The paragraph at the top is the one I wrote
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

Open Claude Code in your copy of the template. Everything in this stage
is a conversation, and `talking-to-your-agent.md` has the moves.

1. **Start your note with the why.** Open a plain note for your app, in
   whatever notes app you already use. At the top, write what the app is
   for, who it is for, and what you hope it does for them. You will keep
   this note for the life of the app, and it is where your prompts will
   be drafted from now on.

2. **Tell the agent why.** Say what you wrote, the way you would to a
   friend. Then ask the agent to rewrite the "Why we build" paragraph in
   `CLAUDE.md` from what you said, and to read it back to you. Correct it
   until it sounds like you and not like a company. Five sentences or
   fewer.

3. **Name one line you will not cross.** Something the app will never
   do, or never let AI do inside it. Say it plainly and say why. Mine
   usually came out the moment the agent proposed crossing one. In
   September, the agent designed Archive Watch's Watch Together feature
   around a paid voice server, and I stopped it:

   > It is absolutely not acceptable. The goal of this app (and all of
   > my apps) is for them to cost $0 to run.

   You do not have to wait for the agent to cross yours. Say it now, and
   ask the agent to add it to the standing instructions in `CLAUDE.md`
   with today's date and your words in quotes. You will add more of
   these as you build.

4. **Test the idea against the four questions.** Ask the agent to run
   the `learning-orientation-design` skill against your idea and tell
   you where it fails. Where it does, change the idea now, while it is
   only words. The same test will keep applying to every feature. Nine
   days into BOBA Playbook, the agent built a price feature that leaned
   on another site's prices, and I asked the question the four questions
   are for:

   > This is NOT what I want. I want my app to be indpendent from
   > Radish. You can look at the stucture from Radish, but if we are
   > just using Radish, there is no reason for this feature to exist.
   > People should just go to radish, right?

5. **Let it ask you the rest.** Ask the agent what it still needs to
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

**When you are ready to move on,** your note starts with the why, the
"Why we build" paragraph in `CLAUDE.md` sounds like you, there is one
rule in your own words, and the agent has what it needs to start. Stage
01 turns all of that into something you can hold.

Be ready to share your "why we build" paragraph, your one rule, and what
that rule will cost you.
