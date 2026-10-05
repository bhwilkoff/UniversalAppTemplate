# Computer-shaped problems

There is a habit of mind that most people who make software know well,
because most of us have it. Nilay Patel, the editor-in-chief of The
Verge, calls it
[software brain](https://www.theverge.com/podcast/917029/software-brain-ai-backlash-databases-automation):
seeing the whole world as a set of databases, each one waiting for the
right code to take control of it. A classroom becomes a table of names
and scores, a friendship becomes a feed, and a film becomes a row that
needs a summary. Once you see the world that way, every problem looks
like one a computer could finish for you, if only you described it well
enough.

**Some problems were never computer-shaped.**

AI has turned software brain up as far as it will go. An agent can write
the code for almost anything you can describe, and it can write the
words too, so it is very tempting to treat every problem as a database
waiting to be put to work. But, learning, community, friendship, taste,
and the people we love are not like that. They only happen when a person
does the work, and a first draft that no person has wrestled with is not
the start of that work. Until someone shapes it, it is just slop.

## What we want instead

I want software that uses AI as a tool, one that people wield for human
purposes. It should take the mechanical work off people's hands so that
the human part has more room, and it should never be used to replace the
people involved or to flatten what they make.

The way there is values. Every piece of software is built on values,
whether or not anyone wrote them down, and software brain has values of
its own: efficiency, scale, and whatever is cheapest to produce.
Human-shaped software writes its values down and wears them on its
sleeve, so that the people who use it, and the AI agents that help build
it, can both see what it is for. The
[Human-Shaped Principles](PRINCIPLES.md) are the values every piece of
software built this way shares, and each builder adds the ones their own
problem needs.

## Why people write the film notes

Archive Watch is a free app for watching public-domain films from the
Internet Archive. Each film's notes come from the people who uploaded
and reviewed it on archive.org, rather than from a summary written by
AI. Those notes are sometimes wrong, and correcting them takes time that
a model would never need.

And yet, ten thousand summaries written by AI would be more efficient
and a worse experience, both for the internet and for people. It is
worse for the internet because the web is filling with words that no one
wrote and no one reads (the "Dead Internet Theory"), and because search
is learning to answer every question itself and send no one on to the
people who did the work ("Google Zero"). It is worse for people because
it removes the folks who actually watched those films and loved them.
The AI did not watch the movies, and it cannot enjoy them the way a
person can. Keeping their words is how the app says what it values: the
people who watched, and the writing they did about it.

**Humanity is inefficient, and that is the point.**

Learning is inefficient too. We have great tools for making it work
better, and our values are how we decide where those tools belong.

## Computer-shaped and human-shaped

A **computer-shaped problem** has a clear input and a clear right
answer, and doing it faster or at a bigger scale is simply better.
Sorting ten thousand films by decade is computer-shaped. So is checking
that a caption appears at the moment the words are spoken, or keeping
two devices on the same second of the same film. Hand those to the
machine, and be glad you can.

A **human-shaped problem** only gets solved when a person does part of
the work. Deciding what is worth your evening, learning something hard,
and watching a film with a friend are all human-shaped. A computer can
set the table for them, but it cannot eat the meal for you.

Almost every app is both. Most of its code is computer-shaped work, and
an agent can write nearly all of it. The human-shaped part is small, and
it is the reason the app exists.

## The person keeps it human-shaped

Once you have named the human-shaped problem you are building for, you
do not need to question your agent about every line it writes. The
person in the work is what keeps it human-shaped. You write down what
you value and what you want, you play with what comes back until it is
right, and you publish it so that other people can play with it too
(stage 00 calls this **write, play, publish**). Software brain leaves
the person out, and this method is built around them.

## What it costs

Keeping the human-shaped part is slower. Pulling Archive Watch's notes
from the people who wrote them meant building and maintaining a
pipeline, when a model could have written every note in an afternoon.
And the line is not always obvious, because a summary of a long document
might be exactly what someone needs, and leave them more capable rather
than less. Naming the shape of a problem does not decide for you. It
makes you decide on purpose.

## Where the phrase comes from

The phrase "computer-shaped problem" comes from a
[reply on Bluesky](https://bsky.app/profile/mosheroperandi.bsky.social/post/3mgasswgabs23)
by @mosheroperandi.bsky.social on March 4, 2026, which said we have
spent decades turning everything we can into computer-shaped problems.
When you use the phrase, credit the reply and link to it.

## Where to go next

- `../path/00-why-we-build.md` puts this idea to work on the first day
  of an app.
- `PRINCIPLES.md` lists the values every human-shaped app wears on its
  sleeve.
- `not-vibe-coding.md` says why building this way differs from asking an
  AI to make you an app.

Pick one thing you want to build, and name its shape.
