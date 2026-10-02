# Building humanshaped.org: what the research says

*Research done 2026-10-01, in six parts. The notes beside this page
carry a source for every claim and say plainly what could not be
verified. This page is the synthesis: what to build, what to skip, and
the questions that stand between us and a first cohort in about two
weeks.*

| Notes | Covers |
|---|---|
| `notes/lms-and-data-notes.md` | 1. LMS features on a static site. 7. Free databases, users and cohorts. |
| `notes/google-meet-notes.md` | 2. Building on Google Meet. |
| `notes/design-and-visuals-notes.md` | 3. Design language. 6. Making the ideas visual. |
| `notes/github-onboarding-and-ai-access-notes.md` | 4. GitHub for course delivery. 5. Lanes without a $100 plan. 10. Onboarding. |
| `notes/assessment-and-credentials-notes.md` | 8. Self-paced, live and challenge-based work. 9. Portable credentials. |
| `notes/pedagogy-and-showcase-notes.md` | 11. The showcase. 12. Pedagogy for active, project-based, online learning. |

## What Ben's vision changed

On the same day as this research, I wrote down how I want the site and
the template to work (`../VISION.md`). Where this page and the vision
disagree, the vision wins. Here is what it settles and what it changes.

**Settled.**

- **Free.** The ideas, the method, the tools and the cohorts are free.
  Charging would only come up if my time to run cohorts became the
  problem. So, the sign-up form takes enrollment, not interest.
- **About five weeks,** one live session each week, with challenge-based
  activities between them. `COURSE.md` in the template now maps the
  stages onto five weeks and a setup week before them.
- **GitHub sign-in,** and conversation through GitHub's own discussion
  features, shown on the site.
- **Claude or Gemini,** on a desktop computer set up for both local and
  cloud building and testing. The phone-only route is a convenience,
  not the default. Copilot is not part of the course.
- **Anyone can teach.** Other people can become teachers on the site and
  lead their own cohorts. Roles and permissions are designed for many
  teachers and many cohorts from the start.
- **Two audiences.** The template is for anyone building human-shaped
  software alone. The site is for anyone joining the community, taking
  or teaching a cohort, or starting something of their own. Each change
  goes where its audience is.

**Changed.**

- **A hub, not a course site.** The site starts as the home of the
  cohorts and grows into the hub for everyone building software for
  people instead of profit. Its design language is its own, part
  learning environment, part social hub, part movement catalyst. That
  adds three things to the plan: a public directory of human-shaped
  apps (built in a cohort or not), a page for each app with its
  conversation, and a **toolkit** for declaring your software
  human-shaped and starting an event or a community of your own.
