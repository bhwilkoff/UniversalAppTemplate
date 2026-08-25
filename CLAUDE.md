# [APP NAME] — Claude Code Project Context

## Why we build

Every feature in this app is built in service of human learning and
growth — not to replace thinking, but to deepen it. At each decision
point, ask: does this design invite the user to engage more fully,
think more critically, or connect more meaningfully? If a feature
makes a person more passive, reconsider it. If it opens a door to
curiosity or collaboration, prioritize it. The goal is never a slick
product — it is a tool that makes someone more human.

**Before implementing any feature**, invoke the
`learning-orientation-design` skill — the four-question test that
operationalizes this paragraph.

---

## How we build

This project follows a methodology that lives in **skills** (vendored
in `.claude/skills/` so they travel with the repo). Don't re-derive
these patterns; invoke the skill when its trigger matches.

| When | Skill |
|---|---|
| Starting any feature change | `feature-shipping-discipline` |
| Proposing UI / IA work | `binding-design-doc-discipline` |
| Designing any view (any platform) | `mobile-first-density-design` + `native-platform-first` |
| Adding a list / grid / sheet / shelf | `universal-feature-states` |
| Shipping a feature on ANY platform | `cross-platform-parity-discipline` |
| Planning a new platform, or sequencing the buildout | `multiplatform-expansion-method` |
| Designing/changing shared backend data the clients consume | `shared-data-plane-contract` |
| Deriving a shipped corpus from a messy source (facts, cards, entries) | `content-corpus-derivation` |
| Real-time multiplayer across native + web (local same-room or online) | `cross-platform-multiplayer` |
| A value that must be identical on every platform (daily pick, shuffle, hash) | `cross-platform-determinism` |
| Video/audio streaming from hosts you don't control | `resilient-media-streaming` |
| Sync, sign-in, favorites/progress across devices | `per-ecosystem-sync-islands` |
| Preparing any store submission (App Store, Mac App Store, Play, tvOS, Microsoft Store) | `store-submission-playbook` |
| Launching or debugging in-app purchases on any store (empty paywall, review starvation) | `store-submission-playbook` + `docs/store/IAP-RELEASE-CHOREOGRAPHY.md` |
| Building/signing/uploading an Apple build from CI (default) | `cloud-appstore-submission` |
| Publishing an Android build to Play from the CLI | `play-cli-submission` |
| Publishing a Windows MSIX to the Microsoft Store from CI | `windows-production-gotchas` + `docs/windows/WINDOWS-STORE-SUBMISSION.md` |
| Logging an architecture decision | `architectural-decision-log` |
| User pushback after 3+ iterations of "still broken" | `3d-feature-debug-loop` |
| Adding/editing ANY scheduled workflow, or debugging CI failures / lock contention / alert noise | `ci-fleet-engineering` |
| A fix that can't be verified from logs or a simulator (TV focus, playback, on-device behavior) | `device-observation-harness` |
| Expanding to Android TV / Fire TV / webOS / Tizen / Cast | `smart-tv-platform-expansion`, then `androidtv-compose-focus` / `smarttv-web-app` |
| Running an unattended multi-tick development loop | `autonomous-loop-cadence` |
| Building any algorithmic feed / discovery / "for you" surface or multi-source merge | `values-based-feed-ranking` |
| Reader mode, article extraction, or OG/link-preview cards from third-party pages | `web-content-extraction` |
| Adding an iOS share-sheet target (Share Extension) | `ios-share-extension` |

Platform-specific skill triggers:

