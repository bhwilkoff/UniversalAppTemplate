# The journeys through a cohort

**Status: binding beside PAGES.md**, with Ben's decisions of October 23
recorded at the end: every page, button, email,
and calendar invitation exists because a step here needs it, and a step
that has no home on the site is a gap to fill before anything else moves.

Ben, October 23, 2026, after opening his first real cohort (Minerva):
"We need to stop moving things around and plot out the user experience for
the Leader and the Learner from beginning to end and make sure that each
activity can be accomplished in a way that makes sense for their user
journey." And: "Sessions, the Live Sessions, and the Call ... are all one
thing and they need a consistent interface."

This page was written from an audit of the code and the live data on
October 23, not from what earlier notes say the site does. Where the two
disagree, the audit wins, and the gap is written down.

## What the audit found

These are the things that do not hold together today, in the order a
leader meets them.

1. **"Choose a host account" is not a choice.** Every call is hosted by
   meet@humanshaped.org, and the step only links to a line in the guide
   saying so. It ticks itself the moment any week has a Meet link, so it
   flipped at the same time as "Ask for Meet links" (`teach-lib.js:189`).
2. **The calendar event was made for no one.** The Meet script did make a
   Google Calendar event, but one recurring event on meet@'s own calendar,
   with one Meet link for all five weeks. Its guests come only from the
   optional "Email for calendar invitations" field in Your work, and
   nobody, Ben included, has filled it in, so the event has no guests.
   People who join later are added only if the leader asks for Meet links
   again.
3. **Nobody who answered the poll has been told anything.** Making the
   cohort marked Aibiike, Fakiya, Sattik, and Amira as invited, but the
   site sends no email. They would see the invitation only by reopening
   the poll link in the same browser. The only way to reach them is "Write
   to them", which opens Ben's own mail with a bare link and no words.
   None of the four has joined.
4. **A session lives in four places.** The Sessions tab lists weeks with
   "Live session" and "Join the call"; This week has "The Meet link" and
   "The session page"; /live/ is a separate page with the run of show,
   checks, rooms, and queue; and the Meet add-on is a fifth copy of /live/.
   "The call" is only ever the Meet link, but it is named as if it were a
   place of its own.
5. **The run of show is edited in two places and run in two places.** It is
   prepared under each week in the Sessions tab, and it can also be edited
   on /live/ and in the add-on during the session. The add-on works only
   for meet@humanshaped.org (a test install), so Ben, joining as himself,
   cannot open it at all.
