# [APP NAME] — Architecture & Technology Decisions

Entries capture the *why* behind choices — not the *what* (the code
already shows that). Each entry should answer: **"what would the next
developer get wrong if they didn't know this?"** Lead with the rule,
follow with `**Why:**` and `**How to apply:**`. Append-only.

When a decision affects people and not just code, add one line:
**Who was in the room, who gains, who pays:** (who took part in the
decision, who benefits, and who bears the cost, in money, effort, or
something lost).

Invoke the `architectural-decision-log` skill when adding a new entry.

---

## Where entries live

This file is loaded into every session's context, so it holds the
format rules, the complete index of every decision, and only the most
recent entries in full. Older entries are archived verbatim: moved,
never edited, and append-only binds in the archives too (Decision 033).

- 001–032 → `docs/decisions/DECISIONS-001-032.md`
- 033+ → below, in full

Keep this file under ~50 KB. When it grows past that, roll the oldest
full entries into a new archive file and extend the index. Never trim,
edit, or summarize an entry in place.

---

## Index

### 001–032 — `docs/decisions/DECISIONS-001-032.md`

- 001 — Vanilla HTML/CSS/JS for Web
- 002 — Xcode Project at Repository Root
- 003 — Shared Apple Version Config via xcconfig
- 004 — SwiftUI + @Observable + SwiftData (Apple) — iOS 26 / tvOS 26 baseline
- 005 — Cross-Platform Feature Parity
- 006 — Kotlin + Jetpack Compose for Android (NOT KMP / CMP / Flutter / RN)
- 007 — Material 3 + M3 Expressive; brand theme default, dynamic color opt-in
- 008 — Android: Compose-only, no XML / AppCompat / ActionBar
- 009 — Android: edge-to-edge + predictive back are non-negotiable
- 010 — Universal Links / App Links: `/.well-known/` is the contract
- 011 — Refresh JWT before every Worker / Storage / Edge Function call
- 012 — Brand vs Semantic color split is binding on all platforms
- 013 — One universal Apple target serves iPhone, iPad, and Apple TV
- 014 — The platform set is a decision, not a default
- 015 — Per-ecosystem sync on the user's OWN cloud; no backend to run
- 016 — Shared data plane: published once, every client a consumer
- 017 — tvOS persistence: Caches + App Group only
- 018 — Debug/state env hooks ship in the app, as production no-ops
- 019 — macOS joins the universal Apple target (amends 013)
- 020 — Default Apple submission is a cloud build on a GitHub runner
- 021 — Android publishes to Play via the Developer API from the CLI
- 022 — Player title/metadata uses each platform's native chrome hook
- 023 — Cross-platform multiplayer rides a transport seam; the protocol + arbiter live in Core
- 024 — Online play is per-ecosystem native + a neutral backend; bot-first with honest labels
- 025 — Cross-platform-identical values use order-independent hash-rank + golden-parity tests
- 026 — Persist per-event detail, not just aggregates
- 027 — Cloud Apple builds self-revoke stale auto-created Development certs
- 028 — Smart TVs are two builds plus two zero-app routes, never six apps
- 029 — Windows is an optional first-class platform, and CI is the Windows machine
- 030 — The CI fleet runs on the split-lock / budget / guard / sweeper / auditor doctrine
- 031 — A red X is reserved for broken
- 032 — The agent is never the tester: changes ship on external observation

### 033+ — below, in full

