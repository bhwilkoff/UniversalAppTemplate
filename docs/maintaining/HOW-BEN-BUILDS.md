# How Ben builds

Source material for rewriting the teaching path (`docs/path/00` to `08`).
This is not a lesson. It is the record the lessons should be built from:
what Ben Wilkoff actually typed to Claude Code, what the agent did in
response, what Ben looked at to judge it, and where it went wrong.

Written 2026-09-30.

## Where this comes from, and how far to trust it

- **Ben's own prompts.** 612 prompts typed into Claude Code between
  2026-08-23 and 2026-09-30: 528 in Archive Watch and 84 in Tidbits
  Trivia. These are verbatim. Where this document cites a date and an
  app with no other note, the quote comes from this log. Typographic
  apostrophes are normalized; spelling and typos are kept.
- **Commit messages that quote him.** The template's standing rule is
  that a commit quotes the request that caused it, so the git histories
  carry Ben's words back to April. These are marked "(commit quote)".
  They are close to verbatim but the agent sometimes trimmed them with
  "..." and a few are paraphrases (an early one reads "User: build
  native iOS/Android/web versions..."). Treat them as his words, lightly
  edited.
- **The four git histories.** Archive Watch (4,298 commits, 2026-04-17
  to 2026-09-30), Tidbits Trivia (1,594 commits, 2026-06-16 to
  2026-09-10), BOBA Playbook (1,986 commits, 2026-04-03 to 2026-06-30),
  Bsky Dreams (170 commits, 2026-02-20 to 2026-06-30).
- **The memory folders** for Archive Watch and Tidbits Trivia, where the
  agent saved each correction with a "Why" line.

One honest caveat before anything else. Ben's practice changed a great
deal between February and September. In the first weeks (Bsky Dreams,
early BOBA, the first weeks of Archive Watch) he committed by hand
("So much wow", "iOS updates", "Major fun times" are real Bsky Dreams
commit subjects), created the first Xcode project himself when the
agent's scratchpad told him to, and pasted Xcode compiler errors back
into the chat. By June he had stopped doing all of that and was
telling the agent to stop asking him to. The "what Ben never did"
section below describes his mature practice, from roughly June onward,
and says so where the early record differs.

---

## A. The loop Ben actually runs

Stated in one breath: Ben says what he wants, names where the truth
comes from, lets the agent build all of it, then lives with the app on
his own devices and tells the agent what he sees. When the agent gets
something wrong twice, he makes it write the lesson down. When a job is
big, he puts it on a timed loop and checks in on it. When it works, he
tells it to ship, and he expects shipping to need nothing from him.

The pieces, in detail.

### A1. How a project starts

Every project began with a wish, a real data source, and a template.
None began with a spec, a schema, a wireframe or a file Ben wrote.

**Archive Watch, 2026-04-17.** The first session ran in Claude Code on
the web (the branch was named `claude/archive-org-apple-tv-5bKXB`). The
first real commit was research, not code: "Add research docs for
metadata sources and design reference," documenting how to layer TMDb,
Wikidata, Commons and the Library of Congress on top of archive.org, and
synthesizing design patterns from the Apple TV app, UHF and Channels.
The next commit named the project, logged Decisions 006 to 010
(tvOS-only, TMDb non-commercial, no accounts, free release), and
scaffolded the networking. The day after that brought the data pipeline
and an editorial dashboard seeded with Ben's seven personal favorite
films. The Apple TV app only started to look like something on the third
day, when the catalog held 799 films.

**Tidbits Trivia, 2026-06-16.** Ben made the repository from the
template at 6:12 PM ("Initial commit" by bhwilkoff, with the
template's whole `.claude/` folder of skills and commands in it). By 8:01 PM the iOS app existed. The
kickoff prompt, as the first commit quotes it:

> "A fully realized multi-player trivia game based entirely upon facts
> pulled from the open Wikipedia API ... The final outcome of this
> session should be a working iOS version with all v1 versions of the
> features fully implemented." (Tidbits, 2026-06-16, commit quote)

Then, the same evening, four more prompts, each a single line:

> "keep pushing forward with the next round of work to fully build out
> this game/app" (Tidbits, 2026-06-16, commit quote)

> "Let's tackle the quality moat next." (Tidbits, 2026-06-16, commit quote)

> "keep pushing forward with the next set of work to build this app!"
> (Tidbits, 2026-06-16, commit quote, twice)

Those five prompts produced, in about five and a half hours: the iOS
app, a web mirror of it, a 10,006-question corpus built from Wikidata,
an Apple TV app, and an Android app. "ALL FOUR PLATFORMS PLAY," the last
commit of the night says.

**BOBA Playbook, 2026-04-03.** The first commits are "Cowork files" and
"Checklists and Game Rules." The card catalog (17,793 cards) arrived
from a separate Claude Cowork session, not from Ben typing. The web app's
Search Mode shipped the same day. Later BOBA work ran across two AI
surfaces with written handoffs (`COWORK_RETURN.md`, "Cowork handoff for
the gap").

**Bsky Dreams, 2026-02-20.** The very first commit is "Add learning
philosophy note and initial project scaffold." The values paragraph came
before any feature. Work then ran as numbered milestones (M1 to M65)
written into `SCRATCHPAD.md` by the agent from planning sessions.

**What he hands the agent at the start:**
1. A wish in plain language ("a fully realized multi-player trivia game").
2. A real source of truth (archive.org, the Wikipedia API, a card
   catalog, the Bluesky API).
3. The template, with its "Why we build" paragraph already in `CLAUDE.md`.
4. What "done for this session" means ("a working iOS version").

**What he does not hand it:** data rows, a file layout, a list of
screens, or code.

### A2. How data gets into the app

The agent builds a pipeline from the real source, and the pipeline runs
in GitHub Actions, not on Ben's Mac. Ben steers the data entirely by
judgment, in product words, and he steers it constantly.

Representative steering, in order:

> "add missing episodes to the queue of videos we are searching for."
> (Archive Watch, 2026-05-31, commit quote)

> "use our multiple APIs that we've been using to pull metadata ... to
> instead go the other direction and identify all of the titles that we
> should be searching archive.org for that are public domain or have
> otherwise lost their copyright." (Archive Watch, 2026-06-11, commit quote)

> "There should be thousands of documentaries. Why are you saying there
> are only 6?" (Archive Watch, 2026-07-19, commit quote)

> "The goal is not the most questions, but rather the best trivia
> questions anywhere. Are you auditing all of these and rewriting for
> interest and delight?" (Tidbits, recorded in memory `quality-over-volume-steer`)

> "Why would I want you to use a fallback number. We have a way to
> identify the power number from our ocr pipeline. ALL CARDS SHOULD BE
> correct based upon the image that they show in the app or the best
> data we have." (BOBA, 2026-05-15, commit quote)

> "I want all titles in the database to be accurate and to represent
> only the title." (Archive Watch, 2026-08-29)

> "I continue to find descriptions and other metadata that are not
> appropriate for the films and titles that they are attached to. [...]
> I want every piece of information within our app to be both accurate
> and unbiased." (Archive Watch, 2026-09-16, a /loop prompt)

And on where the pipeline runs:

> "I want to make sure that we are transitioning to the cloudflare
> workers entirely for the future. I'm okay to run more locally now, but
> the whole point is to make it so that the estimator and the data is
> getting better over time without being dependent upon my mac running."
> (BOBA, 2026-05-30, commit quote)

Ben finds data problems by using the app and by clicking one real item:

> "Why does https://archivewatch.org/item/shakedown-1950 have actors
> names in the title?" (Archive Watch, 2026-08-29)

> "Why is the name of this movie and the description different?
> https://archivewatch.org/item/the_last_three" (Archive Watch, 2026-09-02)

> "It is playing correctly now, but I do notice that 2 Stupid Dogs is a
> show from the 1990s, so how is it public domain? Are the rights
> clearing gates not working correctly?" (Archive Watch, 2026-09-06)

The pattern: one concrete item, then the demand to generalize. "Can you
look for this issue anywhere else in the app?" (2026-09-06). "Can you
audit for those types of errors within our process so these kinds of
errors don't occur?" (2026-06-10, commit quote).

### A3. How he reviews

Ben is the app's heaviest user. He reviews by using the real apps on
his own devices, from TestFlight, the stores, sideloads the agent put on
the device, and the live websites. He watches films on his TVs every
evening. He reports what he sees in plain words, often mid-use.

> "I actually watch on every device. I am constantly using and testing
> with each device, but it is now time to start working on problems that
> real users are seeing." (Archive Watch, 2026-09-11)

> "I'm doing some spot checks on both iPhone and Apple TV. I'm watching
> 'The Maggie'. On the Apple TV, neither the subtitle file nor the
> generated captions show at the correct times (both significantly
> delayed)." (Archive Watch, 2026-08-27)

> "I've been leaving the 'Party Play' going on my TVs to enjoy ambient
> videos as I work and I realized that I wanted three different features
> to be built into the view that don't currently exist" (Archive Watch, 2026-09-14)

> "I'm looking at the latest version of the iphone app and I don't see
> any way to share playlists" (Archive Watch, 2026-09-14)

> "Did you forget about the join button on the web platform? I still
> don't see it resolved from github pages." (Tidbits, 2026-09-07)

On 2026-09-06 he narrated a bug in real time from the couch, while the
agent instrumented the Apple TV: "The audio just went out on the video
that is playing now." (20:24), "The movie playing now just lost audio"
(20:35), "Audio went out." (20:46), "Audio just went out again."
(20:49), and a dozen more over the next two hours, ending "The full movie played
without audio lost" (22:24) and then, when the fix was a workaround,
"That is not a solution" (22:30).

He also routes other people's eyes into the loop:

- Testers: "some of my testers have noticed significant issues within
  the Tidbits Trivia tvOS app" (Tidbits, 2026-08-24).
- Real users in public: "I posted about the app with links to all of the
  platforms on Reddit yesterday [...] I'd like you to use the
  comments/feedback from the users on this post to identify issues that
  need to be solved across all platforms." (Archive Watch, 2026-09-11)
- A user's message: "I just got this feedback for the fire tv version:
  'I tried to install on a firestick but it said all 3 of my devices
  were incompatible.'" (Archive Watch, 2026-09-10)
- Community exports: BOBA's loop mined Discord exports for
  user-requested features (BOBA, 2026-05-20).

What changed over time is who does the checking between his spot
checks. By August he refused to be the tester:

> "You should be able to see stuttering and swallowed audio. You should
> be able to see the captions and measure their timing and their
> accuracy... I should not be the one testing your work." (Archive
> Watch, 2026-08-14, commit quote)

> "you're guessing, build a simulator so you can iterate locally instead
> of making me test every tweak." (BOBA, 2026-05-16, commit quote)

So the review loop has two layers: the agent proves its work on real
devices with its own instruments, and Ben lives with the result and
reports what the instruments missed.

### A4. How feedback rounds work

Two shapes.

**The numbered batch.** After a stretch of use, Ben sends a long
numbered list. The agent works through it, usually on a loop, and the
commits cite the item numbers. Examples:

- Roku, 2026-09-05: twenty numbered items, beginning "1. There are more
  animated movies/videos in the hero row than I would like. At most,
  there should only be one animated feature. 2. There are multiple
  shelves that only have 4 or 5 items. No shelf should display as less
  than a full row. 3. The same shelves should show up across all
  platforms."
- Roku, 2026-09-06: ten more ("More feedback for the Roku app:").
- Android TV, 2026-09-03: six items, ending "Please make use of the full
  suite of devices you have access to in order to build out and test all
  of these features."
- Mac Watch Together Studio, 2026-09-22: six items, beginning "Alright,
  the Watch Together Studio doesn't seem to work as it should."
- Archive Watch v1, 2026-06-03: "the 20 requested items," which the
  agent turned into a phased plan before building (commit "App Store v1
  roadmap (phased backlog of the 20 requested items)").

**The one-liner during use.** Short corrections while he is looking at
the screen: "The pills for the TV page start off by saying 'All films'
instead of 'All TV'." (2026-09-06). "It seems like ephemeral films
carries a single title" (2026-09-27). "Dollar store / dollar store
killers made it through to the Xtreme feed." (2026-09-27).

The April record shows the same rhythm from the first week: Archive
Watch commit subjects on 2026-04-19 run "UI feedback pass", "UI feedback
round 2", "round 3", "round 4", "UI round 5", "UI round 6", all in one
day, each a batch of what Ben saw on the Apple TV.

### A5. How he corrects

Directly, with the reason, and usually by pointing at something that
already works: a native API, another app, a documented path, or a
previous success.

> "NO CUSTOM OVERLAYS... You can do this if every other video app on the
> market can do subtitles with the ability to skip. This is native
> functionality. Search better through the APIs." (Archive Watch,
> 2026-06-22, recorded in memory)

> "The automatic captions should NOT run 1-2 seconds behind speech. The
> whole point of the automatic captions API is that there is no delay.
> [...] you are claiming that it is structural transcription lag, but
> that isn't true. Do more research to see the right way to ensure this
> delay doesn't happen." (Archive Watch, 2026-08-27)

> "I just confirmed. The audio went out on the TV speakers as well. It
> ISN'T Airplay. Please stop guessing and figure out the issue."
> (Archive Watch, 2026-09-06)

> "You keep on saying (for many different sessions) that AirPlay doesn't
> work, but it does work. And it is documented." (Archive Watch, 2026-08-31)

> "You are absolutely wrong about not being able to submit a new version
> to the Google play console. That is a proven path and all versions are
> submitted by api" (Archive Watch, 2026-09-03)

> "You need to re-read the repository if you think we don't have a
> privacy policy. We have one and have had one for months." (Archive
> Watch, 2026-09-08)

> "Apple, Google, and Microsoft have NO WAY TO KNOW what has been
> submitted to each other's stores. The IAPs are all different for each
> different store, so there is literally no reason to publish them one
> after the other. Where is that idea coming from, as it is severely
> wrong." (Tidbits, 2026-08-31)

He also corrects the agent's claims, not just its code:

> "I am so so frustrated with you telling me things are fixed and
> working and what you can and cannot do on each platform." (Archive
> Watch, 2026-08-27)

