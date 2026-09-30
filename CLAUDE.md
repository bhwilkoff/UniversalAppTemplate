# [APP NAME]: Claude Code Project Context

## Why we build

Every feature in this app is built in service of human learning and
growth, not to replace thinking, but to deepen it. At each decision
point, ask: does this design invite the user to engage more fully,
think more critically, or connect more meaningfully? If a feature
makes a person more passive, reconsider it. If it opens a door to
curiosity or collaboration, prioritize it. The goal is never a slick
product. It is a tool that makes someone more human.

**Before implementing any feature**, invoke the
`learning-orientation-design` skill: the four-question test that
operationalizes this paragraph. The human-facing version of this
section is `docs/path/00-why-we-build.md`.

---

## How we build

The method lives in **skills**, vendored in `.claude/skills/` so they
travel with the repo (catalog: `.claude/skills/README.md`). Don't
re-derive these patterns; invoke the skill when its trigger matches.
Rows are grouped by the stage of `docs/path/` where they first apply.

| When | Skill |
|---|---|
| **00 Why we build** | |
| Proposing or reviewing ANY feature, especially AI, automation or recommendation | `learning-orientation-design` |
| Starting any feature change | `feature-shipping-discipline` |
| Logging an architecture decision | `architectural-decision-log` |
| Proposing UI / IA work once a platform has a design doc | `binding-design-doc-discipline` |
| **01 First prototype** | |
| Any web UI, routing, data, offline or image work | `web-platform-patterns` |
| Designing any view (any platform) | `mobile-first-density-design` + `native-platform-first` |
| Adding a list / grid / sheet / shelf | `universal-feature-states` |
| **02 Shape of an app** | |
| Shipping a feature on ANY platform, auditing a port, or mirroring a rule across languages | `cross-platform-parity-discipline` |
| Designing/changing shared data the clients consume | `shared-data-plane-contract` (worked example: `web-catalog-data-layer`) |
| A shared catalog needs stable entity IDs, or an ID formula/migration | `canonical-entity-identity` |
| Serving a catalog's images/media (tiers, CDN, cache sizing) | `image-cdn-discipline` |
| Sync, sign-in, favorites/progress across devices (the web bridges both islands) | `per-ecosystem-sync-islands` |
| Users must see EACH OTHER'S data (profiles, shared collections, roles, moderation) | `zero-cost-hosted-backend` (vs `per-ecosystem-sync-islands`, Decision 047) |
| Deriving a shipped corpus from a messy source (facts, cards, entries) | `content-corpus-derivation` |
| **03 Going native** | |
| Planning a new platform, sequencing the buildout, or choosing a deployment floor | `multiplatform-expansion-method` |
| iOS / iPadOS symptom (see platform list below) | `ios-production-gotchas` |
| Any Mac shell / window / player work | `macos-platform-patterns` (worked example: `macos-native-app-shell`) |
| Any tvOS UI / focus / persistence work | `tvos-platform-patterns` |
| Any Android work | `android-production-gotchas` |
| Expanding to Android TV / Fire TV / webOS / Tizen / Cast / Roku | `smart-tv-platform-expansion`, then `androidtv-compose-focus` / `smarttv-web-app` / `roku-brightscript-app` |
| A TV Detail / Series / Search screen on any ten-foot platform | `ten-foot-detail-design` |
| Adding an iOS share-sheet target (Share Extension) | `ios-share-extension` |
| Any Windows work | `windows-production-gotchas` |
| **04 Seeing it work** | |
| A fix that can't be verified from logs or a simulator | `device-observation-harness` |
| Building or extending real-device test automation, or setting up a bench | `autonomous-fleet-testing` + `docs/AUTONOMOUS-FLEET-TESTING.md` |
| More than one agent session drives the same devices | `concurrent-agent-device-leases` |
| User pushback after 3+ iterations of "still broken" | `3d-feature-debug-loop` |
| A visual / 3D feature you cannot observe directly | `3d-feature-sim-validation` |
| **05 Shipping** | |
| Preparing any store submission (App Store, Mac App Store, Play, Amazon, Roku, Microsoft) | `store-submission-playbook` |
| Building/signing/uploading an Apple build (default: cloud runner) | `cloud-appstore-submission` |
| Creating an App Store version / submitting for review (the FULL ship is CLI; never ask the owner to press Submit) | `apple-app-store-cli-submission` + `docs/APPLE-SUBMISSION-CLI.md` |
| Publishing an Android build to Play | `play-cli-submission` |
| Publishing a Windows MSIX to the Microsoft Store | `windows-production-gotchas` + `docs/windows/WINDOWS-STORE-SUBMISSION.md` |
| Launching or debugging in-app purchases on any store | `store-submission-playbook` + `docs/store/IAP-RELEASE-CHOREOGRAPHY.md` |
| **06 Keeping it running** | |
| Building a product-health / metrics dashboard, or a Pulse reading looks wrong | `product-pulse-dashboard` |
| Reading store downloads, installs, reviews, crashes | `store-metrics-pipelines` |
| Adding/editing ANY scheduled workflow, or debugging CI failures / alert noise | `ci-fleet-engineering` |
| Running an unattended multi-tick development loop | `autonomous-loop-cadence` |
| **07 Raising the ceiling** | |
| Video/audio streaming from hosts you don't control | `resilient-media-streaming` |
| SharePlay / Group Activities | `shareplay-activities` |
| Real-time multiplayer, or a $0 watch party across native + web | `cross-platform-multiplayer` + `zero-cost-hosted-backend` |
| A value that must be identical on every platform (daily pick, shuffle, hash) | `cross-platform-determinism` |
| Any algorithmic feed / discovery / "for you" surface | `values-based-feed-ranking` |
| Reader mode, article extraction, or link-preview cards | `web-content-extraction` |
| Signing in to a third-party provider from an installed app, or spending a per-app API quota | `authentication` + `third-party-revocation-resilience` |
| Identifying physical objects with the live camera | `camera-recognition-pipeline` |
| 3D card rendering in RealityKit | `realitykit-3d-card-rendering` |
| **08 Working with AI, and hard choices** | |
| Coordinating work with a second AI agent surface | `two-agent-handoff` |
| Adding a third-party data dependency, or a partner revokes one | `third-party-revocation-resilience` |
| Monetizing an app built around IP/content you don't own | `third-party-ip-monetization` |
| Showing prices, valuations, or market data from third-party listings | `provenance-honest-market-data` |
| Adding user-to-user trading / selling / matching | `marketplace-adjacent-design` + `docs/templates/TRADE-DESIGN-template.md` |

