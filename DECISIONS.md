# humanshaped.org decisions

Ben's answers of October 2, 2026, to the launch questions in
`research/README.md`, recorded as rules. `VISION.md` is the why; this
page is the what. Each entry leads with the rule.

## The system, not the first cohort

**A cohort is content, created by a teacher in the hub.** It has
classes (sessions), members, groups, and metadata (dates, time zone,
session length, size, status). Nothing about cohort 1 is hard-coded.
**Why:** Ben wants the system adaptable from the first day. **How to
apply:** every cohort detail is data a teacher edits, never a constant.

## Who it is for

**Adult creators who have never built an app** and want to solve
human-shaped problems. School-aged cohorts are possible later, not the
target. **How to apply:** write for adults new to building; no minors'
flows at launch.

## AI tools

**Students bring their own AI.** Each student invests in whatever lets
an agent work on their GitHub repository, from local models to Claude or
Gemini subscriptions. The course shows the cheapest workable ways and
never requires one vendor. OpenAI is not recommended.

## Community

**One `humanshaped` GitHub organization holds all conversation.**
Cohort conversations are private to the cohort by default; a cohort may
choose to open them.

**No covenant.** Ben, October 2: a covenant is "incredibly heavyweight
for something that we are trying to keep light and adaptable." How we
treat one another rests on the principles and on Ben's Educational Model
Spec (https://github.com/bhwilkoff/educational-model-spec), said plainly
where people meet, not in a code of conduct.

**The organization exists:** github.com/humanshaped, contact
Ben's own address.

**Teachers:** Ben only at launch, then people he invites. A request form
comes later.

**Groups:** pairs, trios or small groups, easy to change, and visible to
the students: each person knows their partners and what the partnership
expects.

**Visibility inside a cohort:** classmates see each other's
repositories and their commits and progress from inside the portal, the
upcoming meetings, and the current week's scope of work.

**Alumni:** the credential gives access to finished cohorts (not live
ones) and makes the holder eligible to mentor newcomers.

## Data

**Students own their data, on GitHub.** The hub owns only what students
choose to share while in a cohort. After someone leaves, the hub owns
nothing of theirs, and never owns their software. Storage is in the US.
**How to apply:** read from GitHub with the student's permission rather
than copying; store only membership and what was shared; leaving removes
it.

**Database:** Supabase (Ben's one existing project is BOBA, so there is
room). Cloudflare Workers for anything Supabase cannot do, and as the
fallback.

## Live sessions

**meet@humanshaped.org is the service account for every system.**
humanshaped.org is a secondary domain on Ben's Google Workspace for
Education, and meet@ is its own account, separate from Ben's, so nothing
depends on his personal login. It hosts every session. Build a tool for
creating the events and checking they work; Ben will grant Google admin
access where settings need it.

**Sessions are recorded by our own tool, at $0,** and stored on Google
Drive, always available to the cohort's members. Meet's built-in
recording needs a paid license on this edition, so it is out. **Why:**
"the goal is for this to cost $0 in ongoing costs." **How to apply:**
never propose a paid seat or license; find the $0 path.

**Checks for understanding in every live session,** and frequent
discussion or demonstration points throughout the coursework, on the
site and in the template.

**"Explain it back" is about decisions, not code.**

## The directory and the declaration

**The directory.** Apps built in a cohort are included automatically.
Apps whose repository was made from the template are automatically
considered. Only people who did not use the template but build by the
principles apply. Ben curates the directory himself, so there are no
rules for policing it.

**Declaring software human-shaped means meeting a set of specific
principles,** as Value Based Engineering does, drafted from what the
template has learned, the Educational Model Spec, and the template
itself.

**The event toolkit is for meetups and Human-Shaped Hackathons:**
resources to lead conversations or present with the principles front and
center. It needs strong branding, a logo, and well-crafted language.

## Publishing

**No publishing under a shared account.** Out of scope: people publish
for themselves once they can. The course supports web publishing on
GitHub Pages (and related tools), signing up for the app stores, and
sideloading.

## Design and content

**Explore several site designs.** Polished, and free of every
AI-design habit: it should feel hand-drawn, not algorithmic, and invite
people before it serves machines.

**The site and the template cannot drift.** The site is the visual,
highly polished version of the template's information, extending it for
people who use web pages rather than GitHub.

**Diagrams are designed for people who are not technical.** Ben will
record sessions that show what human-shaped development looks like.

**"Computer-shaped problems" is the movement's shorthand,** credited to
the Bluesky post that started it
(https://bsky.app/profile/mosheroperandi.bsky.social/post/3mgasswgabs23).
The vision runs through the template and the hub.

**The case for the method must be made plainly:** why building this way
is different from, and better than, asking an AI to make you an app.
Archive Watch's public history is a case study. Readers will not know
Ben's apps, so every example carries its context.

**The showcase:** Archive Watch, Tidbits Trivia (including Windows, live
in the Microsoft Store) and Bsky Dreams are current and maintained. BOBA
Playbook is not in active development and stands as the proof point for
large databases, huge numbers of files, camera scanning, 3D on iOS, and
pricing models.

**GitHub skills are taught throughout the cohort.** No "merge as the
ship moment" framing.

## The credential

**Issued from cohort 1 onward. The evidence is the repository.** A web
app pushed live is enough for the credential. Each additional platform
the app is published on adds a level.

## Review on production

**Push to GitHub freely.** Ben, October 2: "I prefer to let things get
reviewed on production, as no one is aware of the domain purchase or
this website yet."

## Scope of change

Ben, October 2: "You can make whatever changes are necessary to get us
up and running with an incredible universal app template and a hub
website at humanshaped.org in order to get people on board with the
Human Shaped movement."

## Showing apps in public (October 3, 2026)

**A student shows their app when they say it is ready, and every
student submits their app by the end of the cohort.** Ben, October 3:
"The student should opt in when they say that the app is ready. But,
every student must submit their app to be included by the end of the
cohort." **How to apply:** the switch on /cohort/ is the student's "it is
ready"; the cohort page and the teacher's view show who has not
submitted yet as the cohort nears its end.

**A teacher can hide an app from public view, and it stays part of the
cohort.** Ben: "It will always be a part of the cohort, but there are
many reasons to not include an app publicly." **How to apply:** hiding
removes it from /apps/ and the feed, never from the cohort's own pages.

**The template's placeholder look can change later, as long as every
platform matches.** Ben, on the slate palette from design-tokens.json:
"I want to make sure that it matches the design of the other surfaces."
**How to apply:** one design-tokens.json, every platform generated from
it, and the parity test keeps them together.

**Teacher moves wait on more research.** Ben was not sure about the
session moves drafted into COURSE.md (pairs or trios, fading the prompt
reading, lessons sent back). Research on online facilitation,
project-, challenge-, and performance-based assessment, and online
social learning comes before the tools that depend on them.

## The arch (October 3, 2026)

**The arch is either the hyphen between "human" and "shaped", or it sits
high in its space, never centered low.** Ben, October 3, on the icon:
"when the arch shows on the emoticon in the center, it looks like a
frown. When it is in the word mark, the arch shows as higher so it reads
as the top of a person's head." **How to apply:** an arch on its own
(the favicon, the home-screen icon, anything new) uses the wordmark's
proportions and sits in the upper part of its frame, with the empty
space below it, so it reads as the top of a head. In the 32-unit
favicon that is ends at y 16 and the top at y 7.5.

*Narrowed October 5, 2026; see "The arch joins, or stands alone" below.*

## Teaching, agents, and events (October 3, 2026, afternoon)

**Adopt the teaching research.** Ben chose to adopt all of the changes
proposed in research/notes/facilitation-assessment-social-learning-notes.md:
the COURSE.md moves (an "Arrive" part that closes the loop on last
week's checks, the builder's question before the three questions, "one
value at work" as its own part, fading the prompt reading through the
cohort's own stuck moments, "Start" instead of "Build", private checks
with "what is still muddy?", "Ready or not yet" against each stage's bar,
trios by default, four social rules said aloud, reaching out within two
days, writing down agreement before acting on an AI review, new teachers
co-leading first) and the five tools in order (one Meet link per group,
closing the loop on checks, the trio protocol on /live/, ready or not yet
on bring-backs, a teachers-only "not seen this week" list). **How to
apply:** drafts for Ben's copy audit; never build points, streaks,
leaderboards, attendance or camera tracking, scored quizzes, AI grading,
automatic partner rotation, or a second chat space.

**AGENTS.md stays under 24,000 bytes.** Antigravity cuts off longer rule
files. **How to apply:** rules and values stay in AGENTS.md; platform
playbooks live in docs it links to.

**The course names Antigravity as Google's route, labeled "may change".**
Gemini CLI is paid-only since June 18, 2026, and Antigravity's free limit
is unpublished.

**Anyone may call an event a Human-Shaped Meetup or Hackathon without
asking,** as long as it keeps the parts the guides name.

## The classroom on Meet (October 3, 2026, evening)

**Open, not private.** Ben: "I'm fine with publishing things privately
for testing. But, the goal is to make things accessible, open, and free.
Keeping things private doesn't really make sense for that." **How to
apply:** private publishing is a test stage only; every add-on and tool
is built to be listed publicly (privacy and terms pages, Google's
review), and anyone teaching or taking a cohort can use it.

**What Ben wants the session to do,** in his words, as the brief for the
Meet work:
1. Breakout groups that are easy (a temporary Meet he launches people
   into and calls them back from, or another way).
2. A collaborative drawing space, or a slideshow easily worked on
   together.
3. As deep a connection as possible with GitHub and the AI agents
   working on each app and repository.
4. Decent analytics for what happens in class, including talk time if
   possible.
5. Easily deciding who is "on stage" and who is observing, ideally with
   several custom layouts that highlight who should be talking.
6. Better use of the chat, which Meet throws away after the meeting.
7. Running other apps inside the meeting, easy to choose among.
8. Listening to, observing, or joining breakout sessions from a
   dashboard.
9. Checking code or getting feedback from his own AI agent during class.
10. Cards and objects on screen ("you have 5 minutes of worktime left")
    with custom text he defines.
11. Recording locally rather than through Google Workspace, and clipping
    moments from class.
12. Following up with individual students based on what they
    contributed and what was discussed.
13. "I do not want a creepy AI recorder to be hovering and 'attending'
    the meeting with us. It should feel safe and joyful throughout the
    session." **How to apply:** no bot participant, ever; anything that
    records or measures is visible, explained, and in the teacher's
    hands, and students can see what is kept about them.
14. A little Human Shaped branding inside Meet, with the cohort's people.

## Notes to students (October 3, 2026)

**Students keep the notes their teacher sends them, can remove any of
them, and the teacher can edit a note to correct it.** Ben: "Students
should be able to keep notes afterwards. They should be able to remove
notes if they wish. And notes should be editable for typos and other
corrections." **How to apply:** notes are not deleted when a cohort
finishes or the student leaves; the author can edit the words, and an
edited note says so.

## The live classroom, after the first test call (October 4, 2026)

Ben tested the Meet add-on in a real call as meet@ and wrote:

> 1. The Main stage seems to work well, but I don't like that I cannot edit things within the sidebar to display on the main stage.
> 2. The connection betweeen the "full live page" and the live session don't entirely make sense to me. I like the idea of having a course/class page that you can keep coming back to, but for a live session (and it might make sense to prep the session on that page from the teacher perspective, but the interactivity should happen within the session iteself rather than on a separate page. Can we create a "teacher view" for the Human Shaped add on and a Student view as well and all of the components be fully visible (from the full live page) within the add-on?
> 3. I like the metaphor of a timeline for live classes. The expectations are easy to understand since synchronous events are based upon things happening at a particular time. It might make sense to have it show linearly as we progress through the session. This way, we don't get bogged down in the different items (Now, Queeu, Checks, etc. - What do they mean individually? Does it actually make sense for them to be separate? Or, perhaps the different functions simply need to be explained better.)
> 4. I really like the idea of asking questions and having them display on the screen. I like the way that you can either use the built-in questions or choose your own, but I'd like to be able to set up questions ahead of time and select from them (perhaps the course page should allow for teachers to prep questions ahead of time). I'd also like to see more robust question types and the ability to do more sophisticated editing of the questions in the moment. However, answering on the cohort's live page is pretty wonky instead of answering in the Meet interface or the sidebar.
> 5. The board seems extremely disconnected from the add-on as well. I love the idea of using the board for collaboration, but if it opens in a separate window, it does make it harder. Is there any way that we can let folks interact with the board within the Meet interface?
> 6. The rooms seem very cool, but it seems overly conveluted to both create the rooms, launch people into them, and call people back. I'm not really sure what the different steps of the rooms mean and what I'm doing by puttin them into those steps. How do the rooms get generated and how does my "main stage room" interact with them (calling them back, putting them into a different step, etc.)? What kind of tools do the students get within their rooms that would help them to present to one another and discuss things that I've laid out for them.
>
> Overall, we need a MUCH better sidebar interface that allows for multiple different controls for during the live event, we need a much more robust class page that allows for laying out content (almost like a class builder interface that can decide what will show up in the sidebar for a given session), and we need better interactions betwen the different elements of the class including the Board, the main stage, the rooms, the content being displayed on the main stage and in the rooms, and the ability to control all of these elements easily (turning things on and off) with a consistent metaphor that functions throughout (i.e., Main Stage, Rehersal Room, Presenter, Audience, Run of Show, Acts, Scenes, etc.). The goal is for us to be able to set up the class ahead of time, run the class adaptably with a fully intuitive interface, and follow up from class afterwards with each of the individual students.

What this decides: the session is prepared ahead of time on the class
page, run entirely inside Meet (a teacher view and a student view of the
add-on, with everything /live/ has), and followed up afterwards; one
timeline-shaped metaphor runs through all of it. The design is in
research/notes/run-of-show-design.md.

## Google sign-in beside GitHub (October 4, 2026)

Google lists a Meet add-on publicly only if it offers Google's One Tap
sign-in to someone who is not signed in (tools/meet-addon/LISTING.md).
Asked how to handle that, Ben chose "Add Google sign-in": inside Meet,
people sign in with Google in one tap, and the first time they link their
GitHub account in a small window, so GitHub stays the identity for
repositories and discussions. The Google sign-in client lives in the
`human-shaped` Cloud project, at no cost.

## The vocabulary, and who offers the site (October 4, 2026)

Ben on the run-of-show vocabulary: "The vocabulary does feel right,
although I'm not totally sure about 'board scenes'. Maybe 'Design
Stage' is better?" So the board scene is the **design stage**, beside
the main stage. Every other word in research/notes/run-of-show-design.md
stands.

The site is offered by Learning is Change, Inc., the entity on Ben's
app store accounts; /terms/ and /support/ say so. Its street address goes
to the stores' developer forms only, never on the site or in this
repository (Ben, October 6: "please take my address off of the
webpage"). The Gmail account for
testing as a student is kept in ~/.humanshaped/test-student on Ben's Mac,
never in this repository.

## The site's voice and order, after Ben's review (October 5, 2026)

Ben's twelve points on the whole site, as rules.

**Lead with the idea, not the cohort.** "People have to buy into the
concept of what Human Shaped Software is before they can knowingly [say]
if they are on board or not." **How to apply:** the home page opens on
human-shaped software, the principles, and the why; cohorts come after,
as one way in.

**The story starts from software brain, and AI is a tool people wield
for human purposes.** The Bluesky post is "relevant but not essential,"
and the idea is not original: Nilay Patel has long described "software
brain" (https://www.theverge.com/podcast/917029/software-brain-ai-backlash-databases-automation),
seeing every problem as a database waiting to be leveraged. "The goal
in making Human Shaped software is to use AI as a tool, one that humans
should [wield] for human purposes. It should not be used to replace
humans or destroy human creativity," and first drafts are "soul-less
slop" until people work them. "Value-based approaches to using AI are
the only way forward, and it needs to be clear what values every piece
of software should 'wear on its sleeves.'" **How to apply:** credit
Patel for the frame, keep the Bluesky post as a credit for the phrase
only, and say plainly that the values come first.

**Lead with the why, not with what Ben's apps did.** The film notes
example is about why: human-written notes value human contributions,
even when they need correcting. "10,000 movie summaries written by AI
is more efficient, and yet it is a worse experience for the internet
(Dead Internet Theory or 'Google Zero') and a worse experience for
people because it removes the people who actually watched and enjoyed
the movies." "Humanity is inefficient and that is the point. Learning
is inefficient, but we have great tools to make it work better while we
use our values to guide the work." **How to apply:** a principle and
how it shows up in building comes first; a specific app's moment only
when it is the clearest illustration, and never as the headline.

**The method is Write, Play, Publish**, replacing "write it down, prove
it, live with it." "Writing gets it out of my head. Playing makes my
thinking tangible. Publishing is about releasing things into the world
and letting others play. It is about having an authentic audience for
your work." Publishing matters because human-shaped problems "are not
just limited to one person, they tend to be identifiable to many people
and possibly even universal." It is iteration, and the principles drive
how we build. **How to apply:** in the template (README, AGENTS.md,
COURSE.md, stage 00) and on the site, the same three words.

**The arch never frowns.** The folder icon on the home page put the arch
in the middle. **How to apply:** see "The arch" above; every icon puts
the arch at the top of its shape, or leaves it out.

**No meta-commentary, and not one person telling people how to think.**
Copy that summarizes how the site was made, or what Ben told Claude,
does not belong on it. "We are trying to ensure that real people see
themselves in this movement." **How to apply:** the site speaks to the
reader as "you"; "we" means everyone building this way; "I" appears
only in Ben's own signed words (a quote, the principles' byline).
Teacher pages speak to the teacher as "you" and call students
"students." No sentence fragments as statements ("Five weeks, and a week
before them.").

**Sign in just signs you in.** Every "Sign in with GitHub" goes to
/account/, which signs you in and nothing else competes with it.

**Principles over particulars.** People browsing will not know the
apps. Lead with the broader principle and how it shows up while
building. "Once you have identified the 'Human Shaped Problem' you are
trying to solve, you aren't constantly questioning the AI for whether or
not they are solving in computer-shaped ways. The human being involved
is what keeps it human-shaped." **How to apply:** no "How to use the
phrase" checklist; the person in the loop is the safeguard.

**The cohorts page is for people deciding to join.** No teaching-a-
cohort pitch, no notes meant for Claude. "Our code of conduct is baked
into the model itself, the principles we have written out. Anything we
would formalize beyond that would be up to the cohort." **How to
apply:** the principles are the shared agreement; each cohort makes its
own rules.

**Pages that feel alive, and say each thing once.** The apps page needs
real design, with images from the apps themselves. Content lives in one
place and other pages link to it.

**Two marks, no gatekeeping.** "Aligned with Human Shaped": the builder
has written how their software lines up with the fifteen principles.
"Endorsed by Human Shaped": the software started from the template, or
its builder wrote their commitment to the principles; either one earns
it at once. "I don't want to be a gatekeeper on this idea. We want as
many people as possible to align themselves or become endorsed by
answering the principles."

## The home page's claim, the principles' grammar, and the arch (October 5, 2026, evening)

Ben chose the first of the three tries in `design/round-3/` (the
principles themselves as the picture) and changed its headline.

**The headline centers the builder.** "Apps that wear the builder's
values on their sleeves." In Ben's words: "since we are talking about
humans being the ones doing things, we have to center the builder as
the one who actually holds the values. They are not generic and they
don't mean anything without humans actually believing in them and
making things that utilize the values." **How to apply:** values on the
site belong to a person who holds them and builds by them, never to the
software alone or to the method in the abstract.

**Every principle finishes the sentence "Human-shaped software...".**
Ben: "The whole point of having principles that utilize a parallel
structure is so that you can put 'Human Shaped Software:' at the top and
have all of the verbs start the beginning of each principle. It makes it
so that each one is action oriented from the very beginning." And: "each
principle should finish the sentence 'Human Shaped Software...'"
**How to apply:** wherever the principles appear (PRINCIPLES.md, each
principle's own section, HUMAN-SHAPED-template.md, the home page card,
the sheets), "Human-shaped software:" is said once, as the stem, and
every principle starts with its verb: "Starts from a human-shaped
problem", "Increases what people are able to do". Never repeat the
subject in front of each one.

**The arch joins, or stands alone.** "The Human Shaped 'arch' should
really only be used when it highlights something about either joining
together two things (Human and Shaped) or as a logo that doesn't have
other things connected to it. The way it shows in the design image makes
it look like it is hanging the principles on a hook." **How to apply:**
the arch is the hyphen between "human" and "shaped", or it is the logo
on its own (the favicon, the app icon, a corner of a Meet background).
It is never a head on a drawn person, a hook or handle on a card, a
bullet, or a prefix to other words. Drawn people get round heads.

## Fewer pages, each idea in one place (October 5, 2026, evening)

Ben: "there is now significant overlap between the homepage, 'the
path', 'Why', and 'Principles'. Can you work to consolidate everything
into a smaller number of pages." **How to apply:** each idea has one
full page, and every other page summarizes it in a line or two and
links there.

- **Home** is the pitch: the claim, the principles card, the idea in
  brief, the three moves in brief, the ways in, and the apps.
- **/principles/** is the why and the principles together: the
  computer-shaped problems essay, then PRINCIPLES.md, both read live.
  "Why" left the navigation; /why/ redirects to /principles/#why.
- **/path/** is the method, stage by stage. The week-by-week list lives
  only on /cohorts/.
- "More than asking an AI for an app" and the Archive Watch case study
  are read on GitHub; their old site addresses redirect there.

## Icons by people, the apps' own screens, and nothing said twice (October 5, 2026, night)

**Icons come from people, not from Claude's shapes.** Ben: "I'd much
rather lean on tools like The Noun Project or other human-developed
creative commons or public domain icons rather than ones that you are
drawing out of shapes on your own." **How to apply:** icons come from
Phosphor (phosphoricons.com, by Helena Zhang and Tobias Fried, MIT
License), kept in `assets/icons.svg` with the credit in the file and in
every page's footer. Add an icon by copying its SVG from the Phosphor
package into the sprite; never draw one. The Noun Project is the next
place to look for anything Phosphor does not have, with its credit.

**Show the working software.** Ben: "the screenshots for each of the
apps ... were the actual screenshots from the app store that I had to
submit. These can be used and reused to show the working software."
**How to apply:** the founding apps' store screenshots are copied small
into `assets/apps/` (sources in its README) and drawn by `shotsOf` in
apps-lib.js on every card, every app's page, and the home page's "Built
this way" band.

**The home page's sections each look like their own place,** with their
own background or band, a short head, and cards rather than paragraphs.

**Say each thing once, and never describe the machinery.** Lines that
explained how a page loads ("read from the template each time it opens",
"read live from GitHub", "From its listing in the directory") and the
visible "draft, written with an AI agent" notes are gone. The start page
links to the meetup and hackathon kits rather than retelling them, the
founding apps' status is said once rather than on every card, and the
cohorts page says joining uses GitHub once.

## Active learning in the add-on (October 5, 2026, night)

Ben asked for eight things in the Meet add-on (reactions with keys and
agree or disagree, content shown without screen sharing, who answered
and where people are, attendance, code and agents in the call, richer
chat, badges for skills, and a rooms dashboard on the main stage), read
against the Active Learning Forum chapter (research/notes/active-learning-notes.md).
Some of these come near earlier rules, and his newer, explicit request
wins; each is built the human-shaped way:

- **Attendance** is a live roster of who has the class open, so the
  teacher can welcome whoever is missing. It is never stored, never
  reads cameras, and never becomes a record of absence. This narrows
  "never build attendance tracking": presence while the call runs, yes;
  a register, no.
- **Reactions and stance** are sent by a person, never measured about
  them, and are not stored or counted per person.
- **Where people are on the path** shows only what each person chose to
  share.
- **Chat** stays the cohort's GitHub Discussion; no second chat space.
- **Badges** are recognition for a named skill at a named moment, with
  no points, counts, or ranking.
- **Agents** never join the call. A person's own agent can read the
  class, and what it says reaches others only when that person shares
  it, marked as AI.


## Recognitions in the credential (October 6, 2026)

Asked whether a recognition belongs in the signed credential's evidence,
Ben: "Yes. An in-class recognition would be great to include as evidence
on the final credential at the end of the cohort."

## Human-shaped problems (October 6, 2026)

Ben's own piece, to be used to revise the hub for clarity (his words,
kept as he wrote them; any page that quotes him fixes only obvious typos,
with his review):

> A human-shaped problem is something, really anything, in your life that will in some way make your life better, happier, or more deeply resonant with the universe if you could only solve for it. It is something that is the gentle hum of worry or concern that you have about an area of your life. It is a thing that you wonder and question about often. It'is something that has gone unsolved for months or even years, something that is present in a inawing way. And most of all, it is something that you cannot do yourself. Your current tools and resources are insufficiently up to the challenge.
>
> Good Human-Shaped problems:
> - I do not have time to read books in my life. I need something that fits my way of existing that will still let me enjoy great novels and non-fiction every day.
> - I lack inspiration for what to do with my child to entertain them without screens. I need something that will constantly suggest new things to do that cater to both of our interests.
> - I read a lot of news and "takes" from people online and I even see newsworthy things out in the real world, and I would love a way to chronicle it all into a cohesive narrative, an understanding of how I see things to remind myself why I believe what I believe.
> - I want an easy way to align my political beliefs with who and what I'm voting for when I get my ballot or bote in person.
>
> Computer-Shaped Problems:
> - I want to measure the amount of negative sentiment online for any given public figure.
> - I want to find the best price for my grocery list on delivery apps so that I can comparison shop and combine trips for the cheapest (and least convenient) trips for the delivery drivers.
> - I want to categorize every conversation I have and chronicle them as a way of measuring my impact on others.
> - I want to map socieoeconomic data by neighborhood so that I can use it to choose the optimal route for halloween trick or treating to ensure high-end candy.
>
> Human-Shaped problems see the world as interrelated stories to be told, experienced, and added to.
>
> Computer-Shaped problems see the world as disparate data points to be aggregated, quantified, and leveraged.

## The pitch, and principles that stand alone (October 6, 2026)

Ben, on the home page's first words under the headline: "If anyone can
build their own apps (with AI), it matters even more which apps they
choose to build and how they choose to build them. We exist to ensure
that the future continues to be shaped by humans." The home page now
says it that way, lightly edited for his review, instead of leading
with one principle (writing values down).

Ben, on /principles/: "The principles page should not be the entry
point into the template or a justification for all of Human-Shaped as
an organization. It should be about the Principles themselves." So
/principles/ shows only the fifteen, each drawn the same way, and the
why and what Human Shaped is moved to a new /about/ page.

## Forest and thistle (October 6, 2026, night)

**The palette is forest green and thistle on white, chosen as a pairing no
brand uses.** Ben asked for colors "recognized around the world as
uniquely ours" and not the cream-and-clay look AI-made sites default to.
Every bright single color turned out to belong to someone (pencil yellow
is Caterpillar's exactly), so the search moved to pairings and checked
them against 427 multi-color brand palettes, 3,465 Simple Icons colors,
and 70 hand-checked palettes (research/notes/ai-design-anti-patterns.md).
Ben chose forest `#1F4D3A` with thistle `#DCC4F0` from the families he
liked.

- **Light:** white paper, ink `#162019`, muted `#4E5B55`, a thistle tint
  `#F6F1FA` for tinted sections. `--accent` (links, buttons, focus, the
  arch) is forest.
- **Dark:** paper `#0D1E17`, ink `#E6EEEA`, muted `#9DB3A9`. `--accent`
  is thistle.
- **The band** is forest in both modes, with white type and thistle for
  its accent. Thistle is never a ground for paragraphs; it is for the
  what is current, stickers, and buttons on dark (Ben: a full lilac
  ground "is incredibly hard to read").
- Only the colors changed in this pass; every shape and position, the
  arch high in every icon included, is as "The arch" above and the brand
  kit say.
- No highlighted words (Ben, later the same night): the thistle
  highlight on "sleeves" read as AI-written and was removed.

## Our method leads the curriculum (October 7, 2026)

While the curriculum research came in, Ben: "Make sure any new loops
that we are creating work with the one we have already established:
Write, Play, Publish. We have to make sure that OUR processes and ideas
are at the forefront. The research is incredibly helpful (it is one of
the principles!), but we have to stay true to Human Shaped Software."

**How to apply:** the curriculum introduces no second loop. Every
lesson, live session, assignment, and stuck resource is a round of
Write, Play, Publish, with the fifteen principles deciding what is
written, played with, and published. Outside ideas found in research
(an agent's explore, plan, build, check; Resnick's creative learning
spiral; the Question Formulation Technique; productive failure) are
taken in only as ways of doing one of the three moves well, credited
where they are used, never as the frame. Ben's own process, apps, and
words come first; research supports and sharpens them.

## The first lessons missed; instructional design comes first (October 7, 2026)

Ben, after reading stages 00 and 01 as rewritten by the curriculum loop:
"Okay, the content and the approach is pretty off. First, 'the hum' is a
metaphor. It doesn't work as an instructional move. No one is going to
understand what 'has hummed in your life for months?' What does that even
mean? I've given you a bunch of different ways to identify Human-shaped
problems. If you need more ways to do it, research them. But, don't make a
single line in my writing into the entirety of the approach for how
students should learn. As for the hum sort, you are asking for students to
do something that I have already given them answers to (i.e., I've already
listed things that are human shaped or computer shaped on the website and
you are asking them to recategorize them as if it is a new piece of
information). This whole approach needs better instructional design.
Please research inquiry-based learning or project-based learning if you
don't know how to make activities meaningful from the content (the whole
template and website!!) that I've given you."

**How to apply:** no metaphor is an instructional move; a lesson's
question is one a novice can answer in plain words. Finding a problem
draws on every way Ben has written about it across the template and the
site, plus researched methods, never one line. An activity never asks
students to reproduce an answer Ben has already published; his content is
material students use (as models, criteria, and examples to reason from)
toward their own problem and their own app. Activities are designed with
inquiry-based and project-based learning practice, cited, before any
lesson is rewritten, and the design is shown to Ben before the stages are.
