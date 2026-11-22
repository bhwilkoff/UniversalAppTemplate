---
name: finance-app-foundations
description: "Use when building any app that reads or stores people's financial data: Apple FinanceKit (Apple Card, Apple Cash, Savings), bank or card CSV/OFX imports, transactions, balances, budgets. Carries what the framework docs don't: the FinanceKit entitlement path and its blind spots (organization account, Finance category, no data at all before the grant, iPhone only), money as signed integer minor units, idempotent ingestion keyed on the source's id, CSV-to-FinanceKit reconciliation so user writing survives the switch, the App Review rules finance apps trip (5.1.1(ix), 5.1.2(i) third-party AI consent, in-app deletion incl. anonymous accounts, the DPLA ban on transaction details in notifications), privacy manifest/labels/policy kept in lockstep, RLS tested against production, and issuer changes as a revocation risk. Triggers on FinanceKit, Apple Card, transactions, finance app, budgeting, money, cents, currency, CSV import, OFX, bank export, Finance category, financial data entitlement, NSFinancialDataUsageDescription, Plaid, ledger."
---

# Finance app foundations

Read with `financekit` (the API) and `learning-orientation-design` (why
the app exists). This skill is what bit, or would have bitten, CentMemo,
plus the review lessons Tidbits Trivia paid for.

## 1. FinanceKit is earned, not added

- **Who can get it**: an *organization* developer account (a legal entity),
  requested by the **Account Holder** at
  developer.apple.com/contact/request/financekit/, granted **per bundle ID**.
  Pick the bundle ID before you file; it is permanent for the grant.
- **What Apple wants**: an App Store app for iPhone in the US or UK, in the
  **Finance** category, that "provides financial management tools" (net
  worth, spending trends, budgeting). A pipe to somewhere else is not a
  tool. Make the in-app experience valuable without any integration.
- **Before the grant there is nothing**: no simulator data, no mock store;
  the first call traps with "Process is not entitled". Design a
  `FinanceSource` protocol on day one with a DEBUG sample source, and gate
  the real one on `FinanceStore.isDataAvailable(.financialData)` (calling
  anything when that is false terminates the app). Build everything else
  while Apple reviews.
- **Reach**: US Apple Card (not Family participants), Apple Cash, Savings;
  UK open-banking accounts from iOS 18.4. Not other US cards or banks.
  Transaction APIs are iOS/iPadOS only (iPad reported buggy), not macOS or
  visionOS. Plan iPhone as the only source; other platforms read your server.
- **Background**: iOS 26 `BackgroundDeliveryExtension` (hourly/daily/weekly
  minimum, only when data changed, unpublished time budget). Networking in
  it is undocumented: write to the App Group first, send small idempotent
  batches, keep a foreground sync. The extension's bundle ID likely needs
  the entitlement too; ask in the request.
- **No public turnaround.** File early; it is the long pole.
- **Read the FinanceKit APIs Addendum before designing any data flow**
  (published at developer.apple.com/contact/request/download/financekit.pdf):
  - Approval grants development first; distribution is a second
    application (2.6).
  - No disclosure of Account Data (including data *derived from* it) to any
    third party except your own service providers, Apple's separate written
    permission, or law (3.2), and **user consent does not override that**
    (3.3). An AI connector that lets a user's assistant read FinanceKit rows
    is such a disclosure: exclude `source = 'financekit'` rows from it or
    get Apple's written permission.
  - Destroy data within 30 days of revocation (3.6).
  - **Two-factor sign-in with a one-time password on new devices**, for app
    and website alike (3.7).
  - Report security incidents to Apple (3.8).
- **Bridge while you wait**: the person's own export (Wallet: Apple Card,
  Card Balance, Export Transactions; or card.apple.com) as CSV. Apple Card
  columns: Transaction Date, Clearing Date, Description, Merchant,
  Category, Type, Amount (USD), Purchased By. **Purchases are positive and
  payments negative in the export**, the opposite of a ledger.