- **AI feedback is in, done our way.** Section 1 originally put
  "AI-written feedback" on the never list. The vision asks for an AI
  feedback system based on our approach, and that can be built honestly:
  a review skill in the template that the student runs in their own
  Claude or Gemini, which asks the questions the method asks (the three
  questions of the idea, the four questions, the values ladder, the
  parity matrix's honesty) rather than grading. It is labeled as AI, the
  student decides whether to share it with the cohort, and it never
  stands in for the teacher. Because it runs on the student's own agent,
  it costs the hub nothing. The hub can offer it context (the stage, the
  challenge, the cohort's schedule) through a small read-only endpoint
  the agent can connect to.
- **Meet gets more than a companion page.** The session page beside
  Meet stays the first build, and it now pulls in the cohort's apps and
  GitHub threads, so anyone can bring their work on screen in one click.
  The same page is what a Meet add-on would show in its side panel later,
  so nothing is built twice. And the read-only endpoint above lets a
  student's AI agent know what the session is about, so they can ask it
  for help in context.
- **Publishing for people without developer accounts.** Apple is clear
  that this is hard. Its guideline 5.2.1 says apps "should be submitted
  by the person or legal entity that owns or has licensed the
  intellectual property", and 4.2.6 says template providers "should not
  submit apps on behalf of their clients"
  (https://developer.apple.com/app-store/review/guidelines/). Google
  Play also refuses apps that "merely provide the same experience as
  other apps already on Google Play"
  (https://support.google.com/googleplay/android-developer/answer/9899034).
  So, the honest paths, cheapest first:
  1. **The web.** Every app is live on GitHub Pages from week 1, at no
     cost, on any device.
  2. **Android, free.** Google's new limited-distribution accounts are
     free for students, teachers and hobbyists, need no government ID,
     and share an app with up to 20 devices the people themselves
     authorize (https://developer.android.com/developer-verification/guides/limited-distribution).
     That covers a cohort, a classroom or a family. It does not reach
     Google Play.
  3. **Apple test builds through TestFlight,** shown to classmates and
     the people the app is for. These still need an Apple account; whose
     account, and what Apple allows when the account holder does not own
     the app, needs checking before we promise it.
  4. **Publishing under one account** (a Human Shaped organization)
     would need each student to license their app to that organization,
     a legal entity to hold the account, and a design different enough
     from every other cohort app to pass review. Apple's fee waiver for
     nonprofits and educational institutions may help with cost. I would
     treat this as a later project with legal advice, not a launch
     promise.
- **Apps that do not all look alike.** This matters twice: people
  deserve an app that looks like its own idea, and both stores reject
  look-alikes. The template's colors, type and icon are placeholders on
  purpose. The plan adds a "make it look like itself" step in week 3: the
  student gathers a few things they love the look of, the agent proposes
  three directions drawn from the app's why, the student chooses, and
  the design tokens, type, icon and the layout of the core action change
  to match. The parity and density rules still hold. The look is theirs.

## The short version

*Written before the vision. It still describes what cohort 1 needs;
the vision makes the hub grow beyond it.*

I want someone who arrives at humanshaped.org to have their own app
live on their phone within their first hour, to spend ten weeks
building it with other people, and to leave with something they can
show anyone. The research says we can do almost all of that at $0, with
the tools students already need, and without building an LMS.

**Build less platform. Protect more learning.**

The course already has most of what the research recommends: one real
project per person, worked examples from real prompts, work shown to
other people every week, and the judging kept with the human. The site's
job is small: explain the course, take sign-ups, give each cohort a
home, run alongside each live session, and show what people have built.
GitHub carries the rest.

Three things changed in 2026 that the plan has to respect. GitHub
Classroom shut down on August 28. Gemini CLI's free tier ended on June
18. And Copilot's free and student plans have chosen their models
automatically since June 24, with no way to keep OpenAI's models out. I
checked all three against their sources.

## 1. LMS features, without an LMS

Moodle, Canvas, Open edX and the rest are built for institutions that
grade, enroll and report. We need almost none of that. The useful
features, and where they live:

- **At launch:** stage pages anyone can read without an account, a
  sign-up form with a privacy note, a schedule per cohort with a
  calendar file, sign-in with GitHub, enrollment, a student marking a
  stage done themselves, a bring-back submitted as a link and one
  sentence, announcements, discussion, and a way for students to export
  or delete their own data. WCAG 2.2 AA throughout.
- **Later:** peer feedback pairing, written feedback from me, an opt-in
  public gallery, the credential, and a small teacher view.
- **Never:** points or grades, auto-graded quizzes, AI feedback that grades
  or stands in for the teacher (see above), engagement tracking, leaderboards, hosting uploaded files, a forum
  built from scratch, and the LMS plumbing standards (SCORM, LTI).

GitHub already does discussion, notifications and project boards, so
the site does not have to.

## 2. Google Meet

Meet cannot be embedded in another page, and the browser extensions that
modify it are fragile and mostly built to track who spoke. So, the live
layer is a **session page** on humanshaped.org that runs beside Meet:
the agenda, the prompts, a timer, and links, with polls and a "show your
work" queue added if we want them. That is a few days of work.

Only the host needs a paid account. A free personal host ends group
calls at 60 minutes and has no breakout rooms or polls. A Google
Workspace Business Standard seat is $14 a month, or $3.50 through
Workspace for Nonprofits if an organization qualifies. A Meet add-on is
possible later, but it needs Google's review (budget two to three
weeks), every participant has to install it, and the live-sharing APIs
are closed to new developers. Attendance data from Meet's API is, in
Google's own words, not intended for evaluating people. We will not use
it that way.

## 3 and 6. Design and visuals

The proposal (in the design notes, with type, color tokens, components
and the layout of all eight pages) rests on eight principles. The ones
that matter most: a lesson page is a page you read, one column, about
66 characters wide. The interface is quiet and the learning is
effortful. Every image is real: a screenshot, a dated prompt, or a chart
drawn from real data. Progress is what you made, never a streak or a
score. And the repository is the canonical text, with the site as its
designed edition.

The review found real problems on the current page: the focus outline
fails contrast, form borders are too faint, and the page uses eight type
sizes where the template allows six. Each is a small fix.

The ten visuals to make first, in order of how much each teaches per
hour: the three moves as a loop, the nine stages by week, Archive
Watch's timeline from April 17 to nine platforms drawn from its real git
history, the values ladder, pairs of my dated prompts with what changed,
where the values live, the four questions as a printable wall sheet,
the two layers of an app, floor and ceiling, and one captioned
sixty-second agent session. Most have a Mermaid version that renders on
GitHub and an SVG version for the site.

## 4 and 10. GitHub, and the first hour

The fewest steps from "no GitHub account" to "my app live on my phone"
is about eight, with nothing installed, using Claude Code on the web
(which also runs from the Claude phone app). The catch is a good one: in
that mode the agent pushes to its own branch, and the student merges it.
That merge can be the lesson: *you merge, it ships.*

**The first win:** within about thirty minutes, the student's own
address opens on their phone, showing the app's name, the paragraph of
why they wrote, and one real item from a real source. The values come
first, and the app is theirs from the first minute.

The pathway, in ten steps: read what the course is and what it honestly
costs, sign up, get a welcome email with the first-hour checklist,
create a GitHub account, use the template and turn on Pages, connect an
agent, write the why and send the kickoff, merge and open it on the
phone, post the address in the cohort's discussion, and join the setup
session if stuck.

The template needs four small changes before launch: a dev container so
a Codespace opens ready, an `AGENTS.md` that every agent reads (with
`CLAUDE.md` importing it), a link so other agents find the skills, and
an Android build that skips web-only pushes. Right now a student's first
web change starts an Android build.

## 5. Lanes for people without a $100 plan

Claude's free plan does not include Claude Code. Claude Pro does, at $20
a month, including the web and phone versions. Copilot Pro, at $10, can
use Claude or Gemini if the student picks the model by hand, and it
reads the template's instructions and skills unchanged. Google's free
coding tool is now Antigravity, which is closed source, has unpublished
limits, and offers an OpenAI model in its list.

So, three lanes:

| Lane | Tools | Finishes fully |
|---|---|---|
| $0 | GitHub plus a free agent tier | Stages 00 to 02 and 08. Parts of 03 to 07, on the web and Android. |
| About $20 | Claude Pro, cloud sessions | Stages 00 to 03 and 07 to 08, working in rounds rather than long loops. |
| Mine | Claude Max | Everything, as written. |

The lessons change in small ways: say "your agent" and "the
instructions file", keep my prompts word for word, add an "in other
agents" note only where the mechanism differs, teach "one round per
usage window" for the capped lanes, and put a line at the top of each
stage saying which lanes can finish it. Store accounts ($99 a year for
Apple, $25 once for Google) are a separate cost in every lane.

## 7. Data, users and cohorts

**Supabase with sign-in through GitHub** is the recommendation. Every
student needs a GitHub account anyway, so GitHub sign-in costs nothing
and needs no email sender (the free email limits on Supabase and Firebase
are a few messages an hour or a day). The static site talks to it
directly, row-level security does the access rules, and the data is
plain Postgres, so it can always move. One database holds every cohort,
with a cohort on every row. The cost: free projects pause after a week
without traffic, and an account gets two active free projects.

The fallback is Cloudflare's free database with one small Worker, which
never pauses but means writing the sign-in and access rules by hand. If
Cloudflare is out, Neon is the closest alternative. Before committing,
a one-page prototype should prove GitHub sign-in works from a purely
static page.

## 8. Self-paced, live, and challenge-based

The model that fits is cohort-paced weeks with a self-paced floor:

- **The challenge** for each stage is its "Be ready to..." line.
- **The bar** is its "When you are ready to move on" paragraph, turned
  into a short checklist marked *met* or *not yet*. Revising is free.
- **The evidence** is what the method already produces: a live link, a
  store link, the screenshot that proved a fix, a link into the repo.
- **The verification** is showing it, live, to two people. No time
  tracking and no plagiarism checks. The question is never "did you
  write the code". It is whether you decided, judged and used it.
- **Review:** peers every week, and me at stages 05 and 08 and after
  anyone's second *not yet*.

The closest model I found is Mozilla Open Leaders, where everyone worked
on their own real project. From Recurse Center: reach out when someone
goes quiet, make leaving guilt-free, and never graduate anyone.

## 9. A portable credential

Open Badges 3.0 is final and built on W3C Verifiable Credentials. Free
issuing through Canvas Credentials ended in December 2025, and the
hosted services now charge. We can issue our own at $0: humanshaped.org
hosts its identity as an issuer, and I sign each credential on my Mac or
in a GitHub Action. Each student gets a file, a public page and a link
that checks it. The credential points to the student's own work (their
live app, their store link, their bring-backs), which they keep control
of.

Not yet verified: whether the main badge wallets accept a credential
from an issuer that is not formally certified. We should issue one real
credential to ourselves and test it in each wallet before the first
cohort ends. A paid issuer (about €220 a year) is the fallback. The
research on rewards says one more thing clearly: badges for taking part
lower motivation. So, one credential at the end, for the whole body of
work, and nothing along the way.

## 11. The showcase

The four apps, in their own words, from their live sites and store
listings:

| App | In its own words | Where it runs |
|---|---|---|
| Archive Watch | "A cinematheque for the Internet Archive." | App Store (iPhone, iPad, Mac, Apple TV, Vision Pro), Google Play, Amazon, Roku, web |
| Tidbits Trivia | "every question is a door to learn more" | App Store (including iMessage), Google Play, web |
| Bsky Dreams | "Your Personal Bluesky Experience" | App Store, web |
| BOBA Playbook | "The definitive companion app for the Bo Jackson Battle Arena trading card game." | Web, Google Play |

Each entry should say what the app gave the template and name one value
with the decision it changed. Students write their own entries later,
opt in, and choose what to show. Two cautions: BOBA's website still
links to an App Store placeholder, and I could not confirm a public
Windows Tidbits or an iOS BOBA.

## 12. How it is taught

The course already lines up with the strongest research: one real
project covers nearly all of the project-based learning standard,
reading a real prompt together is a worked example, and "what stays
yours" matches what the 2024 to 2026 studies say about learning with AI.
Those studies agree on one thing: the loss comes from handing over the
understanding while feeling like you learned it, and beginners lose the
most. People who ask the agent *why* keep their learning.

The changes worth making:

- **Week 0** for setup and belonging, before stage 00.
- **Try, then compare.** In each session, everyone writes the prompt
  they would send for a real situation, then sees mine. I model in
  weeks 1 to 3, coach in 4 to 7, and students lead in 8 to 10.
- **Stable trios** for the whole term, so absence does not leave anyone
  alone.
- **A short feedback shape** for every bring-back: where are you going,
  how is it going, what is next.
- **Explain it back,** two minutes a week with the agent closed,
  explaining decisions rather than code.
- **One sentence each week** for each of the three ways of learning.
- **Prove it from week 2,** not week 6.
- **Three app ideas** before choosing one.
- **Written norms** for cameras and breaks. Cameras are welcome, never
  required.
- **A public showcase in week 10,** and one lesson from each cohort sent
  back into the template.

The notes include a 75-minute session (with 60 and 90-minute versions)
and a weekly rhythm: about 75 minutes live plus three to five hours on
your own. We should say that number on the sign-up page.

## 13. Questions to answer before launch

Updated after the vision. Marked **Ben** where only you can decide, and
**Claude** where I can answer or build it once the decisions above it
are made. **Blocks** means it needs an answer before the first sign-up.

**Already answered by the vision:** the course is free; cohorts run
about five weeks with a weekly live session; sign-in is GitHub, so a
GitHub account is required; conversation uses GitHub's discussion
features, shown on the site; the agents are Claude or Gemini on a
desktop computer; Copilot is out; anyone can teach.

**The first cohort**

1. **Ben, blocks.** When does cohort 1 start, how many people, and on
   which day, time and time zone? How long is each session (60, 75 or 90
   minutes)?
2. **Ben, blocks.** Who is it for? If teachers bring students under 18,
   Claude, Apple and Google set minimum ages, and Meet add-ons are
   blocked for minors on Education accounts.
3. **Ben.** Trios or pairs, kept for the whole cohort?
4. **Ben.** Is "explain it back" about decisions rather than code?
5. **Ben.** A light check at the start, middle and end, so the first
   cohort produces evidence?

**Agents and cost**

6. **Ben, blocks.** What does "a Claude or Gemini" mean for a student who
   pays nothing? Claude's free plan has no Claude Code, and Gemini CLI's
   free tier ended in June. The realistic floor is Claude Pro or Google's
   paid AI plan, about $20 a month, or Google's closed Antigravity tool
   with unpublished free limits. Do we say "about $20 for five weeks"
   plainly, or build a $0 lane on Antigravity labeled "may change"?
7. **Claude.** Make the template agent-neutral: an `AGENTS.md` both
   agents read, the skills where Antigravity finds them, and an "in other
   agents" note where the mechanism differs.

**The hub**

8. **Ben, blocks.** Where do cohort conversations live: a `humanshaped`
   GitHub organization with Discussions (one category or repository per
   cohort), shown on the site through giscus? Public or private by
   default?
9. **Ben, blocks.** The code of conduct: adapt Contributor Covenant plus
   Recurse Center's social rules? Who receives reports, and who besides
   you?
10. **Ben.** Who can list an app in the public directory: anyone with a
    GitHub account, or only people in a cohort at first? Who moderates?
11. **Ben.** What does it take to declare software human-shaped? A public
    answer to the three questions of the idea, with the app's link? Can
    a declaration be withdrawn?
12. **Ben.** Who can become a teacher: anyone who asks, or people you
    approve first? Each teacher needs their own Meet host account.
13. **Ben.** What kinds of events should the toolkit help people start:
    meetups, build days, a unit in a classroom, a reading group?
14. **Ben.** What can classmates see by default? The draft: the roster
    and shared work visible, private progress.
15. **Ben.** Alumni: can they come back to sessions and review
    newcomers' work?

**Accounts, data and privacy**

16. **Ben, blocks.** Which account hosts your Meet sessions? Is
    learningischange.com on Google Workspace, and which edition? Is there
    a nonprofit that could qualify for nonprofit pricing?
17. **Ben, blocks.** Data region, how long student data is kept after a
    cohort, and whether "delete my data" is a button or an email.
18. **Ben.** How many free Supabase projects do you already run? The limit
    is two active.
19. **Ben.** Cloudflare or Neon as the fallback database?
20. **Ben.** Recordings: none, absent students only, or everyone? For how
    long?
21. **Claude, blocks.** Prove GitHub sign-in to Supabase works from a
    static page, with a one-page prototype.
22. **Claude, blocks.** Write the sign-up form and its privacy note once
    16 and 17 are answered.

**Publishing and design**

23. **Ben.** Is the web plus free Android sharing enough for cohort 1,
    with store publishing as each student's own choice and cost?
24. **Ben.** Pursue publishing under a Human Shaped organization account
    later? That needs a legal entity, a license from each student, and
    legal advice.
25. **Claude.** Add the "make it look like itself" step to the template
    (stage 03 or a new short stage), with a skill that proposes three
    directions from the app's why.
26. **Ben.** May the site's own design language be explored as three
    directions for you to choose from, the way the students will?

**The site and the template**

27. **Ben, blocks.** Should this research be public? Everything on the
    `site` branch is published at humanshaped.org.
28. **Ben.** Does the site carry its own designed edition of each stage,
    or present the template's stage pages? Two copies drift unless the
    agent regenerates the site's pages from the template.
29. **Ben.** Mermaid diagrams or drawn ones? Willing to record a few short
    captioned sessions?
30. **Ben.** May we publish Archive Watch's platform dates from its git
    history? Should Bsky Dreams appear as current? Do Tidbits on Windows
    and BOBA on iOS exist publicly?
31. **Ben.** Make the template's launch changes (a dev container, the
    agent-neutral instructions, Android builds that skip web-only
    pushes)?
32. **Ben.** Teach the student's merge as the moment it ships?
33. **Claude.** Write the review skill for AI feedback in the template,
    and the read-only context endpoint on the hub.

**The credential**

34. **Ben.** Issue it after cohort 1, for a body of work shown to people?
    Does it need a store listing, or is "installed on someone else's
    device" enough?
35. **Claude.** Issue one test credential and check it in each wallet.

## What I would build first

The vision makes the hub bigger than a course site, and two weeks is
still the target for cohort 1. So, the first two weeks build only what
cohort 1 needs, in the hub's own shape, and everything after grows from
it.

1. **The site's design language,** as three directions for you to choose
   from, then the fixes to the current page.
2. **Sign-in with GitHub and enrollment,** with the privacy note,
   proven first by the one-page prototype.
3. **The template's launch changes,** including the agent-neutral
   instructions and the review skill, tested on a fresh copy with Claude
   and with Gemini.
4. **The setup week's pages,** with screenshots and alt text, ending at
   the first win.
5. **The cohort page and the app pages,** with each app's conversation
   from GitHub shown on the site.
6. **The session page** for week 1, pulling in the cohort's apps.
7. **The showcase,** starting with the four apps.

After cohort 1 starts: the public directory, the toolkit for declaring
software human-shaped and starting events, teacher sign-up, the
read-only context endpoint for agents, the credential, and the Meet
add-on.
