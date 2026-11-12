---
name: live-learning-sessions
description: "Use when building or running live class sessions on a shared backend (cohorts, workshops, a classroom in a video call): a run of show everyone follows, questions answered live, guests who join by link, breakout rooms, re-running a session for someone who missed it, replaying a session beside its recording, private feedback, and writing the session itself (slides, questions, exchanges, titles). Carries the data model (one show-state row per session, parts as validated rows, speaker notes split server-side), the realtime rule (broadcast nudge first, database change events as fallback), the guest rule (anyone with the link takes part, and every feature must work for guests), the data-loss traps (cascades that delete a room's work, a test that moves a live class), the values (never a score, a ranking, or a comparison; leaders see all, learners their own; say only what the system knows), and the content rules a real teacher enforced. Triggers on cohort, class session, run of show, live question, poll, breakout, rerun, makeup session, replay, session recording, speaker notes, feedback, exchange, session title, learner, leader, guest."
---

# Live learning sessions

How to build a live class that runs inside a video call and keeps what
happened, distilled from a free cohort platform (humanshaped.org) whose
sessions run in a Google Meet add-on on Supabase, GitHub, and Drive. The
platform rules are here; the Meet frame rules are in `google-meet-addon`.

## Values that decide the design

- **Never a score, a ranking, or a comparison of learners.** Leaders see
  everyone's answers and work; each learner sees their own. A leader's own
  share of the talking is shown to that leader alone, as a mirror.
- **Say only what the system knows.** The site cannot see a call, so it never
  says someone was absent. Facts about learners are positive facts with names.
  A number on a page is a claim; check the database before telling anyone.
- **Feedback is private to the learner** and stays a draft until the leader
  shares it.
- **Consent is said aloud.** Announcing the recording is the consent for what
  the session keeps; change public promises (privacy page, store listing)
  before you collect anything new.
- **Learners never change the room directly.** They ask (a message, a link,
  breakouts); the leader's panel shows Do it and Not now.

## The data model

- **Parts are rows** (`scenes`: kind, title, minutes, config, slides, goal),
  so a cohort's week is edited per cohort while the course stays the template.
  Validate `config` per kind in a database CHECK function. Kinds that earned
  their place: talk, question, presenter (showing work), design (a shared
  board), rooms (breakouts), reflection (writing), break.
- **One show-state row per session**: current part, slide, what is pinned on
  the stage, the part's clock start. Leaders write it (row-level security);
  everyone reads it. A trigger clamps the clock start to the database's own
  time, within a window (it may sit up to an hour ahead, so "+30 seconds" can
  give a part more than its planned minutes).
- **Speaker notes never reach learners.** Keep the deck's source (with `>`
  note lines) in a leaders-only table and write the stripped slides to the
  public row in one server function.
- **Everything a session does is an event row** (stage moves, reactions,
  stances) with a timestamp, so it can be replayed. Times are accurate to
  seconds, not frames.

## Realtime: a nudge first, the database second

Database change events (Supabase `postgres_changes`) pass through the write
log and a row-level-security check per subscriber, and measured 2 to 5
seconds from a leader's move to a learner's stage. After every move, the
leader's client sends a **broadcast nudge** on the call's channel and each
learner reloads the show at once (under 2 seconds). Keep the change events,
and a slow poll, as fallbacks. Supabase free tier allows 200 realtime
connections, and overage restricts the whole organization, so public rooms
belong on a separate service (a Cloudflare Durable Object held 1,000 sockets).

## Guests: the link is the membership

Whoever has the call's link takes part. Someone not signed in as a member
joins as a **guest** (an anonymous or unrelated account recorded per cohort),
and a leader can **tie** a guest to a member so their answers become that
member's.

Three features broke for guests in one test, each because it read only the
members' table: saving an app's address, being featured, and showing in the
app lists. **When you add a feature, test it as a guest.** Guests read what
members read, never leaders' notes or other people's answers.

## Questions in the room

- A part's question **asks itself** when the part begins, on every stage and
  in every panel. People answer on whichever they are looking at.
- Counts show **without names**. A leader reads written answers with **Hide
  names** on, and can put one answer on the stage without its author until
  they choose to show the name.
- A question can be **asked again** later and shown beside the first time. If
  the first time was skipped, simply ask it.
- A learner's own panel says when their answer is in, and that they can change
  it until the question closes.

## Breakout rooms without the video platform's breakouts

Meet gives add-ons no breakouts. A **pool of your own meeting links**, leased
per launch, serves as rooms; rooms are rows in your groups table.

- A room's panel must open on the session **the call is running**, not the
  schedule's, and its "come back" card must link to **that call**.
- **Never delete a room when breakouts end.** Room work (a shared workbook)
  hangs off the room row, and an `on delete cascade` erased every room's
  answers on End breakouts, and again on every relaunch. Mark the room ended
  (a timestamp, its link cleared so it never matches a call) and keep its
  people and work for the debrief.
- Keep "same rooms as last time" and named groups the cohort reuses.

## Running a session again

A leader can run any session in any call for someone who missed it (a
`call_runs` row maps a call code to a session for a few hours). Everyone in
that call follows; the work saves to that session beside the first run. Never
put a makeup's recording in place of the first run's.

## Replay beside the recording

- Store when the recording started; the leader lines up one known moment
  (a question's time against the second the video shows it) once. Clock-time
  events then map to video seconds.
- Rows: part changes (on scene changes only), questions, answers, reactions
  grouped per half minute, turns to talk, work shown, the viewer's own marks.
  Each row plays the video from that second. A learner sees only their own.
- **Mark this moment**: one press keeps the time, private to whoever made it.

## Test data and live classes

- A shared show state means **a test run with a live session's id moves the
  live class.** Test with another session, then clear its show state.
- Label test data, delete it after, and count rows per table to prove it.
- Date test sessions in the past, or the calendar job invites real people.
- Run row-level-security checks in an embedded Postgres (`pgserver`) on every
  migration, including checks that **work survives** (a room's answers after
  End breakouts). A check is not a check until it has failed.

## Writing the session

What a real teacher enforced, session after session:

- **The stage is a designed presentation, not instructions.** A headline that
  states the one point (assertion, not topic), at most four short lines; what
  you will say goes in the speaker notes.
- **One ask per step.** Never two questions at once, never a two-part
  question. Ask plainly ("What questions do you still have?").
- **Prompt stems** for anything learners write to an agent ("This is done
  when ___", "It must never ___", "Show me ___").
- **Build each session from what each person said they would do** at the end
  of the last one (read the transcript), and show those commitments back.
- **Session titles are a few bold words** naming what the session does
  ("The Next Move"). No formula reused week after week, and no sentence.
- **Exchanges between sessions ask for reflection on the process**, never a
  demo: "What did you change your mind about this week?" Never ask for
  something people cannot easily share, like a screen recording. A question
  must be answerable by anyone, wherever their work stands.
- Fill-in blanks in markdown slides: two `___` on one line render as bold
  text. Escape runs of underscores before rendering.

## See also

- `google-meet-addon` for the frames, activities, and testing in Meet.
- `github-and-google-learning-infrastructure` for repositories, Drive,
  Calendar, and notifications.
- `learner-experience-design` for the signed-in pages around the session.
- `zero-cost-hosted-backend` for the database and worker split.
