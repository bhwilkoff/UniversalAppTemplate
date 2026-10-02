# The Human-Shaped Principles

*Version 0.2, October 2, 2026. A first draft for people to argue with,
and I expect it to change once more people have built with it.*

I want anyone to be able to say "my app is human-shaped" and have it
mean something, which is why these principles exist. Value Based
Engineering taught me that a short list of plain statements can carry a
lot of weight, as long as each one makes sense to someone who has never
written a line of code or used an AI to build anything. So, each
principle below is meant to be understood on its own, and the
explanations further down are there for when you want to know where it
came from and what it looks like in a real app.

## The principles

Human-shaped software is software that works this way:

1. It starts from a human-shaped problem, for people the builder can name, and it cares for everyone it touches, even the people who will never open it.
2. Its reasons are written down where anyone can read them, including the AI that helps to build it.
3. People come away from it more capable, not more dependent on it.
4. People keep the decisions that matter, and the machine does the work it is given.
5. Whatever a machine does in it happens in the open, and a machine never pretends to be a person.
6. The words people read in it were written or chosen by a person.
7. What people make in it belongs to them, and they can take it with them.
8. It is honest about what it costs, and its heart stays free.
9. It respects people's time and attention instead of trying to capture them.
10. It works for as many people as it can, and it says plainly who it does not work for yet.

These came from four apps I built with an AI agent (Archive Watch,
Tidbits Trivia, Bsky Dreams and BOBA Playbook), from the Educational
Model Spec I wrote for AI in classrooms, and from the Universal App
Template, where the method lives. The credits for other people's ideas
are at the end.

## What each principle means

Each explanation says why the principle exists, what it looks like in an
app, and what someone could look at to see it for themselves. Not every
principle fits every app (an app with no automation has nothing to
label), and saying "this one does not apply, because..." is an honest
answer, where silence is not.

## 1. A human-shaped problem, and everyone it touches

**It starts from a human-shaped problem, for people the builder can name, and it cares for everyone it touches, even the people who will never open it.**

**Why.** Community, relationships and learning are not computer-shaped
problems. They only happen when a person does the work. Nine days into
BOBA Playbook, the agent built a price feature that leaned on another
site, and I asked the question that belongs before every big feature:

> if we are just using Radish, there is no reason for this feature to
> exist. People should just go to radish, right?

The Educational Model Spec asks for learning that is "personally
relevant," connected to real challenges people care about. An app is the
same.

**What it looks like in practice.** The builder has answered three
questions of the idea, in writing: should it exist at all, who does it
touch, and what will people learn from using it every day (and stop
learning). "Who does it touch" names the people outside the screen as
well as the people using it. For Archive Watch, that is the folks who
uploaded and reviewed each film on archive.org. For Tidbits Trivia, it
is the volunteers who wrote every fact on Wikipedia and Wikidata. Not
building a feature is a normal outcome.

**How you show it.**

- The written answers to the three questions, in the repository or on
  the app's website.
- The people outside the screen, by group, and one thing the app does
  for them (credit, a link back, a way to correct their work).
- A way for people to reach the builder: an issue tracker, a feedback
  form or an email address that someone reads.

## 2. Reasons written down

**Its reasons are written down where anyone can read them, including the AI that helps to build it.**

**Why.** An agent keeps only the values you write down. Archive Watch
had 4,306 commits by the end of September 2026, and 2,753 of them carry
Claude's name as co-author.
The rule I cared about most in September 2026 was a limit on what AI may
do inside the app, and it held only because it was written in the file
the agent reads at the start of every session. The Educational Model
Spec says the same thing about AI in classrooms: when the AI's behavior
does not match the written specification, "it's a bug to be fixed, not
something we just accept."

**What it looks like in practice.** A "Why we build" paragraph of five
sentences or fewer, in the builder's own words, at the top of the
agent's instructions file. Below it, standing instructions: the rules
the app earned, each with a date and the builder's words in quotes. Each
rule says what holds it, a check or "no check yet," and the ones specific
enough to test have a test (Archive Watch's "one spelling locale" is held
by `tools/test_us_english.py`, which reads every string a person can
see).

**How you show it.**

- Link to the "Why we build" paragraph in `CLAUDE.md` or `AGENTS.md`.
- Link to the standing instructions, with dates and quoted words.
- Name at least one value and the decision it changed: something built
  differently, or not built, because of it. A value that never changed a
  decision is decoration.

