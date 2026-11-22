---
name: secrets-without-bookkeeping
description: "Use when an app needs any key, token, password, certificate or signing identity, when an agent is blocked on a credential, when the owner says they do not want to keep track of keys, or before claiming a CI workflow shipped something. Eliminate the secret first (a CI-signed OIDC token for owner-only actions), give each remaining secret one home (GitHub Actions secrets for CI, the platform's secret store for the server, the macOS Keychain for local agents), keep every value out of git and out of cleartext files, let agents move values only through a fixed-recipe script, and fail the commit and the CI run on anything shaped like a secret. Also the auto-mode classifier facts, the owner's one-time steps, and the lesson that a workflow's trigger must be checked before saying it shipped. Triggers on secret, API key, token, password, .env, .p8, .p12, keystore, service account, Keychain, wrangler secret, gh secret set, OIDC, operator route, id-token, secrets.sh, pre-commit, push protection."
---

# Secrets without bookkeeping

The owner's rule (Ear Drama, 2026-11-22): *"I do not want to set or keep
track of keys and passwords for this repo."* The aim is a repo where no
person remembers a value, no file holds one in cleartext, and no agent
ever sees one. It extends AGENTS.md's hard rule: secrets never in git,
and never in cleartext on disk.

## The order of moves

1. **Eliminate the secret.** The safest token is the one that never
   exists. For an owner-only action on your own server (a deletion
   request, a take-down, an admin job), do not mint a shared operator
   key. Let a GitHub Actions workflow with `permissions: id-token: write`
   ask GitHub for a short-lived OIDC JWT whose `aud` is the server's
   origin, and have the server verify it against GitHub's published keys
   (`https://token.actions.githubusercontent.com/.well-known/jwks`).
   Pin as constants, never as config: `repository` and `repository_id`
   (a deleted-and-recreated namesake must fail), `ref` =
   `refs/heads/main`, `job_workflow_ref` = exactly one workflow file per
   route, and the `event_name` it runs on. Fork pull requests never get
   an id token. The claims also give `actor` and `run_id`: an audit trail
   for free. Templates: `docs/templates/worker-github-oidc-template.js`
   and `docs/templates/operator-workflow-template.yml`. The workflow log
   is public: print ids, dates and counts, never a name, and
   `::add-mask::` each input. Google can be federated the same way
   (Workload Identity Federation retires a service-account JSON key).
2. **Give each remaining secret one home, where it is consumed.**
   - CI uses it: a GitHub Actions secret (write-only, masked).
   - Only the server uses it: the platform's secret store (Cloudflare
     Worker secrets), generated or piped straight in. Do not also copy it
     to GitHub just to push it.
   - A local agent needs it (a yearly certificate renewal): the macOS
     Keychain, read at use time with
     `security find-generic-password -a ACCOUNT -s NAME -w` into a pipe
     or a child's environment. Store with `security -i` (the command is
     read from stdin, so the value is not in `ps`).
   Apple has no federation for App Store Connect keys or signing, so the
   `.p8`, the `.p12` files and their password must exist: one home each.
3. **Nothing in git, nothing in cleartext on disk.** No `.env`, no
   `AuthKey_*.p8`, no `*.password` file, no service-account JSON, no
   wrangler plaintext login. A downloaded key is piped into its home and
   the file is deleted.
4. **Agents never handle a raw value.** All value movement goes through
   `tools/secrets.sh`: named recipes, fixed secret names, refusal of
   anything else. It never echoes a value, never puts one on a command
   line, never writes one to a file. Because it is fixed, one exact
   permission rule can allow it. `tools/test_secrets_sh.py` runs every
   recipe against fake `gh`, `npx`, `security` and `openssl`, checks that
   planted values reach the right store and appear in no output or
   command line, and proves itself with negative controls (a copy of the
   script that echoes, or passes a value as an argument, must be caught).
   Names come from `tools/app_config.py`: `GITHUB_REPO`, `SECRETS_NAME`
   (the Keychain prefix), `WORKER_DIR`, `WORKER_NAME`.
