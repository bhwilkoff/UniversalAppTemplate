---
name: app-sunset-playbook
description: "Use when shutting an app down, unpublishing it from a store, winding down its backend, or archiving its repository, and when designing a new app so that it CAN end well. Carries the sunset-readiness rules for day one (project-prefixed cloud resources, an export path, static legal pages, a registrations inventory), the inventory-before-deletion step, the Day 0 order (stop automation, shutdown page, per-person exports and notice, pause not delete), the store traps (Play unpublish vs delete and the registration-fee transaction ID, TestFlight expiry, App Store Connect refusing to remove a Rejected app), Sign in with Apple revocation before deleting the key, deleting only by prefix on a shared cloud account, emptying R2 with an expire-all lifecycle rule, keeping the data-deletion URL live, and the public record (IP out of the tree, a code-only license, redacted and rotated keys, a post mortem, an archived repo). Triggers on sunset, shut down, shutdown, wind down, retire the app, decommission, unpublish, delete the app, remove from sale, teardown, archive the repo, delete user data, post mortem, end of life."
---

# App Sunset Playbook

Every app ends. Ending one well is part of respecting the people who
trusted it with their time and their data: they get their work back,
they hear plainly what is happening and when, and every promise made
to them (a deletion date, a privacy policy, a deletion URL a store
required) is kept to the day.

Distilled from BOBA Playbook's shutdown on 2026-11-21: a web app, a
Google Play app, an iOS app that never cleared App Review, a hosted
Postgres project, ten Cloudflare Workers, an R2 bucket, a D1 database,
four KV namespaces, a dozen third-party registrations, and 32 real
accounts, wound down in one day on a cloud account and a database org
that other projects still needed. The order below is the one that
worked, plus the traps that cost time.

## Part 0: Build so it can end (day-one rules)

These cost almost nothing at the start and save the teardown.

- **Prefix every cloud resource with the project's name** (`app-*`
  Workers, buckets, databases, KV namespaces, OAuth clients). Free
  tiers push several projects onto one account, and on teardown day
  the prefix is the only safe filter between "ours" and "someone
  else's".
- **Keep a registrations inventory in the repo** (no secrets, just
  names and where they live): every OAuth client, API key, signing
  key, store listing, developer keyset, and the domain registrar.
  The teardown list is otherwise reconstructed from memory.
- **Ship a data export as a feature**, not a teardown script. If a
  person can already download their collection, decks or history as
  CSV, the shutdown notice can point at it.
- **Legal pages are static files, independent of the app.**
  `/privacy`, `/terms` and `/data-deletion` must keep working after the
  app, its backend and its sign-in are gone, because a store listing
  that still exists requires the deletion URL.
- **Serve media from a custom domain from day one** (see
  `image-cdn-discipline`), so the address you own outlives the bucket.
