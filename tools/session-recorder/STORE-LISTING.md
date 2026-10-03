# The Chrome Web Store listing, drafted

*Written by Claude, awaiting Ben's review. Nothing here is submitted.*

The words below are what the store asks for when the recorder is
listed, written to match what the extension does in version 0.2.0. The
listing says nothing the code does not do, so if the code changes, this
changes with it.

## Name

Human Shaped session recorder

## Short description (the store allows 132 characters)

Records a Google Meet session you host, after you tell everyone, and
saves it to your computer and your cohort's Drive folder.

## Description

I made this recorder for teachers who host free Human Shaped cohorts on
Google Meet, so that anyone who misses a session can watch it later, and
so that recording costs nothing.

It records the Meet tab you are in, with the call's sound and your own
microphone, and it will not start until you have told everyone in the
call and posted the notice it gives you in the chat. While it records,
a red REC badge stays on its button, beside the capture mark Chrome puts
on the tab. It writes the recording to your computer as it goes, so a
crash or a closed tab keeps everything up to that moment, and when you
stop, you save the file and, if you choose, upload it to the cohort's
Google Drive folder.

You can mark a moment as it happens, with a button or a keyboard
shortcut, and make a short clip of it afterwards, from 30 seconds before
the mark to 90 seconds after, to share back with the cohort.

If you turn it on, it also counts how much you talk compared with
everyone else in the call, from the sound alone. It never knows who else
talked or what anyone said, it keeps no sound for this, and at the end
only you see the number, which you can keep or let go.

It does not read Meet's page, join the call, post in the chat, or do
anything for the other people in the call. It has no content script and
no access to any website.

## Category

Education

## Single purpose (the store asks for one)

Recording a Google Meet session the user hosts, with their announcement
first, and saving it to their computer and their own Google Drive.

## Why each permission is needed

- **tabCapture:** to capture the Meet tab's picture and sound when the
  host presses Start.
- **offscreen:** to run the recorder in a hidden page, because an
  extension's background worker has no way to record.
- **activeTab:** to read the address of the tab where the host pressed
  the button, to make sure it is a Meet call.
- **identity:** to sign in to Google Drive as the host, for the upload
  the host chooses.
- **storage:** to remember the cohort folders and the last cohort chosen.

The only Google sign-in scope is `drive.file`, which lets the extension
see only the files it made.

## Privacy practices (the store's form)

- **What it collects:** the recording itself, which stays on the host's
  computer and goes only to the Drive folder the host chooses. The talk
  count is a few numbers kept on the host's computer.
- **What it sends anywhere:** only the recording, to Google Drive, when
  the host presses Upload.
- **It does not** sell data, use it for anything but recording, use it
  to decide anyone's credit or lending, or send anything to Human Shaped.
- **Privacy policy:** https://humanshaped.org/privacy/ (its own section
  on the recorder should be checked against this listing before
  submitting).

## Pictures the store needs

- An icon, 128 by 128 pixels (the store asks for 96 by 96 of artwork
  inside it).
- At least one screenshot, 1280 by 800 or 640 by 400: the popup before
  starting (with the notice), the popup while recording (with "Mark
  it"), and the finish page with a clip and the talk share.
- A small promotional tile, 440 by 280, is optional.