5. **A scan that fails on any secret shape, twice.**
   `tools/test_no_secrets.py` checks tracked files (or `--staged`) for
   key and keystore file names and for PEM bodies, service-account JSON,
   AWS, GitHub, Slack and Google keys, signed JWTs, archive.org S3
   pairs, and high-entropy values assigned to `*_KEY`, `*_SECRET`,
   `*_TOKEN`, `*_PASSWORD`. It plants every pattern first and must catch
   them (a check is not a check until it has been seen to fail), prints
   file, line and rule but never the value, and takes a fixture only by
   `tools/no_secrets_allowlist.txt` with its reason. It runs as
   `.githooks/pre-commit` and as `.github/workflows/secrets-check.yml`
   on every push and pull request, so `--no-verify` still turns CI red.
   Also turn on GitHub secret scanning and push protection.

## The owner's one-time steps (no value is typed or seen)

- `wrangler login --use-keyring` (moves the Cloudflare tokens out of a
  plaintext `default.toml`). `gh auth` should say "keyring".
- `git config core.hooksPath .githooks` in each clone (an agent in an
  isolated worktree may not change shared git config).
- One `autoMode.allow` sentence in `~/.claude/settings.json` naming the
  repo and what `tools/secrets.sh` may do (generate secrets and write
  them to Worker secrets, GitHub secrets and the Keychain without
  printing them; deploy; dispatch this repo's workflows). Narrow project
  rules in `.claude/settings.json` such as `Bash(tools/secrets.sh list)`,
  `Bash(tools/secrets.sh gen *)` and `Bash(gh workflow run operator.yml *)`
  are the owner's to add. Agents never edit permission files.
- Approve, in one message, clearing out the plaintext files the audit
  found (a `.p8` after `keychain-import-asc --delete`, a `*.password`
  file, a `takedown.env`) by moving them to the Trash.

## Classifier facts (why an agent was refused)

- The auto-mode classifier reads `autoMode` only from user settings (or
  managed settings), never from `.claude/settings.json` or
  `settings.local.json`. A project file's authorization never reaches it.
- Broad allow rules (a wildcarded `npx wrangler *`, interpreters, package
  runners) are dropped on entering auto mode; narrow rules stay and
  resolve before the classifier.
- "Writing to a secret manager" and "printing a live credential" are
  default blocks. An agent that generates a token, holds it in its
  transcript and writes it to two stores trips both. The fixed-recipe
  script avoids holding it at all.
- A local setting that allows "writing secrets to gitignored files" or
  `~/.config/app` contradicts the hard rule: delete it.

## Check how a workflow is triggered before you say it shipped

In Ear Drama the TestFlight build workflow was `workflow_dispatch` only.
Nothing ran it, so nothing reached TestFlight for six days, and every
report in between said "shipped" because the commit landed. Before
claiming a build, release or publish happened: read the workflow's `on:`
block, then `gh run list --workflow NAME` and confirm a run for the
commit. A merge is not a ship. The same goes for the new
`operator.yml`: it is dispatch-only on purpose (a person asks), so
"I changed it" proves nothing until `gh workflow run` has answered.

## Pitfalls found building it

- The audience is the server's origin, not an invented name: no config,
  and a token for one host is useless at another.
- Two certificates that share one password cannot be renewed one at a
  time; renew both and set all four GitHub secrets.
- The issuer id is not in a `.p8`, and a GitHub secret cannot be read
  back: the issuer is an argument, the Keychain is the readable copy.
- A command that prints a private record cannot be a workflow dispatch
  (logs and inputs are public): use the server's store through the
  owner's own login.
- Read Keychain names with `security dump-keychain` (attributes only).
- Deleting an owner's file is the owner's call: `--delete` is a flag the
  owner approves.