Platform-specific skill triggers:

- **iOS / iPadOS**: `ios-production-gotchas` FIRST when a symptom
  matches (presentation races, dark-mode legibility, layout blowups,
  background audio, wrong image in a recycled cell, a new `.swift`
  file that won't compile, "works on simulator"). It carries the
  cross-cutting lessons from four shipped apps. Share-sheet targets:
  `ios-share-extension`. Framework depth
  lives in the 86 vendored Apple skills (swiftui-patterns,
  swiftui-navigation, swiftdata, ios-networking,
  swiftui-liquid-glass, app-intents, widgetkit, etc.).
- **macOS**: `macos-platform-patterns` BEFORE any Mac shell / player /
  hero / browse / window / document work. macOS shares the whole Apple
  Core, so the FEATURE set is free. But the shell is a pointer +
  keyboard + menu-bar + resizable-multi-window app, and the traps are
  Mac-only: player-as-window-root (not an overlay), no
  `externalMetadata` (title via the window title bar), the full-width
  16:9 hero with no height cap, the fill-image layout blowup, the
  `ImagePipeline` (never bare `AsyncImage`), and `NSWorkspace` for
  companion deep links.
- **tvOS**: `tvos-platform-patterns` BEFORE any UI / focus / layout /
  animation / image-pipeline / persistence work. The generic SwiftUI
  skills cover most of tvOS, but the focus engine, ten-foot rules,
  the writable-directory trap, and the shelf/hero/detail recipes are
  tvOS-only and were learned the hard way. Once the tvOS app passes
  ~3 core screens, adapt `docs/TVOS-PLAYBOOK.md` (already in the
  template) into your app's own playbook.
- **Android**: `android-production-gotchas` FIRST (data-version
  keying, the contradictory-WHERE empty-grid class, deep-link inbox,
  swap ritual). For framework depth, install the Android skill stack
  into `~/.claude/` (`tools/install-android-skills.sh`), then
  `chrisbanes:<name>`, `rcosteira79:<name>`, etc.
- **Android TV / Fire TV**: `androidtv-compose-focus`: tv-material
  only, the runtime `UiModeManager` branch (never a fork), the focus
  contract, the Google TV quality gates, and the Fire TV zero-GMS
  flavor rule.
- **Smart-TV web (webOS / Tizen / Cast)**: `smarttv-web-app`: the
  additive `tv.js`/`tv.css` layer over the vanilla web app, the
  spatial-navigation engine, per-platform shims, `.ipk`/`.wgt`
  packaging from the one shared root. Vendor overview + store
  process: `docs/TV-PLATFORMS.md`.
- **Windows (optional)**: `windows-production-gotchas`
  FIRST: the CI-is-the-Windows-machine doctrine, headless-PNG
  observability, the visual-baseline gate, the platform-TFM and MSIX
  traps. The `windows/` scaffold is the as-shipped architecture
  (builds green out of the box); pipeline depth in `docs/windows/`.
- **Web**: `web-platform-patterns` is the umbrella: view system,
  URL state, service worker, IndexedDB, image fallback chains, CSS
  gotchas, headless verification. Third-party page content (reader
  mode, link previews): `web-content-extraction`. Design skills
  under `KUI:<name>`; `frontend-design` for component-level work.

---

## Debugging philosophy

**Do not iterate blindly on behavior you cannot observe.** When a
feature does not work correctly and the root cause is not
immediately clear from reading the code, the first move is
diagnostics, not another implementation attempt.

1. **Add observability before another implementation.** Write what
   you *expect* to see vs. what would *indicate* the bug.
2. **Isolate layers.** Verify each independently before changing
   any. The bug is in the layer whose actual output diverges from
   its expected output, not in the layer above or below.
3. **Use `print` (or `console.log` / `Log.d`), not `os.Logger`.**
   Print lands in the Xcode console / Android Studio Logcat /
   browser DevTools immediately with zero setup.
4. **For invisible UI bugs, add a temporary visual overlay.** When
   the user can't share a console (real device, sim screenshot
   workflow, a TV across the room), render a debug overlay so the
   relevant numbers appear directly on the screenshot. This is
   doubly important on tvOS, where interaction bugs (focus,
   animation, video) can't be reported any other way.
5. **For visual / 3D bugs you cannot directly observe, build an
   offline sim.** Render to PNG and `Read` the result before
   shipping (see `3d-feature-sim-validation`). On Android the
   analog is Compose `@Preview` + Roborazzi screenshot tests. On
   the web, execute the real JS in a Node DOM shim and
   pixel-measure screenshots; headless Chrome's virtual-time
   budget distorts timers and AbortSignal.
6. **Make diagnostics permanent but env-gated when the bug class
   recurs.** A flag like `APP_PLAYBACK_DIAG=1` that turns on
   structured log lines costs nothing when off and saves a full
   re-instrumentation next time. One-off diagnostics still get
   removed before declaring a fix complete.