- **Keep borrowed content in its own directories.** Content you do not
  own (a publisher's catalog, rules, art) in clearly separated paths can
  be removed from the tree in one commit; content smeared through code
  cannot.
- **Never commit a key**, not even a "restricted" one in a setup doc.
  BOBA found a Maps key in plain text in a setup guide on shutdown day.

## Part 1: Inventory first, delete nothing

Write a `SUNSET_PLAN.md` checklist before any destructive step:

- **People:** account count, how many have saved data, how many signed
  in within 30 and 90 days, the newest signup, the database size. These
  numbers decide the notice and the timeline.
- **Every provider's resources, by name**, listed from the provider
  (`wrangler ... list`, the database org's project list), never from
  memory.
- **A DO-NOT-TOUCH list** for shared accounts: every resource that
  belongs to another project, named explicitly.
- **Scheduled automation:** every cron workflow and Worker cron.
- **Store presence:** package names, version, install count, review
  state.
- **Third-party registrations** from the Part 0 inventory, plus any key
  found committed.
- **The domain:** registrar, DNS host, renewal date.

## Part 2: Day 0, announce and go dark

Order matters; each step protects the next.

1. **Stop the automation first.** Disable every scheduled workflow
   (`gh workflow disable`) so nothing refreshes data, redeploys, or
   recreates a resource you are about to delete.
2. **Replace the site with a static shutdown page** that says the app
   has shut down, why, when user data will be deleted, and where the
   post mortem and code live. Serve the same page as the 404 so every
   old deep link lands on it. Keep `/privacy`, `/terms` and
   `/data-deletion` deployed. Change the deploy workflow to assemble
   only these files; the app source can stay in the repo.
3. **Export each person's data before anything is paused.** One
   portable file per person (CSV opens anywhere). Exclude the owner's
   own accounts. Keep the exports outside the repo.
4. **Tell people individually.** A personal email with their export
   attached to everyone who had data, and one short BCC notice to
   accounts with none. State the deletion date. Drafting is agent work;
   pressing send is the owner's.
5. **Pause the database, do not delete it yet.** On Supabase a paused
   free project stays restorable for 90 days and frees its free-tier
   slot at once. Deletion comes on the date you promised (Part 3).
6. **Unpublish from the stores** (below).

## Store traps

**Google Play**
- **Unpublish** (Setup, Advanced settings, App availability) stops new
  installs and hides the listing; existing installs keep running until
  the backend they call is gone. It is reversible.
- **Delete** is offered from the same page only after unpublishing. It
  asks for the **developer registration-fee transaction ID** (from the
  original Google Payments receipt for the one-time registration), and
  becomes permanent after 7 days. Find that receipt before the day.
- While the listing exists, its data-deletion URL must resolve.

**Apple**
- **TestFlight builds expire on their own after 90 days.** Check before
  expiring anything by hand; on BOBA all 25 builds were already gone.
- **Cancel any open review submission first.**
- **App Store Connect will not remove an app whose version is in
  Rejected status**, and cancelling the submission does not
  necessarily unblock it. If nothing was ever distributed it is
  harmless to leave; full removal goes through Apple Developer Support
  with the App ID.
- **Sign in with Apple:** call Apple's `/auth/revoke` for every
  Apple-linked user with a stored token BEFORE deleting the Services ID
  or the Sign in with Apple key. Once the key is gone, revocation is
  impossible.

## Part 3: Delete user data on the promised date

- Revoke third-party sign-in tokens (above), then delete accounts.
  Foreign-key cascades cover owned rows; also delete tables whose
  user reference was `SET NULL` for an audit trail (corrections,
  submissions) if they hold user-authored content.
- Delete user media (avatars, uploads) with the bucket (Part 4).
- Back up anything you will want for the post mortem (aggregate
  counts, a database dump with no personal data) before deletion,
  outside the repo.
- Then delete the database project. Pausing keeps data; only deletion
  keeps the promise.

## Part 4: Tear down infrastructure

- **On a shared account, delete only by project prefix**: list, filter
  by prefix, diff against the DO-NOT-TOUCH list, then delete. Never a
  wildcard, never "everything on the account".
- **Workers, KV, D1:** export a D1 first (`wrangler d1 export`), then
  delete.
- **R2 buckets cannot be deleted until empty.** Do not hand-delete
  objects: disable public `r2.dev` access, add an expire-all lifecycle
  rule (1 day), wait for it to run, then `wrangler r2 bucket delete`.
  Put the date on the checklist.
- **Revoke every credential** from the inventory: OAuth clients, API
  keys (or the whole cloud project if it was single-purpose), Firebase
  or push projects, OAuth apps on other platforms, Apple Services ID,
  signing keys and App Store Connect API keys, marketplace developer
  keysets, and the repository's CI secrets (`gh secret list`).

## Part 5: The repo and the public record

- **Remove third-party IP from the tip of the tree**: catalogs, rules
  documents, checklists, art, anything DERIVED from the art (image
  fingerprint indexes, test fixtures, screenshots that show it).
  Scrubbing history is a separate, optional decision; record which you
  chose and why.
- **Make tests and hooks survive the removal.** A pre-commit audit that
  expects the catalog must skip when it is absent.
- **Add a LICENSE that covers the code only**, and say in the README
  that names, art, rules text and trademarks belong to their owners.
- **Redact committed keys, then delete or rotate them at the
  provider.** Redaction alone does nothing; the key is in history.
- **Rewrite the README as an archive notice** and write a
  `POSTMORTEM.md`: why it ended, the numbers, what went well, what went
  wrong and what you would do differently, the pieces worth borrowing
  (with paths), and how to run it with no backend. Write it honestly;
  it is the most useful thing the project leaves behind.
- **Archive the GitHub repository** after the last commit (read-only,
  still forkable).
- **Domain:** keep it for a year so the shutdown page and the deletion
  URL stay reachable, or let it lapse at renewal on purpose.
- **Tell the agent.** Save a project memory that the repo is archive
  only, so a later session does not resume feature work, run the loop,
  or redeploy a backend.
- **Upstream the lessons** to the template (`docs/PROVENANCE.md`, the
  upstreaming rule) in the same session.

## Anti-patterns

- Deleting before inventorying, or inventorying from memory.
- Deleting the database on Day 0 before exports exist.
- Leaving crons running while tearing down what they write to.
- A wildcard delete on a cloud account other projects share.
- Deleting the Sign in with Apple key before revoking tokens.
- Taking the data-deletion page down with the app while a store
  listing still exists.
- Redacting a committed key without revoking it.
- A shutdown notice that does not say what happens to people's data
  and when.
