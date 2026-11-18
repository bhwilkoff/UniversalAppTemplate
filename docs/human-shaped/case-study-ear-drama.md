<!-- Drafted by Claude from Ear Drama's public history on 2026-11-18, at
     Ben's request; every quote is Ben's, dated, from the repository.
     Awaiting Ben's review. -->

# Case study: Ear Drama

On the morning of October 17, 2026, I asked an agent to research a new
app "in a similar vein to Archive Watch, but instead of leveraging public
domain video, I'd like to have a public domain audio app that is
specifically focused upon radio dramas, plays and other public domain
radio shows." By November 16 that app ran on the web, iPhones, iPads,
Macs, Apple TVs, and Android phones, from one repository, in 972
commits, 884 of which carry Claude's name as co-author.

Ear Drama is the first app made from this template from the very first
day, after the template had taken in everything
[Archive Watch](case-study-archive-watch.md) learned in six months.
I want this page to show what that inheritance bought, and just as
plainly, what it could not.

## What Ear Drama is

The Internet Archive holds well over a hundred thousand recordings of
old radio: detective serials, westerns, science fiction, comedies, and
the anthology theaters that adapted a new play every week. As with the
films, almost none of it is easy to browse, and much of it is labeled
by whoever uploaded it.

Ear Drama is a free place to hear that radio, with its dates, casts,
networks, and sponsors, and a Stations section that plays a real evening
of 1947 on its own clock. There are no ads, and no account is needed to
listen. Its own listing puts the other half of it in six words: "Hear
old radio. Make new drama." Anyone can open a play nobody owns anymore,
take one part, and record it while the device reads the other parts
aloud, then hand it to the next person, until every part has a human
voice.

That second half came from me on its second day, in my own words: "you
would take one part and act it out. The other non-recorded roles would
be simulated audio when you are recording your parts (but only your part
would actually be recorded). Then the next person would take one of the
simulated parts and record that." The design doc built from it opens
with a family at a kitchen table, or a class with one iPad.

## The numbers

| | |
|---|---|
| First commit (research, inside Archive Watch) | October 17, 2026, 11:27 am |
| Moved to its own repository, with its history | October 22 |
| Commits through November 16 | 972 |
| With a Claude co-author line | 884 |
| By the GitHub Actions bot | 6 |
| Days with at least one commit | 18 of 31 |
| Busiest day | October 22, 129 commits |

Archive Watch's pipeline wrote a third of its history. Ear Drama's wrote
almost none of it, because the catalog is published as a release rather
than committed back to the repository, a choice Archive Watch taught.

## October 17 to 21: research before a repository

For five days there was no app, only research, done on a branch of
Archive Watch: where every recording lives and what its terms are, what
the law says about recordings made before 1972, which sources describe
episodes and casts, and 697 App Store reviews of other old-radio apps,
read to learn what listeners complain about. The research ended with a
draft catalog of 157,503 episodes in 16,113 series, built before
anyone drew a screen.

On October 19 I settled the question the research kept asking: "It is
definitely a separate app." I bought eardrama.org, and on October 21
the app had its name.

**Lesson:** research and real data come before the first screen (stages
00 and 01), and the research is written down where the next session can
read it.

## October 22: five platforms in one night

On October 22 the research moved into its own repository, made from the
template, and the first build night ran the core five platforms at once:
"I want the Core Five for 1.0, but I want each of these other platforms
as a stub that should be built out once we have the full functionality
built for the core platforms." The template already held the
parity table, the shared data plane, the universal Apple target, the
store pipelines, and the device harnesses, so parallel agents could each
take a platform. That day has 129 commits.

The same day a value changed a decision. I wanted recordings people
made to be shared under CC0, and I wrote: "CC0 is my preferred mode, but
I don't want us to allow for anyone to take the recordings and use them
for AI training or coding." The agent told me CC0 waives every right
and so cannot carry that condition, and that archive.org is open to
every crawler. I chose CC0 with a plain warning on the consent screen
over a license that pretends to restrict what it cannot.

**Lessons:** a template is what lets breadth come early (stage 02); a
value is real when it costs you something you wanted (stage 00).

## October 23 to 29: the owner sees it, and the design starts over

The next week was the one I recognize from Archive Watch: I looked at
the app and said what I saw. On October 24: "I don't see any images or
artifacts from the shows yet." And on the shape of the whole thing: "we
should focus on actions and not content type ... we should mimic the
items from Archive Watch," with recording as something you can do from
anything that has a script, "the content type doesn't matter."

