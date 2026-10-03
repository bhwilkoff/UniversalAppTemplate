# The classroom on Meet: add-ons, extensions, automation, and AI

Research date: 2026-10-03, for M15 in `LOOP-PLAN.md`. Ben, October 3:
"Have you started work on making sure that the Google Meet automation
(setting up calls, etc.) and also whatever we are building on top of
google meet that allows it to feel like a Human Shaped learning
experience and classroom. Seems like we might need to do some research on
how to make add-ons for Meet and/or chrome extensions."

This builds on `google-meet-notes.md` (October 1) and
`meet-recording-and-events-notes.md` (October 2), and does not repeat
what they settled. Where this page and those disagree, this page is newer
and says why. Every claim has its source beside it. Google's pages were
read through a summarizing fetch tool, so where a summary looked wrong I
went back to the raw page (the edition chart below was read from its
HTML). "Not verified" means exactly that.

---

## The answer in one paragraph

Yes, work has started: `tools/meet-events` already makes the cohort's
weekly event, one Meet room per group, and the recordings folder as
meet@, and `/live/` is the page beside Meet. What is missing is the part
that lives inside Meet. The strongest $0 design is a **Meet add-on
published privately to Ben's Workspace organization, for teachers first**:
its side panel loads a slim version of `/live/` that already knows which
cohort the call belongs to, and its main stage shows the current check or
the person presenting, which the teacher can put on screen for everyone.
Private publishing has no Google review and no fee, but it only reaches
accounts inside the organization, so students keep using `/live/` in a
tab or on their phone, which needs no install at all. A public listing
for students is a later, separate decision with a review of days to
weeks. A Chrome extension for students is not worth it. The student's own
AI already sees the session through the hub's `this_session` tool, and
Gemini in Meet is not part of Education Fundamentals.

---

## 1. Google Meet add-ons (the Meet add-ons SDK for Web)

### What they can do today

| Capability | What it means for us | Source |
|---|---|---|
| **Side panel** | An iframe of our page, in the panel on the right of the call. The entry point for every add-on. | https://developers.google.com/workspace/meet/add-ons/guides/overview (updated 2026-09-03) |
| **Main stage** | The add-on can open in the big central area when it needs room. Main stage pages must call `createAddonSession`. | same |
| **Activities** | `startActivity()` invites everyone. Those with the add-on can join; those without "are directed to install the add-on"; those on an unsupported device are told they can't join from it. | https://developers.google.com/workspace/meet/add-ons/guides/collaborate-in-the-add-on (2026-09-03) |
| **Shared state** | Two routes: "author your own synchronization backend" or the Co-Doing API. Co-Doing (and Co-Watching) "was only available in limited preview, through an Early Access Program. This program is now closed to new signups." So we use our own backend, which we already have: Supabase Realtime in `assets/live.js`. | same; https://developers.google.com/workspace/meet/add-ons/guides/use-CoDoingAPI (2026-09-03) |
| **Frame-to-frame messaging** | Side panel to main stage, but "messages sent by a given participant are *only* visible by that same participant." Useful for "show this check on my main stage", not for talking to others. | https://developers.google.com/workspace/meet/add-ons/guides/frame-to-frame-messaging |
| **Screen sharing the add-on** | Supported with Region Capture (`supportsScreenSharing`). People without the add-on "can observe activities if the host shares their screen, though they cannot directly interact." This is how a teacher-only add-on still reaches every student. | overview; https://support.google.com/meet/answer/13961388 |
| **What the SDK tells the page** | `getMeetingInfo()` returns `meetingId` and `meetingCode`. Nothing about who the user is or who else is in the call. Identity is ours to provide. | https://developers.google.com/workspace/meet/add-ons/reference/websdk/addon_sdk.meetsidepanelclient |
| **Recording** | No method to start or stop recording (settled October 2). | same |

### Who can use one

