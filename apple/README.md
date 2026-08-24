# apple/ — Swift starter for the universal Apple target

One Xcode target builds **iPhone, iPad, Mac, and Apple TV**
(Decision 013, amended by Decision 019). This directory holds the
starter files; they move into the Xcode-created group during setup
and this directory is then deleted.

## Layout (preserve this split inside Xcode)

```
apple/
├── App/                 ← entry point; #if os branches live here
│   └── AppNameApp.swift
├── Core/                ← compiles for EVERY os() destination
│   ├── Models/          ← data models (platform-agnostic)
│   ├── Networking/      ← APIClient singleton
│   └── Store/           ← @Observable global state
├── iOS/                 ← iPhone/iPad views — #if os(iOS)
│   ├── ContentView_iOS.swift
│   ├── Views/
│   └── Components/
├── macOS/               ← Mac views — #if os(macOS)
│   └── ContentView_macOS.swift
├── tvOS/                ← Apple TV views — #if os(tvOS)
│   └── ContentView_tvOS.swift
├── Assets.xcassets/     ← iOS icon; tvOS needs its OWN brandassets (below)
├── Resources/Fonts/
└── Tests/
```

**The Core rule**: `Core/` never imports per-platform UI and never
contains an `#if os` that selects UI behavior. When Core logic needs
something from the app layer, define a protocol in Core and conform
the app store to it. This single rule is what keeps ~60–70% of the
codebase shared instead of copy-drifting.

**File-suffix convention**: per-platform files end `_iOS.swift` /
`_macOS.swift` / `_tvOS.swift` and wrap their contents in `#if
os(iOS)` / `#if os(macOS)` / `#if os(tvOS)`. All three view trees can
then live in the same target without exclusion lists. `RootView` (in
`AppNameApp.swift`) branches EXPLICITLY per platform — a bare `#else`
silently hands a new platform the iOS view.

## Creating the Xcode project (once, at M0)

1. Xcode → File → New → Project → **Multiplatform → App**.
2. Product Name: `AppName` — **no spaces** (Xcode Cloud requirement).
3. Save to the **repo root** (not a subdirectory). `.xcodeproj` at
   root is what makes Xcode Cloud auto-discovery work.
4. In the target's **General → Supported Destinations**, confirm
   iPhone + iPad and **add Mac and Apple TV** (remove Vision unless
   you want it). Mac = "Mac (Designed for iPad)" is NOT what you
   want — pick native **Mac**, then build the `macOS/` view tree.
5. Drag the `apple/` subfolders into the Xcode group for the app,
   preserving the `Core/` / `iOS/` / `macOS/` / `tvOS/` split. Delete
   `apple/` when done.
6. Project → Info → Configurations: set `AppVersion.xcconfig` (repo
   root) on both Debug and Release. From now on, version numbers are
   edited ONLY in that file (Decision 003).
7. Build ALL THREE Apple destinations before the first commit:
   `xcodebuild build -scheme AppName -destination 'platform=iOS Simulator,name=iPhone 17 Pro'`,
   `-destination 'platform=macOS'`,
   and `-destination 'platform=tvOS Simulator,name=Apple TV 4K (3rd generation)'`.
   From now on, any change to a `Core/` file means re-building all
   three.

If you're skipping a platform (Decision 014), still keep the full
`Core/` / `iOS/` / `macOS/` / `tvOS/` split — it costs nothing now
and is the door left open. macOS in particular is nearly free to add
later since it reuses the whole Core.

## tvOS specifics the iOS docs won't tell you

- **App icon**: tvOS uses a **layered imagestack** ("App Icon & Top
  Shelf Image" brandassets), not a flat PNG. Layers are LANDSCAPE
  (400×240 / 800×480 / 1280×768 @1x/@2x) — square renders fail
  actool only on CLEAN builds, so verify with a from-scratch build.
  See `branding/README.md`.
- **Persistence**: only `Library/Caches`, `tmp`, and App Group
  containers are writable on device — the simulator is lenient and
  will not catch violations (Decision 017). Build your
  ModelContainer with an App Group `ModelConfiguration` + fallback
  chain (see `AppNameApp.swift`).
- **Focus**: read the `tvos-platform-patterns` skill before writing
  any tvOS view. `ContentView_tvOS.swift` is a focus-correct
  starting shape.
- **Top Shelf** (later): a second target (`TVTopShelfContentProvider`
  extension) reading a snapshot JSON from the App Group that the
  main app refreshes via `BGAppRefreshTask`.

## macOS specifics the iOS docs won't tell you

Read the `macos-platform-patterns` skill before writing any Mac view;
`ContentView_macOS.swift` is a correct starting shape.

- **Shell** = `NavigationSplitView` (a sidebar `Section` enum + ONE
  `NavigationPath` → a single detail column), NOT the iOS per-tab
  stack. Menu-bar `.commands` for a keyboard-first scheme.
- **Player** replaces the window root while playing (not an overlay).
  macOS `AVPlayerItem` has NO `externalMetadata` — show the title via
  the window title bar; NEVER an `AVMutableComposition`
  metadata-override (it blanks video over a resilient asset).
- **Hero** = full-width `.aspectRatio(16/9, .fit)` with NO `maxHeight`
  cap (a resizable window crops with a fixed height and insets with a
  cap). The same fill-image layout blowup as iOS applies.
- **Images**: never bare `AsyncImage` — route through an
  `ImagePipeline` (decoded `NSCache` + one capped `URLSession`);
  decode non-8-bit-RGB → sRGB (Metal renders grayscale as white).
- **App Store**: App Sandbox (with only the scopes you use) +
  Hardened Runtime + `AppIcon.icns` + `PrivacyInfo.xcprivacy` +
  `LSApplicationCategoryType`. A sandboxed mic feature needs the
  `device.microphone` + `device.audio-input` entitlements AND the
  usage string, or TCC silently denies.
- **Deep links to companion apps**: `NSWorkspace`, not
  `UIApplication`; no `LSApplicationQueriesSchemes` entry on macOS.

## Versioning

`AppVersion.xcconfig` defines `MARKETING_VERSION` +
`CURRENT_PROJECT_VERSION` for every Apple target (app + any
extensions). Never edit versions through Xcode's identity panel —
it writes per-target overrides into project.pbxproj that shadow the
xcconfig and the targets drift (Decision 003).
