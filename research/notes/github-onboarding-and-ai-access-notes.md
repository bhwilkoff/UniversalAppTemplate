# GitHub onboarding and AI access: research notes

Researched 2026-10-01 for the Human Shaped Software launch (about two weeks
out). Every factual claim has its source beside it. Anything I could not
confirm from a primary page is marked **(unverified)** and gathered again in
"What I could not verify" near the end. Prices and limits in this space moved
several times in 2026 (Claude Code on Pro in April, Gemini CLI in June,
Copilot billing in June), so re-check the numbers the week before launch.

Context from the repo, read before the research:

- `bhwilkoff/UniversalAppTemplate` is already a public **template repository**,
  and GitHub Pages for it serves `humanshaped.org` from the `site` branch
  (checked with `gh repo view` and `gh api repos/.../pages`, 2026-10-01).
  Discussions are **off** on it.
- `README.md` "Using it for your app" is three steps: Use this template, open
  in Claude Code, tell it why. Stage 01 assumes one setup step: a GitHub
  account with a public copy so Pages is free.
- There is no `.devcontainer/`, `AGENTS.md` or `GEMINI.md` in the template
  today. `.claude/skills/` holds 145 entries (7.1 MB).
- `.github/workflows/android-build.yml` runs on **every push to `main`**
  (no path filter on push). A student's first web-only push will start an
  Android build. Worth checking it goes green on a fresh copy with no
  secrets, so nobody's first email from GitHub is a red X.

---

## Topic 1. GitHub as the course's delivery system

### What each GitHub feature offers

| Feature | What it gives a student | Source |
|---|---|---|
| Template repo ("Use this template") | Copies files and directory structure; student picks owner, name, public/private, and whether to include all branches. Only `main` is copied unless "include all branches" is ticked, which keeps the `site` branch out. | https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-repository-from-a-template |
| GitHub Pages | Free on public repos for GitHub Free; site max 1 GB, soft 100 GB/month bandwidth, soft 10 builds/hour; not for commercial SaaS/e-commerce hosting. | https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits |
| Pages enablement | **Must be turned on by a person (or an admin token) once per repo.** Creating a Pages site needs administration rights; the Actions `GITHUB_TOKEN` cannot get them, so `actions/configure-pages` with `enablement: true` fails with "Resource not accessible by integration". | https://dev.to/mohitparmarcoder/githubtoken-cannot-enable-github-pages-and-neither-error-tells-you-that-123c ; https://github.com/actions/configure-pages/issues/40 |
| Codespaces | Personal GitHub Free: 120 core-hours + 15 GB-month storage per month; GitHub Pro: 180 core-hours + 20 GB. 2-core machine billed at $0.18/hour. Without a payment method, usage is **blocked** (not billed) once quota runs out. | https://docs.github.com/en/billing/concepts/product-billing/github-codespaces |
| Codespaces core-hours in practice | 120 core-hours is about 60 hours on a 2-core machine. | https://agentdeals.dev/vendor/github-codespaces (secondary; arithmetic matches the billing doc) |
| Codespaces idle timeout | Default stop after 30 minutes idle; settable 5 to 240 minutes. The page summary also mentioned a 12-hour maximum lifetime **(unverified, re-read the page)**. | https://docs.github.com/en/codespaces/setting-your-user-preferences/setting-your-timeout-period-for-github-codespaces |
| Codespaces prebuilds | Consume storage and are generated with Actions minutes. | https://docs.github.com/en/billing/concepts/product-billing/github-codespaces |
| Claude Code in a Codespace | Anthropic publishes a Dev Container Feature, `ghcr.io/anthropics/devcontainer-features/claude-code:1`; works in Codespaces; sign in through the browser with a Claude account. Recommended alongside the Node feature. | https://github.com/anthropics/devcontainer-features/tree/main/src/claude-code ; https://code.claude.com/docs/en/devcontainer |
| Codespace `GITHUB_TOKEN` | Read/write to the repository for users with write access. The page does not say it can change settings such as Pages, so assume it cannot **(unverified)**. | https://docs.github.com/en/codespaces/reference/security-in-github-codespaces |
| Precedent: CS50 | cs50.dev logs students in with GitHub OAuth, pushes a `.devcontainer.json` and creates a codespace, so students "start programming with just a browser". | https://cs50.readthedocs.io/cs50.dev/ |
| GitHub Skills-style courses | Learner clicks "Use this template", waits about 20 seconds, refreshes; Actions workflows advance the steps and post instructions. `skills/exercise-template` and `skills/exercise-toolkit` give authors the README frame, workflows and composite actions. skills.github.com now redirects to learn.github.com. | https://github.com/skills/exercise-template ; https://github.com/skills/exercise-toolkit ; https://skills.github.com/ |
| GitHub Classroom | **Retired 28 August 2026**, moved to partners (Codio, and Classroom 50 from the Fifty Foundation). The classroom-level Codespaces allowance ended with it. | https://github.com/orgs/community/discussions/196615 |
| GitHub Education | Verified students and teachers keep an individual Codespaces benefit of 180 core-hours and 20 GB a month. Student Developer Pack needs age 13+, enrolment in a degree/diploma course, and school email or dated proof. | https://github.com/orgs/community/discussions/196615 ; https://education.github.com/pack/join |
| Copilot Student | Since 12 March 2026 a separate plan; from 24 June 2026 Free and Student plans use auto model selection as the **only** choice. | https://github.com/orgs/community/discussions/189268 |
| Discussions | Categories, Q&A with marked answers, announcements, polls, pin/lock, convert issues; repo-level or org-level. | https://docs.github.com/en/discussions/collaborating-with-your-community-using-discussions/about-discussions |
| GitHub Mobile | Read and review issues and PRs, edit files in PRs, notifications, Copilot Chat, assign issues to Copilot. Merging a PR is not listed on that page **(unverified either way)**. | https://docs.github.com/en/get-started/using-github/github-mobile |
| Mandatory 2FA | Accounts that show contributor activity get a 45-day enrolment window plus 7-day grace, then lose access until 2FA is on. Worth a line in onboarding so week 3 doesn't lock anyone out. | https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/about-mandatory-two-factor-authentication |