- 033 — DECISIONS.md stays context-sized: index + recent entries; archives are verbatim
- 034 — Markers carry their source, their timestamp, and their evidence
- 035 — Account deletion is a launch requirement, and the anonymous account is an account
- 036 — Bundled content is queried, never loaded: RAM is a shipping constraint
- 037 — A generator's output is not the shipped artifact; re-running one must be additive
- 038 — Randomness lives outside the selection pipeline
- 039 — Store billing APIs disagree in shape; port the intent, never the code
- 040 — Local persistence must never block launch: open in do/catch, fall back to in-memory
- 041 — When the native project can't live at the repo root, a root workspace shim satisfies the CI host
- 042 — Platform-free logic gets a sidecar SPM package so `swift test` runs without a simulator
- 043 — Algorithmic surfaces honor the user's own moderation and explain every ranked item
- 044 — Every user-visible affordance must control something real
- 045 — Feature gating: keep the code, gate the single UI entry point
- 046 — One canonical ID and one canonical asset per entity
- 047 — Two backend postures: sync islands OR the hosted split — choose in M0
- 048 — Next-OS APIs are adopted additively behind BOTH a runtime and a compile-time gate
- 049 — Marketplace-adjacent features never touch money
- 050 — Market data is provenance-honest, and the sold history is generated, not bought
- 051 — Every third-party data dependency is presumed revocable
- 052 — User-facing vocabulary is a render-layer contract over frozen schema names
- 053 — The look has one source, and every platform's tokens are generated from it
- 054 — Permission comes before scale: on someone else's IP, the licensing conversation is the first milestone
- 055 — Every app is built so it can end well

---

## 033 — DECISIONS.md stays context-sized: index + recent entries; archives are verbatim
*Date: 2026-08-24 (from Archive Watch Decision 092, at 95 entries / 262 KB)*

This file is loaded into every session's context. When it grows past
~120 KB, roll the oldest full entries VERBATIM into
`docs/decisions/DECISIONS-<range>.md` archives and keep a complete one-line
index here. **Amended 2026-09-30**: roll at ~50 KB, not 120; Archive Watch
lowered it after measuring that always-loaded files cost about 382 KB of
every session. Append-only binds everywhere: a whole-entry move is the only
permitted operation; never trim, edit, or summarize an entry in place.

**Why**: at 262 KB the decision log had become the largest fixed cost of
every session, crowding out the code being worked on — while its titles,
written as one-line summaries, already made a perfect index.

## 034 — Markers carry their source, their timestamp, and their evidence
*Date: 2026-08-24 (from Archive Watch Decisions 055/056/084/088)*

Any pipeline marker that records work done or facts checked follows three
rules: an "already attempted" marker records WHICH source attempted (a bare
boolean starves every later source); a "verified" marker records WHEN, with
a re-check TTL proportional to how visible the claim is; and a judgement
stores its MEASUREMENT beside the verdict, so downstream consumers can
abstain on weak evidence instead of acting on a coin-flip. Transient
failures (429/5xx) never mark; only definitive ones (404/410) do. A tool
that drops records users may reference leaves a forwarding address.

**Why**: each rule is a silent multi-week failure — a plateau that reported
"drained" in 94 seconds, dead links headlining a home screen with
`verified: true`, and a destructive merge acting on saturation readings that
were statistical coin-flips.

## 035 — Account deletion is a launch requirement, and the anonymous account is an account
*Date: 2026-08-24 (from Tidbits Trivia Decision 048 + the 2026-07-28 App Review rejections)*

Every platform that ships sign-in ships in-app account deletion in the same
release — and the deletion path must cover the ANONYMOUS account too. An
anonymous/guest identity that accumulates state (records, progress, an Elo)
IS an account in every store's review rubric, even though your UI never
called it one.

**Why**: Apple rejected a build for exactly this — the reviewer never signed
in, tapped Delete Account as an anonymous user, and the app had no path.
Both Apple and Play now require in-app deletion for any app with account
creation; retrofitting it under review pressure is the most expensive time
to build it.

**How to apply**: the Settings surface on every platform gets a Delete
Account row that works for BOTH signed-in and anonymous identities (wipe
local state + the backend record). Watch the backend semantics: a naive
"delete" that writes `null` into a shared tree can be a no-op or a
tombstone-clobber — verify the record is actually gone by reading it back.

## 036 — Bundled content is queried, never loaded: RAM is a shipping constraint
*Date: 2026-08-24 (from Tidbits Trivia Decision 049 + the vc75/vc85 Play rejections)*

A large bundled corpus (questions, cards, entries — anything in the tens of
MB as JSON) is accessed through a query layer (SQLite/FTS) or per-mode lazy
slices, never eagerly deserialized into the object heap at boot. Emulators
and dev phones hide this class entirely.

