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
