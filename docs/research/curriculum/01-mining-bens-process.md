# Mining my own process for the curriculum

*Curriculum research 1 of 5. Written by Claude from Ben's repositories
and prompt archive, October 7, 2026, awaiting Ben's review.*

Four apps carry most of what I know about building human-shaped software
with an agent: Bsky Dreams (170 commits, February 20 to June 30, 2026),
BOBA Playbook (2,297 commits from April 3), Archive Watch (4,461 commits
from April 17), and Tidbits Trivia (1,632 commits from June 17). Together
they hold 8,560 commits and 3,863 prompts I typed into Claude Code, and
this note reads them for one thing: the order in which a nagging problem
actually became a running app, so that a cohort can follow that order on
purpose instead of by accident.

The curriculum should teach the sequence I actually used, not the one I
would have described.

## Where this comes from

- **Commit histories** of the four apps, read through GitHub's API on
  October 7, 2026 (counts and dates below come from those lists).
- **Each app's own record**: its README, DECISIONS.md, SCRATCHPAD.md,
  and pitch.
- **My prompt archive**, every prompt I typed into Claude Code since
  March 2026, grouped by project. It is private and holds credentials, so
  it is read here for patterns only; quotes are short fragments with
  nothing private in them, cited as "prompt archive, app, date".
- **This template**: [`COURSE.md`](../../../COURSE.md), the path in
  [`docs/path/`](../../path/), and the talking guide in
  [`talking-to-your-agent.md`](../../path/talking-to-your-agent.md).
- **My piece on human-shaped problems**, kept word for word in the
  site's DECISIONS.md under "Human-shaped problems (October 6, 2026)".

## The sequence I actually went through

Each phase below names what went in, what came out, how long it took in
the four apps, and the evidence it left behind. The durations vary a lot,
and the reason is worth saying before the table rather than after it:
Tidbits Trivia went from its first commit to a TestFlight build in two
days (Tidbits-Trivia 52ea669 on June 17, fa466f6 on June 19), while
Archive Watch took seven weeks to its first App Store upload (6962040 on
April 17, 621c0a5 on June 4). Tidbits started from the template the
other three apps had already built; its DECISIONS.md still opens with
the template's own header and entries. Most of what a cohort saves, it
saves because those first three apps went slowly.

### 1. Living with the hum

**In:** a part of my life that kept bothering me. **Out:** a sentence
about who the app is for and what it refuses to do. **Time:** months,
before any commit. **Evidence:** the why at the top of each README.

None of the four apps began as an idea for an app. Bsky Dreams began
with Bluesky feeling unfinished to me, and its README names what it
optimizes for instead of time on the platform: "does this invite deeper
engagement, more critical thinking, or more meaningful connection?"
(Bsky-Dreams README, "Why Build Another Client?"). BOBA Playbook began
with a card game, Bo Jackson Battle Arena, and its pitch says the goal
is "to help you engage with the game more deeply" rather than do the
thinking or collecting for the player (BOBA-Playbook PITCH.md). This is exactly the hum in
my piece on human-shaped problems: "something that has gone unsolved for
months or even years" and "something that you cannot do yourself."

What the record does not show is how I chose these problems over others.
That happened in my head, before the agent, and so a cohort will need a
step I never wrote down (see "What the record cannot teach" below).

### 2. Writing the why, and researching, before building

**In:** the hum. **Out:** a values note, a research doc, and the first
decisions. **Time:** the first day or two. **Evidence:** the first
commits.

Bsky Dreams' first commit is "Add learning philosophy note and initial
project scaffold" (Bsky-Dreams 9df79a3, February 20). Archive Watch's
first commit after the empty one is "Add research docs for metadata
sources and design reference" (Archive-Watch 32217eb, April 17), and the
next day logs Decisions 006 to 010, including "No user accounts; all
state local" (4162f80). BOBA Playbook's first real commit is "Checklists
and Game Rules" (BOBA-Playbook 48affbb, April 3), the game's own rules
written down before any screen.

### 3. Real data first

**In:** the question of what the app is actually about. **Out:** a
working source of real things (cards, films, posts, facts). **Time:**
one to four days. **Evidence:** pipeline and catalog commits, and the
counts in their messages.

Archive Watch's first week is mostly data: a categorization schema and
seed pipeline (85abdb0, April 18), then "astonishingly few" films in the
simulator (prompt archive, Archive Watch, April 19), then research into
other sources, then "Full pipeline run: seed (3k) + full (25k) catalogs
from 123k federated works" (6c5c931, April 20). Tidbits Trivia's quality
problem was a data problem too: "Fix broken question construction:
answer-leak (48%→0%)" (Tidbits-Trivia 718cd2a, June 17) and "Regenerate
corpus with reworked summary path: 10,776 → 4,743 (quality over
quantity)" (3a3573d, June 19). The template already says this in stage
01 ("Real data"); the history says it is where the first week actually
goes.