**Why**: Play rejected a release twice for an unreproducible-locally crash;
MEASUREMENT (not iteration) found a 299MB heap peak from eagerly decoding
the bundled corpus — and a later "fix" re-created it by building per-mode
shape sets at boot. The corpus grows with every content pass, so the failure
arrives silently in a release that changed no code.

**How to apply**: bundle a database, not a blob; open it memory-mapped and
query. If JSON is unavoidable, load per-mode/per-screen slices on demand and
measure the heap on the LOWEST-RAM device the stores will install to. Add a
CI check that fails when the eager-loaded bytes at boot exceed a budget.

## 037 — A generator's output is not the shipped artifact; re-running one must be additive
*Date: 2026-08-24 (from Tidbits Trivia Decision 051, the genguard + tombstones fix)*

When generated content is later hand-edited (authored fixes, curated
deletions), the generator's raw output becomes an INPUT to the shipped
artifact, not the artifact itself. Re-running a `gen_*.py` must merge over
authored changes and honor tombstones for authored deletions — a plain
regenerate silently reverts every hand fix and resurrects every removed row.

**Why**: authored quality fixes were silently reverted for weeks because a
generator rewrote its output file wholesale; nothing failed, the diff just
quietly undid human work.

**How to apply**: every generator writes through a merge guard: authored
rows win by key, deletions live in a tombstone list the generator respects,
and CI diffs regenerated output against the shipped artifact to catch a
guard bypass. Never let "regenerate" be a synonym for "overwrite".

## 038 — Randomness lives outside the selection pipeline
*Date: 2026-08-24 (from Tidbits Trivia Decision 052; companion to Decision 025)*

A shuffle INSIDE a selection pipeline (shuffle → filter → truncate) chooses
CONTENT, not presentation, the moment anything downstream truncates — and it
does so differently per platform and per run. Selection must be
deterministic end to end (hash-rank per Decision 025); randomness is applied
only to the final presentation of an already-chosen set (option order,
display shuffle), seeded where cross-platform agreement matters.

**Why**: a "random for variety" shuffle ahead of a truncation step meant
different platforms — and different runs — silently played different
content while every layer looked correct in isolation.

**How to apply**: audit any pipeline containing both a shuffle and a limit.
Move the shuffle after the cut, or replace it with hash-rank. Golden-test
the selected SET, not just the first item.

## 039 — Store billing APIs disagree in shape; port the intent, never the code
*Date: 2026-08-24 (from Tidbits Trivia Decision 055 + the Windows Club IAP build)*

Each store's billing API has a load-bearing shape of its own, and the shapes
are OPPOSITES: Play Billing requires one query PER product type (a mixed
INAPP+SUBS list throws — on the main thread, at startup, only on a real
Play-provisioned device), while the Microsoft Store requires ONE query for
everything (a subscription is a `Durable` add-on; filtering by a
"subscription" kind silently returns nothing). Harmonizing them into one
cross-platform abstraction ships a crash on one platform and an empty
paywall on the other.

**Why**: the mixed-list throw shipped two consecutive crashing Android
releases — invisible on emulators (no Play Billing) and in every local
test; the Windows kind-filter mistake produced an empty paywall with no
error anywhere. Both were "the other platform's pattern, applied here".

**How to apply**: the entitlement MODEL is shared (products, entitlement
state, fail-open gating); each platform's QUERY layer is written from that
store's own docs, verified on that store's real provisioning path (Firebase
Test Lab / the certified Store install), never translated from a sibling.
Verify configured product ids by reading them back from the store's own API.

## 040 — Local persistence must never block launch: open in do/catch, fall back to in-memory
*Date: 2026-08-24 (from Bsky Dreams, the SwiftData corrupt-store fix)*

The local store (SwiftData `ModelContainer`, Room database, IndexedDB
open) is created inside a failure handler; if the on-disk store fails to
open, the app falls back to an in-memory store and launches anyway.

**Why**: a corrupt or migration-incompatible store previously crashed the
app on every launch with no recovery path — the user's only fix was
delete-and-reinstall. One session without persistence is a nuisance; a
launch-blocking trap is a lost user. (Same family as the SwiftData
lightweight-migration trap: a property added to an existing model needs an
inline default at the declaration, or existing stores crash on open.)

