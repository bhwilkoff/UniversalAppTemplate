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
5. **The interface shows whose view it is, not a sentence.** Where a
   leader and a learner could both open the same thing, the row of links
   holds both views and marks the one you are on. Tools for a role you do
   not hold are not shown.
6. **Actions sit on the page of the thing they act on.** A queue page
   answers what is in it; the overview only counts it and links there.
7. **Moved pages keep their old addresses**, which forward to the new ones.

## The signed-in platform

Ben, October 22, 2026: "Start with the user who is logged in. What do they
need to see? How should it be organized?" and "the people inside of the
system are either Learners or Leaders. They can be both."

From research/notes/navigation-and-wayfinding-notes.md: Google Classroom's
and Canvas's pattern, one structure for everyone, with items added for the
role you hold and the role named on the page, never a switcher.

- **Two roles, named everywhere the same way.** A person is a **learner**
  in a cohort they are in and a **leader** of a cohort they lead, and can
  be both. Admin, approving leaders, and signing credentials are rights on
  top, shown only to those who hold them. The words are in DESIGN-KIT.md's
  lexicon.
- **The sidebar** (`site.js`) is the same for everyone, in this order, each
  item an icon and a name:
  1. **Home**
  2. **Learning**: each cohort you are in
  3. **Leading** (leaders): each cohort you lead, then Feedback, Polls,
     Requests to lead (approvers), Signing (signers), and the Leader's guide
  4. **Exchanges**, then **Admin** (admins)
  5. Below a rule, quieter: Open cohorts, Apps, Events, Principles
  From 64rem it collapses to its icons (the choice is the browser's own);
  below 64rem it is a drawer behind Menu. The current item is marked by
  weight and a tint.
- **Home** answers what needs you now: Coming up, Waiting for you, then
  Learning and Leading (everyone sees both, so asking to lead is always in
  view), then Your work. Nothing on it repeats a sidebar place.
- **One cohort, one page, eight sections** (`/cohort/?c=`, `assets/cohort-nav.js`),
  the same for everyone and in the same order: **This week**, **Sessions**,
  **Conversation**, **Asks**, **Files**, **Exchanges**, **People**, then **Your work** for
  learners or **Settings** for leaders. A leader's tools sit inside the
  shared sections, never in sections of their own (Ben, October 22, 2026:
  "It seems like we can do some simplification on these pages too"):
  - This week: while the cohort is being set up, its setup steps; what is
    waiting for the leader.
  - Sessions: each week's session, and the live session it becomes while
    it runs (`/live/?c=`); for leaders, making the sessions, each one's run
    of show, the question bank, and each past session's follow-up.
  - Conversation: the cohort repository's Discussions, and Watch on
    GitHub; for leaders, the button that makes the repository, right
    there.
  - Asks: the cohort's board. Anyone asks the cohort for something, and
    anyone moves it from Asked to Someone has it to Done; each ask is an
    issue labeled "ask" in the cohort's repository. Nothing on it counts
    or compares people.
  - Files: what the cohort shares, kept in its repository by folder
    (Resources, then each week), added as the person (Ben, October 22,
    2026: "any shared resource or file should be stored on github within
    the cohort repository").
  - People: everyone in their groups of three, each with their app; for
    leaders, each learner's role on GitHub (Read, Triage, Write, or
    Maintain), adding leaders, making groups, and recording credentials.
  - Your work: for a learner, Feedback first, one list of everything
    said to them wherever it lives (a leader's note, feedback on what
    they shared, issues in the cohort's repository that mention them,
    and their app's issues), each saying who can see it.
  - Settings: the cohort's details, status, and calls.
  Under the cohort's name a tag says Leader or Learner. Every section works
  before the cohort has sessions, people, or a conversation: it says what
  is missing and, for a leader, offers the step that fills it.
- **Breadcrumbs** say where a page sits and end at the parent; a page the
  sidebar names has none. A page never has both a breadcrumb and a back
  link. Nothing stacks two rows of links.
- **No role switcher, and no explaining.** What you can do is the set of
  links and buttons in front of you.

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
| `/teach/guide/` | The leader's guide: each step of leading a cohort, named as the platform names it | Read |
| `/teach/guide/course/`, `/teach/guide/weeks/`, `/teach/guide/week-N/` | The course, and each session's guide, from the template | Read |

## A learner

| Page | What it is | What you can do there |
|---|---|---|
| `/` | Your home | Follow a row to the thing |
| `/account/` | Your account | How you sign in, linked accounts, how leaders reach you, your data, sign out, delete; confirm joining one cohort (`?join=`) |
| `/cohort/?c=` | One cohort: This week, Sessions, Conversation, Asks, Files, Exchanges, People, and Your work (learners) or Settings (leaders) | Read the week, join a session, bring something back, keep your app; a leader sets it up and runs it from the same sections |
| `/live/?c=` | One cohort's live session | Take part; a leader runs it |
| `/board/?c=`, `/card/?c=` | The live session's board; its card | Draw; show the card |
| `/exchange/#<link>` | One exchange | Watch, add a video |
| `/exchanges/` | Your exchanges | Open one, start one |
| `/exchange/new/` (`?c=` for a cohort) | Starting an exchange | Record the opening video and start it |
| `/apps/mine/` | Your own app, outside a cohort | Add or change it, show it on the apps page, take it off |

## A leader

| Page | What it is | What you can do there |
|---|---|---|
| `/teach/` | Leading: what waits for you and every cohort you lead; for anyone else, asking to lead | Follow a row; plan a cohort |
| `/teach/new/` | Planning a new cohort | Fill it in; saving opens its Setup |
| `/teach/cohort/?c=` | Forwards to the cohort's page, `/cohort/?c=` | |
| `/teach/cohort/edit/?c=` | That cohort's details | Change them; saving returns to the cohort |
| `/teach/feedback/` | What your cohorts are waiting on you for | Answer each |
| `/teach/requests/` | Requests to lead (approvers only) | Approve or decline |
| `/teach/signing/` | Credentials waiting to be signed (signers only) | Sign and attach |
| `/teach/times/` | Your polls | Open one, make one |
| `/teach/times/new/` | Making a poll | Fill it in; saving opens the poll |
| `/teach/times/poll/?p=` | One poll | Share it, mark your times, read the answers, make it a cohort |

## An admin

| Page | What it is | What you can do there |
|---|---|---|
| `/admin/` | Roles: everyone, with the roles and rights they hold, and the latest changes | Find someone, narrow by role, open them |
| `/admin/person/?u=` | One person | Give or take each right (leader, approves leaders, signs credentials, admin), with a note for the log; see their cohorts and the changes to their rights |

`/admin/people/` and `/admin/changes/` forward to `/admin/`. Who leads and
who is in one cohort is changed in that cohort's People.

## Not yet true

Each line is work to do; remove it when the page matches its row.

- Most pages still explain themselves in sentences; the audit in
  research/notes/audit-2026-10-21/ lists each one and the component
  (DESIGN-KIT.md, `assets/ui.js`) that replaces it.
- The MCP server's words still say teacher and student in places.
- `/signin-check/` is a temporary diagnostic page and should go once the
  Safari sign-in hang is settled.
- `/design/…` holds old design explorations at public addresses.
