# Cohort conversation: GitHub Discussions in a private repository

*Research done 2026-10-03. Every source below was read on that date.
Where a source is a third party (a blog post, a community thread) it is
labeled, and where something could not be confirmed from a primary
source it says so. The decision this serves is already made in
`DECISIONS.md`: one `humanshaped` organization holds all conversation,
and a cohort's conversation is private to the cohort by default.*

## The short answer

Give each cohort its own private repository with Discussions on, and a
secret team in the `humanshaped` organization that holds the cohort's
members and has access to that repository. Switch "Sign in with GitHub"
from the current OAuth App to a GitHub App owned by the organization,
asking for only three things: read the person's email addresses, read
and write Discussions, and manage organization members. The student's
own token (from sign-in) reads and posts the conversation, so every post
is theirs, marked as made through the app. A small Supabase Edge
Function, holding the app's private key, adds a student to their
cohort's team when they join and removes them when they leave. The
student accepts one GitHub invitation, once, to join the organization.

The OAuth App cannot do this honestly: the only scope GitHub accepts for
private-repository discussions is `repo`, which is full read and write
access to every private repository the student owns or can reach.

## 1. Discussions on private repositories in a free organization

| Question | Answer | Source |
|---|---|---|
| Can Discussions be turned on in a private repository? | Yes. "Repository owners and people with write access can enable GitHub Discussions for a community on their public and private repositories." | https://docs.github.com/en/discussions/quickstart |
| Since when? | March 9, 2021: "maintainers and admins of private repositories can now enable Discussions under Features in the repository settings." No plan is named. | https://github.blog/changelog/2021-03-09-github-discussions-now-available-for-private-repositories/ |
| Does the free organization plan allow private repositories? | Yes: "unlimited collaborators on unlimited public repositories with a full feature set, or unlimited private repositories with a limited feature set." | https://docs.github.com/en/get-started/learning-about-github/githubs-plans |
| Who can take part? | "Anyone with access to a repository or organization can create and participate in discussions there." | https://docs.github.com/en/discussions/collaborating-with-your-community-using-discussions/about-discussions |
| Category limit | "Each repository or organization can have up to 25 categories." | https://docs.github.com/en/discussions/managing-discussions-for-your-community/managing-categories-for-discussions |

**Not verified.** No GitHub page I found says in so many words that
Discussions is included in the "limited feature set" for private
repositories on the free organization plan. The plans page does not
define that set, and neither the Discussions docs nor the 2021
changelog name a plan or carry a "requires a paid plan" banner, which
GitHub's docs do carry for paid features. The way to settle it is to
turn Discussions on in one private repository in `humanshaped` and see
the tab appear. That takes a minute and should be the first setup step.

## 2. Scopes: OAuth App versus GitHub App

### What the OAuth App would need

- GitHub's Discussions guide: "Access tokens require the `repo` scope
  for private repositories and the `public_repo` scope for public
  repositories." https://docs.github.com/en/graphql/guides/using-the-graphql-api-for-discussions
- `repo` "grants full access to public and private repositories,"
  including code, commit statuses, invitations, and webhooks. There is
  no discussion scope. https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps
- OAuth App scopes cover everything the person can reach, not chosen
  repositories: with a GitHub App, "the user or organization owner who
  installed the app can decide what repositories the app can access,"
  unlike OAuth apps. https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/deciding-when-to-build-a-github-app

So, asking a student for `repo` means asking to read and change every
private repository they have, including their employer's or their
family's, to post a comment in a cohort thread. That is not honest to
ask, and the consent screen would say so in plain words.

### What a GitHub App would need

