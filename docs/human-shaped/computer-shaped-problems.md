# Computer-shaped problems

On March 4, 2026, in a Bluesky thread about how people who love
computers come to see the whole world through them, the person posting as
[@mosheroperandi.bsky.social](https://bsky.app/profile/mosheroperandi.bsky.social/post/3mgasswgabs23)
replied that computers are so good at their kind of problem that

> we have been busily trying to turn everything in the world we can
> into a computer-shaped problem for at least the past 40 years.

I read that post in March and typed a page about it the same month. The
phrase stayed with me through four apps. It is the shorthand this whole
movement runs on, and it came from that reply. When you use it, credit
the post and link to it.

## What the phrase means

A **computer-shaped problem** is one a computer can finish for you. It
has a clear input and a clear right answer, and doing it faster or at a
bigger scale is simply better. Sorting ten thousand films by decade is
computer-shaped. So is checking that a caption appears on screen at the
moment the words are spoken.

A **human-shaped problem** only gets solved when a person does part of
the work. Learning is human-shaped. So are community, friendship,
taste, and deciding what is worth your evening. A computer can set the
table for these. It cannot eat the meal for you.

**Some problems are not computer-shaped.**

The trouble the post names is the habit of pretending otherwise. When
the tool in front of you is very good at one shape, every problem
starts to look like that shape. Loneliness becomes a feed. Curiosity
becomes a recommendation. Learning becomes an answer handed over. Each
of those is a human-shaped problem squeezed until it fits a computer,
and what gets squeezed out is the part where a person grows.

## What I want

I want to build software that does the computer-shaped work so well that
people have more room for the human-shaped part. I do not want software
that takes the human-shaped part away from them because it was easier to
build that way.

An AI agent makes this question sharper. Agents are wonderful at
computer-shaped problems, and they will happily treat a human-shaped
problem as a computer-shaped one if nobody stops them. Writing a blurb
for ten thousand films takes a model one afternoon. Whether the blurb
should exist at all is a question the model will never ask on its own.

## Examples from the apps

These come from the four apps this template was built from. If you do
not know them: **Archive Watch** is a free app for watching public-domain
films from the Internet Archive on phones, computers and TVs. **Tidbits
Trivia** is a trivia game built from Wikipedia and Wikidata. **Bsky
Dreams** is a Bluesky app "built for people who want to think more, not
less" (its App Store description). **BOBA Playbook** is a companion app
for a trading-card game.

| The computer-shaped part (hand it over) | The human-shaped part (keep it) |
|---|---|
| Building Archive Watch's catalog of around 32,000 titles from archive.org, TMDb, Wikidata and the Library of Congress, and refreshing it on a schedule. | Deciding what a film's notes should say. On September 26 I wrote: "I don't want AI making lists and writing copy." The notes come from the people who uploaded and reviewed each film. |
| Checking whether each title is still under copyright, with evidence the pipeline can show. | Choosing where the line sits when the evidence is unclear. That call stayed mine, by rule. |
| Keeping every device in a Watch Together room on the same moment of the same film. | Watching it together. The feature was written to "create genuine opportunities for connection for all involved" (my loop prompt, September 23). |
| Turning Wikidata facts into more than ten thousand trivia questions in one evening. | The learning. In September I said Tidbits should "create a positive habit for learning via trivia." Its site promises that every question is "a door to learn more." |
| Filling an empty game with a computer opponent so nobody waits alone. | Knowing it is a computer. Tidbits labels its bot as a bot, because a bot dressed as a person manufactures a relationship that does not exist. |
| Indexing BOBA's 17,793 cards so a search can reach any of them. | Learning how the catalog is organized. BOBA's search shows its filter tokens instead of hiding them behind a "for you" box. |

Notice that the left column is huge. Almost all of the code in every one
of these apps is computer-shaped work, and an agent wrote nearly all of
it. The right column is small, and it is the reason the apps exist.

## How to use the phrase

Use it as a question, at the moment of a decision.

1. **Before a feature.** Ask, "Is this a computer-shaped problem, or a
   human-shaped one we are about to squeeze?" If it is human-shaped, ask
   what part the computer can carry and what part the person must keep.
2. **When the agent proposes something.** Agents propose the
   computer-shaped answer first, because it is the one they can finish.
   Say the phrase back to it. Then write down the line it should not
   cross (stage 00 shows how).
3. **When you talk about your app.** "It does the computer-shaped work
   so you can do the human-shaped part" is a sentence a stranger can
   follow. Try it on someone who has never written code.
4. **When you credit it.** Link the
   [original post](https://bsky.app/profile/mosheroperandi.bsky.social/post/3mgasswgabs23)
   and name its author by handle. The idea is borrowed. Say so.

## What it costs

Keeping the human-shaped part is slower. Pulling Archive Watch's notes
from the people who uploaded each film meant building and maintaining a
pipeline, when a model could have written every note in an afternoon.
And the line is not always obvious. A summary of a long document might
be exactly what someone needs, and leave them more capable rather than
less. The phrase does not decide for you. It makes you decide on
purpose.

## Where to go next

- `../path/00-why-we-build.md` puts this idea into practice on the first
  day of an app.
- `not-vibe-coding.md` says why building this way differs from asking an
  AI to make you an app.

Pick one feature you want. Name its shape.
