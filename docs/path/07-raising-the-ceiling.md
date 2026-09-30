# 07. Raising the ceiling

**Where you are.** Your app is shipped, Pulse is watching it, and you use
it every day. Using it is where the next feature comes from.

On September 12, 2026, I asked for something that sounded like it needed
a server:

> letting our users share their playlists via URL … they would get
> published on the web app for anyone to browse and potentially add to
> their account and view them on native apps as well.

At the time, Archive Watch had no server and no accounts. People's saved
films lived on their own devices and synced through their own iCloud or
Google Drive. There was nowhere for us to put a playlist, and building
somewhere would have undone a decision the whole app rests on.

So, the investigation began with a different question. Not how to
build a sharing service, but whether one was needed at all.

It was not. A playlist is a name and a list of film IDs. Compressed and
encoded, fifty films fit in a link of about 1,368 characters, measured
across 300 random playlists from the real catalog. The whole playlist
travels inside the URL. The web app opens it for anyone. The native apps
open the same link and offer to save it. No server was built.

Stage 03 was about the floor: the oldest device the app reaches. This
stage is about the ceiling: everything the newest devices can do. The
playlist link is the lesson the whole stage runs on, because it raised
the ceiling for every platform without adding a single thing the app
needed in order to run:

**Raise the ceiling without raising the floor.**

## What I want

I want the newest devices to get everything they can do: SharePlay on
the Apple TV, Top Shelf, live captions, widgets, picture in picture,
casting. I want each of those to arrive on every platform that can have
it, in that platform's own idiom. And I want none of it to cost the
hand-me-down phone its ability to open the app, or cost me a server I
now have to keep alive.

## Four ways the ceiling went up in Archive Watch

**1. The feature fits in what already exists.** Before building, ask
what the app already has that could carry it.

- Shared playlists live in the link.
- The web app reads the same iCloud database the Apple apps write to
  (Apple publishes a JavaScript library for it), so the web joined the
  Apple sync without a server of its own.
- The Apple TV's Top Shelf and the home-screen widgets read a tiny JSON
  file the data pipeline already publishes each day, rather than the
  full catalog.

**2. Capability, not effort, decides where a feature appears.** "Watch
Together" in Archive Watch is really three features, and each platform
offers the ones its hardware and operating system allow. The rule is in
the decision log:

> Every surface must state which of the three THIS device can do, and
> why it cannot do the others. Never a silently missing button.

A device that can never have a feature gets `n/a` in `PARITY.md`, with
the reason. A device that could have it but does not yet gets a sentence
on screen. Some doors get closed for good, and saying so is a kindness:
Roku can never *receive* a shared playlist, because nothing on a phone
can hand a link to a Roku, so that row says "closed", not "later".

**3. Let people keep what they already use.** Watch Together was
stuck on how to carry people's voices: servers, relays,
billing, free-tier limits. Then I asked a different question:

> I mean, calling services like Google Meet, Zoom, Phone Calling or
> other services that every device has if we wanted to separate out the
> calling part from the movie playing, syncing, and streaming to
> youtube.

People already have a way to talk to one another. The app only has to
keep the film in sync. Everything the voice problem had required simply
stopped existing.

**4. When you do need a server, make it small and free.** Archive Watch
eventually needed one: to keep watch-party rooms in sync across
platforms, to count visits without tracking anyone, and to serve a few
feeds for other apps. It is one Cloudflare Worker on the free tier,
split into small files by job. `pulse/worker-example/` in this template
is a smaller version of the same idea. The `zero-cost-hosted-backend`
skill covers the case where people truly need to see one another's
data.

## Parity for ceiling features

A feature that exists on only some platforms still gets a row in
`PARITY.md`. The difference between the cells matters:

- ✅ shipped, 🚧 in progress, ⏳ planned: the usual.
- 🚫 not doing it, with the reason.
- n/a: the platform cannot have it at all.

When a feature is big enough to have its own rules (captions, SharePlay,
playlist sharing), it gets its own design document beside the platform
ones, with a table of which operating system versions on which
platforms can do what, and a checklist for bringing it to a new
platform.

## What it costs

Every ceiling feature is a promise on every platform that has it, and
promises need upkeep. Picture in picture had to be tested on an iPhone,
an iPad, an Android phone and in web browsers, each with its own
way of doing it. A feature on one platform is cheap. A feature on six is
six features.

That is the other reason to ask the first question honestly. The
cheapest feature to maintain is the one you found you did not need to
build.

## The skills for this stage

- `shareplay-activities` for SharePlay, with what shipping it on three
  Apple platforms actually taught.
- `resilient-media-streaming` for video from hosts you do not control.
- `cross-platform-multiplayer` and `cross-platform-determinism` for
  anything live or shared across platforms.
- `smart-tv-platform-expansion` for the living room beyond Apple.
- `app-intents`, `widgetkit` and the other Apple framework skills for
  each system feature.

## Working with your agent

1. **Notice the want while using the app.** The best features I built
   started as a sentence like this one, typed on September 14 while
   Archive Watch played on the TV beside me:

   > I've been leaving the 'Party Play' going on my TVs to enjoy ambient
   > videos as I work and I realized that I wanted three different
   > features to be built into the view that don't currently exist

   Party Play itself started the same way, as item 3 on the list of
   feature ideas in my Archive Watch note, before it existed:

   > A background/party play that shows video only with no audio (with
   > the ability to turn on audio), but that focuses upon high
   > contrast/high-interest videos that are visually interesting and that
   > autoplays in the background.

   Write the want down in your notes the moment you have it, in those
   terms.

2. **Ask for research before code.** Ask whether it is possible, on
   which platforms, and what it would cost, including whether it needs
   a server. On August 31, wanting people to be able to watch Archive
   Watch together:

   > Can you investigate the ability for the Apple versions of the app
   > to take advantage of SharePlay and synchronous viewing of movies
   > together using Apple's API's and version 27 platform features?

   Read the answer against the four questions from stage 00 before you
   say yes.

3. **Say build it, everywhere it can go.** When the research says yes,
   ask for the full feature on every platform that can have it, and an
   honest row in the parity matrix for the ones that cannot. Seven
   minutes after that research question, once the answer was yes:

   > I'd like you to fully implement SharePlay for all Apple platforms.

4. **Hold the bars.** When the agent reaches for a custom control where
   the platform has one, or a paid server where none is needed, stop it.
   On August 27, the iPhone app grew its own captions button instead of
   using the one the system already provides:

   > There is now a persistent captions icon on the screen rather than
   > using the build in captions UI on iPhone [...] The goal is native
   > support for all features using native UI and APIs

5. **Use it for real, then critique.** Use the feature the way it is
   meant to be used, with the people it is meant for. Then send a
   round. The day after SharePlay went in, after the first real call:

   > That worked. The videos were in sync while the call was live.
   > However, I noticed that I had to initiate the facetime call first
   > and then do the share button within Archive Watch. [...] Can we have
   > the call initiate from the app or have it tell you what to do when
   > you try to select 'Watch Together' without first having a call
   > going?

6. **Check the older device.** Open the app on your oldest supported
   device and make sure it says, in a sentence, what it cannot do,
   rather than showing a button that does nothing.

**When you are ready to move on,** a feature you wanted from your own
use is live on every platform that can have it, and the older devices
say honestly what they cannot do. By now you have built a lot, and
taught the agent a lot along the way. Stage 08 is about making sure it
remembers.

Be ready to show the feature on your newest device, and the sentence an
older device shows instead.
