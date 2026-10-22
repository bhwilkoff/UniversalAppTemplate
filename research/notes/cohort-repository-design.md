# The cohort repository: design

*Written October 22, 2026, from Ben's answers to the open questions in
research/notes/cohort-repository-tools-notes.md. Written by Claude,
awaiting Ben's review. What is built is marked **Built**; what waits on
a decision or a permission is marked **Waiting**.*

## What Ben decided

1. **Learners write.** "Learners should be able to write things to the
   cohort repository. Let's figure out how to best protect against
   malicious behavior, but almost everything on Github is recoverable via
   reverting."
2. **Leaders get more, and every control lives on humanshaped.org.** "I'd
   like for the permissions to be as granular as possible both within the
   Human Shaped and on github. The goal would be to allow for granular
   controls within HumanShaped.org and have those flow through to github.
   The more we can spend time on our platform (rather than dealing with
   more technical issues in github) the better the learning experience
   will be."
3. **No institution's plan.** Human Shaped stays independent ("we need
   Human Shaped to be adaptable at this early stage and I don't want to
   tie it to an institution that could control it later"), so it stays on
   GitHub's Free plan, and nothing here depends on a paid feature.
4. **Shared files live in the cohort repository.** "Learners own all of
   their individual files (github), videos from exchanges (google drive),
   and apps (their own app store accounts, etc.), any shared resource or
   file should be stored on github within the cohort repository."
5. **Feedback has two homes and one view.** Feedback on sessions and on
   what is submitted on humanshaped.org belongs in the cohort repository;
   feedback on an app belongs in that app's own repository; and
   "humanshaped.org should seemlessly pull in these different types of
   feedback and the discussions going on and present them in a single
   interface that is easily understood by learners."
6. **A board for each cohort, once its purpose is clear.** "Anyone should
   be able to move cards, but ... we need to ensure it is clear what the
   board should allow learners and leaders to do together that they
   cannot do in other spaces."
7. **Notifications through GitHub.** "Leveraging Github Actions and
   notifications in a broader way makes much more sense than using Google
   App Scripts on a single google account as our long-term notification
   strategy."

## 1 and 2. Roles, set here, carried to GitHub — Built

GitHub gives a free organization five repository roles (read, triage,
write, maintain, admin); custom roles need Enterprise. Human Shaped uses
the first four by their own names, so a learner who opens GitHub sees the
same word they saw here.

| Who | Role on GitHub | Who chooses |
|---|---|---|
| A leader of the cohort | Maintain | Always |
| A learner | Write | Unless a leader chooses Read, Triage, or Maintain for them in People |
| Anyone else | None | — |
| Ben and other organization owners | Admin | GitHub, outside the site |

How it flows: `repo_roles` (migration 20261022020000) holds a leader's
choice, with who made it and when; only `set_repo_role` writes it. The
cohort team still gives everyone read access, which is what the
conversation needs. Each person's own role sits above that as a direct
grant on the repository, which GitHub gives at once to an organization
member (it answers 204, with no second invitation). The `cohort-access`
function sets it when someone joins on GitHub and takes it off when they
leave. When a leader changes a role in People, the page asks the
function to **sync**: it sets every role that differs, finishes any
invitation that has since been accepted, and takes off anyone who has
left the cohort. Someone who never asked to join on GitHub is left
alone, because GitHub would email them an invitation they did not ask
for. `github_access.repo_role` records what GitHub actually holds, so
People can show when the two differ.

## Protecting a repository everyone writes to — Built

A free organization cannot protect a branch in a private repository, so
protection comes from what Write cannot do, from GitHub's history, and
from a leader's levers on humanshaped.org.

- **What Write cannot do.** Delete or rename the repository, change who
  can see it, change its settings, or moderate other people's comments.
  Only the organization's owners hold admin.
- **Every change is a commit.** Any file can be put back from its
  history, and GitHub's Activity view
  (`github.com/humanshaped/<repo>/activity`) lists every push, forced
  ones included, with what the branch held before.
- **A forced push is kept.** Each new repository starts with
  `.github/workflows/keep-replaced-history.yml`: when a push replaces a
  branch's history, it puts what was there on a `recovered/...` branch
  and opens an issue saying so. Its job runs only on a forced push, and a
  skipped job uses no Actions minutes.
- **A leader's levers.** Set someone to Read in People, and GitHub takes
  their write access away within seconds; take them out of the cohort,
  and the next sync takes them off the repository.
- **Not covered.** Deleting a branch cannot be caught by a workflow
  (GitHub's delete event carries no commit), but the Activity view shows
  it and a branch can be restored from there. A person can still post
  something unkind; a leader hides or deletes it on GitHub, as Maintain
  allows.

## 4. Files — Built

The cohort page has a seventh section, **Files**, between Conversation
and Exchanges. It lists the repository's files by folder (`resources/`,
then `sessions/week-1/` and on), each opening on GitHub, and lets anyone
with Write or Maintain add one as themselves: a folder, a file of up to
25 MB (GitHub's own limit for the web; videos go to Drive as an
exchange), and a commit in their name. A name already in that folder is
replaced only after a confirm, and GitHub keeps the old one in its
history. Rules and tests: `assets/cohort-files-lib.js`,
`tools/test/cohort-files-lib.test.mjs`.

A new repository starts with a README saying what it is for and where
things go, issues turned on, and the workflow above. Asking the
function to set up an older repository again adds whatever is missing
and never replaces a file people have changed.

## 7. Notifications — Built, waiting on the automation repository

