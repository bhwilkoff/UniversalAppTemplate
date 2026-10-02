# Building on Google Meet for Human Shaped Software live sessions

Research date: 2026-10-01. Every factual claim has its source beside it.
Several pages were read through a summarizing fetch tool; where two reads of
the same page disagreed, that is flagged. "Not verified" means exactly that.

---

## Bottom line

- **For launch (two weeks): a companion page on humanshaped.org plus Meet's
  built-in tools.** Meet itself cannot be embedded in another page
  (`meet.google.com` sends `x-frame-options: SAMEORIGIN`, checked with
  `curl -sI https://meet.google.com/` on 2026-10-01). So the companion page
  runs in a second tab or window next to Meet, or on a phone.
- **Later, maybe: a Meet add-on.** It is general availability (GA) and technically
  feasible with a static site serving the iframe. But the convenient
  cross-participant sync APIs (Co-Doing and Co-Watching) are closed to new
  developers. A cohort drawn from many domains forces a **public**
  Marketplace listing with Google review. And every participant has to install
  the add-on. None of that fits in two weeks.
- **Skip the Chrome extension and the Media API.** Every participant would
  have to install the extension, it breaks when Meet's page structure changes,
  and the obvious uses are surveillance. The Media API is closed to new
  signups.
- **Which account Ben hosts from matters more than anything we build.** On a
  free personal account, group calls stop at 60 minutes and there are no
  breakout rooms, polls, Q&A or recording. On Business Standard (or
  Nonprofits-discounted Business Standard), the host gets all of them.

---

## 1. Google Meet add-ons SDK