github.dev (press `.` on a repo) is a browser editor with no terminal, so no
agent CLI can run in it. I did not re-fetch its docs this session; this is
long-standing behaviour **(not re-verified for October 2026)**.

### Claude Code in the cloud (the phone-friendly option)

From https://code.claude.com/docs/en/claude-code-on-the-web:

- "Cloud sessions are available on Pro, Max, and Team plans". No compute charge
  for the VM; usage shares the account's normal limits.
- Start from claude.ai/code in a browser, the **Code tab in the Claude mobile
  app**, the Desktop app, or `claude --cloud`.
- GitHub access is through the Claude GitHub App (any public repo, plus private
  repos it is installed on) or `/web-setup` from a local `gh`.

From https://code.claude.com/docs/en/cloud-environments:

- Fresh Ubuntu 24.04 x86_64 VM per session; Python, Node 20 to 22, Java 21 with
  Gradle, Go, Rust, Docker, `git`, `gh`. `gh` works without the student
  logging in.
- **"`git push` works only against the session's current working branch"**,
  so the agent cannot push straight to `main`. Each round ends in a pull
  request that the student merges. For Ben's way of working (the agent pushes
  `main` and Pages updates), this adds one tap per round. It is also a nice
  teaching moment: the merge is the student saying "yes, ship it."
- The proxy allows only a pinned set of GraphQL operations. Whether the REST
  call that turns on Pages gets through is **unverified**. Plan on the student
  clicking Settings, Pages once.
- Commands time out at 2 minutes by default (up to 10), with 30 more minutes
  in the background. No Xcode, since it's Linux. The Android SDK isn't listed
  as preinstalled, but a setup script runs as root.