> "This version is a huge step backward and you keep claiming things are
> fixed and you have fully tested them, but I see no evidence of
> either." (Archive Watch, 2026-08-14, commit quote)

And the agent's process:

> "I feel like we had solved all of this so so long ago as we were
> building the last resilient player for apple's platforms. Are we
> redoing work that has already been done and is documented already?"
> (Archive Watch, 2026-09-07)

> "This is insane. You have direct connections to each apple tv. You
> have documentation for how to do and it the connections are right
> there. There is no reason you can't connect." (Archive Watch, 2026-09-24)

### A6. How rules get written down

A correction that could recur becomes a written rule, and Ben asks for
that explicitly when the agent does not do it on its own.

> "Can you make a memory so that after every tick when you re-arm the
> loop, you give a time when the next tick should occur?" (Archive
> Watch, 2026-08-29)

> "If you are low on context, compact. Can't you simply add that as a
> rule?" (Tidbits, 2026-08-01, commit quote)

> "You have found significant issues in every tick and have still not
> developed rules to stop from seeing poorly written questions,
> distractors, or poor examples of gameplay." (Tidbits, 2026-08-01, commit quote)

> "I thought we had a standing rule to use US-specific english spelling
> and language." (Archive Watch, 2026-09-22, recorded in memory; there
> was no such rule, so the agent wrote one and a test for it)

Where the rules land, from the records:

- **Memories** (the auto-memory folder). Archive Watch has about 180
  files; the "Standing rules (owner directives)" section of its index
  lists rules like "Real devices only, never emulators," "Ship Apple
  releases WITHOUT asking," "Report times in Mountain time, never UTC,"
  "Audits fix everything found, don't ask." Each carries Ben's quote and
  the date.
- **`CLAUDE.md` standing instructions.** The no-AI-copy rule and the
  side-doors rule went here on 2026-09-26.
- **Decisions.** Product calls he makes become numbered decisions (the
  six he answered on 2026-09-25 became Decisions 139 onward; "hidden from
  recommendations, but available via search" became Decision 149).
- **Binding design docs.** "Everything in a menu" became macOS-DESIGN
  §B2; "Join must be obvious" became R-JOIN-1 in iOS-DESIGN.
- **Skills and the template.** Recurring lessons go upstream (A13).

### A7. When he asks for research first

Whenever the thing is new to the project, whenever a fix has failed
twice, or whenever the agent says something is impossible.

New capability:

> "Can you investigate the ability for the Apple versions of the app to
> take advantage of SharePlay and synchronous viewing of movies together
> using Apple's API's and version 27 platform features?" (Archive
> Watch, 2026-08-31)

> "Can you research the feasibility of creating a version of Tidbits
> Trivia as an iMessage game that you could play in a direct iMessage
> conversation or even in a group conversation?" (Tidbits, 2026-09-01)

> "I'd like you to start researching (and then implementing) offline
> viewing/downloading movies" (Archive Watch, 2026-09-01)

> "Is there anything we can learn from the site or features that would
> complement Archive Watch? Can you fully research the site and its
> features and write up a list of features to further build out our
> functionality" (Archive Watch, 2026-09-26, about orphanedfilms.com)

Stuck fixes:

> "There have to be better ways of doing this audio routing and syncing.
> Can you do some more research before we continue to burn cycles on
> this?" (Archive Watch, 2026-09-18, commit quote)

> "You are doing fixes and reversions without researching the right way
> to solve for these in lasting and sustainable ways... Do the full
> research. Learn what the best practices are. [...] We are not on the
> prototyping stage. We are building large-scale working software that
> needs to be best in class." (Archive Watch, 2026-08-17, recorded in memory)

Refused limits:

> "That cannot be the way in which you have to get API access enabled.
> Amazon is a huge company and there is no way that they require every
> developer to ask for API access. You need to keep looking for ways to
> do this" (Archive Watch, 2026-08-31)

> "You keep on saying that Google's export is broken, but it doesn't
> make any sense. The data exists. [...] You cannot stop at 'the old way
> doesn't work, so I will just wait until it does again'." (Archive
> Watch, 2026-09-14)

The research-first request almost always converts to "fully implement"
in the next message once the answer is yes: SharePlay went from
"investigate" (2026-08-31 20:38) to "I'd like you to fully implement
SharePlay for all Apple platforms" (20:45); iMessage went from
"research the feasibility" (2026-09-01 00:22) to "Please fully build out
and enable a tidbits trivia iMessages app and prepare the App Store
Connect settings to submit for review" (00:32).

### A8. Loops, and at what cadence

