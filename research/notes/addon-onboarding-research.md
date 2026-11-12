# Showing people around the Meet add-on

Ben, November 12, 2026: "almost no one has used a Google Meet add-on and
therefore they have no idea what is possible, where they should look, or what
they should focus upon. People understand 'a video conference', but they
likely do not understand a live synchronous learning session ... We don't need
to over explain it, but we do need to orient folks."

## What a call showed (November 12, 2026)

- Meet gives a learner no prompt when an activity starts: a banner for a few
  seconds, then a small icon at the top right.
- After Join activity, a learner's panel joins as a guest by itself, and their
  stage shows what that panel sends. While the panel loaded (about ten
  seconds) the stage said "The session begins soon" during a running class.
- Nothing told anyone that the stage takes clicks, where answers go, or what
  the panel is for.

## What research says

1. Upfront tutorials do not improve task success and make an app feel harder
   (NN/g, 70 users: 91% vs 94%, SEQ 4.92 vs 5.49).
   https://www.nngroup.com/articles/mobile-tutorials/
2. Pull over push: teach a control when there is a reason to use it.
   https://www.nngroup.com/articles/onboarding-tutorials/
3. One hint at a time, at the right moment; a hint that looks unlike the
   interface and never covers what it names.
   https://www.nngroup.com/articles/mobile-instructional-overlay/
4. Do not annotate the obvious. https://www.nngroup.com/articles/mobile-app-onboarding/
5. Short tours a person starts finish far more often (vendor data, 15M
   interactions: user-started tours +123% completion).
   https://www.chameleon.io/blog/product-tour-benchmarks-highlights
6. Help someone skipped stays findable.
   https://www.nngroup.com/articles/help-and-documentation/
7. Live tools (Mentimeter, Pear Deck, Nearpod) make "the presenter controls
   this screen" a visible state, not a lesson.
8. Status messages are announced without taking focus; Escape dismisses
   (WCAG 4.1.3 and 1.4.13).

## What was built

A four-stop tour the first time a panel opens (a learner's starts on the
stage: a live class the leader moves, which they can click; then reactions and
Ask; then Ask your leader; then their app, when the cohort has apps), and one-line hints the first time a question,
a classmate's app, a room, or their turn to show appears. A leader gets their
own tour (Now, Next, Plan, Tools) and a cue when learners are being shown a
hint. The ? in the panel's header replays the tour. assets/coach-lib.js decides,
assets/coach.js draws.