6. **The session content was never taught and was not written for this
   cohort.** It comes from the template's `docs/teaching/runs-of-show.json`,
   which COURSE.md calls untaught and every guide marks "Written by Claude,
   awaiting Ben's review." For Minerva in particular:
   - The cohort meets for 60 minutes, but every week was seeded with a
     75-minute run of show.
   - There is no prep session, because "Make the weekly sessions" starts at
     week 1, yet week 1 opens with "One line in the chat from your noticing
     log", a log that only the prep session asks people to start.
   - Week 1 has fourteen scenes, several of three minutes, which reads as a
     run of disconnected prompts rather than one piece of work.
   - Several scenes lean on Archive Watch stories ("Two notes for one
     film", "Forty-one versions shipped to nobody") without the context
     that would make them about the learner's own app.
   - Groups are trios, and Minerva has four learners in two cities.
7. **Conversation and Asks look like the same thing.** Both are a list of
   posts on GitHub with a button to add one, and nothing on screen says why
   an ask is not a conversation. The board's purpose, which Ben asked to be
   clear, is not clear.
8. **Small breaks along the way.** The poll's "This poll has closed" notice
   never shows; a learner who has just joined sees their cohort under the
   heading "Leaving a cohort"; and "Rehearse on the live page" counts only
   in the browser that opened it.

## The principles every step is held to

From this repository's DECISIONS.md and PAGES.md, and from the template's
`learner-experience-design` and `learning-orientation-design` skills:

- **One thing, one page, one name.** A session is one thing, with one page,
  whether it is next week, on now, or finished.
- **The site does the mechanical work; the person keeps the meaningful
  work.** Calendar events, Meet links, invitations, repository access, and
  reminders are mechanical, so nobody should have to ask for them. Choosing
  a problem, judging whether an app is ready, and giving feedback are the
  learning, so the site makes room for them and never does them.
- **Order by what needs the person now.** Now and next, then what is
  waiting for them, then their things.
- **Every activity in a session points at the learner's own app** and at
  the week's "Be ready to..." from the stage they are on. An activity that
  could be run in any class about anything does not belong.
- **Interface, not explanation.** Where two things could be confused, the
  fix is a clearer thing, not a caption.

## The leader's journey

Each step names who acts, where it happens, and what the site does on its
own. **Today** says what exists; **Change** says what this proposal does.

### L1. Become a leader

Ask to lead at /teach/, and an approver says yes. **Today:** works.

### L2. Find a time

Make a time poll at /teach/times/new/, send its link, and watch answers
arrive. Nobody needs an account to answer. **Today:** works.

### L3. Make the cohort and invite the people who answered

On the poll's page, choose the weekly time and who to invite, and press
"Make the cohort". **Change:**

- The moment the cohort is made, meet@humanshaped.org emails each invited
  person who left an address: who the leader is, when it meets on their
  own clock, and one button, "Join the cohort", that signs them in with
  GitHub and joins them in one pass. The leader sees each person's state
  in People: invited, joined, or no address.
- The email the person gave on the poll becomes their calendar address
  when they join, so they are never asked for it twice.
- The leader can still write to them from their own mail, as now.

### L4. The cohort sets itself up

Today this is ten checklist steps, several of which are the leader asking
the site to do something mechanical. **Change:** making the cohort does
these on its own, and the checklist keeps only the things a leader decides.

Done by the site, shown as a status, never as a step:

- the sessions, a prep session and the weekly ones, each with the course
  content for its week, cut to the cohort's session length;
- one Google Calendar event per session on meet@'s calendar, each with its
  own Meet link, that week's title, and a link to that session's page,
  with every leader and learner as a guest;
- the GitHub repository, its team, and each person's access.

Decided by the leader, as the whole checklist:

1. Read each session before it happens, and change what you want (L5).
2. Make the groups, once people have joined.
3. Open for joining, if the cohort was made as a draft.

"Choose a host account" and "Ask for Meet links" disappear. "Rehearse"
becomes opening the first session's page, which a leader does anyway.

### L5. Prepare each session

Open the session from Sessions. Its page shows the plan for that session:
the parts, their minutes, what learners should bring, and the leader's
notes. The leader edits it right there. **Change:** this is the session's
own page (S1 below), not a fold under a week in a list.

### L6. Run the session

Open the call from the calendar event or the session page, then open the
Human Shaped add-on in Meet's side panel. The add-on shows the same
session: where we are, the clock, the checks, the rooms, and the queue of
work to show. Changes made on the fly are made there, in Meet, and they
are what the session page shows afterward. **Change:** the add-on becomes
the one place a session is run, and the session page says so with a
"Runs in Google Meet" status rather than offering a second copy. Until the
add-on can be installed by any leader (Decision 4), the session page keeps
a "Run it here" fallback that opens the same controls.

### L7. After the session

The session's page now shows the recording, everyone's answers to the
checks, and who asked for a follow-up. The leader reads the checks, writes
the two sentences that open next week, and writes to anyone who missed.
**Today:** these exist, spread between Sessions and This week. **Change:**
they live on the session's page; This week counts them and links there.

### L8. Between sessions

Answer the conversation, give feedback on what people bring back, and
look at the board (Decision 3). **Today:** works, in Conversation, Your
work, and Asks.

### L9. Finish

The showing in week 5, credentials recorded, and the cohort marked
finished. **Change:** marking it finished also archives its repository and
ends its calendar series.

## The learner's journey

### J1. Answer the poll

Open the link, mark the times that work, and leave a name and an email.
**Today:** works, with no account.

### J2. Get invited, and join

An email from Human Shaped arrives (L3) with one button. It leads through
GitHub sign-in, joins the cohort, and starts the GitHub organization
invitation. **Today:** no email; joining is three pages and a separate
acceptance on GitHub. **Change:** one email and one pass. The GitHub
invitation still has to be accepted on GitHub, because GitHub requires it,
so the cohort's home shows that as the one thing waiting, with a button
that opens it.

### J3. The sessions appear on their calendar

Each session arrives as its own Google Calendar invitation, at the
address they gave, with the Meet link and a link to its page. **Today:**
nothing arrives. **Change:** sent when they join, and to a different
address if they change it in Your work.

### J4. Get set up

The prep session's page says what to have done before it: GitHub, the
template copied, an agent connected, and the app's address open on their
phone, each linking to the step in /path/setup/. **Today:** these exist as
a "Getting ready" card, and there is no prep session.

### J5. Each week

The cohort's home leads with the next session. Before it, the session's
page says what to bring back (the stage's "Be ready to..."). During it,
"Join the call" opens Meet, and if they open the add-on they see the same
session; if they do not, they lose nothing but the side panel, because
everything spoken happens in Meet. After it, the same page holds the
recording, what they answered, and the first prompt of the coming stage.

### J6. Between sessions

Build with their agent, following the stage on /path/; ask the cohort
something in Conversation; ask someone to try their app (Decision 3); and
bring something back for feedback in Your work.

### J7. Finish

Show the app in week 5, receive the credential, and keep everything:
their app, their repository, their videos, and the cohort repository's
history, which stays readable.

## The session, as one thing

**S1. One session, one page:** `/cohort/?c=<cohort>&s=<number>`.

- **Before:** the title, the time on your clock, "Join the call" (the Meet
  link), what to bring, and the plan. Leaders edit the plan here.
- **During:** the same page, now marked live, follows the add-on: the part
  we are on, the checks to answer, your group's room.
- **After:** the recording, the checks, and what is next.

The Sessions section lists the sessions, and each row opens its page.
This week shows the next session's row. /live/ forwards to the session on
now, or the next one. The word "call" means only the Meet link, as a
button, never a page.

## The session content: what has to change

A session is the place where last week's work is shown and next week's
work is started; everything in between should help someone do the next
stage of their own app. The proposed rule for every week:

1. **Bring back** (the largest part): each person shows the stage's "Be
   ready to..." on a device to their group, explains one decision with the
   agent closed, and hears the three questions.
2. **One thing that unblocks the next stage**, taught with a real example
   and then tried on the learner's own app in the same session.
3. **Start**: everyone sends the first prompt of the next stage before
   leaving.
4. **Check**: the week's question, and what is still muddy.

Held to that rule, I would rewrite `runs-of-show.json` in the template
(the one source the site seeds from), week by week, with Ben reading each
before the next:

- add the prep session back, and seed it;
- cut each week to four to six parts, with nothing under five minutes
  except the check;
- make a 60-minute version for cohorts that meet for an hour;
- take every example from the stage's own text, and introduce any Archive
  Watch story with what it shows about the learner's app;
- let groups be two, three, or four, so four people in two cities work.

## Ben's decisions, October 23, 2026

Chosen from multiple-choice options:

1. **Calendar address: the sign-in email.** Each person is invited at the
   email they gave on the poll or that GitHub shares at sign-in. They can
   change it, or turn invitations off, in Your work.
2. **Invitation: an email from meet@.** Making a cohort from a poll emails
   each invited person who left an address, with one "Join the cohort"
   button. People shows who has joined.
3. **The board: "Try my app".** Asks becomes a board with one purpose:
   asking for your app to be held on a device you do not have, someone
   taking it, and marking it done with what they saw.
4. **The add-on: publish it, with a fallback.** Claude prepares the Google
   Workspace Marketplace listing and Ben does the steps in Google Cloud.
   Until Google approves it, the session page has a "Run it here" panel.
5. **Minerva: the course, starting a week later.** October 28 becomes the
   prep session and week 1 moves to November 4, using the standard
   app-building course, cut to 60 minutes, with groups that fit four.
6. **The course content: rewritten all at once, then reviewed.** Prep
   through week 5 in one pass, so Ben can see the whole arc.
7. **Each session is its own calendar event with its own Meet link.** Not
   one recurring event with one link for every week. Ben: "That is how
   humans work with calendars." Each event carries that session's title
   (prep, then each week's question), the time on the guest's own clock,
   and a link to that session's page. Moving, cancelling, or changing one
   session touches only its event. The Meet add-on finds the session from
   the meeting's own code, so each link opens the exact session. A group's
   room stays one link for the whole cohort, reached from the session
   page, because it belongs to the group, not to a session (see 8).
8. **Groups and rooms wait until cohorts are bigger.** Meet's breakout
   rooms are not on Ben's Workspace edition, so they would have to be
   built in the add-on. Ben: "Breakouts only would be relevant for groups
   of 8 learners or more, so we don't have to build this out just yet."
   Below eight learners, the bring-back happens with everyone in the one
   call, and the content says so. Research on building them in the add-on
   is in research/notes/meet-breakout-rooms-notes.md. Launch without them.
9. **Finishing asks.** Marking a cohort finished asks the leader whether
   to archive its repository now or leave it open; sessions not yet held
   come off the calendar either way.
10. **Late joiners get the remaining sessions.** Someone who joins after
    the events exist is added as a guest to every session still to come,
    within the hour.

## The session page prepares; the add-on runs (Ben, October 23, 2026)

Ben: "The session page should functionally only be to prep the session.
All of the other work that a Leader should be doing in the session
should be done via the Google Meet add-on. There shouldn't have to be two
different pages open just to run the session (the google meet video call
and the humanshaped.org session page). The session page should show
content to the learners and should be prep for the leader, but once the
session is going, the session page on humanshaped.org should serve no
further purpose for the leader (other than as reference)."

This replaces decision 4's "Run it here" fallback and S1's "During": the
session page never carries live controls. Leaders prepare there; they run
the session only in the add-on, inside the Meet call.

## The walk-through audit, October 23, 2026

Ben: "I still see lots of things that either don't make sense or don't
work on the session pages, the add-on, or within the platform itself. It
needs to be cohesive, substantive, and intuitive." These are what a walk
through the Minerva cohort, signed in as Ben, found. Each is fixed or
not; nothing here is "improved".

**The session page (S1) does not hold together.**
- [ ] Before a session, it shows the plan twice: the builder ("The plan",
  five buttons on every part) and the live controls ("Run of show", with
  a running clock, "Make this the current scene", "Stop the clock", and
  "Any time in the show" tools such as sending everyone to rooms in a
  cohort with no rooms).
- [ ] The words of each part, which are what a leader prepares and a
  learner reads, are nowhere in plain view; they hide behind Edit or a
  fold, and the live view shows a kind's generic line ("Someone explains,
  and everyone listens and reads along") instead.
- [ ] Icon buttons with no names.
- [ ] Kinds are the builder's jargon (Talk, Presenter, Design stage,
  Reflection) on pages learners read.
- [ ] "What to bring" (the stage's "Be ready to...") is not on the page.

**This week.**
- [ ] A stray "Setup done" line.
- [ ] The week card says "Not posted yet", with a bare "Publish" tag and
  "Stuck publishing" link nobody can read; a large empty card beside the
  next session.
- [ ] "A background for Meet" with no reason to be here.

**Sessions.**
- [ ] "Update the sessions" is the primary button and does not say what
  it does.
- [ ] The question bank is every week's questions in one list under the
  sessions; each belongs with its session.

**GitHub, everywhere.**
- [ ] Conversation, Asks, and Files ask to "Sign in again" in every new
  tab, because the GitHub token lives only in the tab that signed in.
- [x] The Human Shaped Hub app was private, so nobody outside the
  organization could sign in with GitHub (fixed by Ben, October 23).

**People and Settings.**
- [ ] Groups still say "Three learners each... each with its own Meet
  room", against decision 8.
- [ ] "Mark returning" and the role buttons say nothing about what they do.
- [ ] Settings still offers "Set up Meet by hand" and "Every group room
  now" from before each session had its own event; "Starts October 25"
  does not match the first session on October 28.

**The add-on.** Not yet seen inside Meet by Claude (it runs only for
meet@ in a Meet call). It draws the same run-of-show view as the session
page, so it carries the session page's problems.

## The first end-to-end test run, October 23, 2026

Ben: "You should be able to run a cohort from end to end via chrome and
the systems we set up." Claude ran "Claude test cohort (delete me)" on the
live site as Ben and two test learners (benhstest1, benhstest2, each in
their own signed-in Chrome profile): poll, answers, cohort, sessions,
repository, invitations, joining, GitHub's invitation, calendar events,
preparing, running the session in the panel, Try my app, Files,
Conversation, after the session, and finishing. Found and fixed on the
way, each live and tested:

- The time poll, the board, and app pages had not loaded since October
  21: a bare data-status hook crashed ui.js. A test now refuses it.
- Invitations went out before any session existed; they now wait for one.
- "I accepted it" after GitHub's invitation: the page now notices itself.
- Try my app hid a new request until a reload; tried cards said "you have it".
- Files had no Prep folder; making sessions did not refresh This week.
- The add-on page did not load ui.js, so a leader never saw a question's
  answers; a test now refuses any page that uses the kit without it.
- Learners had no way to ask to show their work in the panel.
- A running session showed two clocks and an open card form; jargon
  (wings, scene, week 0, the main room) remained in places.
- Finishing: the archive question (decision 9) was built, its first
  version asked GitHub for the wrong address and swallowed the error,
  and a finished cohort still offered to join, post, and add.

## The add-on in a real Meet call, October 23, 2026

meet@ led a test cohort's session from inside Meet, with a test learner
in the panel outside Meet. What it found, each fixed the same evening:

- The hourly calendar run gave the session a new call and wrote its link
  over the leader's, so the add-on in the call people were in no longer
  knew its session. A session now keeps the link it has.
- Start the clock did nothing before the session had begun, and before a
  leader started it the panel took the part the schedule named as
  current, showing parts never run as done.
- The main stage called a part Presenter and prefixed its prompt with
  "The audience:"; the kinds now carry the plain names in one place.
- Open the main stage sat at the bottom and stayed after it was used.
- Outside Meet, the learner's panel took the site's sidebar padding and
  ran off the right edge of a desktop window.
- The call-not-found message pointed to session forms that are gone.
- The welcome read the generic agenda's arrival line, not the plan's.
- Every Showing work prompt tells the presenter what to show, but the stage
  labeled it for the audience; it now reads "What to show".
- A long part pushed the stage's clock out of the frame.
- The presenter showed twice in the leader's panel, and with no one else
  waiting there was no way to thank them.
- A question part showed its question on the stage while learners' panels
  said none was open; arriving at the part now asks it, once.
- Notes on the stage spoke to the leader ("read by you") and pointed to a
  live page that no longer exists; the panel still said scene for part.

## The add-on checklist (the testing loop, from October 23, 2026)

Each tick takes the next unchecked item, tests it live (meet@ leading in
a real call, benhstest1 and benhstest2 as learners, a labeled test cohort
cleaned up afterward), fixes what is broken or hard to use, checks the
last tick's fixes once Meet has the new page, and marks the item here
with what it found.

- [ ] Learners inside Meet as participants (needs the add-on installed in
      the test profiles; until then, the panel outside Meet). Waits on Ben.
- [x] Two learners at once: the queue order, answers, who is here.
      Order, handoff, both answers, and 2 of 2 here all held. Fixed: a
      presenter read "shows You's work instead of this part"; the first in
      line repeated Bring up; the panel stayed parts away after a move; a
      stray "Asked." line.
- [x] On the board part, and the board on the stage. Confirmed in Meet:
      the stage's board opens signed in as the leader. Fixed: it had asked
      a signed-in leader to sign in; Open the design stage became Open the
      board; the board's head said week 0 and carried three downloads.
- [x] Writing part, Break part (large clock), the closing question. Fixed:
      a Writing part's stage dropped its words, then cut them mid-word
      (long words now shrink); arriving at the closing question left the
      earlier question open, so two were open at once; a break said back
      to the main room in a cohort without rooms.
- [x] Choice and scale questions: counts on the stage, without names.
      Asking, answering, and counts without names all held. Fixed, to
      confirm in Meet next tick: Show everyone the results left the stage
      on the bare choices (a question part's stage now shows its question
      and count); the counts pushed their total out of the frame; a scale
      ran off the stage; a finished break said Back in 3 minutes.
- [ ] Edit this part, live: the leader's stage previews, then everyone's
- [ ] Back a part, stop and restart the clock, time running out
- [ ] Who is here and the roster; reactions; Agree, Not sure, Disagree
- [ ] The stage I am on; A card for everyone; recording
- [ ] The welcome button while the session runs
- [ ] A second leader in the same call
- [ ] Closing and reopening the panel mid-session
- [ ] Past the session's end, and what learners see afterward
- [ ] The panel outside Meet at phone width and in light mode
- [ ] The stage with long titles and many choices

## Order of work

1. **Done, October 23.** Each session has its own page
   (`/session/?c=&s=`), and Sessions, This week, and `/live/` point at it.
   The checklist keeps only what a leader decides.
2. **Done, October 23, and seen working.** Each session is its own
   calendar event with its own Meet link and every learner and leader as
   a guest. Minerva's six events reached Ben's calendar, and meet@ sent
   the four invitations from the poll.
3. **Done, October 23, awaiting Ben's review.** The course is rewritten
   in four parts, prep through week 5, at 75 minutes in groups and 60 in
   one call. Minerva's sessions hold the 60-minute plans.
4. **Next.** The "Try my app" board, and the poll page's closed notice.
5. **Then.** The Meet add-on's Workspace Marketplace listing.