**Built: Watch on GitHub**, in Conversation. Watching the cohort
repository means GitHub emails the person about new discussions,
issues, and files, by their own settings, from GitHub's own servers, at
no cost. If GitHub will not let the page change it, the button becomes
a link to the repository's own Watch button. (Not verified: whether
GitHub lets a GitHub App's user token set a subscription at all. Its
permissions page lists only reading subscriptions under "Watching".)

**Built: session threads the day before.** `supabase/functions/github-tick` (rules in `tick.js`, tested in `tools/test/github-tick.test.mjs`) opens each session's discussion within the day before it, with the same words and category as `/live/` and the start written out in the cohort's zone, and keeps the session's thread number, never replacing one a leader opened. It accepts only a workflow on the main branch of `humanshaped/automation`, proven by GitHub's OIDC token. The workflow is in `tools/automation/repo/`, waiting for that public repository to exist.

**The plan beyond that: the reminders the Apps Script sends today, moved to GitHub.**
GitHub can only email someone about something that happens on GitHub,
so the plan is to make the things people need to hear about happen
there, and let watching and mentions carry them:

1. **A session's discussion opens the day before**, in the cohort
   repository, with the time on each reader's clock and the week's
   challenge. Everyone watching is emailed by GitHub, and the thread is
   ready for the session (the session thread `/live/` already uses).
2. **Feedback a leader writes** (section 5) becomes an issue or comment
   that mentions the learner, so GitHub emails them.
3. **The schedule runs in GitHub Actions**, in a small public repository
   in the organization (`humanshaped/automation`), because public
   repositories' Actions minutes are free and unlimited while private
   ones share 2,000 a month. Its workflow proves who it is to a Supabase
   function with GitHub's own OIDC token, so no secret is pasted
   anywhere (the same idea as the Apps Script's Google ID token today),
   and that function does the work with the GitHub App.

The Apps Script stays for what only Google can do (calendar invitations
and Meet rooms), and its email digest stays until each kind of notice it
sends has moved.

## 5. Feedback in one view — Built

Learners would see one **Feedback** list in Your work, newest first,
each item saying where it lives:

| Kind | Lives in | Read with |
|---|---|---|
| A leader's note on a bring-back or a session | The cohort repository, as an issue for that learner | The learner's GitHub token (Issues: read) |
| Comments on what they posted in Conversation | The cohort repository's Discussions | The same token |
| Issues on their app | Their app's own repository | GitHub's public API, for a public repository |
| A leader's private note | humanshaped.org, as today | Supabase |

**Built** as Feedback, first in Your work: one list, newest first, each
row naming where it lives and showing who can see it. The leader's
choice between the cohort and one person already exists: feedback on a
bring-back is the cohort's, and a follow-up note is for them and their
leaders alone (Ben, October 22: "you can just go ahead"). Feedback on
bring-backs still lives on humanshaped.org; moving it into the cohort
repository as issues is a later step, and the list would not change.

## 6. The board — Built, as Asks

What a board does that no other place does is hold **shared work with a
state and an owner**: something that needs doing, who has taken it, and
whether it is done, visible to everyone and movable by anyone. A
discussion has no state; feedback runs from a leader to one learner; an
app's issues belong to one builder.

The proposal: the board holds **the cohort's asks**. Anyone opens a
card, "I am stuck on sign-in on Android", "Can someone test my app on an
iPhone?", "Who wants to pair on the showing?", and anyone moves it from
**Asked** to **Someone has it** (assigning themselves) to **Done**. It
makes helping each other visible and claimable, which is the cohort's
work that no other space holds, and it never measures anyone: no counts
per person, and no card tracks a learner's progress. Each card is an
issue labeled "ask" in the cohort repository, made from a short form in
the cohort's **Asks** section, and its column is the issue's own state
(open, assigned, closed), so the board on humanshaped.org and the issues
on GitHub never disagree. A GitHub Project view can be added later
without changing anything, since the app has Organization projects.

## What Ben does

Done October 22: Ben gave the app Contents, Workflows, Issues,
Organization projects, and Watching, and the organization accepted them.

Still Ben's (the safety check stops Claude from making repositories):

1. **Make Kit test's repository** from its Conversation section.
2. **Make `humanshaped/automation`** (public) from `tools/automation/repo/`.

Earlier list, kept for the record:

1. **Give the Human Shaped Hub app more permissions**, at
   github.com/organizations/humanshaped/settings/apps/human-shaped-hub/permissions,
   then accept them for the organization when GitHub asks:
   - Repository: **Contents**, read and write (Files and the README)
   - Repository: **Workflows**, read and write (the workflow file)
   - Repository: **Issues**, read and write (the workflow's issue, and
     feedback and the board later)
   - Account: **Watching**, read and write (Watch on GitHub)
   - Later, for the board: Organization **Projects**, read and write
2. **Say yes to making Kit test's repository**, so the whole flow can
   be checked on a real repository before a real cohort uses it.
3. **Decide feedback's privacy** (section 5) and **confirm the board**
   (section 6).

## Why not a paid plan

GitHub Team would add protected branches, private wikis, and team
reviewers, but it costs per person every month. GitHub's education
discounts go to accredited schools, and GitHub for Nonprofits (a free
Team plan) goes to registered 501(c)(3) or equivalent organizations that
are non-commercial and non-academic
(https://github.com/solutions/industry/nonprofits). Human Shaped is
neither today. If it ever becomes a nonprofit, the nonprofit plan would
add those features without tying it to anyone. Until then, everything
above is built for the Free plan.
