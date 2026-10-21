# Navigation and wayfinding

October 21, 2026. Ben: "I want every function within humanshaped.org to
feel natural and to not conflict with any other function. If this is
going to be a robust platform for learning, it needs to act like one as
you attempt to navigate it. You should never question what your role
is, what the content is that you are looking at, or what functionality
is possible from the page you are on." And: "You may need to research
new design patterns (like sidebars, breadcrumbs, or other features of a
well designed platform). I don't want you to simply fix a single
functionality that is confusing. It should be intuitive from start to
end."

Added the same day: role-based content deserves special attention, and
Ben wants an admin area where he can change who teaches, who approves
teachers, who signs credentials, who mentors, a cohort's co-teachers,
and its members without opening the database or the auth tools.

This file is the research, then a recommendation that fits PAGES.md
(the page map), design-patterns.md, ai-design-anti-patterns.md, and the
roles already in `supabase/migrations`. Each claim carries its URL.
Where a source is a school's help page, a forum, or a vendor rather than
the product's own documentation, it says so.

## 1. How strong platforms structure navigation

### Canvas

- **Global navigation** is a column on the left of every page: Dashboard,
  Courses, Groups, Calendar, Inbox, Account, and Help
  (https://community.canvaslms.com/docs/DOC-10164;
  https://community.canvaslms.com/docs/DOC-10603-how-do-i-use-the-global-navigation-menu-as-a-student).
- **Course navigation** is a second column of links inside a course
  (Home, Announcements, Assignments, Discussions, Grades, People, Pages,
  Files, Syllabus, Modules, Settings), with "a highlight" on the area you
  are in; teachers can reorder and hide links, and links hidden from
  students carry a visibility icon for the teacher
  (https://community.canvaslms.com/docs/DOC-12936). So the shape is an
  inverted L twice over: site, then course.
- **Role.** A person who both teaches and studies sees both kinds of item
  in one dashboard To Do list rather than switching
  (https://community.canvaslms.com/docs/DOC-12905). For checking what
  students see, **Student View** makes a placeholder Test Student; a box
  at the bottom of every page says you are in Student View and holds
  "Reset Student" and "Leave Student View"
  (https://community.canvaslms.com/docs/DOC-2978; school copy:
  https://td.usnh.edu/TDClient/60/Portal/KB/ArticleDet?ID=926).
- **Mobile.** In a phone browser the global navigation collapses behind
  a menu button at the top left (school help page:
  https://lts-help.its.virginia.edu/a/1701896). A Canvas Community idea
  reported that on small screens "many users couldn't find the course
  menu" because the menu icon was not discovered
  (https://community.canvaslms.com/ideas/3719). That is the cost of
  hiding the local navigation.

### Google Classroom

- Every class has the same row of pages: **Stream** ("your class message
  board"), **Classwork**, **People** ("your class roster"), and
  **Grades**, and "Only teachers have the Grades page"
  (https://support.google.com/edu/classroom/answer/9582854). The role
  shows itself by an added page, not by a different layout: students
  and teachers see the same row in the same order, with one more item
  for the teacher.

### Moodle 4.x

- Moodle 4.0 rebuilt navigation after benchmarking found students'
  ability to navigate was a priority problem; its stated aims were to
  "reduce multiple pathways to the same location", create common
  navigation patterns, make options contextually relevant, and keep
  mobile and desktop consistent (Moodle community meeting deck:
  https://docs.moodle.org/dev/images_dev/4/44/Community_Dev_Meeting_-_LMS_Update_-_August_2021_Navigation.pdf;
  https://docs.moodle.org/dev/Moodle_4.0_navigation_improvements).
- **Three levels**: primary navigation in the header (with active
  states, and a drawer on mobile); **secondary navigation** as tabs in
  each context (site, course, activity), "At most 5 tabs will be shown
  excluding the 'More' menu", the rest moving into More as the window
  narrows; and **tertiary navigation** on pages such as participants and
  the gradebook (https://docs.moodle.org/dev/Moodle_4.0_navigation_improvements;
  https://docs.moodle.org/dev/Moodle_4.0_release_notes).
- The **course index** is a collapsible drawer listing the course's
  sections and activities, highlighting where you are (school guide:
  https://guides.library.brandeis.edu/moodlefaculty/whatsnew).
- **Role switching.** A teacher can "Switch role to" Student from the
  user menu; a box at the top of the course says a role is active, with
  "Return to my normal role", and schools warn the simulation is not
  exact (school guides:
  https://help.itc.rwth-aachen.de/en/service/8d9eb2f36eea4fcaa9abd0e1ca008b22/article/b89dd53d447f4c3e97269cd2706b3974;
  https://betheluniversity.atlassian.net/wiki/spaces/MOODLE/pages/52073093/Switch+Role+to...).
  Moodle users argued the indicator in the user menu was small enough to
  miss and asked for a cue inside the course itself (forum, read through
  a search summary: https://moodle.org/mod/forum/discuss.php?d=366366).

### Brightspace (D2L)

- Role switching lives in the personal menu under your name: "View as
  [role]" reloads the course in that role, and you return by the X beside
  "Viewing as [role]"; the switch applies only to the current course and
  ends when you go to My Home or another course
  (https://community.d2l.com/brightspace/kb/articles/4985-view-your-course-using-a-different-role;
  school guide: https://servicedesk.minnstate.edu/TDClient/30/Portal/KB/ArticleDet?ID=132).
  One university warns its learner view "isn't fully accurate", since
  some instructor tools still show (https://ul.ie/brightspace/articles/switching-roles).
  Impersonating a real user shows their full account, private data
  included, while a role switch shows only the role's permissions
  (https://community.d2l.com/brightspace/kb/articles/34437-about-impersonation).

### Open edX and Coursera

- Open edX's learning app gives each course Outline, Dates, and Progress
  pages (https://public.docs.edunext.co/en/latest/external/managers/configure_platform/mfe_glossary/learning_mfe.html),
  a breadcrumb of section and subsection inside the courseware, and a
  sequence bar for moving between units; staff got dropdowns in the
  breadcrumb to jump to a unit
  (https://openedx.atlassian.net/wiki/spaces/OEPM/blog/2021/10/07/3196583970/Jump+Navigation+in+Learning+Sequence+Experience).
- Coursera's course page is broken into weeks in a left column, with
  Grades and the forums reachable from the same column (school guide,
  2020: https://onlinelearning.utoronto.ca/wp-content/uploads/2020/05/Coursera-Learner-Guide-2020-SGS.pdf).
  I found no current primary Coursera source.

### Discourse

- The 3.x sidebar has a fixed **Community** section of common links,
  then the member's own categories, tags, messages, and chat; visitors
  see popular categories and tags instead
  (https://meta.discourse.org/t/using-the-discourse-sidebar/258478;
  https://meta.discourse.org/t/try-out-the-new-sidebar-and-notification-menus/238821).
- Staff powers are two flags (admin, moderator), granted "by visiting a
  user's admin page" (https://meta.discourse.org/t/what-is-a-staff-user-on-hosted-discourse/112219;
  https://meta.discourse.org/t/understanding-user-statuses-roles-and-permissions/35171).

### GitHub

- GitHub's 2023 redesign added **breadcrumbs** that "provide a clear
  understanding of your location within GitHub and its information
  architecture", with the global menu opened from the logo
  (https://github.blog/changelog/2023-04-05-redesigned-navigation-available-in-public-beta/;
  https://github.blog/2023-06-15-exploring-github-with-the-redesigned-navigation-now-in-public-beta/).
- A repository's tabs are Primer's **UnderlineNav**: "Each tab should load
  unique content with a dedicated URL", one tab is always selected, the
  count stays small, and "you can't mix tabs that change the URL with
  tabs just switch the visible tab panel"
  (https://primer.style/product/components/underline-nav/guidelines;
  https://primer.style/product/ui-patterns/navigation).
- Primer's **PageHeader** is "the title area at the top of the main
  content region that shows the user where they are": a context area
  (parent link or breadcrumbs), the title, actions, a description, and a
  navigation slot; the parent link shows on narrow screens
  (https://primer.style/product/components/page-header/). Flows one level
  deep get a link back to the parent; deeper flows get breadcrumbs
  (https://primer.style/product/ui-patterns/navigation).

### Linear and Notion

- Linear's redesign centered on "the inverted L-shape", "the global
  chrome of the application that controls the content in the main view",
  aiming to "reduce visual noise" and "increase the hierarchy and density
  of navigation elements" (https://linear.app/now/how-we-redesigned-the-linear-ui).
  When Linear moved views into team sub-menus it added steps, so it
  brought them back (https://linear.app/changelog/2022-02-11-sidebar-update).
- Notion's sidebar is grouped by whose things they are: Teamspaces,
  Shared, and Private (https://www.notion.com/help/navigate-with-the-sidebar).

**What they share.** Every one has a stable global layer, a layer for the
one course or project you are in that looks the same every time you
enter it, and a clear title for the thing on screen. Roles add items to
the same structure (Classroom's Grades, Canvas's mixed To Do) rather than
swapping the structure. The deep sidebars (Canvas, Linear, Notion) serve
products with many top-level places; Classroom and GitHub, with fewer,
use one row of links.

## 2. Guidance

### When a sidebar, a top bar, or tabs

- NN/g: vertical navigation "is a good fit for broad or growing IAs";
  horizontal suits "a small number of categories"; if vertical, keep it
  visible, use text labels, and "Avoid duplicating the same categories
  in both a horizontal bar and a vertical menu"
  (https://www.nngroup.com/articles/vertical-nav/).
- NN/g: local navigation shows the siblings and children of the current
  section, either as a bar under the global one or on the left, making
  an inverted L; horizontal local navigation handles about two or three
  tiers (https://www.nngroup.com/articles/local-navigation/).
- NN/g, hidden navigation: on desktop, hidden menus were used in 27% of
  cases against 48% for visible navigation, and discoverability dropped
  by more than 20%; "Do not use hidden navigation (such as hamburger
  icons) in desktop user interfaces"; on mobile, show the links when
  there are four or fewer (https://www.nngroup.com/articles/hamburger-menus/).
- NN/g, tabs: highlight the selected tab with more than one cue, keep it
  touching its content, one row only, labels of one or two words
  (https://www.nngroup.com/articles/tabs-used-right/).
- Material 3: a navigation bar holds three to five destinations at one
  level on compact screens and becomes a rail on large ones
  (https://developer.android.com/design/ui/mobile/guides/layout-and-content/layout-and-nav-patterns).
- Apple HIG: use a tab bar "only to enable navigation, not to help people
  perform actions"; actions belong in a toolbar; keep the bar visible so
  people do not forget which area they are in
  (https://developer.apple.com/design/human-interface-guidelines/tab-bars).

### Breadcrumbs, back links, and service navigation

- GOV.UK: use breadcrumbs "to help users understand and move between the
  multiple levels of a website", not on flat sites and not for progress
  through a transaction; they start at home and end at the **parent** of
  the current page; on mobile they can collapse to the first and last
  items; place them "before the `<main>` element" so the skip link passes
  them (https://design-system.service.gov.uk/components/breadcrumbs/;
  https://design-system.service.gov.uk/patterns/navigate-a-service/).
- GOV.UK: "Never use the back link component together with the
  Breadcrumbs component" (https://design-system.service.gov.uk/components/back-link/).
- NN/g: breadcrumbs are location-based ("show the hierarchical structure
  of the site", not the visit history), secondary to the global and local
  navigation, and on mobile may show only the last level or two; NN/g
  ends the trail with the current page as plain text
  (https://www.nngroup.com/articles/breadcrumbs/). GOV.UK and NN/g differ
  on that last item; the recommendation below follows GOV.UK, because
  the `h1` directly under the crumb already names the page.
- GOV.UK service navigation: the service name, then a few links, the
  current one marked `aria-current`, with "authentication and account
  links" in an end slot and a Menu button on small screens; the ordering
  rule is most general at the top, most specific below
  (https://design-system.service.gov.uk/components/service-navigation/;
  https://design-system.service.gov.uk/patterns/navigate-a-service/).
  It adds that navigation is "not a site map", and that a service with
  one clear journey should hide navigation and use a task list.

### "You are here" and titles

- NN/g: "Descriptive, unique titles help indicate ownership, information
  organization, and the page's particular contents"; the current item in
  navigation should change, with color and position both, for
  accessibility (https://www.nngroup.com/articles/navigation-you-are-here/).

### WCAG 2.2

- 3.2.3 Consistent Navigation (AA): repeated navigation "occur[s] in the
  same relative order"; items may be inserted or removed and the order
  still counts as the same (https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html).
  This is what lets a teacher's cohort bar carry one more item than a
  student's.
- 3.2.4 Consistent Identification (AA): components with the same function
  are identified consistently (https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html).
  One name per thing: if it is "Live session" on the bar, it is not
  "Class now" on the home.
- 3.2.6 Consistent Help (A): help and contact links sit in the same place
  on every page (https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html).
- 2.4.5 Multiple Ways (AA): more than one way to reach a page, except a
  step in a process (https://www.w3.org/WAI/WCAG22/Understanding/multiple-ways.html).
- 2.4.8 Location (AAA): breadcrumbs, a site map, and marking the current
  item with `aria-current` are the sufficient techniques
  (https://www.w3.org/WAI/WCAG22/Understanding/location.html).

## 3. Showing role, and why switchers confuse

- The evidence on switchers is mostly help pages and forums, not
  research. What they show: the indicator gets missed when it sits in a
  menu (the Moodle forum above); products that keep it work by putting
  it in the main bar on every page (vendor help:
  https://support.benchprep.com/kb/article/1903-managing-multiple-permission-based-roles)
  and giving a one-click exit (Canvas, Moodle, Brightspace above); and
  every simulated view is described by its own schools as inexact
  (Moodle and Brightspace guides above).
- People holding several roles dislike switching between them (forum:
  https://community.smartsheet.com/discussion/comment/378215), and NN/g's
  personalization guidance is to add or reorder content by role rather
  than hide it, keep roles few, and let people see other views
  (https://www.nngroup.com/articles/personalization/).
- The pattern that avoids the problem is Classroom's and Canvas's: one
  structure, items added for the role you hold, and the role named in
  words on the page itself.

## 4. Keeping create and edit distinct

- NN/g: multi-step or complex work in a modal "prolong[s] the amount of
  time spent away from the main tasks", and a full page is better for it;
  a modal is wrong when people need to consult other information
  (https://www.nngroup.com/articles/modal-nonmodal-dialog/). Other design
  systems say the same: "When the amount of content requires users to
  scroll, consider a page instead"
  (https://designsystem.coloplast.com/latest/build/components/dialog/usage-and-guidelines-Dm0DHF10).
- Primer: start forms with explicit saving, and you "may redirect the user
  to the entity they just created at the end of the flow"
  (https://primer.style/product/ui-patterns/saving/).
- GOV.UK: a confirmation page reassures people that they are done and
  links to what they will need next
  (https://design-system.service.gov.uk/patterns/confirmation-pages/).
- NN/g, confirmations: only for consequential actions, specific about the
  item and the consequence, buttons named for the action ("Delete file",
  "Keep file"), no preselected Yes, a typed confirmation only for the
  rarest dangerous cases, and undo where possible
  (https://www.nngroup.com/articles/confirmation-dialog/).

## 5. Admin interfaces for roles and permissions

### How others do it

- **Canvas** separates **account roles** (only Account Admin by default)
  from **course roles** (five defaults); editing a role changes it for
  everyone who holds it, so variation means a new custom role; some
  permissions are locked; sub-accounts have their own permissions pages
  (search summary of https://community.canvaslms.com/docs/DOC-3063 and
  https://community.canvaslms.com/docs/DOC-15229-4214947873). Admins with
  "Users, act as" can masquerade; a bar says "You are currently acting as
  [User]" with "Stop Acting as User", and the audit log records the
  actions as done by the admin while acting (school guide:
  https://launchvirtuallearning.atlassian.net/wiki/spaces/LVL/pages/1233551361/Masquerading+as+a+Student+Teacher;
  https://community.canvaslms.com/docs/DOC-3113).
- **Moodle** has fine-grained capabilities per role per context. A user
  can assign a role only if their own role "is permitted to assign role
  A", so teachers can normally give only the student role
  (https://docs.moodle.org/401/en/Capabilities/moodle/role:assign).
  Site-wide roles go through "Assign system roles"
  (https://docs.moodle.org/402/en/Manager), and **Check permissions**
  shows the roles and capabilities that apply to a chosen person in a
  context (https://docs.moodle.org/en/Check_permissions).
- **Brightspace** gates role switching and impersonation behind their own
  permissions, and impersonation exposes private data
  (https://community.d2l.com/brightspace/kb/articles/4985-view-your-course-using-a-different-role;
  https://community.d2l.com/brightspace/kb/articles/34437-about-impersonation).
- **Google Classroom** verifies teachers: people who say they are
  teachers become pending members of a Classroom Teachers group, an admin
  approves them, and the admin chooses whether only verified teachers can
  make classes; it warns admins not to approve student accounts by
  accident (https://support.google.com/edu/classroom/answer/6071551).
  That is humanshaped's teacher request, almost exactly. Google's own
  advice is "more than one super administrator account, each managed by a
  separate individual", and least privilege for everyone else
  (https://docs.cloud.google.com/resource-manager/docs/super-admin-best-practices).
- **Discourse** keeps powers to two flags and five trust levels, granted
  from each user's admin page, and lists the staff at
  `/admin/users/list/staff`; its staff action log grew over time to cover
  actions that had gone unrecorded, such as trust-level locks
  (https://meta.discourse.org/t/what-is-a-staff-user-on-hosted-discourse/112219;
  https://meta.discourse.org/t/log-more-admin-actions/55390).
- **GitHub organizations** use a few fixed roles (owner, member, and
  special roles granted to teams). GitHub recommends "at least two people
  within each organization have the owner role", and "You can't change
  your own role"
  (https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/maintaining-ownership-continuity-for-your-organization).
  The audit log records "who performed the action, what the action was,
  and when", filterable by actor, action, and date, readable by owners
  only (https://docs.github.com/en/organizations/keeping-your-organization-secure/managing-security-settings-for-your-organization/reviewing-the-audit-log-for-your-organization).

**What this says for a small hub.** Fine-grained permission matrices
(Canvas, Moodle) exist for institutions with thousands of courses and
many kinds of staff, and they need a "Check permissions" page because
nobody can predict their result. A hub with five roles fits the
GitHub, Discourse, and Classroom model: a few named rights, each with a
plain sentence saying what it lets a person do, granted on the person's
own page, with a log of every change. Impersonation is the wrong tool
here: it shows private data (Brightspace), and the cohort pages already
let a teacher see the student page.

### What exists in the hub today

From `supabase/migrations`:

- `teachers` (a row makes someone a teacher), with `can_approve`
  (decides `teacher_requests`, and hides builder apps) and `can_sign`
  (signs credentials across cohorts). The table has no write rule for
  signed-in people: these are set "by hand (service role)", and Ben's
  first sign-in grants all three (`20261003050000_teacher_requests.sql`,
  `20261004040000_signers.sql`).
- `cohort_teachers`: a cohort's teachers can add another teacher (who
  must already be in `teachers`) and remove one, except the cohort's
  maker, and never the last one (`20261004020000_co_teachers.sql`).
- `enrollments.role` is `student` or `mentor`; only the cohort's teachers
  change a role, and alumni can join as mentors themselves
  (`20261003200000_mentors.sql`).
- `github_access` (invited, member, removed, failed), written only by a
  server function.
- `private.is_member()`: a hub teacher, a cohort teacher, anyone enrolled
  and not left, or a GitHub organization member
  (`20261012020000_exchanges_for_members.sql`).
- Restrictive policies keep AI agents from writing to any of these
  (`20261003010000_agents_read_only.sql`).
- There is no admin right separate from `can_approve`, and no record of
  who changed a role.

## 6. Recommendation for humanshaped.org

### Three levels, each with one job

**Level 1, the site (the header, every page).** Keep the four public
items: Principles, Cohorts, Apps, Events. Nothing in the evidence argues
against them; NN/g says to show links rather than hide them when there
are four or fewer, and GOV.UK says navigation is not a site map. When
signed in:

- **Home** stays first (already shipped).
- **Teaching** comes second for anyone with a `teachers` row, linking to
  `/teach/`. Teachers go there several times a week, and Canvas,
  Classroom, and Moodle all put "my teaching" one click from anywhere.
  WCAG 3.2.3 allows the insertion, since the other items keep their
  order. A member who is not a teacher reaches "ask to teach" from the
  home's "More you can do", not from the bar.
- The **account menu** (picture and name) keeps Your home, Your account,
  and Sign out, and gains **Run the hub** for admins only. Admin work is
  rare, so it belongs with account jobs (signed-in-experience-notes.md,
  Baymard), not in the bar.
- Help (the stuck pages, contact) stays in the footer, in the same place
  on every page (WCAG 3.2.6).
- Rename by page title, not by menu: `/cohorts/` is the public list of
  open cohorts, so its `h1` should say that ("Open cohorts"), and a
  member's own cohorts are never reached through it. The bar's
  "Cohorts" then means one thing to everyone.

No site-wide sidebar. The hub has few top-level places, and NN/g ties
vertical navigation to broad, growing structures; two navigation systems
for the same categories is the duplication NN/g warns against.

**Level 2, an area (Home, Teaching, Run the hub).** Each area has a root
page that counts and links (PAGES.md rule 6) and a short row of links
under its header when it has more than one page:

- Home: no row. It is one page, and `/account/` is reached from the
  account menu.
- Teaching: Desk (`/teach/`), Feedback, Polls, and, for those who hold
  the right, Requests and Signing. Same order for everyone; the last two
  are inserted only for approvers and signers.
- Run the hub: People, Changes (section 7).

The row is Primer's UnderlineNav: every item is its own address, the
current one carries `aria-current="page"` and a second cue besides color
(weight, and an underline that touches the content), one row, one or two
words each.

**Level 3, one cohort.** A cohort has a **cohort header** that appears,
identical, on every page that belongs to it: the cohort page, the
teaching page, live, the board, and that cohort's exchanges. It holds the
crumb, the cohort's name as the `h1` (or as a line above the `h1` on a
sub-page such as live), the role line, the one primary action, and the
**cohort bar**:

- This week (`/cohort/?c=`), Live (`/live/?c=`), Board (`/board/?c=`),
  Conversation (GitHub Discussions, marked as leaving the site with the
  arrow-out icon, design-patterns.md 7), and, for its teachers only,
  Teaching (`/teach/cohort/?c=`), inserted last.
- Everything inside one page (people, groups, apps, notes, credentials)
  is a section of that page, listed in an in-page contents list. From
  64rem that list sits in the left column, the site's hanging-headings
  spine (design-patterns.md 2), which gives the cohort the inverted L
  that Canvas and Moodle's course index give theirs; on a phone the list
  is a short set of links under the header. The bar changes the address;
  the contents list moves within the page (Primer: never mix the two in
  one control).
- The student page and the teaching page use the same section names in
  the same order where they overlap (WCAG 3.2.4), so a teacher who moves
  between them finds People where People was.

### Breadcrumbs

1. **Location, not history.** The crumb is the page's place in PAGES.md,
   never "where you came from" (NN/g).
2. **Start at the area root, end at the parent.** The current page is the
   `h1` just below, so it is not repeated (GOV.UK). Examples:
   - `/cohort/?c=`: Home
   - `/live/?c=`: Home › Spring cohort
   - `/teach/cohort/?c=`: Teaching
   - `/teach/cohort/edit/?c=`: Teaching › Spring cohort
   - `/teach/times/poll/?p=`: Teaching › Polls
   - `/apps/app/?…`: Apps
   - `/admin/person/?u=`: Run the hub › People
3. **No crumb on a root**: the signed-out `/`, Home, `/teach/`, `/admin/`,
   and the four public list pages. The highlighted bar item says where
   you are (NN/g, flat levels need no crumb).
4. **Never a back link and a crumb together** (GOV.UK). Create and edit
   pages use the crumb plus a Cancel button that returns to the thing.
5. **On a phone, only the parent shows**, as one link with a leading
   chevron ("‹ Teaching"), the GOV.UK collapse and Primer's parent link.
6. Markup: `<nav aria-label="Breadcrumb"><ol>…</ol></nav>` placed before
   `<main>` so the skip link passes it (GOV.UK); separators drawn in CSS,
   not typed.

### The page header

Every page that is about one thing opens the same way, in this order:

1. The crumb (above).
2. **The `h1` names the thing**: the cohort's name, the poll's title,
   "Week 3 live session". Never a slogan ("Your cohort lives here.") on a
   page about one cohort; slogans belong on the signed-out pitch.
3. **The role line**, one plain sentence, only where two roles could open
   the same thing (PAGES.md rule 5):
   - a student: no line (the default reader needs none);
   - a mentor: "You mentor in this cohort.";
   - a teacher on the student page: "You teach this cohort. This is the
     page its people see; your tools are on the teaching page." with the
     link;
   - an admin on a cohort they do not teach: "You are seeing this as the
     hub's admin, not as one of its teachers."
   It sits in the header on the page itself, never only in the account
   menu, which is where Moodle's indicator got missed.
4. **A facts sentence** when facts matter (dates, the next session on the
   reader's clock), written as a sentence, not an `A · B · C` string
   (ai-design-anti-patterns.md, template chrome).
5. **Actions**: at most one filled button, first, then outlined ones
   (design-patterns.md 7). Only actions on this thing (PAGES.md rule 6);
   no actions in the bars (Apple HIG: tabs navigate, toolbars act).
6. The area row or cohort bar, touching the content below it.

The document `<title>` follows the same specificity, most specific
first: "Spring cohort, Teaching, Human Shaped". A shared helper in
`site.js` can build the crumb, set `aria-current` on the bar, and write
the title from one small object per page, so every page gets it the same
way.

### Create and edit

- Making or changing something is its own page (PAGES.md rule 2). Modals
  only for a short confirmation, never for a form (NN/g; the forms here
  scroll).
- Saving lands on the thing made or changed (Primer), with one quiet line
  that says so ("Saved.", or "Poll made. Share its link to start
  collecting times.") announced through a `role="status"` region, the
  confirmation-page idea in one line (GOV.UK).
- Cancel returns to the thing, or to the list when nothing was made yet.
- Confirmations only for what is hard to undo, naming the thing and the
  consequence, with buttons named for the action ("Remove Ada as a
  teacher", "Keep her") and no default (NN/g).

### At 375 pixels

- Row 1: wordmark, theme toggle, and the picture (name hidden). Row 2:
  the bar, visible and wrapping (Home, Teaching, Principles, Cohorts,
  Apps, Events fit in two short lines). No hamburger: NN/g found hidden
  menus cost discoverability, and Canvas's own users could not find its
  collapsed course menu.
- The crumb collapses to the parent link.
- The cohort bar and area rows wrap rather than scroll sideways, so no
  item hides off the edge; five short labels fit in two lines.
- The in-page contents list sits under the header as a short list of
  links, not a drawer.
- Targets at least 24 by 24 CSS pixels (WCAG 2.5.8, https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), 44px for buttons as
  the site already does.

### What not to do

- No tracked capitals for area or role labels, and no pill badge for a
  role: the role is a sentence (ai-design-anti-patterns.md D2, D14).
- No colored stripe on a card's edge to mark the current item or a role
  (D6). The current item gets weight and an underline that belongs to the
  bar.
- No rows of identical icon cards for an area's root page; the desk
  counts in rows, each linking to its queue (D4).
- Color only inside inset panels (design-patterns.md 1): the "on now"
  panel, not a full-width colored role banner.
- No role switcher and no "view as" mode. Roles add items to one
  structure; the teacher's student page is the real student page with the
  student's forms removed.
- No hamburger at desktop, no sidebar on a phone, no second menu that
  repeats the bar.
- Not two names for one thing (WCAG 3.2.4), and not two homes for one
  thing (PAGES.md rule 3).

## 7. The admin area: Run the hub

A small area for whoever holds a new **admin** right, Ben at first. It
replaces the "set by hand (service role)" step for every role in the
migrations above.

### The right itself

- Add `teachers.can_admin` (or a separate `admins` table), granted on
  Ben's first sign-in like `can_approve` and `can_sign`. Keep it separate
  from `can_approve`: approving a request to teach is a judgment about a
  person, and changing who holds power is a different trust. Google and
  GitHub both separate the super admin or owner from narrower roles.
- Fixed, named rights, not a permission matrix: **Teacher** (plans and
  runs cohorts), **Approves teachers**, **Signs credentials**, and
  **Admin**. Mentor, co-teacher, and student stay per cohort, where they
  already live.

### Pages

| Page | What it is | What you can do there |
|---|---|---|
| `/admin/` | Running the hub: counts of requests to teach and credentials waiting to be signed (linking to the existing queues), how many admins there are, and the latest changes | Follow a count; go to People or Changes |
| `/admin/people/` | Everyone with an account | Find a person by GitHub login or name; filter to teachers, approvers, signers, admins, or one cohort; open a person |
| `/admin/person/?u=` | One person, as the admin sees them | Change their hub rights (each a checkbox with one sentence saying what it allows); see each cohort they are in and their role there, with a link to change it on that cohort's teaching page; see their GitHub organization state and request to teach; read the changes about them |
| `/admin/changes/` | Every change to anyone's rights | Read, filter by person, by who made the change, and by date |
| `/teach/cohort/?c=` (existing) | One cohort, as its teacher | Its People section stays the one home for co-teachers, mentors, and members (PAGES.md rule 3); an admin can open any cohort's teaching page, with the admin role line |

The person page answers Moodle's "Check permissions" question in words,
for that one person: "Ada can plan and run cohorts, teaches Spring
cohort, and mentors in Fall cohort. She cannot approve teachers or sign
credentials." That is the admin's way of seeing a role, in place of
impersonation.

### Safety rules (enforced in the database, not only the page)

1. **Every change goes through one function** per kind
   (`set_hub_right(person, right, on, reason)`), `security definer`,
   checking the admin right and `private.not_an_agent()`, as
   `decide_teacher_request` already does. No write policy on `teachers`
   for anyone else.
2. **Never remove your own admin right**, and **never leave the hub with
   no admin**, locking the row as `keep_a_teacher` does so two removals at
   once cannot both pass (GitHub: "You can't change your own role").
3. **Show a quiet warning while there is only one admin**, on `/admin/`:
   one sentence, since Google and GitHub both recommend at least two.
4. **Confirm only the powerful changes**: granting or removing Admin,
   and removing Teacher from someone who teaches a running cohort. The
   confirmation names the consequences ("Ada teaches 2 running cohorts.
   She stays their teacher until someone else is added and she is
   removed there."). Ordinary changes save without a dialog, since each
   one can be undone from the same page.
5. **Keep the existing cohort rules**: a cohort keeps at least one
   teacher, and its maker always teaches it; removing hub Teacher does not
   silently strip cohort rows.
6. **Every change is logged**: a `role_changes` table written by triggers
   on `teachers`, `cohort_teachers`, `enrollments.role`, and
   `teacher_requests` decisions, holding who changed it, whose rights,
   what changed (before and after), when, and an optional reason.
   Insert-only (no update or delete policy), readable by admins, and a
   person's own rows readable by that person on `/account/`, so nobody's
   rights change in the dark. GitHub's audit log is the model (actor,
   action, target, time, filters).
7. The admin area never shows private content (notes to students,
   calendar emails, answers) beyond what the person page needs; it is
   about rights, not about reading people's work.

## Sources

Every source is linked inline above, next to the claim it supports.