- **Every kind of Google account.** At GA (September 2024): "available
  to all Google Workspace customers, Workspace Individual Subscribers, and
  users with personal Google accounts"
  (https://workspaceupdates.googleblog.com/2024/09/google-meet-add-ons-sdk-is-now-available.html).
  Nothing I found excludes Education Fundamentals.
- **Blocked when** the person is signed out, uses Family Link, is under
  the age of consent, has a "View only" role, is in an encrypted meeting
  or livestream, or their own admin blocked the add-on. "At this time,
  you can't enable third-party apps for users under 18 on Google Meet"
  (https://support.google.com/meet/answer/13961388). Our cohorts are
  adults (DECISIONS.md), so this does not bite at launch.
- **Each person installs it into their own account.** "Meeting hosts and
  guests alike can install add-ons"; guests get "Install and join" when
  an activity starts (same page). An admin "may pre-install or restrict"
  add-ons for their own users (same page), which helps Ben's own
  accounts, never students' personal accounts.
- **Platforms:** web, and Android since June 2024, where add-ons sit in
  the Activities panel
  (https://workspaceupdates.googleblog.com/2024/06/google-meet-add-ons-available-on-android-devices.html).
  **Not verified: iOS.** I found no announcement of add-ons on the iPhone
  or iPad Meet app, and Google says "All add-ons don't work across every
  platform" (support page above).

### How one is built

- A web app served over HTTPS from a site we own, plus a Google Cloud
  project with the **Google Workspace Marketplace SDK** (the SDK, not the
  API) and the **Google Workspace add-ons API** enabled. An HTTP
  deployment's manifest names `sidePanelUrl`, `addOnOrigins`, the logos,
  and optionally `supportsScreenSharing`; **Install** on that deployment
  makes it usable by the developer for testing. "Meet add-ons cannot be
  built entirely in Apps Script"
  (https://developers.google.com/workspace/meet/add-ons/guides/deploy-add-on).
- Every origin the iframe uses or navigates to must be `https` and listed
  in `addOnOrigins`
  (https://developers.google.com/workspace/meet/add-ons/guides/add-on-security,
  2026-09-03). **GitHub Pages at humanshaped.org qualifies.** No server is
  needed for the iframe.
- **Can the side panel simply host `humanshaped.org/live/`?** Yes on the
  framing side: humanshaped.org sends no `X-Frame-Options` or
  `frame-ancestors` header (checked with `curl -sI
  https://humanshaped.org/live/` today), so Meet can frame it. Two
  changes are still needed: the page has to load the add-ons SDK and call
  `createAddonSession`, and it has to fit a narrow panel. So the
  prototype is a small `/addon/` page that reuses `live.js` and
  `cohort-lib.js`, not the `/live/` page as it stands.

### Sign-in inside the add-on (Supabase with GitHub)

This is the riskiest part, and it is solvable.

- **GitHub cannot be framed.** `github.com/login` sends
  `x-frame-options: deny` (checked today). Google's guidance agrees:
  "Use a dialog window instead of opening a sign-in page in a new tab,"
  and Meet add-ons "can open sign-in windows directly from the iframed
  application" (https://developers.google.com/workspace/meet/add-ons/guides/best-practices).
- **The iframe's storage is partitioned.** Since Chrome 115, Local
  Storage, IndexedDB, Broadcast Channel, and more are partitioned in a
  third-party iframe
  (https://privacysandbox.google.com/cookies/storage-partitioning). The
  Supabase session someone has on humanshaped.org is invisible inside
  Meet by default, and a session made in a popup lands in the
  unpartitioned storage the iframe can't read.
- **Two ways through, both free:**
  1. **Storage Access API.** Since Chrome 125, an iframe can ask for its
     unpartitioned storage with `requestStorageAccess({localStorage:
     true})`; "if third-party cookies are enabled, this method will grant
     access without requiring user activation or any permission prompt,"
     otherwise the user is asked
     (https://developer.chrome.com/blog/new-in-chrome-125). Someone
     already signed in on humanshaped.org would then be signed in inside
     Meet. Google says Chrome's third-party cookies "are no longer being
     deprecated," though access "might become more limited in the future"
     (Meet add-ons overview above).
  2. **A popup that hands the session back.** `signInWithOAuth` with
     `skipBrowserRedirect` returns the authorization URL instead of
     navigating (https://supabase.com/docs/reference/javascript/auth-signinwithoauth).
     The add-on opens it in a popup, the popup returns to a
     humanshaped.org callback page, and that page posts the session to
     `window.opener`, which the add-on stores with `setSession`.
     **Not verified:** that `window.opener` survives the round trip
     through GitHub and Supabase. GitHub's login page sends no
     Cross-Origin-Opener-Policy header today (checked), which is a good
     sign, not proof.
  The prototype tries (1) first and falls back to (2).
- **Our Supabase redirect allow-list is `https://humanshaped.org/**`**
  (CLAUDE.md), so a callback page on the site needs no change there.

### Publishing, review, cost

| Visibility | Who can install | Google review | Source |
|---|---|---|---|
| **Private** | "limited to users within your domain"; "immediately available to everyone in your Google Workspace organization" | **None** | https://developers.google.com/workspace/meet/add-ons/guides/publish (2026-09-03); https://developers.google.com/workspace/marketplace/how-to-publish |
| **Unlisted** | Anyone with the direct listing URL | Not stated on the review page; the October 1 notes treated it as reviewed. **Not verified.** | https://developers.google.com/workspace/marketplace/enable-configure-sdk |
| **Public** | Anyone | Yes, plus OAuth verification "might" be needed; review "typically takes several days" | https://developers.google.com/workspace/marketplace/about-app-review |

- **The choice is permanent:** "Once you save your visibility option ...
  you can't change your selection later" (publish page). A private
  listing can't later become public; a public one would be a second
  listing.
- **Outside guests and a private add-on:** Google's pages say only that
  private apps are limited to the organization; nothing provides for
  outside users (enable-configure-sdk page). **So students on Gmail or
  other domains can't install a private add-on.** I found no allow-list
  for other domains. Whether `learningischange.com` and `humanshaped.org`
  count as one "domain" here (they are one organization, with
  humanshaped.org as a secondary domain) is very likely but **not
  verified**; the test install answers it.
- **Cost:** no Marketplace fee appears on any of the publishing pages
  above; I found none. The Cloud project, the SDKs, and Pages hosting are
  free at this scale. **$0.**
- **Timelines:** private, immediate. Public, "several days" by Google's
  current wording; the October 1 notes cite an older "2 to 3 weeks"
  budget and a community report of OAuth verification stuck for 8 weeks
  (`google-meet-notes.md`, section 1). Plan for weeks.
- **What a public listing needs that we don't have:** a privacy policy
  and terms of service URL for the consent screen and listing
  (`google-meet-notes.md`, section 1). humanshaped.org has no `/privacy/`
  page today.

---

## 2. The Meet REST API, Calendar, and what meet@ can do

### What the edition gives meet@

humanshaped.org is a secondary domain on Ben's Workspace for Education,
assumed to be **Education Fundamentals** (DECISIONS.md says Meet's own
recording "needs a paid license on this edition"). Read from the raw HTML
of Google's Meet edition chart today, where each cell is a dash or a
check (https://edu.google.com/intl/ALL_us/workspace-for-education/products/meet/editions/):

| Feature | Education Fundamentals | Education Plus |
|---|---|---|
| Participants | 100 | 1,000 |
| Meeting length | 24 hours | 24 hours |
| Moderation controls, hand raising, digital whiteboarding, custom backgrounds | yes | yes |
| **Breakout rooms** | **no** | yes |
| **Polls and Q&A** | **no** | yes |
| Attendance tracking | no | yes |
| Call transcripts | no | yes |
| Recordings saved to Drive | no | yes |
| Waiting room | no | yes |
| Co-presenting | no | yes |
| Live translated captions | at added cost | at added cost |

(A summarizing read of the same page claimed every edition had every
feature; the HTML shows otherwise, so trust the table.) This confirms the
October 3 teaching notes: no breakout rooms and no polls on Fundamentals,
so groups need their own rooms and checks for understanding belong on
our page, which is how `/live/` already does them.

- **Co-hosts:** "All Workspace for education editions" can add co-hosts
  with Host Management, up to 25
  (https://support.google.com/meet/answer/10885841). Whether a co-host can
  be outside the organization isn't said there. **Not verified.**
- **Recording:** none on Fundamentals; already handled by
  `tools/session-recorder` (DECISIONS.md).
- **Length:** 24 hours, so a 90-minute session is safe on Fundamentals
  (chart above). The 60-minute limit applies only to free personal hosts
  (https://support.google.com/meet/answer/7317473).

### The Meet REST API

- GA, updated 2026-09-14. Resources: spaces, conferenceRecords,
  participants, recordings, transcripts, smartNotes, and members
  (https://developers.google.com/workspace/meet/api/guides/overview).
  On Fundamentals the recordings, transcripts, and smart notes will be
  empty, because the edition doesn't make them.
- **Space settings worth using:** `accessType` TRUSTED lets "members of
  the host's organization, invited external users, and dial-in users"
  join without knocking; RESTRICTED makes everyone uninvited knock;
  `moderation` turns on co-host management and restrictions on chat,
  reactions, and screen sharing
  (https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces).
  These need the API, since Apps Script's Calendar service can't set
  them.
- **Attendance:** the API can list participants, but Google says "The
  Meet REST API isn't intended for performance tracking or user
  evaluation within your domain" (overview page). DECISIONS.md already
  rules out attendance tracking. We don't read participants at all.
- **Edition requirement:** the overview doesn't name one. The quickstarts
  ask for "a Google Workspace account" (`google-meet-notes.md`), which
  meet@ is.

### The Calendar path the Apps Script uses

`tools/meet-events/Code.gs` creates each event with
`conferenceData.createRequest` and `hangoutsMeet`, which is Google's
documented way
(https://developers.google.com/workspace/calendar/api/guides/create-events).
A recurring event keeps one Meet code for every session. Nothing found
today changes that design. Two small additions are worth making later:

1. After creating each room, set `accessType: TRUSTED` on its space
   through the REST API (`spaces.patch` with the non-sensitive
   `meetings.space.settings` scope; see
   `meet-recording-and-events-notes.md`, section 2), so invited students
   never wait in the knock queue when meet@ isn't in their group's room.
   **Not verified** on a Calendar-created space; the check routine
   catches it.
2. Store each room's meeting code with the cohort and group (the hub has
   `meet_url` on cohorts and groups, migrations `20261002000000_hub.sql`
   and `20261003100000_teaching_tools.sql`), so the add-on can match
   `getMeetingInfo().meetingCode` to a cohort and a group with no typing.

### One room per trio, and moving people without breakout rooms

There is no API to move a person from one Meet call to another. Without
breakout rooms the move is a link, which is what M12 built: each group
has a recurring room invited to its members and the teachers, and
`/live/` shows "go to your group's room" when the group part starts and
"back to the main room" when it ends. What makes it feel like a move
rather than a scramble:

- **Rooms that don't knock** (TRUSTED, above), so nobody waits for a host.
- **A countdown that everyone sees** on `/live/` (already there), and in
  the add-on side panel for the teacher.
- **The teacher visits rooms** by opening each group's link; the add-on's
  side panel shows which room the teacher is in, because the meeting code
  tells it.
- **Students leave the main call and join the room**, in the same tab.
  Two calls at once would echo.

---

## 3. Chrome extensions on meet.google.com

| Question | Answer | Source |
|---|---|---|
| What can one do on Meet's page? | Content scripts can read and change Meet's page (inject a panel, overlay). Separately, `chrome.sidePanel` (Chrome 114+) shows an extension page beside any site, can be limited to chosen tabs, and opens on a user gesture (Chrome 116+). The panel must be an extension page, which could frame a web page. | https://developer.chrome.com/docs/extensions/reference/api/sidePanel |
| How fragile? | Content scripts depend on Meet's undocumented markup, which Google changes without notice. I found no dated breakage incident; this is an inference, and `chrome.sidePanel` avoids it by never touching Meet's page. | `google-meet-notes.md`, section 4 |
| Manifest V3 limits | "All of your extension's logic must be part of the extension package." No remotely hosted code. | https://developer.chrome.com/docs/extensions/develop/migrate/improve-security |
| Publishing | Public, unlisted (installable by anyone with the URL), or private (trusted testers, Google Groups, or domain publishing). "All visibility settings ... will go through the same review process." | https://developer.chrome.com/docs/webstore/cws-dashboard-distribution |
| Cost and time | A one-time $5 registration fee. Review "within a few days, but it can take up to a few weeks," longer for new developers and broad host permissions. | https://developer.chrome.com/docs/webstore/register; https://developer.chrome.com/docs/webstore/review-process |
| Who must install | Every participant, on desktop Chrome. Nothing on phones, Safari, or the Meet apps. | `google-meet-notes.md`, section 4 |
| Privacy | An extension that reads Meet's page can see names, chat, and captions, which is what attendance and transcript extensions sell. Its permission prompt says so. | same |

**Verdict.** For students, no: an add-on reaches the same people with
less fragility and Google's own permission model, and `/live/` reaches
more of them (phones). For the teacher, the extension we already have
(`tools/session-recorder`, host-only) is the right size; adding a
`chrome.sidePanel` to it would duplicate what the private add-on does
inside Meet itself. Revisit only if the add-on route fails on sign-in.

---

## 4. AI in the session

### The student's own AI, through the hub

The hub's read-only MCP server (`supabase/functions/mcp/index.ts`)
already has a `this_session` tool: how many are waiting in the "show your
work" queue and where the person's own items are, and the teacher's open
checks for understanding with the person's own answers and any count the
teacher chose to show. Classmates' items are counted, never described.
Alongside it are `this_week`, `next_session`, `my_group`, `my_work`, and
`method`. So a student with Claude or Gemini connected can already ask
"what is happening in the session right now?" and "what does this week's
check ask?" without the agent writing anything. Uses worth teaching,
all within the method:

- **Before the session:** "Read `this_week` and my repository, and help
  me get my bring-back ready to show on my device." (Read-only tools,
  and the student's own agent does the work in their own repository.)
- **During the session:** "What is the open check asking?" The student
  answers on `/live/` themselves; the agent cannot answer for them,
  because migration 6 refuses any write from an agent's token (comment
  at the top of `index.ts`).
- **After the session:** "Here is what I said I'm still muddy on; ask me
  the method's questions about it." That is the review skill's job.

Nothing here needs Meet to know about the AI, which is the point: the
AI lives with the student and the repository, and the session page is
the shared surface. An add-on could later show a "copy this for your
agent" button beside each check, which is plain text and needs no API.

### Gemini in Meet

- On Workspace for Education, Gemini in Meet ("Gemini in Gmail, Docs,
  Slides, Vids, Forms, Sheets, Meet, Drive and Chat") comes with the
  paid **Google AI Pro for Education** add-on, $15 a user per month (or
  $20 monthly), for users 18 and older. What comes "at no cost" is
  "Gemini for Education, Gemini Notebook, and Gemini in Classroom"
  (https://edu.google.com/workspace-for-education/add-ons/google-workspace-with-gemini/).
  So **meet@ on Fundamentals has no "Take notes for me,"** and the $0
  rule rules out buying it.
- Personal Google AI Pro and Ultra subscribers get Gemini notes in Meet
  (https://blog.google/products-and-platforms/products/workspace/take-notes-for-me/).
  Whether a student guest can turn it on in a meeting meet@ hosts is
  **not verified**. DECISIONS.md and the October 2 notes keep Gemini
  notes off unless the cohort agrees, so this is a sentence for the
  teacher guide: "If your own AI can take notes in Meet, ask the cohort
  first."

---

## 5. Recommendation

### What goes where

| Surface | Holds | Who |
|---|---|---|
| **Meet itself** (Fundamentals) | Video, chat, hand raising, the whiteboard, moderation | Everyone |
| **`/live/` on humanshaped.org** | The agenda and timers, the week's stages, the share queue, checks for understanding, bring-backs, the link to your group's room. Works in any browser, on a phone, with no install. | Everyone, and the fallback for every other surface |
| **The private Meet add-on** (new) | The same `/live/` core inside Meet's side panel, knowing the cohort from the meeting code; the teacher's controls (start a part's timer, open or close a check, call the next person in the queue); a main stage that shows the current check or presenter, ready to screen share | Teachers and meet@ (inside the organization) |
| **A public Meet add-on** (maybe, later) | The same add-on, installable by students | Students, if cohort 1 shows the tab hurts |
| **`tools/meet-events` as meet@** | Events, group rooms, the recordings folder, the checks; add TRUSTED access and stored meeting codes | Automation |
| **`tools/session-recorder`** | Recording, host only | The host |
| **The hub's MCP server** | The student's AI knows the session through `this_session` | Each student's own agent |
| **A Chrome extension for students** | Nothing | Not built |

### Phased plan

**Phase 0, now (built, untested against Google):** run
`tools/meet-events` as meet@ for a test cohort with two groups, and run
the recorder's test call. This is the dry run both READMEs ask for, and
nothing below is worth more until it passes.

**Phase 1, the teacher's add-on (about 2 to 3 days of agent work, an hour
of Ben's clicking):** a `/addon/` page on the site that loads the Meet
add-ons SDK, reads the meeting code, signs the teacher in (Storage Access
first, popup second), finds the cohort and group whose `meet_url` holds
that code, and renders the `/live/` core in a narrow layout, with a main
stage that shows the open check or the presenter. Published **privately**,
so no review. Students see the main stage when the teacher shares it.

**Phase 2, closing small gaps in automation (about a day):** set
`accessType: TRUSTED` on each room through the REST API, store meeting
codes, and add a "which room am I in" line to the add-on.

**Phase 3, only if cohort 1 asks for it:** a second, **public** listing
for students, with `/privacy/` and `/terms/` pages, the OAuth consent
screen made External, and Google's review. Budget weeks. Each student
installs it once, on desktop or Android. `/live/` stays the default.

### Ben's one-time setup (as Workspace admin)

1. **Confirm the edition:** Admin console, Billing, Subscriptions. If it
   is not Fundamentals, the edition table above changes (Plus has
   breakout rooms and polls).
2. **Allow Meet add-ons** for the organizational unit that holds ben@
   and meet@: the Meet add-on settings have separate switches for
   Google's add-ons and featured third-party add-ons
   (https://workspaceupdates.googleblog.com/2024/06/google-meet-add-ons-available-on-android-devices.html;
   https://knowledge.workspace.google.com/admin/meet/manage-meet-settings).
   The exact menu path is **not verified**.
3. **Create the Cloud project** while signed in as meet@ (so nothing
   depends on Ben's login), at console.cloud.google.com, inside the
   organization. Enable **Google Workspace Marketplace SDK** and
   **Google Workspace add-ons API**.
4. **OAuth consent screen: Internal.** App name "Human Shaped," support
   email meet@, the home page https://humanshaped.org. No Google scopes,
   since Meet add-ons don't need `oauthScopes` (`google-meet-notes.md`,
   section 1).
5. **Add the HTTP deployment** with the manifest the agent writes
   (`sidePanelUrl` https://humanshaped.org/addon/, `addOnOrigins`
   https://humanshaped.org, the logos, `supportsScreenSharing` true), and
   press **Install** to try it in a test call.
6. **Marketplace SDK, App Configuration:** choose **Private** (permanent),
   Meet add-on, then fill the store listing (icons, a one-line
   description) and publish. Optionally admin-install it for the teachers'
   unit so it is already in their Meet.
7. **Test** in a meeting with ben@, meet@, and one outside Gmail account:
   the two inside accounts should see the add-on; the Gmail account should
   not, and should see the main stage when ben@ shares it.

### The first prototype

**A private Meet add-on side panel that loads the cohort's live session
for the teacher.** Concretely: `/addon/index.html` plus `assets/addon.js`
(reusing `live.js` logic through `cohort-lib.js` and `live-lib.js`, with
any new pure logic in a `-lib.js` and tested in `tools/test/`), a
`/addon/stage/` main-stage page, a sign-in callback page, and the
deployment manifest in `tools/meet-addon/`. It needs no new tables; the
only data change is that each cohort's and group's `meet_url` holds the
real Meet link.

**Risks, named fairly:**

- **Sign-in in a partitioned iframe** is the one real unknown. If Storage
  Access is refused and the popup loses its opener, the fallback is a
  "open this in a tab" link to `/live/`, which is where we are today.
- **Students can't install a private add-on.** The prototype makes the
  teacher's work easier and puts more on screen for students; it doesn't
  give students a panel. That is a fair trade for no review, and Phase 3
  exists if it isn't enough.
- **Main stage is only seen by others through screen share,** at screen
  share quality, and only while the teacher shares.
- **iOS** may not show add-ons at all (not verified), which matters for a
  teacher who runs a session from an iPad.
- **Private is permanent.** The public listing, if it comes, is a second
  Marketplace entry, not a switch.
- **Google can close doors**, as it did for Co-Doing and the Media API.
  Everything in the add-on also works on `/live/`, so losing the add-on
  costs convenience, never a session.

---

## Not verified

- Whether a privately published add-on is visible to every domain in the
  organization (learningischange.com and humanshaped.org) or only one.
- Whether unlisted Marketplace listings are reviewed.
- Meet add-ons on iOS.
- Whether `window.opener` survives the GitHub and Supabase sign-in
  round trip from inside Meet's iframe, and whether Meet's iframe allows
  `requestStorageAccess` (no sandbox attributes are documented).
- The exact Admin console path for Meet add-on settings.
- `spaces.patch` on a Calendar-created space (carried over from October 2).
- Whether co-hosts can be outside the organization on Fundamentals.
- Whether a guest's personal Gemini can take notes in a meeting meet@
  hosts.
- The current status of the Media API: the SDK overview lists it as
  "Developer Preview" (https://developers.google.com/workspace/meet/overview,
  2026-09-03), and the October 1 notes found it closed to new signups.
  Either way it is the wrong tool for a course built on privacy.