**How to apply**: wrap container/DB creation in do/catch (or the platform
equivalent), fall back to in-memory, and let the next clean launch rebuild
the on-disk store. Surface degraded persistence to the user only if a
user-visible feature depends on it. Never let "the store is the app's
foundation" justify trapping on it.

## 041 — When the native project can't live at the repo root, a root workspace shim satisfies the CI host
*Date: 2026-08-24 (from Bsky Dreams, the Xcode Cloud onboarding fight)*

Decision 002 puts the Xcode project at the repo root. When a repo's
history makes that impossible (the root belongs to another platform and
the project is nested), do NOT move the project — add a **root
`.xcworkspace`** whose `FileRef` points at the nested `.xcodeproj`, and
target the workspace from CI.

**Why**: Xcode Cloud (and similar hosts) hard-require the
project/workspace at the repository root and silently revert a configured
subdirectory path. Relocating a live App Store project mixes platform
sources and churns every path; the workspace shim is three small files.

**How to apply**: (1) root `NameApp.xcworkspace` referencing the nested
project; (2) a **workspace-level shared scheme**
(`.xcworkspace/xcshareddata/xcschemes/`) copied from the project scheme
with container paths rewritten relative to the root — CI validates the
scheme at the workspace's shared-data path, not the project's; (3)
`ci_scripts/` beside the workspace (the repo root), because the CI host
only runs scripts beside whatever the workflow targets. Quote paths —
nested projects often carry spaces. Note per Decision 020 the GitHub-runner
pipeline remains the default; this shim is for whichever host imposes the
root requirement.

## 042 — Platform-free logic gets a sidecar SPM package so `swift test` runs without a simulator
*Date: 2026-08-24 (from Bsky Dreams, the gesture-router test package)*

Pure logic that a UI feature depends on (gesture routing math, ranking
functions, parsers) is extracted into a small standalone SwiftPM package
in the repo — `platforms: [.macOS(...)]`, no app-target dependency — with
its tests, runnable via bare `swift test`.

**Why**: logic embedded in the app target can only be tested through
xcodebuild + a booted simulator — slow enough that tests don't get run in
tight loops, and unavailable to CI shells without simulator setup. The
sidecar package gave a 43-test suite on the exact code that had burned 16
debugging iterations, at second-scale runtimes. It also forces the
platform seam: code in the package provably imports no UIKit/SwiftUI.

**How to apply**: when a bug-prone feature has a computable core, extract
that core into a repo-local SPM package (source + testTarget), have the
app target include the same source, and run `swift test` in the loop and
in CI. This complements Decision 032 — external observation still gates
UI behavior; the package gates the math.

## 043 — Algorithmic surfaces honor the user's own moderation and explain every ranked item
*Date: 2026-08-24 (from Bsky Dreams, the Discover feed rebuild)*

Any surface this template's apps rank algorithmically (feeds, discovery,
recommendations) must (a) apply the user's OWN existing moderation
settings — platform mutes/blocks, muted words, content-label
preferences — rather than an app-invented blocklist, (b) personalize only
from signals the user can see and change by acting in the app, and (c)
attach a one-line "why you're seeing this" reason to every ranked item.

**Why**: the first build merged globally engagement-ranked sources — every
account saw the same feed, global virality dominated, and the score
structurally rewarded rage-bait. Ranking is an editorial act; unexamined,
it optimizes for exactly what the "Why we build" note rejects. The
transparency chip is the enforcement mechanism: a signal whose reason
can't be stated in one chip is too opaque to use.

**How to apply**: run the `learning-orientation-design` four questions
against the ranking FUNCTION itself, not just the feature proposal; full
pattern (multi-source merge, conversation-weighted scoring, seen-item
bypass, flat-tabs IA) in `values-based-feed-ranking`.

---

## 044 — Every user-visible affordance must control something real
*Date: 2026-08-26 (from BOBA Playbook, the pricing time-window picker removal)*

A control that visually scopes a panel but actually filters an empty or
irrelevant data source is not a "no-op control," it's a trust-erosion
device — the user forms a wrong mental model from its apparent scope.

