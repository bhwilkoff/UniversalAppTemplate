# What else a cohort repository can do for learning

*Research done 2026-10-22. Every source below was read on that date. Where
I checked something against the `humanshaped` organization itself, I did it
read only with Ben's `gh` sign-in (no setting was changed and nothing was
created), and the row says "Checked". Where a source is a third party it is
labeled, and anything I could not confirm from a primary source is listed
at the end.*

Ben asked: "Can you research how else we could leverage the tools within
the cohort-based repository? ... What other learner/learning-forward tools
can we take advantage that are built into github repositories?"

## What the cohort repository is today

Three facts shape every answer below, so they come first.

- **The organization is on GitHub Free.** `gh api orgs/humanshaped` answers
  `plan.name: free`, with base permission `none` and members unable to
  create repositories. (Checked.) GitHub describes the plan as "unlimited
  private repositories with a limited feature set"
  (https://docs.github.com/en/get-started/learning-about-github/githubs-plans).
- **Learners hold the Read role on their cohort repository.** The cohort's
  secret team is given `pull` (read) on the repository, and the site's
  GitHub App puts leaders on the team as team maintainers, which is a role
  in the team, not a stronger role in the repository. The repository
  `humanshaped/cohort-test` has Discussions, Issues, and Projects on, the
  wiki off, forking off, and no files. (Checked.)
- **The site's GitHub App holds Discussions: write, Members: write,
  Administration: write, and Metadata: read** (cohort-conversation-notes.md,
  sections 8 and after). Anything new the site reads or writes needs a
  permission added, and GitHub asks the organization owner to approve it.

What the Read role allows matters more than any plan limit, because it
decides what a learner can do without a change. From GitHub's role table
(https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization):

| Action | Read | Triage | Write | Maintain |
|---|---|---|---|---|
| Create discussions, comment, vote in polls | yes | yes | yes | yes |
| Open issues, close their own | yes | yes | yes | yes |
| Submit reviews on pull requests | yes | yes | yes | yes |
| Apply labels and milestones, close or assign anyone's issues | no | yes | yes | yes |
| Hide comments on discussions, lock and move discussions | no | yes | yes | yes |
| Push to the repository, open a pull request from a branch, apply a suggested change | no | no | yes | yes |
| Create discussion categories, pin discussions | no | no | yes | yes |
| Edit a wiki in a private repository | no | no | yes | yes |

So, learners today can talk, ask, vote, and open issues. They cannot write
files, open a pull request (forking is off, and a branch needs Write), or
apply labels. Leaders, if they hold only the team's role, cannot pin a
discussion or make a category either; marking an answer needs Triage, or
being the discussion's author.

## The short answer

Ranked by how much learning each one adds for how little it costs.

1. **Use Discussions fully, with a category form for each bring-back.** A
   form in `.github/DISCUSSION_TEMPLATE/` turns "Showing your work" into
   fields (what changed, one decision and why, the three questions), Q&A
   categories let the person who asked mark the answer that helped, and
   polls let a cohort decide something together, all on the free plan and
   inside what learners can already do.
2. **Send feedback to where the learner's agent can read it: an issue in
   the learner's own app repository.** A partner's or leader's "not yet"
   becomes an issue with sub-issues for each missing piece, which the
   learner reads, argues with, and hands to their agent, so the feedback
   becomes the next round of Write instead of a comment that scrolls away.
3. **Put the week's course material in the cohort repository as files.** A
   README for each week, the strong and weak bring-backs as examples,
   Mermaid diagrams of the loop, and maps or PDFs all render on GitHub for
   the cohort only, and the material is versioned, so a leader can adapt
   it for this cohort without touching the template.
4. **Review writing with pull requests and suggested changes.** Week 1's
   problem statement, "revised after critique", fits a pull request
   exactly: the trio comments line by line and suggests wording, and the
   author decides which suggestions to apply. It needs learners to hold
   Write, and on the free plan nothing protects the main branch.
5. **Give each cohort an organization Project, shared with its team only.**
   A board or table with an iteration field set to the five weeks, holding
   each learner's own "ready or not yet" items (drawn from their own
   repositories), lets a trio see where its members are without a leader
   asking, and it is free with base access set to none.
