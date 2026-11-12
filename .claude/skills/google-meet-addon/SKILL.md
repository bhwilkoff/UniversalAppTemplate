---
name: google-meet-addon
description: "Use when building, testing, or debugging a Google Meet add-on (Meet Add-ons SDK: side panel + main stage, activities, frame-to-frame messages) or any web app meant to run inside Meet. Carries what was MEASURED in real calls, not what the docs imply: panel and stage share no storage and no sign-in, Storage Access is refused, the frames get no camera/mic/display-capture, a joiner opens only the frames startActivity names, the host closing the panel ends the activity for everyone, learners get no prompt to rejoin, Meet caches pages 10 minutes per top-site partition, the stage takes clicks and frames github.io apps, createCoDoingClient is refused, and the honest multi-profile test recipe (two tabs are not Meet). Also the Workspace Marketplace review (trademark rule, scope screencast) and fitting stage content to any screen. Triggers on Meet add-on, Google Meet, side panel, main stage, meet.addons.js, createAddonSession, startActivity, notifyMainStage, notifySidePanel, frameToFrameMessage, endActivity, Workspace Marketplace, co-doing, live classroom in Meet."
---

# Google Meet add-on

A Meet add-on is two web pages Meet frames for each person: a **side panel**
(narrow, one per person) and a **main stage** (large, opened as an "activity"
the whole call can join). This skill is what a live cohort platform measured
across a dozen real calls in October and November 2026. Every rule here was
paid for by a feature that passed a test and then failed in Meet.

## The frames: what they can and cannot do

| Fact (measured in real calls) | So |
|---|---|
| Panel and stage do **not** share localStorage, sessionStorage, or events, even on one origin. | Anything crossing them goes through `notifyMainStage` / `notifySidePanel` (frameToFrameMessage). Never a storage channel. |
| A panel's messages reach **only the same person's** stage. | Each person's stage shows what their own panel tells it. To show everyone the same thing, every panel reads one shared state (database) and drives its own stage. |
| Meet refuses `requestStorageAccess`. The frames never see the site's first-party cookies or storage. | Sign-in inside Meet goes through a **popup** window on your origin that hands the session back by postMessage. A popup is unsandboxed and top-level. |
| The add-on iframe has no `allow` attribute: camera, microphone, display-capture, autoplay, clipboard-write, and fullscreen are all denied. | The panel cannot record or hear the call. A popup it opens can (getDisplayMedia + getUserMedia + MediaRecorder). |
| The stage takes each person's own clicks and keys, can `fetch` public APIs, and can frame a learner's `github.io` app (each person gets their own working copy). | A shared stage can be interactive: answer on the stage, try a classmate's app. github.com itself sends `X-Frame-Options: deny`; check XFO/frame-ancestors server-side before framing any URL, and always offer Open in a new tab. |
| A stage page that never calls `createMainStageClient` leaves Meet on "Loading", then "The add-on couldn't start". | The stage must create its client at once, even when it has nothing to show yet. |
| `createCoDoingClient` exists in the SDK but is undocumented and refused, with or without an activity. | Do not build on it. Use your own realtime channel. |
| Chrome draws **no PDF** inside Meet's frames, sandboxed or not (a broken-page icon). A picture or video in a plain iframe draws at its natural size and spills off the stage. | Render a PDF deck's pages to images and show them as slides the leader moves for everyone; give any other PDF an "Open the PDF" card. Show pictures in `<img>` and videos in `<video controls>` with `object-fit: contain`, and let each person enlarge what sits beside a question. |

## Activities: the lifecycle nobody tells you

- **A joiner opens only the frames `startActivity` names.** Name both
  `mainStageUrl` **and** `sidePanelUrl`, or learners get a stage with no panel
  to drive it (a whole first session showed learners a blank stage).
- **Learners get no prompt** when an activity starts or restarts. They must
  press the activity icon at the top right of Meet, then **Join activity**.
  Teach this before the first session (a "try it before" page), and say it the
  same way everywhere your UI gives instructions.
- **The host closing the side panel ends the activity for everyone.** So does
  `endActivity()` (initiator only), which also unloads the panel. Closing the
  panel with the X only hides it; reopening is three presses in Meet's menus.
- `MeetingPolicyPreventsStartingActivity`: the call's host controls must allow
  contributors to share add-on activities. Say so in plain words.
- Keyboard shortcuts work with focus in your frames, never with focus on
  Meet's own page; only a Chrome extension gets past that.

## Caching: why a fix "doesn't work" for ten minutes