7. **Drive the app to a known state for screenshots.** Env hooks
   like `APP_START_TAB` / `APP_START_ITEM` (no-ops in production)
   let `simctl launch` / `adb shell am start` open any screen
   directly, the backbone of both debugging and store-screenshot
   generation. The starters ship start tab, start item, mute and door
   seconds as DEBUG-only doors (Apple `Core/Store/LaunchDoors.swift`,
   Android `navigation/LaunchDoors.kt`, Windows `LaunchHooks.cs`, web
   `?view=`/`?item=`/`?mute=1`); names come from `tools/app_config.py`.

If user pushback returns after 3+ iterations of "still broken,"
that's the signal to invoke `3d-feature-debug-loop` and reset to
research-agent + observable-evidence discipline. Stop trying fixes;
start measuring.

**Simulator/emulator discipline:** boot ONE simulator or emulator
at a time; parallel-booting wedges both. The simulator is also
*lenient* in ways real hardware is not (tvOS lets Application
Support writes through; devices crash with EPERM). Anything that
touches the filesystem, entitlements, or sync needs a real-device
check before "done."

---

## What this app does

<!-- FILL IN: One paragraph on what your app does and who it's for -->

Available as a **web app**, a **native iOS/iPadOS app**, a **native
macOS app**, a **native Apple TV (tvOS) app**, and a **native Android
app**: five core platforms (the web plus four native), one feature
set. Optional additions: **Windows** (`windows/`), **smart-TV web**
(webOS / Tizen / Cast, via `tv.js`/`tv.css`), **Android TV / Fire TV**
(the same Android app), and **Roku** (`roku-brightscript-app`). When
adding to one platform, note the equivalent work in SCRATCHPAD.md and
update PARITY.md.

**Feature parity, not design consistency.** Web feels like the web.
iOS feels like iOS. macOS feels like a Mac (pointer + keyboard + menu
bar + resizable windows). tvOS feels like the living room. Android
feels like Android. The verbs are identical; the idioms aren't.

Not every app needs all five. Decide the platform set in M0 and
record it in DECISIONS.md. tvOS earns its place when the content
is lean-back (video, music, ambient, photos); macOS earns its place
when the app wants a desktop-class or document/pro surface, and it's
the cheapest port (it shares the entire Apple Core). A skipped
platform is a 🚫 column in PARITY.md with a reason, not a deletion.

---

## Web app

**Stack**: Vanilla HTML/JS. No framework, no build step. Custom
CSS, mobile-first. <!-- FILL IN: API / auth / hosting choices -->.
GitHub Pages static hosting, branch `main`, root `/`.

**Key directories**:
- `/`: root; index.html, CLAUDE.md, SCRATCHPAD.md, DECISIONS.md
- `/css/styles.css`: single main stylesheet
- `/js/api.js`, `/js/app.js`: API abstraction + view system
- `/assets/`: static assets (shared with iOS + tvOS + Android)

**Run locally**: `python3 -m http.server 8080` → visit
http://localhost:8080. Deploy: push to `main`; GitHub Pages serves
automatically.

**Conventions** (the load-bearing ones; see skills for the rest):
- All API calls through `js/api.js`, never `fetch` directly
  elsewhere
- CSS custom properties in `:root` in `styles.css`
- Mobile-first; all media queries use `min-width`
- No inline styles
- Error states must be user-visible (not just console logs)
- **URL-driven state is the web's superpower.** Every surface gets
  a shareable canonical URL; filters live in query params. The web
  app doubles as the canonical link target for shares from every
  native platform: every `appname://item/x` has an `https://…/item/x`
  twin (see DEEP_LINKS.md).
  User-made lists travel in the link itself (`/list/#<deflated blob>`;
  DEEP_LINKS.md, "State in the link").
- **`cache:'no-store'` does not bypass a service worker**, and an
  author `display` rule beats `[hidden]` (write `.x:not([hidden])`).
- **Every `API.x` the JS calls must be exported by `js/api.js`**,
  checked by a test.

**Safari layout pitfall** (codified in the bundled CSS):
`body { height: 100dvh; display: flex; flex-direction: column;
overflow: hidden; }` with `main { flex: 1; overflow-y: auto;
min-height: 0; }`. NO `viewport-fit=cover`. NO `position: fixed`
overlays; they break Safari's compositor at the Dynamic Island.

**Modern web APIs to reach for first** (skip the npm dep / custom
fallback):
- `<dialog showModal>` for all modals (native focus trap + ESC)
- Popover API (`popover="auto"`) for dropdowns + tooltips
- View Transitions API for cross-view animations
- Container Queries (`@container`) for component-level responsiveness
- CSS `:has()` to kill JS class-toggle patterns
- Web Share API with `clipboard.writeText` fallback
- MediaSession API for lock-screen / media-key controls on any
  playing media
- `prefers-reduced-transparency` / `prefers-reduced-motion`
  overrides for every blur / animation

---

## Apple apps (iOS / iPadOS / macOS / tvOS): one universal target

**Stack**: Swift 6, SwiftUI (`@Observable`), SwiftData for local
persistence, Keychain for credential storage, URLSession direct to API
(no third-party packages).

**The floor is a floor, not a ceiling.** Each app chooses its
deployment targets by the hardware they reach, measured (test-build at
each candidate floor and count the errors), and holds them with
`tools/test_ios_floor.py` / `tools/test_tvos_floor.py` in
`appstore-build.yml`. The measured defaults from Archive Watch: **iOS 18**
(iOS 26 dropped the iPhone XS/XR; below 17 SwiftData and Observation
break), **tvOS 26, held below 27** (27 dropped the Apple TV HD and 4K 1st
gen), **macOS 26**. Newer APIs (Liquid Glass, `Tab(role: .search)`,
`scrollEdgeEffectStyle`, `.navigationTransition(.zoom)`, SpeechTranscriber)
are used fully on devices that have them, behind `#available`, with an
older path or an honest omission below. A stored property can't carry
`@available`: store it untyped behind a gated accessor. Anything older
than the native floor is the website's job. See `docs/path/03-going-native.md`.

