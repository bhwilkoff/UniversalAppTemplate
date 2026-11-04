# Whose calendar should a session live on?

*Research for Ben's question of November 4, 2026, and what was built from
it. Written by Claude, awaiting Ben's review.*

Ben: "Please investigate the best (and most sustainable) way of doing these
calendar events so that we aren't dependent upon a single account for very
much within the system."

## What depends on meet@ today

| Job | How | Could it move? |
|---|---|---|
| Session events, invitations, Meet links | Apps Script, `syncCalendars` | Yes, to the leader's own calendar |
| Group rooms | Apps Script, Meet API | Yes, with the same permission; waits on cohorts of eight or more |
| Recordings and their folder | meet@'s Drive | Yes: the recorder already uses a person's own `drive.file` sign-in |
| Join invitations to people not yet on GitHub | Apps Script, `sendInvitations` | Needs its own answer; GitHub cannot reach someone with no account |
| Teachers' setup requests | Apps Script, `processSetupRequests` | Goes away when a leader's own account does the setup |
| Google Cloud project and Marketplace listing | Owned by two accounts | Stays; it belongs to the project, not to a person's mail |

Reminders moved off this account on November 4.

## What Google allows

- The Calendar API creates an event on the signed-in person's calendar, with
  guests invited (`sendUpdates: all`) and a Meet link (`conferenceData`), so a
  leader can be the real organizer.
- `calendar.events.owned` is narrower than `calendar.events`: events on
  calendars the person owns. Google's pages do not list its sensitivity, so
  read the indicator on the project's consent screen. Assume verification,
  which Google says can take up to ten business days.
- A new scope may also trigger the Marketplace re-review noted on October 28,
  because the add-on and the site share a Cloud project. Check before asking.
- A free personal Google account's host is limited to 60 minutes with three
  or more people, with a chime at 50. The default session is 75 minutes, so a
  leader on a free account could not run one, and a 60-minute session has no
  room to run over. Whether meet@'s own edition lifts this was not checked.
- Calendar feeds (`.ics`) need no Google account, but Google refreshes them on
  its own schedule, reportedly up to 12 hours or more, they carry no
  invitation, and they cannot make a Meet link.

## The options

1. **Stay on meet@.** Automatic, and one account is the failure point for
   every cohort, which gets worse as cohorts grow.
2. **The leader's calendar, by a press in the browser (recommended).** On the
   cohort's page, the leader presses a button, signs in to Google, and the site
   creates every session's event on their calendar with a short-lived token,
   then saves each event's id and Meet link. Nothing of theirs is stored.
3. **The leader's calendar, kept up automatically.** The same, with a stored
   Google refresh token. Fully automatic, but the site would hold a key to
   every leader's calendar, a poor thing to hold for a convenience.
4. **Calendar feeds alone.** Rejected as the main path: slow, no invitations,
   and no Meet link. Possibly a later "subscribe" extra.

## What option 2 changes

- **Better:** one lost or flagged account touches one cohort, not all of them;
  the leader is the call's true host; invitations arrive from a person the
  learners know; Apps Script keeps shrinking.
- **Worse:** a change is no longer automatic. A late joiner or a moved session
  needs the leader to press Update, which belongs in the leader's reminders.
- **Worth deciding:** the organizer's address is visible to guests, and if a
  leader leaves mid-cohort, their events stay with them. A cohort with two
  leaders needs one chosen as the organizer.
- **Unchanged:** the add-on finds a session from the meeting code, so it works
  on any Meet link saved to the session.

Existing cohorts should stay where they are, because moving events changes
Meet links people already have. Minerva finishes on meet@.

## What Ben decided, and what was built

Ben, November 4, 2026: option 2; "Let's just make everything 60 minutes";
recordings go to the leader's Drive, shared with meet@ "so that permissions
still work cleanly"; and of the join email, "Shouldn't the invitation work
just fine from the leader's address because it is being created in Google
Calendar and it is just an invitation?" It should, so people invited from a
time poll are guests on the events, and each event carries the join link.

Built: `cohorts.calendar_by` (`meet` for cohorts made before this),
`private.leader_calendar_rows`, `my_calendar_work`, `my_calendar_done`,
`assets/calendar-lib.js`, `assets/leader-calendar.js`, and a Calendar section
on the cohort's page for leaders. The first leader to send becomes
`calendar_owner`, and only they can update, because the events are theirs. A
leader sees "Update your calendar invitations" on their home page and in their
reminders when a calendar falls behind. meet@'s script is unchanged, and simply
no longer sees these cohorts.

A person who joins with a different address from the one on the poll stays
invited at the old one too, which is harmless but not tidy.

## Sources

[Calendar scopes](https://developers.google.com/workspace/calendar/api/auth),
[creating events](https://developers.google.com/workspace/calendar/api/guides/create-events),
[Meet API overview](https://developers.google.com/workspace/meet/api/guides/overview),
[sensitive scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification),
[Meet requirements and limits](https://support.google.com/meet/answer/7317473?hl=en).
Feed refresh times come from vendors' help pages, not from Google:
[one](https://knowledge.cheqroom.com/helpcenter/how-often-does-google-update-its-calendar-feeds),
[two](https://usecarly.com/blog/google-calendar-ics-refresh-rate/).