**Why**: a 7/30/90-day picker appeared to scope an entire pricing panel
but only set one query param on one signal — a signal that was
permanently empty. Worse, the three platforms sent different values for
that param, splitting the server cache so the same entity showed
different data per platform at the same moment. The picker's removal
fixed both the lie and the divergence.

**How to apply**: before shipping any picker/toggle/filter, name exactly
what it changes; if the honest answer is "one sub-signal" scope it
visually to that signal, and if the answer is "nothing real," remove it.
When platforms hit a shared cached endpoint, fix the parameters
server-side or normalize the cache key (`zero-cost-hosted-backend`).

---

## 045 — Feature gating: keep the code, gate the single UI entry point
*Date: 2026-08-26 (from BOBA Playbook)*

When a feature is built but blocked on an external dependency, keep all
implementation code in place and gate at ONE call site
(`if featureEnabled { … }`). Don't delete or hollow out working code
while waiting.

**Why**: building ahead of infrastructure is sometimes unavoidable.
Half-deleted code makes the feature harder to re-enable and the codebase
ambiguous about what works. A one-line gate makes re-enabling a one-line
diff and keeps the implementation compiling (so refactors can't silently
rot it).

**How to apply**: one flag, one entry point, a note in SCRATCHPAD's
deferred list naming the external blocker. The exception is a REVOKED
dependency — that's a removal, not a gate
(`third-party-revocation-resilience`).

---

## 046 — One canonical ID and one canonical asset per entity
*Date: 2026-08-26 (from BOBA Playbook's "One ID per Card, One Image per Card")*

Every entity in a shared catalog gets exactly one canonical identifier
(a composite-ID formula defined in ONE source per language, stored as a
real field, never recomputed at runtime) and exactly one canonical
asset, enforced at the byte layer by an md5-collision guard in the
pipeline.

**Why**: identity drift is the root of the worst catalog bug classes —
wrong-entity merges, duplicate rows, one entity silently wearing
another's image. Each is invisible until a user notices, and each is
enforced only where it can be measured: the ID at the catalog layer, the
asset at the binary layer.

**How to apply**: `canonical-entity-identity` carries the formula
rules, collision audits, and the lockstep migration protocol;
`image-cdn-discipline` carries the asset-side guard.

---

## 047 — Two backend postures: sync islands OR the hosted split — choose in M0
*Date: 2026-08-26 (reconciles 015; from BOBA Playbook)*

Decision 015's sync-islands posture (each ecosystem syncs on the user's
OWN cloud; no backend to run) is the default — but it only serves
per-user data. The moment users must see EACH OTHER'S data (public
profiles, shared collections, moderation, matching), the app takes the
hosted split instead: a hosted Postgres for auth + user data ONLY,
catalog as static published artifacts, media on a zero-egress CDN, and
small serverless workers for the seams. Never both for the same data.

**Why**: the two postures were sitting unreconciled in this log — 015
assumed no backend while 011's JWT-refresh rule assumed one. The real
rule is a fork on ONE question: is any user's data read by another user?
No → sync islands (zero infrastructure). Yes → the hosted split, kept
free-tier-viable by putting only genuinely shared state in the database.

**How to apply**: record the choice as an M0 decision.
`per-ecosystem-sync-islands` for the first path;
`zero-cost-hosted-backend` for the second (roles + RLS, worker fleet,
username/handle rules, account deletion).

---

## 048 — Next-OS APIs are adopted additively behind BOTH a runtime and a compile-time gate
*Date: 2026-08-26 (from BOBA Playbook, the iOS 27 adoption + the un-submittable build)*

While the deployment floor stays on OS N, every OS N+1 API is adopted
behind `if #available(OS N+1, *)` (runtime) wrapped in a compilation
condition that only exists when building against the N+1 SDK
(`OTHER_SWIFT_FLAGS[sdk=iphoneosN+1*] = -D OSNPLUS1_SDK`), with the OS-N
path in `#else` — and the gates live in ONE Compat wrapper file.

