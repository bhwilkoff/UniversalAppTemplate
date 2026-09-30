---
name: store-submission-playbook
description: "Use when preparing ANY store submission (App Store iOS/iPadOS/tvOS/macOS, Google Play, Amazon Appstore, Roku, Samsung Tizen, Microsoft Store): TestFlight/internal tracks, listings, screenshots, signing, review prep, IAP launches, post-approval follow-ups. Carries the cloud-and-CLI default pathway, floors chosen by hardware, layered tvOS icons, Play App Signing vs upload-key fingerprints, AASA/assetlinks serving, the 12-tester rule, screenshot env hooks, privacy manifests, account deletion, one-submission-per-IAP-product and Ready-to-Submit traps, pre-launch report = Test Lab, driving a store console in a browser, and the Roku / Amazon / Fire TV / Tizen traps. Triggers on App Store submission, Play Console, TestFlight, app review, store listing, screenshots, signing, assetlinks, AASA, privacy manifest, release prep, IAP, paywall empty, Ready to Submit, Roku dashboard, certification, Amazon Appstore, Fire TV, Tizen."
---

# Store Submission Playbook

The end-to-end path to both stores, with the gotchas that cost real
days already paid. Three app lineages shipped through this:
App Store (iOS + tvOS + macOS approved), Play (internal track +
production prep), plus web (no gate — which is exactly why the web
build ships first and continuously).

## The DEFAULT pathway is the cloud, and the whole ship is CLI

**Build, upload AND submit from a hosted CI runner, not the dev Mac.** See `cloud-appstore-submission` (Apple build, sign, upload), `apple-app-store-cli-submission` (version, attach, review) and `play-cli-submission` (Play). The manual/Xcode-Organizer steps below are the FALLBACK.

- **Apple:** `gh workflow run appstore-build.yml -f platform=all -f notes="..."` builds, waits for the build to go VALID, and submits every platform through `tools/asc_release.py` (three versions, three reviewSubmissions). Nobody opens App Store Connect to press Submit, and you never ask the owner to. `appstore-submit.yml -f mode=status` reads the result back.
- **Play:** `gh workflow run play-release.yml` publishes to internal; a person uses it on a real device; `-f promote=<versionCode>` moves the same artifact to production.