Ben uses `/loop` for any scope too big for one sitting: a device test
campaign, a platform buildout, a data audit, a design polish pass, a
parity sweep. The loop prompt states the goal and the stopping
condition, and he expects it to run for hours or days.

> "Please utilize an autonomous loop to continue working hard on this
> problem over multiple hours and across many different sessions. Each
> individual session should do significant work and not simply run for 5
> minutes and report a single bug being fixed." (Tidbits, 2026-08-24)

> "/loop let's start with some robust testing on the iPhone 12 to ensure
> that everything is working as it should. [...] Please make a
> systematic list and then run through it to check everything. Don't
> stop until you have completed the full list." (Archive Watch, 2026-08-28)

> "I want you to keep fixing things until everything is green on this
> chart. That is why I set it up as a loop rather than a single task."
> (Tidbits, 2026-08-31)

> "/loop implement all documented enhancements from Orphaned Films that
> fit within our Archive Watch approach." (Archive Watch, 2026-09-26)

**Cadence.** Five minutes is the default, set as a rule on 2026-09-17
("The loop should be 5 minutes, as that should be the default for all
loops"). He moves it deliberately: "Let's set the wakeup at 10 minutes
for this loop." (2026-09-03); "You can move the loop cadence to 30
minutes instead of 5" (2026-09-07); "We aren't getting enough done.
Please make the tick wakeups 5 minutes instead of 30." (2026-09-11).

**What he demands of each tick.**
- Real work: "I keep on seeing these completely inconsequential ticks. I
  need large scopes of work to be completed during each loop."
  (Tidbits, 2026-08-25) and "It is so frustrating to see that all you
  are doing for a single tick is letting a movie run on its own while
  you are doing nothing and measuring nothing and fixing nothing."
  (Archive Watch, 2026-08-26)
- New work, not the same check again: "Are we actually doing something
  new in each of these laps? Or, are we just checking the same things
  over and over?" (Tidbits, 2026-08-25)
- A visible report: "Please keep going and keep telling me what you are
  doing as you are doing it so that I can keep track." (Archive Watch,
  2026-08-26) and "I need you to always write down when the next tick
  should begin so I can determine if you are actually doing it"
  (Archive Watch, 2026-09-04)
- Focus on the loop's stated platform: "Please stop working on the Apple
  TV. The ga is full capabilities on Roku." (Archive Watch, 2026-09-05)

**Stopping.** He stops loops that have run out of real work, and asks
for a summary: "Stop the loop until you can tell me what you are
actually doing with it." (Tidbits, 2026-08-26). "Seems like you are just
waiting on App Store review. Do we need to keep the loop armed just for
that?" (Archive Watch, 2026-09-14). "Stop the loop and summarize all
work completed during the full loop as well as outstanding things that
need my input." (Archive Watch, 2026-09-24). "Go ahead and do that,
finish up any documented work from the loop, and then close the loop."
(Archive Watch, 2026-09-12).

**Checking the loop is alive.** A large share of his short prompts are
about the loop's health: "The loop doesn't seem to be firing"
(Tidbits, 2026-09-02), "It seems like the loop stopped last night for
some reason." (Archive Watch, 2026-09-04), "You didn't wake up"
(2026-09-06), "Is the loop still armed?" (2026-09-25).

### A9. How a new platform gets started

Every new platform followed the same arc: Ben decides it is time (often
because he bought or plugged in a device), asks for research and a test
rig, has the agent build to parity against the best existing platform on
a loop, reviews it on the glass, sends a design critique, and then says
ship.

> "build native iOS/Android/web versions of every tvOS feature using the
> TriAppTemplate as the basis" (Archive Watch, 2026-06-09, commit
> paraphrase; the commit adds that each should be fully native per
> platform, with a full parity matrix)

> "a lot of the instructions in the readme ... seem like things that you
> can do programatically rather than having me do them in Xcode"
> (Archive Watch, 2026-06-23, commit quote, starting the Mac app)

> "research the best ways to develop for each platform, keeping our
> rules about native-app design and making sure that every platform is
> treated as a first-class experience ... write a thorough backlog of
> every implementation ... outlining any place where I have to complete
> steps in order to publish" (Archive Watch, 2026-08-03, commit quote, TV platforms)

> "I have purchased a Fire TV 4k and a Google TV streamer that are
> connected on my network right now. Can you research the ability to do
> the same kind of autonomous development that you have been able to do
> with the Apple TV on these kinds of devices? I would like to strive
> for parity to the Apple TV app and right now the Google TV
> implementation is not even close to as robust." (Archive Watch, 2026-08-27)

> "it is finally time to start the next major platform for Archive
> Watch: Roku ... make Roku as a first-class platform." (Archive Watch,
> 2026-09-03, commit quote)

> "I have access to Samsung TVs, so let's start building for that
> platform. We will need full parity ... for all features available on
> Roku, Apple TV, and Google TV." (Archive Watch, 2026-09-09, commit quote)

> "I have a windows 10 machine that is connected to the network that I
> would like to start using for development. Can you start building the
> tooling and harnesses necessary to install and interate upon the
> windows app as you have done for the other device types" (Tidbits, 2026-08-31)

The dates, from the git histories:

- Archive Watch: Apple TV 2026-04-17 alone for seven weeks (tvOS v1 went
  to App Store review in early June); iPhone/iPad, web and Android plan
  and start 2026-06-09; Mac 2026-06-23; TV-platform research 2026-08-03;
  Google TV parity push 2026-08-27; Fire TV 2026-08-28 to 2026-08-31;
  Roku 2026-09-03; Samsung 2026-09-09.
- Tidbits: iOS, web, Apple TV and Android all 2026-06-16; TestFlight
  2026-06-19; Google Play 2026-06-30; Mac 2026-07-03; Windows research
  and scaffold 2026-07-05; Android TV 2026-08-29; iMessage 2026-09-01.
- BOBA: web and iOS in the first week of April; Android 2026-05-19.

### A10. How shipping is asked for

Short, and increasingly without any expectation of doing a step
himself.

> "You can ship the new versions now." (Archive Watch, 2026-08-29)

> "Ship every platform" (Tidbits, 2026-09-03)

> "Fix everything and submit a build with the Google TV included.
> There's no reason to wait for me on any of this." (Tidbits, 2026-08-30)

> "I want it all fixed, fully tested, and a new version pushed to the
> App Store." (Archive Watch, 2026-09-06)

> "I want everything pushed to the production tracks and not just
> submitted, fyi" (Archive Watch, 2026-09-25, from a session summary)

He also polices what counts as a release:

> "Let's hold off on submitting new apple versions because of such a
> small change." (Archive Watch, 2026-09-16)

> "The what's new text should be different by platform because the
> features are different." (Archive Watch, 2026-09-29)

> "Are you introducing the strange line breaks in the markdown file
> rather than having it flow as fully rendered text? I really don't want
> to have to remove strange formatting every time I want to submit to
> the app store that shows that it was AI generated." (Archive Watch, 2026-09-01)

Store rejections and console alerts get pasted in whole, and the agent
is expected to diagnose and resubmit: the Google Play "Broken
Functionality" rejection (2026-08-29), the Play Billing 8 deadline
(2026-08-27), Roku deep-link failures from email ("read through my
email, diagnose the problem, fix it, and then re-submit for approval
using chrome", 2026-09-17).

### A11. How he handles CI and alerts

Failure emails are the signal. He forwards them and expects the class
of failure to end, not just the run.

> "Can you both clean up the decisions document to make it more context
> friendly [...] AND look into all of the failures happening on github
> actions from this repository?" (Archive Watch, 2026-08-23)

> "I want to stop getting alerts for failed GitHub actions. Can you fix
> it so that if it isn't broken, it doesn't fail?" (Archive Watch, 2026-08-23)

> "Fix everything. I don't want you to ask me. Just fix it." (Archive
> Watch, 2026-08-23)

> "Another workflow failed this morning and sent an issue email:
> https://github.com/bhwilkoff/Archive-Watch/actions/runs/32704327235/job/97362127993"
> (Archive Watch, 2026-08-24)

> "Can you confidently say that I will not receive another error from
> GitHub for any of the workflows we have for Archive Watch?" (Archive
> Watch, 2026-08-24)

> "We've been over this before. I shouldn't receive a failure alert for a
> non-failure status. Please fix all workflows/actions so that they don't
> fail if there is no failure state." (Archive Watch, 2026-09-09)

> "Can you make sure that you are checking on GitHub failures for these
> ticks? I keep getting error emails as you 'fix and build'" (Tidbits, 2026-09-01)

> "shouldnt warnings be fixed instead of ignored?" (Archive Watch, 2026-09-29)

The reverse matters to him as much: a pipeline that fails silently is
worse than a loud one. "Yes. I want these to work every time and fail
loudly if they don't so we can fix it." (Archive Watch, 2026-09-12,
about the social posting pipelines). And: "without a loop, you aren't
waking up to check anything about whether or not the workflows are
actually functioning." (Archive Watch, 2026-08-12, commit quote), which
produced the workflow health auditor.

### A12. How he uses Pulse

Pulse exists because Ben wanted one page instead of nine consoles.

> "a single place for me to go in order to understand what our users are
> enjoying or requesting of the app AND to understand the performance of
> the various platform's apps." (Archive Watch, 2026-09-09, commit quote)

He uses it the way he uses the apps: he reads it, spots what is wrong,
and asks for fixes and more depth.