### 4. One platform I could see easily

**In:** the data and the why. **Out:** one platform running.
**Time:** the same day to a week. **Evidence:** the first "M1" or "v1"
commit.

Three of the four apps started on the web, because it is the easiest
place to see progress. BOBA Playbook's web search mode shipped the day
the project began (c7c5b6f, April 3). Tidbits Trivia added a web mirror
on its first day and that is where I tested: "I'm testing on the web,
which is the easiest way for me to see the progress" (prompt archive,
Tidbits Trivia, June 17). Archive Watch is the exception, built for the
Apple TV first because that is where films are watched (Decision 006,
"tvOS as the primary (only consumer) platform").

### 5. Rounds of feedback from my own device

**In:** the running app, in my hand. **Out:** a list of what is wrong,
fixed in rounds. **Time:** days, often the most intense days of the
project. **Evidence:** commits named "round", and screenshots in the
prompts.

Archive Watch's April 19 runs from "UI feedback pass" to "UX round 7"
(36daef9 to 2436f65), and Tidbits Trivia names its first three days
"Round 2" and "Round 3" (e71b642, ce74caa). Across the four apps, 8 to
18 percent of my prompts say some form of "still" or "I don't see"
(578 prompts in all), and the commit messages say "round" 172 times. The
course already tells this as Archive Watch's third day; the count says it
is the normal shape of the work, not a bad week.

### 6. Writing the plan down as milestones

**In:** more ideas than one session holds. **Out:** numbered milestones
in a scratchpad, and decisions with reasons. **Time:** ongoing, from the
first week. **Evidence:** the milestone numbers in commit messages.

Bsky Dreams went from "Milestone 5" to "Document milestones 8–27 and
architecture decisions from planning session" in its second day
(14d0678, February 21), and later commits implement them by number ("M41
to M51", ba8d912). BOBA Playbook's commits run "M0 setup", "M1: Search
Mode", "Major Updates for M3" (54404da, c7c5b6f, 80daf06). Archive Watch
has 133 commit messages that mention a decision.

### 7. A second platform, and parity

**In:** a first platform people are using. **Out:** the same app,
native on another device, and a list of what differs. **Time:** a week
to two months. **Evidence:** a PARITY.md, and commits that say parity.

Bsky Dreams added its iOS app about three weeks after the web one
(91609f4, March 15). Tidbits Trivia did three more platforms in its first
day because the template already held the pattern ("Apple TV app",
5a9537c; "Android app ... the 4th platform", 9f644fe; both June 17). Three
of the four apps keep a PARITY.md.

### 8. Seeing it work, with something other than the agent's word

**In:** fixes the agent says are done. **Out:** a check that proves it.
**Time:** grows with the app. **Evidence:** audit and validator commits.

On Archive Watch's worst day the agent and I went back and forth over
the Apple TV's focus ("DetailView: stop fighting the tvOS focus engine",
ee3ad36), and what ended it was not another fix but two tools and a
document: a visual validator, a layout checker, and a playbook (ddf6393,
fcf5317, and 2c0be46, all April 19). "Audit" appears in 225 commit
messages across the apps.

### 9. Someone else's device

**In:** an app I trust. **Out:** a build in another person's hand.
**Time:** two days (Tidbits) to seven weeks (Archive Watch). **Evidence:**
TestFlight and store commits, and beta feedback.

BOBA Playbook had a public TestFlight link and a beta test plan
(PITCH.md, BETA_TEST_PLAN.md), and its first beta feedback lands as six
fixes in one commit (94ac478, May 20) after "a call with a beta tester"
(prompt archive, BOBA Playbook, May 20).

### 10. Living with it, and letting the agent keep going

**In:** a backlog bigger than my evenings. **Out:** loops that work
through it, and a record that survives a context reset. **Time:** months.
**Evidence:** loop and handoff docs, and the commit counts per month.

