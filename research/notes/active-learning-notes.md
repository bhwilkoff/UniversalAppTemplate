# Active learning in the Human Shaped classroom

October 5, 2026. Ben shared a chapter from his university, "The Active
Learning Forum" by Jonathan Katzman, Matt Regan, and Ari Bader-Natal
(chapter 15 of a book on Minerva's design), and asked what we can learn
from how the ALF was made and why, without copying it. Below: what the
chapter says, what we take from it, and how each of Ben's eight requests
for the Meet add-on (R10 to R17 in LOOP-PLAN.md) answers it.

## What the chapter says

- **The goal.** Bloom's "2 sigma problem": one-to-one tutoring beats
  lecture by two standard deviations, so how do you get close to that at
  scale? Active learning (peer instruction, team problems, structured
  activities) is the answer the evidence keeps giving. The ALF aimed to
  keep every student "actively engaged ... as close to 100 percent of the
  time as possible."
- **Three conditions.** Every student should feel they are sitting next
  to the professor; the technology should fade until it nearly
  disappears; and the class should not vanish when it ends, but be kept
  for feedback.
- **Six design principles.** Engage deeply, enhance focus, eliminate
  friction, promote collaboration, support interconnections, and be
  meaningful. And: "relatively few features but make them great," "show
  fewer elements whenever possible to reduce cognitive load."
- **No back row.** Everyone sees everyone, whoever speaks takes the
  stage, and the order of faces is shuffled so no one always sits in the
  same place.
- **Breakouts by a button,** each group with its task and its clock, the
  professor able to see what every group is doing and drop in, and the
  groups' work shown and critiqued by the class right after.
- **Polls in almost every class,** results shown quickly, and the same
  poll rerun after an activity so the people who changed their minds can
  be asked why (peer instruction).
- **Continuous voting.** Students flag agreement or disagreement while
  others debate, and the class can look back at where people diverged.
- **Decision support for the professor** must be up to the professor to
  take or leave, informative at a glance, and an overlay on the main
  view, never a second dashboard ("this required professors to watch two
  displays rather than one"). Their example is talk time: one key tints
  every thumbnail red, yellow, or green by how much each person has
  spoken, so the quiet ones get asked.
- **The timeline:** the lesson plan as steps with times, advanced by a
  key, turning orange and red when a step runs long.
- **Getting the interface out of the way:** tools appear at the moment
  they are needed and are dismissed after; faces stay large.
- **Feedback in context:** every assessment is anchored to the moment
  it is about (a spoken comment, a chat line, a poll answer), graded
  against a rubric for a named outcome, never one blended letter grade.

## What we take, and what we leave

Take: the three conditions; few features done well; signals at a glance,
as an overlay on the main stage the teacher is already looking at, and
always the teacher's to use or ignore; polls that can be rerun to see
who changed their mind; agree and disagree while people talk; breakouts
the teacher can see into from the main room; recognition tied to a named
skill and the moment it was shown.

Leave: grading by the minute, talk-time scoring, and anything that turns
a person into a number on a screen. Human-shaped software counts
learning as success (principle 10), and DECISIONS.md already rules out
points, streaks, leaderboards, and camera tracking. Where Ben's requests
come near those lines, the add-on keeps the human version: a signal is
something a person chooses to send, never something measured about them.

## Ben's eight requests, as built (R10 to R17)

1. **Reactions and agree or disagree (R10).** A row of reactions in the
   panel, each with a number key, sent to everyone's main stage as a
   brief float (the ALF's "see everybody and their reactions"), and a
   held stance (agree, unsure, disagree) that the stage shows as a live
   bar while someone presents. Sent over Supabase Realtime broadcast;
   nothing is stored, and no one is counted.
2. **Presence, answered, and where people are (R11).** One live roster in
   the teacher's panel and on the stage overlay: who has the class open
   now, who has not yet, who has answered the question on the stage, and
   which path stage each person chose to say they are on. It is held
   only in Realtime presence while the call runs; nothing about it is
   kept afterward. (Ben's attendance request, made the human way: it
   shows who is here so the teacher can welcome the missing, and it
   never records who was not.)
3. **Rooms on the main stage (R12).** A rooms view on the main stage and
   on the class page: every rehearsal room's step, presenter, clock, and
   any call for the teacher, at a glance, from the main room.
4. **Content on the stage (R13).** A teacher adds a PDF, slides exported
   as PDF, or images; each page becomes part of the scene's board, so
   drawing on it, zooming, and working on it together (or locked) come
   from the board the class already uses. A teacher's library is a
   GitHub folder of their own that the panel can read.
5. **Code and agents (R14).** A code scene: a short program the whole
   class can run in their own browser and change. And "Share what my
   agent said": a person pastes what their own agent answered, marked as
   AI, into the class's queue, by their own choice. The teacher's agent
   reads the live class through the MCP server's new `live_now` tool.
   No agent joins the call or speaks on its own.
6. **Conversation (R15).** The session's GitHub Discussion in the
   panel, with replies (threads) and GitHub's own reactions, and a quick
   poll that is a question of the run of show. It stays one conversation
   space, the cohort's own.
7. **Recognition for skills (R16).** A teacher names a skill a person
   just showed, from a short list tied to the path and the principles
   (or in their own words), with the moment it happened. The person sees
   it on their class page and can carry it into their credential's
   evidence. No points, no counts, no ranking.
8. **The rerun poll (R17, from the chapter).** Ask a question, let the
   class talk, ask it again, and see on the stage how answers moved.
