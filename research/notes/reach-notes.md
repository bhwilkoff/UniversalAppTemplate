# Reaching a person who is not on the site

*Research for G4, October 3, 2026. Written by Claude, awaiting Ben's review.*

The hub already puts a teacher's words where a student will see them, as
feedback on a bring-back or as a note on their cohort page and
/account/. That only works if the student comes back to the site, and
the person a teacher most needs to reach, the one who missed a session
and has gone quiet, is the one least likely to. COURSE.md asks for
exactly this: "within two days of a missed session ... the teacher
writes to that person privately." This note asks which channel can
carry that word, and two smaller ones, for nothing.

The three things to carry:

1. **A teacher's private reach-out** after a missed session, in the
   teacher's own words, to one person.
2. **"Something is waiting for you"**: a teacher wrote you a note, or
   someone answered what you shared.
3. **Session reminders.**

## The candidates

### A `mailto:` link, sent from the teacher's own mail

The page opens the teacher's own mail program with the student's address,
a subject, and the teacher's draft already filled in. The teacher reads
it over and presses send themselves.

- **Cost:** nothing. No account, no quota, no service.
- **Privacy:** the address is shown only to a teacher of that student's
  cohort, and only if the student chose to give it for this. The words
  never pass through the hub. The reply comes back to the teacher, which
  is what a private word should allow.
- **Voice:** it is the teacher's own email, from their own address, not a
  message from a system.
- **Limits:** the teacher needs a mail program set up for `mailto:`
  links (most phones and computers have one; a webmail-only teacher can
  copy the address instead). Very long drafts can be cut short by some
  mail programs, so the page keeps the body to a few thousand characters
  and always offers the address to copy.

The address the hub already holds, `calendar_contacts`, was given for
calendar invites only (migration 20261002020000: readable by the student
and the cohort's teachers). Using it for a different purpose without
asking would break the reason it was given, so reaching out needs the
student's own, separate choice.

### Email from meet@humanshaped.org through Apps Script

Apps Script's `MailApp` sends as the account the script runs as. Google's
quota page lists "Email recipients per day" as 100 for consumer accounts
and 1,500 for Google Workspace accounts, and gives no separate figure for
Workspace for Education
(https://developers.google.com/apps-script/guides/services/quotas, read
October 3, 2026). A cohort of 25 getting at most one short email a day
is far inside either number.

- **Cost:** nothing beyond the meet@ account that already exists.
- **Privacy:** the script needs to know who asked for these emails and
  what is waiting for them, so it reads from the hub. It should learn as
  little as it can: an address and two counts, never the words of a note
  or of feedback. The email says only that something is waiting and
  links to the page, so nothing about a student's work sits in a mailbox.
- **Limits:** it needs Ben to set it up once (a secret, a trigger, and
  consent as meet@), and it sends from a shared address, so it is right
  for a notice and wrong for a teacher's private word.

### Supabase Auth's built-in email

Supabase's own sender is limited to "2 messages per hour", sends only to
the project's team members ("All other addresses will fail with the
error message Email address not authorized"), and is "not meant for
production use" (https://supabase.com/docs/guides/auth/auth-smtp, read
October 3, 2026). Using it for students would mean custom SMTP, which
means another account and, at any volume, a bill. **Not used.**

### An @mention in the cohort's discussion on GitHub

GitHub notifies anyone who "had your username @mentioned", on the web, in
GitHub Mobile, and by email if they chose that
(https://docs.github.com/en/subscriptions-and-notifications/concepts/about-notifications,
read October 3, 2026). It costs nothing and every student already has
the account. But the cohort's discussions are read by the whole cohort,
and GitHub has no private messages, so a mention is never private. It is
right for "your question in the thread was answered" and wrong for "I
noticed you were missing." The session thread (C5) already gives
teachers this, with no new build. **Not built further.**

### Web Push

Push notifications from the site itself are free, and a service worker
can run on GitHub Pages. On an iPhone or iPad they work only for a web
app added to the Home Screen: "with iOS and iPadOS 16.4, we are adding
support for Web Push to Home Screen web apps"
(https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/,
read October 3, 2026). Sending needs a server holding keys, which the
hub could do in an Edge Function, but it is the most new machinery of
any option, it reaches the fewest students without extra steps, and a
notification that appears on a phone is the most likely to feel like
being watched. **Not now.**

### Reminders

meet-events already invites every member to the weekly Calendar event,
and Calendar sends its own reminders on each person's own settings. That
is the reminder. **Nothing new to build.**

## The recommendation

- **Primary, for the teacher's private reach-out: `mailto:`, from the
  teacher's own mail, only to students who chose to be written to this
  way.** It costs nothing, needs no account or click from Ben, keeps the
  words out of the hub, and sounds like a person, because it is one.
- **Primary, for "something is waiting for you": a short email from
  meet@ through Apps Script, only to students who asked for it**, with no
  words of the note or feedback in it, at most once a day, behind a
  switch Ben turns on.
- **Fallback, for everyone who chose neither: the hub as it is.** The
  note waits on their cohort page and on /account/, and the teacher's
  list of people to reach out to says plainly that the note is how to
  reach them.

## What a student chooses

Nothing is on until the student turns it on, on /account/, and each
choice is separate:

- **"My teachers may email me"**, with the address they want used, which
  can differ from the calendar one. A teacher of a cohort they are in
  (and have not left) sees the address only in the "write to them by
  email" link and the address beside it.
- **"Email me when something is waiting for me"**, at the same address.

Either can be turned off, and deleting the account deletes the choice.
An AI agent, the student's or a teacher's, never reads the address and
never changes the choice.