On October 28 the agent reported progress I had not seen, and I wrote:
"We aren't live on anything. You need to keep pushing to update
everything, including database." The work existed, but nobody outside
the repository could touch it. The same day, looking at portraits
fitted over blurred copies of themselves, I asked for more than a fix:
"I think you can find better solutions for different aspect ratios of
images, then just blurring and black bars." On October 29: "the color
combinations are looking terrible, especially on dark mode," and "Red
means recording. Research a better color and use it."

Each of those became research before it became code, and three of them
became skills this template now carries:
`artwork-presentation-design` (a picture's box takes the picture's
shape), `uniform-imagery-design` (photos you did not take read as one
set through the presentation, never by changing what they show), and
`catalog-experience-design` (design the sparse record first, because
most records in a catalog you did not write are sparse).

**Lessons:** the agent is never the tester, and "done" means someone
outside the repository can open it (stages 04 and 05); when the same
complaint comes back, ask for research and a skill, not another fix
(stage 04).

## November 14: "a database of old content"

Three weeks after five platforms existed, I sat down with the app and
wrote the sentence this page is really about: "It is entirely unclear
what the app is or how to use it easily... Right now, it just shows as
a database of old content." And: "The ability/functionality for
recording new Ear Dramas is significantly buried." The research that
followed found Home opening on a chart with no Play button, and the
recorder three or four taps behind a hidden filter.

The template had carried six months of engineering into one night. It
could not carry what the app was for, and nothing but using it could
show me that the app did not say so. Home now opens on what is on the
air, with Record beside Listen, and a script reader came out of the
same day: "You should be able to read a script and turn pages and mark
them up and do all of the things that a good book/script reading
experience should contain."

That afternoon I also wrote that playback "seems to take a very long
time to get started... resuming play from a paused show doesn't resume
the show correctly." The agent measured before it changed anything: on
Apple devices a setting downloaded the whole file before the first
sound, and tapping Play took 2.7 to 12.3 seconds to a moving clock.
After the fix it took 1.5 to 3.1, checked on an iPhone 12, an Apple TV,
a Mac, and a Pixel.

**Lesson:** a feature set is not an app, and only the owner using it
can tell the difference (stage 01, again, at any stage).

## November 14 to 16: App Review, and holding it back

The first version went to App Review on November 14. The next day App
Review asked for more information, including a screen recording on a
physical device showing sign-in, account deletion, and how people
report and block one another in shared plays. The agent recorded what
it could drive over a cable, and I recorded the Face ID parts myself.

On November 16 I held the resubmission so the app would look right on
a folding iPhone, the Duo: "There is no reason to have the first
version of our app not look as good as possible on one of the most
important devices for new apps." Now Playing stands in two panes when
the phone is open, and closing it mid-take keeps recording.

**Lesson:** shipping is a conversation with a reviewer, and the evidence
a reviewer asks for is the same evidence you should want (stage 05).

## What the history shows

1. **The template moved the starting line.** Five platforms on day one
   is only possible because another app paid for every lesson first.
2. **It did not move the finish line.** The questions that made Ear
   Drama clear (what is this, and where do I make something) came from
   the owner using it, exactly as they did for Archive Watch.
3. **Making beats consuming.** The half of the app that asks people to
   perform together is the half most worth building, and it was the half
   most buried.
4. **Every correction became something reusable.** Three skills and a
   list of decisions went back into the template, which is how the next
   app starts further along.

## How these numbers were made

The repository is public at github.com/bhwilkoff/Ear-Drama. I counted
every commit reachable from `main` through November 16, 2026, using each
commit's author date in Mountain time:

```
TZ=America/Denver git log --date=format-local:%Y-%m-%d --format='%ad'
```

A commit counts as Claude co-authored when its message has a line
beginning `Co-Authored-By:` that contains "Claude." The research
commits before October 22 were made on a branch of Archive Watch and
moved with the app. The catalog counts are from the first built
catalog (release `catalog-2026-10-21`); the app serves a smaller set,
the series that pass its rights and quality rules. Quotes are from
Ear Drama's `DECISIONS.md`, `docs/PLAYS-DESIGN.md`,
`docs/research/RESEARCH.md`, and `AUTONOMOUS_PROGRESS.md`, each with
its date.

## What it does not show

As of November 18, Ear Drama is not in any store, and nobody but me has
recorded a play in it. Its `HUMAN-SHAPED.md` says "working toward," and
every answer in it that has to be mine is still blank. A month of
commits says the app exists, and not yet that a family at a kitchen
table has made something with it.

That is the next round, and it is yours to watch.