**Why**: `#available` alone still requires the symbol in the build SDK,
so the project silently compiles ONLY under beta Xcode — and App Store
Connect rejects every beta-Xcode build. The failure surfaces at submit
time, long after the build "worked" locally. The compile-time gate keeps
the GA toolchain shippable and the beta toolchain testable from the same
source. Never bump the floor as a shortcut, and never adopt an N+1 API
that regresses an existing affordance or has no real problem behind it.

**How to apply**: recipe in `cloud-appstore-submission` Rule 6. When the
floor rises to N+1, delete the flag and the `#else` branches, keep the
runtime `#available`.

---

## 049 — Marketplace-adjacent features never touch money
*Date: 2026-08-26 (from BOBA Playbook, TRADE-DESIGN.md)*

If the app introduces users who then trade/sell with each other, the
app processes, holds, escrows, or takes a cut of NOTHING. The
architecture is pure introduction: passive matching on explicit user
inputs, a deep link to an external messaging platform, block +
mailto-report + published contact for store compliance — and the app
steps out of the transaction entirely.

**Why**: the moment funds flow through the app, marketplace-facilitator
laws trigger (multi-state tax collection, 1099-K, money-transmitter
analysis, KYC/AML) — inoperable for a small team. Hosting user-to-user
messaging triggers per-message moderation obligations and creates an
archive of dispute evidence. Subscriptions via store IAP are NOT
touching money (you sell access to your features, not a cut of their
transactions).

**How to apply**: `marketplace-adjacent-design` + seed the binding doc
from `docs/templates/TRADE-DESIGN-template.md` BEFORE building any
trading surface. Kill any proposal with a Pay button, escrow, or
per-trade fee at proposal stage.

---

## 050 — Market data is provenance-honest, and the sold history is generated, not bought
*Date: 2026-08-26 (from BOBA Playbook, the pricing rebuild)*

Every price/valuation states what KIND of data it is; an asking price
or derived estimate is never presented as market value. When no sold
data exists, the honest label ("N active listings · no sales data yet")
IS the feature. When no API will sell you transaction history, snapshot
public active listings and infer sales from vanishings — after ~60 days
you own the history.

**Why**: asking prices run 10–25% above transacted; folding them into a
"market value" silently inflates every number, and a fabricated
"Market Est." teaches users to distrust the whole surface. The
structural insight: pipelines that depend on a third party for the
scarce data are broken by design — the durable asset is the history you
generate and own.

**How to apply**: `provenance-honest-market-data` — the signal
hierarchy, vanish-inference scoring, match-precision gates, the
audit-by-pattern discipline, and the UI rules.

---

