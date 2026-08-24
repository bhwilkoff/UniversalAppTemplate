# Universal App Template — every platform, one repository, with Claude Code

Project template for building **web, iOS/iPadOS, macOS, tvOS, Android
(including Android TV / Fire TV), smart-TV web (LG webOS / Samsung
Tizen / Chromecast), and optionally Windows apps in parallel with
feature parity** — many native experiences from one repository.
Designed for Claude Code, GitHub Pages, GitHub Actions cloud builds,
Xcode, and Android Studio. Skill-aware: the methodology lives in
vendored skills so this template stays lean and travels complete —
clone it and Claude Code knows how to build the way this template
builds, with no `~/.claude/` setup.

This is the successor to the Tri → Quad → Quint line, and the point
where the lineage stops adding one platform per generation and becomes
a single **rolling universal template**: new findings, harnesses, and
lessons from the live apps (Archive Watch, Tidbits Trivia, Bsky
Dreams, BOBA Playbook) are folded back HERE, continuously, instead of
into a next-letter fork.

**New in the Universal generation** (everything learned since Quint,
2026-07 → 2026-08):

- **CI fleet engineering** (`docs/CI-FLEET.md`) — running 30+ scheduled
  workflows without losing work or crying wolf: the compute/apply lock
  split, budgets that publish, restore/publish guards, the self-healing
  sweeper, the green-but-broken health auditor, and "a red X is
  reserved for broken." Standing guardian workflows ship ready
  (`workflow-health.yml`, `retry-infra-failures.yml`) plus the
  `ci-fleet-engineering` skill and the split-writer workflow template.
- **Autonomous loop discipline** (`docs/AUTONOMOUS-LOOPS.md`) — heavy
  unattended development without shipping fiction: the agent is never
  the tester, external observation over self-reports, instrument
  honesty, session-log/memory hygiene.
- **Device observation harnesses** (`docs/DEVICE-HARNESSES.md` +
  `tools/`) — the paired-Apple-TV scenario runner with screen OCR,
  D-pad focus verification on Android TV, the throttled-network ship
  gate, the QA sweep, physical Test Lab, and the
  `device-observation-harness` skill.
- **TV platforms beyond Apple** (`docs/TV-PLATFORMS.md`, the
  `smart-tv-platform-expansion` / `androidtv-compose-focus` /
  `smarttv-web-app` skills, the additive `tv.js`/`tv.css` layer, a Cast
  receiver, and webOS/Tizen packaging + submission docs) — two builds
  reach five stores; Cast covers the closed sets.
- **Windows as an optional first-class platform** — a committed
  `windows/` scaffold (the as-shipped Avalonia architecture: builds
  green out of the box, headless-PNG snapshots, the visual-baseline
  gate, the isolated-TFM WinRT library) plus `docs/windows/`: Avalonia +
  headless-Skia CI where `windows-latest` IS the Windows machine, the
  Microsoft Store MSIX pipeline, Sign in with Apple on Windows, and the
  `windows-production-gotchas` skill.
- **The full tvOS playbook** (`docs/TVOS-PLAYBOOK.md`) and the
  multi-store IAP troubleshooting + store-screenshot rule set
  (`docs/store/`).

The animating principle: **feature parity, not design consistency.**
Web should feel like the web. iOS should feel like iOS. macOS should
feel like a Mac (pointer + keyboard + menu bar + resizable windows).
The Apple TV app should feel like the living room. Android should feel
like Android. The verbs are identical; the idioms aren't.

The second principle: **software with personality, built for people.**
Every methodology skill in this template bakes in a human
orientation — features are tested against whether they deepen
understanding, invite participation, and support human agency before
they're built. The goal of sharing this template is a more connected
ecosystem of personality-filled software, without each builder paying
the up-front cost of setting up AI-assisted development from scratch.

## Track record

This template is the sixth generation of a working lineage — each app
shipped to production and its lessons were folded back in:

- **BOBA Playbook** (iOS App Store + Play internal track + web) —
  origin of the parity matrix, binding design docs, and the
  native-platform-first discipline.
- **Bsky Dreams** (iOS App Store + web) — cross-platform auth,
  deep-link routing lessons.