- GitHub Apps have a "Discussions" repository permission (named as the
  permission the `discussion` and `discussion_comment` webhooks require:
  "At least read-level access for the 'Discussions' repository
  permission"). https://docs.github.com/en/webhooks/webhook-events-and-payloads
- A user access token "does not use scopes. Instead, it uses
  fine-grained permissions," and "only has permissions that both the user
  and the app have," and "can only access resources that both the user
  and app can access." https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app
- Posts are the student's, with the app shown: GitHub shows "your profile
  picture along with the app's identicon badge as the author."
  https://docs.github.com/en/apps/using-github-apps/authorizing-github-apps
- GitHub's own advice: "In general, GitHub Apps are preferred over OAuth
  apps," and their tokens are short lived.
  https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/deciding-when-to-build-a-github-app

| | OAuth App, `repo` | GitHub App, Discussions: read and write |
|---|---|---|
| Reach | Every private and public repository the student can reach, code included | Only discussions, only in repositories where the app is installed (the `humanshaped` cohort repositories) and the student also has access |
| Who appears as author | The student | The student, with the app's badge |
| Token life | Until revoked (unless `offline_access` is requested) | Eight hours, with a six-month refresh token |
| Honest to ask a beginner? | No | Yes |

**Not verified.** GitHub publishes no table that maps each GraphQL
mutation (`createDiscussion`, `addDiscussionComment`) to a GitHub App
permission. The Discussions permission is the obvious match and is what
giscus relies on, but the first build should confirm it with one real
post, reading the `X-Accepted-GitHub-Permissions` header if it fails
(https://github.blog/changelog/2023-08-10-x-accepted-github-permissions-header-for-fine-grained-permission-actors/).

## 3. Supabase sign-in with a GitHub App

| Question | Answer | Source |
|---|---|---|
| Can Supabase's GitHub provider take a GitHub App's client ID and secret? | Yes in practice. GitHub Apps use the same web flow ("If your app runs in the browser, you should use the web application flow"). A third-party write-up (October 2023) configured Supabase exactly this way and needed the "Email addresses: read-only" account permission, because Supabase reads the user's email. Supabase's own docs only describe an OAuth App. | https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app ; https://warchantua.hashnode.dev/supabase-and-github-app-authentication-done-right (third party) ; https://supabase.com/docs/guides/auth/social-login/auth-github |
| Does the browser get the GitHub token? | Yes, in the session returned at sign-in: the `signInWithOAuth` reference shows reading `session.provider_token` and `session.provider_refresh_token`. | https://supabase.com/docs/reference/javascript/auth-signinwithoauth |
| Does Supabase store or refresh it? | No. "Provider tokens are intentionally not stored in your project's database," and "Supabase Auth does not manage refreshing the provider token for the user." A Supabase collaborator, February 25, 2025: "It is not stored and is up to you to store somewhere and refresh." | https://supabase.com/docs/guides/auth/social-login ; https://github.com/orgs/supabase/discussions/33828 |
| How long does a GitHub App user token last? | "The user access token expires after eight hours"; "the refresh token expires after six months." Expiry can be switched off in the app's settings. | https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens |
| Can the browser refresh it? | Not safely. Refreshing needs the client secret ("Required unless the user access token was generated using the device flow"), which must never be in the page. A Supabase issue (January 2024, closed as not planned) records providers refusing refresh from the browser. | same GitHub page ; https://github.com/supabase/auth/issues/1387 |
| Is `provider_refresh_token` filled for an OAuth App? | No, it is null, because OAuth Apps do not issue refresh tokens by default. | https://github.com/orgs/supabase/discussions/18399 |

**Not verified.** Two things to confirm on the first real sign-in.
First, that `provider_token` survives a page reload in supabase-js (it
is part of the stored session, but community reports say it drops once
Supabase refreshes its own session, about hourly). Second, that
switching the provider from the OAuth App to a GitHub App keeps each
person's existing Supabase account: Supabase keys the identity on the
GitHub user ID, which does not change between apps, but I did not find
this in Supabase's docs. Since only test accounts exist so far, the
risk is small.

## 4. Getting a student into a private cohort repository at $0

| Path | How it works | Cost and limits | Source |
|---|---|---|---|
| **Organization member on a secret team** | Adding a non-member to a team "will send an invitation to the person via email," and the membership stays "pending" until they accept. | Free plan: no seat limit found; a seat is only needed "if your organization has a paid per-user subscription." Invitations expire after seven days. 50 invitations per 24 hours until the organization is a month old, then 500. | https://docs.github.com/en/rest/teams/members ; https://docs.github.com/en/organizations/managing-membership-in-your-organization/inviting-users-to-join-your-organization |
| **Outside collaborator on the repository** | Invited per repository; "Outside collaborators cannot be added to a team." | "Unless you are on a free plan, adding an outside collaborator to a private repository will use one of your paid licenses." So free here. | https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-outside-collaborators/adding-outside-collaborators-to-repositories-in-your-organization |

Either way the student has to accept something on GitHub. There is no
way to grant access to a private repository without the person
accepting.

**App permissions each path needs** (from
https://docs.github.com/en/rest/authentication/permissions-required-for-github-apps):

| Action | Endpoint | GitHub App permission |
|---|---|---|
| Add to a team (invites non-members) | `PUT /orgs/{org}/teams/{team}/memberships/{user}` | Members: write |
| Remove from a team | `DELETE /orgs/{org}/teams/{team}/memberships/{user}` | Members: write |
| Remove from the organization | `DELETE /orgs/{org}/memberships/{user}` | Members: write |
| Create a team | `POST /orgs/{org}/teams` | Members: write |
| Student accepts their own invitation from the site | `PATCH /user/memberships/orgs/{org}` | Members: write, user token only |
| Add an outside collaborator | `PUT /repos/{owner}/{repo}/collaborators/{user}` | Administration: write |
| Create a repository | `POST /orgs/{org}/repos` | Administration: write |

Members: write is narrower than Administration: write (which governs a
repository's settings), and teams make "leave the cohort" one call.
So, the team path is the better fit.

**Can it run in a free Supabase Edge Function?** Yes. The function signs
a short JWT with the app's private key, exchanges it for an installation
token, and calls the endpoint above; all of that is ordinary HTTPS. The
free plan includes 500,000 Edge Function invocations a month
(https://supabase.com/docs/guides/functions/pricing), and a cohort uses a
few dozen.

**Two organization settings matter for privacy.**

- Base permissions "apply to all members of an organization when
  accessing any of the organization's repositories"
  (https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/setting-base-permissions-for-an-organization).
  Set them to "No permission," or every student could read every other
  cohort's private repository.
- Secret teams "are only visible to the people on the team and
  organization owners" (https://docs.github.com/en/organizations/organizing-members-into-teams/about-teams).
  Make each cohort's team secret.

Also, OAuth App access restrictions are on by default for new
organizations, though "Applications that are owned by the organization
are automatically given access"
(https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/about-oauth-app-access-restrictions).
Because the app is owned by `humanshaped`, this does not get in the way.

**When someone leaves.** Removing a member keeps "their membership data
... for three months" so they can be restored
(https://docs.github.com/en/organizations/managing-membership-in-your-organization/removing-a-member-from-your-organization).
I could not find what GitHub does with a removed member's discussion
comments; I expect they stay, attributed to the person, as they do on
issues. The site should say so plainly beside "Leave," and should not
promise to delete posts it does not own.

## 5. Alternatives weighed

| Option | Verdict | Why |
|---|---|---|
| One private repository per cohort | **Recommended** | Access follows repository access, so "private to the cohort" is enforced by GitHub, not by our code. Opening a cohort means making its repository public, one setting. |
| One private repository, a category per cohort | No | Categories cannot be restricted to people or teams; the only control is the announcement format, where "only people with maintain or admin permissions can create new discussions, but anyone can comment and reply." Also capped at 25 categories. https://docs.github.com/en/discussions/managing-discussions-for-your-community/managing-categories-for-discussions |
| Organization-wide Discussions | Later, for the open hub | Same visibility problem as categories. Good for the public, cross-cohort conversation. Team Discussions "are retired." https://docs.github.com/en/organizations/organizing-members-into-teams/about-teams |
| giscus | Only for opened cohorts | "The repository is public, otherwise visitors will not be able to view the discussion." It does post as the visitor. https://giscus.app/ |
| Outside collaborators instead of a team | Fallback | Free, but needs Administration: write and one invitation per repository. |
| Repository per teacher | No | A teacher's cohorts would see each other. |

**Notifications are GitHub's, at no cost to us.** People participating
in a thread are notified, and anyone can watch a repository for
discussions only, delivered on the web or by email
(https://docs.github.com/en/subscriptions-and-notifications/get-started/configuring-notifications).
The site should tell students, in week 0, to watch their cohort
repository for discussions. Whether new team members are auto-watched
depends on each person's own setting; I did not verify the default.

## 6. Recommendation

### Ben does this once

1. In `humanshaped`, under Settings, Member privileges: set base
   permissions to **No permission**, and stop members from creating
   repositories and teams.
2. Make one private test repository and turn on Discussions (Settings,
   Features). If the tab appears, the free plan includes it, which
   settles the one open question in part 1.
3. Create a GitHub App owned by `humanshaped` (Organization settings,
   Developer settings, GitHub Apps, New). Homepage
   `https://humanshaped.org`; callback URL
   `https://bifrieqzkihuxfzttgvd.supabase.co/auth/v1/callback`; leave
   "Expire user authorization tokens" on; webhooks off; "Only on this
   account." Permissions: Repository, **Discussions: read and write**
   (Metadata: read is added automatically); Organization, **Members: read
   and write**; Account, **Email addresses: read-only**. Nothing else.
4. Install the app on `humanshaped`, all repositories (so new cohort
   repositories are covered), or select them one at a time if you
   prefer the narrower choice.
5. Generate a client secret and a private key. In Supabase,
   Authentication, Providers, GitHub: replace the OAuth App's client ID
   and secret with the GitHub App's. Put the private key, app ID,
   installation ID, client ID, and client secret into Edge Function
   secrets. None of them go in this repository.
6. Per cohort, until a teacher page does it: one private repository
   (`cohort-<slug>`) with Discussions on and categories for the weeks,
   and one secret team with access to it. Recording the repository and
   team on the cohort row lets the code find them.
7. After testing, delete the old OAuth App.

### What the site's code does

- `/account/` keeps `provider_token` for the browser tab only (in
  `sessionStorage`), never in the database, so the hub never holds a
  student's GitHub key. When it expires (eight hours, or a reload that
  lost it), the page asks GitHub again; since the student already
  authorized the app, that is one quick redirect. If that proves
  annoying, the next step up is an Edge Function that holds the refresh
  token, encrypted, and swaps it for a new token on request.
- Joining a cohort calls an Edge Function `cohort-access`. It checks the
  Supabase enrollment, then adds the student's GitHub login to the
  cohort's team. The page then says: "GitHub has sent you an invitation
  to the humanshaped organization. Accept it to see your cohort's
  conversation," with a link to `https://github.com/orgs/humanshaped/invitation`,
  and checks the membership state until it is active. (Accepting from
  the site with `PATCH /user/memberships/orgs/humanshaped` also works
  with this app's permissions; worth trying.)
- `/cohort/` and `/live/` read the cohort repository's discussions with
  GraphQL as the student, render them with marked and DOMPurify as the
  reading pages already do, and post with `createDiscussion` and
  `addDiscussionComment`. Every thread links to GitHub, where students
  can reply, edit, and get notified.
- Leaving a cohort calls the same function, which removes the student
  from the team, and from the organization if they are in no other
  cohort.
- Opening a cohort is a teacher's choice: make the repository public.
  Then giscus or the same code can show it to anyone.

### Costs and risks, fairly

- **$0.** Free organization, free Supabase plan, no seats. The one
  unconfirmed piece is Discussions on private repositories in the free
  plan, settled by step 2.
- **One more click for students.** Accepting an organization invitation
  is a GitHub step a beginner has not seen before, and it expires after
  seven days. The setup week is the right place for it, with a
  screenshot.
- **The private key is powerful.** Members: write can add and remove
  anyone in the organization. It lives only in Supabase secrets, and
  the function should only ever touch the cohort teams.
- **Tokens expire.** Eight-hour tokens mean the occasional re-sign-in.
  That is the honest trade for not storing anyone's GitHub key.
- **Membership is visible to GitHub, not to the world.** A student in
  `humanshaped` is an organization member; whether that shows on their
  profile is their own choice in GitHub. I did not verify the default.
- **Posts outlive a departure.** What a student writes stays in the
  cohort repository under their name after they leave, unless they
  delete it on GitHub. Say so beside "Leave."
- **Two first-build checks:** the Discussions permission really covers
  the two mutations, and the Supabase switch keeps existing accounts.

## 7. Showing and posting the conversation on the site (October 3, 2026)

*Research for the build that reads a cohort's discussions on /cohort/
and /live/ and posts to them as the student. Sources read on this date.
"Checked" means I read it in the source or ran it myself.*

### GitHub's GraphQL API

| Question | Answer | Source |
|---|---|---|
| How are a repository's discussions listed? | `repository.discussions(first, after, categoryId, answered, orderBy)`, and `orderBy` defaults to `{field: UPDATED_AT, direction: DESC}`; the other field is `CREATED_AT`. | https://docs.github.com/en/graphql/guides/using-the-graphql-api-for-discussions (Checked) |
| Categories? | `repository.discussionCategories(first)`, each with `id`, `name`, `slug`, `emoji`, `emojiHTML`, `isAnswerable`, and `description`. No field says whether a category uses the announcement format, or whether the viewer may start a discussion in it. | https://docs.github.com/en/graphql/reference/discussions (Checked) |
| Posting | `createDiscussion(input: {repositoryId, categoryId, title, body})` and `addDiscussionComment(input: {discussionId, body, replyToId})`. | same guide (Checked) |
| Do the queries the site uses actually run? | Yes. I ran the list query (five discussions with author, category, comment count, and the newest comment's time, plus the categories and `rateLimit`) and the thread query (body, comments, and replies) against humanshaped/cohort-test with Ben's own `gh` sign-in, read only. Each cost 1 point. The repository has the six default categories: Announcements, General, Ideas, Polls, Q&A, and Show and tell. | Run on October 3 (Checked) |
| What does GitHub return for a repository the person cannot see? | The same as for one that does not exist: HTTP 200, `data.repository` null, and an error of type `NOT_FOUND` ("Could not resolve to a Repository with the name ..."). So the site cannot tell "your invitation is not accepted" from "the repository is gone", and should say both. | Run on October 3 (Checked) |
| An expired or wrong token? | HTTP 401, `{"message": "Bad credentials"}`. | Run on October 3 (Checked) |
| Can a web page call it? | Yes. `api.github.com/graphql` answers a preflight with `access-control-allow-origin: *` and allows the `Authorization` and `Content-Type` headers. | Run on October 3 (Checked) |
| Rate limits for a user's token | 5,000 points an hour per user; a query costs the connections it could fetch divided by 100, at least 1. Secondary limits: 2,000 points a minute, 100 concurrent requests, mutations cost 5 points, and "no more than 80 content-generating requests per minute and no more than 500 content-generating requests per hour". Over the primary limit the status is still 200 with an error and `x-ratelimit-remaining: 0`; over a secondary limit it is 200 or 403 with a message. | https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api (Checked) |

So a student opening the cohort page spends 1 point, and opening a
thread another 1; the hourly limit is far away. The content limit is
the only one a person could reach, and only by posting more than once a
second.

**Not verified.**

- Whether `UPDATED_AT` moves when someone comments. GitHub does not say.
  The site reads the newest comment's time as well and shows whichever
  is later as "last activity", so the label is right either way, though
  the order is GitHub's.
- The exact error `type` for a rate limit. The docs say only "an error
  message". The site treats an HTTP 403, a `RATE_LIMITED` type, or the
  words "rate limit" in a message as a rate limit, and shows GitHub's
  own message.
- Whether a student can start a discussion in a category that uses the
  announcement format (GitHub says only maintainers can) or in Polls
  (the API has no way to give a poll its choices). The site leaves both
  out of the "start a conversation" choices, so a student never picks
  one that fails.
- That the GitHub App's "Discussions: read and write" covers both
  mutations. This still needs one real post by a student (section 2).

### The token in the browser

| Question | Answer | Source |
|---|---|---|
| Where does the GitHub token arrive? | supabase-js 2.117.2 starts in the implicit flow by default (`flowType: 'implicit'`), reads `provider_token` and `provider_refresh_token` from the address the person returns to, and puts them on the session it saves. | https://cdn.jsdelivr.net/npm/@supabase/auth-js@2.117.2/dist/main/GoTrueClient.js, `_getSessionFromURL` (Checked) |
| Where does supabase-js keep it? | In the stored session, which in a browser is `localStorage` under the client's storage key: `_saveSession` writes the whole session object. | same file, `_saveSession` (Checked) |
| For how long? | Until Supabase refreshes its own session (about hourly): the refreshed session comes from the auth server, which never stores provider tokens, so it has none. The library's own documentation says it "will emit these values **only once** immediately after the user signs in" and tells you to keep them yourself. | same file, the `signInWithOAuth` comment; https://supabase.com/docs/guides/auth/social-login ("Provider tokens are intentionally not stored"); third party: https://github.com/orgs/supabase/discussions/30045 (Checked) |
| How long does GitHub honor it? | Eight hours for a GitHub App user token with expiry on, which "Human Shaped Hub" has. | https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens (Checked) |

**What the site does with that.** The first page that sees a
`provider_token` copies it, with the time, into `sessionStorage` (this
tab only, gone when the tab closes), and then removes
`provider_token` and `provider_refresh_token` from the session
supabase-js saved in `localStorage`, so the student's GitHub key never
sits in long-lived storage. The refresh token is thrown away: it is
useless without the app's client secret, which never leaves Supabase.
The page treats the token as expired after seven and a half hours, or
as soon as GitHub answers 401, and then offers "Sign in again to read it
here", which sends the person through GitHub (one quick redirect, since
they already authorized the app) and back to the same page.

**Not verified.** That GitHub skips its consent screen on that second
trip, and that supabase-js 2.117.2 is not confused by the edit to its
stored session (it parses the stored JSON on load, and only two fields
the server never sends again are removed). Both need a real sign-in.