## 3. More capable, not more dependent

**People come away from it more capable, not more dependent on it.**

**Why.** The Educational Model Spec's fundamental test is "Does this AI
interaction make the student a stronger thinker, or does it make thinking
unnecessary?" The template asks the same of every feature, with four
questions that came from BOBA Playbook: does it deepen understanding,
invite participation, support human agency, and stay clear rather than
clever? BOBA's search shows its filter tokens (Weapon: Fire, Treatment:
Battlefoil) rather than hiding them behind a "for you" box. Folks who
search that way learn how the catalog is organized. Folks handed a box
learn nothing, and come to depend on it.

**What it looks like in practice.** The structure of the subject shows
through the interface. A ranking says why something is shown. The part
of the app where people think, guess, choose or make something takes
effort on purpose, and the chrome around it stays quiet. A feature opens
more than one way in, so a collector, a player and a newcomer can each
find their own path.

**How you show it.**

- One feature, linked, with what the four questions changed about it
  (a decision entry or a commit message is enough).
- Any recommendation or ranking surface says why an item is there, and
  the person can change or turn off the signal.

## 4. People decide

**People keep the decisions that matter, and the machine does the work it is given.**

**Why.** Across four apps, these were the only things I kept doing
myself: the wish and the values, choosing sources and judging what is
true, devices and accounts and money, using the app every day, taste,
refusing claims that do not match what I know, bringing in other
people, and deciding when to stop and when to ship. Everything else, I
asked for. The research on learning with AI agrees: the loss comes from
handing over the deciding and judging while feeling as if you learned
it. The Educational Model Spec puts it as a rule for teachers: "Human
override: Teachers can always adjust or reject AI assessments."

**What it looks like in practice.** Decisions are recorded with the
reason first, in the builder's words. Commit messages quote the request
that started the change. The log keeps two words apart: *fixed* (the
code changed) and *verified* (something outside the agent saw it work on
a real device). Nothing ships because the agent said it works.

**How you show it.**

- `DECISIONS.md`, with entries that lead with why.
- Commit messages that quote the builder's requests.
- One verified fix, with the evidence (a screenshot from a real device,
  a recorded check) linked.

## 5. Machines in the open

**Whatever a machine does in it happens in the open, and a machine never pretends to be a person.**

**Why.** Tidbits Trivia has a computer opponent that fills in while
nobody else is online, and it earned a rule: it must be labeled as a
computer opponent. A labeled bot is an honest way to start a game. A bot
dressed as a person manufactures a relationship that does not exist. The
Educational Model Spec asks for the same honesty from AI in classrooms:
"Transparency in AI evaluation: Students understand how AI provides
feedback."

**What it looks like in practice.** Every part of the app that runs on
its own (a bot, a suggestion, a guess-ahead search, a machine-written
transcript, an automated reply) does five things. It says what it can
do. It says how sure it is, so a guess looks like a guess. It steps back
when it is unsure. It says why it did what it did, when someone asks.
And it never passes as a person.

**How you show it.**

- A list of every automated feature in the app, with where and how it is
  labeled.
- A screenshot of each label, or a link to the screen.
- If there is no automation, say "does not apply" and why.

## 6. Words from people

**The words people read in it were written or chosen by a person.**

**Why.** On September 26, 2026, I gave Archive Watch this rule:

> I don't want AI making lists and writing copy. Any time we can use
> metadata or user copy/categorization from archive.org.

It is slower. Pulling notes from archive.org's own metadata, and from
the people who uploaded and reviewed each film, meant building a
pipeline and keeping it running. A model could have written ten thousand
blurbs in an afternoon. But a list that looks curated must have been
curated by someone. The Educational Model Spec calls the opposite
"plagiarism by proxy": AI-made content presented as a person's own
thinking.

**What it looks like in practice.** Lists, notes, blurbs and shelves
come from data, from the people who made the content, from the
community's own lists, or from a human editor. A model may help build
the pipeline that selects from those sources. It does not author what a
person reads. The same rule covers the store page and the release
notes: the builder reads them aloud and rewrites anything that sounds
like a machine wrote it.

**How you show it.**

- A standing instruction that says so, in the builder's words.
- For each list or block of copy in the app, its source (a field name, a
  dataset, an editor).
