# 01. The first prototype

**Where you are.** The agent knows why your app exists, and there is one
rule in your words in `CLAUDE.md`. There is no app yet.

Archive Watch began on April 17, 2026. The first thing the agent made
was not a screen. It was a set of research notes on where film
metadata could come from. The next day brought a pipeline to gather
films from archive.org. On the third day the catalog held 799 real
films, and only then did the Apple TV app start to look like something.
Four days in, a run of that pipeline had built a catalog of 25,000.

Tidbits Trivia went faster. I described the game in one prompt, named
the Wikipedia API as the source, and said the session was done when a
working iPhone version existed. Five and a half hours and four more
prompts later, it played on four platforms with ten thousand real
questions.

Neither one started with me typing in data or building screens by
hand. Both started with a wish, a real source, and a clear idea of what
"done" meant for that sitting.

**One platform, real data, this week.**

## What I want

I want someone who has never shipped an app to see their idea running
on their own phone, with real data in it, before the first week is out.
Not a mockup. A thing they can hold and be disappointed by in useful
ways, because the disappointment is where the next round of work comes
from.

## Where to start

Start where your people are. Archive Watch started on the Apple TV
because it is an app for watching old films on a couch. A trivia game
for a classroom might start on the web, because every student already
has a browser.

If you do not know where your people are, start on the web. It costs
nothing, it needs no developer account, and the agent can put it live
on GitHub Pages at a real address you can open on your phone the same
day. The native apps can come in stage 03, and they will come faster
because the web version already taught you what the app is.

## Real data from day one

Real data is uneven. Titles run long. Images come in every shape. Some
records are missing the one field the design assumed. You want to find
that out now, while the design is a sketch.

So, never type data in. Tell the agent where the truth lives (an open
API, a public dataset, a site with a feed) and let it build the pipeline
that brings the data in and keeps it fresh. Then steer the data the way
I did, by looking at one real item. In late August I was browsing
Archive Watch's live site and found a film whose title had its cast
pasted into it:

> Why does https://archivewatch.org/item/shakedown-1950 have actors
> names in the title?

And then asking the agent to find every other case like it.

## What the first week looks like

You will not get it right the first time, and neither will the agent.
On April 19, Archive Watch's commits run "UI feedback pass", "UI
feedback round 2", "round 3", all the way to "round 7", in one day.
Each round was me looking at the Apple TV and sending a list of what
was wrong. That is not a sign the process is failing. That is the
process.

## Working with your agent

You need one thing set up first: a GitHub account, with your copy of the
template kept public so GitHub Pages can host the web app for free. The
agent does the rest of the setup, and will tell you if it needs you.

1. **The kickoff.** In one message, give the agent three things: the
   wish, the source, and what "done" means for this sitting. Use your
   own idea, of course. Mine, for Tidbits, sounded like this: "I want a trivia game built from facts in the open
   Wikipedia API. Build the web version first and put it live on GitHub
   Pages so I can open it on my phone. This session is done when I can
   play a full round with real questions." The agent will research the
   source, build the pipeline, build the first screens, and put it
   live. The `web-platform-patterns` and `universal-feature-states`
   skills do a lot of this work without you asking for them.

2. **Keep it going.** When it reports back, do not polish yet. Ask for
   the next round of the wish. The night I started Tidbits, three of my
   next four prompts were some version of this, and each one added a
   platform or a whole feature:

   > keep pushing forward with the next round of work to fully build
   > out this game/app

3. **Open it on your phone and use it.** The agent will give you the
   live address. Use the app for real, for ten minutes, the way the
   person you are building it for would. Write down what you notice, in
   plain words.

4. **Send the round.** Send what you noticed as a numbered list. Ask the
   agent to fix all of it and tell you which numbers are done. Then use
   it again. Do this at least twice.

5. **Steer the data with one real item.** Find one record that is wrong
   (a bad title, a missing image, a question that makes no sense). Paste
   its link or describe it, ask why, and ask the agent to look for the
   same problem everywhere.

6. **Try it the hard way.** Turn on airplane mode and open the app. Open
   a search that should find nothing. Tell the agent what you saw. Every
   list in this template has a loading, empty, error and offline state,
   and this is how you find out whether yours are real.

**When you are ready to move on,** your app is live at a real address,
it is full of real data that a pipeline brought in, and you have sent
at least two rounds of feedback from your own phone.

Be ready to show the app on your phone, and to name one thing the real
data taught you that fake data would have hidden.