- **Archive Watch** (tvOS + iOS on the App Store, **macOS**, Android
  on Play, web PWA live on a custom domain) — everything tvOS, the
  shared-data-plane contract, resilient streaming, per-ecosystem sync,
  **the native macOS app shell (`macos-platform-patterns`), the cloud
  App Store + Google Play CLI submission pipeline that ships all Apple
  builds from a GitHub runner (`cloud-appstore-submission` +
  `play-cli-submission`), and the latest Android native gotchas**
  (image User-Agent throttling, Media3 fullscreen/PiP, edge-to-edge
  insets) — now vendored here as skills.
- **Tidbits Trivia** (iOS + tvOS on TestFlight, Android on the Play
  internal track, web on a custom domain) — built on the 4th generation,
  it contributed the **cross-platform multiplayer** methodology (the
  transport-seam abstraction, serverless same-room play over
  mDNS+TCP+AES-GCM, GameKit + Firebase-RTDB online, believable-bot
  fallback — `cross-platform-multiplayer`), **cross-platform determinism**
  (order-independent hash-rank + golden-parity testing —
  `cross-platform-determinism`), the **build-time content-corpus
  derivation** method (`content-corpus-derivation`), the **cloud-build
  cert-cap autofix** (`cloud-appstore-submission` Rule 8), and the
  **bot-labeling honesty rule** (`learning-orientation-design`) — all now
  vendored here as skills + Decisions 023–027.
- **Archive Watch, the 2026 summer campaigns** (the Universal
  generation's main source) — the smart-TV expansion (Android TV +
  Fire TV from one AAB, webOS + Tizen from the one web app, a
  published Cast receiver), the live-caption and playback quality
  programs verified on a paired physical Apple TV with screen-OCR
  scenario harnesses, and 48 architecture decisions of CI fleet
  engineering under heavy autonomous loops — distilled into
  `docs/CI-FLEET.md`, `docs/AUTONOMOUS-LOOPS.md`,
  `docs/DEVICE-HARNESSES.md`, `docs/TVOS-PLAYBOOK.md`,
  `docs/TV-PLATFORMS.md`, ~20 portable tools, and the
  `ci-fleet-engineering` + `device-observation-harness` skills.
- **Tidbits Trivia, the 2026 summer campaigns** — Windows/MSIX as a
  sixth platform with a $0 CI-only pipeline (`docs/windows/`),
  multi-store IAP failure modes (`docs/store/IAP-TROUBLESHOOTING.md`),
  screenshot rules enforced by the capture tool, physical-device Test
  Lab verification, and the owner-vs-agent task split
  (`docs/templates/OWNER-PLAYBOOK-template.md`).

## What's in the template