- If AI-written text appears anywhere a person reads it, it is labeled
  as AI-written, on the screen where it appears.

## 7. People own what they make

**What people make in it belongs to them, and they can take it with them.**

**Why.** Some day you will stop working on the app. Archive Watch keeps
people's saved films and lists on their own devices and in their own
iCloud or Google Drive, so nothing vanishes when I stop paying for
something. The Educational Model Spec asks for "minimal data
collection," "portability" and the "right to be forgotten," and it asks
that people "can explain what data is collected about them and how it's
used."

**What it looks like in practice.** The app collects only what it needs
to work. No third-party trackers or advertising identifiers. What people
make lives in a place they control, or can be exported in a form they
can read without the app. People can delete what they made. A sentence
on the website says what happens to their data if the app stops being
maintained.

**How you show it.**

- A plain-language privacy page: what is collected, where it lives, who
  can see it, how to delete it.
- The export, linked or shown.
- The sentence about what happens if the app stops being maintained.
- The app's dependencies, so anyone can confirm there is no tracking
  library.

## 8. Honest about cost

**It is honest about what it costs, and its heart stays free.**

**Why.** In September, the agent designed Archive Watch's Watch Together
feature around a paid voice server, and I stopped it:

> It is absolutely not acceptable. The goal of this app (and all of my
> apps) is for them to cost $0 to run.

In July, when Tidbits Trivia's agent was deciding how much of a new paid
club to put behind locks, the answer was the reason the app exists:
"the whole point of Tidbits Trivia is that we are the world's best
trivia app with the least amount behind a paywall." The Educational
Model Spec asks for "universal access regardless of school funding or
family income."

**What it looks like in practice.** The builder knows what the app costs
to run each month and says it out loud. An app that costs nothing to run
says so. One that costs money says how much and who pays. If the app
charges, the thing it exists to do stays free, and the price is shown
before anyone starts. A cost of $0 to run is the default, not a rule:
some apps need a server, and an honest number is better than a hidden
one.

**How you show it.**

- A line in the repository or on the website: the monthly cost to run,
  and who pays it.
- If anything is paid, a list of what is free and what is not, matching
  the app.

## 9. Time and attention

**It respects people's time and attention instead of trying to capture them.**

**Why.** A production discovery feed was rebuilt twice, and the
lessons became the template's `values-based-feed-ranking` skill. The
first version sorted by
likes per hour, and gave every person the same feed, led by whatever was
viral. The rebuild honors each person's own moderation settings, weights
conversation over virality, and says "why you're seeing this." Archive
Watch earned a related rule: feeds for other apps and assistant access
are "findable on the website, never featured in the apps," so nothing
competes with finding and playing a film. The Educational Model Spec
says AI should never "manipulate emotions for engagement" or "compare
students to others in ways that diminish confidence."

**What it looks like in practice.** No streaks that punish a missed day,
no counters built to bring people back, no notifications sent for the
app's sake. Only essential words on screen. Nobody is ranked against
other people unless they chose to be. Any ranking honors the person's
own settings and says why.

**How you show it.**

- A list of the app's notifications, and what each one is for.
- Any leaderboard or comparison is opt-in, and shown where the choice is
  made.
- Any ranked surface says why an item is shown.

## 10. For as many people as it can

**It works for as many people as it can, and it says plainly who it does not work for yet.**

**Why.** On June 9, 2026, I asked for Archive Watch on every platform
"to make it as widely accessible as possible," built "ONLY NATIVE DESIGN
for each of the platforms." That plan began with a parity matrix,
because a claim that a feature works everywhere is only as good as the
table that says where it does not. The Educational Model Spec
asks for "multiple pathways for processing and expressing
understanding," and for tools that work for people with every kind of
mind and body.

**What it looks like in practice.** Every screen works with the
platform's screen reader, larger text and reduced motion, and its colors
pass contrast in light and dark. Each platform feels like that platform.
The parity matrix is honest: a feature not on a platform yet is marked
as waiting, with a reason, and one a device can never have is marked
that way, with the reason. The oldest hardware the app runs on is
written down. A number the app cannot read shows as a blank that says
so, never as a confident zero.

**How you show it.**

- `PARITY.md`, with the date of its last full audit.
- The "oldest hardware served" row, filled in.
- An accessibility check, linked: a screen-reader pass on each platform
  or an automated contrast check, with its date.

