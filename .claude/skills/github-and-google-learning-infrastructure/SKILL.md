---
name: github-and-google-learning-infrastructure
description: "Use when a learning platform (or any free community app) leans on GitHub and Google for identity, storage, notifications, and scheduling instead of running its own: GitHub sign-in through a GitHub App, an organization with a private repository per cohort, private per-person repositories for notices and feedback (GitHub has no private messages), issues as announcements, Actions as free compute; Google sign-in, Drive with drive.file for videos and recordings in each person's own Drive, video playback through a relay, Calendar events, and the OAuth consent screen. Carries the measured traps: a private GitHub App 404s for everyone outside the org, apps cannot set someone's watching, a scheduled Actions 'hourly' job ran a median of 6.2 hours apart, Drive's API key path gets blocked and its player fails on iPhone, a session title change emails every calendar guest, never store refresh tokens. Triggers on GitHub App, GitHub OAuth, org repository, GitHub notifications, issues, repository_dispatch, GitHub Actions schedule, raw.githubusercontent, Google sign-in, Google Drive, drive.file, video relay, Google Calendar, OAuth consent screen, sensitive scope, Apps Script, service account."
---

# GitHub and Google as learning infrastructure

A free cohort platform (humanshaped.org) runs on GitHub (identity, shared
space, history, notifications, compute) and Google (sign-in, Drive, Calendar,
Meet) with a small hosted database for what neither keeps. This is what it
measured. The reason for the shape: both are free at this scale, both already
notify people, and people keep ownership of what they make.

## GitHub

### Sign-in through a GitHub App
- If the auth provider uses a **GitHub App** as its OAuth client, the app
  must be **public**. A private app can be authorized only by its owner
  organization's members, so every outside learner gets GitHub's 404 ("This
  is not the web page you are looking for") while every test by the team
  passes. Check: `curl https://api.github.com/apps/<slug>` returns 200 signed
  out. **Test every GitHub flow from an account outside the org.**
- An app user token with no installation gets 403 when generating a repo from
  a template. Send people to GitHub's own "Use this template" page instead.
- An app cannot set someone's repository watching (PUT subscription returns
  403 for app user tokens). Read `/user/subscriptions` and link out.

### The shared space
- One **private repository per cohort** in an organization is the cohort's
  shared files and history. Learners get Write (almost everything on GitHub
  is recoverable by reverting); leaders maintain. Roles are set in your app
  and synced to GitHub, so people spend their time in your app.
- Stay on **GitHub Free**. No paid features, and no institution's plan.
- Learners own their app repositories; the cohort repo holds only what the
  group shares.

### Notices and feedback: GitHub has no private messages
- Anything private (reminders of what someone has left undone, a leader's
  feedback on their work) goes to **one private repository per person**, one
  issue per cohort, so GitHub's own email and app notifications carry it and
  no peer can see who is behind.
- Announcements to the whole cohort post as **issues in the cohort repo**
  (pin them with GraphQL), at a time the leader chooses, sent by a scheduled
  function.
- Reminders stay native: GitHub and Google Calendar do the sending. Never
  build your own email system.

### Actions as free compute
- A schedule of "every hour" ran at a **median gap of 6.2 hours**. Never time
  anything by it. Run the clock elsewhere (a database cron every 10 minutes)
  and start jobs with `repository_dispatch`.
- Heavy jobs (transcribing a recording) run in Actions inside a private repo.
  Write results to the database, never to the repo, where learners could read
  another person's words.
- A workflow can call your functions over OIDC with no stored secret.

### Serving files from GitHub
- Pages serves HTML with a 10-minute cache, and each push cancels a deploy
  still running. Version assets and batch pushes.
- `raw.githubusercontent.com/<owner>/<repo>/<commit sha>/file` updates
  instantly; the branch path lags up to 5 minutes (max-age 300). A sandboxed
  `srcdoc` frame can run a public repo's `index.html` from a commit with no
  Pages site at all.

## Google

### The Cloud project and consent screen
- One project, at least two owners, never recreated (its client ids are baked
  into listings and pages).
- Move the consent screen to **In production** so anyone can sign in. Prefer
  non-sensitive scopes (`drive.file`, `calendar.freebusy`, userinfo). A
  sensitive scope, or a logo on the consent screen, triggers Google
  verification; a new scope also triggers Workspace Marketplace re-review.
- Only the account owner can add scopes when the console asks for their
  password again; hand that step to them rather than waiting on it.

### Drive with drive.file
- Videos (exchanges) and recordings live in **each person's own Drive**,
  shared anyone-with-link. `drive.file` reaches only files your app made, so
  you can re-share or trash them later and nothing else.
- Upload resumably from the browser with a short-lived token from Google
  Identity Services; pass the right account as `login_hint`. GIS popups open
  outside an automated browser's tab group, so stub Drive to test the page.
- **Playback**: Drive's preview iframe fails on iPhone Safari; streaming
  `googleapis.com/drive/v3/files/ID?alt=media&key=` was blocked with Google's
  "automated queries" page on every network. Stream through a **relay worker**
  that fetches `drive.usercontent.google.com` server-side, serves only file
  ids your database knows, caches each file a day, and answers range
  requests.
- Check a video is still shared with a cookieless fetch of
  `lh3.googleusercontent.com/d/<id>=w64` (CORS-allowed; an image only while
  anyone-with-link).
- iOS Safari's MediaRecorder makes fragmented MP4 that Drive never thumbnails;
  send a frame as `contentHints.thumbnail`. Chrome's MediaRecorder MP4 would
  not seek past about 28 seconds; record WebM and patch its Duration header.
- Talk time is best read from the recording's frames (Meet draws a border on
  whoever speaks) at one frame a second, not from voice clustering, which
  merged two learners. Spot-check frames: a plausible total is not evidence.

### Calendar
- Make events from the leader's own browser with a short-lived token
  (`calendar.events.owned`) rather than one service account, so the platform
  depends on no single account. **Never store refresh tokens.**
- **A session title change emails every guest** an updated invitation. Ask
  the leader before renaming a session on the day.
- Future-dated test sessions get invitations; date test sessions in the past.
- Put the add-on's "try it first" link in the event description.

### A service account, used sparingly
A shared account (meet@) owns the meeting-room pool and old recordings, but
every new feature should belong to the person using it. Its Apps Script
deploys (`clasp`) expire; editing in the web editor is the fallback.

## See also

- `google-meet-addon` and `live-learning-sessions`, which this serves.
- `authentication` and `third-party-revocation-resilience` for sign-in in
  installed apps and surviving a partner's change.
- `zero-cost-hosted-backend` for the database, workers, and RLS.
