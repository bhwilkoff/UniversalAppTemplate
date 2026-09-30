# 07. Raising the ceiling

On September 12, 2026, I asked for something that sounded like it needed
a server:

> letting our users share their playlists via URL … they would get
> published on the web app for anyone to browse and potentially add to
> their account and view them on native apps as well.

At the time, Archive Watch had no server and no accounts. People's saved films live
on their own devices and sync through their own iCloud or Google Drive.
There was nowhere for us to put a playlist, and building somewhere
would have undone a decision the whole app rests on.

So, the investigation began with a different question. Not how to
build a sharing service, but whether one was needed at all.

It was not. A playlist is a name and a list of film IDs. Compressed and
encoded, fifty films fit in a link of about 1,368 characters, measured
across 300 random playlists from the real catalog. The whole playlist
travels inside the URL. The web app opens it for anyone. The native apps
open the same link and offer to save it. No server was built.

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

## What to do

1. Pick one feature that only your newest devices can do. Write its row
   in `PARITY.md` with an honest cell for every platform, including `n/a`
   and 🚫 with reasons.
2. Before building it, write down what your app already has that could
   carry it: the link, the data you already publish, the sync you
   already use.
3. Ask your agent for two designs: one that needs a new server, and one
   that does not. Compare them against the four questions from stage 00.
4. Build it on one platform, behind a capability check, so the older
   devices never see a button that does nothing.

Be ready to show the feature on your newest device, and the sentence an
older device shows instead.