6. **Open an issue form for "I am stuck" and "I am ready for a leader to
   look."** Issues give a request a state (open, answered, closed by the
   person who asked), a type, and an assignee, which a discussion lacks, so
   a leader's feedback queue can be GitHub's own issue list.
7. **Point learners without a capable computer to Codespaces and github.dev
   in their own repositories.** The free personal quota (120 hours of
   compute a month) and the browser editor cost the course nothing and
   remove the strongest barrier to the setup week.
8. **Recommend three GitHub Skills courses as stuck resources, not
   assignments.** "Introduction to GitHub", "Communicate using Markdown",
   and "Review pull requests" are free, run in the learner's own account,
   and teach exactly the moves the cohort asks for.

## 1. Discussions

The cohort conversation already runs here, so these are depth, not new
surfaces. All of them are available on the free plan in a private
repository (verified by use on `cohort-test` in October; the docs name no
plan restriction).

| Feature | Free private? | Cost and permission | Use in a cohort | Verdict | Source |
|---|---|---|---|---|---|
| Categories and sections | Yes (Checked: six default categories exist on `cohort-test`) | $0; creating categories needs Write in the repository, and the API has no mutation to create one, so a leader or Ben makes them on github.com; up to "25 categories" | A section per week holding that week's session thread, Q&A, and Show and tell, so the conversation follows the course's rhythm | Deepens understanding: the shape of the conversation teaches the shape of the course | https://docs.github.com/en/discussions/managing-discussions-for-your-community/managing-categories-for-discussions |
| Category forms (discussion templates) | Yes; no plan banner | $0; files in `.github/DISCUSSION_TEMPLATE/`, so the repository needs its first commit (the App would need Contents: write, or Ben commits once); forms apply on github.com only, and the site's `createDiscussion` takes a plain body, so the site would show the same fields itself | A "Bring-back" form: the "Be ready to" item, what changed since last week, one decision and why, and the three questions for partners; an "Agent review" form with "what I agree with, what I do not, and why" | Strongly learning-forward: it scaffolds the reflection the course already asks for, and the fields fade as people learn them | https://docs.github.com/en/discussions/managing-discussions-for-your-community/creating-discussion-category-forms |
| Q&A format and marking an answer | Yes | $0; "Discussion authors and users with the triage role or greater" can mark; GraphQL has `markDiscussionCommentAsAnswer` (Checked by introspection) | The person who asked marks the reply that actually helped, which leaves a findable answer for the next lap and for the stuck pages | Supports agency (the asker decides what helped); avoid ever counting answers per person | https://docs.github.com/en/discussions/collaborating-with-your-community-using-discussions/participating-in-a-discussion |
| Polls | Yes; "People with read access ... can participate in discussions and polls" | $0; created on github.com only (the API reads `poll` and has `addDiscussionPollVote`, but no way to create one; Checked) | The cohort chooses together, for instance week 5's one lesson to send back to the template, or which session the guest showing goes in | Invites participation when it decides something real; never use it as a quiz | same page |
| Announcement format and pinning | Yes | $0; announcement categories accept new posts only from Maintain or Admin; pinning needs Write; GraphQL can read `pinnedDiscussions` but has no pin mutation for discussions (Checked) | The week's opening note pinned at the top; the four rules for how we talk pinned in Cohort Prep | Neutral; useful wayfinding | https://docs.github.com/en/discussions/managing-discussions-for-your-community/managing-discussions |
| Labels on discussions | Yes; "one shared set of labels for issues, pull requests, and discussions" | $0; applying needs Triage | Mark threads by trio or by stage (00 to 08) so a learner can find every conversation about their stage | Fine; groups by label must never become a ranking | same page |
| Lock, close, transfer, convert issue to discussion | Yes | $0; Triage for most | A leader closes a session thread once its follow-up is posted, or moves a stuck issue into Q&A when the answer helps everyone | Neutral | same page |
| Discussions insights dashboard | No plan stated | $0; "Repository administrators and people with maintain access" only | A leader sees whether the conversation is alive this week (page views, "daily contributors") | Acceptable for a leader in aggregate; do not surface per-person activity to learners | https://docs.github.com/en/discussions/managing-discussions-for-your-community/viewing-insights-for-your-discussions |
| Organization discussions | Yes, with a source repository | $0; "Permission to participate ... is based on permission in the source repository" | Already the right home for cross-cohort talk in public `humanshaped/community`; never point them at a private cohort repository | Fine as is | https://docs.github.com/en/organizations/managing-organization-settings/enabling-or-disabling-github-discussions-for-an-organization |
| Blocking from discussion comments | Recent (September 1 and August 27, 2026 changelog entries) | $0; organization owners | A last resort for moderation | Neutral | https://github.blog/changelog/month/09-2026/ |

