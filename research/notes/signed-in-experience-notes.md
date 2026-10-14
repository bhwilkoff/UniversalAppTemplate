# The signed-in experience

October 14, 2026. Ben: "The site currently shows very similarly for both
logged in users and logged out users. We need to design and implement a
better experience for those who are logged in so that they see their
cohorts, their exchanges, their time polls, and the other elements that
would benefit logged in students, teachers, and folks who are interested
in using the template on their own... the site isn't still trying to get
you to 'buy in' to Human Shaped when you have already 'signed up'."

The research below, then what the site does with it (the last section).
The question: when someone
is signed in to humanshaped.org, the home page still shows the hero, the
pitch, and "join a cohort", and `/account/` holds most of what is theirs.
How do other sites and the research handle the signed-in home, the
header, several roles, and a phone screen? Each claim carries its URL.
Where a source is a vendor or a school's help page rather than research,
it says so.

## 1. Home pages that switch when you sign in

**Same address, two pages.** The common pattern is that the root URL
serves the marketing page to visitors and the member's own page to
members, with the marketing page kept reachable at its own path.

- GitHub: the personal dashboard "is the first page you see when you
  sign in", and the logo returns to it from any page
  (https://docs.github.com/en/enterprise-cloud@latest/account-and-profile/setting-up-and-managing-your-personal-account-on-github/managing-personal-account-settings/about-your-personal-dashboard).
  First on it: recent activity on the issues and pull requests you are
  working on; your top repositories and teams sit in the navigation; a
  community feed comes after
  (https://docs.github.com/en/account-and-profile/get-started/personal-dashboard-quickstart).
- Heroku, 2013: "Visiting heroku.com now redirects logged in users to
  Dashboard ... Logged in users can still get to the home page by
  signing out or visiting heroku.com/home"
  (https://devcenter.heroku.com/changelog-items/300).
- Gitea serves `dashboard.tmpl` to signed-in users and `home.tmpl` to
  everyone else at the same root
  (https://forum.gitea.com/t/solved-setting-the-default-page-to-something-else/1062).
  GitLab's issue argued "a single URL for both sign-in and browsing is a
  huge usability win" and redirected signed-in users to /dashboard
  (https://gitlab.com/gitlab-org/gitlab-foss/-/issues/120).
- The dissent: a PostgreSQL maintainer wrote that different pages at one
  URL depending on sign-in "is not great UX"
  (https://www.postgresql.org/message-id/202503041034.mjklkiuwd7vt%40alvherre.pgsql).
  The usual answer is the Heroku one: keep the public page at its own
  address and link to it.

**Learning platforms put "what's due and what's next" first.**

- Moodle 4.0 changed the Dashboard's purpose "to focus on providing users
  with an intuitive interface to review and manage their deadlines and
  what they need to do next", split My Courses into its own page, and
  put a My Courses tab in the primary navigation so everyone is "one
  click away" from their learning. The timeline gained clear action
  buttons and visible "overdue" badges. The work came from a UX survey
  where the main student problem was navigation
  (https://catalyst-au.net/blog/moodle-dashboard-redesign-moodle-40;
  https://synergy-learning.com/blog/moodle-4-0-is-going-to-transform-moodle-lms-user-experience/).
- Canvas: the dashboard sidebar holds a To Do list. Students see items
  due in the coming weeks and Recent Feedback from the last four weeks;
  instructors see items needing grading with counts, plus Coming Up for
  the next seven days. A person with both roles sees both kinds of item
  in one sidebar (https://community.canvaslms.com/docs/DOC-8345;
  https://community.canvaslms.com/docs/DOC-12905). Canvas's 2026 optional
  "New Dashboard" uses widgets (course work, grades, announcements,
  people) and is limited to student-only users; items without a due
  date do not count as "Due" (school help pages:
  https://services.stthomas.edu/TDClient/1898/ClientPortal/KB/Article/170002/Using-the-New-Dashboard-view-in-Canvas;
  https://canvas.web.baylor.edu/news/story/2026/new-canvas-functionality-students).
- Google Classroom: students have a To-do page with Assigned, Missing,
  and Done tabs (school guide:
  https://alicekeeler.com/2021/03/22/students-find-missing-work-in-google-classroom/);
  teachers have a separate To review page with a card per assignment and
  a checkmark that moves it to Reviewed
  (https://support.google.com/edu/classroom/answer/9157286).
- Khan Academy's refreshed Learner Home separates courses you take on
  your own from work assigned by a teacher, gives each class its own
  navigation section, makes overdue work easier to see, and moved
  badges and awards off the home onto the profile
  (https://support.khanacademy.org/hc/uz/community/posts/360048340591/comments/360007021311).
- Open edX's Learner Home lists active enrollments with actions on each;
  its README also names "widget slots for upsell and discovery content"
  in the sidebar (https://github.com/openedx/frontend-app-learner-dashboard).
  Codecademy's dashboard shows "the most recent course or Path you have
  worked to easily resume"
  (https://help.codecademy.com/hc/en-us/articles/1260801844089-Updates-to-our-Dashboard).
  I found no primary Coursera source for its My Learning page.

**Communities put the member's own spaces and feed first.**

- Discourse has a "default homepage" setting; if the chosen page is
  members-only (such as "new"), visitors fall back to the first public
  item, and each member can pick their own default in preferences
  (https://meta.discourse.org/t/a-new-default-homepage-site-setting/408291/1).
  A Discourse thread reports members repeatedly clicking "Latest" when
  the home was set for newcomers
  (https://meta.discourse.org/t/show-categories-to-new-users-latest-to-members/70355).
- Mighty Networks: members land on the first enabled global feature
  (Feed, Discovery, Members, Events), which aggregates across the spaces
  they belong to; hosts can choose a space for new members to land in
  (https://docs.mightynetworks.com/for-members/navigation/how-does-the-feed-work;
  https://docs.mightynetworks.com/for-hosts/setting-up-your-network/what-are-global-features).
- Circle markets "a personal home feed for your members"
  (https://circle.so/discussions); I found no help-center page on its
  default landing.

**Work tools call it "Home" and split out what needs you.**

- Slack's 2023 redesign made Home (channels and DMs), DMs, Activity
  (mentions, reactions, threads), and Later (saved items, reminders)
  separate views; on narrow windows the extra tabs collapse into More
  (https://slack.com/intl/en-au/help/articles/16764236868755-An-overview-of-Slacks-new-design).
- Notion Home shows recently visited pages, upcoming events, and My
  tasks gathered from every task database
  (https://www.notion.com/help/home-and-my-tasks).

**Empty states (a member with nothing yet).** NN/g: "Totally empty states
cause confusion about how and whether the system is working"; use empty
space to teach what the area is for and give "direct pathways to key
tasks", and never show "no records" while still loading
(https://www.nngroup.com/articles/empty-state-interface-design/).
Mighty Networks' host-chosen landing space for new members is one way
of not dropping a new member on an empty feed (link above).

## 2. Research on dashboards, personalized homes, and account pages

- NN/g, dashboards: "collections of data visualizations, presented in a
  single-page view"; operational dashboards "impart critical information
  quickly"; both kinds need an "at-a-glance, single-screen view", and
  they "are not intended as expansive views of complex data"
  (https://www.nngroup.com/articles/dashboards-preattentive/). A
  member's home is closer to the operational kind: what needs me now.
- NN/g, personalization: role-based personalization works best by
  adding or reordering content rather than hiding it; keep roles few;
  tailor processes (resume where you left off), not only content; and
  offer an escape hatch to the non-personalized site, because
  "users have different needs at different times"
  (https://www.nngroup.com/articles/personalization/). NN/g separates
  personalization (site decides) from customization (user decides)
  (https://www.nngroup.com/videos/personalization-customization/), and
  an older NN/g piece warns personalization is often "a poor excuse for
  not designing a navigable website"
  (https://www.nngroup.com/articles/personalization-is-over-rated/).
- NN/g, progressive disclosure: "the very fact that something appears
  on the initial display tells users that it's important"; it improves
  learnability, efficiency, and error rate
  (https://www.nngroup.com/articles/progressive-disclosure/). This is
  the argument against a home that shows every tool at once.
- Baymard, account pages: people visit with one task ("changing my
  password", "looking up my orders"); "a few somewhat long account
  pages" beat "a deep multilayer navigation hierarchy"; visits are rare,
  so users do not learn the structure
  (https://baymard.com/research-articles/current-state-accounts-selfservice).
  Icons beside text links help scanning
  (https://baymard.com/research-articles/use-icons-in-the-account-dashboard).
  Implication: settings and account details are a separate, rarely used
  job from "my cohort this week".
- GOV.UK "complete multiple tasks": a task list with a status per task,
  shown at the start of each returning session, only for long
  transactions done over several sessions
  (https://design-system.service.gov.uk/patterns/complete-multiple-tasks).
  Status tags are adjectives, never links or buttons
  (https://design-system.service.gov.uk/components/tag/); the 2023
  update made the whole row clickable because users tried to click the
  tag (https://designnotes.blog.gov.uk/2023/12/15/working-as-a-community-to-iterate-the-task-list-pattern/).
- GOV.UK has no general "account home" pattern in its Design System
  that I found. GOV.UK One Login's account area is where people
  "manage their credentials and see and access the services they've
  used" (https://sign-in.service.gov.uk/documentation/design-recommendations/let-users-navigate-sign-out).

## 3. Learners and teachers specifically

- Learners first need deadlines and the next step (Moodle, Canvas,
  Classroom above) and a way back to their class (Moodle's My Courses
  tab; Khan's per-class navigation).
- Teachers need "what needs my attention" across classes: Canvas's
  grading To Do with counts, Classroom's To review cards (above).
- Teacher-dashboard research: teachers want dashboards to move "beyond
  what things are toward how things should be" and want control over
  the tools (https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8982662/); in
  a 2017 study of 240 Open University teachers using predictive
  analytics, quoted secondhand, found "many teachers struggled with
  providing actions and support based upon analytics data"
  (https://oro.open.ac.uk/48922; I did not read the full paper), and a
  2018 study of 95 teachers found most wanted more training to use such
  dashboards (https://www.irrodl.org/index.php/irrodl/article/view/3493).
  Lesson: list the items to act on (shares awaiting feedback, requests
  to approve), not charts.
- Accessibility: landmarks "programmatically identify sections of a
  page", should supplement headings, and all content should sit inside
  them; repeated landmarks (two navs, several regions) need distinct
  names (https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA11;
  https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA13). A `region` is
  only exposed when named (ARIA11). Landmarks serve as skip-link targets
  (https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/). GOV.UK:
  every page needs a skip link, right after `<body>`, not inside a nav
  (https://design-system.service.gov.uk/components/skip-link/). For a
  dashboard, that means one `h1`, an `h2` per section, each section a
  `section` labelled by its heading.

## 4. The header when signed in

- NN/g: users look top right for "Log in, Search, and My Account"; put
  Log In and Sign Up together for visitors; label icons with text
  (https://www.nngroup.com/articles/utility-navigation/).
- GOV.UK One Login header: when signed in, the top bar shows an account
  link with a user roundel and "Sign out"; the service's own menu sits
  below. It warns against generic labels like "account" or "home" that
  people confuse with the sign-in account, and says to make a labelled
  home link the first menu item rather than relying on the service name
  (https://sign-in.service.gov.uk/documentation/design-recommendations/let-users-navigate-sign-out).
- GOV.UK service navigation puts "authentication and account links" in
  an end slot after the service links, collapsing behind a Menu button
  on small screens
  (https://design-system.service.gov.uk/components/service-navigation/).
- Baymard: the account drop-down is almost always in the main
  navigation, and users go straight to it for account tasks
  (https://baymard.com/ecommerce-design-examples/102-my-account-drop-down).
- Dropping "Join" and "Sign up" for members: the sources above do it by
  serving a different page (Heroku, Gitea, GitHub) rather than hiding
  buttons one by one. A Progress example swaps "Sign In" for the
  member's own icons (vendor blog:
  https://www.progress.com/amp/examples-web-personalization-improve-engagement-2/dWU5d09jQTFGZndVVnJod2xERzk5TENYb204PQ2).
  I found no research source that measures this directly.

## 5. Several roles on one person

- Canvas shows one sidebar with instructor and student items together
  when a person holds both roles (DOC-12905 above). Khan Academy
  separates self-directed from teacher-assigned work into sections
  rather than separate pages (above).
- NN/g: keep roles few, prefer adding or reordering over hiding, and let
  people see other views (https://www.nngroup.com/articles/personalization/).
- Forum and vendor evidence (not research): people with overlapping
  roles dislike switching ("users are not happy with the fact that they
  have to change what role they are playing",
  https://community.smartsheet.com/discussion/comment/378215); a switcher
  makes sense when roles carry different permissions on the same records
  (https://support.crafteducation.com/hc/en-us/articles/32012387728909-Changing-User-Views).
  Hide actions a person cannot take rather than disabling them
  (https://v2.developer.constantcontact.com/docs/user-roles/ui-design-guidelines-user-roles.html).
  Open edX's role work notes users with "multiple roles in multiple
  scopes" must be shown clearly
  (https://openedx.atlassian.net/wiki/spaces/OEPM/pages/5095915526/UX+UI+Analysis+RBAC+MVP).

## 6. Phone width

- Multi-column dashboards collapse to one column, so order sections by
  importance: "ordering the cards appropriately will make sure that the
  most important information comes to the top"
  (https://v5-archive.patternfly.org/patterns/dashboard/design-guidelines).
  Keep the phone view "as simple as possible"
  (https://doc.arcgis.com/en/dashboards/10.9/reference/dashboards-on-your-smartphone.htm).
- Slack collapses secondary tabs into More on narrow windows (above);
  GOV.UK collapses service links behind Menu and keeps the account link
  visible in the top bar on mobile (One Login page above).
- WCAG 2.2: content reflows at 320 CSS px without two-way scrolling
  (https://www.w3.org/WAI/WCAG22/Understanding/reflow.html); targets at
  least 24 by 24 CSS px
  (https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

## Recommendations for a static GitHub Pages + Supabase site

1. **Make `/` switch on session.** Signed out: today's page. Signed in:
   render a member home in place of the hero and pitch, client-side,
   after the Supabase session resolves. Keep the public pitch at its own
   address (for example `/about/`) and link to it from the footer, the
   Heroku pattern. Show a neutral skeleton, not the pitch, while the
   session loads, so members never see "join a cohort" flash
   (NN/g empty states: no "nothing here" while loading).
2. **Order the home by "what needs me now".** Top: this week (next
   session time, an open time poll to answer, the latest exchange
   reply). Then my cohort (link to the cohort page). Then my work
   (shares, feedback received). Builders: their app's directory
   listing status. One `h1`, an `h2` per section.
3. **Teachers get a "needs my attention" list**, not charts: shares
   awaiting feedback, approvals, polls to close, each a row with a
   count and a direct link (Canvas To Do, Classroom To review, the
   teacher-dashboard research).
4. **One page, sections per role.** Someone who is a student and a
   teacher sees both sections on the same home, teacher section first
   only when it has items. Hide sections for roles a person does not
   hold rather than showing them empty or disabled. No role switcher.
5. **Every empty section says what fills it and offers one action**
   ("No cohort yet. See upcoming cohorts.") or is omitted. A brand-new
   member's home is a short task list, not a blank page.
6. **Split `/account/`.** Keep it for the rare jobs (profile, sign-in
   methods, privacy, sign out), the Baymard finding; move the weekly
   things (cohort, polls, exchanges, shares) to the home.
7. **Header when signed in:** drop "Join" and sign-in links; show the
   member's avatar or name top right with a text label, opening a small
   menu (Home, Account, Sign out). Label the account link specifically,
   not just "Account" if Google/GitHub sign-in could be confused with it.
   The first nav item is a labelled home link.
8. **At 375px**, one column in the same priority order; nothing side by
   side except a count beside its label; 24px minimum targets; the
   avatar stays visible and secondary links go behind the existing menu.
9. **Accessibility:** skip link to `main`; each section a named region
   via its `h2`; status words as text tags, never as the link.

## What humanshaped.org does

Shipped October 14, 2026 (`index.html`, `assets/home.js`,
`assets/home-lib.js` with `tools/test/home-lib.test.mjs`, `assets/site.js`).

- **`/` is your own home once you are signed in.** The page's head reads
  the session this browser keeps and marks `<html data-member>` before
  anything draws, so neither version flashes. `/?public` shows the pitch
  to anyone; the footer's About link is the pitch's full page. If the
  saved session no longer works, the pitch comes back.
- **Ordered by what needs you now** (recommendations 2 and 3): *Coming
  up* (a session on now, with Join, or one within eight days, on your own
  clock) in the one tinted panel; *Waiting for you* (for teachers, people
  waiting for feedback and requests to teach; for everyone, notes from
  teachers and answers to what you shared that are new since you last
  opened the page, counts only, like the daily email); then *Your
  cohorts*, *Exchanges* (listed and started here now, moved from
  /account/), *Finding a time* (a teacher's polls with their answers,
  and the polls this browser answered), *Your app* (a cohort app or one
  built on your own, and whether the apps page shows it), *Your stages*
  (the stage you marked last, never a count: marks are "nothing counted
  or compared"), and *More you can do*.
- **One page for every role** (recommendation 4): a section appears for
  a role you hold or when it has something in it. Cohorts, exchanges,
  and your app always appear, and when empty they say what fills them
  and offer one action (recommendation 5): a teacher with no cohort gets
  "Plan a cohort"; someone in none sees the open cohorts with Join, or
  "See the cohorts"; a builder sees "Add your app" and "Start from the
  template".
- **The header on every page** (recommendation 7): a labeled Home first
  in the menu, and in place of "Sign in with GitHub", your picture and
  name opening Your home, Your account, and Sign out (a disclosure
  button and a list of links, not an ARIA menu, closed by Escape).
- **Each section is a region named by its heading**, laid out with the
  site's hanging headings from 64rem, one column on a phone
  (recommendations 8 and 9).
- **Still on /account/**: sign-in and linked accounts, cohorts with
  joining and leaving, notes, stage marks, your own app's form, the
  credential, how teachers reach you, and your data. Slimming it to the
  rare jobs (recommendation 6) is the next step.