Why the cloud: a dev Mac running a **beta OS** gets `ITMS-90301` (App Store won't accept a build from a prerelease OS), and a local Xcode drifts below App Review's floor (`ITMS-90111`). **TestFlight still accepts beta-Mac builds**, so local upload stays useful for testing, just not for review.

**Floors are chosen by hardware.** Pick each deployment target by the devices it reaches (test-build at each candidate floor), never by adoption share, and hold it with `tools/test_ios_floor.py` / `test_tvos_floor.py` in `appstore-build.yml`. A raised floor silently stops the store offering the app to older devices. The same holds for Android and Fire TV: Fire OS 7 is API 28, and a `minSdk` of 29 once hid an app from 60 of 98 Fire TV devices (`tools/audit_fire_tv_manifest.py`).

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
- **Listing doc in the repo** (you create `docs/app-store-listing.md`
  and `docs/play-store-listing.md`): every field paste-ready — name,
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

## Amazon Appstore, Fire TV, and Samsung Tizen

- **Amazon: reuse the one open edit.** The App Submission API allows one open edit per app; creating another fails. Find and reuse it, and never delete an edit someone else opened.
- **Amazon: a minSdk conflict needs delete-then-upload.** When the new APK's device targeting conflicts with the live one, remove the old APK from the edit first, then upload.
- **Fire TV filters by manifest before anyone can download.** Run `tools/audit_fire_tv_manifest.py` before every Amazon upload: `minSdk <= 28`, every `<uses-feature>` optional, both `armeabi-v7a` and `arm64-v8a`, a leanback launcher activity. Amazon's "Target your app" page shows the device count ("Fire TV (98): 38 selected"); read it after every upload. A fix that is built but not uploaded is not a fix.
- **Tizen: hide competing-store links.** Samsung rejects a TV app that links to another store.
- **Tizen: anchor every `sed` on `config.xml`.** An unanchored version substitution rewrote `<?xml version="1.0"?>` and corrupted the manifest.
- **Tizen: no spaces in the `.wgt` file name.** Install fails silently.
- **Tizen: the certificate's DUID list is edited through the small `+`** in the certificate manager, and the certificate password is kept apart from the key file. Runbook: `docs/store/tizen-submission.md`.

## Web (the no-gate platform)

No review — but the deep-link infrastructure other stores depend on
lives here: `/.well-known/` must actually serve (add `.nojekyll` on
GitHub Pages — Jekyll silently drops dot-directories), HTTPS
enforced, share URLs render a real landing (a 404-forwarder into
the app router makes every native share URL meaningful even before
the web feature exists).

## Driving a store console in a browser (Roku, 2026-09-08)

An agent can do most of a submission. What it cannot do is specific,
and knowing which is which saves an hour of guessing.

**Can:** create the app record, paste names and descriptions, upload
images and the signed package through the `<input type=file>` (find
the input by ref and upload to it — never click it, that opens a
native dialog nothing can see), set every dropdown and radio, run
the automated analyses, fix what they report, re-package and
re-upload.

**Cannot, and should hand back immediately:** sign-in and CAPTCHA;
anything gated on an email the agent has no access to; a content
judgement the owner owns.

### The traps

- **A console button can succeed and show you nothing.** Roku's
  "Verify developer account email" fires
  `POST /sendVerificationEmail` → 200 and renders no toast, no state
  change, nothing. It looked broken for an hour. When a click appears
  to do nothing, read the NETWORK LOG before concluding it failed.
- **The gating email may be a different address than the one on the
  developer record.** Roku wanted the ROKU ACCOUNT email verified;
  the developer contact email was another address entirely, on
  another page. The dashboard displayed the one it wanted — read it.
- **Navigating away loses an unsaved form**, and a form whose
  required fields are incomplete cannot be saved at all. Fill and
  save one page before opening the next; if a required field is
  missing (a phone number, say), look for it on the ACCOUNT record
  before asking the owner — it is often already there.
- **A required field can hide below the fold of a page you think you
  finished.** Roku's content rating, kids designation and category
  all live at the bottom of "Listing setup", under Countries. Read
  the whole page text, not the first screen.
- **A checklist in your own repo drifts into fiction.** Two rows of
  a submission doc said an asset was missing when it had existed for
  months (a privacy policy, a designed poster). Verify against the
  repo and the live site before telling the owner to make something.

### Pre-flight everything the console does not gate

Run the local checks BEFORE touching the console — they are free and
they catch things a reviewer would not forgive. On the last pass this
found the manifest still declaring `major_version=0`, so the first
store upload would have been named "0.1.51".

### Judge the store assets by the REVIEWER's first impression

A certification reviewer opens the deep link you hand them and the
screenshots you upload. Those are chosen on evidence, not
convenience:

- **Pick the demo title on rights clarity, playability and
  recognisability — in that order, all three measured.** A film that
  is public domain by AGE (pre-1930) beats one that is public domain
  by a notice defect, whatever its fame. Then verify it actually
  plays on the device: the famous alternative failed with
  `state=stop error=true` because it was a 4K upscale.
- **Screenshots must not show your own test residue.** A sideload
  keeps the channel's registry, so a "Continue Watching" row can
  quietly display the film you deep-linked minutes earlier. DELETE
  and re-install before shooting, not just redeploy.

### Certification findings are a design conversation, not a checklist

Roku static analysis went 12 findings (one Error) → 3 warnings. Two
of the three survive DELIBERATELY: adopting `rsg_version=1.3` would
silence them and force a minimum firmware of 15.1, locking out every
older device — including the owner's own. Record the refusal and its
reason in the manifest itself, or the next person "fixes" it.

### Roku store lessons (certification and the dashboard)

- **"Validated" is not "registered".** The search feed validator passing does not mean Roku ingested the feed. Confirm registration separately.
- **Keep the beta channel's package in sync with the store package.** Deep-link certification runs against what is submitted; a stale beta package fails it.
- **The package upload is automatable.** The dashboard's dropzone is an `input.dzu-input`; upload to it by ref like any other file input.
- **App Behavior Analysis must be started by hand.** It does not run on upload; start it, wait, read it.
- **Ask the device what it installs.** Query the device for its supported package formats before building for it, rather than assuming.
- **Never automate `genkey`.** The signing key is created once, by a person, and its credentials live where the packaging tool looks (`~/.config/roku/signing.env`). A regenerated key orphans the published channel.

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
