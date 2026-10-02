# The cohort event tool

I want setting up a cohort's live sessions to be something I can do in
a minute and trust, rather than an afternoon of clicking that I check by
hoping. On October 2, 2026, I set up meet@humanshaped.org as the account
that hosts every session, so that nothing about a cohort depends on my
own login. This Google Apps Script runs as that account. From one cohort
definition it makes the weekly Calendar event with a Meet link and the
session page in its description, invites the members, makes the
cohort's recordings folder in Drive and shares it with them, and then
checks all of it and tells you in plain words what is right and what is
not.

**It uses only free services: Calendar, Drive, Sheets and Apps Script.**

It does not turn on Meet's recording, transcripts or Gemini notes, because
those need a paid license on our edition. The session-recorder extension
records instead, and uploads into the folder this script makes.

## The cohort definition

One object per cohort, either as a JSON array in the Script Property
`COHORTS_JSON`, or as rows in a Google Sheet whose ID is in the Script
Property `COHORT_SHEET_ID`, on a tab named `Cohorts` whose header row uses
these names:

```json
{
  "id": "c1",
  "title": "Human Shaped Software, cohort 1",
  "startDate": "2026-10-19",
  "weekday": "TU",
  "startTime": "17:00",
  "timeZone": "America/Denver",
  "minutes": 90,
  "sessions": 5,
  "members": "student@gmail.com, another@example.org",
  "teachers": "teacher@example.org",
  "sessionUrl": "https://humanshaped.org/live/c1/"
}
```

The first session is the first `weekday` on or after `startDate`, at
`startTime` in `timeZone`. Members can be a list or one string with
commas or new lines. Teachers are optional; they are invited too and get
edit access to the folder so they can trim a recording.

## What each function does

The editor's Run button cannot pass an argument, so every function uses
the cohort named in the Script Property `ACTIVE_COHORT` unless you hand
it an id.

| Function | What it does |
|---|---|
| `whoAmI` | Says which account the script is running as. It should be meet@humanshaped.org. |
| `previewCohort` | Reads the definition, finds its mistakes, and says what setup would do. Changes nothing. |
| `setupCohort` | Makes (or updates) the event, the Meet link, the guest list and the folder, syncs the folder's sharing to the roster, prints the line for the recorder extension, then runs the check. Running it again after a roster change brings everything back in line. |
| `checkCohort` | The "check it works" report: the event exists, repeats the right number of weeks, starts at the right time, links the session page, has a Meet link, and invites exactly the roster; the folder exists, belongs to meet@, is shared with exactly the roster, has no "anyone with the link" sharing, and has no cohort recordings stranded outside it. Changes nothing. |
| `fileStrayRecordings` | Moves recorder uploads that landed at the top of My Drive into the cohort's folder (see the recorder's README for why that can happen). |

The report reads like this:

```
Check for c1: 1 problem(s).
  ok       Running as meet@humanshaped.org.
  ok       The event exists: https://www.google.com/calendar/event?eid=...
  ok       It repeats every TU for 5 sessions.
  ok       It has a Meet link: https://meet.google.com/abc-defg-hij
  PROBLEM  Not shared with: new@example.org. Run setupCohort, and if it still fails, that address probably has no Google account.
```

Two privacy choices are built in. Guests cannot see one another's email
addresses on the invite, because each member gave their email to the
host and not to the whole cohort. Drive does show a folder's viewers to
anyone who can open it, though, so classmates who open the recordings
folder can see who else it is shared with. If that matters for a cohort,
say so at sign-up.

Drive only shares with an email address that has a Google account behind
it. Anyone without one can make a free Google account on their existing
email address, and the check names everyone the folder could not reach.

## Who does what

### Ben, once, in the Admin console

Signed in as an administrator at admin.google.com. These paths are the
standard ones; Google moves them now and then, so search the console for
the setting's name if a path has changed.

1. **Give meet@ its own organizational unit.** Directory, Users,
   meet@humanshaped.org, Change organizational unit, and make one such as
   `/Live sessions`. Every setting below then applies to that unit alone,
   and none of it reaches students or staff in learningischange.com.
2. **Let meet@ share Drive files outside the organization.** Apps, Google
   Workspace, Drive and Docs, Sharing settings, for that unit: sharing
   outside the organization **on**, with no allowlist of domains, because
   members use personal accounts.