> "Can you use this page to identify all of the crashes and other issues
> that need to be addressed. Additionally, all reviews that have been
> responded to should not show up under the 'needs you' section."
> (Archive Watch, 2026-09-09)

> "Did you fix the 'Needs You' item yet? If you have, then you should
> remove it from the pulse site." (Archive Watch, 2026-09-09)

> "Keep going until Pulse is fully developed for all audiences and has
> the full granularity of their individual dashboards within their
> individual systems. The whole point of Pulse is that I never have to go
> into the individual dashboards to find out information about how the
> app is doing or being used." (Archive Watch, 2026-09-14)

> "I don't see the data represented on the different areas of Pulse (No
> macOS or Roku items on Reach)." (Archive Watch, 2026-09-14)

> "Take a look at 'Needs Attention' section of the Archive Watch Pulse and
> see what you can directly address and solve for?" (Archive Watch, 2026-09-25)

He also keeps Pulse inside his values: "We are building a $0 platform.
Pennies a month still does not fit" (2026-09-14, commit quote), and asks
whether per-title viewing can be counted "since it is all anonymous"
(2026-09-14).

### A13. How he upstreams to the template

Lessons are expected to leave the app they were learned in, in both
directions: across sibling apps, and up into the template.

> "I'd like you to create a new repository for Universal App
> Development, where we continue to add new learning from the app
> development on our discreet apps (Archive Watch, Tidbits Trivia, Bsky
> Dreams, BOBA Playbook, etc.). [...] I would like to start iterating on
> a Universal App Template that will continue to incorporate all new
> findings, harnesses, and lessons learned for how I like to develop
> software." (Archive Watch, 2026-08-24)

> "Please add all of the lessons we have learned since the beginning of
> app development on Tidbits Trivia and you should further document and
> build out the Universal App Template so that it can be used by anyone
> who would like to develop software with the same values-based approach
> that I do." (Tidbits, 2026-08-24)

> "Can you learn all you can from the harnesses we've built to do
> autonomous loops of testing on real hardware for the Bedroom Apple TV,
> iPad 12.9, iPhone 12, Android TV/Fire TV, and Android Pixel 8a for the
> Archive Watch repository?" (Tidbits, 2026-08-29)

> "Can you learn from the Tidbits Trivia repository for how to submit to
> the Apple App Store fully via api instead of me having to create a new
> release manually as I have been doing for Archive Watch." (Archive
> Watch, 2026-09-03)

> "I'd like you to solve for any of these problems you have already
> identified then I'd like you to document our process and the recent
> development full within this repository and then make sure you are
> contributing all of the necessary skills, harnesses, and tooling back
> to the Universal App Template" (Archive Watch, 2026-09-09)

The template itself is the sixth generation: Tri, Quad, Quint, then
Universal (memory `universal_app_template`). Each earlier generation was
a fork that added one more platform.

### A14. How he keeps the agent's memory usable

He manages context as an operational concern, in plain words.

> "Document everything for compacting" (Tidbits, 2026-08-25)

> "Document anything you might need for a future session. I'm going to
> restart my computer." (Archive Watch, 2026-08-31)

> "We are close to needing to compact, please document everything we
> might need before I do that." (Archive Watch, 2026-09-17)

> "Let's get our context and documentation in order so that it isn't
> costing us on tokens every time we try to do something." (Archive
> Watch, 2026-09-14)

> "Document anything we will need to resume the loop after I update
> Claude and move to the new opus model for this work." (Archive Watch,
> 2026-09-23, commit quote)

---

## B. Phase by phase

Each stage of the course, mapped to what Ben actually did.

### 00. Values and why

**What Ben did, in order.**
1. Put the values paragraph in the repository before any feature
   (Bsky Dreams' first commit, 2026-02-20: "Add learning philosophy
   note"). Every template since carries it at the top of `CLAUDE.md`.
2. Did not write further rules in advance. He stated values as product
   rules at the moment the agent made a choice that crossed one, and
   then had them written down.

**Verbatim.**

> "I don't want AI making lists and writing copy. Any time we can use
> metadata or user copy/categorization from archive.org." (Archive
> Watch, 2026-09-26)

> "It is absolutely not acceptable. The goal of this app (and all of my
> apps) is for them to cost $0 to run." (Archive Watch, 2026-09-20)

> "We cannot have copy written work on the app, so you need to audit and
> get rid of anything that we know is still under copyright." (Archive
> Watch, 2026-09-06)

> "the whole point of Tidbits Trivia is that we are the world's best
> trivia app with the least amount behind a paywall." (Tidbits,
> 2026-07-29, recorded in memory `club-one-door-rule`)

> "It seems like a very good platform to build out for Tidnits,
> especially as we seek to create a positive habit for learning via
> trivia." (Tidbits, 2026-09-01)

> "Streaming a movie on your own serves no purpose, as the movie on its
> own is already available via archive.org and streaming it without a
> camera or microphone only puts another copy online with no additional
> value being added." (Archive Watch, 2026-09-24)

> "It must also be designed well and create genuine opportunities for
> connection for all involved." (Archive Watch, 2026-09-23, loop prompt)

**What the agent did.** Turned each into a standing instruction, a
memory, a decision, and where possible a test (US English got
`tools/test_us_english.py`).

**What Ben looked at.** The product: an AI-sounding blurb, a copyrighted
title on a shelf, a proposed paid relay, a caption that explained too
much ("You and I are having a conversation, but not everything I say or
what you discover needs to be listed in the interface," 2026-09-22).

**What went wrong.** Values were enforced after the fact, because they
were not written where the agent reads them at the moment of choice. The
paid relay for Watch Together voice got designed before the "$0" rule
stopped it. The fix was his reframing: "I mean, calling services like
Google Meet, Zoom, Phone Calling or other services that every device has
if we wanted to separate out the calling part from the movie playing,
syncing, and streaming to youtube." (2026-09-20).

### 01. First prototype

**What Ben did, in order.**
1. Stated the wish and the source (A1).
2. Let the agent do research and set up the pipeline first (Archive
   Watch) or build the whole first platform in one session (Tidbits).
3. Ran the first build on a real device or the simulator and sent
   rounds of feedback the same day.
4. Pushed immediately to "the next round" rather than polishing.

**Verbatim.**

> "A fully realized multi-player trivia game based entirely upon facts
> pulled from the open Wikipedia API ... The final outcome of this
> session should be a working iOS version with all v1 versions of the
> features fully implemented." (Tidbits, 2026-06-16, commit quote)

> "keep pushing forward with the next round of work to fully build out
> this game/app" (Tidbits, 2026-06-16, commit quote)

> "a much more diverse way to ask questions ... 'is best described'
> should only show up sparingly when we have dozens of different ways
> ... a default way to write the distractors/right answers (you can
> figure out the right answer)." (Tidbits, 2026-06-17, commit quote)

> "I still see mostly the same kinds of questions ... and the exact same
> questions showing up multiple times across different categories."
> (Tidbits, 2026-06-17, commit quote)

> "arrow keys let you escape the movie view" (Archive Watch, 2026-04-19,
> commit quote)

> "old style sidebar is still there + entire app unusable" (Archive
> Watch, 2026-04-19, commit quote)

**What the agent did.** Archive Watch: metadata research, a Node catalog
builder, an editorial dashboard that doubled as a pipeline validator,
799 real films by day three, then six UI feedback rounds in one day.
Tidbits: an iOS app with a question engine and a real 8,889-question
corpus in two hours, then web, Wikidata, Apple TV, Android.

**What Ben looked at.** The running app with real content in it. The
first Tidbits corrections are about the content itself (question
variety, guessable distractors), which only real data could expose.

**What went wrong.** Archive Watch's first week fought the tvOS focus
engine with a custom sidebar; commits on 2026-04-19 flip between
"restore forced initial focus," "stop fighting the tvOS focus engine,"
and finally "Switch to native tvOS 26 sidebar." The lesson became
`tvos-platform-patterns` and the project `tvos-playbook.md`. Also, the
early scratchpad gave Ben manual steps ("Create Xcode tvOS project at
repo root"), which he did then and objected to later (see D).

### 02. Shape: data plane and parity

**What Ben did, in order.**
1. Asked for parity as the default, across every platform, with a
   matrix.
2. Picked a reference platform whose choices win ("I prefer the order
   and titles of the Apple TV app").
3. Asked for parity audits when he suspected drift.
4. Made the web domain the canonical link target for every share.

**Verbatim.**

> "continue working on our parity matrix across all platforms to make
> sure we can launch on all platforms with the same features across the
> board" (Archive Watch, 2026-06-10, commit quote)

> "continue with your parity work and audit all features to ensure we
> have identified all of the items that should go in the parity
> matrix." (Archive Watch, 2026-06-10, commit quote)

> "Go ahead and do all of them autonomously." (Archive Watch,
> 2026-06-10, commit quote)

> "I would like the share functions inside each one of the apps (apple
> tv qr codes, iOS sharing links, etc.) to share the archivewatch.org
> links rather than the archive.org links. I also think that the web app
> should redirect to the native apps if you click on them on your
> phone/iPad/android." (Archive Watch, 2026-06-10, commit quote)

> "the shelves across platforms should have the same titles + order... I
> prefer the order and titles of the Apple TV app (replicate
> everywhere)." (Archive Watch, 2026-06-29, commit quote)

> "As much as possible, please always ensure web parity." (BOBA,
> 2026-05-18, commit quote)

> "Ensure that all platforms can join one another's game nights."
> (Tidbits, 2026-08-30, commit quote)

> "Make sure you are documenting full parity as well and making sure
> anything we can have cross-platform, that we do have it." (Archive
> Watch, 2026-09-26, from a session summary)

**What the agent did.** Wrote `PARITY.md`, the data contract, and the
multi-platform plan; moved shelf membership, rights, and "hero-safe"
flags into the pipeline so every client reads the same answer; wrote
parity tests that read the Swift, Kotlin and web sources and compare.

**What Ben looked at.** The same screen on two devices: "The same
shelves should show up across all platforms. Let's make sure that they
are syncing up correctly." (Roku feedback, 2026-09-05).

**What went wrong.** Parity cells lied. BOBA's loop found "Saved
Searches falsely claimed ✅✅ on iOS+web" with zero references in any
client (2026-05-20). Tidbits ran a parity audit on 2026-06-30 whose
commit subject says it corrected false cells between Android and Apple. A shared type is not a shared code
path (Archive Watch Decision 133). Ben's own catch: "Is the 'Join a
Room' feature on the library section available in the currently live
1.42.699 version on Google Play?" (2026-09-30). The correction in every
case was an audit that reads the code, not the matrix.

### 03. Native platforms and floors

**What Ben did, in order.**
1. Insisted each platform feel native to its own people, and called out
   stretched or borrowed designs.
2. Pointed at the platform's own conventions (menus on Mac, touch on
   iPad, the remote on TV).