Claude Code also has a **Desktop app** that "lets you use Claude Code without
the terminal" (https://code.claude.com/docs/en/setup). That suits the "never
open a terminal" student on a Mac or Windows machine.

### Minimum-step paths, from "no GitHub account" to "live on Pages"

Each step is one thing the student does. I counted from a fresh browser.

**A. Claude Code in the cloud (Claude Pro, browser or phone): 8 steps, no installs**

1. Create a GitHub account and verify the email.
2. On the template, Use this template, Create a new repository: name it, keep it Public.
3. In the new repo, Settings, Pages, Source: Deploy from a branch, `main` / root. (Or a Pages Actions workflow; either needs this one click.)
4. Subscribe to Claude Pro at claude.ai.
5. Open claude.ai/code (or the Code tab in the Claude app), connect GitHub, pick the repo, accept the Default environment.
6. Paste the stage 00 why plus the stage 01 kickoff.
7. When the agent opens a pull request, merge it (github.com, or the GitHub app if it supports merging).
8. Open `https://<username>.github.io/<repo>/` on the phone.

Works from a Chromebook, a library computer or a phone. Ceiling: web and
Android via CI. No Xcode, no device testing on this path.

**B. Codespaces (any AI lane): 7 steps once the template carries a devcontainer**

1. GitHub account.
2. Use this template, Public.
3. Settings, Pages, enable (as A3).
4. Code, Codespaces, Create codespace on main. (Needs a `.devcontainer/devcontainer.json` in the template with the Node and Claude Code features. It isn't there today.)
5. In the terminal panel type `claude` (or the agent of the student's lane) and sign in through the browser prompt.
6. Paste the kickoff. The agent can push to `main` (the codespace token has write access).
7. Open the Pages address on the phone.

Costs nothing from GitHub up to about 60 hours a month on 2 cores. Step 5 means
typing one word into a terminal, which goes a little against "never a
terminal". Ceiling: web, Android build/test via Gradle (SDK install needed), no
Apple.

**C. Local Mac: 9 steps, highest ceiling**

1. GitHub account. 2. Use this template, Public. 3. Install the Claude Desktop
app (or `curl -fsSL https://claude.ai/install.sh | bash`;
https://code.claude.com/docs/en/setup). 4. Sign in with Claude Pro/Max.
5. Point it at a new folder and ask the agent to install git/gh, sign in to
GitHub (`gh auth login`, one browser approval) and clone the repo. (macOS
will prompt to install the Command Line Tools for git.) 6. Ask the agent to
turn Pages on (`gh api` runs with the student's own admin token, so step 3 of
the other paths goes away) **(expected to work, not tested this session)**.
7. Paste the kickoff. 8. The agent pushes `main`. 9. Open the address on the
phone. Xcode (a large App Store install) comes in at stage 03, not now.

**D. Local Windows: 9 steps**, as C, with
`irm https://claude.ai/install.ps1 | iex` or the Desktop app. Git for Windows
is optional but enables the Bash tool (https://code.claude.com/docs/en/setup).
No Apple-native builds locally. Apple builds would go through the template's
cloud `appstore-build.yml` on GitHub macOS runners. That those runners are free
on public repos is **unverified** this session.

**E. Phone only:** path A is the only complete one. Everything after stage 02
(native builds on devices, store consoles) needs a computer or CI plus a
developer account.

**Recommendation for Topic 1.** Make A the default "first hour" path in the
course, with C as the path for anyone going past stage 02. Add a
devcontainer to the template so B is one click for the $0 lane. Use GitHub
Skills-style Actions *sparingly*: they suit "did you do the GitHub mechanics"
checks (Pages on, first PR merged), but the course's real checkpoints are
show-and-tell, not bots. Don't build on GitHub Classroom: it's gone.

---

## Topic 2. Lanes for people without a $100 plan

Ben's constraint: no OpenAI products. Where another tool routes to OpenAI
models by default, it's flagged.

### The options, with current terms

| Option | Price and limits (Oct 2026) | Instructions file, skills | Notes, OpenAI routing |
|---|---|---|---|
| **Claude Free** | $0, chat only. "The free claude.ai plan does not include Claude Code access." No cloud sessions. | n/a | https://code.claude.com/docs/en/setup ; https://claude.com/pricing |
| **Claude Pro** | $20/month ($17/month annual). Claude Code included; cloud sessions, Desktop, mobile Code tab included. Limits shared between chat and Code; a 5-hour window plus a weekly limit; Anthropic publishes only multipliers (Pro = 1x). | CLAUDE.md, `.claude/skills`, AGENTS.md (read natively since v2.1.277 when there's no CLAUDE.md, or imported with `@AGENTS.md`) | https://claude.com/pricing ; https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan ; https://ccforeveryone.com/guides/claude-code-limits-and-pricing (secondary); https://code.claude.com/docs/en/memory |
| Pro history | On 21 April 2026 Claude Code vanished from Pro on the pricing page for about 2% of new signups. Anthropic called it an experiment and restored it within days. | | https://www.theregister.com/2026/04/22/anthropic_removes_claude_code_pro/ |
| **Claude Max** | Max 5x from $100, Max 20x listed at $200 by secondary sources. The pricing-page fetch rendered both as "from $100" **(re-check)**. | same | https://claude.com/pricing ; https://ccforeveryone.com/guides/claude-code-limits-and-pricing |
| **Claude API pay-as-you-go** | Sonnet 5 / 5.5 at $2 in / $10 out per million tokens; Opus 5.5 $4/$20; Haiku 4.5 $1/$5. Anthropic's own enterprise average for Claude Code is ~$13 per developer per active day, $150-250/month. **Not a cheap lane for beginners.** No cloud sessions with API-key auth. | same | https://platform.claude.com/docs/en/about-claude/pricing ; https://code.claude.com/docs/en/costs |
| **Gemini CLI** | **Free tier ended 18 June 2026** for free, Google AI Pro and Ultra users. It stays only for Code Assist Standard/Enterprise and paid API keys. Successor: Antigravity CLI (`agy`), closed source, Go. | GEMINI.md, AGENTS.md; skills must move from `.gemini/skills/` to `.agents/skills/` | https://github.com/google-gemini/gemini-cli/discussions/27274 ; https://geminicli.com/docs/resources/quota-and-pricing/ ; https://antigravity.google/docs/cli/gcli-migration/ |
| **Google Antigravity** (IDE + CLI) | Individual plan $0: "Basic weekly rate limits", unlimited Tab and Command requests. Models listed: Gemini 3.x Flash, Gemini 3.1 Pro, **Claude Sonnet & Opus 4.6, gpt-oss-120b**. Paid limits ride on Google AI Pro/Ultra. Secondary sources say ~20 agent requests/day on the free tier **(unverified)**. | Reads GEMINI.md + AGENTS.md (GEMINI.md wins on conflict); skills in `.agents/skills/` | https://antigravity.google/pricing ; https://antigravity.google/docs/plans ; https://antigravity.google/docs/cli/gcli-migration/. `gpt-oss-120b` is OpenAI's open-weight model; students should avoid picking it. The default model is not stated **(unverified)**. |
| **Jules** (Google, async, web) | Free: 15 tasks/day, 3 concurrent. Pro 100/day, Ultra 300/day. Docs list Gemini 2.5 Pro for free **(page may be stale)**. | AGENTS.md listed as supported by agents.md; Jules docs didn't confirm **(unverified)** | https://jules.google/docs/usage-limits/ ; https://agents.md/ |
| **Firebase Studio** | New workspaces and signups **disabled 22 June 2026**; sunset 22 March 2027. Not an option. | | https://firebase.google.com/docs/studio |
| **Gemini Code Assist (individuals)** | IDE extensions for individuals were included in the 18 June transition. Treat as gone. | | https://github.com/google-gemini/gemini-cli/discussions/27274 |
| **GitHub Copilot Free** | $0; 2,000 completions/month; "auto model selection only"; agents limited. **Auto can pick OpenAI models and the student cannot exclude them.** Plans page and docs disagree on whether the cloud (coding) agent is in Free **(conflict)**. | Reads `.github/copilot-instructions.md`, AGENTS.md, **CLAUDE.md or GEMINI.md**; skills from `.github/skills`, **`.claude/skills`**, `.agents/skills` | https://docs.github.com/en/copilot/concepts/billing/individual-plans ; https://github.com/orgs/community/discussions/189268 ; https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions ; https://docs.github.com/en/copilot/concepts/agents/about-agent-skills |
| **Copilot Student** | Free for verified students; auto-only since 24 June 2026, so the same OpenAI caveat applies. | as above | https://github.com/orgs/community/discussions/189268 |
| **Copilot Pro / Pro+ / Max** | $10 / $39 / $100 a month. Usage-based "AI Credits" since 1 June 2026 (1 credit = $0.01). The plans page says $15 / $70 / $200 included; GitHub's blog says $10 / $39 **(conflict, re-check)**. Paid plans can choose Anthropic or Google models by hand. The cloud agent uses Actions minutes plus credits. | as above | https://github.com/features/copilot/plans ; https://github.blog/news-insights/company-news/github-copilot-is-moving-to-usage-based-billing/ ; https://docs.github.com/en/copilot/concepts/agents/coding-agent/about-coding-agent |
| **Ollama + open models** | Local, free beyond hardware. `ollama launch claude`, or set `ANTHROPIC_BASE_URL=http://localhost:11434`, to run Claude Code against local or Ollama Cloud models; set context to 64k+. Ollama Cloud free limits not stated **(unverified)**. | Claude Code's own files, unchanged | https://docs.ollama.com/integrations/claude-code |

Honest note on local models (my judgment, not a sourced benchmark): the
template's method leans on long multi-file sessions, a 144-skill library, and
an agent that runs tests and git without supervision. Models that fit on a
student laptop with a 64k context will lose the thread on that kind of work
far more often than hosted frontier models. Offer local models as a
values-driven option (privacy, no account, offline), good for stage 00 and
small stage 01 rounds. Don't promise a path through the whole course with
them.

### One repo for every agent

- AGENTS.md is "a README for agents", now stewarded by the Agentic AI
  Foundation under the Linux Foundation, and read by Gemini CLI, Copilot,
  Jules, Cursor, Zed and others. For older filenames it suggests
  `ln -s AGENTS.md AGENT.md` (https://agents.md/).
- Claude Code's own recommendation for sharing: keep `AGENTS.md` as the
  shared file, and make `CLAUDE.md` start with `@AGENTS.md` followed by any
  Claude-only lines. A symlink also works, but Windows clones check symlinks
  out as one-line text files unless `core.symlinks` is on, and Claude's edit
  tools refuse to write through a symlink
  (https://code.claude.com/docs/en/memory).
- Copilot reads CLAUDE.md and `.claude/skills` **as they are**, so the template
  already works with Copilot today with no changes
  (https://docs.github.com/en/copilot/how-tos/configure-custom-instructions/add-repository-instructions ;
  https://docs.github.com/en/copilot/concepts/agents/about-agent-skills).
- Antigravity reads `GEMINI.md`/`AGENTS.md` and `.agents/skills/`. Claude Code
  does **not** read anything under `.agents/`
  (https://antigravity.google/docs/cli/gcli-migration/ ; https://code.claude.com/docs/en/memory).
- The SKILL.md folder format started at Anthropic and is now used by
  Claude Code, Copilot, Codex and others (secondary:
  https://raffertyuy.com/raztype/claude-copilot-codex-cross-compatibility/ ;
  https://code.visualstudio.com/docs/agent-customization/agent-skills).
  Whether Antigravity loads SKILL.md *folders* or only single `.md` files is
  **unverified**.

**Proposed layout** (template change, for Ben to approve):

```
AGENTS.md          <- the current CLAUDE.md body, written for "your agent"
CLAUDE.md          <- "@AGENTS.md" + Claude-only lines (/loop, auto memory, skills table)
GEMINI.md          <- "@AGENTS.md"? (Antigravity reads AGENTS.md already; GEMINI.md only if
                      Gemini-specific notes are needed; check whether it honours @-imports)
.claude/skills/    <- stays the source of truth
.agents/skills     <- symlink to .claude/skills (Windows caveat above; or a
                      tools/ script that copies it)
```

### Which parts of Ben's way of working each lane supports

| Part of the workflow | Claude Pro/Max | Copilot Pro (Claude/Gemini picked) | Antigravity free | Jules free | Copilot Free/Student | Local Ollama |
|---|---|---|---|---|---|---|
| Building by conversation | yes | yes | yes | yes (async tasks) | yes, but auto model (may be OpenAI) | yes, weaker |
| Reads the template's instructions unchanged | yes | yes (CLAUDE.md) | needs AGENTS.md | needs AGENTS.md | yes | yes |
| Uses the 144 skills | yes | yes (`.claude/skills`) | needs `.agents/skills` | no evidence | yes | yes, if the model copes |
| Runs tests, git, gh | yes | yes (CLI, cloud agent) | yes (CLI) | in its VM, opens PRs | limited | yes |
| Long autonomous loops (stage 06) | Max, comfortably; Pro, in short bursts | credits drain by tokens | weekly cap | 15 tasks/day | no | slow |
| Apple native (needs Xcode on a Mac) | locally on a Mac; cloud CI otherwise | same | same | no | same | same |
| Android | locally or in CI | same | same | in CI | same | same |
| Phone-only | yes (Code tab) | partly (GitHub Mobile assigns to Copilot) | no | web | partly | no |

### Proposed lanes

**$0 lane: "GitHub + Google free".** GitHub (Pages, Codespaces 120
core-hours) plus Antigravity's free Individual tier, or Jules for async
rounds. Choose Gemini or Claude models, never gpt-oss. Completes **00, 01, 02**
fully on the web. **03** partly: Android builds in CI, APK sideloaded onto the
student's own phone; Apple needs a Mac and Xcode. **04** web-only.
**05** stops at a shareable web app or sideloaded APK; stores cost money
($99/year Apple, $25 once Google, per COURSE.md). **06** Pulse can be read;
loops are capped by the weekly quota. **07** web feature. **08** fully:
skills and memory are files. Risk: Google has changed this free tier twice
in 2026, and its numbers aren't published.

**~$20 lane: Claude Pro (Ben's own tool, with a smaller budget).** Same
tool, same CLAUDE.md, same skills, same prompts as Ben's lessons. Cloud
sessions mean no installs. Completes **00 to 03** and **07 to 08** fully if the
student works in rounds, uses Sonnet, and lets the 5-hour window reset.
**04 to 06** need a computer and (for 05) developer accounts. Long `/loop`
runs and multi-platform passes are where Pro runs out first. Teach "one
round per window" as the habit. Copilot Pro at $10 with Claude or Gemini
picked by hand is the cheaper alternative and reads the template unchanged.
Whether Copilot belongs in the course given Microsoft's ties to OpenAI is
Ben's call.

**Ben's lane: Claude Max 5x/20x ($100+).** Everything as written, including
all-night loops.

### What changes in the lessons so they work with any tool

1. Say "your agent" and "the instructions file" in the path. Keep Ben's real
   prompts word for word (they're the anchors), and add a small "In other
   agents" box only where the mechanism differs: `/loop`, auto memory,
   the skills table, cloud sessions.
2. Make the repo the memory. The template already puts memory in
   SCRATCHPAD/DECISIONS/PARITY. Say in stage 08 that `~/.claude/.../memory` is
   Claude's own, and that in other lanes "save it as a memory" means "write it
   in DECISIONS.md".
3. Stage 01's "done" becomes "merged and live". In cloud lanes the agent
   can't push `main`, so the student's merge is the ship moment.
4. Stage 06 loops: give a "rounds instead of loops" version for capped lanes.
   Draft the next round in the running note and send it when the window resets.
5. Put a "lane" line at the top of each stage saying which lanes can finish
   it fully.

---

## Topic 3. From humanshaped.org to the community

### What best-in-class onboarding does

- **The Odin Project** puts "Join the Odin Community" in the very first
  section, before setup. It sends learners to an introductions channel, and
  teaches how to ask: "What do you think the problem is? What exactly do you
  want to happen? What is actually happening?" plus "Remember the human"
  (https://www.theodinproject.com/lessons/foundations-join-the-odin-community).
- **Recurse Center**: a short written application "you can complete in an
  evening", then a 25-minute conversation, then a pairing interview
  (https://www.recurse.com/apply). Four social rules: no well-actually's, no
  feigned surprise, no backseat driving, no subtle -isms
  (https://www.recurse.com/social-rules). The backseat-driving rule maps neatly
  onto show-and-tell.
- **Exercism**: in-browser *or* CLI, free forever, mentoring as the
  community, "without ever feeling lost or stupid" (https://exercism.org/about).
- **CS50**: one GitHub sign-in, and a ready cloud environment appears
  (https://cs50.readthedocs.io/cs50.dev/). That's the bar for "fewest steps".
- **Vercel Deploy Button**: one link clones a repo into the user's GitHub
  and deploys it in a single flow (https://vercel.com/docs/deploy-button).
  GitHub's equivalent is a direct link to
  `github.com/new?template_name=UniversalAppTemplate&template_owner=bhwilkoff`
  **(that URL pattern is from memory; test it)**.
- **Hack Club**'s code of conduct covers every space (Slack, events, GitHub),
  offers named and anonymous reporting routes, and asks "what would a good
  person do?" (https://hackclub.com/conduct/).
- **Contributor Covenant 3.0** has Pledge, Encouraged Behaviors, Restricted
  Behaviors, Reporting, and Addressing and Repairing Harm
  (https://www.contributor-covenant.org/version/3/0/code_of_conduct/). Its
  "repairing harm" framing fits the course's values better than a bare ban
  list.

I couldn't fetch Supabase, Railway, freeCodeCamp or CS50 onboarding pages
in depth this session (search budget ran out). The pattern they share,
from long familiarity rather than fresh sources, is a template or starter,
one auth, and something live within minutes. Treat that as **unverified
background**.

### Community venue

Recommendation: **GitHub Discussions, org-level, in a separate
`humanshaped` org or community repo**, plus the weekly Meet. Reasons:
students already need a GitHub account (one identity, not two); Q&A answers
can be marked and searched; email notifications work for people who don't
live in a chat app; and it's async across time zones
(https://docs.github.com/en/discussions/collaborating-with-your-community-using-discussions/about-discussions).
Keep it off the template repo itself (Discussions are off there now, and
students' copies shouldn't carry the cohort's conversation). Discord is
optional at most. It's another account, and its always-on design pulls
against "live with it" (judgment, not a source).

### Proposed pathway, with the first win defined

**First win:** *within about 30 minutes, the student's own app address
(`<username>.github.io/<app>`) opens on their phone, showing their app's
name, the paragraph of why they wrote, and one real item from a real
source.* It's small, it's theirs, it's live, and the values come first.

| # | Step | Where it lives |
|---|---|---|
| 1 | Read the one-page "what this is", and the honest costs: $0 / ~$20 / Ben's lane, plus store fees later | humanshaped.org |
| 2 | Sign up (name, email, which lane, which devices they own, accessibility needs) | humanshaped.org form, data kept in the sign-up service, never the repo (site CLAUDE.md) |
| 3 | Welcome email: the first-hour checklist for their lane, the date of the setup session, the code of conduct link | email |
| 4 | Create a GitHub account; turn on 2FA now (avoids the 45-day lockout later) | github.com, guided by a site page with screenshots and alt text |
| 5 | Use this template (direct link), Public, then Settings, Pages, on | GitHub |
| 6 | Connect the agent for their lane (claude.ai/code; or Codespace + `agy`; or Desktop app) | the agent's own site, guided from humanshaped.org |
| 7 | Write the why in the running note, paste the stage 00 + 01 kickoff | their agent; prompt text on humanshaped.org and in `docs/path/` |
| 8 | Merge, open on the phone: **first win** | GitHub + phone |
| 9 | Post the address and one sentence ("what the real data showed me") in Discussions, "Introductions" | GitHub Discussions |
| 10 | Optional live setup session for anyone stuck at 4 to 8, then the weekly show-and-tell | Google Meet, live captions on |

Accessibility: every setup page needs screenshots with alt text, keyboard-only
paths and a text alternative to any video. Meet sessions should be captioned
and recorded with transcripts. And offer a phone-only route (lane A), because
not everyone owns a computer.

---

## What I could not verify

- Antigravity free-tier numbers (only "basic weekly rate limits" on Google's
  page; "~20 agent requests/day" only from secondary sources), its default
  model, and whether the CLI loads SKILL.md folders.
- Copilot: whether the cloud agent is in Free (plans page vs docs disagree),
  and the included credits for Pro/Pro+ ($15/$70 on the plans page vs $10/$39
  on the blog).
- Claude Max 20x price on the pricing page (the fetch rendered it as "from $100").
- Whether a Claude cloud session can turn Pages on through the GitHub proxy;
  whether a codespace token can; whether GitHub Mobile can merge PRs.
- Codespaces "12-hour maximum lifetime" (from a page summary; re-read).
- Jules's current free model and AGENTS.md support; Ollama Cloud free limits.
- Free macOS runner minutes for public repos (the template's Apple CI path).
- Any individual student discount on Claude plans. The pricing page shows only
  an institutional Education plan (https://claude.com/pricing).
- The `github.com/new?template_name=` direct-link format.
- The web search budget for this session ran out partway through, so
  Supabase/Railway/freeCodeCamp onboarding and Google AI Studio's build mode
  were not researched from sources.

## Open questions for Ben

1. **Default lane for week 1:** Claude Pro with cloud sessions (8 steps,
   no installs, phone-friendly) as the course's default? Or should the default
   be $0, with Pro as the upgrade?
2. **Copilot:** it reads the template unchanged and Pro is $10, but Free and
   Student auto-route to OpenAI models with no opt-out, and Microsoft is
   OpenAI's partner. Include Copilot Pro (models picked by hand), mention it
   with the caveat, or leave it out?
3. **Google:** Gemini CLI's free tier was pulled with a month's notice in
   2026, and Antigravity is closed source. Comfortable building a $0 lane on
   it, labelled "may change"?
4. **Template changes before launch:** add `.devcontainer/`, move the
   CLAUDE.md body into AGENTS.md with `@AGENTS.md` in CLAUDE.md, add the
   `.agents/skills` link, and make `android-build.yml` skip on web-only pushes?
   Each is small; together they make lanes B and $0 one click.
5. **The merge as the ship moment:** in cloud lanes the agent can't push
   `main`. Teach "you merge, it ships" as a feature of the method, or ask the
   agent to deploy Pages from its branch?
6. **Community home:** a `humanshaped` GitHub org with org-level Discussions,
   or Discussions on the site repo? Is Discord ever needed?
7. **Code of conduct:** adapt Contributor Covenant 3.0 plus Recurse's four
   social rules? Who receives reports, and is there a second person besides
   Ben?
8. **First win wording:** is "your app's address on your phone, with your
   why and one real item" the right first win, or should it wait for the full
   stage 01 "two rounds" bar?
