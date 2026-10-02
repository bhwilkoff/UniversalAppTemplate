# The session recorder

I want every live session to be there for the person who missed it, and
I want that to cost nothing. Google Meet's own Record button needs a paid
license on my Education edition, so on October 2, 2026, I decided we
would record with our own tool instead. This is that tool: a Chrome
extension that only the host installs, which records the Meet tab (the
video, the call's audio, and the host's own microphone) and saves the
file on the host's computer and, if the host chooses, in the cohort's
Google Drive folder.

**It records only after the host has told everyone.**

## What it does

- Records the Google Meet tab you are in, as you see it, with the call's
  audio and your microphone mixed together. (Meet never plays your own
  voice back to you, so without the microphone you would be silent in
  your own recording.)
- Keeps playing the call's audio to you while it records, because Chrome
  silences a captured tab unless the extension routes the sound back to
  your speakers.
- Before it starts, shows you the notice to read aloud and paste into the
  Meet chat, with a button that copies it, and it will not start until
  you tick the box that says you have done both.
- Shows a red REC badge on its button for as long as it records, beside
  the capture indicator Chrome itself puts on the tab.
- Writes the recording to disk in ten-second pieces as it goes, so a
  90-minute session never sits in memory, and a crash or a closed tab
  still leaves everything recorded up to that moment.
- When you stop, opens a page where you save the WebM file to your
  computer and, if you want, upload it to the cohort's Drive folder as
  meet@humanshaped.org. An upload that fails keeps the local copy, tells
  you what went wrong, and picks up where it stopped when you try again.

## What it does not do

It does not press Meet's Record button, read Meet's page, post into the
chat for you, or do anything for the other people in the call. It does
not record breakout rooms on its own, but it records whatever your tab
shows, so stop the recording before you join a breakout room (the notice
promises this). It does not edit or trim, and it never deletes a
recording from your computer unless you press Delete and confirm.

The file is a WebM, which Drive and Chrome play. MediaRecorder writes
WebM without a seek index, so some players show no length and seek
slowly. If that bothers anyone, `ffmpeg -i in.webm -c copy out.webm`
(free) rewrites it with one, without re-encoding.

## Consent, and the law

Meet tells people when its own recording starts. It knows nothing about
this extension, so the announcement is our job, and the tool will not
let you skip it. Some US states (California is the best-known example)
require everyone in a conversation to agree before it is recorded, and
cohort members join from everywhere, so we treat every session as if
that rule applies: say it out loud, post it in the chat, and give people
a way to stay out of frame. The notice the extension copies is:

> I am recording this session for (cohort name) now, so that anyone who
> misses it can watch it later. The recording goes only to this cohort's
> members, in our shared Google Drive folder, and nowhere else. If you
> would rather not appear, turn your camera off and use the chat, or tell
> me and I will trim your part. Breakout rooms are not recorded, and I
> will stop the recording before we split up.

The same promise belongs on the cohort sign-up page and in the covenant,
so nobody hears it for the first time in the call. (I am not a lawyer,
and this is not legal advice. It is the most careful version of the rule
I know.)

## Permissions, and why each one

| Permission | Why |
|---|---|
| `tabCapture` | Capture the Meet tab's video and audio. |
| `offscreen` | Run MediaRecorder in a hidden page, since a Manifest V3 service worker has none. |
| `activeTab` | Read the address of the tab you pressed the button in, to confirm it is a Meet call. |
| `identity` | Sign in to Drive as the account this Chrome profile uses. |
| `storage` | Remember the cohort folder list and the last cohort you chose. |

There is no host permission and no content script, because nothing here
touches Meet's page. The only OAuth scope is `drive.file`, which lets the
extension create files and see only the files it made, never the rest of
meet@'s Drive.

## Set it up

Signing in to Drive uses whatever account the Chrome profile is signed in
to, so the first step is a Chrome profile that belongs to
meet@humanshaped.org. Hosting from that profile also makes meet@ the
host in Meet, which is what we want.

1. **Make the meet@ Chrome profile.** In Chrome, open the profile menu,
   add a profile, and sign in as meet@humanshaped.org. Do everything below
   in that profile.
2. **Load the extension.** Open `chrome://extensions`, turn on Developer
   mode, press "Load unpacked", and choose the `extension/` folder inside
   this one. Chrome shows its ID (32 letters). The ID stays the same as
   long as you load it from the same folder on the same computer.
