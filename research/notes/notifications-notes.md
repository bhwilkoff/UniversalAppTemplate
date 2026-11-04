# Reminders that help someone finish: a notification system for cohorts

*Research for Ben's request of November 4, 2026, and what was built from
it. Written by Claude, awaiting Ben's review.*

Ben: "If there is something left 'undone', the system should nudge them to
do it with notifications (github is preferred, but I'm okay with regular
emails being sent as notifications too)," and it "should be entirely
action oriented (i.e., the cohort members know what they need to do and
have direct links whenever possible to get it done)."

## What exists today

| Piece | State, measured November 4, 2026 |
|---|---|
| `notice_digest` + `sendNotices` | A daily email of counts, for people who opted in. It covers things that happened to you, never things left undone. One of the four Minerva learners has opted in. Whether `NOTICES_ON` is set could not be read from here |
| `github-tick` | Opens each session's thread the day before, through `humanshaped/automation` |
| GitHub's schedule | The workflow says hourly. Across the last 40 scheduled runs the gap was 2.6 to 10.7 hours, with a median of 6.2. It cannot be trusted for timing |
| Apps Script | Already sends invitations from meet@, on its own time-driven triggers |
| `setupSteps` on the cohort page | Knows the setup steps, and marks some as unknowable (the add-on, connecting an agent) |
| `github_access` | Can go stale: one learner's row still says invited from October 23, while GitHub shows them as a member. That is why they sit on read rather than write |
| Supabase Cron | Not enabled |

A reminder built on the stale row would tell someone to accept an
invitation they already accepted, so a reminder must read the truth at
the moment it is sent.

## What GitHub can and cannot carry

Checked against GitHub's documentation:

- A mention notifies someone only if they have read access and, for an
  organization's repository, are a member of it. Someone who has not
  accepted an invitation cannot be reached this way.
- GitHub has no private messages, and everything in a cohort repository
  is visible to the whole cohort.
- Nothing lets an app see whether a notification was read, so "done" must
  be judged from the action itself.
- Not documented, so it was tested below: whether a GitHub App's activity
  notifies anyone. Community reports say a bot's team mention does not, so
  mention people, never teams.

So a personal "you have not done this" cannot go through a shared
repository without showing it to everyone else.

## Email

Apps Script allows 1,500 recipients a day on Workspace, which is far above
anything a cohort needs. The rules for bulk senders (DMARC, one-click
unsubscribe) start at 5,000 a day, and every sender still needs SPF or
DKIM. These reminders are service messages about a course someone joined,
as long as they promote nothing, so a future cohort is never announced in
one. A stop link is worth having anyway, because it respects people and
protects the spam rate. This is not legal advice. MailApp documents no
custom headers, so a true one-click unsubscribe header would need the
Gmail API; a plain link in the body is enough at this size.

## What the evidence says

Reminders are memory aids, not motivators, and should be expected to do
little on their own.

- Large studies find small or no effects: nudge units average 1.4 points
  against 8.7 in journals (DellaVigna and Linos), and about 25,000 students
  (Oreopoulos and Petronijevic) and 800,000 (Bird et al.) showed no
  academic effect.
- What helps is specific. Reminders naming the actual item worked where
  generic ones did nothing (Karlan et al.), the best vaccination text said
  a shot was "waiting" for the person (Milkman et al.), and writing down a
  date and time beat a date alone.
- A person helps more than a message: coaching raised retention 5.2 points
  (Bettinger and Baker). So the system should hand the leader what it
  cannot finish.
- More is worse. Weekly reminders beat twice-weekly, reminders raise
  unsubscribes along with action (Damgaard and Gravert), and acceptance
  fell about 30% with each repeat in a clinical setting (Ancker et al.).
- Batches beat a stream: three a day lowered stress, and hourly did little
  (Fitz et al.).
- Showing people their peers can backfire: exemplary peer work made MOOC
  learners quit (Rogers and Feller), and peer information discouraged
  savers (Beshears et al.).

No study matches a cohort of four to twenty adults, so the numbers below
are a judgment, and the cohort will tell us if they are wrong. Most of
those summaries came from abstracts rather than full papers.

## Patterns worth taking

Google Classroom's digest of what is missing and upcoming; Linear's rule
that nothing is sent if it no longer applies; Basecamp's "Stop asking me"
and work hours; Slack's one-tap "tomorrow". Not Duolingo's streak pressure.

## What was built, November 4, 2026

Ben's decisions: reminders are on by default; GitHub does the sending,
because "It also doesn't use app script that we keep having to modify" and
a single Google account "can easily be flagged as spam"; once a day, with
triggered events as well; and leaders get notifications too.