## 051 — Every third-party data dependency is presumed revocable
*Date: 2026-08-26 (from BOBA Playbook, a partner's revocation email)*

Operate so that any single external data/image/API partner can revoke
authorization without killing the product: prefer data you generate or
that the community contributes, keep provenance per record, and design
the exit before the dependency is load-bearing.

**Why**: a partner who saw the app as a competitor revoked everything
by email — data, images, mappings, lookup logic, automation — leaving
one permitted use (an outbound link). The removal took a 24-tick
compliant teardown plus a multi-thousand-record provenance backfill.
The cost of independence is paid once; the cost of dependence recurs
with every partner's mood.

**How to apply**: `third-party-revocation-resilience` for both halves —
the prevention posture and the compliant-removal loop (prohibition list
first, replacement table before deletion, frozen legacy data vs live
automation, grep-verified end state). For the monetization side of IP
you don't own: `third-party-ip-monetization`.

---

## 052 — User-facing vocabulary is a render-layer contract over frozen schema names
*Date: 2026-08-26 (from BOBA Playbook, "Weapon" over `element`)*

Schema field names are frozen (renames are migrations); what users see
is a display-vocabulary mapping recorded in the data contract and
applied identically by every client. The community's own terms win over
schema language and over generic industry terms — including deliberate,
documented exceptions where one surface correctly uses a different
word.

**Why**: users learn and own their domain's vocabulary; leaking schema
language ("Element") or conflating two domain concepts under one
borrowed term ("Rarity") robs them of it and makes every platform
translate differently. The mapping table makes the vocabulary
enforceable in review instead of tribal.

**How to apply**: fill the Display Vocabulary section of
`docs/DATA-CONTRACT.md` (template §5.5); reject PRs that render a
schema name the mapping translates.

---

## 053: The look has one source, and every platform's tokens are generated from it
*Date: 2026-10-03*

`design-tokens.json` at the repository root holds the palette (light and
dark), the type ramp, spacing, and radius. `tools/design_tokens.mjs`
writes every platform's token file from it, and
`tools/test_design_tokens.mjs` fails when any of them differs from a
fresh run or a text pair falls below WCAG AA.

**Why**: the lockstep rule was a sentence, and the starter's own
placeholders broke it: the web was white with a blue accent, Android was
dark navy with an orange primary, Windows pinned orange, Apple's
AccentColor was blue, and each type ramp had different sizes. A student
whose agent changed the look in one file would see it on one platform
only. A rule that a test holds cannot drift that way.

**How to apply**: change the look in `design-tokens.json`, run the
generator, run the test, then build and look at every platform. Never
hand-edit a generated file or a `BEGIN design-tokens` block. Each
platform still maps tokens into its own idiom by hand (Android's
`Theme.kt` slots, Windows control styles, Apple views), and Apple keeps
system text styles for Dynamic Type. A deleted platform folder is
skipped, not recreated.

---

## 054 — Permission comes before scale: on someone else's IP, the licensing conversation is the first milestone
*Date: 2026-11-21 (from BOBA Playbook's shutdown and post mortem)*

When an app's subject matter belongs to someone else (a game, a show,
a catalog, a community's data), ask the owner before building past a
prototype, and get the answer in writing. Until there is a yes, build
only what tells you whether people want the thing: one platform, data
you may use, and no store listing that carries their brand. More
generally, scope and platforms grow when people and permission ask for
them, never because an agent makes building cheap.

**Why**: BOBA Playbook built three native clients, an image pipeline, a
pricing pipeline, practice battles and 3D card videos before the
publisher ever said yes. It never did, App Review rejected the iOS app
twice under Guideline 4.1 (Copycats) despite a non-affiliation
disclaimer, and the app shut down on 2026-11-21 with 32 accounts. The
engineering was never the constraint; audience and permission were, and
every added platform did nothing about either while multiplying what
had to be torn down.

**How to apply**: the `third-party-ip-monetization` skill, Part 0, before
the first pipeline that ingests the owner's content; the `multiplatform-expansion-method`
skill, Step 0, before any new platform; stage 00's "Ask whose it is"
for the builder. Write down in advance what silence means.

**Who was in the room, who gains, who pays:** the builder and an agent,
with the rights holder absent; the builder gains months of work kept
pointed at something that can last; the cost is a slower start and a
smaller first version.

---

## 055 — Every app is built so it can end well
*Date: 2026-11-21 (from BOBA Playbook's sunset)*

From the first deploy: every cloud resource carries the project's
prefix, a person can export their own data, the privacy, terms, and
data-deletion pages are static files that outlive the app, media sits
behind a domain the project owns, borrowed content lives in its own
directories, and the repo keeps an inventory (names only) of every
key, OAuth client, store listing, and registration. When the end comes,
the teardown follows `app-sunset-playbook`: inventory before deleting,
exports and personal notice before pausing, pause before deleting, and
delete by prefix only.

**Why**: BOBA Playbook's shutdown had to unwind a hosted database with
32 real accounts, ten Workers, an R2 bucket, a D1 database, four KV
namespaces, two store presences, and a dozen third-party registrations,
on a cloud account and a database org other projects still used. The
prefix was the only safe filter on the shared account, a key turned up
committed in a setup doc, the R2 bucket could not be deleted until a
lifecycle rule emptied it, and Play still required the data-deletion
URL after the app was unpublished. Each of those is free to prepare on
day one and expensive to discover on the last.

**How to apply**: the Part 0 rules of `app-sunset-playbook` when the
backend is first stood up (Decision 047 picks the posture); the rest of
the skill on the day. The repo ends archived, with a code-only license,
a post mortem, and the lessons upstreamed here.

**Who was in the room, who gains, who pays:** the owner deciding to
stop; the people who used the app gain their data back and a promise
kept; the owner pays a day of careful teardown instead of a week of
discovery.