---

## Declaring software human-shaped

A declaration is a public statement, in your repository, that your
software meets these principles, with the evidence beside each one.
Nobody certifies it. You put your name on it, the way a dated standing
instruction in your own words is your name on a decision.

### What a declaration is

1. **A file named `HUMAN-SHAPED.md`** at the root of your repository.
   Copy `docs/human-shaped/HUMAN-SHAPED-template.md` and fill it in.
2. **A short header** the humanshaped.org directory can read: the app's
   name, its links, the principles version, the date, and a status.
3. **One answer for each principle:** *meets*, *not yet*, or *does not
   apply*, with a sentence in your own words and at least one link to
   evidence. "Not yet" and "does not apply" each need a reason.
4. **One value and the decision it changed,** in your words.
5. **Your name and the date.**

### Status

- **Declared.** Every principle is *meets* or *does not apply*, with
  evidence. You may call the software human-shaped.
- **Working toward.** At least one principle is *not yet*. You may say
  the software is working toward being human-shaped, and the directory
  shows which principles are still open. Most apps built in a cohort
  will start here, and that is honest.
- **Withdrawn.** The software no longer meets the principles, or you no
  longer want to make the claim.

### Correcting or withdrawing a declaration

Apps change, and a declaration that was true in March can stop being
true in October. When that happens:

1. **Change the answer, not the history.** Mark the principle *not yet*
   or set the status to *withdrawn*, add the date, and say in one
   sentence what changed. Do not delete the old declaration. The git
   history keeps it, and that history is part of the honesty.
2. **Anyone may raise a question.** If someone thinks a declaration is
   not true, they open an issue on the app's repository naming the
   principle by number (for example, "principle 6: the home shelf blurbs read as
   AI-written") and what they saw. The builder answers it in the issue.
3. **Fix it or change the claim.** Either the app changes, or the
   answer changes. Both are fine. Leaving a claim you know is false is
   not.

The directory shows each app's current status and the date it last
changed. It does not hide apps that move from *declared* to *working
toward*. Moving back is part of living with an app.

### Versions

These principles will change as more people build with them. Each
declaration names the version it answers. When a new version comes out,
an existing declaration stays valid for the version it names, and the
builder can answer the new one when they are ready.

---

## What it costs

These principles are slower. Labeling every automated feature, sourcing
every line of copy, writing an export, and auditing a parity matrix all
take time that a builder could spend on features. A declaration also
puts your name on claims that strangers can check.

I could be wrong about where some of these lines sit. A model
summarizing a long document might be exactly what some people need, and
leave them more capable. If a principle stops your app from serving the
people it is for, raise it, with the principle ID and the decision it
blocked. That is how version 0.2 gets written.

---

## Where these came from

- **The Educational Model Spec** (Ben Wilkoff,
  github.com/bhwilkoff/educational-model-spec): the fundamental test for
  AI and thinking, numbered clauses that can be debugged, data ownership
  and the right to be forgotten, transparency in AI, multiple pathways,
  and economic access.
- **Value Based Engineering and IEEE 7000-2021** (Sarah Spiekermann and
  colleagues): specific principles a claim must meet, "not building" as
  a normal outcome, indirect stakeholders, and self-declared conformance
  with a name on it. The standard itself says it "cannot guarantee that
  the system … is ethical." Neither can these.
- **Value Sensitive Design** (Batya Friedman and David Hendry): the
  ladder from a value, to a rule, to a check.
- **Design Justice** (Sasha Costanza-Chock and the Design Justice
  Network): who participated, who benefited, who was harmed.
- **Constructionism** (Seymour Papert, Mitchel Resnick): low floors,
  high ceilings, wide walls, and "hard fun."
- **Local-first software** (Ink & Switch): people's work should outlive
  the software that made it.
- **Microsoft's Guidelines for Human-AI Interaction:** make clear what
  the system can do and how well, and scope it when in doubt.
- **Calm technology** (Mark Weiser, John Seely Brown, Amber Case): the
  interface stays in the background.
- **"Computer-shaped problems,"** the Bluesky post that started the
  name (bsky.app/profile/mosheroperandi.bsky.social/post/3mgasswgabs23).

The full research, with sources, is in
`docs/research/values-based-approaches.md`.

Read them against your own app. Bring back the one you do not meet yet.