**One Xcode target serves iPhone, iPad, Mac, AND Apple TV** (Decision
013, amended by Decision 019). Shared logic lives in `Core/`;
per-platform UI lives in `iOS/`, `macOS/`, and `tvOS/` groups behind
`#if os(iOS)` / `#if os(macOS)` / `#if os(tvOS)` guards. Production
experience: ~60–70% of a media app's Swift is platform-agnostic
(models, networking, query layer, playback-queue logic, sync). The
universal target makes that reuse real instead of aspirational, and
all three Apple platforms ride the same CloudKit private database for
free cross-device sync. macOS is the cheapest platform to add because
it reuses the entire Core. See `apple/README.md` for the exact Xcode
setup.

**Project structure** (Xcode Cloud compatible). The repo does NOT
ship an Xcode project. It ships starter Swift files in `apple/`
(`App/`, `Core/`, `iOS/`, `macOS/`, `tvOS/`, `Resources/`, `Tests/`).
Create the project in Xcode at the repo root, then move the `apple/`
files into its source folder, per `apple/README.md`. The result:

```
/                          ← repo root
├── AppName.xcodeproj/     ← you create this, at root (Xcode Cloud requirement)
├── AppName/               ← the apple/ starter files, moved here
│   ├── App/               ← entry point (#if os branches)
│   ├── Core/              ← platform-agnostic: Models, Networking,
│   │                        Store, query/queue/sync logic
│   ├── iOS/               ← iPhone/iPad views (#if os(iOS))
│   ├── macOS/             ← Mac views (#if os(macOS))
│   ├── tvOS/              ← Apple TV views (#if os(tvOS))
│   └── Resources/
├── AppVersion.xcconfig    ← shared version numbers (all Apple targets)
├── ci_scripts/            ← Xcode Cloud build scripts
├── index.html, css/, js/  ← Web app
└── android/               ← Android module (sibling; different toolchain)
```

**Critical conventions** (from production lessons across five
shipped platforms; see the vendored skills for depth):

- **All API calls through a shared singleton**, never URLSession
  directly from views
- **Auth state owned by one manager**; views read via `@Environment`
- **Global nav state in `@Observable` store** with one
  `NavigationPath` per tab; ONE shared destination registry
  (`navigationDestination` declared in a single place all tabs
  apply), never per-view destinations. This is what lets any
  surface push any screen from any tab.
- **Deep links / intents land in an inbox**, consumed by the root
  view once foregrounded. External entry points never mutate the
  router directly.
- **Version numbers via `AppVersion.xcconfig` only.** Never edit
  through the Xcode identity panel (it creates per-target overrides).
- **No third-party Swift packages.** Apple frameworks only.
- **URL routing via `.onOpenURL`** for both Universal Links and
  custom schemes, NOT `.onContinueUserActivity`
- **Refresh JWT before every Worker / Storage / Edge Function call.**
  The auth SDK's auto-refresh only covers its own HTTP path.
- **Core/ never imports per-platform UI.** When Core logic needs
  app state, define a protocol in Core and conform the app store to
  it. This is what keeps Core compiling for every os() target.
- **The rule is a value; the platform is a caller.** Decision rules
  (stall detection, sync correction, capability predicates) are pure
  functions with injected inputs in Core; the platform applies the
  returned value. That is the test seam and the port seam at once. A
  shared type is not a shared path: confirm which platforms run it.
- **Never put a fill-mode image (`scaledToFill`) inside a
  `frame(maxWidth: .infinity)`.** The frame adopts the oversized
  cover dimensions and blows the layout (intermittently, because it
  depends on which artwork loads). Ambient/hero art goes in
  `.background` + `.clipped()`, which cannot influence layout.

### macOS-specific guardrails (read `macos-platform-patterns` first)

- **The player REPLACES the split view as the window root while
  playing**, never an `.overlay`/cover on the split view (its
  toolbar, sidebar toggle, and the previous view's title bleed
  through over the player).
- **macOS `AVPlayerItem` has NO `externalMetadata`.** Show the title
  via the window title bar, never an `AVMutableComposition`
  metadata-override: over a resilient custom-scheme asset it renders
  BLANK video (audio advances, no picture). Tried + reverted twice.
- **A resizable-window hero is full-width `.aspectRatio(16/9, .fit)`
  with NO `maxHeight` cap.** A fixed height crops as the window
  widens; a cap insets/centers ("doesn't extend across"). The same
  fill-image layout blowup as iOS applies: a sized shape owns
  layout, the image fills via `.background`.
- **Never bare `AsyncImage` for browse art.** Route through an
  `ImagePipeline` (decoded `NSCache` + one `URLSession` capped at
  `httpMaximumConnectionsPerHost = 6` + in-flight coalescing), and
  decode non-8-bit-RGB → sRGB once (`Image(nsImage:)`'s Metal path
  renders a grayscale/CMYK image as a solid white box).
- **Structured concurrency (`.task(id:)`), not Combine
  `Timer.publish`** for hero rotation / debounce. A timer can fire
  into a torn-down view and trip an executor fault.
- **Companion-app deep links via `NSWorkspace`**, NOT
  `UIApplication`; and NO `LSApplicationQueriesSchemes` Info.plist
  entry on macOS (that array is an iOS privacy restriction).
- **Guard next-OS-only symbols with `#if compiler(>=X.Y)`, not just
  `#available`.** A runtime `#available` check still needs the
  symbol in the BUILD SDK, so it won't compile on the GA toolchain.
- **Every command is in the menu bar**, wired through `.commands`;
  disable, never hide.
- **A Mac button says what it does at every window width**:
  `ViewThatFits` over designed arrangements, `.fixedSize()`, the rest in
  a native More menu. Never truncation, wrapping, or icon-only.
