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
| A download never starts inside Meet's frame and `clipboard.write` is refused, both **with nothing shown** (real calls, 2026-11-24). | Open a small window of your own origin on the press and hand it the file by postMessage, checking the opener and origin. It saves or copies, says so, and closes itself. Route every save and copy through it, a library's own export dialogs included. |
| A key press on the stage goes to the stage page, not to an editor it frames. | When nothing is being typed, hand the key to the framed editor, or its shortcuts look dead. |
| A stage beside the panel on a laptop measured 816 by 395 to 816 by 460. | A library's breakpoints may call that a phone. Read them and change them in the build (`shared-canvas-editing`). |
| Meet draws its own tile over the stage's bottom right corner. | Keep status lines and controls out of it. |
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

## The stage gives way: measured November 18, 2026

The SDK on gstatic was 1.2.0, the only version. A panel's client offers
`startActivity`, `endActivity`, `setActivityStartingState`,
`getActivityStartingState`, `notifyMainStage`, and `getMeetingInfo`; a
stage's offers `notifySidePanel`, `loadSidePanel`, and `unloadSidePanel`.
`closeAddon` does nothing during an activity.

- **Nothing closes only the main stage.** `startActivity` while one runs
  is refused ("Operation cannot be performed while an activity is
  ongoing"). `endActivity` closes every frame, and a restart shows each
  person Meet's "Join activity" card again.
- **An activity may name only `sidePanelUrl`.** Everyone's panel opens and
  Meet's big window stays free for people and screen shares. After Join
  activity, Meet may leave a joiner's panel folded until they press the
  activity icon.
- So never force a big slide to stay up just to keep the activity alive.
  Routes that worked: run the stage page **inside the panel** (an iframe,
  messages by `postMessage`) whenever no main stage is open; let the main
  stage **turn into** what is shown (an app, a shared screen) with the
  slide kept in a small corner each person can hide; end the activity
  only after asking.
- **A shared screen on the stage:** the frames cannot capture, so a popup
  the panel opens calls `getDisplayMedia` and sends the picture peer to
  peer (WebRTC, public STUN) to every stage that asks, with the handshake
  on a realtime broadcast channel. The stage frame has autoplay off, so a
  `<video>` stays black: read frames with `MediaStreamTrackProcessor` and
  draw them on a canvas, falling back to a "Press to watch" button.
- **Background tabs throttle a test picture**: Chrome pauses
  `requestAnimationFrame` and slows timers in a hidden tab, so a canvas
  test source must tick from a Worker clock, or the stage shows a frozen
  frame that looks like a bug in the stage.
- **Put diagnostics on the stage itself** (route, track muted or live,
  connection state): a stage inside Meet has no console anyone can read.
- Ben's rule from that day: there is never one way to solve a problem.
  When Meet seems to forbid something, list several routes and measure
  which the SDK allows before building one.

## Orienting people who have never used an add-on

People know video calls, not add-ons, so they cannot tell what is possible,
where to look, or what to focus on.

- **A learner's stage shows only what that learner's own panel sends.** While
  the panel loads (about ten seconds was measured), the stage cannot know
  where the session is. It must never claim the session has not begun: say it
  is joining, then say how to bring the panel back.
- **Show people around on the real panel and stage, one place at a time,** the
  first time a panel opens. Use four stops at most. A learner's tour starts on
  the stage ("a live class, not only a call"). Then teach each new thing in one
  line the first time it appears: a question, a classmate's app, a room, a turn
  to show. Upfront tutorials measured no better than none (NN/g), so keep the
  tour short.
- **One callout across both frames.** The panel decides, and the stage draws
  what its own panel tells it. Escape pressed in either frame must close a step
  drawn in the other.
- **Check every step's words against the button as it reads at that moment.**
  A step said "Next" while the button read "Open the main stage".

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
- Going Back in the panel and opening the add-on again from "Active" or
  "Opened" keeps the **old panel frame**. To judge new panel code, start a
  fresh call (meet.new) once the 10 minutes are up (measured 2026-11-28).

## An add-on that needs no account (measured 2026-11-28)

- **The room is the backend.** A small realtime room per call (a Cloudflare
  Durable Object keyed by the Meet code) carries questions, votes, drawings,
  workbook answers, and who is here. It is erased when the call ends, so
  nothing personal outlives the call.
- **Anything kept lives in the host's own Drive** through `drive.file`: a
  whole planned session as one JSON file, slide pictures shared by link so
  stages with no account can draw them, everyone's workbook answers as a CSV.
  Save to the same file id, or every save makes a new file.
- **Google's token window opens only from a click.** A file chooser's change
  event does not count, and the window is refused ("could not open here").
  Offer "Connect your Drive" as a button before any action that needs it.
- **Answers that live only in the room need a way out.** Before the host ends
  the session, name how many people's answers are unsaved, with Save; after a
  question or workbook closes, and after the session ends, keep each person's
  own copy on their panel (opened in a window, since the frame cannot download).
- **Breakouts without Meet's API:** the host makes one call per room with
  meet.new and pastes the links; the room deals everyone else into them. Keep
  each person's **name from the moment of dealing**: once they leave for their
  room they are no longer in the main call to be named. Tell people to leave
  the main call first, and expect them to rejoin the activity when they come
  back; key their answers to a secret on their device so rejoining restores them.
- **Check framing when a page is offered, not when it is shown.** A page that
  refuses framing (X-Frame-Options or frame-ancestors) draws as a broken frame
  on every stage; tell the person who offered it, so they can share their screen.
- **Test a crowd from the terminal.** A Node script that joins the room as a
  panel and a stage per pretend person, answering, drawing, and pointing when
  the room asks, turns a two-profile test into a four-person call.

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

## Animated and 3D slides on the stage

Each participant's stage renders on its own machine, so share a **position,
not pixels**: the slide and the step. A 3D or animated slide is then just a
slide whose steps move pieces, drawn locally at full frame rate, and it rides
whatever already keeps stages in step (Meet's co-doing client is refused to
add-ons; measured November 7, 2026). Worked example: humanshaped.org's
kinetic slides, twelve kinds in a `kinetic` fence, DECISIONS.md "Kinetic
slides" (November 26, 2026), passed in a real call with a leader and a learner.

- **One more block in the deck you have, not a second presentation system.**
  The step count comes from the slide's text, so Next, Back, a late joiner,
  and the editor need nothing new.
- **Every piece animates toward where its step puts it.** Going back plays
  the move in reverse, and a late joiner's stage opens with the pieces placed.
- **The fallback is the same slide as plain points**, used in thumbnails, in
  previews, without WebGL 2, and when the context is lost. It is not a
  pre-rendered picture.
- **Load the 3D library only when such a slide is showing** (vendor it,
  pinned), keep one WebGL context per stage (browsers cap them), honor
  `prefers-reduced-motion` by placing pieces without moving them, and keep
  sound off: it competes with the speaker.
- **Words on 3D faces come from a 2D canvas texture** in the site's own
  typeface, fitted to the face, so no text library is needed.
- **Size for Meet's stage, not a laptop screen.** With the panel open the
  stage is about 800 pixels wide: a scene that reads at 960 needs its words
  larger and its camera closer there. Lay the headline over the 3D with a rim
  of the page color so a tall piece never hides it.
- **A background window draws slowly** (requestAnimationFrame is throttled),
  so a learner's stage may finish a move late; put every piece where its step
  says, never count frames.
- **Look at every kind at every step** in headless Chrome with SwiftShader
  (`--use-angle=swiftshader --enable-unsafe-swiftshader`) before it ships;
  allow several seconds a step, because software WebGL runs at a few frames
  a second.

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
- The browser extension that drives a profile **cancels every native file
  chooser**, outside Meet too (proved with a control page). Test a picker's
  result another way, and have a person press it once in a call.
- A profile that has the extension but is not signed in to it cannot be a
  person in the call. Three real people take three signed-in profiles, so a
  crowd is simulated and only the last check is live.
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
- `shared-canvas-editing`: a board everyone draws on.
- `github-and-google-learning-infrastructure`: Drive, Calendar, GitHub, and
  the OAuth app behind the add-on.
- `device-observation-harness`: the general instrument rules.