- GitHub Pages serves HTML with a 10-minute cache, and Chrome partitions its
  HTTP cache by top-level site, so inside Meet your pages can stay stale up to
  10 minutes after a push **whatever a plain `curl` shows**.
- Version every script and stylesheet (`?v=tag`) and bump the tag on each
  change; still wait ~10 minutes, then reload the call or leave and rejoin the
  activity, before judging a fix. Leaving and rejoining the activity reloads
  the panel; ending it reloads everyone's.
- Each push to Pages cancels a deploy still running (shown as "errored"), so
  batch pushes.

## Fitting content to any stage

The stage is whatever size Meet gives it: a laptop with the panel open leaves
roughly 800 by 450 CSS pixels. Measured failures and fixes:

1. **A view must end above any fixed strip** (reactions, stances). Size
   full-stage views with the strip's height, not `100vh`.
2. **Type sized in `vmin` with rem floors overflows small stages.** After
   every draw and on resize, measure the view's content against the space and
   scale the whole view with CSS `zoom` until it fits. Measure against
   `window.innerHeight`: a grid container grows with its content, so its own
   box always "fits".
3. **Never scale a view that fills the stage on purpose** (an embedded board,
   an iframe): the fit step shrank a live board to a third of its size.
4. **Lay out by the view's own width**, with container queries
   (`container-type: inline-size`), not the window's: a question beside a
   document is narrow even on a wide stage.
5. **Let fixed chrome shrink too**: `clamp()` the strip's height so a small
   stage keeps most of its height for content.
6. Build an **offline stage harness**: the real stage HTML with the Meet SDK
   script removed and a stub `window.meet` that hands your view to the stage's
   message handler, in an iframe of a fixed size, screenshotted by headless
   Chrome at 560x315, 805x455, and 1280x720. The harness copy must be
   regenerated from the live page each time.

## Testing: two tabs are not Meet

The single most expensive lesson: a panel-to-stage feature passed in two
browser tabs (which share storage) and failed in Meet (whose frames do not).

- **Only a real call counts** for anything that crosses panel and stage, or
  anything a second person sees.
- **Use separate Chrome profiles**, one per role, each signed into a
  different Google account where possible. Map them by the extension's
  device id, not "Browser N" (those names shift). Record which profile holds
  which **app sign-in**: a profile's Meet-partition storage can still hold an
  earlier app session, so a "learner" profile may open as a second leader.
- The same Google account can join twice from two profiles with **Join here
  too**. Never **Switch here**: it moves the first window's call.
- A second account must be admitted by the host the first time.
- **Turn the camera and microphone off before joining** in every test profile;
  some profiles default them on and show a real room.
- Never sign a panel out to make a guest: many auth libraries sign out
  globally (every device). Use a profile that never signed in, or an anonymous
  sign-in.
- A profile that refuses screenshots or input is unusable; move on rather than
  retry.
- You cannot read the panel's console from the Meet tab. Make the panel
  surface errors on screen ("Something went wrong: <message>") so a test, and a
  real person, can report them.
- **Test what a second person sees, in every role** (leader, co-leader,
  member, guest, guest in a breakout room). Each role found its own bug.
- Test an editor by **changing what is already there**, then pressing each
  button once after typing. Adding and deleting passed while editing broke.

## Marketplace listing and review

- **Every Google product name in the listing needs ™** (Google Meet™), plus a
  "is a trademark of Google LLC" footnote. A listing was rejected for this.
- Reviewers ask for an **end-to-end screencast** showing how each OAuth scope
  is used, and access for their test account. Give the reviewer a path that
  needs no real data (a sample space with "Not now" on optional steps).
- A Marketplace app must stand alone: an add-on whose only purpose is to
  launch another app is refused.
- Re-review is triggered by listing details, new integrations, or new scopes,
  **not** by changes to the pages Meet loads, so the UI can keep iterating.
- Install is per Google account. An app cannot see who installed it, so never
  mark "Add it to Meet" as done for anyone.
- The listing promises things ("never measures anyone"); change it before
  your add-on starts collecting anything new.

## What Google gives an add-on, and what it does not

- No access to Meet's breakouts, polls, recording, or participants list, and
  no way to move people. A pool of your own Meet links serves as breakout
  rooms (see `live-learning-sessions`).
- Record, Transcribe, Breakouts, and Polls are premium on free accounts. A
  recording made by a popup, saved to Drive, is the free route.

## See also

- `live-learning-sessions`: the live-class platform built on this.
- `github-and-google-learning-infrastructure`: Drive, Calendar, GitHub, and
  the OAuth app behind the add-on.
- `device-observation-harness`: the general instrument rules.
