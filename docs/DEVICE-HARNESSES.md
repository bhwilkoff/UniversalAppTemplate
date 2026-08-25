# Device Observation Harnesses — verifying on the glass, not in the logs

The standing rule (see `docs/AUTONOMOUS-LOOPS.md` §1): **the agent is never the
tester, and the app's own reports are diagnosis, never verdict.** This doc
catalogs the harness patterns that make that rule executable per platform, each
extracted from a real campaign where self-reported "verified" shipped broken.
The portable tools live in `tools/`; adapt the env-configurable bits
(bundle id, package/activity, device UDID) per app.

## Instrument honesty — rules that apply to every harness

- **An instrument must say when it is blind.** `tools/atv_see.sh` refuses to
  return a frame OCR cannot read (byte-size floor on the PNG) — because 12
  consecutive sweep steps once "passed" on 108 KB black screens from a slept
  device. A null result from a blind instrument is indistinguishable from a
  real absence.
- **An instrument must never perturb what it measures.** An audio watchdog
  that revived its dead tap by replacing the playing item's audioMix
  *manufactured* the ten-second dropouts it then reported, forever. Attach
  once; log "blind past this point" instead of re-attaching. Screenshot
  capture itself induced memory pressure that suspended the app under test —
  verify app behavior with console-attached launches, use capture runs for
  glass evidence, and treat harness-induced deaths as harness artifacts until
  a crash report names the app.
- **A verification run identifies its own configuration** (build number,
  flags, binary version) — or you will one day validate the old binary.
- **Captures go to a durable path**, never `/tmp` — "a capture you cannot
  return to is a capture you have to take twice" (Tidbits, after losing 47).
- **Reach screens by deep-link route, never by counting key presses** —
  navigation drift turns a harness into a flake generator. Debug env hooks
  (`APP_START_TAB` / `APP_START_ITEM`, no-ops in production) exist for this.

## Apple TV — the paired-device loop + scenario runner

The Apple TV is the platform where blind iteration is most expensive: no
attached debugger in the living room, and the console is unreadable from the
dev machine unless the device is PAIRED.

- **The fast loop**: `xcrun devicectl` install + `launch --console` on a
  paired device, with env-gated diagnostic hooks (`*_DIAG=1` trace lines)
  turns minute-long build-install-trace cycles into a readable oracle. This
  loop solved in one afternoon what three ASC round-trips could not.
- **The scenario runner** (`tools/atv_scenario.py` + `tools/ScreenOCR/`):
  launches a real title on the device, screenshots the GLASS, OCRs the
  caption/UI region with Vision, pulls the app's diagnostic file, and grades
  explicit assertions (app alive, playhead advances, no stalls, on-glass text
  matches the source file). Six scenario rounds produced five coordinated
  fixes that log-reading had mis-ordered for days. **No change to the
  observed subsystem ships without a passing scenario report.**
- **Ship gates run under ADVERSE conditions**: Release configuration AND a
  throttled network (`tools/throttled_range_server.py`, token-bucket ~10
  Mbps) — every fix validated only on Debug + fast network missed the
  failures that needed slow links to appear. Python's stock `http.server`
  ignores Range and silently feeds players garbage; use the tool.
- **Control experiments beat correlation**: `AW_URL_OVERRIDE`-style hooks let
  the same content play from localhost, exonerating file/network/server in
  one run. When a symptom survives three targeted fixes, stop fixing and
  build the control that halves the hypothesis space.
- Device facts: installs work while the TV sleeps, launches don't ("System is
  asleep" — wake needs the Companion protocol via pyatv, not devicectl);
  `devicectl device capture screenshot` works at full resolution; reboot the
  device between long harness sessions.

## Android TV / Fire TV — focus is invisible to screenshots

A screenshot shows a rendered screen; it cannot show that the screen is
unreachable by D-pad — and `.clickable` compiles fine while being
D-pad-invisible. The harness answers where navigation LANDS:

- `tools/verify_tv_focus.sh` — drives real surfaces over adb with real remote
  keycodes and asserts focus lands on real content (identity focus traces on
  TV-native screens; the accessibility tree for shared phone screens that
  carry no trace).
- `tools/tv_screenshots.sh` — store screenshots from a booted TV emulator,
  dimensions VERIFIED with a real PNG parse rather than assumed.
- `tools/audit_fire_tv_gms.py` — asserts the Amazon flavor carries zero
  Google Play Services, **with a negative control** (the audit must fail if
  Cast is deleted from both flavors — an audit that cannot fail is not an
  audit). `tools/audit_tv_g6.py` — 64-bit + 16 KB page-size compliance.

## Web TV (webOS / Tizen) — test the real engine, not a shim of it

- `tools/test_tv_focus.mjs` — runs the REAL spatial-navigation engine inside
  a minimal hand-written Node DOM shim. Headless Chrome's virtual time
  distorts timers/AbortSignal; a shim you wrote measures only what you built.
- `tools/tv_browser_tests.js` (see Archive Watch) — the real-Chrome suite for
  what a shim can't prove: computed CSS, layout geometry, `<dialog>`
  semantics, real media elements. It publishes progress per assertion and
  time-boxes the player block so an autoplay-blocked tab reports a named
  failure instead of hanging.
- `tools/test_packaged_origin.mjs` — guards the `file://` packaged-origin
  bug (`new URL('.', location.href)`) that ships an EMPTY app to every LG and
  Samsung TV while working perfectly from any http server.
