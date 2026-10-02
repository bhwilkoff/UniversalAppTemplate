# Meet recordings and the event tool

Research date: 2026-10-02. Follows `google-meet-notes.md` (2026-10-01) and
the "Live sessions" rules in `DECISIONS.md`. Web search was unavailable; every
claim below comes from an official page fetched today, cited beside it.
"Unverified" means exactly that. Help Center admin pages
(`support.google.com/a/...`) now redirect to `knowledge.workspace.google.com`.

---

## The answer to Ben's question

**"How will we do the recordings inside Google Meet? Can our add-on or
Chrome extension do it?"**

- **Meet records; we don't.** No public Google API starts or stops a
  recording. The Meet add-ons side-panel client has no recording method
  (https://developers.google.com/workspace/meet/add-ons/reference/websdk/addon_sdk.meetsidepanelclient),
  and the REST API's `recordings` resource has only `get` and `list`
  (https://developers.google.com/workspace/meet/api/reference/rest/v2/conferenceRecords.recordings).
  A Chrome extension could only click Meet's own Record button for the
  user. That would be fragile and would undermine consent, so we won't
  build it.
- **What we can do: configure the room so Meet records itself.** The Meet
  REST API (v2, GA since 2025-04-29) lets the organizer turn on
  auto-recording, auto-transcripts and Gemini notes for a meeting space
  ahead of time (https://developers.google.com/workspace/meet/release-notes;
  https://developers.google.com/workspace/meet/api/guides/meeting-spaces-configuration).
  Afterwards our tool reads the recording's Drive file ID and shares it with
  the cohort.
- **Blocker to check first:** on Education Fundamentals, "Teachers, staff or
  students can't record meetings they organize"
  (https://support.google.com/meet/answer/9308681). So meet@humanshaped.org
  needs a license that allows recording (see section 1).

---

## 1. Editions, recording, transcripts, storage, access

### Which Education editions record
Source for all four rows: https://support.google.com/meet/answer/9308681

| Edition | Can record? |
|---|---|
| Education Fundamentals | No: "can't record meetings they organize" |
| Education Standard | No (same sentence as Fundamentals) |
| Teaching and Learning add-on | Yes, for users holding a "Teaching and Learning Upgrade" license. "Anyone in the same organization as the meeting organizer can record a meeting." |
| Education Plus | Yes, for users with a "Staff" license. They can record meetings they organize and meetings organized by others in the organization. |

- **The comparison chart agrees.** It shows "Recordings saved to Drive" and
  "Call transcripts" as a dash for Fundamentals and a check for Plus (raw
  HTML of
  https://edu.google.com/workspace-for-education/editions/compare-editions/).
  Education Standard no longer appears on that chart.
- **Transcripts** are available in Teaching and Learning and Education Plus,
  among other editions. They are off by default for Education student
  licenses (https://support.google.com/meet/answer/12849897). Transcript
  languages: English, French, German, Italian, Japanese, Korean, Portuguese
  and Spanish (same page).

### Prices
- **Teaching and Learning add-on:** $6 per license per month, or $60 per
  license per year. "You can choose how many licenses to buy." It is sold
  through authorized partners or a sales form, and it adds 100 GB of pooled
  storage per license
  (https://edu.google.com/intl/ALL_us/workspace-for-education/add-ons/teaching-and-learning/).
- **Education Plus:** $6 per user per year on an annual subscription
  (https://edu.google.com/workspace-for-education/editions/compare-editions/).
  The page doesn't say whether every user must be licensed. **Unverified.**
  Google historically required licensing the whole institution.
- **Cheapest route:** one Teaching and Learning license, assigned to
  meet@humanshaped.org, at $60 a year. Only the host needs it: "you can't
  record a meeting if the host doesn't have them [permissions]"
  (https://support.google.com/meet/answer/9308681).

### How Ben checks his edition
- **The subscription:** Admin console → Menu → Billing → Subscriptions. This
  needs the billing privilege. It shows the edition, payment plan and
  licenses
  (https://knowledge.workspace.google.com/admin/billing/which-edition-and-payment-plan-do-i-have).
- **The account's license:** Directory → Users → meet@humanshaped.org →
  Licenses. A Teaching and Learning or Education Plus Staff license must be
  listed there. These console paths are standard but were not separately
  verified today.

### Where recordings go
- **Folder:** recordings are saved in the organizer's Drive, in the "Google
  Meet" folder, with "a sub-folder ... for each meeting." Since July 2026 the
  old "Meet Recordings" folder has been renamed "Legacy Meet Recordings" and
  moved inside "Google Meet"
  (https://support.google.com/meet/answer/9308681;
  https://workspaceupdates.googleblog.com/2026/07/google-meet-now-organizes-your-meeting-notes-transcripts-and-recordings-in-your-Google-Drive.html).
  Transcripts land in the same place
  (https://support.google.com/meet/answer/12849897).
- **Organizer:** the meeting organizer is whoever creates the Calendar event,
  so here it's meet@ (https://support.google.com/meet/answer/9308681).
- **Notifications:** the organizer and the person who started the recording
  get an email with the link, and the link is added to the Calendar event
  (same page).
- **Limits:** recording stops after 8 hours, and both meet@'s Drive and the
  organization's pooled storage need space (same page).

### Who can see a recording by default (same page)
- "Individual meeting participants in the same organization as the meeting
  organizer automatically get access to the recording. **Groups don't
  automatically get access.**"
- External participants get no automatic access. They're notified when
  recording starts and stops but can't control it.
- When auto-recording is on, "Notes and recordings are automatically shared
  with the hosts and co-hosts."
- **Upshot:** cohort members on personal or other-domain accounts won't see
  recordings unless our tool shares them.

### Two admin notes on recordings
- **Downloads:** starting 2026-04-30, organization users with Viewer access
  to new recordings can copy and download them. Admins can uncheck "Let
  users download and copy Meet recordings"
  (https://knowledge.workspace.google.com/admin/meet/manage-meet-settings, via
  https://support.google.com/a/answer/7557052).
- **Retention:** the same admin page says "By default, recordings are saved
  for three months," with no further explanation. **Unverified and
  important.** Ben should check whether a retention rule applies in his org
  (Vault or a Drive retention policy) before promising "always available."
  The tool's move-to-cohort-folder step (below) makes this easy to spot,
  because files would disappear from a folder we watch.

### Sharing with the cohort automatically
**Recommended: one Drive folder per cohort, owned by meet@.** The event tool:
1. Shares the cohort folder as Viewer with each member's Google account
   email, taken from the cohort roster. It adds and removes people so the
   folder always matches the roster, which follows the rule "leaving removes
   it" in `DECISIONS.md`.
2. Moves each new recording and transcript into that folder, where it
   inherits the folder's sharing.

Why not the alternatives:
- **A Google Group per cohort:** this needs Groups for Business with "Group
  owners can allow external members" turned on (Admin → Apps → Google
  Workspace → Groups for Business → Sharing settings;
  https://knowledge.workspace.google.com/admin/groups/set-organization-wide-policies-for-using-groups).
  That's one more system to keep in sync with the hub. It's an option if
  Ben prefers managing membership in Google.
- **A shared drive:** recordings can't be pointed at one, so files would
  have to be moved anyway. Shared drives with external members need extra
  admin settings. No advantage here.
- **"Anyone with the link":** this breaks cohort privacy. Don't use it.

Requirements for the folder approach:
- Drive must allow sharing outside the organization for meet@'s
  organizational unit: Admin → Apps → Google Workspace → Drive and Docs →
  Sharing settings
  (https://knowledge.workspace.google.com/admin/drive/manage-external-sharing-for-your-organization).
  Education organizations often turn external sharing off for students, so
  put meet@ in its own staff organizational unit.
- **Each member needs a Google account** for their email (Gmail, or a free
  Google account created on any email address). Visitor sharing for
  non-Google accounts exists (same page), but whether Education editions
  get it is **unverified**.

---

## 2. Auto-recording

### Two documented ways
1. **By hand in Calendar or Meet.** When creating the meeting, choose Video
   call options → Meeting records → "Record the meeting." Transcribe and
   "Take notes with Gemini" are in the same place
   (https://support.google.com/meet/answer/9308681).
2. **Through the Meet REST API v2.** The field is
   `SpaceConfig.artifactConfig.recordingConfig.autoRecordingGeneration`,
   with values `ON` or `OFF`.
   - Siblings: `transcriptionConfig.autoTranscriptionGeneration` and
     `smartNotesConfig.autoSmartNotesGeneration`
     (https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces).
   - Set it with `spaces.patch` and an `updateMask` such as
     `config.artifactConfig.recordingConfig`
     (https://developers.google.com/workspace/meet/api/guides/meeting-spaces-configuration).
   - Status history: Developer Preview on 2025-02-07, **GA on 2025-04-29**
     (https://developers.google.com/workspace/meet/release-notes).

### The rules that matter
- **It only starts when a host joins on the web.** "Even if these features
  are enabled, they won't start until the host or co-host joins the meeting
  on web" (https://support.google.com/meet/answer/9308681). The API
  reference says the same thing differently: recording starts "when someone
  with the privilege to record joins the meeting"
  (https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces).
  **So Ben must join on a computer, either as meet@ or as a co-host.**
- **Only the organizer can set it.** "Meeting organizers, but not co-hosts,
  can pre-configure auto-recording, auto-transcripts, and smart notes"
  (meeting-spaces-configuration guide). meet@ is the organizer, so the
  script has to run as meet@.
- **Scopes:**
  - `spaces.patch` accepts `meetings.space.settings` (non-sensitive,
    described as "Edit and see the settings for all of your Google Meet
    calls") or `meetings.space.created`
    (https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces/patch;
    https://developers.google.com/workspace/meet/api/guides/authenticate-authorize).
  - `spaces.get` accepts a meeting code alias, `spaces/abc-mnop-xyz`
    (https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces/get).
- **Calendar-created spaces:** the guide says "You can also set up auto
  artifacts for meetings created from Google Calendar"
  (meeting-spaces-configuration). Patching a Calendar-created space through
  the API, using `meetings.space.settings`, is my reading of the scope text.
  **Not tested.** The "check it works" routine below catches it if wrong,
  and the manual Calendar checkbox is the fallback.

### Who can be added as a co-host
- `spaces.members.create` with `role: COHOST` reached GA on 2026-09-11.
  Members join without knocking
  (https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces.members).
- It requires `meetings.space.created`, which covers only "meeting spaces
  created by your app"
  (https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces.members/create).
- **So adding Ben as co-host by API probably fails on a Calendar-created
  space.** Unverified. Workarounds: Ben joins as meet@ in its own browser
  profile, or meet@ promotes Ben in the meeting. **Simplest for launch: Ben
  hosts as meet@.**

### Can an add-on or a Chrome extension start recording?
- **A Meet add-on: no.** The SDK exposes activities, frame messaging and
  meeting info only (MeetSidePanelClient reference above).
- **The REST API: no.** There is no start-recording method; the API only
  pre-configures (recordings reference above).
- **A Chrome extension:** technically it could click the button in the
  user's own browser. That's an inference with no API behind it. It would
  break whenever Meet's page changes and would bypass consent. Rejected.

---

## 3. Consent and disclosure

### What Meet shows participants
- "Participants get a notification when the recording starts or stops." When
  auto-recording is on, people who join "get an on-screen warning message"
  (https://support.google.com/meet/answer/9308681).
- External, mobile-app and phone participants are notified but can't control
  the recording (same page).
- **Optional "explicit consent" mode.** An admin can require participants to
  click to agree before recording, transcription or Gemini notes start
  (Start / Join / Continue / Leave). It's off by default and can be set at
  the domain, organizational unit or group level
  (https://support.google.com/meet/answer/9308681;
  https://workspaceupdates.googleblog.com/2026/04/require-explicit-consent-for-take-notes-with-Gemini-recordings-and-transcripts-in-Google-Meet.html).
  It covers recordings and transcripts on Teaching and Learning and
  Education Plus (same post). What happens when someone declines isn't
  documented. **Unverified.**

### What the course should say (draft, for Ben to edit)
- **On the cohort sign-up page and in the covenant:** "Live sessions are
  recorded and transcribed. Recordings are shared only with members of this
  cohort, and later with alumni who earn the credential. If you'd rather not
  appear, keep your camera off and use the chat, or tell Ben and he'll trim
  your part. Breakout rooms are never recorded."
  - "Recording is unavailable in breakout rooms"
    (https://support.google.com/a/answer/7557052, in the "Why can't a user
    record?" list).
- **In the session page header:** "This session is recorded."
- **Decisions for Ben:**
  - Turn on explicit consent for meet@'s organizational unit. It fits the
    course's values, and the open question is what happens when someone
    declines.
  - Leave Gemini notes off unless the cohort agrees.
  - Download/copy: off for cohort recordings?

---

## 4. The event tool

### Options

| | (a) Apps Script as meet@ | (b) Worker or Edge Function | (c) Manual |
|---|---|---|---|
| Cost | Free | Free tier | Free |
| Auth | Runs as meet@. One consent click. An internal-only Cloud project needs no verification. | Stored refresh token, or a service account with domain-wide delegation impersonating meet@. More setup and more secrets. | None |
| Scheduling | Built-in time triggers | Cron triggers | Ben remembers |
| Fits the hub? | Reads the cohort roster from a hub JSON URL or a Sheet | Can read Supabase directly | No |
| Risk | Apps Script quotas (fine at this scale) | A leaked refresh token or delegation key is high-value | Drift: wrong guests, recording off, files not shared |

**Recommendation for launch: (a) Apps Script, owned by meet@humanshaped.org,
in a standard Google Cloud project with the OAuth consent screen set to
Internal.**
- **Why a standard project:** default Apps Script projects can't enable APIs
  manually, and the Meet REST API has no Apps Script advanced service, so it
  needs `UrlFetchApp` + `ScriptApp.getOAuthToken()`
  (https://developers.google.com/apps-script/guides/cloud-platform-projects;
  https://developers.google.com/apps-script/reference/script/script-app#getOAuthToken()).
- **Moving later:** to (b) only if the hub needs to trigger event creation
  itself. The hub can still *read* everything the tool publishes.

### Scopes (`appsscript.json`, `oauthScopes`)
```
https://www.googleapis.com/auth/calendar.events         # create and patch events
https://www.googleapis.com/auth/meetings.space.settings # auto-record config (non-sensitive)
https://www.googleapis.com/auth/meetings.space.readonly # spaces.get, conferenceRecords, recordings
https://www.googleapis.com/auth/drive                    # move recordings, share the cohort folder
https://www.googleapis.com/auth/script.external_request # UrlFetchApp
https://www.googleapis.com/auth/script.scriptapp         # time triggers
```
- `drive` is a restricted scope
  (https://developers.google.com/workspace/meet/api/guides/authenticate-authorize).
  An Internal app used only by meet@ shouldn't need verification. **Unverified
  for this exact setup; confirm at first authorization.**
- Enable in the Cloud project: Google Calendar API, Google Meet REST API,
  Google Drive API. Also turn on the Calendar and Drive advanced services in
  the script.

### Admin console checklist (Ben)
1. **Edition:** Billing → Subscriptions. Note the edition and any Teaching
   and Learning licenses.
2. **License meet@:** buy one Teaching and Learning license (or use an
   Education Plus Staff license) and assign it under Directory → Users →
   meet@ → Licenses.
3. **Organizational unit:** put meet@ in a staff OU, say `/Staff/Live`, so
   the settings below don't touch other users.
4. **Meet video settings** (Apps → Google Workspace → Google Meet → Meet
   video settings,
   https://knowledge.workspace.google.com/admin/meet/manage-meet-settings),
   for that OU:
   - Recording: "Let people record their meetings" **on**
   - Download/copy: Ben's choice
   - Transcripts **on**
   - Gemini notes: off, or Ben's choice
   - Explicit consent: recommended on
5. **Meet safety settings** (same page):
   - Domain / Access: allow people outside the organization to join
     meetings meet@ creates.
   - Host management: on, so only hosts control recording.
   - The default access type should let invited external users in without
     knocking. `TRUSTED` = "invited external users ... can join without
     knocking"
     (https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces).
6. **Drive and Docs → Sharing settings:** allow sharing outside the
   organization for the meet@ OU, with no domain allowlist (students use
   personal accounts).
7. **Storage:** confirm the organization's pooled storage and meet@'s quota
   have room. A one-hour recording is roughly 0.5 to 1 GB (my estimate,
   unverified).
8. **Retention:** check Vault and Drive retention rules, given the "saved
   for three months" line above.
9. **Apps Script and API access:** confirm Apps Script is allowed for meet@.
   Under Security → API controls, internal apps are normally trusted.
   **Unverified** whether Education organizations restrict this by default.

### Who does what

**Ben** (about an hour of clicking):
- The Admin checklist above.
- Sign in as meet@ and create the Cloud project (console.cloud.google.com):
  set OAuth consent to Internal and enable the three APIs.
- Paste the project number into the script's Project Settings.
- Run `authorize()` once and click Allow.

**The agent:**
- Write the script and the manifest. The source lives in the
  humanshaped-site repo; Ben pastes it into the script, or uses `clasp` if
  Ben installs and logs in.
- Write the cohort config format.
- Write the check routine, the recording sweep, and the hub's read of the
  published results.
- Write the consent copy.

### Cohort config
One object per cohort, read from the hub (for example
`https://humanshaped.org/data/cohorts/<id>.json`) or from a Sheet.
```json
{ "id": "c1", "title": "Human Shaped Software, cohort 1",
  "timeZone": "America/Denver", "firstStart": "2026-10-20T17:00:00",
  "minutes": 90, "weeks": 5, "byDay": "TU",
  "sessionUrl": "https://humanshaped.org/live/c1/",
  "members": ["student@gmail.com", "..."], "teachers": ["ben@learningischange.com"] }
```

### Sketch (Apps Script, V8)
```js
const MEET = 'https://meet.googleapis.com/v2/';
function meet(path, method = 'get', body) {
  const res = UrlFetchApp.fetch(MEET + path, {
    method, contentType: 'application/json', muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: body ? JSON.stringify(body) : undefined });
  const json = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() >= 300) throw new Error(path + ' ' + res.getContentText());
  return json;
}

function createCohortSeries(c) {
  const start = new Date(c.firstStart);           // interpreted in script TZ; keep script TZ = cohort TZ
  const end = new Date(start.getTime() + c.minutes * 60000);
  const fmt = d => Utilities.formatDate(d, c.timeZone, "yyyy-MM-dd'T'HH:mm:ss");
  const ev = Calendar.Events.insert({
    summary: c.title,
    description: 'Session page: ' + c.sessionUrl + '\nThis session is recorded for cohort members.',
    start: { dateTime: fmt(start), timeZone: c.timeZone },
    end:   { dateTime: fmt(end),   timeZone: c.timeZone },
    recurrence: ['RRULE:FREQ=WEEKLY;COUNT=' + c.weeks + ';BYDAY=' + c.byDay],
    attendees: [...c.members, ...c.teachers].map(email => ({ email })),
    guestsCanSeeOtherGuests: true,
    conferenceData: { createRequest: { requestId: 'hs-' + c.id + '-' + Date.now(),
      conferenceSolutionKey: { type: 'hangoutsMeet' } } },
    extendedProperties: { private: { cohortId: c.id } }
  }, 'primary', { conferenceDataVersion: 1, sendUpdates: 'all' });
  // conference creation is async; poll until status is success
  let e = ev;
  for (let i = 0; i < 10 && e.conferenceData?.createRequest?.status?.statusCode !== 'success'; i++) {
    Utilities.sleep(1500); e = Calendar.Events.get('primary', ev.id);
  }
  const code = e.conferenceData.conferenceId;     // e.g. abc-mnop-xyz
  const space = meet('spaces/' + code);           // meeting-code alias -> spaces/{id}
  meet(space.name + '?updateMask=config.artifactConfig,config.accessType', 'patch', {
    config: { accessType: 'TRUSTED', artifactConfig: {
      recordingConfig: { autoRecordingGeneration: 'ON' },
      transcriptionConfig: { autoTranscriptionGeneration: 'ON' },
      smartNotesConfig: { autoSmartNotesGeneration: 'OFF' } } } });
  const folder = ensureCohortFolder(c);
  PropertiesService.getScriptProperties().setProperty('cohort:' + c.id,
    JSON.stringify({ eventId: e.id, space: space.name, code, folderId: folder.getId() }));
  return checkCohort(c);
}

function ensureCohortFolder(c) {
  const name = 'Recordings - ' + c.title;
  const it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

function syncFolderSharing(c, folder) {   // roster is the source of truth
  const want = new Set(c.members.concat(c.teachers).map(s => s.toLowerCase()));
  const have = new Set(folder.getViewers().map(u => u.getEmail().toLowerCase()));
  want.forEach(e => { if (!have.has(e)) Drive.Permissions.create(
    { role: 'reader', type: 'user', emailAddress: e }, folder.getId(), { sendNotificationEmail: false }); });
  have.forEach(e => { if (!want.has(e)) folder.removeViewer(e); });
}

// Time trigger, every 30 min: move finished recordings and transcripts into the cohort folder.
function sweepRecordings() {
  forEachCohort((c, s) => {
    const recs = meet('conferenceRecords?filter=' + encodeURIComponent('space.name = "' + s.space + '"'));
    (recs.conferenceRecords || []).forEach(cr => {
      (meet(cr.name + '/recordings').recordings || [])
        .filter(r => r.state === 'FILE_GENERATED')
        .forEach(r => DriveApp.getFileById(r.driveDestination.file).moveTo(DriveApp.getFolderById(s.folderId)));
      (meet(cr.name + '/transcripts').transcripts || [])
        .filter(t => t.state === 'FILE_GENERATED')
        .forEach(t => DriveApp.getFileById(t.docsDestination.document).moveTo(DriveApp.getFolderById(s.folderId)));
    });
  });
}
```
Sketch only; it has not been run. The field names come from the references
cited above, including `docsDestination` on transcripts (its `.document`
subfield name is unverified)
(https://developers.google.com/workspace/meet/api/reference/rest/v2/conferenceRecords.transcripts).

### "Check it works" routine (`checkCohort(c)`)
Each line returns pass or fail with a reason. The routine runs after
creation, nightly, and one hour before each session, and emails meet@ (and
Ben) only on failure.

1. **Event:** it exists and isn't cancelled. Its recurrence matches the
   config (count and day). Its start matches `firstStart` in the cohort's
   time zone. Its description contains `sessionUrl`.
2. **Conference:** `conferenceSolution.key.type === 'hangoutsMeet'`, the
   create status is `success`, and a `video` entry point exists.
3. **Guests:** the attendee set equals members plus teachers. List any
   missing or extra.
4. **Space:** `spaces.get` on the code succeeds. Then check:
   - `config.artifactConfig.recordingConfig.autoRecordingGeneration === 'ON'`
   - transcription matches the config
   - `accessType` is `TRUSTED`
5. **Folder:** it exists, it's owned by meet@, and its viewers equal the
   roster.
6. **Recording permission:** the API can't read licenses without admin
   scopes, so this is a manual step. Ben's first dry run is the proof: a
   five-minute test meeting where Ben joins on the web, auto-recording
   starts, and the sweep moves the file.
7. **After each session:** a recording for that date exists in the folder
   within two hours. If not, alert, because it means someone didn't join on
   the web, storage ran out, or retention removed a file.

### Option (c) as the fallback
If the API patch on a Calendar-created space fails:
- Ben ticks Video call options → Meeting records → Record the meeting on
  the recurring event once per cohort.
- The script still creates the event, checks the space, and runs the sweep.
  It only reports whether auto-record is on.

---

## 5. GitHub, hub content and the student's AI

### The session page beside Meet (launch)
- **Reads only public or cohort-permitted data:**
  - the session JSON from the hub
  - each student's repo and latest commit through the GitHub REST API
    (`GET /repos/{owner}/{repo}/commits?per_page=1`,
    https://docs.github.com/en/rest/commits/commits)
  - the cohort's open discussion
- **Rate limits:** unauthenticated GitHub calls allow 60 requests per hour
  per IP
  (https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).
  A cohort page shouldn't call GitHub from every browser. Instead, one free
  Cloudflare Worker (or Supabase Edge Function) fetches with a GitHub App
  installation token, caches for a few minutes, and serves
  `/api/cohort/<id>/live.json`.
- **Private discussions:** cohort discussions are private
  (`DECISIONS.md`), so they need that token anyway. GitHub Discussions are
  read through GraphQL; whether REST also covers them is **unverified**.
- **The same Worker serves the recording links:** the Apps Script sweep
  writes each recording's `exportUri` (the browser playback link) and date
  to that endpoint, or to a Supabase row. The session archive then links
  straight to Drive, where Drive enforces cohort-only access
  (`driveDestination.exportUri`, recordings reference above).

### The student's AI: one read-only MCP endpoint
- **Shape:** `https://humanshaped.org/mcp` (on the Worker; stateless,
  Streamable HTTP), with tools such as:
  - `get_session(cohort, n)`: agenda, prompts, check-for-understanding
    questions
  - `get_week_scope(cohort)`
  - `get_my_repo_status(repo)`: public data only
  - `search_template_docs(q)`: the template's `docs/path/`
- **It only reads.** Its main audience is the student's agent working in
  their repo, which then asks the student questions. That fits "explain it
  back is about decisions, not code."
- **The same data as plain JSON** for agents without MCP.
- **Claude:** custom connectors using remote MCP work on Free (limit: one
  custom connector), Pro, Max, Team and Enterprise. They're added under
  Customize → Connectors and work on claude.ai, Desktop and mobile. The
  connection comes from Anthropic's servers, so the endpoint must be public.
  Auth can be OAuth or none
  (https://support.claude.com/en/articles/11175166-getting-started-with-custom-connectors-using-remote-mcp).
  The transport isn't named on that page; Streamable HTTP is the current MCP
  standard (**unverified on that page**).
- **Gemini CLI:** `gemini mcp add --transport http humanshaped
  https://humanshaped.org/mcp`, or `httpUrl` in `settings.json`. OAuth is
  supported (https://geminicli.com/docs/tools/mcp-server/).
- **Antigravity:** remote servers through `serverUrl` in `mcp_config.json`
  (`~/.gemini/config/mcp_config.json`, or the project's
  `.agents/mcp_config.json`) (https://antigravity.google/docs/mcp).
- **Local models** (Ollama-based agents and others) can use the plain JSON.
- **Privacy:** cohort-private items (discussions, classmates' progress)
  need identity. Keep the public MCP to public course content plus the
  student's own public repo. Add an OAuth-gated tier later with GitHub as
  the identity provider, and only if students ask for it.

### Later: a Meet add-on
- The side panel loads the same session page and the same JSON (see
  `google-meet-notes.md` for publishing limits: a public or unlisted listing
  with Google review, installed by every participant).
- It can't record, and needn't: recording lives in the space config.
- **Possible new door:** the spaces reference mentions a "Meet Embed SDK
  Web" for app-owned entry points
  (https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces,
  `EntryPointAccess.CREATOR_APP_ONLY`). I found no public guide for it; the
  obvious URLs return 404. If it's real and open, the session page might
  host Meet itself. **Unverified; worth one question to Google.**

---

## Recommendation
1. **Now:** Ben checks his edition and buys one Teaching and Learning
   license for meet@ ($60 a year). Without that, nothing records.
2. **Build the Apps Script event tool** as meet@: create the series, patch
   the space for auto-recording and transcripts, keep the cohort Drive folder
   in sync with the roster, sweep recordings into it, and check everything
   nightly and before each session.
3. **Ben hosts as meet@ on a computer**, so auto-recording starts. Turn on
   explicit consent, and publish the disclosure.
4. **Dry run** with two test accounts, one external Gmail, before cohort 1.
5. **Session page + Worker JSON + read-only MCP** for GitHub, hub content and
   students' AI. The add-on comes later and adds nothing to recording.

## Open questions
1. Which edition does the organization have, and can Ben buy a single
   Teaching and Learning license (it's sold through partners)?
2. Is humanshaped.org a secondary domain in the same organization as
   learningischange.com? If so, ben@ is "in the organization" and can
   record and co-host.
3. What does "By default, recordings are saved for three months" mean for
   this organization? Is there a retention rule?
4. Does `spaces.patch` with `meetings.space.settings` succeed on a
   Calendar-created space? This is the first thing the dry run tests.
5. Explicit consent: on? What happens to a participant who declines?
6. Should cohort members be able to download recordings?
7. Do any cohort members lack a Google account? Is visitor sharing
   available on this edition?
8. Will Ben host as meet@, or as himself with co-host promotion?
9. Is the Meet Embed SDK Web publicly available?