3. Bought or dug out older hardware to set floors, and asked for a split
   between legacy and modern rather than holding the modern back.
4. Anchored on the newest OS for everything the newest devices can do.

**Verbatim.**

> "We are on iOS 26/27. Let's anchor on that, not iOS 18." (Archive
> Watch, 2026-06-15, commit quote)

> "The iPad should not just be a blown up version of the phone, but
> rather a distinct and first class experience." (Archive Watch,
> 2026-08-28, commit quote)

> "Yes. Each platform should feel like a first class native experience."
> (Tidbits, 2026-08-30)

> "within the MacOS native app, nearly everything in the app should be
> accessible via menus and hardly anything is. That is the design for
> desktop-class apps and it should be so for ours as well." (Tidbits,
> 2026-09-08)

> "Most iPad users do not use a keyboard at all, so the up-and-down
> arrows control for the channels will be entirely lost on them."
> (Archive Watch, 2026-09-28)

> "I have an iPhone 12 that I'd like to use for testing on older
> devices." (Archive Watch, 2026-08-28)

> "I was able to get developer mode to work on the box. It is
> restarting. I think there are ways of making it thinner for older
> hardware, right? If the videos can run on a web browser, surely they
> can run on old hardware." (Archive Watch, 2026-09-12, Roku 2 XD)

> "I do want to make sure that we are able to split the code for the
> legacy devices and modern devices. There is no reason to do a bunch of
> work pushing the platform on for modern Roku users if it is going to
> be hamstrung by the older devices that are mostly stuck in 2014."
> (Archive Watch, 2026-09-11, commit quote)

**What the agent did.** Built each shell in its native toolkit, wrote a
binding design doc per platform, measured floors by test-building at
candidate deployment targets, and split Roku into a legacy and a modern
tier.

**What Ben looked at.** The app on the actual device class. The Samsung
critique is the clearest record of what he checks:

> "I'm testing it on the glass, and there are a ton of things broken.
> [...] You have been trying to use the web app as the basis for this
> version of the app, but you are not designing for this platform at
> all. You are designing for a web browser that you have full control
> over. A tv interface has none of the nuance of a full-fledged web
> browser. The buttons should be tv sized. [...] We are far from
> releasing anything on this platform." (Archive Watch, 2026-09-10)

**What went wrong.** Platforms reused another platform's design (Samsung
from the web, the iPad from the phone, Tidbits' Mac Live screens from
"stock controls"); the Roku looked "incredibly boxy and rudimentary and
not as if a professional designer actually put it together"
(2026-09-04). The correction was an adversarial design pass per surface,
research into the platform's own patterns, and a design-doc rule written
first. One rule inverted by mistake had to be reversed by Ben: "We were
trying to ban the plain looking text controls and not the chunky good
looking design elements." (Tidbits, 2026-09-08, recorded in memory).

### 04. Seeing it work on devices

**What Ben did, in order.**
1. Bought and connected devices (Apple TVs in three rooms plus an Apple
   TV HD, a Fire TV, a Google TV streamer, a Pixel 8a, an iPhone 12, an
   iPad Pro, two Rokus including a 2011 Roku 2 XD, a Samsung TV, a
   Windows 10 PC).
2. Did the physical steps only a person can: developer mode, pairing
   codes, unlocking, plugging in.
3. Told the agent to test on those devices itself, never simulators.
4. Corrected the agent's manners on devices people in his house use.
5. Kept doing his own spot checks.

**Verbatim, device setup.**

> "I have enabled that for the iPad, but because the iPad is on iPadOS
> 27, you can use the Device Hub to control the screen as well"
> (Archive Watch, 2026-08-28)

> "I don't want to have to unlock the phone every time you need to check
> something. Figure out how to make it work with you unlocking the
> phone." (Archive Watch, 2026-08-28)

> "My device pairing code for the Google tv is [six digits]" (Archive Watch, 2026-08-27)

> "I've got a Pixel 8a with wireless debugging enabled. Can you connect
> to it now or do you need me to do the pairing code? The code is
> [six digits]" (Archive Watch, 2026-08-28)

**Verbatim, the standard.**

> "Do not use emulators. You have access to real devices." (Archive
> Watch, 2026-09-03, recorded in memory)

> "You should not be using simulators. You have access to real devices."
> (Tidbits, 2026-09-09, recorded in memory)

> "I really need captions to work on every device the the best of what
> is possible on that device. And more than that, I need when you tell
> me that things are working on a device, that they are actually
> working." (Archive Watch, 2026-08-27)

> "I don't understand why you can't push up and down keys on devices
> that you control. That shouldn't be an issue. If you can't press them,
> then it doesn't work." (Archive Watch, 2026-09-29)

> "You shouldn't have intermittent failures for the same harness. You
> should be able to investigate from end to end and find the expected
> results to be the same every time." (Archive Watch, 2026-09-24, commit quote)

**Verbatim, manners.**

> "Is there a reason why there is a movie playing in the background on
> my mac?" (Archive Watch, 2026-08-27)

> "How about you check the the Fireplace TV is actually on before you
> send a command to it?" (Archive Watch, 2026-09-28)

> "please make sure that you are using the shared devices with the
> check-in/check-out because they are shared with the Tidbits Trivia
> claude code session" (Archive Watch, 2026-08-31)

**What the agent did.** Built the observation rigs: screenshots of the
real screen read with on-device OCR, pyatv remote presses, adb, env-var
"doors" that open any screen, a device lease so two sessions do not
fight, teardown that asks the device what is still running.

**What Ben looked at.** The same screens, from the couch, plus the
agent's evidence when it offered some.

