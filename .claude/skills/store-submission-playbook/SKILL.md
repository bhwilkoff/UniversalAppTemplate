---
name: store-submission-playbook
description: Use when preparing ANY store submission — App Store (iOS/iPadOS/tvOS/macOS), Google Play, or the Microsoft Store — including TestFlight/internal-track setup, store listings, screenshots, signing, review prep, in-app purchase launches, and the post-approval follow-ups. Carries the cross-store checklist and the expensive gotchas pre-paid - layered tvOS icons, Play App Signing vs upload-key fingerprints, AASA/assetlinks serving, the personal-account 12-tester rule, screenshot automation via env hooks, privacy manifests, account-deletion requirements, the one-submission-per-IAP-product rule and the Ready-to-Submit trap, per-platform License Agreement settings, and the pre-launch-report-is-Test-Lab reality. Triggers on App Store submission, Play Console, TestFlight, app review, store listing, screenshots, signing, archive build, assetlinks, AASA, privacy manifest, release prep, in-app purchase, IAP, subscription launch, paywall empty, pre-launch report, Ready to Submit.
---

# Store Submission Playbook

The end-to-end path to both stores, with the gotchas that cost real
days already paid. Three app lineages shipped through this:
App Store (iOS + tvOS + macOS approved), Play (internal track +
production prep), plus web (no gate — which is exactly why the web
build ships first and continuously).

## The DEFAULT pathway is now the cloud, not your Mac

**Build + upload from a hosted CI runner (a GitHub `macos-26`-class
runner), not the dev Mac.** See the `cloud-appstore-submission` skill
(Apple) and `play-cli-submission` (Play) — these are the primary
paths; the manual/Xcode-Organizer steps below are the FALLBACK.