- **A view being rebuilt is not a window being closed.** A closing
  window stops its playback; a rebuilt view first asks whether something
  longer-lived still uses the resource.

### tvOS-specific guardrails (read `tvos-platform-patterns` first)

- **Never `buttonStyle(.plain)` on tvOS.** It destroys focusability.
  Use `.borderless`, `.card`, or a custom `ButtonStyle`.
- **tvOS can only write to `Library/Caches`, `tmp`, and App Group
  containers.** Application Support writes crash on device (and
  pass on the simulator, so you won't see it until hardware).
  SwiftData's default store location crashes too: build the
  ModelContainer with an explicit App Group `ModelConfiguration`
  and fall back to in-memory so the app always launches.
- **Reset a tab's `NavigationPath` when the user leaves it via the
  sidebar**; otherwise tab state pollutes the next visit.
- **Initial-focus views (heroes, first-tab landings) claim focus
  exactly once** (a `hasClaimedInitialFocus` guard). A bare
  `.task { focused = true }` re-fires when lazy views recycle and
  yanks focus back mid-browse.
- **A held Select is a card's second verb** (`.contextMenu`); after its
  question closes, focus returns to the same card or its neighbor, never
  to the sidebar.
- **SourceKit phantom errors are stale index, not real.** Trust
  `xcodebuild`, not editor squiggles. `@Query` macro views can
  cascade unrelated "Cannot find X in scope" errors across a file.

---

## Android app

**Stack**: Kotlin 2.4.20 (AGP 9.4.1, Gradle 9.8.0, compileSdk 37) +
Jetpack Compose + Material 3 / **Material 3 Expressive**. `minSdk = 29`
(Android 10) in the scaffold, `targetSdk = 36` (Android 16). Lower it by
measurement, not by default: Archive Watch runs at `minSdk = 23` on
every store (and Fire TV needs 28 or lower), which took `lint NewApi`
clean at the floor and bundled Let's Encrypt roots (Android 6 and 7
don't trust them). Newer features gate on `SDK_INT`. Hilt + Ktor +
Coil 3 + Navigation 3 + Room + DataStore. No XML, no AppCompat, no
legacy ActionBar: **Compose-only**. The scaffold builds out of the box:
`cd android && ./gradlew :app:assembleDebug`.

**Project structure**:

```
android/
├── settings.gradle.kts, build.gradle.kts, gradle.properties
├── gradle/libs.versions.toml             ← version catalog (single source of truth)
├── app/                                  ← composition root (single-module bootstrap)
│   ├── build.gradle.kts
│   ├── proguard-rules.pro
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/example/appname/    ← rename to your reverse-DNS package
│       │   ├── MainActivity.kt
│       │   ├── app/AppNameApplication.kt
│       │   ├── navigation/LaunchDoors.kt
│       │   ├── ui/AppRoot.kt
│       │   ├── ui/theme/{Theme.kt, Color.kt, Type.kt}
│       │   └── data/ApiClient.kt
│       └── res/
└── scripts/sync_shared_assets.sh         ← mirror /assets/ → app/src/main/assets/
```

**Critical conventions** (the load-bearing ones; ANDROID-DESIGN.md,
once you create it, and the Android skill stack carry the depth):

- **Material Components first.** Exhaust M3 / M3 Expressive before
  any custom Composable. `SearchBar` before custom search;
  `ModalBottomSheet` before custom drag-from-bottom;
  `NavigationSuiteScaffold` before a hand-rolled width-class switch;
  `SharedTransitionLayout` + `sharedBounds` before a custom hero
  zoom.
- **Single Activity + Compose Navigation.** One `MainActivity`,
  hosts a `NavHost`, no Fragments.
- **UDF / state hoisting**: immutable `data class UiState` per
  screen; sealed-interface `Event`s; ViewModel injected at screen
  Composable only; pass `uiState` + `onEvent` lambda down.
- **All network calls through a shared Ktor client (Hilt
  singleton).** Composables / ViewModels never use `HttpClient`
  or `OkHttpClient` directly.
- **Every Worker / Storage / Edge Function call calls
  `refreshIfNeeded()` first**: same rule as iOS, via an OkHttp
  interceptor on the shared client.
- **Stable keys on every `LazyColumn` / `LazyVerticalGrid`**,
  non-negotiable for large lists.
- **Tink-encrypted DataStore for secrets**, never
  SharedPreferences. EncryptedSharedPreferences is deprecated.
- **`edge-to-edge` mandatory** at `targetSdk >= 35`. Honor
  `WindowInsets` via `Scaffold`.
- **Predictive back gesture** must work. `BackHandler` only for
  unsaved-changes confirmation.
- **Adaptive layouts via `currentWindowAdaptiveInfo()`**: every
  screen declares compact / medium / expanded behavior.
- **Brand theme by default; dynamic color opt-in.**
- **Version bump on every ship.** `versionName` is read from
  `AppVersion.xcconfig` (the same number as every Apple platform;
  `tools/test_version_contract.py` holds it). Only `versionCode` is
  bumped in `app/build.gradle.kts`.
- **Media playback = Media3/ExoPlayer + MediaSession** from day
  one. Lock-screen controls are a parity row, not a polish item.
- **Release signing**: upload keystore lives in `~/keystores/`,
  credentials in `~/.gradle/gradle.properties`, NEVER in git.
- **Declare EVERY deep-link host/path you emit.** A share link or
  App Link route that isn't in the manifest's intent-filter fails
  silently for external opens. Audit the manifest whenever a new
  URL shape ships.

---

## Windows app (optional)

**Stack**: **Avalonia 12** + **FluentAvaloniaUI 3** + **.NET 10** (C#),
`CommunityToolkit.Mvvm` for MVVM, DPAPI for secrets. No WinUI, no WPF:
Avalonia-only, because `Avalonia.Headless` renders real Skia pixels
in-process on any OS, which is what makes the $0, no-Windows-hardware
pipeline real (Decision 029). Ships to the Microsoft Store as an MSIX
(Microsoft re-signs; no cert to manage) + a single-file `.exe` direct
channel.

The **`windows/` scaffold is the as-shipped architecture** of a
Store-certified app. Adopt it per `windows/README.md`; don't re-derive
it. Four projects, and the shape is load-bearing: `AppName.Core`
(OS-agnostic C# port of the shared logic), `AppName.App` (Avalonia UI),
`AppName.HeadlessTests` (PNG snapshots + the visual-baseline gate +
golden vectors), `AppName.Windows` (the ONLY `net10.0-windows` TFM:
content-free WinRT edge, loaded reflectively; the TFM on the app project
kills every MSIX publish with MSB4062).

**The Windows workflows ship parked.** `windows-build.yml`,
`windows-repl.yml`, `windows-store.yml` and `windows-store-addons.yml`
live in `docs/windows/workflows/`. Copy the ones you need into
`.github/workflows/` before any `gh workflow run` below will find them.

**The loop is CI, not a local desktop**: iterate on the Mac head
(`dotnet test` → `Read` the PNGs), gate on `windows-latest`
(`gh workflow run windows-repl.yml`, ~2–4 min). "Renders on the Mac" is
never "correct on Windows". Critical conventions (depth in
`windows-production-gotchas` + `docs/windows/WINDOWS-PLAYBOOK.md`):

- **FluentAvalonia components first** (`FANavigationView` shell,
  `FAContentDialog`, `SettingsExpander`) before any custom control.
  Note the `FA` prefix in v3.
- **Compiled bindings on** + `x:DataType` on every view. A binding
  typo is a build error, not a silent blank. Views are parameterless.
- **The six-level type ramp + `Border.card` live once in `App.axaml`**;
  pin the brand accent (Fluent's dark-theme derivation washes it out).
- **All network calls through the shared Core client**, never a raw
  `HttpClient` from a view/VM.
- **Secrets are DPAPI-protected**, never cleartext on disk.
- **Pure function + thin Windows-guarded edge** for all Win32/WinRT work
  (`Win32HostInterop`, the reflective store gateway). This is what
  keeps it testable off Windows.
- **Version bump on every ship**: `<Version>` in the csproj +
  AppxManifest, stamped by `tools/stamp_msix_version.py` from
  `AppVersion.xcconfig` (the Store reserves the 4th segment).
- **Ship**: `gh workflow run windows-store.yml -f submit=true
  -f commit=true` (after copying it into `.github/workflows/`).
  Anything less succeeds while shipping nothing. See
  `docs/windows/WINDOWS-STORE-SUBMISSION.md` for the bootstrap and the
  silent stalls.

---

## Shared design system

**Design tokens**: keep these in lockstep across web / Apple / Android /
Windows. The Apple starter has no token file yet: create
`Core/Design.swift` (next to `apple/Core/Networking/` and `Store/`) and
all three Apple platforms share it. Until then the only Apple color is the `AccentColor` asset in
`apple/Assets.xcassets/`.

| Token | Web | Apple (iOS/macOS/tvOS Core) | Android | Windows |
|---|---|---|---|---|
| Primary | `--color-primary` in `:root` | `Color.brandPrimary` in `Design.swift` (you create it; not `Color.primary`, which SwiftUI already defines) | `BrandPrimary` in `ui/theme/Color.kt` | `BrandPrimary` in `App.axaml` (+ the pinned `.accent` styles) |
| Surface | `--color-surface` | `Color.brandSurface` | `BrandSurface` | `BrandSurface` / `Border.card` |

<!-- FILL IN your palette. Two systems, kept distinct:
     - Brand (UI chrome only): primary CTA, accent, background, surface
     - Semantic (content only): success / warning / error + domain-specific

     The split is binding: never use a brand color for content meaning,
     never use a semantic color for chrome. -->

```css
:root {
  --color-primary:    #FF5C35;  /* CTAs, active states */
  --color-accent:     #0047FF;  /* links, interactive */
  --color-bg:         #FFFFFF;
  --color-surface:    #F7F7F7;
  --color-text:       #0A0A0A;
  --color-border:     #E0E0E0;
}
```

**Typography hierarchy**: three weights × two sizes = six levels.
Refuse a seventh; refactor instead. See `mobile-first-density-design`
for the discipline.

| Level | Web class | iOS / macOS `Font.TextStyle` | tvOS | Android M3 token | Windows (`App.axaml`) |
|---|---|---|---|---|---|
| L1 Page title | `.view-heading` | `.largeTitle` | `.title1` (57pt) | `displaySmall` | `TextBlock.view-heading` (34/Black) |
| L2 Section header | `.section-header` | `.title2` | `.title3` (38pt) | `headlineSmall` | `.section-header` (20/Bold) |
| L3 Emphasized body | `.body-strong` | `.headline` | `.headline` | `titleMedium` | `.body-strong` |
| L4 Body | `.body` | `.body` | `.body` (29pt, the 10-ft floor) | `bodyMedium` | `.body` |
| L5 Caption | `.caption` | `.caption` | `.caption1` (25pt) | `labelMedium` | `.caption` |
| L6 Tabular | `.tabular` | `.body.monospacedDigit()` | same | `bodySmall` w/ tabular | `.tabular` |

macOS shares the iOS `Font.TextStyle` ramp (same Core `Design.swift`).
tvOS uses the same six levels but its own larger ramp: system tokens
only, never hardcoded sizes. 29pt is the body floor at ten feet.
tvOS 27 added Dynamic Type (`.scaledFont`); honor it behind `#available`
on 27 and keep the 29pt floor on 26.

**Density rule**: density comes from removing chrome, not adding
decoration. Test at 375px before 1440px. On tvOS the analogue is
**focus does the work**: the focused card is the chrome; surrounding
cards should be quiet, and brightness is reserved for the focused
element.

**Haptics (touch platforms)**: one semantic taxonomy, never ad-hoc
generators. `selection` (paging, toggles, segment changes) ·
`light`/`medium`/`heavy` (discrete actions by weight) ·
`success`/`warning`/`error` (operation outcomes). Two binding
pairings: `error` always accompanies a surfaced error banner;
`selection` always accompanies a page/segment change. Call sites name
the meaning; the platform mapping (`.sensoryFeedback` /
`UIFeedbackGenerator` on iOS, `HapticFeedback` on Android) lives in
one place. Don't sprinkle feedback where it adds noise.

**Icons vs. emoji (R-ICON-1)**: UI icons come from the platform icon
system: SF Symbols on Apple, Material Symbols on Android, inline SVG on
web. Emoji are **content** (a share grid, celebration copy, a data
string), never chrome. An emoji used as a button/nav icon renders
inconsistently across platforms and OS versions and reads as unpolished;
reach for the icon system every time.

---

## When to create a binding design doc

If your project grows past ~5 views on a platform, add that
platform's binding design doc: `tvOS-DESIGN.md`, `iOS-DESIGN.md`,
`macOS-DESIGN.md`, `WEB-DESIGN.md`, `ANDROID-DESIGN.md`. The
`binding-design-doc-discipline` skill defines the workflow: quote
the rule before proposing UI work; fix the doc, then fix the
feature. Seed each from the matching per-platform template in
`docs/templates/` (`TVOS-`/`IOS-`/`MACOS-`/`WEB-`/`ANDROID-DESIGN-template.md`),
which carry that platform's structure AND its hard-won rules; start
from `docs/templates/PLATFORM-DESIGN-template.md` (the index + the
shared shape).

The sibling docs share a shape: the cross-platform **principles**
are identical; the **idioms** they reference diverge. When a rule
in one doc deliberately inverts a rule in another (tvOS auto-focuses
Play on Detail; iOS never steals focus), say so in the doc. That
inversion is load-bearing, and a future session will otherwise
"harmonize" it into a bug.

Don't create these on day 1. Wait until the platform's UI
complexity warrants the doc. Once created, treat as binding.

An iPad whose regular-width layout outgrows iOS-DESIGN gets
`docs/IPAD-DESIGN.md` (seed: `docs/templates/IPAD-DESIGN-template.md`).
A feature whose capability differs by OS or hardware gets its own
binding doc from `docs/templates/FEATURE-DESIGN-template.md`. A rule the
owner approves for all platforms is stamped into every platform doc the
same day.

---

## Cross-platform feature parity

**Single source of truth: `PARITY.md`.** Every user-facing feature
gets a row showing web / iOS / macOS / tvOS / Android status with a
Notes column for deltas. The `cross-platform-parity-discipline` skill
carries the full workflow, including the **periodic parity audit**
(walk every shipped feature and ask "is this row in the matrix,
and is every cell honest?"). Audits catch silently-false cells
that day-to-day updates miss.

When shipping a feature on one platform, mirror it on the other
platforms in the same change set where feasible. The parity rule
is **same verb, native idiom**.

A platform that ports another keeps a three-level ledger
(`docs/templates/PORT-PARITY-LEDGER-template.md`): reachable is not
parity. A rule mirrored in several languages gets a mechanical parity
guard with a negative control. Floors go in PARITY's "Oldest hardware
served" row, and capability tiers decide cells: a capability a device
can never have is `n/a` with the reason; one it lacks for now gets a
sentence on screen.

---

## Shared data plane (if your app has one)

If multiple clients consume the same content/data (a catalog, a
feed, a corpus), build it ONCE as a published data plane and make
every client a consumer. No client re-implements the pipeline,
re-derives flags, or re-hosts the data. Author
`docs/DATA-CONTRACT.md` from
`docs/templates/DATA-CONTRACT-template.md` the moment the second
client exists. The `shared-data-plane-contract` skill carries the
full pattern (publishing, CORS/Range realities for the browser,
ETag refresh, additive evolution, merge-guarded mutations). A data
contract is a test: assert the documented shape over the real published
artifact, because one client's tolerance hides a defect from the others.
Thin clients read projections cut from one gatekeeper index, and every
builder imports the same policy predicates.

**Cross-platform determinism.** If a pipeline can compute the value,
publish the result and let every client read it; mirror an algorithm
only when it must run on device. Any value that must come out identical
on every platform (a "daily" pick, a shared shuffle, a match plan, a
hash key) is produced by ONE algorithm mirrored in each language and
proven by a **golden test that runs the real code on every stack and
diffs**. Never a seeded shuffle (RNGs differ across languages); prefer
an order-independent hash-rank. Watch the Kotlin signed-`Byte` hash
gotcha (`and 0xFF`). See `cross-platform-determinism`.

**Networked multiplayer rides a transport seam.** The wire protocol +
the authoritative arbiter live in `Core/` with NO platform-networking
import, so they compile for every target and unit-test offline; each
transport (Bonjour+TCP, GameKit, a backend WebSocket) is a thin adapter
below one `PeerLink` interface. Local same-room and online are the same
feature with a different adapter. See `cross-platform-multiplayer`.

---

## Automation, CI, and verification

These binding docs govern everything unattended; their skills fire on
the triggers above. Read the doc before re-deriving the pattern.

- **`docs/CI-FLEET.md`**: the workflow doctrine: a green run must
  have done something, a red run must mean something, and no run may
  destroy work. Compute/apply lock split, budgets that PUBLISH,
  guarded restores/publishes, the self-healing sweeper, the health
  auditor, and "a red X is reserved for broken" (a backstop timeout
  whose work still published is a warning, never a failure email).
  Enable `workflow-health.yml` + `retry-infra-failures.yml` once the
  repo grows scheduled workflows; start any new writer from
  `docs/templates/split-writer-workflow-template.yml`.
- **`docs/AUTONOMOUS-LOOPS.md`**: the loop discipline: the agent is
  never the tester; ship only on external observation; verified vs
  merely-fixed is a load-bearing distinction in every session log;
  DECISIONS.md stays context-sized (index + recent entries, older
  entries archived VERBATIM under `docs/decisions/`, which you create
  on the first roll at ~50 KB).
- **`docs/ENGINEERING-PROCESS.md`**: thirteen disciplines, each with
  its incident: absence is not evidence, a test is not a test until seen
  to fail, a negative finding needs a method and an expiry, search the
  decision log for the mechanism, the instrument is the first suspect.
- **`docs/MEDIA-PLAYBACK.md`**: for MEDIA apps only: the streaming +
  captions doctrine (loader invariants, the custom-loader/native-feature
  conflict list, HLS shapes, live captions, subtitle judging).
- **`docs/PROVENANCE.md`**: the coverage map. When you learn something
  template-worthy in an app repo, upstream the generic form HERE in the
  same session and update the map. App-local docs are where lessons go
  to be lost.
- **`docs/DEVICE-HARNESSES.md`**: the per-platform observation
  harness catalog (Apple TV scenario runner + OCR, Android TV focus
  verification, web-TV engine tests, throttled-network ship gates,
  the QA sweep, physical Test Lab) and the instrument-honesty rules:
  an instrument says when it is blind, never perturbs what it
  measures, and identifies its own configuration.

---

## How we collaborate

The patterns below are what make sessions across this project
*compound* instead of starting from scratch each time.

**The memory ratchet.** This project has an auto-memory directory
at `~/.claude/projects/<repo>/memory/`. Use it. When the user
**corrects an approach** ("don't do X"), save it as a feedback
memory with a `**Why:**` line. When the user **validates a
non-obvious choice** ("yes, exactly that"), save it too. Quiet
confirmations matter as much as corrections. When the user shares
**project state**, save as a project memory with the date. The
MEMORY.md index in that directory is your at-a-glance map.

**Fix the doc first, then the feature.** When a binding design doc
and a feature proposal conflict, **the bug is in the doc**. Update
the rule first, get alignment, then ship the feature.

**Trust but verify.** Subagent summaries describe what the agent
*intended*, not necessarily what it *did*. After delegating
research or implementation, check the actual diff before reporting
work as done.

**Auto-pace decisiveness.** When the user invokes a task and the
direction is reasonably inferable, make the call and keep going.
Reserve clarifying questions for actually blocked decisions only
the user can make.

**Verify before declaring done.** If you can run the app, run it.
If you can't directly observe the result, build an offline sim
that produces a PNG you can `Read`. Type checks and tests confirm
code correctness, not feature correctness. "Compiles" is not
"works." On a multi-platform repo this also means: **after touching
any shared file, re-build every platform that consumes it**. The
tvOS build going green after an iOS change is part of "done."

**Capture the ratchet.** When a recurring failure mode surfaces,
the fix lands in DECISIONS.md or a memory, not just in the
immediate code. The lesson is the deliverable.

**Session log discipline.** Each SCRATCHPAD.md session log entry is
state found, work done, state left. The scratchpad keeps only the two
most recent entries; older ones roll word for word into
`docs/SESSION-LOG.md` (create it on the first roll). A scratchpad that
drifts behind the code is worse than no scratchpad: when you discover
drift, fix the Current State section first, then work.

---

## Standing instructions

- **Read the relevant skill before re-deriving a pattern.** The
  vendored skills exist because the patterns came from real
  iteration. Invoke by name; don't paraphrase.
- **Commit messages quote the user's request verbatim** when
  applicable. See `feature-shipping-discipline`.
- **DECISIONS.md leads with WHY, not WHAT.** Lead with the rule,
  then `**Why:**`, then `**How to apply:**`. See
  `architectural-decision-log`.
- **Don't add features beyond what's requested.** Fix only the bug.
- **Don't refactor surrounding code.** Scoped diffs.
- **Default to writing no comments.** Only add one when the WHY
  is non-obvious: a hidden constraint, a subtle invariant, a
  workaround for a specific bug.
- **No emojis in code or commits** unless explicitly requested.
- **Only essential words on screen.** A caption must be a refusal, a
  warning, or a fact the person cannot discover by looking
  (`mobile-first-density-design` rule 7).
- **No AI-written lists or copy in the product.** Lists and blurbs come
  from data or a human editor (`learning-orientation-design`).
- **Side doors (feeds, MCP) are findable on the website, never
  featured in the apps.**
- **One spelling locale, linted.**
- **Always ensure cross-platform parity.** When shipping on one
  platform, mirror on the others in the same change set where
  feasible AND update PARITY.md. Don't ship one and wait to be
  asked. A platform you can't reach right now gets ⏳ with a note,
  never silence.
- **Update SCRATCHPAD.md "Out of scope" when rejecting an idea.**
  The discipline that prevents re-litigating next session.

---

## Current state

See `SCRATCHPAD.md` for active milestone + open questions. See
`DECISIONS.md` for architecture decisions. See `PARITY.md` for
feature parity across web / iOS / macOS / tvOS / Android (+ TV form
factors and Windows when adopted). See `docs/CLOUD-SUBMISSION.md` for
the cloud/API build & submit pipeline, `docs/CI-FLEET.md` +
`docs/AUTONOMOUS-LOOPS.md` + `docs/DEVICE-HARNESSES.md` for the
automation doctrine, `docs/TV-PLATFORMS.md` for the smart-TV stores,
and `docs/windows/` for the optional Windows platform.

This file is for the agent. Humans start at `docs/path/` (the stages,
beginning with `00-why-we-build.md`) and `COURSE.md` (the course built
on those stages).