```
/
├── CLAUDE.md              Project identity + skill-aware standing instructions
├── SCRATCHPAD.md          Active milestone + open questions (lean; archive when full)
├── DECISIONS.md           Decision log — leads with WHY (seed decisions)
├── PARITY.md              Cross-platform feature matrix, 5 platforms (single source of truth)
├── DEEP_LINKS.md          The URL contract across all platforms
├── README.md              This file
├── .claude/               Slash commands + session-start hook + vendored skills
├── .github/workflows/     appstore-build.yml + android-build.yml + the two standing
│                          guardians: workflow-health.yml, retry-infra-failures.yml
├── .well-known/           Universal Links + App Links verification files
├── docs/
│   ├── CLOUD-SUBMISSION.md   The Apple + Play cloud/API build & submit runbook
│   ├── CI-FLEET.md           Workflow doctrine: locks, budgets, guards, sweeper, auditor
│   ├── AUTONOMOUS-LOOPS.md   Unattended-loop discipline: external observation, honesty
│   ├── DEVICE-HARNESSES.md   Per-platform observation harness catalog
│   ├── TVOS-PLAYBOOK.md      The full tvOS focus/ten-foot/playback playbook
│   ├── TV-PLATFORMS.md       Smart-TV store landscape (LG/Samsung/Amazon/Roku/Vizio/Cast)
│   ├── MEDIA-PLAYBACK.md     Streaming + captions doctrine (media apps)
│   ├── PROVENANCE.md         Coverage map: every lesson's home + deliberate exclusions
│   ├── research/             Ported research references (ten-foot design, social video, sync)
│   ├── windows/              Optional 6th platform: Avalonia + MSIX + headless CI
│   ├── store/                webOS/Tizen submission, Play API key, IAP troubleshooting +
│   │                         the multi-store IAP release choreography, store-screenshot rules
│   ├── runbooks/             CloudKit setup, data recovery, tvOS Top Shelf
│   └── templates/            Seed templates: 6 per-platform binding design docs
│                            (tvOS/iOS/macOS/Web/Android/Windows) + data-plane contract
│                            + TV design/backlog + split-writer workflow + owner playbook
│
├── index.html             Web app entry (vanilla HTML/CSS/JS — no build step)
├── css/styles.css         Mobile-first CSS; body flex-column for Safari
├── js/app.js, js/api.js   Web app logic + API abstraction
├── manifest.json          PWA manifest
├── assets/                Shared static assets (consumed by all five platforms)
│
├── apple/                 Swift starter for ONE universal target (iPhone + iPad + Mac + Apple TV)
│   ├── README.md          Exact Xcode setup for the universal target
│   ├── App/               Entry point (#if os branches — iOS / macOS / tvOS)
│   ├── Core/              Platform-agnostic: models, networking, store
│   ├── iOS/               iPhone/iPad views
│   ├── macOS/             Mac views (NavigationSplitView + AppKit-where-needed starter)
│   └── tvOS/              Apple TV views (focus-correct starter)
├── AppVersion.xcconfig    Shared Apple version numbers (all Apple targets)
├── ci_scripts/            Xcode Cloud build scripts (optional; cloud workflow is the default)
│
├── tools/                 Submission, CI-fleet, and device-harness tooling
│   ├── submit-appstore.sh, asc_certs.py, asc_profiles.py, asc_prune_certs.py,
│   │   asc_build_exists.py, ci_make_signing_p12.py, submit-play.sh, play-publish.py
│   ├── gh_retry.sh, gh_dispatch.sh, retry_infra_failures.py,
│   │   audit_workflow_health.py, check_workflow_gates.py,
│   │   sqlite_publish_guard.py, catalog_delta.py
│   ├── atv_scenario.py + ScreenOCR/, atv_see.sh, throttled_range_server.py,
│   │   verify_tv_focus.sh, tv_screenshots.sh, test_tv_focus.mjs, test_tv_ua.mjs,
│   │   test_packaged_origin.mjs, audit_fire_tv_gms.py, audit_tv_g6.py,
│   │   qa-sweep.sh, testlab-android.sh, mac-screenshots.sh, devserve.py
│   └── refresh-skills.sh, install-android-skills.sh
│
├── android/               Android module (Kotlin + Compose + Material 3 Expressive)
│   ├── gradle/libs.versions.toml         Version catalog (single source of truth)
│   ├── app/                              Composition root
│   ├── scripts/sync_shared_assets.sh     Mirror /assets/ into the AAB
│   └── README.md                         Per-module bootstrap notes
│
├── windows/               Optional 6th platform: Avalonia + FluentAvalonia + .NET scaffold
│   ├── AppName.Core/                     OS-agnostic C# port of the shared logic
│   ├── AppName.App/                      Avalonia UI (shell, type ramp, DPAPI, Win32 seam)
│   ├── AppName.HeadlessTests/            PNG snapshots + visual-baseline gate + goldens
│   ├── AppName.Windows/                  The ONLY net10.0-windows TFM (content-free WinRT edge)
│   └── README.md                         Adoption + the Mac↔CI loop
│
├── tv.js, tv.css          Additive smart-TV layer over the web app (webOS/Tizen)
├── tv/                    webOS/Tizen packaging (build-tv-packages.sh + manifests)
├── cast/                  Google Cast custom Web Receiver (CAF v3)
│
└── .gitignore             Build artifacts + secrets across all platforms
```

## Setup — 10 steps

1. **Use as template** on GitHub (or clone + re-init git).
2. **Decide your platform set** and log it as the first project
   decision in DECISIONS.md. All five? tvOS earns its place when the
   content is lean-back (video, music, ambient, photos); macOS earns
   its place when the app wants a desktop-class or document/pro
   surface (and it's nearly free once iOS exists — it shares the whole
   Apple Core). A skipped platform stays in PARITY.md as a 🚫 column
   with the reason.
3. **Fill in CLAUDE.md** — project name, what the app does, design
   tokens. Leave the methodology sections; they point at skills.