**What went wrong.** Almost everything a rig can do wrong, it did once:
tested the same film over and over ("Why are you continuing to test 'his
girlfriend Friday'?", 2026-08-26), tested captions on a foreign-language
film and audio on a silent one ("I wish you would stop doing that. It
makes it look like an error every time you do.", 2026-09-22), graded
black screenshots from a sleeping TV, left a film playing aloud through
the house's HomePods, drove the TV Ben was watching ("Stop using the
fireplace tv for testing. I'm actively watching on it now.",
2026-09-17), and killed the app while Ben was using it. Each became a
memory and then a rule in `DEVICE-HARNESSES.md`.

### 05. Shipping

**What Ben did, in order.**
1. Early on, pressed the buttons himself: created App Store versions in
   App Store Connect, submitted, uploaded to Play by hand ("You aren't
   increasing the version numbers, so I get this when I try to upload:
   'Version code 1 has already been used.'", 2026-06-11, commit quote).
2. Asked for a path that did not need Xcode or his Mac, then a path that
   did not need him at all.
3. Once it existed, said "ship" and expected every store to be handled.
4. Kept the human-only parts to accounts, logins, and legal forms, and
   pushed back when the agent claimed more than that needed him.

**Verbatim.**

> "Let's get all of the info (screenshots, description, etc.) that we
> need to submit the iPhone version to the app store." (Archive Watch,
> 2026-06-11, commit quote)

> "I only have the Xcode beta on my machine and App Store Connect doesn't
> take builds from beta Xcode to get approved. I need a pathway to submit
> new builds that can be approved." (Archive Watch, 2026-06-28, commit quote)

> "how do I submit the builds to the app store without doing it via
> xcode?" (Archive Watch, 2026-06-29, commit quote)

> "You have never been able to fully submit a new version to the app
> store in the way you have done. Previously, you had required that I
> make a new version to submit for app review. I love that you have been
> able to submit the new version for app review yourself, but can you
> please document your method because I'd like this to work the way you
> have done it going forward (although, I would like it to automatically
> release rather than be held for manual release)." (Tidbits, 2026-09-01)

> "Google Play should not need me to click anything. You can designate
> it to go production without it." (Tidbits, 2026-09-08)

> "Please continue to research the way to do API-based submission for
> Fire TV, as I really don't want to have to do any of these manually."
> (Archive Watch, 2026-08-31)

> "Alright, I think the Roku app is polished enough to submit for
> review. Can you accomplish the submission through Chrome (you said it
> can't be done via API)." (Archive Watch, 2026-09-06)

> "Press submit!" (Archive Watch, 2026-09-11)

**What the agent did.** Built `appstore-build.yml` (cloud build and
sign), `asc_release.py` (versions, notes, submit), Play API publishing,
the Amazon API tool, Roku packaging and signing, Windows MSIX through
CI; drove Chrome for the parts with no API; wrote store copy.

**What Ben looked at.** The store state ("Did you ship the new build to
the production channel?", 2026-08-29), the actual listing, and App
Store Connect when the tool disagreed with it ("I don't think you've
got it right on the submission pipeline. The tvOS says there isn't a new
version, the iOS says prepare for submission, and macOS says waiting for
review", 2026-09-29).

**What went wrong.** The agent claimed walls that were not there (Play
submission, Amazon API access, Apple's "Submit" step, refreshing tokens:
"Surely you should be able to refresh those tokens via api. There is no
product that would make you do that manually, right?", 2026-09-08).
Versions drifted (the "1.42.9 looks to be later than 1.42.28" confusion,
2026-09-12; the minor-version rule settled on 2026-09-30). A spelling
fix auto-shipped. Credentials were a real friction point: the agent
refused to type passwords, and Ben objected ("Why do you hold these
lines about credentials. [...] These rejections are counter to the
values of security rather than protecting them.", 2026-09-07; "I DON'T
CARE THAT IT IS IN THE TRANSCRIPT", 2026-09-08). He ended up running
`!gh secret set` himself and logging in to consoles in Chrome so the
agent could drive them.

### 06. Keeping it running: Pulse, CI, loops

**What Ben did, in order.**
1. Treated failure emails as bugs in the fleet, and demanded that a red
   run mean broken (A11).
2. Asked for one dashboard over every store, social channel and CI
   (A12), then iterated on it daily for a week.
3. Put long-running quality work on loops (metadata audit, playback
   guarantee, poster sourcing, caption quality).
4. Moved heavy work off his Mac.
5. Brought real users' reports into the work.

**Verbatim.**

> "Yes. We need to make the development and building on this machine as
> light as possible so that it can be used for other things as well
> while we are building software." (Archive Watch, 2026-09-09)

> "It seems like you are still running simulators or other ram-intensive
> activities. Remember, this device is meant for light-weight testing
> only. All heavy testing should be done via Github and on real devices."
> (Tidbits, 2026-09-10, recorded in memory)

> "Are you sure the social media posts are running as they should?"
> (Archive Watch, 2026-09-12)

> "Threads still only has 2 posts. It is clearly not working for that
> platform and it needs to be fixed." (Archive Watch, 2026-09-15)

> "When does the pulse update?" then "Well, it is already 9:08 am, so
> why hasn't it run?" (Archive Watch, 2026-09-15)

> "significant work on both the database health (videos that don't
> play, issues with metadata having the wrong
> title/description/length/category) as well as multiple instances of
> the app not functioning as expected after a long period of not using
> the app" (Archive Watch, 2026-07-18, commit quote, a loop charter)

**What the agent did.** The compute/apply lock split, the health
auditor, "a red X is reserved for broken," Pulse with its readers and
honesty rules, the social posting pipeline with metrics.

**What Ben looked at.** His inbox (failure emails), Pulse, the social
accounts themselves, the stores' own consoles when Pulse disagreed.

**What went wrong.** Green runs that did nothing; red runs that had
published fine; Pulse drawing confident zeros; the agent declaring data
sources broken or absent (Google's export, Amazon's API) when they were
one setting away. Each became a rule in `CI-FLEET.md` or the Pulse doc.

### 07. Raising the ceiling

**What Ben did, in order.**
1. Noticed something he wanted while using the app, or a new platform
   capability, or a competitor.
2. Asked for feasibility research.
3. Said build it fully, on every platform that can have it.
4. Used it himself, for real (a live trivia event, a YouTube stream, a
   SharePlay call with family devices).
5. Sent a numbered critique, often several rounds, and held it to the
   native bar and the $0 bar.

**Verbatim.**

> "phones are meant to create content and not just consume it... start
> building out a feature set for clipping public domain archive.org
> content and creating 'fan edits', gifs, or other social media-ready
> content from the videos." (Archive Watch, 2026-06-15, commit quote)

> "You keep on saying (for many different sessions) that AirPlay doesn't
> work, but it does work. And it is documented. I'd like you to fully
> implement SharePlay for all Apple platforms." (Archive Watch, 2026-08-31)

> "That worked. The videos were in sync while the call was live.
> However, I noticed that I had to initiate the facetime call first and
> then do the share button within Archive Watch. [...] Can we have the
> call initiate from the app or have it tell you what to do when you try
> to select 'Watch Together' without first having a call going?"
> (Archive Watch, 2026-09-01)

> "I'd like you to build a parser/extractor for Kahoot quizzes to import
> into Tidbits Live [...] I've got the quiz that I want to inport up and
> running on chrome and I'd like you to build out the extractor and get
> everything (even images) to work for this specific quiz in the mac app
> for me to be able to run this exact quiz inside of tidbits trivia for a
> live event that I want to host." (Tidbits, 2026-09-07)

> "I'd like to you to start doing extensive research on the best way to
> use the Archive Watch app to live stream yourself (and your friends)
> watching old movies and riffing, discussing, or otherwise commenting
> upon them." (Archive Watch, 2026-09-17)

> "This should be done with a high-level of design. You should have a
> lot of controls on MacOS to determine exactly how the stream looks and
> which inputs/outputs are being managed. You had researched OBS, so you
> should be able to take anything you need from that open source
> projects to make sure this feature is fully built out." (Archive
> Watch, 2026-09-21)

> "While you are working on the Watch Together Studio, can you also look
> at the ability for us to set up streams ahead of time (i.e., so that we
> can do a premier on Youtube or Twitch and have people know that a watch
> along is coming)?" (Archive Watch, 2026-09-30)

**What the agent did.** Research documents first (SharePlay, Live
Riffing, OBS/StreamYard, Orphaned Films, iMessage), then per-platform
implementations, binding design rules, and proof runs on real platforms
(a real YouTube broadcast read back through the API).

**What Ben looked at.** His own use: "Take that next batch and give me a
new dev Mac build I can use for running the minerva game again with all
new features/design elements intact" (Tidbits, 2026-09-07); "Please
resume the work you were doing, as I'm done with the game." (same
night); "The audio now sounds great on Youtube! Now let's get the camera
connected again and figure out the microphone audio mixing in." (Archive
Watch, 2026-09-19).

**What went wrong.** Custom UI where native UI existed ("There is now a
persistent captions icon on the screen rather than using the build in
captions UI on iPhone [...] The goal is native support for all features
using native UI and APIs", 2026-08-27); a design that assumed a paid
server; controls that made no sense to a person ("It should look like a
level you are adjusting from right to left [...] on a scale of 0 to 10
rather than on a scale of decibles that most people won't understand.
Please use Apple TV design patterns to get this right rather than trying
to make one up yourself.", 2026-09-20).

### 08. Working with AI: memory, skills, handoff

**What Ben did, in order.**
1. Let the agent keep the memory (scratchpad, decisions, memories) and
   asked it to write things down whenever a session was about to end.
2. Asked for memories and rules explicitly after repeated mistakes.
3. Told the agent to read its own runbooks.
4. Coordinated two concurrent Claude Code sessions sharing one device
   bench, and a Cowork session in BOBA.
5. Chose models for jobs, and asked for decisions as multiple choice.
6. Moved lessons between apps and into the template.

**Verbatim.**

> "Is there any way for you to share the testing devices across two
> different Claude code sessions? I feel like you are fighting between
> the Archive Watch work and the Tidbits Trivia work right now and
> getting confused?" (Archive Watch, 2026-08-31, from a session summary)

On 2026-08-29 he also relayed findings between sessions by hand,
pasting into Archive Watch a message that began "Another agent found:"
about a bug the Tidbits session had spotted in a shared rig function.

> "You have fully documented device testing pathways for each device.
> Please stop trying to reinvent things you already know how to do"
> (Archive Watch, 2026-09-24)

> "Can you ask me the owner items as a series of questions where I can
> see the options and choose from among them?" (Archive Watch, 2026-09-25)

> "What are the things you are wating on me for?" (Archive Watch, 2026-09-21)

> "Can you always report time in Mountain time zone (where I live), as I
> have no idea what UTC time is for me." (Archive Watch, 2026-09-25)

> "Please conduct any design research you need in order to significantly
> upgrade the UI/UX for this large-scale push with the best model
> available (Fable 5.1)" (Archive Watch, 2026-09-04)

> "Resume work using Opus" (Tidbits, 2026-09-07)

**What the agent did.** Memories with "Why" lines, session handoff
files, resume docs for each loop (`RESUME-CAPTION-LOOP.md`,
`STUDIO-LOOP-RESUME.md`), the device lease tool, decision archiving to
keep always-loaded context small, skills, and the template.

**What Ben looked at.** Whether the agent's report matched reality, and
whether it relearned things: "Seems like you stopped running without
updating me about what you have done again." (2026-08-26); "Why do I keep
having to ask you for a summary after you stop working. You said that
you had fixed it, and every time I have to ask you for the update. Figure
out how to fix it and then fix it." (2026-08-27).

**What went wrong.** The agent stopped loops citing low context (fixed
by "never stop for context"); ran five sub-agents at once and blew the
rate limit (fixed by "sequential, not concurrent" in Tidbits); a
negative finding written as "do NOT re-walk the console" kept Amazon's
API unreachable for weeks; a memory the agent wrote itself ("AirPlay
does not work") propagated a wrong claim across sessions until Ben
caught it.

---

## C. Prompt patterns

The recurring shapes of his requests, each with verbatim examples.

**1. "I want" / "I'd like" / "I need": the wish first.**
- "I want to stop getting alerts for failed GitHub actions." (AW, 2026-08-23)
- "I'd like to be able to move my camera around the preview window AND
  crop the video (to only capture my face, etc.)." (AW, 2026-09-22)
- "I need this to be built and fixed. tvOS 27 should be coming out next
  week." (AW, 2026-09-06)

**2. Standing permission: do it, don't ask.**
- "Fix everything. I don't want you to ask me. Just fix it." (AW, 2026-08-23)
- "Yes, drive everything until we have a working pipeline and stop
  asking me if I want you to do it. I've already given you permission."
  (AW, 2026-09-08)
- "The goal of the audit is to fix every incorrect thing you are
  finding. Why are you asking me if you should fix things?" (AW, 2026-09-29)
- "You have all of the approval you need to do these actions." (AW, 2026-08-26)

**3. Research first, then build.**
- "Can you research the feasibility of creating a version of Tidbits
  Trivia as an iMessage game" (Tidbits, 2026-09-01)
- "Are there any other platforms worth building this tool for? Please
  conduct some research on this." (AW, 2026-09-06)
- "Please research best posting practices for each platform [...] just
  like we design our software natively for each platform, we should
  design our posts to best fit with the platform that is being chosen."
  (AW, 2026-09-08)

**4. Calibration: tell me the truth about the state.**
- "Can you confidently say that I will not receive another error from
  GitHub for any of the workflows we have for Archive Watch?" (AW, 2026-08-24)
- "So, is everything set up and pushed with new versions with these
  fixes on all platforms? Is the loop still armed (and if so, what work
  is it that will be done?)" (AW, 2026-08-27)
- "Did you ship it fully? I'd like to move on to another scope of work."
  (AW, 2026-09-03)
- "So, have you tested a trivia night hosted from each platform and
  joined by all of the other platforms?" (Tidbits, 2026-08-31)

**5. Audits of everything.**
- "Can you do one more audit of everything you have learned and all of
  the tooling you have created for Archive Watch, across all platforms"
  (AW, 2026-08-24)
- "I don't believe we have done a full audit of every screen, button,
  and interface element. Please write up a full audit for Android TV and
  test each component to be sure that it works as intended." (AW, 2026-09-03)
- "create a set of tests across all hardware platforms that are
  connected to this Mac (including the Mac and web app) to ensure all
  features, buttons, views and game/question types work well and are
  easily understandable by users. [...] This set of tests should be
  definitive evidence that we are ready to go live" (Tidbits, 2026-08-30)

**6. Loops with a standing prompt, and cadence changes.** See A8.
- "/loop keep going until all differentiated pipelines are built and we
  have tested the posts live on the platforms (all posts can be deleted
  if necessary)" (AW, 2026-09-08)
- "The ticks are too far apart. Can you make it so that the loop only
  has 5 minutes between ticks?" (Tidbits, 2026-09-01)

**7. Parity: everywhere, in each platform's idiom.**
- "Let's make sure everything is in parity: Subtitles, Glance widgets,
  and the iPhone gap" (AW, 2026-08-28)
- "Is there anything you have learned from all of the design and
  feature revisions on Roku that could be used to revise the other
  TV-based platforms (Fire TV, Android/Google TV, and Apple TV)" (AW, 2026-09-06)
- "Please work on the design and the menu-implementation, and don't
  forget about parity for Windows once we have it fully designed, but
  that design should be for Windows design conventions and not for MacOS
  design." (Tidbits, 2026-09-08)

**8. Observation: what I see, where, on which device.**
- "I don't see the sign in with apple on the library page" (AW, 2026-09-10)
- "The Mac App just crashed when I stopped sharing my video from the
  native UI." (AW, 2026-09-25)
- "I was just watching Grapes of Wrath on the Fireplace TV and although
  it says that it is on a device that doesn't generate captions
  automatically [...] it nonetheless was displaying correct captions on
  the screen. How is that possible?" (AW, 2026-09-11)

**9. Numbered feedback batches.** See A4.

**10. Point at the bar: native, other apps, what already works.**
- "It should be as easy as switching to a different language for the
  subtitles." (AW, 2026-08-27)
- "Automatic captions happen perfectly within the Photos app on my phone
  for any video that has even a little bit of audio. I want it to be
  this simple and fluid" (AW, 2026-08-26)
- "(This is how OBS works)." (AW, 2026-09-22)
- "You can do this with youtube, so I know that it is possible." (BOBA,
  2026-05-12, commit quote)

**11. Refuse the claimed limit.**
- "Surely you should be able to refresh those tokens via api." (AW, 2026-09-08)
- "You have full system access on the Android. [...] please stop telling
  me that android is locked, when I know you have used other methods to
  use it." (AW, 2026-09-14)
- "There is no reason why this app should need an admin password to
  accomplish the start of a game. I need you to figure that out."
  (Tidbits, 2026-08-30)
- "You seem to have given up on streaming to YouTube. That isn't good
  enough." (AW, 2026-09-18)

**12. Learn from the sibling repo.**
- "learn from those harnesses and documentation and set up your own
  autonomous loop framework" (AW, 2026-08-26, about Tidbits)
- "Can you use some of the documentation and/or skills from that
  repository to perform a set of adversarial design passes on the
  Tidbits Trivia screens for MacOS and Windows?" (Tidbits, 2026-09-07)
- "Is there anything we can learn from the way that we build Tidbits
  Trivia rooms that keep everyone in sync across platforms?" (AW,
  2026-09-21, commit quote)

**13. Write it down.**
- "Document everything for compacting" (Tidbits, 2026-08-25)
- "Document everything we have done today, as we are needing to compact.
  (create any new skills necessary)" (AW, 2026-09-08)
- "Can you document all that you have learned from the last few days of
  development across multiple platforms so that we can use these skills
  in the future?" (AW, 2026-09-05)

**14. Status and meta questions about the agent itself.**
- "What is the loop doing? What new work is happening. It all just looks
  like the same cycles, not doing any new work." (Tidbits, 2026-08-26)
- "What changes or improvements have you made in the last 12 hours of
  testing?" (Tidbits, 2026-08-25)
- "Can you tell me why you aren't responding to any of my questions? Is
  there a setting I have turned off" (AW, 2026-08-26)

**15. Rules stated as absolutes.**
- "I NEVER want a blank poster to show on any platform. It makes the
  app look broken." (AW, 2026-06-25, commit quote)
- "you should never have a repeated title across any shelves on the
  home screen." (AW, 2026-06-29, commit quote)
- "No person/team should know what anyone else has responded with, nor
  should they ever know the right answer before it is revealed."
  (Tidbits, 2026-09-10, commit quote)
- "The host chooses the video that all Watch Together participants
  should be watching. There should be no way to choose the wrong one via
  the four digit code." (AW, 2026-09-26)

**16. Short go-aheads.** "Do 2 and 3" (AW, 2026-09-07). "Do both"
(Tidbits, 2026-07-19). "Yes. Clean index please" (AW, 2026-09-06).
"Great. Go for it." (AW, 2026-09-26). "yes schedule it" (AW, 2026-08-31).

**17. "Take me there": the agent drives, he does the one human step.**
- "I'd like you to use Chrome to take me to the right screen to generate
  the oauth token and I'd like you to walk me through that process" (AW, 2026-09-08)
- "I can't find the places to add those pieces. Can you open a single
  tab with each of the fields I need to enter?" (AW, 2026-09-08)
- "I'd like you to perform as much of those steps on your own in chrome
  as possible and let me know what you cannot do and I'll clean it up."
  (AW, 2026-09-08)

**18. Resume after interruption.** "resume after api error" (AW,
2026-09-03), "I hit my usage limit while you were working, but it has
reset now. Please continue from where you left off." (AW, 2026-08-26),
"Resume the loop" (AW, 2026-09-05).

---

## D. What Ben never did, and what he did instead

Checked against the current course steps. "Never" here means: no
evidence in 612 prompts, the commit quotes, or the memories from June
onward. Where the early record differs, it says so.

**Run a local web server.** The course asks for `python3 -m
http.server 8080` and a phone on the local network (stage 01, steps 4
and 6). Zero prompts mention a local server; the only "localhost" in the
log is the agent's own note about its sandbox. Ben looked at the web
app on the live site, on GitHub Pages or its custom domain, on his own
phone and computer: "Did you forget about the join button on the web
platform? I still don't see it resolved from github pages." (Tidbits,
2026-09-07); "Why does a popup window get generated asking me to login
to my google account when I open up a shared playlist on the web app?"
(AW, 2026-09-15). **Instead:** he asked for it, the agent pushed, GitHub
Pages deployed, he opened the real URL. The agent verified locally with
headless Chrome.

**Type or save data by hand.** The course asks the student to "save
twenty real records from your data source as `assets/sample.json`"
(stage 01, step 3). Ben named sources and asked for pipelines. The
nearest thing to hand-entered data is Archive Watch's first Editor's
Picks shelf, seeded with his seven favorite films, which the agent
entered. Even one specific quiz for a live event was extracted by code
from the Kahoot page open in Chrome (Tidbits, 2026-09-07), not typed.
BOBA's 17,793-card catalog came from a Cowork session. **Instead:** he
said where the truth lives and judged what came out ("There should be
thousands of documentaries").

**Open code files to find a call site.** The course asks the student to
"Open `js/api.js`. Find where the web app would call your data" (stage
02, step 4) and to "Read what it wrote before you accept it" (stage 01,
step 5). No prompt refers to a code file by path. Ben speaks entirely in
product terms: screens, buttons, films, devices. The only code-shaped
text he typed is pasted error output: compiler messages in the early
months ("Property 'modelContext' is not available due to missing import
of defining module 'SwiftData'", AW, 2026-06-10, commit quote), and Play
Console and PowerShell errors later. **Instead:** he judged behavior,
and asked for audits that read the code on his behalf.

**Edit JSON, PARITY rows or decision entries by hand.** The course asks
the student to write `DECISIONS.md` entries and `PARITY.md` rows
(stages 00, 02, 03). Ben never wrote either. He stated a rule or chose
among options and the agent wrote the decision. He asked for parity
audits rather than filling cells. **Instead:** "Can you ask me the owner
items as a series of questions where I can see the options and choose
from among them?" (2026-09-25), then six one-line answers that became
Decisions 139 onward.

**Create Xcode targets or run Gradle himself.** The course asks the
student to "follow `apple/README.md` to create the one universal
target" and "open `android/` in Android Studio and run `./gradlew
:app:assembleDebug`" (stage 03, step 2). This is the one place the early
record differs: Archive Watch's April scratchpad told him to create the
tvOS Xcode project, and he did, and he built from Xcode for a few
weeks. By June he had stopped: "a lot of the instructions in the readme
... seem like things that you can do programatically rather than having
me do them in Xcode" (AW, 2026-06-23, commit quote), and "no one is
going to rebuild the app on their computer using Xcode when the app is
available on every platform already" (AW, 2026-09-10). Tidbits'
project was generated by the agent with xcodegen from day one.
**Instead:** "Build whatever hooks you need in order to be able to test
the Mac app on your own." (AW, 2026-06-23, commit quote).

**Fill in harness config files.** The course asks for
`tools/bench.json` and `tools/app_config.py` by hand (stage 04). Ben
never edited a config. He did the physical half: enabled developer
mode, read out pairing codes, unlocked phones, plugged in cables,
signed devices into Apple IDs, named which devices were off limits.
**Instead:** "Let's get connected to all of the Apple TV's in my house
via the known pathway through Xcode. Add the fireplace tv and the movie
room tv and I'll read you the connection codes." (AW, 2026-09-11).

**Write the failing test first.** The course asks the student to write a
test that fails on the old code (stage 04, step 5). Ben never wrote a
test. He demanded the property the test provides: that "fixed" be
proven ("I need when you tell me that things are working on a device,
that they are actually working", 2026-08-27) and that rigs be
deterministic. The agent wrote the tests and negative controls.

**Run the release commands himself.** The course has the student run
`gh workflow run appstore-build.yml` and `asc_release.py status` (stage
05, steps 2 and 3). Ben never ran them; he said "ship" and asked what
the store said. He did run two `!gh secret set` commands himself
(2026-09-07) and pasted API keys, because the agent would not handle
credentials. **Instead:** "You can ship the new versions now."

**Click through store consoles.** He tried hard not to. The exceptions
are real and worth teaching as "what stays human": he created developer
accounts, logged in so the agent could drive Chrome ("I just logged in.
You should be able to run those commands just fine", 2026-09-06),
completed an email verification, dragged a file into an upload box
once, and on 2026-09-09 turned off managed publishing in Play by hand
("I've switched off the managed publishing and submitted those changes
manually to get this one through", Tidbits). **Instead:** the agent drives
Chrome; Ben does logins and legally personal steps.

**Run Pulse or open the stores' dashboards.** The course has the
student run `pulse_collect.py` and compare it to a console (stage 06).
Ben never ran the collector. He read the page and asked when it would
update. He did act as a delivery mechanism for vendors with no API: "It
says that it will do a CSV Zip file and I just sent it to make sure it
is working" (Roku reports by email, 2026-09-14). **Instead:** "The whole
point of Pulse is that I never have to go into the individual
dashboards."

**Write skills or read SCRATCHPAD himself.** The course asks the
student to fix `SCRATCHPAD.md` and write a skill (stage 08). Ben asked
the agent to do both ("create any new skills necessary", 2026-09-08;
"Add any lessons learned or skills that would be useful for our
Universal App Template", 2026-09-01). He asked the agent what state it
was in rather than reading the file: "Is all documented work
completed?" (2026-09-26), "What are the things you are wating on me
for?" (2026-09-21).

**Read the agent's code before accepting it.** No evidence. He accepted
or rejected on behavior and on evidence of behavior, and escalated when
evidence was missing.

---

## E. What the person brings, and what the agent does

### What only Ben brought

1. **The wish and the values.** What the app is for, and the lines it
   will not cross ($0 to run, no AI copy in the product, public domain
   only, least behind the paywall, adult content off by default, US
   English, only essential words on screen).
2. **The choice of source and the judgment of truth.** Which data is
   real, which is wrong, what counts as a documentary or a public-domain
   film. Rights calls stayed his by rule (Archive Watch Decision 027),
   and his answers are specific: "If we have verifiable copyright claims
   on movies or TV shows, we should work to remove those items from the
   database. If we truly don't know about the copyright status, then
   they can stay because of that ambiguity." (2026-09-28).
3. **Devices, accounts and money.** The hardware bench, developer
   accounts, store fees, Apple IDs, logins, pairing codes, developer
   mode, unlocking.
4. **Eyes and hands on the app.** Living with it on every device;
   noticing the Play button truncated, the audio drop, the poster
   crop, the TV-sized buttons missing. Physical presence for tests only
   a body can do: "I'm back at my bedroom Apple TV so that we can test
   with continuity camera" (2026-09-19); "If I need to keep the
   continuity screen up on my whole time for the test I will."
   (2026-09-19).
5. **Taste.** "Everything still looks incredibly boxy and rudimentary."
   "The banner should not call out specific movies [...] It is the huge
   number of movies and other titles." (2026-09-07). "'Program' doesn't
   make sense as a label. I think Stream or Preview makes a lot more
   sense" (2026-09-22).
6. **Calibration.** Asking whether a claim is true, and refusing a
   claimed limit.
7. **The people.** Testers, a Reddit thread, a Discord community, a pub
   trivia night, a family SharePlay call. And his own replies to them:
   "Please note that my username is bhwilkoff and my responses to the
   comments should also help to guide the work for this session."
   (2026-09-11).
8. **When to stop and when to ship.** Stopping loops, holding small
   releases, saying "ship."
9. **Product decisions no rule settles.** Chosen from options the agent
   laid out.

### What the agent did

Research; every line of code on every platform; the data pipelines and
their GitHub Actions; the design docs, decisions, parity matrix and
data contract; the device rigs and the tests; building, signing and
submitting to every store; store copy and screenshots; CI health;
Pulse; memories, handoffs, skills and the template.

### Per stage, briefly

| Stage | Ben brings | The agent does |
|---|---|---|
| 00 | The why paragraph; rules stated when crossed | Writes them where it will read them; tests where possible |
| 01 | A wish, a source, "done means X this session" | Research, pipeline, first platform, all in the first sitting |
| 02 | "Parity everywhere," the reference platform, the canonical domain | Matrix, contract, pipeline-computed answers, parity audits |
| 03 | Native standard, the old devices, the floor tradeoff | Native shells, design docs, measured floors, legacy tiers |
| 04 | The bench, physical setup, manners, spot checks | Rigs that see the glass, doors, leases, verified teardown |
| 05 | Accounts, logins, "ship," release judgment | Cloud builds, store APIs, Chrome for the rest, notes |
| 06 | Reads email, Pulse, the socials; asks for the loop | Fleet doctrine, Pulse, auditors, loops |
| 07 | The want from real use, the critique, the $0 bar | Research, per-platform build, proof on real platforms |
| 08 | "Write it down," "read your runbook," multiple choice answers | Memory, handoffs, skills, upstreaming |

---

## Implications for the rewrite

Offered as notes, not decisions.

1. **Each stage's "What to do" should be prompts and observations, not
   files and commands.** Where the course says "save twenty records,"
   Ben said "use this source, build the pipeline." Where it says "run
   http.server," Ben opened the live URL. Where it says "open
   `js/api.js`," Ben said what was wrong on the screen.
2. **The learner's real steps are the human ones:** write the wish and
   the values, pick the source, set up the devices and accounts, use the
   app, say what they see, correct with a reason, decide when asked, say
   ship, say stop.
3. **Teach the prompt patterns in C as the skill,** with the corrections
   in A5 as the most valuable examples. The corrections are where the
   method lives.
4. **Keep "what stays human" honest,** including the credential friction
   and the few console clicks. Ben's own record shows those are the
   real remaining hand steps.
5. **Be step-aware:** a learner at stage 01 has no devices bench, no
   CI, no loops. Ben's first day on Tidbits used five prompts and a
   simulator; his device bench came in August. The course can mirror
   that growth rather than front-loading the bench.
