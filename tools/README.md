# Live session tools

Two decisions from October 2, 2026, shape everything in this folder. The
first is that sessions are recorded and kept on Google Drive, always
available to the cohort's members. The second is that this has to cost
nothing to run, so Meet's own recording (which needs a paid license on my
Education edition) is out. These two tools are how we keep both promises,
and they both work as meet@humanshaped.org, the account that hosts every
session, so nothing depends on my personal login.

**One tool sets up the room, the other records it.**

- [`meet-events/`](meet-events/) is a Google Apps Script that makes a
  cohort's weekly Calendar event with its Meet link, invites the members,
  makes the cohort's recordings folder in Drive and shares it with them,
  and checks that all of it is right.
- [`session-recorder/`](session-recorder/) is a Chrome extension that
  only the host installs. After the host has told everyone, it records
  the Meet tab with the host's microphone, keeps the file on the host's
  computer, and uploads it to the cohort's folder.
- [`meet-addon/`](meet-addon/) is the deployment file and setup steps
  for the Human Shaped add-on inside Meet (the side panel at `/addon/`
  and the main stage at `/addon/stage/`), tested on our own accounts
  first and then listed publicly. It records nothing.

Neither one keeps anything of a student's beyond the email address they
gave us for the invite, which follows the rule that the hub owns only
what people choose to share. Each README has its setup steps, split into
what I have to click and what an agent can do.

## How a session is recorded and shared

Before a cohort starts, I run `setupCohort` in the event tool. Everyone
gets a Calendar invite that carries the Meet link, the session page, and
a link to the cohort's recordings folder, and the folder is already
shared with each of them so that nothing has to be shared later. I paste
the line the script prints into the recorder's settings, so the cohort
shows up in its list.

On the day, I open the call in the Chrome profile signed in as
meet@humanshaped.org, press the recorder's button, and choose the cohort.
I say out loud that I am recording, who will see it and how to stay out
of it, and paste the same words into the chat; the recorder will not
start until I tick the box that says I have. The red REC badge stays on
the whole time, and before we split into breakout rooms I stop it.

When I press "Stop and save", a page opens with the recording. I save
the file to my computer first, then upload it to the cohort's folder,
and because the folder is already shared, every member can watch it in
Drive as soon as the upload finishes. If anything fails along the way,
the recording stays on my computer and the page tells me what happened,
so a session is never lost to a bad connection.

The cost of doing it this way is that the recording depends on my
computer and my attention: if I forget to press Start, nothing records,
and Meet will not remind me. The check in the event tool and the habit of
the notice are what we have instead of a paid button.

Run the test call in the recorder's README before cohort 1, and bring
back what it found.