4. **Fill in SCRATCHPAD.md** — M0/M1 milestones with the
   learning-orientation-design checks.
5. **Create the Xcode project** (one universal target for iPhone +
   iPad + Mac + Apple TV — see `apple/README.md` for the full
   walkthrough):
   - Xcode → File → New → Project → Multiplatform → App
   - Product Name: `AppName` (NO spaces — Xcode Cloud requirement)
   - Save to **repo root** (not a subdirectory)
   - Add **Mac** and **Apple TV** as supported destinations on the
     same target
   - Move `apple/` Swift files into the Xcode-created group
     (preserving the Core / iOS / macOS / tvOS folder split), then
     delete the `apple/` directory
   - Add `AppVersion.xcconfig` to both Debug + Release configs
6. **Bootstrap Android** (in parallel, or whenever you start):
   - Open `android/` in Android Studio
   - Rename `com.example.appname` to your reverse-DNS package (the
     Play `applicationId` may differ from the Kotlin `namespace`)
   - Drop secrets into `~/.gradle/gradle.properties`; keystore in
     `~/keystores/` — never in the repo. See `android/README.md`.
7. **Push to GitHub** + enable GitHub Pages (Settings → Pages → main).
   Add a `.nojekyll` file if you serve `/.well-known/` — Jekyll
   silently drops dot-directories.
8. **Set up the submission pipeline** (the default is cloud — read
   `docs/CLOUD-SUBMISSION.md`):
   - **Apple** — `.github/workflows/appstore-build.yml` builds, signs,
     and uploads all Apple platforms from a GitHub `macos`-runner (a
     released macOS + GA Xcode). This exists because a dev Mac on a
     **beta OS is rejected by App Review** (ITMS-90301), and Apple's
     Xcode floor keeps rising (ITMS-90111) — the cloud runner clears
     both, free for a public repo. Seed the 7 signing secrets with
     `tools/ci_make_signing_p12.py` + `gh secret set` (one-time).
   - **Android** — `tools/submit-play.sh` builds the signed AAB and
     publishes via the Play Developer API (`tools/play-publish.py`);
     `.github/workflows/android-build.yml` covers CI.
   - **Web** — GitHub Pages auto-deploys from `main` on every push.
   - (Xcode Cloud still works for Apple if you prefer it — but its
     free compute runs out, and it can't help a beta-OS box.)
9. **Ship**: bump `AppVersion.xcconfig` → push → `gh workflow run
   appstore-build.yml -f platform=all` → select the build in App Store
   Connect → Submit for Review. Android: `tools/submit-play.sh
   --track production`.
10. **Start building** — Claude Code loads context via the
    session-start hook. Tell it what you want to build; the
    methodology is already in the room.

### Steps 11–13 — the Universal-generation layers (each optional, adopt when earned)

11. **Enable the smart-TV layer** (when the app earns the living room):
    `tv.css`/`tv.js`/`js/cast-sender.js` are already wired into
    `index.html` and self-disable off-TV. Fill in `tv/webos/appinfo.json`
    + `tv/tizen/config.xml` (app id, name, allowed hosts), register a
    Cast receiver ($5) and set `CAST_APP_ID` in `js/cast-sender.js`,
    then package with `tv/build-tv-packages.sh`. Landscape + stores:
    `docs/TV-PLATFORMS.md`; Android TV rides the existing Android app
    (see `androidtv-compose-focus`).
12. **Enable Windows** (when a desktop column is earned): adopt the
    committed `windows/` scaffold per `windows/README.md` (rename
    `AppName.*`, copy `docs/windows/workflows/*.yml` into
    `.github/workflows/`), then follow
    `docs/windows/WINDOWS-PLAYBOOK.md`. Verify with
    `cd windows && dotnet test` (PNGs on any OS), gate on
    `windows-repl.yml`.
13. **Enable the guardians + harnesses** (once the repo has scheduled
    workflows or on-device work): uncomment the `schedule:` blocks in
    `.github/workflows/workflow-health.yml` +
    `retry-infra-failures.yml`; start any data-writing workflow from
    `docs/templates/split-writer-workflow-template.yml`. Device
    harnesses configure via env: `ATV_DEVICE` / `ATV_BUNDLE` /
    `APP_CATALOG_BASE` (Apple TV), `TV_PKG` / `TV_ACT` (Android TV),
    `APP_BUNDLE` / `APP_DOMAIN` (the rest); build the OCR helper once
    with `swiftc -O tools/ScreenOCR/main.swift -o /tmp/appocr`. Catalog:
    `docs/DEVICE-HARNESSES.md`.

## How sessions work

- Session-start hook injects CLAUDE.md + current state from
  SCRATCHPAD.md.
- Slash commands: `/status`, `/milestone`, `/decision`, plus the
  bundled KUI commands.
- Vendored skills provide the methodology — see CLAUDE.md
  "How we build" for the trigger table.

## Methodology — skill-aware

This template doesn't repeat methodology in prose; it vendors it as
skills. Invoke them by name when their trigger matches:

**Values + workflow**:
- `learning-orientation-design` — four-question test for new features
- `feature-shipping-discipline` — end-to-end ship sequence
- `binding-design-doc-discipline` — once design docs exist, quote
  the rule before proposing UI work
- `architectural-decision-log` — when adding to `DECISIONS.md`

**Cross-platform method** (the heart of this template — distilled
from shipping the same app on five platforms):
- `cross-platform-parity-discipline` — the PARITY.md workflow:
  same verb / native idiom, same-change-set updates, and the
  periodic parity audit that keeps the matrix honest
- `multiplatform-expansion-method` — how to sequence a multi-platform
  buildout: find the data/UI seam, order platforms by reuse (macOS is
  the cheapest port — it shares the whole Apple Core), plan the ports
- `shared-data-plane-contract` — one published data plane, every
  client a consumer; contract doc, browser CORS/Range realities,
  additive schema evolution, merge-guarded mutations
- `per-ecosystem-sync-islands` — sync each ecosystem on the user's
  OWN cloud (CloudKit for iOS/macOS/tvOS; Google Drive App Data for
  Android/web); no backend to run
- `resilient-media-streaming` — per-platform patterns for streaming
  from hosts you don't control (the shared Core piece every native
  platform reuses)