**Status.** The Meet add-ons SDK became generally available in September 2024
(https://workspaceupdates.googleblog.com/2024/09/google-meet-add-ons-sdk-is-now-available.html).
The overview docs were last updated 2026-09-03
(https://developers.google.com/workspace/meet/add-ons/guides/overview).

**What it allows**
- **Side panel**: an iframe in the panel on the right side of the meeting. This
  is the entry point. **Main stage**: the add-on can open there when it needs
  more room. Both are described in the overview
  (https://developers.google.com/workspace/meet/add-ons/guides/overview).
- **Activities**: the add-on calls `startActivity()` with an
  `ActivityStartingState`. Other participants get a notification. Those who
  have the add-on can join; those who don't are directed to install it; those
  on an unsupported platform are told they can't join from that device
  (https://developers.google.com/workspace/meet/add-ons/guides/collaborate-in-the-add-on).
  The starting state carries the side-panel and main-stage URLs plus an
  `additionalData` field, all with length limits (same source;
  https://developers.google.com/meet/add-ons/guides/collaboration-starting-state).
- **Shared state across participants** can be done two ways: "handle it
  yourself by authoring your own synchronization backend", or use the Co-Doing
  API
  (https://developers.google.com/workspace/meet/add-ons/guides/collaborate-in-the-add-on).
  - **Co-Doing API**: "Early Access Program: This feature was only available
    in limited preview, through an Early Access Program. This program is now
    closed to new signups."
    (https://developers.google.com/workspace/meet/add-ons/guides/use-CoDoingAPI).
    Where it does exist, state is a `Uint8Array` that is complete rather than
    partial, and it is only "eventually consistent", with no guarantee that any
    single message arrives
    (https://developers.google.com/workspace/meet/add-ons/reference/websdk/live_sharing_sdk.codoingclient.broadcaststateupdate).
  - **Co-Watching API**: carries the same "closed to new signups" banner
    (https://developers.google.com/workspace/meet/add-ons/guides/use-CoWatchingAPI).
  - **So in practice, a new add-on in October 2026 needs its own realtime
    backend** to share state (a free-tier Supabase Realtime, Firebase, or a
    Cloudflare Durable Object).
- **Frame-to-frame messaging** passes messages between the side panel and main
  stage, but "messages sent by a given participant are *only* visible by that
  same participant"
  (https://developers.google.com/workspace/meet/add-ons/guides/frame-to-frame-messaging).
- Screen sharing with Region Capture is supported (`supportsScreenSharing` in
  the manifest)
  (https://developers.google.com/workspace/meet/add-ons/guides/overview;
  https://developers.google.com/workspace/meet/add-ons/guides/deploy-add-on).
- Whiteboarding add-ons came to Android-based Meet room hardware in May 2026
  (https://workspaceupdates.googleblog.com/2026/05/whiteboarding-add-ons-meet-hardware-android.html).
  This is not relevant to us.

**Live Sharing SDK.** The original Android Live Sharing SDK was renamed in June
2023 to the Meet add-ons artifact `com.google.android.meet:meet-addons`. The
`googlesamples/meet-live-sharing` sample repository was archived on 2024-12-09
(https://github.com/googlesamples/meet-live-sharing). The web Co-Doing and
Co-Watching clients still use the `live_sharing_sdk` naming in their reference
docs, and both are closed to new signups (see above). Treat Live Sharing as
legacy and closed to us. I could not find a formal deprecation notice for the
Android SDK itself.

**Requirements**
- A Google Cloud project, with the **Google Workspace Marketplace SDK** (the
  SDK, not the API) and the **Google Workspace add-ons API** enabled. You
  create an HTTP deployment whose manifest JSON holds the name,
  `sidePanelUrl`, `addOnOrigins`, logo and dark-mode logo URLs, and an
  optional `supportsScreenSharing`. **Install** on that deployment makes the
  add-on available to your own account for testing
  (https://developers.google.com/workspace/meet/add-ons/guides/deploy-add-on).
- Hosting: "All origins used in the operation of your add-on must use `https`".
  Every origin, including any page the iframe navigates to, must be listed in
  `addOnOrigins`
  (https://developers.google.com/meet/add-ons/guides/add-on-security).
  **So a static GitHub Pages site on humanshaped.org can serve the add-on's
  iframe.** Nothing I read requires a server for the iframe content. Third-party
  cookies inside the iframe still work in Chrome, but Google warns access
  "might become more limited in the future"
  (https://developers.google.com/workspace/meet/add-ons/guides/overview).
- Meet add-ons don't need the `oauthScopes` manifest field. You still
  configure the OAuth consent screen with a privacy policy and terms of
  service, and a public listing goes through verification
  (https://developers.google.com/workspace/meet/add-ons/guides/best-practices;
  https://developers.google.com/workspace/marketplace/configure-oauth-consent-screen).

**Publishing: private, unlisted, public**
- Private: "your add-on is limited to users within your domain". There's no
  Google review. Public: anyone can find and install it, and Google reviews it
  first
  (https://developers.google.com/workspace/meet/add-ons/guides/publish).
- Unlisted: "the app listing doesn't show in browse or search results. Users
  can only access the app's store page with the direct URL." Visibility is
  permanent once saved. **"If you're using a consumer account (an account
  ending with '@gmail.com'), you can only publish publicly."**
  (https://developers.google.com/workspace/marketplace/enable-configure-sdk).
- Review time: Google advises budgeting 2–3 weeks, though it often takes
  several days
  (https://developers.google.com/workspace/marketplace/about-app-review). One
  community thread reports OAuth verification for a Workspace add-on stuck for
  more than 8 weeks
  (https://security.googlecloudcommunity.com/security-validation-5/oauth-verification-for-workspace-add-on-stuck-for-8-weeks-client-critical-6543).
- **What this means for the cohort:** students come from many domains and
  personal Gmail accounts, so a private listing can't reach them. It would
  have to be public or unlisted, both of which go through Google review.

**Who can use it**
- Personal Google accounts are supported. With a personal account, "add-ons
  are available for all meetings regardless of the number of participants".
  This comes from Google's help article, as surfaced in search results
  (https://support.google.com/meet/answer/13961388?hl=en&co=GENIE.Platform%3DDesktop).
- Blocked when the participant: is signed out, uses a Family Link account, is
  under the age of consent, has a "View only" role, is in a client-side
  encrypted meeting or live stream, or has a Workspace admin who blocked the
  add-on. Only one add-on collaboration can run at a time. Workspace for
  Education can't enable third-party Meet apps for users under 18 (same
  source).
- **Does only the host need it? No.** Each participant who wants to take part
  sees "Install and join" and installs it into their own account
  (same source;
  https://developers.google.com/workspace/meet/add-ons/guides/collaborate-in-the-add-on).
  That is one OAuth consent per student.
- Mobile: not verified. The help page says "All add-ons don't work across
  every platform", and the collaborate docs handle "isn't available for the
  participant's platform".

## 2. Google Meet REST API and Meet Media API

**REST API resources**
(https://developers.google.com/workspace/meet/api/guides/overview):
- spaces (the persistent meeting room, with a meeting code)
- conferenceRecords (one per meeting instance)
- participants and participantSessions (one per device join)
- recordings (MP4 files in the organizer's Drive)
- transcripts (Google Docs)
- smartNotes (Gemini notes)
- members (people added to a space with roles such as co-host)

Release notes
(https://developers.google.com/workspace/meet/release-notes):
- 2025-02-07: meeting participants (not only owners) can query conference
  records, recordings, transcripts and participants.
- 2025-04-29: moderation settings, auto-recording and auto-transcripts can be
  configured on a space.
- 2025-11-12: calendar invitees receive conference-start and transcript events.
- 2026-04-02: smart notes retrieval and smart-notes events reached GA.
- 2026-09-11: `spaces.members` reached GA (add co-hosts and manage members).

**Attendance**
- `participants` include `earliestStartTime` and `latestEndTime`. Signed-in
  users carry a `users/{user}` ID; there are also anonymous and phone users.
  "Profile information might not be available for all participants"
  (https://developers.google.com/workspace/meet/api/guides/participants).
- Google says outright: "The Meet REST API isn't intended for performance
  tracking or user evaluation within your domain"
  (https://developers.google.com/workspace/meet/api/guides/overview). That
  matches our values.
- Transcript entries are available for 30 days after the conference ends
  (same source).

**Scopes**
(https://developers.google.com/workspace/meet/api/guides/authenticate-authorize):
- `meetings.space.settings`: non-sensitive
- `meetings.space.created`: sensitive
- `meetings.space.readonly`: sensitive
- `drive.readonly` (to download recordings and transcripts): restricted, with
  a possible security assessment
- `drive.meet.readonly`: also listed

If the app is used only by Ben's own account, it can stay unverified in
"Testing" mode. The catch: refresh tokens issued to an External app in Testing
expire after 7 days, and there's a cap of 100 test users
(https://dev.to/ko-hi/googles-oauth-testing-mode-expires-refresh-tokens-in-7-days-publish-the-consent-screen-before-24hm;
Google's own wording is in https://developers.google.com/identity/protocols/oauth2).

**Edition requirements.** The Meet API quickstarts list "a Google Workspace
account" as a prerequisite
(https://developers.google.com/workspace/meet/api/guides/quickstart/python).
I could not confirm whether the REST API works for a free @gmail.com host.
Recordings, transcripts and smart notes only exist if the host's edition
records them (see section 5).

**Meet Media API** (real-time audio, video and participant metadata): entered
the Developer Preview Program on 2025-02-24
(https://developers.google.com/workspace/meet/release-notes). As of today it
"is no longer accepting new signups". It needs a consenter in the meeting,
shows an initiation dialog, and refuses meetings that have encryption, a
watermark, or underage accounts
(https://developers.google.com/workspace/meet/media-api/guides/overview).
**It is not GA and not available to us.** It is also the wrong direction for a
course built on privacy.

## 3. Scheduling with the Google Calendar API and Meet links

- Events get a Meet link through `conferenceData.createRequest` with
  `conferenceSolutionKey.type = "hangoutsMeet"`, a unique `requestId`, and
  `conferenceDataVersion=1`. Creation is asynchronous. To see which conference
  types a calendar supports, read `conferenceProperties.allowedConferenceSolutionTypes`
  (https://developers.google.com/workspace/calendar/api/guides/create-events).
- Apps Script's Advanced Calendar service does the same from Ben's own
  account, with no Cloud OAuth verification for personal use. There's a worked
  example on a personal Gmail calendar
  (https://medium.com/@aryanirani123/add-google-meet-links-to-calendar-events-using-the-calendar-api-and-google-apps-script-f46f33d7b8c8;
  https://tanaikech.github.io/2020/12/03/sample-scripts-for-creating-new-event-with-google-meet-link-to-google-calendar-using-various-languages/).
  Not verified against current docs: whether a free personal calendar returns
  `hangoutsMeet` rather than only `eventHangout`. Check
  `allowedConferenceSolutionTypes` on Ben's calendar.
- **Simplest path:** for a single cohort with roughly 6–10 sessions, create one
  recurring Calendar event by hand with a Meet link and invite students. That
  takes no code. The same Meet code then works every week (spaces persist;
  codes expire 365 days after last use, per
  https://developers.google.com/workspace/meet/api/guides/overview).
  Publish the link on the session page.
- Appointment schedules (booking pages) are free on personal accounts, with
  one booking page, no automatic email reminders, and no payments. Google AI
  Plus, Pro and Ultra add reminders and more pages. Business Standard and up
  get everything (https://zapier.com/blog/calendly-vs-google-calendar/;
  https://support.google.com/calendar/answer/16287038?hl=en). These could
  serve office hours.

## 4. Chrome extensions that modify meet.google.com

- **What exists:**
  - "Google Meet Attendance List" has about 400k users, was updated
    2026-07-23, and tracks "First Seen At, Time In Call, and speaking time for
    each participant", with exports to CSV, XLSX and PDF. It says its data
    stays local
    (https://chromewebstore.google.com/detail/google-meet-attendance-li/appcnhiefcidclcdjeahgklghghihfok).
  - Tactiq has more than 1M users and was updated 2026-09-22. It captures live
    captions in the browser for AI notes
    (https://chromewebstore.google.com/detail/tactiq-chatgpt-meeting-tr/fggkaccpbmombhnjkjokndojfgagejfb).
  - Not verified: I couldn't load a current listing for Nod Reactions or the
    old Grid View extension.
- **Manifest V3:** "all of your extension's logic must be part of the
  extension package". Remotely hosted code is banned; remote data and config
  are allowed
  (https://developer.chrome.com/docs/extensions/develop/migrate/improve-security).
- **Chrome Web Store review:** "within a few days, but it can take up to a few
  weeks". New developers, new extensions and host permissions get more
  scrutiny (https://developer.chrome.com/docs/webstore/review-process).
- **Fragility.** Content scripts read and inject into Meet's undocumented,
  obfuscated page structure, which Google changes without notice. This is an
  inference from how such extensions work; I did not find a dated breakage
  incident because my search budget ran out.
- **Coverage.** Every participant must install the extension on desktop
  Chrome. It does nothing on phones, Safari or the Meet apps.
- **Privacy.** The popular features (speaking-time tracking, caption capture)
  are exactly the kind of surveillance the course rejects. **Recommendation:
  do not build or recommend one.**

## 5. Other options

**Apps Script.** The Apps Script `meet` manifest resource configures a
Workspace add-on's in-meeting side panel
(https://developers.google.com/apps-script/manifest/meet-addons). This is the
same add-on model as above, with the same publishing constraints. Apps Script
is still useful for Ben's own automation: creating Calendar events, and a
post-session Drive copy of the agenda.

**Meet's built-in features by edition.** From "Premium Meet features"
(https://support.google.com/meet/answer/10459644?hl=en), read twice through a
summarizer:

| Feature | Business Starter | Business Standard | Business Plus | Workspace Individual | Free personal |
|---|---|---|---|---|---|
| Breakout rooms | no | yes | yes | yes | no |
| Polls | no | yes | yes | yes | no |
| Q&A | no | yes* | yes | listed in one read only* | no |
| Attendance tracking | no | **no** | yes | no | no |
| Recording | no | yes | yes | yes | no (Google One Premium / AI Pro has it, per the same page) |
| Transcripts | no | yes | yes | — | Google One Premium / AI Pro |
| "Take notes for me" (Gemini) | no | yes | yes | — | — |
| Co-hosts | no | yes | yes | — | — |

\* The two reads of the page disagreed on Q&A for Business Standard. The
Nonprofits comparison lists "Polling and Q&A" for Business Standard
(https://www.google.com/nonprofits/workspace/compare/), so I lean "yes".
Ben should confirm in his own account.

Free personal accounts are limited to 60-minute group meetings (with a warning
at 50 minutes) and 100 participants
(https://support.google.com/meet/answer/7317473?hl=en). Hand raise, reactions
and captions are standard Meet features, but I did not find an edition-gated
source for them this session. The Nonprofits page lists hand raising and
moderation controls in every plan.

**Prices**
- Business Standard: $14/user/month, and Workspace Individual is no longer
  marketed (https://workspace.google.com/individual/).
- Workspace for Nonprofits: $0, with 150-participant meetings. Business
  Standard is $3.50/user/month on a 1-year commitment; Business Plus is
  $6.16/user/month
  (https://www.google.com/nonprofits/workspace/compare/).
- **Only the host needs the paid seat.** Students join from any account.

**Companion-site pattern (recommended).** One page per session at
`humanshaped.org/live/<session>`, open beside Meet:
- **No backend needed:**
  - agenda with the current step highlighted
  - breakout prompts
  - a countdown timer that runs on the client against a start time in the URL
  - links to the shared doc or board
  - accessibility notes: captions on, keyboard path, high-contrast
- **Needs a small shared backend:**
  - live polls or "where are you" check-ins
  - a "show your work" queue (students submit a link, the facilitator
    advances)
  - the facilitator's "current step" broadcast

  A free tier covers all of these: Supabase Realtime, Firebase, or a
  Cloudflare Worker with KV or Durable Objects. Store no identity beyond a
  name the student chooses, with no analytics.
- **Works on a phone** (second screen), on any browser, and for any student
  account, with no install or OAuth.
- This complements Meet rather than replacing it. Use Meet's breakout rooms,
  polls and hand raise for in-call mechanics (with a Business Standard host),
  and the page for things Meet lacks: the shared agenda, the share queue,
  durable artifacts after the call.

---

## Recommendations

**For launch (about 2 weeks)**
1. Host from a **Business Standard** seat, or from Nonprofits Business Standard
   at $3.50/month if Ben's organization qualifies. That gives 24-hour calls,
   breakout rooms, polls, Q&A, co-hosts and recording on demand. Skip Business
   Plus: attendance reports aren't needed when the companion page offers an
   opt-in "I'm here" check-in. Effort: under 1 hour.
2. Create **one recurring Calendar event** with a Meet link, by hand. Effort:
   15 minutes.
3. A **static companion page template**: agenda, prompts, timer, links,
   accessibility notes, driven by one JSON or Markdown file per session.
   Effort: 1–2 days.
4. Optionally, a **live layer** on the free-tier backend: polls, a share
   queue, and the facilitator's current step, with no accounts (a session code
   plus a chosen name). Effort: 2–4 days, plus a day of testing with real
   phones.
5. A **written recording-and-notes policy**: off by default, and only with
   announced, per-session consent. Gemini notes off unless the cohort agrees.
   Effort: 1 hour.

**Later (after cohort 1, if the companion page proves its value)**
- Port the companion page into a **Meet add-on**. Add a manifest pointing
  `sidePanelUrl` at humanshaped.org, and keep the same backend for sync, since
  Co-Doing is closed.
- Effort:
  - about 3–5 days of engineering on top of the companion page
  - public or unlisted Marketplace listing assets, a privacy policy and terms
  - **2–3 weeks or more of Google review**
  - every student installs it once
- **Account requirement:** an unlisted listing needs a Workspace developer
  account. A @gmail.com developer can only publish publicly.
- Only worth it if students find switching tabs costly in practice.

**Don't**
- Don't build a Chrome extension.
- Don't apply for the Media API.
- Don't use REST API attendance to grade or evaluate students. Google itself
  says the API isn't for that.

---

## Open questions for Ben

1. Which account will host the sessions: ben@learningischange.com (is that a
   Workspace domain, and on which edition?), a new humanshaped.org Workspace,
   or a personal Gmail account?
2. Is there a nonprofit entity that could qualify for Workspace for Nonprofits
   pricing?
3. How big is the cohort, and how long are the sessions? Any session over 60
   minutes with 3 or more people rules out a free personal host.
4. Do you want recordings at all? If so, for whom: absent students only, and
   for how long?
5. Should students use the companion page anonymously (a chosen name), or do
   you want a light identity so their "show your work" items persist across
   sessions?
6. Which live interactions matter most for the first session: polls, the share
   queue, timed breakout prompts, or an opt-in check-in?
7. Will any participants be under 18? That blocks third-party Meet add-ons on
   Education accounts and the Media API in any meeting.
8. Will students join from phones? That strengthens the case for the
   companion page over an add-on, whose mobile support I couldn't verify.

## Not verified this session
- Whether the Meet REST API works for a free @gmail.com host. The quickstarts
  say a Workspace account is required.
- Whether Meet add-ons appear in the Meet mobile apps.
- Whether a free personal calendar offers `hangoutsMeet` through the API.
- Q&A on Business Standard (sources conflict).
- Edition gating of hand raise and reactions.
- Current status of the Nod Reactions and Grid View extensions, and a dated
  Meet DOM-breakage incident. My web-search budget was exhausted before these.