## 2. Issues and Projects

Issues and Projects are included in the free plan ("Issues & Projects" on
the Free card, https://github.com/pricing). Both are on in `cohort-test`.
(Checked.)

| Feature | Free private? | Cost and permission | Use in a cohort | Verdict | Source |
|---|---|---|---|---|---|
| Issue forms and templates | Yes; no plan banner; forms are "currently in public preview" | $0; files in `.github/ISSUE_TEMPLATE/` (needs a commit); the site would need the App's Issues: write to open issues as the learner | "Ready for a leader to look", "I am stuck (what I tried, what I expected, what happened)", and "A lesson for the template" forms | Deepens understanding: a good stuck form is the debugging method in miniature | https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-issue-forms |
| Sub-issues | Yes; no plan banner | $0; adding needs Triage; "up to 100 sub-issues per parent" and eight levels | A "not yet" broken into the pieces still missing, each closed by the learner when it is there | Learning-forward when the learner owns and closes them | https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/adding-sub-issues |
| Issue types | Yes (Checked: `humanshaped` already has the default types, created 2026-10-02) | $0; organization owners edit; "up to 25 issue types"; App permission is Organization "Issue Types" | Types such as Stuck, Feedback request, Lesson for the template, instead of labels | Neutral; tidy | https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/managing-issue-types-in-an-organization |
| Labels, milestones, assignees | Yes | $0; applying needs Triage; "Have an issue assigned to them" works at Read | A milestone per week; assigning a feedback request to the leader who will answer it | Neutral; never a scoreboard of closed issues | https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization |
| Feedback as issues in the learner's own repository | Yes for public app repositories (outside the organization; the learner owns them) | $0; a partner can open an issue in any public repository; the site would need the App installed by the learner, so the simplest path is a link to GitHub's own "New issue" page | The trio's three questions and a leader's "not yet" land where the learner's agent reads them, and the learner records what they agree with and why before acting | The strongest learning move here: feedback becomes the next round of the learner's own work | (general GitHub behavior; no single page) |
| Projects (v2): table, board, roadmap | Yes | $0; "maximum of 50,000 items"; App permission is Organization "Projects" | One project per cohort, shared with its team, a row per learner's current "Be ready to" item | Learning-forward if each learner moves their own card; avoid if a leader moves cards about people | https://docs.github.com/en/issues/planning-and-tracking-with-projects/learning-about-projects/about-projects |
| Limiting a project to a team | Yes | $0; base role "No access: Only organization owners and users granted individual access"; teams can be given read or write | Each cohort's project visible only to its own team | Required for privacy, and possible | https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-your-project/managing-access-to-your-projects |
| Iteration fields | Yes | $0; "can be set to any length of time, can include breaks" | Cohort Prep plus five one-week iterations, so the board reads as the course's calendar | Neutral, helpful | https://docs.github.com/en/issues/planning-and-tracking-with-projects/understanding-fields/about-iteration-fields |
| Items from other repositories | Yes; "you can include issues and pull requests from any organization" | $0 | A learner's own "ready or not yet" issues, in their own app repository, shown on the cohort board | Promising; see Not verified for user-owned repositories | https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-items-in-your-project/adding-items-to-your-project |
| Project templates | Yes; no plan banner | $0; project admins set one as a template | One "Cohort board" template copied for each new cohort | Neutral | https://docs.github.com/en/issues/planning-and-tracking-with-projects/managing-your-project/managing-project-templates-in-your-organization |
| Project insights charts | Yes; no plan banner | $0 | A leader sees how many items are ready this week | Fine in aggregate; a chart per person becomes a leaderboard | https://docs.github.com/en/issues/planning-and-tracking-with-projects/viewing-insights-from-your-project/about-insights-for-projects |

## 3. Files, pull requests, and review

| Feature | Free private? | Cost and permission | Use in a cohort | Verdict | Source |
|---|---|---|---|---|---|
| README and Markdown files as course material | Yes | $0; the App would need Contents: write to add files from the site; learners read at Read | A folder per week with the session's material, the strong and weak bring-back examples, and links into the template's stages | Deepens understanding when the files are models to reason from, as note 06 asks | https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes |
| Mermaid, GeoJSON and TopoJSON maps, STL models | Yes, in files, issues, discussions, and comments | $0 | A learner draws their app's flow as a Mermaid diagram in a bring-back; a map of where the cohort's people are, if they choose | Learning-forward: drawing the flow is thinking about it | https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-diagrams |
| CSV, PDF, Jupyter notebooks, image diffs | Yes | $0 | A shared CSV of "one honest number" from week 4; a PDF of a store rejection to read together; before-and-after screenshots shown as an image diff | Neutral, useful | https://docs.github.com/en/repositories/working-with-files/using-files/working-with-non-code-files |
| Pull requests and line comments | Yes | $0; opening one from a branch needs Write (forking is off in `cohort-test`); "Submit reviews on pull requests" works at Read | A learner proposes their problem statement as a file; the trio reviews it line by line | Strongly learning-forward: critique in the place the writing lives, with every version kept | https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/about-pull-requests |
| Suggested changes | Yes | $0; anyone who can review can suggest; applying needs Write | Partners suggest wording; the author chooses what to accept, which keeps the deciding with them (rule 3, "No taking over") | Supports agency, if suggestions stay suggestions | https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/commenting-on-a-pull-request |
| Requesting one reviewer | Yes | $0; requesting reviews needs Triage | The author asks one partner | Fine | https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/requesting-a-pull-request-review |
| Multiple reviewers, team reviewers | **No**: "available in public repositories with GitHub Free for organizations" | Needs Team | Would have let the author request the whole trio at once | A real loss for trios; workaround is mentioning each partner | same page |
| Draft pull requests | **No**, per the pricing page's table (Free column says "Public repositories"); the docs page carries no banner | Needs Team | "Not ready for review" work in progress | Minor loss; a title prefix does the same | https://github.com/pricing |
| Protected branches and rulesets | **No** (Checked: the API answers "Upgrade to GitHub Pro or make this repository public") | Needs Team | Would stop anyone with Write from pushing to main | Matters only if learners get Write; history keeps every version anyway | https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches ; https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets |
| CODEOWNERS | **No**: "in public repositories with GitHub Free and GitHub Free for organizations" | Needs Team | Would auto-request a leader's review | Not needed | https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners |
| Releases | Yes | $0; viewing at Read, creating needs Write | A tagged snapshot of the course material as it was taught to this cohort | Low value | https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases |
| Template repository | Yes | $0; repository admins | A `cohort-template` repository holding the forms and week folders, copied for each new cohort when the site provisions it | Useful plumbing | https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-template-repository |
| Wiki | **No**: "available in public repositories with GitHub Free"; private wikis need Pro, Team, or Enterprise | Needs Team; editing a private wiki also needs Write | A shared, editable cohort glossary or "things we learned" | Files in the repository do the same job for free | https://docs.github.com/en/communities/documenting-your-project-with-wikis/about-wikis |
| GitHub Pages | **No** from a private repository on Free; private (access-controlled) Pages needs Enterprise Cloud | Needs Team; the App permission is "Pages" | A cohort's own site | Not needed: humanshaped.org is that site, and learners publish Pages from their own public repositories | https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages |

## 4. Automation and environments

| Feature | Free private? | Cost and permission | Use in a cohort | Verdict | Source |
|---|---|---|---|---|---|
| GitHub Actions (scheduled, on discussion or issue events) | Yes, with a quota | Free plan: "2,000 CI/CD minutes/month" and 500 MB storage across all private repositories in the organization; public repositories are free; writing workflow files needs the App's "Workflows" permission | Post the week's thread on Monday from the week's file; add a new issue to the cohort project; close a stuck issue's loop with a link to the matching stuck page | Fine as quiet plumbing, but the site's own `notices` function already does reminders, so Actions adds a second place for the same job | https://github.com/pricing ; https://docs.github.com/en/billing/concepts/product-billing/github-actions |
| Scheduled reminders (Slack review nags) | **No** on Free | Needs Team | Not needed | Avoid anyway: nagging, not learning | https://docs.github.com/en/get-started/learning-about-github/githubs-plans |
| Codespaces | Yes, but "Organizations on a GitHub Free plan cannot pay ... so the user who creates the codespace always pays" | Each personal account gets "15 GB-month" of storage and "120 hrs" of compute a month; organization plans "do not include a free quota" | A learner with an old or locked-down computer builds the web app in a browser, in their own repository | Supports agency and access; say plainly that hours are the learner's own | https://docs.github.com/en/codespaces/managing-codespaces-for-your-organization/choosing-who-owns-and-pays-for-codespaces-in-your-organization ; https://docs.github.com/en/billing/concepts/product-billing/github-codespaces |
| github.dev (VS Code for the Web) | Yes | $0; press `.` on any repository | Reading a partner's code, or editing a Markdown file, with no install | Fine | https://docs.github.com/en/codespaces/the-githubdev-web-based-editor |
| Saved replies | Yes; personal to each account | $0; usable "in issues, pull requests, and discussions" | A leader keeps the three questions, or the "what I agree with and why" prompt, one click away | Fine for prompts; avoid canned feedback, which reads as a machine | https://docs.github.com/en/get-started/writing-on-github/working-with-saved-replies/about-saved-replies |
| Team mentions | Yes | $0; "mentioning the team's name" notifies all; for a secret team, "the team name is visible in the mention text" | A leader reaches the whole cohort with `@humanshaped/<team>` | Fine, used sparingly | https://docs.github.com/en/organizations/organizing-members-into-teams/about-teams |
| Watching and notifications | Yes | $0; each person's own setting | Week 0: watch your cohort repository for discussions | Supports agency: the learner chooses what reaches them | https://docs.github.com/en/subscriptions-and-notifications/get-started/configuring-notifications |
| Repository insights graphs (Pulse, contributors, traffic) | **No** on Free private | Needs Team | Not needed | Avoid anyway (see below) | https://docs.github.com/en/repositories/viewing-activity-and-data-for-your-repository/viewing-a-summary-of-repository-activity |
| Gists | Personal, not organization-owned; secret gists are unlisted, not private ("If you send the URL ... they'll be able to see it") | $0 | Not for cohort work | Avoid for anything a learner expects to stay in the cohort | https://docs.github.com/en/get-started/writing-on-github/editing-and-sharing-content-with-gists/creating-gists |

## 5. GitHub's education programs

| Feature | Free private? | Cost and permission | Use in a cohort | Verdict | Source |
|---|---|---|---|---|---|
| GitHub Classroom | **Retired.** "As of August 28, 2026, GitHub Classroom is now deprecated"; its site and APIs "have now been decommissioned" | n/a | It also put each assignment repository in the organization, while our learners' apps live in their own accounts, so it never fit | Do not plan around it or its successors (Codio, Classroom 50) | https://github.blog/changelog/2026-08-27-github-classroom-deprecated |
| GitHub Team free through GitHub Education | Would unlock wikis, protected branches, CODEOWNERS, team reviewers, and draft pull requests on private repositories | Requires "Be an educator, faculty member, or researcher" at an accredited institution with "a verifiable school-issued email address" | If Ben qualifies through a school, `humanshaped` could move to Team at $0 | A decision only Ben can make (see Open questions) | https://docs.github.com/en/education/about-github-education/github-education-for-teachers/about-github-education-for-teachers ; https://docs.github.com/en/education/about-github-education/github-education-for-teachers/apply-to-github-education-as-a-teacher |
| Copilot Free and Copilot Student | Personal plans | Copilot Free has "an allowance of AI credits" and auto model choice; Copilot Student is "Available to verified students"; Free is not available to anyone who already has Copilot "through an organization" | The open path for a learner with no paid agent | Fine as one path among Claude and Gemini; the course stays agent-neutral | https://docs.github.com/en/copilot/get-started/plans |
| Copilot Pro free for verified educators | Personal | Through GitHub Education verification | A leader who also teaches at a school | Personal benefit; nothing to build | https://docs.github.com/en/copilot/how-tos/manage-your-account/get-free-access-to-copilot-pro |
| GitHub Skills | Free; runs in the learner's own account | $0; "free interactive courses that are built into GitHub with instant automated feedback" | Stuck resources: `introduction-to-github`, `communicate-using-markdown`, `review-pull-requests`, `resolve-merge-conflicts`, `github-pages` (Checked: these are current template repositories in the `skills` organization) | Good for the mechanics; it is step-following, so it belongs on the stuck pages, never as the week's work | https://docs.github.com/en/get-started/start-your-journey/git-and-github-learning-resources |
| GitHub Models | Free, rate limited, for any account (GitHub blog) | $0 within the limits | A learner prototypes an AI feature in their own app | Only through `learning-orientation-design`; never to write course copy or feedback | https://github.blog/ai-and-ml/llms/solving-the-inference-problem-for-open-source-ai-projects-with-github-models/ |
| Team Discussions | **Retired** ("Team Discussions are retired") | n/a | n/a | Repository discussions replace it, as already built | https://docs.github.com/en/organizations/organizing-members-into-teams/about-teams |
| Sponsors | Irrelevant to a free course | n/a | n/a | Skip | n/a |

## 6. What the site's GitHub App would need

| To do this from the site | Permission to add | Notes |
|---|---|---|
| Show and post discussions | Discussions (already held) | Category forms, polls, and pinning stay on github.com |
| Open issues as the learner, read the feedback queue | Repository "Issues": read and write | Learners already may open issues at Read |
| Show or comment on pull requests | Repository "Pull requests": read and write | Opening one also needs the learner to hold Write |
| Add the week's files, forms, and templates | Repository "Contents": write; "Workflows" if adding Actions files | Contents write is a large grant on every repository the App is installed on; scope the installation to cohort repositories |
| Show a cohort's project board | Organization "Projects": read (write to move cards) | |
| Manage issue types | Organization "Issue Types" | Only if the site, not Ben, sets them |

Source for permission names: https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps

## What to avoid and why

- **Contribution graphs, streaks, and Achievements.** GitHub's profile
  shows a daily contribution graph and badges such as the one for accepted
  answers; by default "your contribution graph and Achievements only show
  activity from public repositories," so cohort work stays off them unless
  a learner opts in. The site should never mirror them, count commits, or
  show a "days active" number: they reward appearing busy, not deciding
  well, and a course built on "ready, or not yet" has no points
  (https://docs.github.com/en/account-and-profile/how-tos/contribution-settings/manage-visibility-settings-for-private-contributions-and-achievements).
- **Leaderboards of answers, reactions, upvotes, or closed issues.** Marking
  an answer is for the asker; turning it into a count makes people race to
  answer instead of helping someone understand.
- **Insights per person.** Discussions insights and project charts are fine
  for a leader reading the cohort's pulse in aggregate, never as a ranking
  of who posted most.
- **Upvote-sorted conversation.** Sorting a cohort's discussions by upvotes
  hides the quiet person's first question; keep the newest-activity order
  the site already uses.
- **Automation that speaks for people.** Actions or saved replies that post
  feedback, nudges, or summaries in a leader's voice make the conversation
  passive; automation may move things (add an issue to a board), not say
  things.
- **Step-following as the week's work.** GitHub Skills and similar bots are
  good for mechanics and poor for judgment; they belong on the stuck
  pages.
- **Gists for cohort work.** A secret gist is visible to anyone with its
  link.
- **Write access without a reason.** Giving learners Write so they can open
  pull requests also lets anyone push to main, since branch protection is
  not available on this plan. Grant it only for the cohorts and weeks that
  use pull requests, and say so.

## Open questions for Ben

1. **Should learners hold Write on their cohort repository?** Pull requests
   and suggested changes on problem statements need it, and on the free
   plan nothing protects the main branch (every version stays in history).
   The alternative is Read plus reviews only, or Triage, which adds labels
   and closing issues but not pull requests.
2. **Should leaders hold Triage or Maintain on the cohort repository**,
   separate from the team, so they can pin, make categories, mark answers,
   and see discussions insights?
3. **Do you qualify for GitHub Education as faculty at an accredited
   institution?** If so, `humanshaped` could move to GitHub Team at no
   cost, which brings private wikis, protected branches, team reviewers,
   and draft pull requests. Whether a free course outside a school fits
   GitHub's terms is yours to judge (and GitHub's to approve).
4. **Should the cohort repository hold files at all?** Course material,
   forms, and templates all need a first commit, and the site would need
   Contents: write to manage them, which is a larger grant than anything
   it holds now.
5. **Where should feedback live: the cohort repository or the learner's
   own app repository?** Issues in the learner's repository reach their
   agent; issues in the cohort repository give leaders one queue. The two
   can coexist, but the course should name one as the home.
6. **Should each cohort get a Project board,** and who moves the cards:
   only the learner whose card it is, or leaders too?
7. **Is Actions wanted beside the site's own `notices` function,** or
   should every reminder stay in one place?

## Not verified

- **Draft pull requests on free private repositories.** The pricing page's
  table puts them in the Team column; the pull request docs carry no plan
  banner. A one-minute test in `cohort-test` would settle it.
- **Category forms and issue forms on free private repositories.** No plan
  banner exists on either page, and I did not add a form to test, since
  that would change the repository.
- **Whether `createDiscussion` from the site honors a category form.** The
  mutation takes a plain body, so I expect it bypasses the form, and the
  site would need to show the same fields itself.
- **Whether a learner's user-owned repository's issues can be added to an
  organization project.** The docs say "from any organization"; user
  accounts are not named.
- **Whether a learner's personal Codespaces quota covers codespaces made
  from organization repositories.** The docs say the user pays; whether the
  free 120 hours apply first is implied but not stated. It does not matter
  if learners use Codespaces only in their own repositories.
- **Whether a private wiki can be switched on in a free organization at
  all.** The docs say no; I did not try, since that changes a setting.
- **GitHub Models' current free limits.** Only a GitHub blog post describes
  the free tier; the docs page I fetched did not load its limits.
- **Whether repository labels are copied when a repository is made from a
  template.** Not checked.
