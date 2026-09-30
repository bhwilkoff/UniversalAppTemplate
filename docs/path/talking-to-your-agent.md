# Talking to your agent

On June 16, 2026, I made a new repository from an earlier version of
this template at 6:12 in the evening. By 11:41 that night, Tidbits
Trivia played on an iPhone, the web, an Apple TV and an Android phone,
with more than ten thousand real questions built from Wikidata. I sent
five prompts. The first described the game. The other four were some
version of this:

> keep pushing forward with the next round of work to fully build out
> this game/app

I did not write code that night, or type in a single question, or open
a file. That is not a trick. It is the job, now: say what you want, say
where the truth lives, look at what comes back, and say what is wrong
with it. Over and over, until it is right.

**The prompt is the work.**

This page is the set of moves I actually use, each with the words I
typed. Every stage of the path points back here.

## Say what you want before what it does

Start with the wish, in plain words, in the first person.

> I want to stop getting alerts for failed GitHub actions. Can you fix
> it so that if it isn't broken, it doesn't fail?

> I'd like to be able to move my camera around the preview window AND
> crop the video (to only capture my face, etc.).

A wish gives the agent room to find a better answer than the one you
would have specified. A specification only gets you what you already
thought of.

## Name where the truth lives

Never type data in. Say where it comes from and let the agent build the
pipeline that brings it.

> A fully realized multi-player trivia game based entirely upon facts
> pulled from the open Wikipedia API ... The final outcome of this
> session should be a working iOS version with all v1 versions of the
> features fully implemented.

That one prompt has all three things a kickoff needs: the wish, the
source, and what "done" means for this sitting.

## Say what you see, where, on which device

Your review is using the app. Report it the way you would to a friend
who built it.

> I'm looking at the latest version of the iphone app and I don't see
> any way to share playlists

> Why does https://archivewatch.org/item/shakedown-1950 have actors
> names in the title?

One concrete item is worth ten general complaints. Then ask the agent
to generalize: "Can you look for this issue anywhere else in the app?"

## Send feedback in rounds

After a stretch of real use, send a numbered list. The agent works
through it and tells you which items are done.

> 1. There are more animated movies/videos in the hero row than I would
> like. At most, there should only be one animated feature. 2. There
> are multiple shelves that only have 4 or 5 items. No shelf should
> display as less than a full row. 3. The same shelves should show up
> across all platforms.

In Archive Watch's first week, the commit history runs "UI feedback
round 1" through "round 7" in a single day. That is what a first week
looks like.

## Correct with a reason, and point at the bar

When the agent is wrong, say so, say why, and point at something that
already works: the platform's own feature, another app, a thing you
already built.

> NO CUSTOM OVERLAYS... You can do this if every other video app on the
> market can do subtitles with the ability to skip. This is native
> functionality. Search better through the APIs.

> Automatic captions happen perfectly within the Photos app on my phone
> for any video that has even a little bit of audio. I want it to be
> this simple and fluid

The corrections are where the method lives. Most of what is written in
this template's skills started as one of them.

## Refuse a limit that is not real

Agents give up too early, and they say so with confidence. When a claim
does not match what you know, say that.

> That cannot be the way in which you have to get API access enabled.
> Amazon is a huge company and there is no way that they require every
> developer to ask for API access. You need to keep looking for ways to
> do this

> You keep on saying (for many different sessions) that AirPlay doesn't
> work, but it does work. And it is documented.

## Ask for the truth about the state

"Fixed" is a claim. Ask for the evidence.

> Can you confidently say that I will not receive another error from
> GitHub for any of the workflows we have for Archive Watch?

> Did you ship it fully? I'd like to move on to another scope of work.

## Research first, then build

For anything new, or anything that has failed twice, ask for research
before code. When the answer is yes, say build it.

> Can you research the feasibility of creating a version of Tidbits
> Trivia as an iMessage game that you could play in a direct iMessage
> conversation or even in a group conversation?

Ten minutes later:

> Please fully build out and enable a tidbits trivia iMessages app and
> prepare the App Store Connect settings to submit for review

## Give standing permission

Once you have decided something, stop being asked about it.

> Fix everything. I don't want you to ask me. Just fix it.

> The goal of the audit is to fix every incorrect thing you are
> finding. Why are you asking me if you should fix things?

## Make it write things down

When a correction could happen again, have the agent keep it.

> Can you make a memory so that after every tick when you re-arm the
> loop, you give a time when the next tick should occur?

> Document everything we have done today, as we are needing to compact.
> (create any new skills necessary)

## Let it drive, and do the one human step

Some steps belong to a person: a login, a pairing code, a payment. Ask
the agent to take you right to them.

> I'd like you to use Chrome to take me to the right screen to generate
> the oauth token and I'd like you to walk me through that process

> Let's get connected to all of the Apple TV's in my house via the known
> pathway through Xcode. Add the fireplace tv and the movie room tv and
> I'll read you the connection codes.

## Decide when asked, in as few words as it takes

When the agent needs a decision, ask it to lay out the options.

> Can you ask me the owner items as a series of questions where I can
> see the options and choose from among them?

Then answer briefly. "Do 2 and 3." "Great. Go for it."

## Put big work on a loop, and hold it to real work

A scope too big for one sitting goes on `/loop`, with the goal and the
point where it should stop.

> /loop let's start with some robust testing on the iPhone 12 to ensure
> that everything is working as it should. [...] Please make a
> systematic list and then run through it to check everything. Don't
> stop until you have completed the full list.

Then watch whether each tick does something new, and stop it when it
does not:

> Stop the loop until you can tell me what you are actually doing with
> it.

## What stays yours

Across four apps, these were the only things I kept doing myself:

- The wish and the values, and the lines the app will not cross.
- Choosing the source, and judging what is true.
- Devices, accounts, money, logins, pairing codes.
- Using the app, every day, on every device I own.
- Taste: what looks right, what reads right.
- Refusing claims that do not match what I know.
- Bringing in other people: testers, a Reddit thread, a trivia night.
- Deciding when to stop, and when to ship.

Everything else, I asked for.
