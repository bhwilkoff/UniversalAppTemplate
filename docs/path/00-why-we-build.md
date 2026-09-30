# 00. Why we build

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
together.

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

   You will rewrite it for your app. Keep it short enough that you
   would say it out loud.

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
   words, that an app earns as you build it. Archive Watch earned three
   in one week:

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

## What to do

1. Read the "Why we build" section at the top of `CLAUDE.md`. Rewrite it
   for your app, in your own words, in five sentences or fewer.
2. Write one standing instruction about something you will not let AI do
   inside your product. Put the date on it and quote yourself, the way
   Archive Watch does. Add it under "Standing instructions" in
   `CLAUDE.md`.
3. Take the first feature you want to build and run the four questions
   against it, out loud or on paper. If any answer is "no", redesign it
   now, while it is still cheap.
4. Record the platform set and your rule as the first two entries in
   `DECISIONS.md`. Lead each one with *why*.

Be ready to share your "why we build" paragraph, your one rule, and what
that rule will cost you.