- `store-submission-playbook` — App Store + Mac App Store + Play +
  tvOS submission, end to end, with the gotchas pre-paid

**Cloud / API builds** (the submission pipeline this template
pioneered — build + sign + upload without a local shippable Mac):
- `cloud-appstore-submission` — build all Apple platforms on a GitHub
  runner, MANUAL `.p12` signing via the ASC API, the 7 CI secrets,
  and the two cert gotchas (raw-PEM CSR; `-legacy` `.p12` PBE)
- `play-cli-submission` — Google Play Developer API v3 from the CLI
  (service-account JSON, versionCode discipline, staged rollout)

**Cross-platform design principles**:
- `mobile-first-density-design` — density from removing chrome
- `native-platform-first` — exhaust native APIs before custom (the
  single most expensive failure mode across every past project)
- `universal-feature-states` — loading / empty / error / offline

**Platform depth** — each platform gets an umbrella/gotchas skill
distilled from production, plus framework references:
- **iOS**: `ios-production-gotchas` (presentation races, dark-mode
  legibility, layout traps, background audio) + 80+ vendored Apple
  framework skills (SwiftUI, SwiftData, networking, Liquid Glass, App
  Intents, WidgetKit, …)
- **macOS**: `macos-platform-patterns` — the native Mac shell
  (`NavigationSplitView` + AppKit where SwiftUI stutters), player-as-
  window-root, the no-`externalMetadata` rule, the full-width-hero and
  fill-image layout traps, the `ImagePipeline` (no bare `AsyncImage`),
  `NSWorkspace` companion deep links, and the sandbox/notarization
  requirements. Reuses the whole Apple Core.
- **tvOS**: `tvos-platform-patterns` — focus engine, ten-foot rules,
  the writable-directory trap, shelf/hero/detail recipes, plus a
  production deep-dive reference to seed a project playbook
- **Android**: `android-production-gotchas` (data-version keying, the
  silent-empty query class, deep-link inbox, the atomic DB swap
  ritual, image User-Agent throttling, Media3 fullscreen/PiP,
  edge-to-edge insets, `rememberSaveable` nav) + the installable
  Android skill stack — see "Adding the Android skill stack" below