3. **Allow the microphone.** Open the extension's options (right-click
   its button, then Options) and press "Allow microphone". Chrome can only
   ask on a page you can see, and the recorder runs on a hidden one.
4. **Create the OAuth client**, signed in to the Google Cloud console as
   meet@humanshaped.org, in the same project the meet-events script uses
   (its README sets that project up):
   1. Google Auth Platform, Audience: the user type is **Internal**, so
      only humanshaped.org accounts can sign in and Google does not need to
      review the app.
   2. APIs and services: enable the **Google Drive API**.
   3. Clients, Create client, application type **Chrome Extension**, any
      name, and the extension ID from step 2 in the **Item ID** field
      ([Chrome's guide](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth)).
   4. Copy the client ID into `extension/manifest.json`, replacing
      `REPLACE_WITH_CLIENT_ID.apps.googleusercontent.com`, and press the
      reload arrow on the extension's card in `chrome://extensions`.
5. **Check Drive.** In the options page, press "Check Drive sign-in" and
   allow access. It should say it is signed in as meet@humanshaped.org.
6. **Add the cohort folders.** When the meet-events script sets up a
   cohort it prints a line like `c1 | Cohort 1 | 1AbC...`. Paste one line
   per cohort into the options page and save.

If you ever move the folder, the ID changes and the OAuth client stops
matching. To pin the ID, generate a key once and add it to the manifest:
`openssl genrsa 2048 | openssl pkcs8 -topk8 -nocrypt -out key.pem`, then
`openssl rsa -in key.pem -pubout -outform DER | openssl base64 -A` and put
that output in a `"key"` field in `manifest.json`. Keep `key.pem` out of
the repository.

## Record a session

Open the call in the meet@ profile, press the extension's button, choose
the cohort, read the notice aloud, press "Copy notice" and paste it into
the chat, tick the box, and press Start. You can close the little window;
the REC badge stays until you stop. When you press "Stop and save" (or
the Meet tab closes), a page opens with the recording, where you save it
and upload it. Everything stays listed on that page until you delete it,
so a failed upload is never a lost session.

### If the upload lands in the wrong place

The `drive.file` scope means the extension may not be allowed to reach a
folder the meet-events script made, even in the same Cloud project (I
could not confirm this in Google's documentation, so the tool plans for
both). When that happens the extension puts the file at the top of
meet@'s My Drive, tags it with the cohort, and says so on the page. Run
`fileStrayRecordings` in the meet-events script and it moves every tagged
file into its cohort's folder, where the cohort can see it.
`checkCohort` reports any that are still outside.

## Tests

`npm test` in this folder runs the pure logic (file names, the notice,
folder-link parsing, chunk sizes) and runs the real upload code against a
fake Drive that drops a connection, accepts a short write, expires a
token and refuses a folder. `npm run check` runs `node --check` on every
script and parses the manifest. Neither needs Chrome or a network.

## The test call before the first session

The parts that touch Chrome's capture and Google's servers can only be
checked by hand. I want this done once, start to finish, before cohort 1.
You need the meet@ profile, a second device signed in to a personal Gmail
account (that account stands in for a cohort member), and a test cohort
set up by meet-events with the Gmail account as its only member.

1. Open the extension on a tab that is not a Meet call. It should say to
   open the call first.
2. Start a Meet call as meet@ and join it from the second device.
3. Press the button. Start should stay grey until you tick the box.
   Press "Copy notice" and paste it into the Meet chat.
4. Start. The REC badge appears, the timer counts, and you can still hear
   the second device.
5. Talk from both sides for two minutes, share a screen for a moment, and
   press "Stop and save". The recordings page opens on this session.
6. Save it to the computer and play it: both voices, the video, and the
   shared screen should all be there.
7. Upload to the test cohort's folder. Open the link it gives, then open
   the folder from the Gmail account: the recording should be there and
   playable.
8. Start another recording and turn off Wi-Fi halfway through its upload.
   The page should say the upload did not finish and offer to resume;
   turn Wi-Fi back on and resume.
9. Start another recording and close the Meet tab. It should stop by
   itself, and the page should say why.
10. Paste a folder ID that meet@ cannot reach and upload. The page should
    say the file went to My Drive; `fileStrayRecordings` should then move
    it.
11. Record for the length of a real session (90 minutes, with the call
    running). In Chrome's Task Manager the extension's memory should stay
    flat, and the file should come out near the size the popup estimated.

Bring back what step 11 measured; it tells us whether the 1080p setting
is the right default.
