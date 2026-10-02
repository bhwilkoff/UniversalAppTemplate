# 01. The first prototype

**Where you are.** You have a note for your app with the why at the top,
the agent knows that why, and there is one rule in your own words in
`AGENTS.md`. There is no app yet.

Archive Watch began on April 17, 2026, and the first thing the agent
made was not a screen. It was a set of research notes on where film
metadata could come from. The next day brought a pipeline to gather
films from archive.org. On the third day the catalog held 799 real
films, and only then did the Apple TV app start to look like something.
Four days in, the pipeline had built a catalog of 25,000.

Tidbits Trivia began faster. I pasted in a description I had been
drafting in my notes: one sentence of wish, ten numbered features, a
request for research, and what "done" meant for the session. Four and a
half hours and three more prompts later, it played on four platforms
with ten thousand real questions.

One was slow and one was fast, but they started the same way. Neither
began with me typing in data or drawing screens. Both began with a wish,
a real source of truth, and a clear idea of what "done" meant for that
sitting. Those three things are the whole first stage, and they fit in a
single line:

**One platform, real data, this week.**

## What I want

I want someone who has never shipped an app to see their idea running
on their own phone, with real data in it, before the first week is out.
Not a mockup. A thing they can hold and be disappointed by in useful
ways, because the disappointment is where the next round of work comes
from.

## One platform

Pick the platform where your people are. Archive Watch started on the
Apple TV because it is an app for watching old films on a couch. A
trivia game for a classroom might start on the web, because every
student already has a browser.

If you do not know where your people are, start on the web. It costs
nothing, it needs no developer account, and the agent can put it live
on GitHub Pages at a real address you can open on your phone the same
day. The native apps come in stage 03, and they come faster because the
web version already taught you what the app is.

## Real data

Real data is uneven. Titles run long. Images come in every shape. Some
records are missing the one field the design assumed. You want to find
that out now, while the design is still a sketch.

So, you never type data in. You tell the agent where the truth lives (an
open API, a public dataset, a site with a feed), and it builds the
pipeline that brings the data in and keeps it fresh. Your job is to look
at what arrives, one real item at a time. Months into Archive Watch, I
was still doing exactly that. Browsing the live site in late August, I
found a film whose title had its cast pasted into it:

> Why does https://archivewatch.org/item/shakedown-1950 have actors
> names in the title?

One real item, and then the request that matters more: find every other
case like it.

## This week

The week is a series of rounds, not one big build. On April 19, Archive
Watch's commits run "UI feedback pass", "UI feedback round 2", "round
3", all the way to "round 7", in a single day. Each round was me using
the Apple TV and sending back a list of what was wrong. In BOBA
Playbook's second week, I sent five rounds in under two days, each one
after using the latest build.

You will not get it right the first time, and neither will the agent.
That is not a sign the process is failing. That is the process, and the
steps below are one lap of it.

## Working with your agent

You need one thing set up first: a GitHub account, with your copy of the
template kept public so GitHub Pages can host the web app for free. The
agent does the rest of the setup, and will tell you if it needs you.

1. **Add the wish to your note.** Under the why you wrote in stage 00,
   write the wish in one sentence. Under it, list what the app should
   do, numbered. (`talking-to-your-agent.md` shows the shape my notes
   took.)

2. **Draft the kickoff, then send it.** Turn that list into a kickoff in
   your note: the wish, the source, what you want researched before
   anything is built, and what "done" means for this sitting. Then paste
   it in one message. Here is most of mine for Tidbits Trivia, June 16:

   > A fully realized multi-player (both local and online) trivia game
   > that is based entirely upon facts pulled from the open Wikipedia
   > API.
   >
   > Full features should include: [ten numbered features, from Game
   > Center support to "A huge number of questions (10,000+) ... to help
   > make sure that you never see the same question twice."]
   >
   > Please research other quiz/trivia/game/competitions apps that are in
   > the space and determine what key features are not listed above and
   > would allow for this app to compete on its merits [...]
   >
   > Please use your repository documentation to help you build out the
   > project/plan [...] A full parity matrix should be written with any
   > important platform-specific decisions that will need to be
   > considered.
   >
   > The final outcome of this session should be a working iOS version
   > with all v1 versions of the features fully implemented.

   Yours can be smaller. If you are starting on the web, make "done" mean
   that the web version is live on GitHub Pages and you can open it on
   your phone. The agent will do the research, build the pipeline for
   your source, build the first screens, and put it live. The
   `web-platform-patterns` and `universal-feature-states` skills carry a
   lot of that work without you asking for them.

3. **Keep it going.** When the agent reports back, do not polish yet.
   Ask for the next round of the wish. The night I started Tidbits, two
   of the three prompts after the kickoff were some version of this, and
   each one added a platform or a whole feature:

   > keep pushing forward with the next round of work to fully build
   > out this game/app

4. **Use it, with your note open.** Open the live address on your phone
   and use the app for real, for ten minutes, the way the person you are
   building it for would. Under a "Next:" heading in your note, write
   each thing you notice as its own numbered item: where it is, what is
   wrong, what it should be.

5. **Send the round.** Paste the whole list, with one line in front of
   it that sets the scope. In BOBA's first week, mine was as short as
   this:

   > Please update both apps (iOS and Web App)

   Ask the agent to fix all of it and to tell you which numbers are
   done. Move those to a "Done:" list in your note, use the app again,
   and start the next round. Do at least two laps.

6. **Steer the data with one real item.** Somewhere in those laps, find
   one record that is wrong (a bad title, a missing image, a question
   that makes no sense). Paste its link, ask why, and ask the agent to
   look for the same problem everywhere.

7. **Try it the hard way.** Turn on airplane mode and open the app. Run
   a search that should find nothing. Tell the agent what you saw. Every
   list in this template has a loading, empty, error and offline state,
   and this is how you find out whether yours are real.

**When you are ready to move on,** your app is live at a real address,
it is full of real data that a pipeline brought in, and you have sent at
least two rounds from your own phone. The app works on one platform.
Stage 02 is about deciding what it means for it to be the same app on
the next one.

Be ready to show the app on your phone, and to name one thing the real
data taught you that fake data would have hidden.