GitHub has no private messages, so each person has a private repository of
their own, `humanshaped/reminders-<login>`, that only they and the
organization's owners can open, with one issue per cohort. The app comments
there, and GitHub emails them.

**Tested before building.** As the app, in a private test repository, with
a test learner: an assigned new issue, a new issue with a mention, a comment
on an assigned issue, and a comment with a mention all reached the learner's
inbox within seconds, from `notifications@github.com`, and the repository's
admin received nothing. This settles the open question above for people, and
team mentions remain unused. Assigning sends two emails where a mention
sends one, so the thread uses mentions. A test account's defaults are not
proof of everyone's: a person whose GitHub email notifications are off
receives nothing, and we cannot see that.

**One list.** `private.open_items` answers what is open for a person. The
home page and the message read it, and `assets/reminders-lib.js` holds the
words and the timing for both.

| Open item | How it is known | Goes to |
|---|---|---|
| Answer the pre-work questions | `prep_answers` | That session's page |
| Reply to the exchange | `exchange_posts` | The exchange |
| Accept the GitHub invitation | `github_access`, repaired from GitHub first | The invitation |
| Add your repository and address | `enrollments` | Your work |

Things that happen to someone, sent within about ten minutes: a leader's
note, feedback on what they shared, a video in their exchange, and a reply
to their video. GitHub already notifies people about Discussions. Adding the
add-on and connecting an agent cannot be seen, so they are never mentioned.

**The rules.**

- Supabase Cron runs `supabase/functions/reminders` every ten minutes, so
  GitHub's unreliable schedule is not involved.
- A digest goes at most once a day, from 8:00 on the cohort's clock, from
  three days before a session through its morning, and only if something is
  open. That can be four in a week, more than the two the research favors,
  because Ben chose once a day; watch whether people start to ignore them.
- Everything is read at the moment of sending, so finished work never appears.
- Learners never see anyone else. Leaders see who has what open, work
  waiting for feedback, and the cohort repository's open issues.
- Someone who has not joined the organization has no repository yet,
  because adding them would send a second invitation; they appear on their
  home page and in their leader's list.
- Stopping is on /account/, and `details.reminders = 'off'` holds a cohort.
- The Apps Script daily email is retired: nobody has `notices` set any more.

Not built: "Skip this one", since a reminder cannot carry a one-click answer
without a signed link, and a shared reminder in the session thread, since
each person's own thread already reaches them.

## Does it pass the learning test?

- **Understanding:** it names the next real step and takes nothing from
  the work itself.
- **Participation:** a person can stop reminders, and nothing is done for
  them.
- **Agency:** it never answers or does anything for them, and it stops the
  moment they act.
- **Clarity:** one list and a few rules anyone can read, with no scoring or
  prediction.

Ben said in Prep, "I don't want this to become another class for you," so
no progress bar, streak, or completion rate appears anywhere.

## Sources

GitHub: [mentions](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax),
[notifications](https://docs.github.com/en/subscriptions-and-notifications/concepts/about-notifications),
[rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).
Google: [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas),
[sender guidelines](https://support.google.com/a/answer/81126).
Law: [FTC on CAN-SPAM](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business),
[GDPR Recital 47](https://gdpr-info.eu/recitals/no-47/).
Evidence: [DellaVigna and Linos](https://onlinelibrary.wiley.com/doi/abs/10.3982/ECTA18709),
[Oreopoulos and Petronijevic](https://www.nber.org/papers/w26059),
[Bird et al.](https://www.nber.org/papers/w26158),
[Milkman et al.](https://www.pnas.org/doi/pdf/10.1073/pnas.2115126119),
[reminders and saving](https://www.nber.org/bah/2010no3/do-reminders-increase-saving),
[Bettinger and Baker](https://www.nber.org/system/files/working_papers/w16881/w16881.pdf),
[Damgaard and Gravert](https://www.sciencedirect.com/science/article/abs/pii/S0047272717301895),
[Ancker et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC5387195/),
[Fitz et al.](https://www.sciencedirect.com/science/article/abs/pii/S0747563219302596),
[Rogers and Feller](https://journals.sagepub.com/doi/10.1177/0956797615623770),
[Beshears et al.](https://www.hks.harvard.edu/publications/effect-providing-peer-information-retirement-savings-decisions-0).
Products: [Linear](https://linear.app/docs/notifications),
[Basecamp](https://5.basecamp-help.com/article/1177-notifications),
[Google Classroom](https://support.google.com/edu/classroom/answer/6388136?hl=en).
