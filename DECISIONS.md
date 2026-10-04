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

The site is offered by Learning is Change, Inc., 8287 S Pennsylvania
Ct., Littleton, CO 80122, the entity on Ben's app store accounts; /terms/
and /support/ say so, as Google's listing requires. The Gmail account for
testing as a student is kept in ~/.humanshaped/test-student on Ben's Mac,
never in this repository.
