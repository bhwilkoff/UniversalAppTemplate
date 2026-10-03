# The classroom on Meet: a design for Ben's fourteen wishes

Research and design, October 3, 2026, for the brief in `DECISIONS.md`
("The classroom on Meet", and "Open, not private"). Not site copy, and
nothing here is in Ben's voice. It builds on
`meet-addons-and-extensions-notes.md` (the add-on research, also October
3), `meet-recording-and-events-notes.md`, `google-meet-notes.md`, and
`facilitation-assessment-social-learning-notes.md`, and does not repeat
what they settled except where a decision here rests on it. Every claim
has its source beside it. Google's pages were read through a summarizing
fetch tool on October 3, 2026; where a page did not say something, this
file says "not stated" or "not verified" rather than guessing.

**The rules every answer obeys.** $0 ongoing (the one-time $5 Chrome Web
Store fee is the only cost anywhere below). Open and free: every tool is
built so it can be listed publicly and used by any teacher or student,
with private publishing only as a test stage. Students bring their own
AI. Students own their data on GitHub. And Ben's item 13: no bot
participant, ever, and anything that records or measures is visible,
explained, in the teacher's hands, and readable by the students it is
about.

---

## Part 1. The answer in one paragraph

Most of what Ben wants can be had at $0, but not by making Meet do it.
Meet on Education Fundamentals has no breakout rooms, polls, Q&A,
recording, transcripts, or saved chat, and nothing Google offers a
third party can move people between calls, rearrange anyone else's
video, or read the chat. What a third party can do is put our own pages
inside Meet (the add-on's side panel and main stage), make and configure
rooms as meet@ (the Meet REST API, now with co-host members), and record
and measure on the host's own computer (a Chrome extension). So the
design puts the classroom's shared state where it already lives, in the
hub and Supabase Realtime, and shows it in three places at once: `/live/`
in any browser, the Meet add-on for anyone who installs it, and the
teacher's screen share for everyone else. Breakouts become a "send
everyone to their rooms" signal with a countdown and a room board; cards
become a broadcast that appears on every one of those surfaces; the
drawing space is Excalidraw (MIT) synced through Supabase; the chat that
should last becomes a GitHub discussion thread for each session; talk
time is measured only as the teacher's share of the room, on the
teacher's machine, never per student; and follow-ups are written by the
teacher from what students chose to contribute. Three wishes are
partly not possible on Meet today (custom layouts for others, silent
listening to rooms, and keeping Meet's own chat on this edition), and each
has an honest substitute below.

---

## Part 2. What each surface can and cannot do (October 2026)

| Surface | Can | Cannot | Source |
|---|---|---|---|
| **Meet itself, Education Fundamentals** | Video, hand raising, moderation, the whiteboard through third-party boards, custom backgrounds, co-hosts (up to 25), 24-hour meetings | Breakout rooms, polls, Q&A, attendance, transcripts, recording, waiting room, co-presenting | Edition chart read from HTML in `meet-addons-and-extensions-notes.md` section 2; https://support.google.com/meet/answer/10885841 (co-hosts on "All Workspace for education editions") |
| **Pin for everyone** | Hosts and co-hosts "can pin up to 3 tiles for other participants," only when joined from a desktop or laptop | Not shown to people on the Android or iPhone and iPad apps; "can't pin Add Ons for others"; not in Companion mode | https://support.google.com/meet/answer/7501121 |
| **Meet add-on (side panel, main stage, activities)** | Our page in an iframe; `startActivity()` with `mainStageUrl`, `sidePanelUrl`, and `additionalData`; people with the add-on join, people without are "directed to install"; screen sharing of the add-on | Nothing about video tiles, layouts, participants, chat, captions, recording, or media is in the SDK; Co-Doing state sync is closed to new signups, so state is ours to sync | https://developers.google.com/workspace/meet/add-ons/guides/overview (updated 2026-09-03); https://developers.google.com/workspace/meet/add-ons/guides/collaborate-in-the-add-on (2026-09-03); `meet-addons-and-extensions-notes.md` section 1 |
| **Add-on origins** | Every origin the iframe uses must be in `addOnOrigins`; "wildcard subdomains are permitted," but Google "strongly advise[s] against using wildcard subdomains with a domain you don't own" | Framing arbitrary student apps (each on its own `*.github.io` or other host) | https://developers.google.com/workspace/meet/add-ons/guides/add-on-security |
| **Meet REST API as meet@** | `spaces.create`, `get`, `patch`, `endActiveConference`; `accessType` OPEN, TRUSTED, or RESTRICTED; moderation with chat, reaction, and present restrictions; `spaces.members` GA on 2026-09-11, so members "can join the space without knocking" and can be COHOST | Moving a person between calls; reading or saving chat; members need the `meetings.space.created` scope, so they apply to spaces meet@'s app created; Google says the API "isn't intended for performance tracking or user evaluation" | https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces (2026-04-16); https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces.members (2026-09-11); https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces.members/create; https://developers.google.com/workspace/meet/release-notes; https://developers.google.com/workspace/meet/api/guides/overview |
| **Saved Meet chat ("continuous meeting chat")** | Since November 2025, chat in Calendar meetings lives in Google Chat | Only on Business, Enterprise, and Frontline plans; Education Fundamentals is not listed; external attendees "can only access chat during the meeting" | https://workspaceupdates.googleblog.com/2025/11/continue-conversations-google-chat-google-meet.html |
| **A host-only Chrome extension** | `tabCapture` gives the tab's audio and video and mutes the tab unless routed back; content scripts can read and change Meet's page, and a `MAIN` world script can replace page functions such as `getUserMedia`; up to four suggested keyboard shortcuts | Anything on other people's screens; Chrome warns the host page "can access and interfere with" a MAIN world script; Meet's markup is undocumented and changes without notice | https://developer.chrome.com/docs/extensions/reference/api/tabCapture (2026-09-11); https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts; https://developer.chrome.com/docs/extensions/reference/api/commands |
| **`/live/` and the hub** | Everything shared: queue, checks, groups and their order, timers, Realtime with polling fallback; works on phones with no install | Nothing inside Meet's own window | `assets/live.js`; LOOP-PLAN.md M3 and M12 |
| **Supabase Realtime, free plan** | 200 concurrent connections, 100 messages a second, broadcast payloads up to 256 KB, 20 presence messages a second | More than that without a paid plan | https://supabase.com/docs/guides/realtime/limits |

Two facts shape everything below. First, the add-on is only seen by
people who install it, and the $0, open answer is a **public** Marketplace
listing (Ben, October 3: "Keeping things private doesn't really make
sense"), so every add-on feature has a `/live/` twin that needs no
install. Second, Meet gives a third party no control over anyone else's
call, so the classroom's moves are signals people see and act on, not
commands Meet obeys.

---

## Part 3. Each wish, researched and decided

### Wish 1. Breakout groups that are easy

**Mechanism: meet@ makes each group's room through the Meet REST API;
"send everyone to their rooms" and "call everyone back" are timed
signals on `/live/` and in the add-on.**

- **Rooms.** Today `tools/meet-events` makes each group's room as a
  recurring Calendar event (`tools/meet-events/README.md`). The
  improvement is to make each group's room with `spaces.create`
  (`UrlFetchApp` with `meetings.space.created` works from Apps Script,
  https://developers.google.com/workspace/meet/api/guides/manage-meeting-spaces),
  set `accessType: TRUSTED`, and add each group member and each teacher
  with `spaces.members.create`, teachers as COHOST. Members "can join the
  space without knocking"
  (https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces.members),
  which removes the one risk the README names: a Gmail student knocking
  at an empty room. Because the space is created by meet@'s app, the
  `meetings.space.created` scope covers it, which is the thing the
  October 2 notes doubted for Calendar-made spaces. **Not verified:**
  that a personal Gmail address can be added as a member and then joins
  without knocking; the guide says nothing about outside users
  (https://developers.google.com/workspace/meet/api/guides/meeting-space-members).
  The check routine tests it, and the Calendar room stays as the
  fallback.
- **The move.** There is no API to move anyone between calls (Part 2), so
  the move is a link and a clock. The teacher presses "Send everyone to
  their rooms (25 minutes)" on `/live/` or in the add-on. Every `/live/`
  page and add-on panel shows one banner: your room's button, the
  countdown, and the group's order. At two minutes left the banner says
  so; at zero it becomes "Come back to the main room" with that link.
  "Call everyone back now" ends it early. The banner is a row in a new
  `live_signals` table, broadcast through Realtime, with the end time
  stored so a late joiner sees the same clock.
- **What feels easy.** One click for the teacher, one click for each
  student, in the same tab (two calls in one browser echo,
  `meet-addons-and-extensions-notes.md` section 2), and nobody waits to be
  let in.

### Wish 8. Listening to, observing, or joining breakouts from a dashboard

**Mechanism: a room board on `/live/` and the add-on built from what the
groups do on `/live/`, and the teacher joins a room visibly. Silent
listening is not possible on Meet, and should not be.**

- **What Meet allows.** A host is a normal participant in each call.
  Google documents no way to observe a call without appearing in it, and
  no API that streams a room's audio to a third party (the Media API is
  in Developer Preview and was closed to new signups,
  `meet-addons-and-extensions-notes.md`, "Not verified"). People do join
  two Meet calls in two tabs and mute one, but that comes from a
  third-party blog, not Google
  (https://xfanatical.com/blog/how-to-join-two-meetings-simultaneously-on-google-meet/),
  and it echoes. So the teacher is in one room at a time, and is seen
  there. That is also what the facilitation research asks for: the
  teacher "visits briefly and says so when arriving, so a group does not
  stop to perform" (`facilitation-assessment-social-learning-notes.md`
  2.3).
- **The board.** Each group card shows its room's link, which step of the
  trio protocol it is on and whose turn it is (the step timers on
  `/live/` already exist; pressing "next" records it), and a "We would
  like the teacher" button any member can press, which lights the card
  and clears when the teacher arrives. Nothing is read from Meet. A group
  that never touches `/live/` shows only its link, which is fine.
- **Co-hosts in rooms.** Teachers added as COHOST members of every room
  (Wish 1) can run any room they drop into. Co-hosts "cannot be
  designated from within Breakout Rooms," but these are not breakout
  rooms, they are separate calls
  (https://support.google.com/meet/answer/10885841).

### Wish 2. A collaborative drawing space, or a slideshow worked on together

**Mechanism: an Excalidraw board on our own pages, synced through
Supabase Realtime, shown in the add-on's main stage as an activity and on
`/board/` for everyone else; and one shared Google Slides deck per
session, copied by meet@, for slides.**

| Option | License and cost | Works inside the add-on | Works for outside students | Verdict |
|---|---|---|---|---|
| **Excalidraw** (`@excalidraw/excalidraw`) | MIT (https://github.com/excalidraw/excalidraw) | Yes, if the bundle and fonts are served from humanshaped.org (`EXCALIDRAW_ASSET_PATH`, https://docs.excalidraw.com/docs/@excalidraw/excalidraw/installation) | Yes, through our sign-in | **Use it.** The host app supplies collaboration: `updateScene` with elements and `collaborators`, and `onChange` (https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api); remote changes merge by element version (https://deepwiki.com/excalidraw/excalidraw/7-collaboration-system, secondary). |
| **tldraw** | Not open source: production needs a license key; the free hobby license is non-commercial and shows a "made with tldraw" watermark; commercial pricing is by negotiation (https://github.com/tldraw/tldraw/blob/main/LICENSE.md; https://tldraw.dev/pricing; watermark detail from https://freealternatives.to/tldraw/free-plan, secondary) | Yes | Yes | **No.** A key that can be withdrawn, and a license that may not fit a movement anyone can run, break "open and free" for other teachers. |
| **Jamboard** | Shut down December 31, 2024; Google pointed Meet users to FigJam, Lucidspark, and Miro (https://workspaceupdates.googleblog.com/2023/09/the-next-phase-of-digital-whiteboarding-for-google-workspace.html) | No | Each needs its own account and plan | **No.** Third-party accounts and paid tiers. |
| **Google Slides** | Free; meet@ copies a template deck into the cohort's Drive folder (Apps Script `DriveApp` `makeCopy`, https://developers.google.com/apps-script/reference/drive/file#makeCopy(String,Folder)), and the folder is already shared with every member (`tools/meet-events`) | Not inside the add-on (docs.google.com would have to be an add-on origin, and sign-in inside a framed Google page is not something we control) | Yes, any Google account | **Use it for slides**, opened in a tab and presented, and linked from `/live/`. |

- **Sync design.** One `boards` row per session (and per group, for a
  group's own board) holds the scene as JSON, saved every few seconds by
  whoever changed it; live strokes go through a Realtime broadcast
  channel (256 KB payload limit, which a classroom board stays well
  under; Part 2). Cursors use Realtime presence (20 messages a second on
  the free plan, so cursors are throttled to a few a second).
- **Who owns it.** Students can download the board as an `.excalidraw`
  file or PNG at any time, and a student's own group board can be
  committed to their repository by their own agent from that file. The
  hub deletes boards with the rest of the session data when the cohort
  is marked finished, as M3 already does for the queue and checks.
- **Cost of the choice.** Excalidraw needs React. The site has no build
  step, so the board page loads a vendored, prebuilt ES module of
  Excalidraw and React from humanshaped.org itself (not a CDN, so
  `addOnOrigins` stays one origin). It is the one heavy page on the site,
  loaded only on `/board/` and the board activity.

### Wish 3 and Wish 9. Deep GitHub and AI-agent connection, and checking code with the teacher's own agent

**Mechanism: the hub's MCP server gains teacher-only read tools; the
teacher's agent reads public repositories through GitHub's own MCP
server; `/live/` shows commits made during class.**

- **What exists.** The hub's MCP server is read-only by design, runs every
  query as the person under row-level security, and refuses all writes
  from an agent's token (`supabase/functions/mcp/index.ts`; migration 6).
  Its tools are student-centered (`my_cohorts`, `this_week`,
  `next_session`, `this_session`, `my_group`, `my_work`, `method`).
- **What to add, for teachers only.** Every tool below runs as the
  teacher, so row-level security already limits it to cohorts they teach.
  - `cohort_apps`: each person's app name, repository, live link, and
    whether they have shown it (never emails).
  - `session_now`: the full queue with each item's link (the teacher
    sees names; students' `this_session` keeps counting classmates'
    items rather than describing them), the open checks, and each
    group's step.
  - `student_context(login)`: what one student contributed and shared in
    this cohort (queue items, check answers, shares, ready marks,
    feedback), for writing a follow-up (Wish 12).
  - A prompt, `check_this_code`: "Read this repository at this commit
    through GitHub, explain what changed in plain words, ask the method's
    questions about it, label everything you say as AI, and do not post
    anywhere." The teacher reads it and decides what, if anything, to
    say. The method already rules out AI feedback standing in for the
    teacher's (CLAUDE.md, "AI feedback is the student's own agent").
- **GitHub itself.** GitHub's official MCP server (MIT, remote at
  `https://api.githubcopilot.com/mcp/`, toolsets including repos,
  pull_requests, issues, and a `--read-only` flag; works with Claude and
  Gemini CLI, https://github.com/github/github-mcp-server) lets the
  teacher's agent read any public student repository, its open pull
  requests, and its recent commits. We do not rebuild that; `/connect/`
  gains a "for teachers" section that sets up both servers, GitHub's in
  read-only mode.
- **During class on `/live/`.** A "Pushed during this session" strip:
  commits since the session started, from each cohort member's public
  repository, read live in the visitor's browser with their own GitHub
  token where present (5,000 requests an hour signed in, 60 signed out,
  https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api),
  cached as `/cohort/` already does. A commit whose message carries an
  agent's `Co-Authored-By` line is shown as such, which makes "the
  agents working on each app" visible without asking anyone's agent
  anything.

### Wish 4. Decent analytics, including talk time if possible

**Mechanism: the teacher's own share of talk, measured on the teacher's
computer from audio levels, never recorded and never per student; plus
counts the hub already has (queue items shown, checks answered).**

- **What is technically possible.** The recorder extension already holds
  two streams: the Meet tab's mixed audio (`tabCapture`,
  https://developer.chrome.com/docs/extensions/reference/api/tabCapture)
  and the host's microphone. An `AnalyserNode` gives real-time levels
  from each without saving any audio (`getFloatTimeDomainData`,
  https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode). From
  that, the extension can count seconds when the teacher speaks, when
  anyone else speaks, and when nobody does. The tab's audio is one mixed
  stream, so it cannot say **who** else spoke, and that is the point.
- **Per-student talk time** could only come from reading Meet's speaking
  indicators beside each name in Meet's page (fragile, undocumented
  markup, Part 2) or from transcripts (not on Fundamentals, and the
  thing Ben called "a creepy AI recorder"). It is also the attendance and
  time-on-task tracking the teaching research says never to build
  (`facilitation-assessment-social-learning-notes.md` Part 7, "Do not
  build"). **Not built.**
- **What the research says.** The evidence for talk time as a teaching
  signal is about the **teacher's** talk, given privately to the teacher.
  In a randomized trial with 414 mentors in a one-to-one online program,
  automated feedback on uptake, talk time, and questions "reduced their
  talk time by 5%" and improved students' experience (Demszky and Liu,
  L@S 2023, https://doi.org/10.1145/3573051.3593379, read from
  https://edworkingpapers.com/sites/default/files/ai23-759.pdf). In Code
  in Place, an online programming course with volunteer section leaders,
  feedback on uptake of student ideas improved instructors' uptake and
  students' satisfaction (Demszky, Liu, Hill, Jurafsky, and Piech,
  Educational Evaluation and Policy Analysis 46(3), 2024,
  https://eric.ed.gov/?id=EJ1436326, abstract via search summary). Both
  used recordings and transcripts, which we will not; our measure is the
  coarse half of theirs. Moderate evidence that the teacher's own number,
  seen by the teacher, changes practice; no evidence found that
  per-student talk numbers help adults learn.
- **Making it transparent.** It runs only while the extension's capture
  is on, so Chrome's own capture indicator shows on the tab (tabCapture
  page above). The teacher says it aloud ("my extension counts how much I
  talk compared with everyone else, not who"), and `/live/` shows a line
  to everyone while it runs. The number lives in the extension's memory
  during the session. At the end the teacher sees "You talked 41 percent
  of the time" and chooses to save it (one row per session, the
  teacher's own share and nothing else, visible to the cohort on
  `/live/` afterwards) or to discard it.
- **Other analytics** come from what people chose to do on `/live/`: how
  many shared their work, how many answered a check, how many bring-backs
  were confirmed. These are already in the hub, shown to teachers as
  counts, never ranked (`facilitation-assessment-social-learning-notes.md`
  4.7).

### Wish 5. Deciding who is "on stage", with custom layouts

**Mechanism: Meet's own "pin for everyone" (up to three tiles, by the
teacher or a co-host) for the video, plus an "on stage" signal on
`/live/` and the add-on that names who is presenting and who is
responding. Custom layouts for other people are not possible on Meet
today.**

- **What Meet allows.** Hosts and co-hosts pin up to three tiles for
  everyone on desktop; people on the phone apps do not see moderated pins;
  add-ons cannot be pinned for others
  (https://support.google.com/meet/answer/7501121). Layouts (Auto, Tiled,
  Spotlight, Sidebar) are each person's own choice.
- **What an add-on can do.** Nothing about tiles (Part 2).
- **What a host extension can do.** Change the host's own view only. It
  cannot reach anyone else's screen.
- **The honest alternative.** The teacher sets "on stage" on `/live/`
  (one presenter and up to two responders, usually the trio's next
  builder and their partners, taken from the queue or the group's
  order). Everyone's `/live/` and add-on panel shows it at the top, with
  each person's role and the bring-back step. The teacher then pins those
  same people for everyone in Meet, which is three clicks. The add-on's
  main stage, when the teacher shares it, shows the same names large, as
  the "layout". A one-line hint on `/live/` tells phone users that
  pinned tiles do not reach them.

### Wish 6. Better use of the chat, which Meet throws away

**Mechanism: a GitHub discussion thread for each session, shown and
posted to from `/live/` and the add-on; Meet's chat stays for the
moment. Saving Meet's own chat is not possible through any Google API on
this edition.**

- **What Google offers.** Continuous meeting chat keeps Meet chat in
  Google Chat, but not on Education Fundamentals, and never for outside
  attendees after the call
  (https://workspaceupdates.googleblog.com/2025/11/continue-conversations-google-chat-google-meet.html).
  The Meet REST API has no chat resource (resources listed in
  https://developers.google.com/workspace/meet/api/guides/overview).
- **What a host extension could do.** Read the chat panel's text from
  Meet's page and save it. Technically possible, fragile (undocumented
  markup), and it would keep everyone's words without their act. Not in
  the plan; if Ben wants it later, it runs only on a press of "Save the
  chat so far", after a notice in the chat, and the file goes to the
  cohort's discussion as a post the teacher reviews first.
- **What the design does instead.** `DECISIONS.md` says never to build
  "a second chat space" beside GitHub discussions, so the chat that should
  last goes into the conversation the cohort already has. When the
  teacher starts a session on `/live/`, the hub opens "Session 3" as a
  discussion in the cohort's private repository (the GitHub App already
  posts as the person, LOOP-PLAN.md "Cohort conversation on the site").
  `/live/` and the add-on show that thread live and let anyone post to it
  as themselves. Links, questions for later, and "I am stuck on" lines go
  there and stay, owned by the people who wrote them, on GitHub. Meet's
  chat stays for "can you hear me" and reactions. The queue and checks
  already hold the structured contributions.

### Wish 7. Running other apps inside the meeting, easy to choose among

**Mechanism: the add-on's side panel is a launcher of activities; each
activity is a page on humanshaped.org opened on the main stage with
`startActivity()`.**

- **Activities at launch.** The session now (agenda, the "on stage"
  names, the room board), the queue, checks for understanding, the board
  (Excalidraw), a card (Wish 10), the session thread, and "show an app"
  (below). The `m15-meet-addon` branch already has `panelPlan`, which
  chooses the activity that opens by the part of the session
  (`assets/addon-lib.js` on that branch).
- **Other people's apps.** A student's app cannot be framed in the add-on
  unless its origin is listed, and Google advises against wildcards on
  domains we do not own (add-on security page, Part 2). So "show an app"
  on the main stage shows the app's name, a large QR code and link, and
  its latest commit; the student opens the real app in its own tab or on
  their phone and presents it, which is what the course wants anyway
  ("Show the bring-back on the real device",
  `facilitation-assessment-social-learning-notes.md` Part 1).
- **Who can join an activity.** People with the add-on join; people
  without are "directed to install"; people on an unsupported device are
  told so (collaborate guide, Part 2). Each activity has a `/live/` twin,
  so nobody is left out.

### Wish 10. Cards and objects on screen with custom text

**Mechanism: a card is a broadcast signal shown on `/live/`, the add-on
side panel, and the add-on main stage; for people with no add-on, the
teacher's shared main stage or the card in the teacher's own camera
through OBS.**

- **The card itself.** The teacher types "5 minutes of worktime left" (or
  picks from saved cards), optionally with a countdown, and presses Show.
  It is a `live_signals` row (Wish 1), so it reaches every open `/live/`
  and add-on within a second, and polling catches anyone whose Realtime
  dropped. Cards are text only, kept until the session ends.
- **On everyone's Meet screen.** With the public add-on, the card
  activity puts it on each participant's main stage. Without it, the
  teacher can present the card page (`/card/?c=...`, full-screen, large
  type).
- **In the teacher's camera, no code.** OBS Studio is free and open
  source, and its Virtual Camera sends an OBS scene "with any
  applications that can make use of a webcam"
  (https://obsproject.com/kb/virtual-camera-guide). A browser source
  pointed at `/card/` puts the live card over the teacher's camera, and
  the same scene carries the branding (Wish 14). A guide on
  `/teach/guide/` is the whole build.
- **In the teacher's camera, our own extension (later, optional).** A
  host extension can replace `getUserMedia` on meet.google.com with a
  MAIN world content script and return a canvas stream that draws the
  camera and the card (`captureStream`,
  https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream;
  frame processing with `MediaStreamTrackProcessor`,
  https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrackProcessor).
  This is how camera-effects extensions work, but Chrome warns that MAIN
  world scripts can be interfered with by the page (content scripts page,
  Part 2), and it breaks when Meet changes. Build it only if OBS proves
  too heavy for teachers.

### Wish 11. Recording locally, and clipping moments

**Mechanism: the existing session recorder, plus clip marks during
class, clips cut on the finish page, and a "recording now" line on
`/live/`.**

- **What exists.** `tools/session-recorder` is a host-only extension with
  no content script and no host permission. It records the Meet tab and
  the host's microphone, will not start until the host ticks that they
  read the notice aloud and pasted it in the chat, shows a REC badge,
  writes ten-second pieces to disk, and saves locally and, by choice, to
  the cohort's Drive folder (`tools/session-recorder/README.md`). It has
  never run against real Google services (LOOP-PLAN.md).
- **Clip marks.** A keyboard shortcut (the commands API allows up to four
  suggested shortcuts, https://developer.chrome.com/docs/extensions/reference/api/commands)
  and a popup button add "mark" at the current time, with an optional
  word. The finish page lists marks; "Make a clip" plays from 30 seconds
  before the mark to 90 after through `HTMLMediaElement.captureStream()`
  into MediaRecorder, which takes as long as the clip and needs no
  encoder library (https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/captureStream;
  Chrome only, which suits a Chrome extension). ffmpeg.wasm (MIT
  wrapper, https://github.com/ffmpegwasm/ffmpeg.wasm) is faster but heavy;
  not needed.
- **Consent and notice.** The notice already promises who sees the
  recording and that rooms are not recorded. Add one sentence: "I may
  mark moments to share back with you; any clip goes only to this
  cohort." A clip with a student in it is shared to the cohort folder
  only, and the README's existing promise ("tell me and I will trim your
  part") covers clips too.
- **"Recording now" for everyone.** The teacher's add-on or `/live/` has a
  "We are recording" switch that shows a line on every `/live/` page. A
  later version lets the extension set it directly once it can sign in to
  the hub; the switch is the version that works now.

### Wish 12. Following up with individual students

**Mechanism: a follow-up view on `/teach/` built only from what each
student contributed on purpose; the teacher writes every word, and it is
sent through the feedback the hub already has.**

- **What the hub already knows, per student, per session.** Their queue
  items and whether they were shown, their check answers (teachers already
  see these by name), their shares and ready marks, confirmations they
  gave, their posts in the session thread (Wish 6), and their public
  commits. Nothing from Meet.
- **The view.** After a session, `/teach/` lists each student with those
  items, the "still muddy" answer first, and the existing "not seen this
  week" list beside it (M12). Each student has a "Write a follow-up" box.
- **Drafts.** Drafts stay in the teacher's browser (localStorage) until
  sent, so the database never holds words about a student that the
  student cannot read. Sending posts it as feedback on the student's
  share or, if there is none, as a note the student sees on `/cohort/`.
  The teacher's own agent may help through `student_context` (Wish 3),
  but the teacher writes and sends; the hub never sends AI-written text as
  the teacher (`facilitation-assessment-social-learning-notes.md` Part 7,
  "AI-written summaries of students for teachers ... Do not build").

### Wish 13. Safe and joyful, with no creepy recorder

**Mechanism: rules built into every milestone, not a feature.**

- No participant is ever a bot; nothing joins a call but people.
- Nothing reads Meet's participant list, captions, or chat. The REST API
  participants resource is never called (Google itself says it is not for
  "performance tracking or user evaluation", Part 2).
- Everything that records or measures runs on the teacher's computer,
  shows Chrome's capture indicator, is said aloud first, and shows a line
  on every `/live/` page while it runs.
- What is kept about a student is what the student made (their queue
  items, answers, posts, boards, commits), and the student can see all of
  it on `/cohort/` and through their own agent's `my_work`.
- Joy: cards with the cohort's words, a welcome stage with everyone's
  faces from GitHub (Wish 14), a board to draw on, and no counters, no
  streaks, and no leaderboards.

### Wish 14. A little Human Shaped branding inside Meet, with the cohort's people

**Mechanism: the add-on's name, icon, side panel, and main stage; a
welcome activity; branded backgrounds anyone can upload; OBS scenes for
the teacher.**

- **The add-on** appears under its own name and logo in Meet's
  Activities panel (the listing's icons and banner,
  https://developers.google.com/workspace/marketplace/how-to-publish), and
  its pages use the site's own type and clay red.
- **A welcome activity** on the main stage while people arrive: the
  cohort's title, this week's challenge, and the GitHub avatars and names
  of everyone in the cohort, with the arch mark. Everyone in the call is
  the cohort, so names are fine here; it is screen-shared or seen in the
  add-on, and recordings go only to the cohort.
- **Backgrounds.** Meet lets people "Add your own personal background"
  (https://support.google.com/meet/answer/10058482), subject to admin
  settings. `/start/brand/` (which already makes the marks with
  `tools/mark/make_brand.py`) adds a few quiet backgrounds to download,
  including one with the cohort's name generated on `/cohort/`.
- **OBS** (Wish 10) for a teacher who wants a lower third with their name
  and the cohort.

---

## Part 4. The feature map

Effort is in agent-days for this codebase, a guess. "Ben" marks a step
only Ben can do.

| # | Wish | Mechanism | Feasibility | Privacy notes | Effort | Depends on |
|---|---|---|---|---|---|---|
| 1 | Easy breakouts | meet@ makes rooms with `spaces.create`, TRUSTED, group members and teacher co-hosts through `spaces.members`; send and recall as timed `live_signals` on `/live/` and the add-on | Yes; outside members joining without knocking not verified | No Meet data read; the signal holds times and text | 3 | Phase 0 dry run; Meet API enabled for meet@ (Ben) |
| 2 | Drawing space, shared slides | Excalidraw (MIT) on `/board/` and as an add-on activity, synced by Realtime; a Slides deck per session copied by meet@ | Yes | Boards deleted with session data; students can download theirs | 4 | `live_signals`; vendored Excalidraw |
| 3 | GitHub and agents | Teacher MCP tools (`cohort_apps`, `session_now`, `student_context`, prompt `check_this_code`); GitHub's MCP server read-only; commits during class on `/live/` | Yes | Read-only; runs as the teacher under RLS; emails never returned | 2 | none |
| 4 | Analytics, talk time | Teacher's own share of talk from audio levels in the host extension; counts from the hub | Teacher share yes; per student not built | No audio kept; nothing per student; saved only by the teacher's choice, and visible to the cohort | 2 | Recorder test call |
| 5 | On stage, layouts | Meet's pin for everyone (3 tiles, desktop) by hand, plus an "on stage" signal on `/live/` and the add-on | Layouts for others: **not possible**; roles yes | Names shown only to the cohort | 1 | `live_signals` |
| 6 | Keep the chat | A GitHub discussion per session, shown and posted to from `/live/` and the add-on | Saving Meet's chat: **not possible** by API on Fundamentals; the thread yes | Posts belong to their authors on GitHub | 2 | GitHub App (done) |
| 7 | Apps in the meeting | Side panel launcher of activities; student apps shown by QR, link, and presenting | Yes; arbitrary apps cannot be framed | none | 2 (with the add-on) | Add-on |
| 8 | Watch or join rooms | Room board from `/live/` steps and "We would like the teacher"; the teacher joins visibly | Silent listening: **not possible**, and not wanted | Nothing from Meet | 2 | Wish 1 |
| 9 | Teacher's agent checks code | Same as 3, plus a "for teachers" section on `/connect/` | Yes | AI output never posted as the teacher | (in 3) | 3 |
| 10 | Cards on screen | `live_signals` card on `/live/`, panel, and main stage; `/card/` to present; OBS guide; camera-composite extension later | Yes; camera composite fragile | Text only | 2, plus 3 if the extension is built | `live_signals` |
| 11 | Local recording, clips | Session recorder plus clip marks, clips cut locally, "recording now" line | Yes | Notice before, Chrome's indicator during, cohort-only after | 2 | Recorder test call; OAuth client (Ben) |
| 12 | Follow-ups | `/teach/` follow-up view from contributions; drafts in the browser; sent as feedback | Yes | Nothing about a student stored that they cannot read | 2 | Wishes 3 and 6 |
| 13 | Safe and joyful | Rules in every milestone | Yes | It is the privacy note | none | none |
| 14 | Branding | Add-on listing, welcome activity, downloadable backgrounds, OBS scene | Yes | Avatars and names shown only in the cohort's call | 1 | Add-on |

---

## Part 5. Milestones, in build order

Each milestone is independently testable, ships behind nothing it does not
need, and keeps `/live/` working on its own if the Meet pieces fail.
Database changes follow the repository's rule: a migration in
`supabase/migrations/`, `supabase/tests/test_policies.py` extended and
seen failing with a rule opened on purpose, then applied through the
Management API (LOOP-PLAN.md, "Database changes now go through").

### C0. The dry run and the public pages (1 day, mostly Ben)

- **Build:** `/privacy/`, `/terms/`, and `/support/` pages, plain and
  short, covering the site, the hub, the add-on, and both extensions:
  what each stores, where (Supabase in the US, GitHub, the teacher's own
  computer, the cohort's Drive folder), who can see it, how to delete it,
  and the Chrome Web Store Limited Use statement, which extensions that
  handle audio, video, or communications must display
  (https://developer.chrome.com/docs/webstore/program-policies/limited-use).
  Add them to `sitemap.xml` and the footer.
- **Test:** the run Phase 0 already names: `tools/meet-events` as meet@ for
  a test cohort with a Gmail member, and the recorder's eleven-step test
  call (`tools/session-recorder/README.md`).
- **Database:** none.
- **Ben:** confirm the Workspace edition; the Admin and meet@ setup in
  `tools/meet-events/README.md`; read the three pages, which must be his
  words before any listing.

### C1. Signals: send, recall, cards, and on stage (3 days)

- **Build:** `live_signals` and its Realtime channel; on `/live/` the
  teacher's controls (send everyone to their rooms with a duration, call
  everyone back, show a card from text or a saved list, set who is on
  stage) and everyone's banner; `/card/?c=` for presenting; a `-lib.js`
  with tests for the clock (late joiners, time zones, the two-minute
  warning, polling fallback).
- **Database:** `live_signals (id, session_id, cohort_id, kind in
  ('rooms','together','card','stage','recording'), body text,
  people uuid[], ends_at timestamptz, created_by, created_at,
  cleared_at)`. Cohort members read; the cohort's teachers write; agents
  read only (migration 6's rule); deleted when the cohort finishes. Added
  to `supabase_realtime`.
- **Test:** two browsers as teacher and student on a labeled test cohort;
  a third with Realtime blocked sees the banner within the polling
  interval.
- **Ben:** nothing.

### C2. Rooms made by meet@, and the room board (3 days)

- **Build:** in `tools/meet-events`, make each group's room with
  `spaces.create`, set TRUSTED, add members and teacher co-hosts with
  `spaces.members.create`, and print each room's link and space name;
  `checkCohort` reports membership. On `/live/`, the room board: each
  group's step and presenter from the trio protocol, and "We would like
  the teacher".
- **Database:** `groups.meet_space text` (the API's space name, for
  re-syncing members); `live_room_state (session_id, group_id, step int,
  presenter uuid, help_at timestamptz, updated_by, updated_at)`, written
  by the group's members and teachers, read by the cohort, deleted at
  finish, in `supabase_realtime`.
- **Test:** `node --test` for the new pure parts of `Code.gs`; then as
  meet@, a test cohort with two groups, one Gmail member who joins their
  room with nobody from humanshaped.org present.
- **Ben:** enable the Google Meet REST API in the meet@ Cloud project and
  approve the `meetings.space.created` scope on the next `whoAmI` run.

### C3. The add-on, built for public listing (4 days, then Google's review)

- **Build:** finish the `m15-meet-addon` branch: `/addon/` (side panel
  launcher: the session now, queue, checks, room board, card, session
  thread), `/addon/stage/` (main stage activities: welcome, card, on
  stage, check, show an app), sign-in by Storage Access then popup
  (`meet-addons-and-extensions-notes.md`, "Sign-in inside the add-on"),
  and the deployment manifest in `tools/meet-addon/`. Every activity has
  its `/live/` twin. High-contrast check of the logo (Meet's publishing
  requirements, https://developers.google.com/workspace/meet/add-ons/guides/publish).
- **Database:** none beyond C1 and C2.
- **Test:** install the HTTP deployment as the developer; run a session
  with ben@, meet@, and a Gmail account that also installs the test
  deployment.
- **Ben:** the Cloud project as meet@ with the Marketplace SDK and the
  Workspace add-ons API; consent screen **External** and in production
  (an Internal or Testing app does not pass public review,
  https://developers.google.com/workspace/marketplace/about-app-review);
  the listing's icons, banner, and screenshots; choose **Public**, which
  is permanent (publish page above); submit.

### C4. The board (4 days)

- **Build:** `/board/?c=&g=` and the board activity: vendored Excalidraw
  and React served from humanshaped.org, scene sync through a Realtime
  broadcast channel, saved scene every few seconds, presence cursors
  throttled, download as `.excalidraw` and PNG. In `tools/meet-events`, a
  per-session Slides deck copied from a template into the cohort folder,
  linked from `/live/`.
- **Database:** `boards (id, cohort_id, session_id, group_id null,
  scene jsonb, updated_by, updated_at)`; members of the cohort (or of the
  group, for a group board) read and write; deleted at finish.
- **Test:** three browsers drawing at once; a dropped connection rejoins
  and converges; a scene near the 256 KB broadcast limit is refused
  politely and saved instead.
- **Ben:** a Slides template he likes.

### C5. The session thread (2 days)

- **Build:** "Open this session's thread" for teachers on `/live/`
  (creates the discussion through the GitHub App, as the teacher); the
  thread shown live on `/live/` and in the add-on, with posting as the
  person, reusing `CohortTalk`.
- **Database:** `sessions.discussion_number int`.
- **Test:** on the `cohort-test` repository, a post from `/live/` lands
  on GitHub as its author.
- **Ben:** nothing (the GitHub App is set up).

### C6. The teacher's agent and commits during class (2 days)

- **Build:** MCP tools `cohort_apps`, `session_now`, `student_context`,
  and the `check_this_code` prompt, each refusing anyone who does not
  teach the cohort, with tests in `tools/test/mcp-shape.test.mjs`;
  "Pushed during this session" on `/live/`; a teachers' section on
  `/connect/` with GitHub's MCP server in read-only mode.
- **Database:** none (row-level security already limits teachers).
- **Test:** call each tool as a teacher and as a student of the same
  cohort; the student gets a refusal.
- **Ben:** try it from his own Claude once.

### C7. Follow-ups (2 days)

- **Build:** the follow-up view on `/teach/`, drafts in localStorage,
  sending as feedback or as a note on `/cohort/`.
- **Database:** `teacher_notes (id, cohort_id, student_id, author_id,
  body, created_at)` readable by that student and the cohort's teachers
  only, for follow-ups that are not tied to a share. Sent text only.
- **Test:** a draft survives a reload and never reaches the database;
  the student sees a sent note; another student cannot.
- **Ben:** read the view's words.

### C8. The recorder grows up, and goes public (3 days, then Chrome's review)

- **Build:** clip marks (shortcut and button), clips on the finish page,
  the teacher's talk share from audio levels with the end-of-session
  "save or discard", the "recording now" and "measuring my talk" lines
  through C1's signal (set from `/live/` until the extension can sign in
  to the hub); the store listing text; a pinned extension key so the
  OAuth client stays matched (`tools/session-recorder/README.md`).
- **Database:** `session_notes (session_id primary key,
  teacher_talk_share numeric, saved_by, saved_at)`, written by teachers,
  read by the cohort.
- **Test:** the existing `npm test` plus tests for the talk counter on
  synthetic audio levels and for clip ranges; a real 20-minute call.
- **Ben:** register the Chrome Web Store developer account (a **one-time
  $5 fee**, https://developer.chrome.com/docs/webstore/register, amount
  confirmed in Google's search summary of that page); publish
  **Unlisted** first (all visibility settings go through the same review,
  `meet-addons-and-extensions-notes.md` section 3), use it for a cohort,
  then switch to **Public**. Because other teachers will host from their
  own accounts, the Drive upload's OAuth consent screen must become
  External, which for `drive.file` may need Google's OAuth verification;
  local saving works without it.

### C9. Branding and the welcome (1 day)

- **Build:** the welcome activity; downloadable backgrounds on
  `/start/brand/` and a cohort one on `/cohort/`; an OBS guide on
  `/teach/guide/` with a scene that frames the teacher and shows `/card/`.
- **Database:** none.
- **Ben:** choose the backgrounds.

### Later, only if asked

- A camera-composite extension for cards (Wish 10), if OBS is too heavy.
- "Save the chat so far" from Meet's page (Wish 6), if the session thread
  is not enough.

**Order and parallel work.** C0 first. C1 and C6 can run at once (no
shared files beyond `/live/`'s sections). C2 needs C1. C3 needs C1 and
C2, and its review clock should start as early as possible, so submit
it before C4. C4, C5, and C7 can run in parallel after C3. C8 can start
any time after C0's test call. C9 last.

---

## Part 6. The public-listing path

| Step | Meet add-on (Marketplace) | Session recorder (Chrome Web Store) |
|---|---|---|
| Pages | `/privacy/`, `/terms/`, `/support/`, working links (review checks them, https://developers.google.com/workspace/marketplace/about-app-review) | Privacy policy with the Limited Use statement (https://developer.chrome.com/docs/webstore/program-policies/limited-use) |
| Account | meet@'s Cloud project; consent screen External and in production; OAuth verification "might" be needed (add-ons that ask for no Google scopes need the least) | A developer account, ideally meet@ (Google recommends a dedicated publishing email, register page) |
| Test stage | Install the HTTP deployment as the developer, before choosing visibility; private publishing is not used, because the choice is permanent and private can never become public (publish page) | Unlisted listing, reviewed like any other |
| Review | "Typically takes several days" (review page); plan for weeks, as the October 1 notes found | "Within a few days, but it can take up to a few weeks" (https://developer.chrome.com/docs/webstore/review-process, in the earlier notes) |
| Cost | No fee found on any Marketplace page (earlier notes) | $5, once |
| Who can use it | Anyone with a Google account who installs it on web or Android; not verified on iOS; blocked for under-18 accounts and by a person's own admin (earlier notes) | Anyone hosting from desktop Chrome |

---

## Part 7. Risks, named fairly

- **Most students may never install the add-on.** It needs a Google
  account, one install, and web or Android. That is why every activity has
  a `/live/` twin and why the teacher's screen share is the floor.
- **Sign-in inside Meet's iframe is still unproven** (Storage Access, then
  a popup). If both fail, the add-on opens `/live/` in a tab, which is
  where cohorts are today.
- **Outside members on REST-made rooms are not verified** to join
  without knocking. The Calendar room stays as the fallback, and
  `checkCohort` tests it with a Gmail account.
- **Google closes doors.** It closed Co-Doing and the Media API to new
  signups and moved Jamboard to third parties. Nothing here depends on a
  preview API; everything degrades to `/live/`.
- **Excalidraw is heavy and React-based** on a site with no framework.
  It is isolated to one page and vendored, and if it becomes a burden,
  Slides covers the shared-work need.
- **Review can stall.** Marketplace and Chrome reviews have taken weeks
  for others (earlier notes). Submitting C3 early and keeping `/live/`
  complete keeps cohort 1 independent of both.
- **Measuring talk could still feel like surveillance** if it creeps.
  The guard is structural: the extension cannot tell who spoke, and the
  only saved number is the teacher's own.
- **Recording consent across places** is handled by the notice and
  treating every session as all-party consent; the README says plainly it
  is not legal advice.
- **The free tiers have ceilings:** 200 concurrent Realtime connections
  (one cohort of 30 with `/live/`, the add-on, and a board is about 90),
  so several cohorts meeting at the same hour is the first limit to
  watch.
- **Meet's pins and Companion mode** do not reach phone users, so roles on
  `/live/` must stand on their own.

---

## Not verified

- That a personal Gmail address can be a `spaces.members` member and then
  join without knocking.
- Meet add-ons on iOS.
- Whether the Marketplace asks for OAuth verification of an add-on with no
  Google scopes.
- Whether OAuth verification is needed for the recorder's `drive.file`
  scope once its consent screen is External.
- The tldraw watermark detail came from a secondary page; tldraw's own
  license text confirms the key and watermark enforcement but not the
  words.
- The Code in Place trial's numbers were read from a search summary of
  the abstract, not the paper.
- Excalidraw's `reconcileElements` behavior came from a secondary summary
  of its code; the first board test settles it.
- Joining two Meet calls at once comes from a third-party blog.