Why the flip: a dev Mac running a **beta OS** gets `ITMS-90301` on
upload (App Store won't accept a build from a prerelease OS), and the
installed Xcode version drifts below App Review's floor, so uploads
recur `ITMS-90111`. A clean hosted runner sidesteps both. **TestFlight
still accepts beta-Mac builds** — so local upload stays useful for
internal testing, just not for submission-for-review.

## Sequencing rule

Store plumbing has multi-day EXTERNAL latencies (developer-account
review, domain DNS, store review itself). Start these at the
beginning of a release phase, not the end: store records, signing
setup, verification files, privacy forms. Engineering can proceed in
parallel; the human (owner) steps are the critical path — surface
them as an explicit OWNER list.

## Shared pre-flight (all stores)

- **Versioning**: bump marketing version + build per ship —
  `AppVersion.xcconfig` (Apple), `versionCode`/`versionName`
  (Android, kept in lockstep with the Apple marketing version).
  A mismatched `versionName` in a store listing screenshot is a
  real, recurring embarrassment — check it in the artifact, not
  the source.
- **Listing doc in the repo** (`docs/app-store-listing.md`,
  `docs/play-store-listing.md`): every field paste-ready — name,
  subtitle/short description, full description, keywords, URLs,
  copyright, release notes. Written once, reused every release; the
  human pastes, never composes in the console.
- **Screenshots via env hooks** (Decision 018): drive the app to
  each screen with `APP_START_TAB`/`APP_START_ITEM`
  (`SIMCTL_CHILD_…` on Apple sims; intent extras on Android), use
  demo/clean status bars (Android SystemUI demo mode), allow ~25s
  cold-start before the shot. Screenshot IDs must come from LIVE
  data — a stale seed ID renders an error screen in your marketing.
- **Required legal surfaces in-app**: third-party attribution
  rendered VERBATIM where the license requires it; privacy policy;
  account deletion if any sign-in exists (both stores reject
  without it).
- **Icon discipline**: every store/asset icon derives from the ONE
  canonical master in `branding/` (Decision-level: delete retired
  masters from the repo entirely — a stale master WILL get picked
  up by a future asset-generation pass; this happened twice on one
  project).

## App Store (iOS / iPadOS)

- App ID + capabilities (SiwA, iCloud, Push, App Groups) before the
  first archive; capability changes invalidate provisioning.
- `PrivacyInfo.xcprivacy` privacy manifest — required; include
  required-reason API declarations (UserDefaults → CA92.1 etc.).
- ATT only if you actually track (don't add the prompt "just in
  case" — it invites rejection questions).
- Universal Links: AASA at the domain root `/.well-known/` (apex
  domain — a project-pages subpath cannot serve it), Associated
  Domains capability (`applinks:domain`). Adding the entitlement
  re-signs — don't flip it while a build is in review.
- Xcode Cloud: `.xcodeproj` at repo root, no spaces in product name.

## App Store (tvOS) — the extra mile

- **Layered icon (imagestack), not a flat PNG**: App Icon + App
  Store icon as layered "App Icon & Top Shelf Image" brandassets;
  layers are LANDSCAPE (400×240 / 800×480 / 1280×768). Square
  layers fail actool **only on clean builds** — incremental builds
  mask it; verify with a from-scratch build before archiving.
- Top Shelf image (1920×720/2320×720 class) required for the
  product page even if you ship no Top Shelf extension.
- Back-button contract is a review item (Guideline 4.0): never
  intercept Back outside player/modal.
- tvOS screenshots are 3840×2160 (4K) — the env-hook protocol
  handles them like any other platform.
- On-device test before submitting: the simulator hides the
  writable-directory crash class entirely (Decision 017).

## App Store (macOS)

Shares the Apple pre-flight above; the Mac-specific gates:

- **App Sandbox** (required for Mac App Store): enable the
  entitlement and grant only the scopes the app actually uses —
  typically `network.client` (outbound fetch), and
  `files.user-selected.read-only` / a security-scoped bookmark ONLY
  if the app opens user documents. Do not over-request; unused scopes
  invite review questions, same as an unneeded ATT prompt.
- **Hardened Runtime** enabled (required alongside notarization).
- **AppIcon.icns** with the full macOS size ladder (16→1024, @1x/@2x),
  derived from the ONE canonical master like every other icon.
- `PrivacyInfo.xcprivacy` (same required-reason API rules as iOS).
- **`LSApplicationCategoryType`** set in Info.plist (the App Store
  category — required for a Mac submission; missing it blocks upload).
- **Notarization is handled by the App Store upload path** — a build
  submitted through App Store Connect is notarized as part of review;
  you do NOT run a separate `notarytool` staple for the store build
  (that's only for direct/DMG distribution outside the store).

## Google Play

- **Play App Signing**: production installs are PLAY-signed, your
  AAB is UPLOAD-signed. `assetlinks.json` must include BOTH
  SHA-256 fingerprints — add the Play signing cert print
  (Console → Setup → App signing) right after enrollment, or App
  Links break ONLY in production while every local build verifies.
- **Personal developer accounts**: production release requires a
  closed test with **12+ testers for 14 days** first. Plan the
  calendar; an internal track release does NOT count toward it.
- Keystore in `~/keystores/`, credentials in
  `~/.gradle/gradle.properties` — never in git. Verify the AAB's
  signer fingerprint matches assetlinks before upload
  (`keytool -printcert`).
- Data Safety form: answer from what the app DOES (for a
  no-account, no-analytics app: nothing collected) — overclaiming
  triggers review friction too.
- Listing assets: 512 icon, 1024×500 feature graphic, phone
  screenshots; deep-link-driven screenshot generation works the
  same as Apple.
- Manifest audit before submitting: every deep-link host/path the
  app EMITS (share links, App Links routes) must be declared in an
  intent-filter, and every route must land on the right screen —
  test with `adb shell am start -a android.intent.action.VIEW -d <url>`.
- **The internal track produces NO pre-launch report.** The
  pre-launch report IS Firebase Test Lab under another name — don't
  wait for Play to run it, run it yourself
  (`tools/testlab-android.sh`) before promoting. **Physical devices
  only**: emulators cannot see Play Billing at all, so a
  billing-at-startup crash (the classic mixed-product-list throw,
  Decision 039) is invisible on every emulator and every local run.
- **Two Console publish traps**: a changes bar reading "refused to
  auto-submit" (or stuck at "N changes") means those changes will
  NEVER process until you act on them — it is a stall, not a queue;
  and **"Submit N changes" is all-or-nothing** — every pending
  Console edit (listing copy, data-safety answers, another track's
  release) rides the same submit, so check what the N contains
  before clicking.

## Web (the no-gate platform)

No review — but the deep-link infrastructure other stores depend on
lives here: `/.well-known/` must actually serve (add `.nojekyll` on
GitHub Pages — Jekyll silently drops dot-directories), HTTPS
enforced, share URLs render a real landing (a 404-forwarder into
the app router makes every native share URL meaningful even before
the web feature exists).

## In-app purchases (any store) — the launch choreography

The full sequencing doc is `docs/store/IAP-RELEASE-CHOREOGRAPHY.md`;
Decision 039 carries the per-store API shapes; client-side diagnosis
is `docs/store/IAP-TROUBLESHOOTING.md`. The rules that gate everything:

- **The financial paperwork is the critical path and it's owner-only**
  (Apple Paid Applications agreement, Play payments profile, Partner
  Center payout/tax — the last is invisible to non-owner identities).
  Until done, stores return EMPTY product lists with no error.
- **An Apple IAP product attaches to exactly ONE review submission** —
  concurrent platform submissions starve each other. Ship the
  product-carrying platform first, wait for approval, then the rest.
- **"Ready to Submit" means never submitted.** Check the review
  submission's ITEM list, not the product's state page.
- **Per-platform settings exist** — the License Agreement (EULA) is
  set per Apple platform; walk each platform's page after changing it.
- **Empty-success ≠ thrown error** in the products query — render and
  log them differently, retry the cold-start empty case.
- **Purchases only verify on each store's real provisioning path**
  (TestFlight / a physical Play device / the certified Store MSIX) —
  plan an owner pass per store after release.

## After approval

- Update listing URLs when domains change; keep `docs/*-listing.md`
  the source of truth.
- Keep CloudKit/any schema deployed to Production in lockstep with
  releases (see `per-ecosystem-sync-islands`).
- Archive the exact submitted build number in SCRATCHPAD's session
  log — "which build is in review" is a question that otherwise
  recurs weekly.