- `tools/test_tv_ua.mjs` — asserts platform detection per vendor UA string.

## iOS / iPadOS / tvOS simulators — the QA sweep

Tidbits' `tools/qa-sweep.sh` pattern: drive ~47 captures per platform via
debug env hooks, detect crashes by checking the pid simctl returned, log
findings in a rounds table, store captures durably. Keep the QA sweep SEPARATE
from the store-screenshot script — QA draws real data; store capture enforces
its own rules (refuses to run with a premium flag set).

Simulator honesty: the simulator is leniently WRONG about filesystem
writability, entitlements, sync, AirPlay routes, speech models, and Play
Billing (Android emulators likewise — Decision: an Android release is not
verified until Robo has run on PHYSICAL Test Lab devices,
`tools/testlab-android.sh`). Boot ONE simulator at a time.

## Windows — headless CI is the Windows machine

There is no free Windows box and none is needed: Avalonia.Headless renders
real Skia pixels in-process on `windows-latest`, with visual baselines
captured ON Windows and enforced only there. The full doctrine:
`docs/windows/WINDOWS-PLAYBOOK.md`. Pixel-comparison trap: normalize both
images through ONE decode path — captured frames are RGBA, PNG-decoded files
BGRA, and comparing them directly reports identical images as differing only
where they are colored.

## Compile-the-shipped-file Swift harnesses

For Apple-framework behavior no simulator can prove (AVFoundation asset
shapes, HLS loading, rotation logic that must survive process restarts),
write a standalone `swiftc`-compiled harness that COMPILES THE SHIPPED
SOURCE FILE plus a small main — not a mock of it — and exercises it against
real frameworks and real network. Archive Watch ran ~22 of these
(`test_local_subtitle_loader.swift`, `test_airplay_routing.swift`,
`test_topshelf_rotation.swift`, …); they caught, among others: a `file://`
HLS master that never plays (empty error log, zero access events — only a
real AVPlayer shows it), a Top Shelf rotation window that could render a
shelf of filler while every assertion passed (fixed by asserting a marquee
row per window), and negative controls that would have passed with the
feature deleted. Keep pure logic in Foundation-only files precisely so a
harness can compile them. Two rules: the harness runs the SHIPPED file (a
re-implementation verifies nothing), and platform-behavior probes run ONE
SHAPE PER PROCESS — state leaks between probes attributed one shape's
result to another and cost three shipped "fixes."

## In-app self-audit

For surfaces no external instrument can reach cheaply, ship an env-gated
in-app audit (Archive Watch's `FunctionalAudit`, `AW_UI_AUDIT=1` → 44/44
assertions on-device): the app walks its own screens and asserts each query
returns rows, each button routes somewhere, each filter changes results.
Pair it with a Mac-side CLI twin that runs the same shared-code checks
against the live published data, so audit progress never blocks on the
device being awake. Two audit patterns it exists to catch: **create paths
without their inverse** (create-channel with no delete) and **parity that
never returned to the platform it started on**.

## Apple TV depth-audit patterns (Tidbits campaign, 2026-08-24)

Beyond once-per-feature scenarios, the patterns that found real bugs at scale
(`tools/atv_run.py` is the hardened runner — verified wake, anti-doze,
foreground guard, capture-timeout tolerance, crash-proof reports, per-scenario
`drop_env`, a `--luma` image gate; `tools/atv_report.py` tabulates a day):

- **Verified wake, always**: launches are DENIED while the device dozes
  ("System is asleep — foreground app launch forbidden") or come up
  BACKGROUNDED — app alive, home screen on the glass, mimicking an app bug.
  Poll the Companion power state to On; re-wake before every retry; OCR one
  post-launch probe frame for home-screen signatures and relaunch if seen.
  A whole "category is broken" finding dissolved into this.
- **Content-region luma gate**: OCR cannot see a missing IMAGE. Emit
  luminance stddev over the content band from the OCR tool; a flat region
  where a photo belongs fails the scenario. Drive N date-seeded random rows
  through the real loader on-device — once-per-feature proves the code path,
  the random batches prove arbitrary CONTENT.
- **Tail-match legibility audits**: render the corpus's LONGEST prompts /
  options / explanations solo (a forced-question debug hook) and assert the
  text's TAIL reaches the glass. Char-count static audits cannot see
  truncation; the tail is the truncation tell.
- **Press-storm walks**: directional storms + select/menu on every surface,
  asserting the app stays alive ON that surface and back dismisses correctly.
  A screenshot cannot show a focus strand; a storm makes it fail loudly.
- **Liveness audits obey the marker rules**: 429/5xx report UNVERIFIED
  (distinct exit code), never dead — the first corpus-image sweep called
  3,333 rate-limited URLs "dead". Politeness (few workers, long backoff) and
  content-type checks (an HTML error page 200s); repair through the
  generator's merge guard + tombstones, never by editing shipped output.
- **Word-bound content-facing regexes**: a forbid pattern of `Error` matched
  inside the word "terrorists" in a question prompt and failed a healthy run.
- **Chunk long background work** (~≤8 min per task) and write every result
  durably as you go: harness reapers, network throttles, and sleep timers
  all lose less when each slice lands its own file.
- **Reboot the device between long harness days**: the 4K screenshot daemon
  degrades after ~80 captures-runs (timeouts, then thin frames).
