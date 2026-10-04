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
  "sessionUrl": "https://humanshaped.org/live/?c=c1"
}
```

The first session is the first `weekday` on or after `startDate`, at
`startTime` in `timeZone`. Members can be a list or one string with
commas or new lines. Teachers are optional; they are invited too and get
edit access to the folder so they can trim a recording.

### A room for each group

I want each group to show its work in a room of its own, and Meet on
Workspace for Education Fundamentals (which we are likely on, though
nobody has confirmed the edition yet) has no breakout rooms. So the
setup that /teach/ copies can carry the cohort's groups:

```json
"groups": [
  { "key": "g-1a2b3c4d", "name": "Trio A", "members": "a@example.org, b@example.org" }
]
```

For each group, `setupCohort` makes one recurring event at the cohort's
own times, with a Meet link, the group's members and the teachers
invited (quietly, with no email, because the session page sends people
to their room when the group part begins), and prints each room's link
for the teacher to paste into that group on /teach/. The key is the
start of the group's id, so renaming a group keeps its room. In a Sheet,
put the same list as JSON in a `groups` column. `checkCohort` says
whether every group has its room and link.

**Not yet verified:** whether a group member on a personal Gmail account
can join their room without being let in when nobody from
humanshaped.org is there. Being invited on the event should let them
in; test it with the Gmail account below before the first cohort, and if
it does not, the fallback is pasting rooms made by hand on /teach/.

### Rooms through the Meet REST API (C2)

*Written by Claude, awaiting Ben's review.*

A room made as a Calendar event lets its invited guests in, but nobody
can say who else may come in or who helps run the call. So setup can
make each group's room another way: as a Meet space made through the
Meet REST API, which Google made generally available for members on
September 11, 2026 (its release notes). Each room is then:

- **TRUSTED**, which Google describes as letting in "members of the
  host's organization, invited external users, and dial-in users"
  without knocking, while everyone else knocks;
- given the group's people as **members**, who can "join without
  knocking";
- given the teachers as **co-hosts**, who can help run the call
  (Google says co-hosts cannot change its recording or moderation
  settings).

It is off until you turn it on, and the Calendar rooms stay the
fallback. To turn it on:

1. As meet@humanshaped.org, in the Cloud project `human-shaped`, open
   APIs and services, Library, and enable the **Google Meet REST API**.
2. Push the code (`clasp push`), which adds two scopes:
   `meetings.space.created` (make rooms and set their members) and
   `script.external_request` (the script calls the Meet API itself).
3. In the editor, run `whoAmI` once and press Allow on the new consent
   screen, which now lists making Meet rooms.
4. Add the Script Property `ROOMS_VIA_MEET_API` with the value `true`.
5. Run `setupCohort`. It prints a line for each group, a Meet link and
   the room's `spaces/` name, and `checkCohort` reports each room's
   access and members. On /teach/, paste everything after the group's
   name into that group's "Its own Meet room"; the page keeps both.

Running `setupCohort` again after the groups change sets every room's
members to match: it adds the new people, removes those who left, and
fixes a teacher who is not yet a co-host.

**Not verified yet, and each needs the test call:**

- whether a member on a personal Gmail account counts as an "invited
  external user" and joins without knocking when nobody from
  humanshaped.org is in the room;
- whether Workspace for Education Fundamentals allows the Meet REST API
  for meet@ at all (the docs name no edition);
- whether adding a member sends them any email (the docs do not say;
  we hope not, because the session page is how people find their room);
- the exact Admin console setting if Google refuses the API for the
  organization.

## What each function does

The editor's Run button cannot pass an argument, so every function uses
the cohort named in the Script Property `ACTIVE_COHORT` unless you hand
it an id.

| Function | What it does |
|---|---|
| `whoAmI` | Says which account the script is running as. It should be meet@humanshaped.org. |
| `previewCohort` | Reads the definition, finds its mistakes, and says what setup would do. Changes nothing. |
| `setupCohort` | Makes (or updates) the event, the Meet link, the guest list and the folder, syncs the folder's sharing to the roster, makes each group's room (see above), prints the line for the recorder extension, then runs the check. Running it again after a roster change brings everything back in line. |
| `checkCohort` | The "check it works" report: the event exists, repeats the right number of weeks, starts at the right time, links the session page, has a Meet link, and invites exactly the roster; the folder exists, belongs to meet@, is shared with exactly the roster, has no "anyone with the link" sharing, and has no cohort recordings stranded outside it; and each group has its room (with the Meet API, TRUSTED and with the right members). Changes nothing. |
| `fileStrayRecordings` | Moves recorder uploads that landed at the top of My Drive into the cohort's folder (see the recorder's README for why that can happen). |
| `sendNotices` | Off unless `NOTICES_ON` is `true`. Asks the hub who asked to hear when something is waiting for them, emails each of them one short line with a link (never the words of a note or feedback), and tells the hub who was sent one. Meant for a daily trigger. |
| `processSetupRequests` | Off unless `SETUP_QUEUE_ON` is `true`. Takes the requests teachers made on /teach/ (see "Requests from /teach/" above), runs `setupCohort` on each one's setup, and reports the Meet link and the group rooms back to the hub. Meant for an hourly trigger. |

### "Something is waiting for you" emails (G4)

*Written by Claude, awaiting Ben's review.* On /account/, a person can ask
for a short email when a teacher writes them a note or someone answers
what they shared (research/notes/reach-notes.md). This script sends it,
as meet@, at most once a day per person. Apps Script allows 1,500 email
recipients a day on a Workspace account
(https://developers.google.com/apps-script/guides/services/quotas).

The script never reads the database itself. It asks the hub's `notices`
Edge Function, which hands back an address and two counts per person and
nothing else, and only to meet@humanshaped.org itself.

**How the hub knows it is meet@, with nothing to paste.** The script sends
the Google ID token Apps Script gives the account it runs as
(`ScriptApp.getIdentityToken()`, which needs the `openid` scope in
`appsscript.json`). The hub checks Google's signature against Google's
published keys, that the token is current, that it speaks for a verified
meet@humanshaped.org in humanshaped.org, and that it was issued to this
script's own Cloud project (an OAuth client ID beginning
`1086485459450-`). `whoAmI` prints the exact client ID; the agent can then
pin it in Supabase as `GOOGLE_ID_AUDIENCES`. The function addresses are
built into `Code.gs` (`HUB_FUNCTIONS`), so there are no URLs to set either.
The older shared secrets still work while they are set in Supabase, and
can be removed once the token has worked.

Ben's steps, once:

1. **Run `whoAmI` from the editor and press Allow** as meet@. That one
   consent covers everything here: email (`script.send_mail`), the
   identity token (`openid`), and calling the hub.

The agent's steps, after that: set `NOTICES_ON` = `true` in Script
Properties, run `sendNotices` once (with no one waiting it says "Sent 0
notice(s)" and how much mail is left today), and add the daily trigger
(Triggers, Add Trigger, `sendNotices`, time-driven, day timer).

*Check:* sign in as a test student, turn on "Email me ... when a teacher
writes me a note" on /account/ with an address you can read, have a
teacher send that student a note, wait 20 hours (or, for a test, run
`sendNotices` the next day), and see one email arrive with no words of
the note in it. Run `sendNotices` again and nothing more is sent.

To stop it at once, set `NOTICES_ON` to anything but `true`.

### Requests from /teach/ (G1)

*Written by Claude, awaiting Ben's review.* A teacher who is not Ben
cannot run this script, because the events, rooms, and folders belong to
meet@. So on /teach/, under "Before the first session", a teacher presses
"Ask meet@humanshaped.org to make the weekly event, its Meet link, and a
room for each group". The request waits in the hub (`setup_requests`,
migration 20261004000000), with no email address in it.
`processSetupRequests`, run every hour by a trigger, takes the waiting
requests through the hub's `setup-queue` Edge Function, which hands over
each cohort's setup in the same shape /teach/ copies, with the invitation
emails read at that moment. It runs `setupCohort` on each, then reports
the weekly Meet link and each group's room back, and the hub puts them on
every week and every group, so the teacher's steps check themselves off.
A request that fails says why on /teach/, and the teacher asks again.

It proves it is meet@ the same way as the notices above, with its Google
ID token, so there is nothing to paste. Ben's only step is the same
`whoAmI` and Allow. The agent's steps, after that: set `SETUP_QUEUE_ON` =
`true` in Script Properties, run `processSetupRequests` once (with nothing
waiting it says "No requests are waiting."), and add the hourly trigger
(Triggers, Add Trigger, `processSetupRequests`, time-driven, hour timer,
every hour).

*Check:* as a test teacher, make a draft cohort with dates, make its
weekly sessions, give your own email for invitations on its cohort page,
and press the button on /teach/. Within the hour (or after running
`processSetupRequests` by hand), each week on /teach/ shows the Meet link,
and the invitation is in your mail.

To stop it at once, set `SETUP_QUEUE_ON` to anything but `true`.

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
| `meetings.space.created` | Make each group's room as a Meet space, and set its access and members (only with `ROOMS_VIA_MEET_API`). |
| `script.external_request` | Call the Meet REST API, which has no advanced service in Apps Script, and ask the hub's `notices` function who to email. |
| `script.send_mail` | Send the "something is waiting for you" email, only to people who asked for it, and only when `NOTICES_ON` is `true`. |

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