- **iOS / iPadOS**: `ios-production-gotchas` FIRST when a symptom
  matches (presentation races, dark-mode legibility, layout blowups,
  background audio, wrong image in a recycled cell, a new `.swift`
  file that won't compile, "works on simulator") — it carries the
  cross-cutting lessons from four shipped apps. Share-sheet targets:
  `ios-share-extension`. Framework depth
  lives in the 80+ vendored Apple skills (swiftui-patterns,
  swiftui-navigation, swiftdata, ios-networking,
  swiftui-liquid-glass, app-intents, widgetkit, etc.).
- **macOS**: `macos-platform-patterns` BEFORE any Mac shell / player /
  hero / browse / window / document work. macOS shares the whole Apple
  Core, so the FEATURE set is free — but the shell is a pointer +
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
  ~3 core screens, bootstrap a project `docs/tvos-playbook.md` from
  the skill's reference file.
- **Android**: `android-production-gotchas` FIRST (data-version
  keying, the contradictory-WHERE empty-grid class, deep-link inbox,
  swap ritual). For framework depth, install the Android skill stack
  into `~/.claude/` (see README.md → "Adding the Android skill
  stack"), then `chrisbanes:<name>`, `rcosteira79:<name>`, etc.
- **Android TV / Fire TV**: `androidtv-compose-focus` — tv-material
  only, the runtime `UiModeManager` branch (never a fork), the focus
  contract, the Google TV quality gates, and the Fire TV zero-GMS
  flavor rule.
- **Smart-TV web (webOS / Tizen / Cast)**: `smarttv-web-app` — the
  additive `tv.js`/`tv.css` layer over the vanilla web app, the
  spatial-navigation engine, per-platform shims, `.ipk`/`.wgt`
  packaging from the one shared root. Vendor landscape + store
  process: `docs/TV-PLATFORMS.md`.
- **Windows (optional 6th platform)**: `windows-production-gotchas`
  FIRST — the CI-is-the-Windows-machine doctrine, headless-PNG
  observability, the visual-baseline gate, the platform-TFM and MSIX
  traps. The `windows/` scaffold is the as-shipped architecture
  (builds green out of the box); pipeline depth in `docs/windows/`.
- **Web**: `web-platform-patterns` is the umbrella — view system,
  URL state, service worker, IndexedDB, image fallback chains, CSS
  gotchas, headless verification. Third-party page content (reader
  mode, link previews): `web-content-extraction`. Design skills
  under `KUI:<name>`; `frontend-design` for component-level work.

---

## Debugging philosophy

**Do not iterate blindly on behavior you cannot observe.** When a
feature does not work correctly and the root cause is not
immediately clear from reading the code, the first move is
diagnostics — not another implementation attempt.

1. **Add observability before another implementation.** Write what
   you *expect* to see vs. what would *indicate* the bug.
2. **Isolate layers** — verify each independently before changing
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
   shipping — see `3d-feature-sim-validation`. On Android the
   analog is Compose `@Preview` + Roborazzi screenshot tests. On
   the web, execute the real JS in a Node DOM shim and
   pixel-measure screenshots — headless Chrome's virtual-time
   budget distorts timers and AbortSignal.
6. **Make diagnostics permanent but env-gated when the bug class
   recurs.** A flag like `APP_PLAYBACK_DIAG=1` that turns on
   structured log lines costs nothing when off and saves a full
   re-instrumentation next time. One-off diagnostics still get
   removed before declaring a fix complete.
7. **Drive the app to a known state for screenshots.** Env hooks
   like `APP_START_TAB` / `APP_START_ITEM` (no-ops in production)
   let `simctl launch` / `adb shell am start` open any screen
   directly — the backbone of both debugging and store-screenshot
   generation.

If user pushback returns after 3+ iterations of "still broken,"
that's the signal to invoke `3d-feature-debug-loop` and reset to
research-agent + observable-evidence discipline. Stop trying fixes;
start measuring.

**Simulator/emulator discipline:** boot ONE simulator or emulator
at a time — parallel-booting wedges both. The simulator is also
*lenient* in ways real hardware is not (tvOS lets Application
Support writes through; devices crash with EPERM) — anything that
touches the filesystem, entitlements, or sync needs a real-device
check before "done."

---

## What this app does

<!-- FILL IN: One paragraph on what your app does and who it's for -->

Available as a **web app**, a **native iOS/iPadOS app**, a **native
macOS app**, a **native Apple TV (tvOS) app**, and a **native Android
app** — five native experiences, one feature set. When adding to one
platform, note the equivalent work in SCRATCHPAD.md and update
PARITY.md.

**Feature parity, not design consistency.** Web feels like the web.
iOS feels like iOS. macOS feels like a Mac (pointer + keyboard + menu
bar + resizable windows). tvOS feels like the living room. Android
feels like Android. The verbs are identical; the idioms aren't.

Not every app needs all five. Decide the platform set in M0 and
record it in DECISIONS.md — tvOS earns its place when the content
is lean-back (video, music, ambient, photos); macOS earns its place
when the app wants a desktop-class or document/pro surface, and it's
the cheapest port (it shares the entire Apple Core). A skipped
platform is a 🚫 column in PARITY.md with a reason, not a deletion.

---

## Web app

**Stack**: Vanilla HTML/JS — no framework, no build step. Custom
CSS, mobile-first. <!-- FILL IN: API / auth / hosting choices -->.
GitHub Pages static hosting, branch `main`, root `/`.

**Key directories**:
- `/` — root: index.html, CLAUDE.md, SCRATCHPAD.md, DECISIONS.md
- `/css/styles.css` — single main stylesheet
- `/js/api.js`, `/js/app.js` — API abstraction + view system
- `/assets/` — static assets (shared with iOS + tvOS + Android)

**Run locally**: `python3 -m http.server 8080` → visit
http://localhost:8080. Deploy: push to `main`; GitHub Pages serves
automatically.

**Conventions** (the load-bearing ones — see skills for the rest):
- All API calls through `js/api.js` — never `fetch` directly
  elsewhere
- CSS custom properties in `:root` in `styles.css`
- Mobile-first; all media queries use `min-width`
- No inline styles
- Error states must be user-visible (not just console logs)
- **URL-driven state is the web's superpower** — every surface gets
  a shareable canonical URL; filters live in query params. The web
  app doubles as the canonical link target for shares from every
  native platform: every `appname://item/x` has an `https://…/item/x`
  twin (see DEEP_LINKS.md).

**Safari layout pitfall** (codified in the bundled CSS):
`body { height: 100dvh; display: flex; flex-direction: column;
overflow: hidden; }` with `main { flex: 1; overflow-y: auto;
min-height: 0; }`. NO `viewport-fit=cover`. NO `position: fixed`
overlays — they break Safari's compositor at the Dynamic Island.

**Modern web APIs to reach for first** (skip the npm dep / custom
fallback):
- `<dialog showModal>` for all modals — native focus trap + ESC
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

## Apple apps (iOS / iPadOS / macOS / tvOS) — one universal target

**Stack**: Swift 6, SwiftUI (`@Observable`, **iOS 26 / macOS 26 /
tvOS 26 baseline**), SwiftData for local persistence, Keychain for
credential storage, URLSession direct to API (no third-party
packages).

iOS 26 / tvOS 26 are the floor. Use the 26-era native APIs directly —
Liquid Glass, `Tab(role: .search)`, `TabView(.sidebarAdaptable)`,
`scrollEdgeEffectStyle`, `.matchedTransitionSource` +
`.navigationTransition(.zoom)` — without `@available` guards. Don't
write iOS 17/18 workarounds.

**One Xcode target serves iPhone, iPad, Mac, AND Apple TV** (Decision
013, amended by Decision 019). Shared logic lives in `Core/`;
per-platform UI lives in `iOS/`, `macOS/`, and `tvOS/` groups behind
`#if os(iOS)` / `#if os(macOS)` / `#if os(tvOS)` guards. Production
experience: ~60–70% of a media app's Swift is platform-agnostic
(models, networking, query layer, playback-queue logic, sync) — the
universal target makes that reuse real instead of aspirational, and
all three Apple platforms ride the same CloudKit private database for
free cross-device sync. macOS is the cheapest platform to add because
it reuses the entire Core. See `apple/README.md` for the exact Xcode
setup.

**Project structure** — Xcode Cloud compatible:

```
/                          ← repo root
├── AppName.xcodeproj/     ← at root (Xcode Cloud requirement)
├── AppName/
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
└── android/               ← Android module (sibling — different toolchain)
```

**Critical conventions** (from production lessons across five
shipped platforms — see the vendored skills for depth):

- **All API calls through a shared singleton** — never URLSession
  directly from views
- **Auth state owned by one manager** — views read via `@Environment`
- **Global nav state in `@Observable` store** with one
  `NavigationPath` per tab; ONE shared destination registry
  (`navigationDestination` declared in a single place all tabs
  apply) — never per-view destinations. This is what lets any
  surface push any screen from any tab.
- **Deep links / intents land in an inbox**, consumed by the root
  view once foregrounded — external entry points never mutate the
  router directly.
- **Version numbers via `AppVersion.xcconfig` only** — never edit
  through Xcode identity panel (creates per-target overrides)
- **No third-party Swift packages** — Apple frameworks only
- **URL routing via `.onOpenURL`** for both Universal Links and
  custom schemes — NOT `.onContinueUserActivity`
- **Refresh JWT before every Worker / Storage / Edge Function call**
  — auth SDK's auto-refresh only covers its own HTTP path
- **Core/ never imports per-platform UI.** When Core logic needs
  app state, define a protocol in Core and conform the app store to
  it — this is what keeps Core compiling for every os() target.
- **Never put a fill-mode image (`scaledToFill`) inside a
  `frame(maxWidth: .infinity)`** — the frame adopts the oversized
  cover dimensions and blows the layout (intermittently, because it
  depends on which artwork loads). Ambient/hero art goes in
  `.background` + `.clipped()`, which cannot influence layout.

### macOS-specific guardrails (read `macos-platform-patterns` first)

- **The player REPLACES the split view as the window root while
  playing** — never an `.overlay`/cover on the split view (its
  toolbar, sidebar toggle, and the previous view's title bleed
  through over the player).
- **macOS `AVPlayerItem` has NO `externalMetadata`.** Show the title
  via the window title bar, never an `AVMutableComposition`
  metadata-override — over a resilient custom-scheme asset it renders
  BLANK video (audio advances, no picture). Tried + reverted twice.
- **A resizable-window hero is full-width `.aspectRatio(16/9, .fit)`
  with NO `maxHeight` cap.** A fixed height crops as the window
  widens; a cap insets/centers ("doesn't extend across"). The same
  fill-image layout blowup as iOS applies — a sized shape owns
  layout, the image fills via `.background`.
- **Never bare `AsyncImage` for browse art.** Route through an
  `ImagePipeline` (decoded `NSCache` + one `URLSession` capped at
  `httpMaximumConnectionsPerHost = 6` + in-flight coalescing), and
  decode non-8-bit-RGB → sRGB once (`Image(nsImage:)`'s Metal path
  renders a grayscale/CMYK image as a solid white box).
- **Structured concurrency (`.task(id:)`), not Combine
  `Timer.publish`** for hero rotation / debounce — a timer can fire
  into a torn-down view and trip an executor fault.
- **Companion-app deep links via `NSWorkspace`** — NOT
  `UIApplication`; and NO `LSApplicationQueriesSchemes` Info.plist
  entry on macOS (that array is an iOS privacy restriction).
- **Guard next-OS-only symbols with `#if compiler(>=X.Y)`, not just
  `#available`** — a runtime `#available` check still needs the
  symbol in the BUILD SDK, so it won't compile on the GA toolchain.

### tvOS-specific guardrails (read `tvos-platform-patterns` first)

- **Never `buttonStyle(.plain)` on tvOS** — destroys focusability.
  Use `.borderless`, `.card`, or a custom `ButtonStyle`.
- **tvOS can only write to `Library/Caches`, `tmp`, and App Group
  containers** — Application Support writes crash on device (and
  pass on the simulator, so you won't see it until hardware).
  SwiftData's default store location crashes too: build the
  ModelContainer with an explicit App Group `ModelConfiguration`
  and fall back to in-memory so the app always launches.
- **Reset a tab's `NavigationPath` when the user leaves it via the
  sidebar** — otherwise tab state pollutes the next visit.
- **Initial-focus views (heroes, first-tab landings) claim focus
  exactly once** (a `hasClaimedInitialFocus` guard) — a bare
  `.task { focused = true }` re-fires when lazy views recycle and
  yanks focus back mid-browse.
- **SourceKit phantom errors are stale index, not real.** Trust
  `xcodebuild`, not editor squiggles. `@Query` macro views can
  cascade unrelated "Cannot find X in scope" errors across a file.

---

## Android app

**Stack**: Kotlin 2.1.21 + Jetpack Compose + Material 3 / **Material
3 Expressive**. `minSdk = 29` (Android 10), `targetSdk = 36`
(Android 16). Hilt + Ktor + Coil 3 + Navigation 3 + Room + DataStore.
No XML, no AppCompat, no legacy ActionBar — **Compose-only**.

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
│       │   ├── ui/AppRoot.kt
│       │   ├── ui/theme/{Theme.kt, Color.kt, Type.kt}
│       │   └── data/ApiClient.kt
│       └── res/
└── scripts/sync_shared_assets.sh         ← mirror /assets/ → app/src/main/assets/
```

**Critical conventions** (the load-bearing ones; ANDROID-DESIGN.md
and the Android skill stack carry the depth):

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
  singleton)** — Composables / ViewModels never use `HttpClient`
  or `OkHttpClient` directly.
- **Every Worker / Storage / Edge Function call calls
  `refreshIfNeeded()` first** — same rule as iOS, via an OkHttp
  interceptor on the shared client.
- **Stable keys on every `LazyColumn` / `LazyVerticalGrid`** —
  non-negotiable for large lists.
- **Tink-encrypted DataStore for secrets** — never
  SharedPreferences. EncryptedSharedPreferences is deprecated.
- **`edge-to-edge` mandatory** at `targetSdk >= 35`. Honor
  `WindowInsets` via `Scaffold`.
- **Predictive back gesture** must work. `BackHandler` only for
  unsaved-changes confirmation.
- **Adaptive layouts via `currentWindowAdaptiveInfo()`** — every
  screen declares compact / medium / expanded behavior.
- **Brand theme by default; dynamic color opt-in.**
- **Version bump on every ship** — `versionCode` + `versionName`
  in `app/build.gradle.kts` (same idiom as iOS xcconfig). Keep
  `versionName` in lockstep with the iOS marketing version.
- **Media playback = Media3/ExoPlayer + MediaSession** from day
  one — lock-screen controls are a parity row, not a polish item.
- **Release signing**: upload keystore lives in `~/keystores/`,
  credentials in `~/.gradle/gradle.properties` — NEVER in git.
- **Declare EVERY deep-link host/path you emit.** A share link or
  App Link route that isn't in the manifest's intent-filter fails
  silently for external opens — audit the manifest whenever a new
  URL shape ships.

---

## Windows app (optional 6th platform)

**Stack**: **Avalonia 12** + **FluentAvaloniaUI 3** + **.NET 10** (C#),
`CommunityToolkit.Mvvm` for MVVM, DPAPI for secrets. No WinUI, no WPF —
Avalonia-only, because `Avalonia.Headless` renders real Skia pixels
in-process on any OS, which is what makes the $0, no-Windows-hardware
pipeline real (Decision 029). Ships to the Microsoft Store as an MSIX
(Microsoft re-signs — no cert to manage) + a single-file `.exe` direct
channel.

The **`windows/` scaffold is the as-shipped architecture** of a
Store-certified app — adopt it per `windows/README.md`; don't re-derive
it. Four projects, and the shape is load-bearing: `AppName.Core`
(OS-agnostic C# port of the shared logic), `AppName.App` (Avalonia UI),
`AppName.HeadlessTests` (PNG snapshots + the visual-baseline gate +
golden vectors), `AppName.Windows` (the ONLY `net10.0-windows` TFM —
content-free WinRT edge, loaded reflectively; the TFM on the app project
kills every MSIX publish with MSB4062).

**The loop is CI, not a local desktop**: iterate on the Mac head
(`dotnet test` → `Read` the PNGs), gate on `windows-latest`
(`gh workflow run windows-repl.yml`, ~2–4 min). "Renders on the Mac" is
never "correct on Windows". Critical conventions (depth in
`windows-production-gotchas` + `docs/windows/WINDOWS-PLAYBOOK.md`):

- **FluentAvalonia components first** (`FANavigationView` shell,
  `FAContentDialog`, `SettingsExpander`) before any custom control —
  note the `FA` prefix in v3.
- **Compiled bindings on** + `x:DataType` on every view — a binding
  typo is a build error, not a silent blank. Views are parameterless.
- **The six-level type ramp + `Border.card` live once in `App.axaml`**;
  pin the brand accent (Fluent's dark-theme derivation washes it out).
- **All network calls through the shared Core client** — never a raw
  `HttpClient` from a view/VM.
- **Secrets are DPAPI-protected**, never cleartext on disk.
- **Pure function + thin Windows-guarded edge** for all Win32/WinRT work
  (`Win32HostInterop`, the reflective store gateway) — this is what
  keeps it testable off Windows.
- **Version bump on every ship** — `<Version>` in the csproj +
  AppxManifest, stamped by `tools/stamp_msix_version.py` from
  `AppVersion.xcconfig` (the Store reserves the 4th segment).
- **Ship**: `gh workflow run windows-store.yml -f submit=true
  -f commit=true` — anything less succeeds while shipping nothing. See
  `docs/windows/WINDOWS-STORE-SUBMISSION.md` for the bootstrap and the
  silent stalls.

---

## Shared design system

**Design tokens** — keep these in lockstep across web / Apple / Android /
Windows (the three Apple platforms share one `Design.swift` in Core):

| Token | Web | Apple (iOS/macOS/tvOS Core) | Android | Windows |
|---|---|---|---|---|
| Primary | `--color-primary` in `:root` | `Color.primary` in `Design.swift` | `BrandPrimary` in `ui/theme/Color.kt` | `BrandPrimary` in `App.axaml` (+ the pinned `.accent` styles) |
| Surface | `--color-surface` | `Color.surface` | `BrandSurface` | `BrandSurface` / `Border.card` |

<!-- FILL IN your palette. Two systems, kept distinct:
     - Brand (UI chrome only): primary CTA, accent, background, surface
     - Semantic (content only): success / warning / error + domain-specific

     The split is binding — never use a brand color for content meaning,
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
| L4 Body | `.body` | `.body` | `.body` (29pt — the 10-ft floor) | `bodyMedium` | `.body` |
| L5 Caption | `.caption` | `.caption` | `.caption1` (25pt) | `labelMedium` | `.caption` |
| L6 Tabular | `.tabular` | `.body.monospacedDigit()` | same | `bodySmall` w/ tabular | `.tabular` |

macOS shares the iOS `Font.TextStyle` ramp (same Core `Design.swift`).
tvOS uses the same six levels but its own larger ramp — system tokens
only, never hardcoded sizes. 29pt is the body floor at ten feet;
Dynamic Type does not exist on tvOS.

**Density rule**: density comes from removing chrome, not adding
decoration. Test at 375px before 1440px. On tvOS the analogue is
**focus does the work** — the focused card is the chrome; surrounding
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
system — SF Symbols on Apple, Material Symbols on Android, inline SVG on
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
Play on Detail; iOS never steals focus), say so in the doc — that
inversion is load-bearing, and a future session will otherwise
"harmonize" it into a bug.

Don't create these on day 1 — wait until the platform's UI
complexity warrants the doc. Once created, treat as binding.

---

## Cross-platform feature parity

**Single source of truth: `PARITY.md`.** Every user-facing feature
gets a row showing web / iOS / macOS / tvOS / Android status with a
Notes column for deltas. The `cross-platform-parity-discipline` skill
carries the full workflow, including the **periodic parity audit**
(walk every shipped feature and ask "is this row in the matrix,
and is every cell honest?") — audits catch silently-false cells
that day-to-day updates miss.

When shipping a feature on one platform, mirror it on the other
platforms in the same change set where feasible. The parity rule
is **same verb, native idiom**.

---

## Shared data plane (if your app has one)

If multiple clients consume the same content/data (a catalog, a
feed, a corpus), build it ONCE as a published data plane and make
every client a consumer — no client re-implements the pipeline,
re-derives flags, or re-hosts the data. Author
`docs/DATA-CONTRACT.md` from
`docs/templates/DATA-CONTRACT-template.md` the moment the second
client exists. The `shared-data-plane-contract` skill carries the
full pattern (publishing, CORS/Range realities for the browser,
ETag refresh, additive evolution, merge-guarded mutations).

**Cross-platform determinism.** Any value that must come out identical
on every platform — a "daily" pick, a shared shuffle, a match plan, a
hash key — is produced by ONE algorithm mirrored in each language and
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

Three binding docs govern everything unattended; their skills fire on
the triggers above. Read the doc before re-deriving the pattern.

- **`docs/CI-FLEET.md`** — the workflow doctrine: a green run must
  have done something, a red run must mean something, and no run may
  destroy work. Compute/apply lock split, budgets that PUBLISH,
  guarded restores/publishes, the self-healing sweeper, the health
  auditor, and "a red X is reserved for broken" (a backstop timeout
  whose work still published is a warning, never a failure email).
  Enable `workflow-health.yml` + `retry-infra-failures.yml` once the
  repo grows scheduled workflows; start any new writer from
  `docs/templates/split-writer-workflow-template.yml`.
- **`docs/AUTONOMOUS-LOOPS.md`** — the loop discipline: the agent is
  never the tester; ship only on external observation; verified vs
  merely-fixed is a load-bearing distinction in every session log;
  DECISIONS.md stays context-sized (index + recent entries, older
  entries archived VERBATIM under `docs/decisions/`, roll at ~120 KB).
- **`docs/MEDIA-PLAYBACK.md`** — for MEDIA apps only: the streaming +
  captions doctrine (loader invariants, the custom-loader/native-feature
  conflict list, HLS shapes, live captions, subtitle judging).
- **`docs/PROVENANCE.md`** — the coverage map. When you learn something
  template-worthy in an app repo, upstream the generic form HERE in the
  same session and update the map — app-local docs are where lessons go
  to be lost.
- **`docs/DEVICE-HARNESSES.md`** — the per-platform observation
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
non-obvious choice** ("yes, exactly that"), save it too — quiet
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
any shared file, re-build every platform that consumes it** — the
tvOS build going green after an iOS change is part of "done."

**Capture the ratchet.** When a recurring failure mode surfaces,
the fix lands in DECISIONS.md or a memory — not just in the
immediate code. The lesson is the deliverable.

**Session log discipline.** SCRATCHPAD.md's session log is
append-only: state found → work done → state left. A scratchpad
that drifts behind the code is worse than no scratchpad — when you
discover drift, fix the Current State section first, then work.

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
  is non-obvious — a hidden constraint, a subtle invariant, a
  workaround for a specific bug.
- **No emojis in code or commits** unless explicitly requested.
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
automation doctrine, `docs/TV-PLATFORMS.md` for the smart-TV store
landscape, and `docs/windows/` for the optional Windows platform.
