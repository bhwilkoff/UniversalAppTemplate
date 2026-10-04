# The run of show: one way to prepare, run, and follow up a live class

*Written by Claude, awaiting Ben's review. October 4, 2026.*

Ben tested the Meet add-on in a real call on October 4 and asked for
something larger than a list of fixes (DECISIONS.md, "The live
classroom, after the first test call"): prepare the class ahead of time,
run it adaptably inside Meet with a teacher view and a student view,
follow up with each student afterwards, and use one metaphor that
works the same everywhere. This note is the research behind that, the
design, the changes to the data, and the order to build it in.

## 1. What Meet allows, read today

**Two surfaces, one page each.** An add-on has a side panel (the column
on the right of the call) and a main stage (the middle of the call),
and "the main stage is rendered by its own page in your add-on"
([Meet add-ons overview](https://developers.google.com/workspace/meet/add-ons/guides/overview)).
Google gives no pixel sizes for either, so the panel has to work at
about 320 to 360 pixels wide, which the October 4 test showed it did
not yet.

**Everyone runs their own copy.** "When a user joins the activity they
will load their own iframes with your add-on content"
([Collaborate using a Meet add-on](https://developers.google.com/workspace/meet/add-ons/guides/collaborate-in-the-add-on)).
So every participant who joins has their own side panel and their own
main stage, and anything shared between them has to come from our own
backend. Google's shared-state option, the Co-Doing API, "was only
available in limited preview, through an Early Access Program. This
program is now closed to new signups" (same page, and
`meet-addons-and-extensions-notes.md`). We already have the backend:
Supabase Realtime, which /live/, the rooms board, and /board/ use today.

**The panel talks to its own stage, and only its own.** The side panel
calls `notifyMainStage()` and the stage calls `notifySidePanel()`, with
messages under 1,000,000 characters, delivered "near instantaneous[ly]"
and attempted once; "frame-to-frame messages sent by a given participant
are only visible by that same participant"
([Frame-to-frame messaging](https://developers.google.com/workspace/meet/add-ons/guides/frame-to-frame-messaging);
[MeetSidePanelClient](https://developers.google.com/workspace/meet/add-ons/reference/websdk/addon_sdk.meetsidepanelclient)).
This is how the teacher's panel edits what the teacher's stage shows
before and while it shows it (Ben's point 1). What everyone else's stage
shows still travels through the hub.

**Starting, joining, and installing.** The teacher calls
`startActivity()`; people with the add-on "can join the activity," people
without it "are directed to install the add-on," and people on a device
it does not support "are informed that they can't join" (Collaborate
page). On phones, the Meet apps for Android and iPhone can install and
join add-on activities, but a non-host on a phone "won't be able to start
an add-on activity," and an add-on that does not support the device is
grayed out ([Use add-ons with Google Meet, iPhone and iPad](https://support.google.com/meet/answer/13961388?hl=en&co=GENIE.Platform%3DiOS);
[Android](https://workspaceupdates.googleblog.com/2024/06/google-meet-add-ons-available-on-android-devices.html)).
Whether ours runs in the phone apps is not verified.

**Who can install it.** From `tools/meet-addon/README.md`, "Who can use
it": the test install reaches only the account that pressed Install
(meet@); a private listing reaches only humanshaped.org accounts; a
public or unlisted listing reaches anyone, after Google's review; and
the choice is permanent once saved.

### The three questions, answered

**Can students on personal Gmail accounts use a student view of the
add-on before a public listing?** No. A private listing stops at our
domain, and the test install stops at meet@. Students would be
"directed to install" an add-on they are not allowed to install. The
honest interim has two parts:

- The student view is built once and shown in two places: inside the
  add-on's panel and stage, and at /live/ on any browser or phone. Until
  the listing is approved, students open /live/ beside the call (or on
  their phone), and it is the same view, not a separate page with its
  own ideas.
- The teacher presents the main stage to everyone by sharing it, as
  today, so students see the stage even when they cannot touch it.

The fastest path to students using it inside Meet is an **Unlisted**
listing (installable by link, out of search), submitted as soon as the
teacher view is solid, since Google's review "typically takes several
days" and we should budget weeks. What Ben supplies is listed in
section 6.

**Can the main stage host the board, collaboratively, for every
participant?** Yes, for everyone who has the add-on. Each participant's
stage frame loads /board/'s Excalidraw and joins the same private
Realtime channel it uses today, so every stage stays in step. The
sign-in question has a likely answer that the test should confirm: the
side panel and the main stage are both humanshaped.org frames inside
meet.google.com, so the browser keeps their storage in the same
partition, and the session the panel already gets (it signed in by
itself in the October 4 test) should be readable by the stage. If it is
not, the panel hands its session to its own stage with
`notifyMainStage()`, which stays inside one participant.

**Can people answer questions in the panel or on the stage instead of
/live/?** Yes. Both are our own pages, so an answer is a write to
`live_answers` from whichever frame the person is looking at, and the
tally appears on the stage when the teacher shows it. For students this
waits on the listing; until then the same answer box is on /live/.

## 2. One vocabulary

Each word means one thing, on the class page, in the teacher view, in
the student view, on the stage, and in the rooms.

| Word | What it means |
|---|---|
| **Class page** | Where a session is prepared before, and returned to after. For the teacher it is the class builder on /teach/; for students it is /cohort/. |
| **Run of show** | One session's plan: its scenes in order, each with its minutes. Prepared on the class page, run in Meet. |
| **Scene** | One step of the run of show, of one kind (below). There is always exactly one current scene. |
| **Cue** | Something the teacher does in the moment that everyone sees: next scene, send to rooms, call back, show the answers, start recording. Every cue is one button, in the same place, with the same look. |
| **Main stage** | The middle of the call. It shows the current scene, or whatever the teacher puts there instead. |
| **Presenter** | The person whose work is on the main stage or in a room's turn. |
| **Audience** | Everyone else in that moment, with one thing to do (a question to ask, a note to write). |
| **The wings** | Who is ready to present: the people who asked to show something, waiting their turn. |
| **Rehearsal rooms** | The trios' own calls, where each person presents to two partners before anything is shown to the whole class. A room has its own short run of show. |
| **Follow-up** | What the teacher writes to each student afterwards, built from what happened in the show. |

Teacher view and student view are the two sides of the add-on (and of
/live/): the same scenes, with the teacher's controls on one side and
the student's part on the other.

### Scene kinds

- **Talk:** the teacher explains; the stage shows a title and a few
  lines, edited in the panel (this replaces cards).
- **Presenter:** someone from the wings shows their work; the audience
  gets one prompt.
- **Question:** a question from the bank, answered in the student view,
  with the tally shown on the stage when the teacher cues it.
- **Design stage:** the shared board, shown on the main stage, from a template or
  blank.
- **Rehearsal rooms:** everyone goes to their room for a set time; the
  room runs its own scenes; a countdown brings them back.
- **Break** and **Reflection** (a closing question, usually the "still
  muddy" one).

COURSE.md's six parts become the default run of show for every session:
Arrive (talk), Show what you brought back (rehearsal rooms), One value at
work (presenter), Read one real prompt together (talk, then design stage),
Start (reflection), and Check for understanding (question). A teacher
reorders, edits, adds, or removes scenes from there.

### Where today's pieces go

| Today | Becomes |
|---|---|
| Now (part and timer) | The run of show itself: the current scene and its clock |
| Queue | The wings |
| Checks | Question scenes, from the question bank |
| Everyone (rooms, cards, on stage, recording) | Cues, inside the scene they belong to; the recording light stays one cue |
| Cards | Talk scenes, edited in the panel |
| On stage | Presenter |
| Board | The design stage: a scene kind whose board shows on the main stage |
| Rooms, its steps, "Next step" | Rehearsal rooms, whose steps become the room's own scenes (below) |
| Thread | Stays, as the place for links during the show; read again in the follow-up |
| Talk share | The teacher's own note after the show, unchanged and private |
| Part timers | Each scene's minutes, planned on the class page |
| /live/ | The class page's run view for rehearsing, and the student view for anyone without the add-on |

## 3. How a class goes

**Before, on the class page.** The teacher opens next week's session in
the class builder. It starts with the default run of show. They drag
scenes into order, set minutes, write the talk scenes' words, pick
questions from their bank (or write new ones there), choose a board
template, and say what each rehearsal room does. A "Preview the stage"
button shows each scene as the main stage will. The run of show copies
from last week with one button.

**During, in Meet.** The teacher opens the add-on. The teacher view is a
timeline: past scenes folded, the current scene open, the next one
below. The current scene shows its clock, its words (editable in place,
and the stage updates as they type), and its cues. "Next scene" moves
everyone on. Anything can be changed in the moment: a question's
wording, its options, a scene's minutes, the order of what is left. The
student view shows the current scene and the student's part in it: the
answer box for a question, the board on the stage, the prompt for the
audience, or "you are presenting."

**Rehearsal rooms, plainly.** The rooms already exist before class:
meet@'s script makes one Meet call per trio when the cohort is set up
(the "Ask meet@" button on /teach/), and each trio keeps its room all
five weeks. When the run of show reaches a rehearsal rooms scene, the
teacher presses one cue, "Send everyone to their rooms (25 minutes)."
Every student view shows their room's button and the clock. Inside the
room, the add-on's room view runs the room's own scenes: for a trio,
three turns, each turn the trio protocol's five short scenes (their
question, show it and one decision, one clarifying question, the three
questions, what comes next), with the presenter named, the audience's
job shown, a timer, the room's own board, and the prompt the teacher
wrote. Anyone in the room presses "next" when they are ready; the
teacher's timeline shows each room's place in one line and lights the
room that asked for the teacher. At two minutes left, every room view
says so; at zero, or when the teacher presses "Call everyone back,"
every view shows the main room's link. The "steps" that confused Ben are
now just scenes inside the room, named for what happens in them.

**After, on the class page.** The session closes into a follow-up page
for each student, built from the show: what they brought back, what
they presented, their answers (the muddy one first), their room's
notes, and the thread. The teacher writes each follow-up there (C7
already does most of this), and the student reads it on /cohort/ and
keeps it.

## 4. The data

New:

- `scenes`: id, cohort_id, session_id, position, kind (`talk`,
  `presenter`, `question`, `design`, `rooms`, `break`, `reflection`),
  title, minutes, body (what the stage shows), config jsonb (question
  id, board template, room scenes, audience prompt), created_by,
  updated_at. The cohort's teachers write; the cohort reads; agents read
  only; deleted with the session.
- `scene_notes`: the teacher's private notes for a scene, teachers only,
  because row-level security cannot hide one column from students.
- `show_state`: one row per session: current_scene_id, scene_started_at,
  stage (`scene`, `presenter`, `answers`, `board`, `blank`),
  presenter_id, rooms_until, recording, updated_by, updated_at. The
  teachers write it, the cohort reads it, and it is in Realtime. This is
  the one thing every stage and every view follows.
- `questions`: the bank: id, owner_id, cohort_id (null for the teacher's
  own library), kind (`choice`, `multi`, `short`, `scale`, `words`,
  `rank`), prompt, options jsonb, created_at. The owner and the cohort's
  teachers read and write.

Changed:

- `live_checks` gains question_id, kind, and options, so a question asked
  in the moment can be edited without changing the bank.
- `live_answers` gains `value jsonb` for multi-select, scale, and
  ranking; `choice` and `body` stay for the kinds that already use them.
- `live_room_state.step` indexes into the room's scenes instead of the
  fixed trio steps.
- `live_signals` keeps only what is not in `show_state` (the recording
  and talk lines), and is retired once nothing reads it.

Unchanged: `live_queue` (the wings), `boards`, `share_confirmations`,
`session_notes`, the session thread, follow-ups, notes, and every rule
that keeps teachers' notes and calendar emails from students. Everything
in the show is deleted when the cohort finishes, as today.

## 5. Milestones

Each is one to three days, ships on its own, and ends with a real call.

1. **R1. One view, two places.** Split the add-on into a teacher view
   and a student view from one set of components, also rendered by
   /live/, and fix the panel's width. *Test:* the same call as
   October 4, plus /live/ in a second browser as a student.
2. **R2. The class builder.** `scenes` and `scene_notes`; the run of
   show on /teach/ per session, starting from COURSE.md's six parts;
   reorder, edit, minutes, copy from last week, preview the stage.
3. **R3. Running the show.** `show_state`; the teacher view's timeline,
   next and back, edit in place, the stage following the current scene,
   and the panel editing the teacher's stage before anyone sees it.
4. **R4. The question bank.** `questions` and the new kinds; prepared on
   the class page, edited in the moment, answered in the student view,
   shown on the stage.
5. **R5. The design stage on the main stage.** Excalidraw in the stage frame
   for everyone in the activity, board templates, and each room's board.
6. **R6. Rehearsal rooms.** The rooms scene, the room view with its own
   scenes, roles, timer, prompt, board, and "ask the teacher," and one
   cue each to send and call back.
7. **R7. The wings and the presenter.** Who is ready, putting someone on
   stage, and the audience's prompt.
8. **R8. After the show.** The follow-up page built from the show.
9. **R9. The listing (in parallel, from now).** The Unlisted submission
   with Ben's materials, so students can use the student view inside
   Meet by the time R3 to R6 are done.

## 6. What waits on Ben

- **For the listing:** the legal name and mailing address for /terms/
  and /support/; whether meet@humanshaped.org is read, as the support
  address; a review of /privacy/, /terms/, and /support/; the consent
  screen moved to production for External users; the listing's icons
  (we can draw them from the arch, for him to choose), screenshots from
  the next test call, and descriptions (we draft); and the one-time,
  permanent choice of Unlisted or Public.
- **For testing:** a personal Gmail account to be the student in test
  calls.
- **For the words:** the vocabulary above, before it appears on any
  page. If "rehearsal rooms" or "the wings" does not sound like him,
  this is the moment to change them.

## Not verified

- That the stage frame can read the panel's sign-in without a handoff.
- That our add-on runs in the Meet apps on Android and iPhone.
- The panel's real width in Meet, and whether it changes with the window.
- Whether Unlisted is reviewed the same way as Public.