3. **Let people outside the organization join meet@'s calls.** Apps,
   Google Workspace, Google Meet, Meet safety settings, for that unit:
   allow joining meetings from outside the domain.
4. **Let meet@ invite outside guests.** Apps, Google Workspace, Calendar,
   Sharing settings, for that unit: external invitations allowed.
5. **Let meet@ use Google Cloud and Apps Script.** Apps, Additional Google
   services, Google Cloud Platform: **on** for that unit, and make sure
   Apps Script is not turned off for it. Education organizations sometimes
   turn Cloud off by default.
6. **If the recorder's Drive sign-in says access is blocked:** Security,
   Access and data control, API controls, Manage third-party app access,
   find the recorder's OAuth client and mark it Trusted.
7. **Storage:** recordings count against the organization's pooled
   storage. A 90-minute session at the recorder's 1080p setting is about
   1.8 GB.

### Ben, once, signed in as meet@humanshaped.org

1. **Make the Cloud project.** At console.cloud.google.com, create a
   project (say `humanshaped-live`). In Google Auth Platform, set the
   audience to **Internal**, which keeps it to humanshaped.org accounts and
   means Google does not have to review it. Enable the **Google Calendar
   API** and the **Google Drive API**. Note the project number on the
   dashboard. The recorder's OAuth client goes in this same project.
2. **Turn on the Apps Script API for clasp**, at
   https://script.google.com/home/usersettings, if an agent will push the
   code.
3. **Log clasp in** (`clasp login`) when the agent asks, and approve it in
   the browser as meet@.
4. **Point the script at the Cloud project:** in the script editor,
   Project Settings, Google Cloud Platform project, Change project, and
   paste the project number.
5. **Set the Script Properties** (Project Settings, Script Properties):
   `ACTIVE_COHORT`, and either `COHORTS_JSON` or `COHORT_SHEET_ID`.
   Optional: `RECORDINGS_PARENT_FOLDER_ID` to keep every cohort's folder
   inside one parent, and `HOST_EMAIL` if the host is ever not
   meet@humanshaped.org.
6. **Run `whoAmI` from the editor** and press Allow on the consent screen.
   That one click authorizes everything the script does.

### What an agent can do with clasp

[clasp](https://github.com/google/clasp) is Google's command-line tool for
Apps Script. Once Ben has done steps 2 and 3, an agent can create the
project and keep it in step with this folder:

```sh
npm install -g @google/clasp
cd tools/meet-events
clasp create --type standalone --title "Human Shaped live sessions"
clasp push
```

(clasp 3 renamed some commands; `clasp --help` shows the current ones.)
`.claspignore` pushes only `Code.gs` and `appsscript.json`, and
`.gitignore` keeps `.clasp.json` out of this public repository. Running
functions from the command line (`clasp run`) needs extra setup, so the
editor's Run button is the simpler way, and the first run has to be
there anyway for the consent click.

The agent can also change the code, run the tests, and write the cohort
definitions. It cannot click Allow, change Admin console settings, or
make the Cloud project; those stay with Ben.

## Scopes and services

`appsscript.json` turns on the Calendar (v3) and Drive (v3) advanced
services and asks for exactly these scopes:

| Scope | Why |
|---|---|
| `calendar.events` | Create, update and read the cohort's event and its Meet link. |
| `drive` | Make the folder, share it, read its sharing, and move stray recordings into it. Drive's narrower `drive.file` scope may not see the recorder's uploads (Google's documentation does not say), so this one is needed; an Internal app does not need Google's review for it. |
| `spreadsheets.readonly` | Read the Cohorts sheet, if you use one. |
| `userinfo.email` | Confirm the script runs as meet@. |

## Tests

`node --test test/code.test.mjs` loads `Code.gs` into a sandbox with no
Google services and tests the pure parts: reading a definition (from JSON
or a Sheet row), finding the first session, crossing midnight, the event
it would send, the sharing diff, and the line it prints for the recorder.
Everything that talks to Google is checked by `checkCohort` itself, and
by the test call in the recorder's README.

## Before the first cohort

Set up a test cohort whose only member is a personal Gmail account, run
`setupCohort`, and read the report. Then accept the invite from that
Gmail account, open the Meet link and the folder link from the invite,
and bring back anything the report said that the Gmail account did not
see.
