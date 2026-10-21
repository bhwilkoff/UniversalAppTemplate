# The pages of humanshaped.org

This is binding (DECISIONS.md, "Each kind of content has its own page" and
"Every page says what it is, whose view it is, and what it is for"). Before
adding a page, a section, or a form, find its row here. If no row fits,
change this file first, then the page.

Ben, October 21, 2026: "I want every function you do within humanshaped.org
to feel natural and to not conflict with any other function you might
attempt. If this is going to be a robust platform for learning, it needs to
act like one as you attempt to navigate it. You should never question what
your role is, what the content is that you are looking at, or what
functionality is possible from the page you are on."

## The rules

1. **One page, one kind of thing.** A list page lists, and each thing in it
   opens at its own address. Nothing unfolds under a list.
2. **Making or changing something is its own page**, and saving lands on
   the thing made. A form never appears on a page that is about something
   else.
3. **One home for each thing.** Other pages show a row that links there,
   never a second copy of the thing or of its tools.
4. **The heading names the thing** (the cohort's name, the poll's title),
   and a crumb leads back to the list it belongs to.
5. **A page says whose view it is when that is not obvious.** Where a
   teacher and a student could both open the same thing, each page names
   the reader's role in one line and links to the other view. Tools for a
   role you do not hold are not shown.
6. **Actions sit on the page of the thing they act on.** A queue page
   answers what is in it; the desk only counts it and links there.
7. **Moved pages keep their old addresses**, which forward to the new ones.

## How you find your way

From research/notes/navigation-and-wayfinding-notes.md (Canvas, Classroom,
Moodle, GitHub, GOV.UK, NN/g, WCAG 2.2).

- **The site header** keeps Principles, Cohorts, Apps, and Events for
  everyone. Signed in, Home comes first; anyone who teaches also gets
  Teaching, second; an admin's account menu adds Run the hub. Items are only
  ever added, never reordered (WCAG 3.2.3). The current one is underlined
  as well as colored.
- **An area's row of links** (`.area-nav`) sits at the top of every page in
  that area, in a fixed order, each item its own page, the current one
  underlined: Teaching (Desk, Feedback, Polls, then Requests to teach and
  Signing for the people who hold those rights) and Running the hub
  (Overview, People, Changes).
- **A cohort's header** (`assets/cohort-nav.js`) opens every page that
  belongs to one cohort, the same way: a breadcrumb, the cohort's row of
  links (Cohort home, Live session, and Teaching it for its teachers), the
  cohort's name, and a line naming your role there when it is not obvious.
  A cohort's pages show its header in place of the area's row, so a page
  never stacks two rows of links; the breadcrumb leads back to the area.
- **Breadcrumbs** say where a page sits, not where you came from. They
  start at the area's first page and end at the parent, because the heading
  names the page itself; a page that is an item in its area's row has none.
  At phone width only the parent shows. A page never has both a breadcrumb
  and a "back" link.
- **No role switcher.** Your role is a sentence on the page, never only in
  a menu. A teacher who wants the students' view opens the cohort home.

## Everyone

| Page | What it is | What you can do there |
|---|---|---|
| `/` (signed out) | What Human Shaped is | Read, go to cohorts, apps, events |
| `/about/`, `/principles/`, `/path/…`, `/stuck/…` | Reading | Read |
| `/cohorts/` | Open cohorts, and what a week asks | Choose one to join |
| `/apps/`, `/apps/app/?…` | Apps built this way; one app | Read, open the app |
| `/events/`, `/start/…` | Events; kits for running one | Read, add an event |
| `/showcase/?c=` | One cohort's public showing | Read, come to it |
| `/credential/?id=` | One credential | Check it |
| `/times/#<link>` | One poll, for the person answering | Answer, change or take back an answer; join the cohort if invited |
| `/teach/guide/…` | The teaching guide | Read |

## A member, signed in

| Page | What it is | What you can do there |
|---|---|---|
| `/` | Your home: what is next, what waits for you, and a row for each of your cohorts, exchanges, polls, and your app | Follow a row to the thing |
| `/account/` | Your account | How you sign in, linked accounts, how teachers reach you, your data, sign out, delete; confirm joining one cohort (`?join=`) |
| `/cohort/?c=` | One cohort, as a person in it | This week, the next session, notes to you, your group, your app, bring something back. Its teachers see a line saying so, a link to the teaching page, and none of the student's forms |
| `/live/?c=` | One cohort's live session | Take part; a teacher runs it |
| `/board/?c=`, `/card/?c=` | The live session's board; its card for OBS | Draw; show the card |
| `/exchange/#<link>` | One exchange | Watch, add a video |
| `/exchange/new/` (`?c=` for a cohort) | Starting an exchange | Record the opening video and start it |

## A teacher

| Page | What it is | What you can do there |
|---|---|---|
| `/teach/` | Your teaching desk; for anyone else, asking to teach | Counts of what needs you, each linking to its queue; a row for each cohort; plan a cohort; your polls |
| `/teach/new/` | Planning a new cohort | Fill it in; saving opens the cohort |
| `/teach/cohort/?c=` | One cohort, as its teacher | Sessions, people, groups, follow-ups, apps, credentials, setup |
| `/teach/cohort/edit/?c=` | That cohort's details | Change them; saving returns to the cohort |
| `/teach/feedback/` | What your cohorts are waiting on you for | Answer each |
| `/teach/requests/` | Requests to teach (approvers only) | Approve or decline |
| `/teach/signing/` | Credentials waiting to be signed (signers only) | Sign and attach |
| `/teach/times/` | Your polls | Open one, make one |
| `/teach/times/new/` | Making a poll | Fill it in; saving opens the poll |
| `/teach/times/poll/?p=` | One poll | Share it, mark your times, read the answers, make it a cohort |

## An admin (Running the hub)

| Page | What it is | What you can do there |
|---|---|---|
| `/admin/` | The hub at a glance | Counts of people and teachers, the admins, what waits, recent changes |
| `/admin/people/` | Everyone who has signed in | Find someone by name, narrow by right, open them |
| `/admin/person/?u=` | One person | Give or take each hub-wide right (teacher, approves teachers, signs credentials, admin), with a note for the log; see their cohorts and the changes to their rights |
| `/admin/changes/` | The log of every change to a right | Read it; no one can edit it |

Who teaches or belongs to one cohort stays with that cohort's teachers, on
`/teach/cohort/?c=`.

## Not yet true

Each line is work to do; remove it when the page matches its row.

- `/account/` still shows cohorts you are in, notes from teachers, stages,
  and mentoring, which belong on `/` and `/cohort/`.
- `/` and `/cohort/` still open the new-exchange form in place.
- `/signin-check/` is a temporary diagnostic page and should go once the
  Safari sign-in hang is settled.
- `/design/…` holds old design explorations at public addresses.