Archive Watch made 17 commits in May and 2,216 in September. The change
was loops: "I need you to implement a loop to continue tasks so that you
don't just stop when you finish the first set" (prompt archive, Archive
Watch, June 3), and the same complaint in Tidbits Trivia on June 20.
Handoffs before a context reset are a habit by then ("Docs: compaction
handoff", Tidbits-Trivia a9502f1, June 17).

## Where I got stuck, and what got me out

Five patterns repeat across the four apps. Each one is a lesson a cohort
can meet on purpose.

| Stuck | What it looked like | What got me out |
|---|---|---|
| **The agent fixes what I cannot see** | "Hmm... I don't see the new card-focused approach" (prompt archive, Bsky Dreams, March 11); "I don't see any changes to the questions on the web app" (Tidbits Trivia, June 17) | Saying what I saw, where, on which device, with a screenshot; and in Tidbits, a service-worker fix, because the old data was cached ("Fix stale-cache", 79e1fd6) |
| **The same bug, over and over** | Archive Watch's focus rounds, April 19 | A tool that checks it and a playbook that remembers it (ddf6393, fcf5317, 2c0be46) |
| **Not enough real data** | "astonishingly few of them" (Archive Watch, April 19) | Asking the agent to research sources before building more (6c5c931) |
| **Quality I could feel was wrong** | Answers inside their own questions, shown in four screenshots (Tidbits Trivia, June 17) | Measuring it ("answer-leak 48%→0%", 718cd2a) and choosing fewer, better items (3a3573d) |
| **The agent stopping** | "you clearly have stopped again" (Tidbits Trivia, June 20) | A loop with a written backlog, and a handoff document before every reset |

There is a sixth, quieter one: **starting in the wrong tool**. Archive
Watch began in the desktop app and on my phone, and moved to the command
line because "you can
do things that the desktop app cannot" (prompt archive, Archive Watch,
April 18), and BOBA Playbook began in Cowork and moved into the template
on its first day (35b190d, then 54404da). A cohort should start where
the work will finish.

## What the record cannot teach

Three things happened outside the agent, so the archive is silent about
them, and the curriculum has to supply them.

- **Choosing the problem.** My problems were already chosen when the
  first commit landed. A student needs a way to find their hum, test it
  against the computer-shaped version of the same wish, and pick one.
- **Talking to the people it is for.** BOBA Playbook's beta call shows
  up in one prompt; the conversations with players themselves are not in
  any repository. Stage 07 says "Build it with the people it is for",
  but the first weeks need it too.
- **Deciding when it is enough.** Every app kept growing. The record
  shows no moment where I decided a version was finished for its people,
  only moments where a store or a tester forced the question.

## A chunking for five weeks

Each chunk centers on one question, is done as conversations with the
agent and looks at a real device (never hand-edited files or local
servers), and leaves an artifact. The week numbers match
[`COURSE.md`](../../../COURSE.md); the chunks inside them are new.

| Week | Chunk | The question it centers on | What it leaves |
|---|---|---|---|
| Prep | Set up | What do I need in order to build at all? | Their app's address open on their own phone |
| 1 | Find the hum | What has bothered me for months that my current tools cannot fix? | Three candidate problems, in their own words |
| 1 | Human-shaped or computer-shaped | Does this problem see people as stories or as data points? | One problem chosen, with the computer-shaped version written beside it |
| 1 | The why, written first | Who is it for, and what will it refuse to do? | A values note in the repository, before any feature |
| 1 | Real data | What is this app actually about, in real things? | A working source of real data, with one surprise it taught them |
| 1 | One platform you can see | What is the smallest version I can hold in my hand this week? | One platform live, and the first round of feedback |
| 2 | Rounds | What is still wrong, and how do I say it so it gets fixed? | Two or more numbered feedback rounds, with screenshots |
| 2 | Milestones and decisions | What comes next, and why did I choose this over that? | A milestone list and three decisions with reasons |
| 2 | A second platform | What does this app become on a different device? | A second platform, and one parity gap they found themselves |
| 3 | Seeing it work | How do I know a fix is real without taking the agent's word? | A check or screenshot that proved a fix |
| 3 | Its own look | What does this app look like when it comes from its why? | The app's look beside the template's default |
| 4 | Someone else's hand | What happens when a person I did not build it for uses it? | The app on another person's device, and what they said |
| 4 | One honest number | What can I learn from the app in the world without watching anyone? | One number, read honestly |
| 5 | A feature from living with it | What do I want now that I have used it for a week? | A feature that came from their own use |
| 5 | Teaching the agent to remember | What would the next session get wrong if I did not write this down? | A handoff note and one skill or memory |
| 5 | Enough, for now | What does this version need to be finished for its people? | A shown app, and the decision about what waits |

The first week carries more chunks than the others because the record
says that is where the real work is, and because the problem-finding
steps are the ones I never had to do with an agent. If that is too much
for one week, "Real data" and "One platform" can move into week 2
without changing anything else.

## The evidence each chunk leaves

Every artifact above already lives somewhere a teacher can see it and a
credential can point to it, because the method writes everything down.

- **In the repository:** the values note, the decisions, the milestone
  list, the parity notes, the handoff, the skills. Each is a file with a
  date and a commit, which is the kind of evidence the credential already
  signs.
- **On the hub:** the bring-backs (the rounds, the screenshot that
  proved a fix, the other person's words) and the recognitions given in
  class.
- **In the student's own words:** the three candidate problems and the
  computer-shaped version beside the chosen one. These are new, and they
  are the only artifacts that do not come from building, so they belong
  in the cohort's first bring-back rather than in the repository, unless
  the student chooses to keep them there.

What this note cannot answer is whether this order works for someone who
has never built anything. That is what the first cohort is for.
