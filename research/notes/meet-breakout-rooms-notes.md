# Breakout rooms on Meet without the built-in feature

*Research by Claude, 2026-10-23. "Not verified" means exactly that. Read
with `meet-addons-and-extensions-notes.md` and `google-meet-notes.md`,
which this builds on.*

## The answer in one paragraph

Meet's own breakout rooms depend on the host's paid edition, and meet@
(Education Fundamentals) doesn't have them. No Google API creates,
fills, or closes breakout rooms, and nothing can move a person from one
call to another. So we build them from parts we mostly already have.
The rooms are ordinary Meet spaces made ahead of time by meet@. Who goes
where lives in our database. The add-on's side panel shows each learner
a link to their room. "Call everyone back" is a row in Supabase that
turns the link into one back to the main call. Most of this already
exists: `tools/meet-events` makes one room per group, and the add-on's
room board (`assets/rooms.js`) lists the rooms and shows when a group
asks for a leader. What's missing is spare rooms for splits that aren't
the standing groups, plus a send and a recall signal.

## 1. Who has built-in breakout rooms

- Google's help page lists these editions: Essentials, Business
  Standard, Business Plus, Enterprise Starter, Enterprise Essentials,
  Enterprise Standard, Enterprise Plus, Education Plus, Teaching and
  Learning Upgrade, Workspace Business, Nonprofits, and Workspace
  Individual Subscriber. **Business Starter, Education Fundamentals, and
  free personal accounts are not on the list.**
- **The host's edition decides.** "Breakout rooms must be started by
  meeting hosts during a meeting on a computer." Participants can join
  from any Google account, or anonymously, on a computer, the current
  mobile apps, or by phone. Google One members "can join, but not
  create."
- Breakout rooms "currently can't be live streamed or recorded."
- Google's Education edition chart shows breakout rooms as no on
  Fundamentals and yes on Education Plus (read from the page's raw HTML
  on 2026-10-22). The Nonprofits edition has them at $0, but
  humanshaped.org sits under an Education tenant, so switching isn't a
  simple step. That one is Ben's call.

## 2. Is there an API? No.

- **Meet REST API v2:** `spaces` offers `create`, `get`, `patch`, and
  `endActiveConference`. Its `SpaceConfig` holds `accessType` (OPEN,
  TRUSTED, or RESTRICTED), `entryPointAccess`, `moderation`,
  `moderationRestrictions`, `attendanceReportGenerationType`, and
  `artifactConfig`. There are no breakout fields. `spaces.members` gives
  people a role (COHOST, or none) so they can join without knocking.
  `conferenceRecords.participants` can list who is in a live call
  (filter `latestEndTime IS NULL`), but it can only read. No method
  moves or removes a person.
- **Meet Add-ons SDK:** `MeetAddonClient` has `startActivity`,
  `endActivity`, `get`/`setActivityStartingState`, `getFrameOpenReason`,
  `getMeetingInfo` (meeting code and ID only), `on`, and `closeAddon`.
  The side panel and main stage can only message each other within one
  person's screen. Nothing reads the participant list or touches
  breakout rooms.
- **Calendar `conferenceData`** makes or attaches a Meet link and has no
  breakout settings. **Apps Script** has no Meet service of its own
  beyond calling the same REST API. Search found no breakout endpoint
  announced through October 2026.

## 3. The $0 way to build it

**What the add-on can and can't do**

- It can show links that open in a new tab. `rooms.js` and `addon.js`
  already use `target="_blank"` and `window.open` from the panel.
- It can't steer the Meet tab to another call, and it can't put the
  person in a call without a click. **Not verified** whether Meet's
  iframe sandbox allows top-level navigation. We assume it doesn't.
- It doesn't know who is in the call. Assignment comes from the
  cohort's own roster, which we already hold, and DECISIONS.md rules
  out reading participants anyway.
- The panel only sees learners who have the add-on open. Anyone else
  gets the same link from `/live/`, which the board already powers, or
  from a link the leader pastes in chat.

**Joining another call from Meet.** The room opens in a second tab while
the first call is still live, so the learner has to leave the main call
or mute it, or there will be echo. That's one button the person
presses. Coming back works the same way in reverse. A room space can be
joined again any time, so nobody is locked out by timing.

**Making rooms: ahead of time, not live.** Make the spaces as meet@ when
setup runs: the group rooms that already exist, plus a pool of spare
rooms per cohort (say 4 to 6). Reuse them every week. No API call
happens during class, so the add-on needs no Google scope at all.
`tools/meet-events` already has the switch (`ROOMS_VIA_MEET_API`) that
makes TRUSTED spaces with members and with leaders as COHOST, using
`meetings.space.created`. Two caveats:

- A member list fixed at setup doesn't fit spare rooms whose people
  change every week. For spare rooms, use OPEN access (anyone with the
  link enters without knocking), or a leader sits in to admit people.
  OPEN is a privacy trade-off: the links are only shown to signed-in
  cohort members, but anyone given a link can enter.
- **Not verified:** whether unused API-made spaces ever expire. Have
  `checkCohort` confirm every room still answers `spaces.get` before
  each cohort.

**Recording and co-hosts don't carry over.** Each space has its own
settings. Recording isn't on Fundamentals in any case
(`tools/session-recorder` handles it). Co-host status is per space, set
through `members` with COHOST. Google says co-hosts can't change
recording or moderation settings.

## 4. What others do

- **Chrome extensions** that made breakout rooms out of extra Meet tabs
  were common before 2020. Every participant has to install one, they
  read and drive the Meet page, and Meet's interface changes break them.
  Earlier notes already rejected extensions. **Not verified:** which,
  if any, still work in 2026.
- **The usual workaround:** teachers paste a set of saved Meet links
  (one Calendar event per room) into chat or a doc, and people click
  their own. That's our design minus the database.
- **Co-Doing and Co-Watching** (shared state inside an activity) were
  limited preview and are "closed to new signups." `startActivity` still
  invites everyone to open the add-on, which is useful at "rooms now"
  for anyone who doesn't have the panel open. Shared state stays in our
  Supabase.

## 5. Recommended design, in steps

1. **Now (exists):** group rooms from `setupCohort`, and the room board
   in the panel and on `/live/` showing each group's link and its
   "we'd like a leader" flag.
2. **Spare rooms (setup only):** `setupCohort` makes N spare spaces and
   saves their links in a `rooms` list on the cohort. No change for
   learners.
3. **Assign (leader, in the panel):** pick standing groups or spare
   rooms, then drag names or deal them at random from the people
   enrolled. Write a `room_assignments` row per person for this session.
4. **Send:** the leader presses "Open rooms." A `live_room_state` row
   (already on Realtime) flips to open. Every learner's panel and
   `/live/` page swaps to a single primary button for their own room,
   with a timer if the run of show gives one. Optionally,
   `startActivity` nudges people who don't have the panel open.
5. **Visit:** leaders see every room's link and its asking flag, which
   is already built.
6. **Call back:** the leader presses "Call everyone back." The row flips
   back, and each learner's button becomes "Back to the main call."
   That pulls people back. It doesn't move them, so leaders still need
   to say it aloud in each room or in chat.
7. **Not possible:** moving people automatically, closing rooms by
   force (`endActiveConference` would end a whole room's call, which is
   blunt but available if wanted), seeing who has arrived without
   reading participants, or one tab for everything.

**Marketplace implications.** If the rooms are made by meet@ through
Apps Script, the add-on asks for no Google scopes, and the private
listing needs no review. `meetings.space.created` is a *sensitive*
scope. In an Internal project used by meet@ it needs no verification.
If the add-on itself ever made spaces as a public listing, that scope
would bring OAuth verification (the earlier notes plan for weeks), plus
a privacy policy page. Keep space creation on meet@.

## Sources (all accessed 2026-10-23)

- Use breakout rooms in Google Meet: https://support.google.com/meet/answer/13054147?hl=en
- Premium Meet features by edition: https://support.google.com/meet/answer/10459644?hl=en
- Meet edition chart (Education): https://edu.google.com/intl/ALL_us/workspace-for-education/products/meet/editions/ (via `meet-addons-and-extensions-notes.md`, 2026-10-22)
- Meet REST API, spaces: https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces
- Meet REST API, spaces.members: https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces.members
- Meet REST API, participants guide: https://developers.google.com/workspace/meet/api/guides/participants
- Meet REST API, scopes: https://developers.google.com/workspace/meet/api/guides/authenticate-authorize
- Meet Add-ons SDK reference: https://developers.google.com/workspace/meet/add-ons/reference/websdk/addon_sdk
- MeetAddonClient: https://developers.google.com/workspace/meet/add-ons/reference/websdk/addon_sdk.meetaddonclient
- Add-ons overview: https://developers.google.com/workspace/meet/add-ons/guides/overview
- Co-Doing closed to new signups: https://developers.google.com/workspace/meet/add-ons/guides/use-CoDoingAPI (via earlier notes)
- Breakout rooms history, 2020: https://workspaceupdates.googleblog.com/2020/11/bringing-breakout-rooms-in-google-meet.html
- Repo: `tools/meet-events/README.md`, `assets/rooms.js`, `assets/addon.js`