## 2. Money

- Store **signed integer minor units** (`amount_minor bigint`) plus an ISO
  currency. Negative = left the account. Never floats, never formatted
  strings. FinanceKit amounts are always positive; the sign is
  `creditDebitIndicator` (on a liability, `.credit` is a payment or refund).
- Parse with one function per language, golden-tested on a synthetic
  fixture, including a hand-computed total. (CentMemo's first golden total
  was wrong by $10 *in the test*; the code was right. Compute goldens
  twice.)
- Sum in integers; format only at the edge.
- Rejected and pending transactions are rows with a status, excluded from
  totals by rule, shown honestly in lists.

## 3. Ingestion that never duplicates

- Every transaction row is unique on `(user_id, source, source_id)`;
  inserts are `upsert ... ignoreDuplicates`. FinanceKit: the transaction
  UUID. Exports without ids: hash of (date, amount, description, merchant,
  type) plus the row's occurrence among identical rows in that file.
- Persist FinanceKit `HistoryToken`s; handle `historyTokenInvalid` by
  starting over (idempotency makes that safe). Apply deletes from history.
- **Reconcile, never replace**: when FinanceKit arrives after CSV imports,
  match on date (plus or minus 2 days), amount, and merchant, then move the
  person's memos/tags to the FinanceKit row. Never delete-and-reinsert
  anything a person has written on.
- Composite foreign keys `(parent_id, user_id)` so no row can hang on
  another person's parent.

## 4. App Review rules finance apps trip

- **5.1.1(ix)**: financial apps are submitted by a legal entity.
- **5.1.2(i)**: disclose every third party, *including third-party AI*, and
  get explicit permission before sharing. An AI connector needs its own
  opt-in screen and privacy-policy line naming the AI company.
- **DPLA**: no "financial account or transactional information" in any
  push or local notification. Notifications say "Something new to look
  at", never an amount or merchant.
- **5.1.1(v) deletion** (Tidbits rejection): in-app account deletion,
  always visible, never web-only, and it must cover an *anonymous* account
  too. Delete child rows, then the auth user, then local state; verify by
  reading back. Record a deletion video on a physical device for the review
  notes before the first submission.
- **Sign in with Apple** (Tidbits rejection, 2.1(a)): show failure and
  cancellation on screen; assume the reviewer's device has no Apple ID.
  Web flow uses `form_post` (POST callback) and needs an HTTPS return URL.
- **Privacy lockstep**: `PrivacyInfo.xcprivacy`, the App Privacy answers
  (Financial Info: linked, App Functionality, not tracking), and the
  policy change together, every time collection changes.
- Reviewers need a way in: a demo account with synthetic data in the
  review notes (a FinanceKit app can't show the reviewer your card; show
  the CSV path or a demo mode and say so).

## 5. Security posture

- Owner-only RLS on every table, every operation; `anon` revoked.
- Test the **deployed** policies, not the migration file: a script signs in
  as owner and as a stranger and checks the stranger sees zero rows and
  can't write; an agent token can't write. (Tidbits: one broad parent read
  rule exposed every user; the repo file looked right.)
- **A negative control must never run write probes.** CentMemo's first
  control (stranger set to the owner) really deleted and edited the
  owner's synthetic rows. Control mode runs read checks only.
- **Never `.catch(() => {})` a seed or import step.** A swallowed 400 left
  every value un-created while the script reported success; catch only the
  one expected error (a 409 duplicate) and let the rest surface.
- No financial data in logs, analytics, crash reports, or URLs.
- Publishable keys only in clients; secrets in function env.
- Free-tier databases pause when idle; move to a paid tier before other
  people's money depends on it.

## 6. Presume revocable

Apple Card's issuer changes to Chase around January 2028. Account ids,
history, and FinanceKit coverage may change at cutover. Keep the CSV path
working, keep source ids per source, and recheck after the transition
(`third-party-revocation-resilience`).