- **Web**: `web-platform-patterns` (view system, URL-driven state,
  service-worker discipline, IndexedDB, image fallback chains, CSS
  gotchas, headless verification) + `frontend-design` + `KUI:*`
  design commands
- **Design system depth**: `KUI:<name>` (system, brand, screen,
  review, code, a11y, darkmode, trends, figma)

**App Store / Play Store**: `store-submission-playbook` (process +
gotchas), `cloud-appstore-submission` + `play-cli-submission` (the CLI
pathways), `app-store-screenshots` (marketing assets),
`app-store-review` (iOS rejection prevention).

## Skills bundled with the template

> **Maintenance note**: the vendored set carries ~12 near-duplicate
> framework pairs from two upstream vintages (`cloudkit`/`cloudkit-sync`,
> `mapkit`/`mapkit-location`, `passkit`/`passkit-wallet`, …). Their
> bodies differ, so both are kept; when consolidating, pick per pair and
> record the survivors in `tools/refresh-skills.sh` so a re-sync doesn't
> reintroduce the rest.

Skills and slash commands are vendored directly into `.claude/` so
anyone who clones this repo has everything available immediately —
no `~/.claude/` configuration, no marketplace installs, no second
repository to track.

| Source | What | Update path |
|---|---|---|
| `swift-ios-skills` marketplace | 80+ Apple framework skills | refresh from upstream |
| `ui-ux-pro-max-skill` marketplace | `ui-ux-pro-max` design intelligence | refresh from upstream |
| `claude-plugins-official` | `frontend-design` skill | refresh from upstream |
| [ParthJadhav/app-store-screenshots](https://github.com/ParthJadhav/app-store-screenshots) | `app-store-screenshots` | refresh from upstream |
| [BigSiggis/Killer-UI](https://github.com/BigSiggis/Killer-UI) | `killer-ui` skill + `KUI:*` slash commands | refresh from upstream |
| Template maintainer | cross-platform methodology + design + production skills (incl. macOS, cloud/Play submission, cross-platform multiplayer, cross-platform determinism, content-corpus derivation) | hand-edited |

**Refreshing marketplace + GitHub-tracked skills**: run
`tools/refresh-skills.sh`. Safe to re-run; reports diffs.

**Adding the Android skill stack** (recommended; not vendored by
default because it would roughly double the .claude size). Use
`tools/install-android-skills.sh`, or install individually:

```sh
# Tier 1 — official
/plugin marketplace add Kotlin/kotlin-agent-skills

# Tier 2 — community
npx skills add chrisbanes/skills
/plugin marketplace add rcosteira79/android-skills
git clone https://github.com/skydoves/android-testing-skills ~/.claude/sources/android-testing-skills
git clone https://github.com/skydoves/compose-performance-skills ~/.claude/sources/compose-performance-skills
npx openskills install drjacky/claude-android-ninja
/plugin marketplace add aldefy/compose-skill

# Re-run refresh to vendor them
./tools/refresh-skills.sh
```

## What this template encodes

**From five platforms' worth of production iteration** (four shipped
apps, both app stores, a native Mac app, plus cross-platform + online
multiplayer):

- **Cross-platform**: parity tracking via a 5-platform PARITY.md with
  audit protocol, design-token alignment across CSS / Swift / Kotlin,
  the brand-vs-semantic color split, deep links as a written contract,
  "same verb, native idiom" as the binding rule.
- **Apple universal target**: ONE Xcode target builds iPhone, iPad,
  Mac, and Apple TV. Shared `Core/` (models, networking, state, query
  logic) + per-platform view layers behind `#if os` guards. Real
  measurement: ~60–70% of a media app's Swift is platform-agnostic.
  All Apple platforms share one CloudKit private DB → household sync
  free, and macOS is the cheapest port because it reuses the entire
  Core.
- **macOS**: the native Mac shell (`NavigationSplitView` + AppKit
  where SwiftUI stutters), player-as-window-root, no
  `externalMetadata` (title via the window title bar), the full-width
  16:9 hero with no height cap, the `ImagePipeline` (never bare
  `AsyncImage`; decode non-RGB → sRGB), structured concurrency over
  Combine timers, `NSWorkspace` companion deep links, and the App
  Sandbox / Hardened Runtime / privacy-manifest submission
  requirements.
- **tvOS**: the focus-engine decision tree, ten-foot typography
  (29pt floor), the writable-directory trap, hero/shelf/detail
  recipes, Top Shelf + App Intents wiring, layered app icons.
- **Web**: vanilla HTML/CSS/JS, URL-driven state as the web's
  superpower, the canonical-share-URL twin pattern, PWA + service
  worker, Safari compositor pitfalls, MediaSession.
- **Android**: Compose-only, M3 Expressive, edge-to-edge +
  predictive back, Media3 + MediaSession from day one, image
  User-Agent hygiene (throttled hosts), Media3 fullscreen + Activity
  PiP, `rememberSaveable` nav, signing hygiene (keystore never in
  git), manifest deep-link auditing.
- **Cloud / API submission**: build + sign + upload all Apple
  platforms from a GitHub runner (no local shippable Mac needed), and
  publish Android to Play from the CLI via the Developer API — the
  full pipeline is vendored (`docs/CLOUD-SUBMISSION.md`, the
  `tools/` scripts, `appstore-build.yml`) with the expensive gotchas
  pre-paid.
- **Production patterns as skills**: shared data plane contract,
  per-ecosystem sync islands (no backend to run), resilient media
  streaming, store submission playbooks (AASA/assetlinks, Play App
  Signing fingerprints, layered tvOS icons, screenshot automation
  hooks).

**What the template intentionally doesn't bake in**:

- **Binding design docs** — create per-platform once UI complexity
  warrants (~5 views). Seed from the five per-platform templates in
  `docs/templates/` (`TVOS-`/`IOS-`/`MACOS-`/`WEB-`/`ANDROID-DESIGN-template.md`),
  which carry each platform's structure AND its hard-won rules — start
  from `PLATFORM-DESIGN-template.md` (the index + shared shape).
- **A SwiftData / Room schema** — your app's data model is your own.
- **A pre-baked Compose design system** — `ui/theme/` ships brand-
  token shape, not a component library.
- **Firebase config / keystores / secrets** — per-project, never
  templated, never committed.

## Cross-platform feature parity rule

When shipping any user-facing feature, mirror it on the other
platforms in the same change set where feasible, and update
`PARITY.md`. The rule: **same verb, native idiom**.

| Verb | Web idiom | iOS idiom | macOS idiom | tvOS idiom | Android idiom |
|---|---|---|---|---|---|
| Search | `<input type="search">` + URL params | `Tab(role: .search)` / `.searchable` | `.searchable` on the split view / `NSSearchField` | `.searchable` (directional keyboard + free Siri dictation) | `SearchBar` family |
| Modal | `<dialog showModal>` | `.sheet` / `.fullScreenCover` | `.sheet` / a `Window` scene | full-screen focus context | `ModalBottomSheet` |
| Drop-down | Popover API | `Menu` | `Menu` / menu-bar `.commands` | focusable option row | `DropdownMenu` |
| Pull-to-refresh | scroll-snap + custom | `.refreshable` | n/a (⌘R / toolbar refresh) | n/a (auto-refresh on focus return) | `PullToRefreshBox` |
| Cross-view animation | View Transitions API | `.matchedTransitionSource` + `.zoom` | `.navigationTransition` / matched geometry | focus-driven crossfade | `SharedTransitionLayout` + `sharedBounds` |
| Filter chips | `<button>` toggling URL params | `FilterToken` / `searchScopes` | `Menu` / segmented / token field | focusable chip row | `FilterChip` / `InputChip` |
| Share | Web Share API | ShareLink | `ShareLink` / `NSSharingServicePicker` | QR code on screen | ACTION_SEND |
| Home-screen presence | PWA install | WidgetKit | Dock / menu-bar extra / widgets | Top Shelf | Glance widgets + App Shortcuts |
| Voice | n/a | App Intents + Siri | App Intents + Siri | App Intents + Siri | App Actions |

Add a row to PARITY.md for every new user-facing feature.

## Learning orientation

Every feature is evaluated against the four-question test before
implementation. See the `learning-orientation-design` skill:

1. Does it deepen understanding?
2. Does it invite participation?
3. Does it support human agency?
4. Clarity over cleverness?

A "no" to any is a redesign signal at proposal stage, not after
shipping. Applies identically across all five platforms — and it is
the part of this template most worth keeping when you make it yours.
