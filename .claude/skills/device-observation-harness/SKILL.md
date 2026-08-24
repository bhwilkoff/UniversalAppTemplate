---
name: device-observation-harness
description: Use when a fix cannot be verified by reading the app's own logs or a simulator - tvOS/Apple TV behavior, D-pad focus on Android TV / Fire TV, web-TV on webOS/Tizen, playback/caption sync, or any bug the user keeps reporting as "still broken" after fixes that looked verified. Carries the external-observation doctrine: the agent is never the tester, screenshots+OCR of the actual glass, instrument honesty (an instrument says when it is blind and never perturbs what it measures), adverse-condition ship gates (Release build + throttled network), control experiments over correlation, and the per-platform harness catalog. Triggers on Apple TV, devicectl, paired device, focus unreachable, OCR, screenshot verification, "works in the simulator", stall, on-device, adb keyevent, scenario runner, throttled.
---

# Device Observation Harness

Full catalog and per-platform recipes: `docs/DEVICE-HARNESSES.md`. Doctrine
context: `docs/AUTONOMOUS-LOOPS.md` §1–2.

## The rule

A change to behavior you cannot directly observe ships only on evidence from
an instrument that does not share the app's assumptions — screen OCR, tap
audio metering, a re-downloaded artifact, the store console. Builds that
"verified" themselves on circular self-reports shipped broken sixteen times
in a row before this rule existed.

## Reach for the right harness

- **Apple TV**: pair the device; `devicectl` install + `launch --console`
  with env-gated diag hooks is a minutes-long loop. For verdicts, the
  scenario runner (`tools/atv_scenario.py` + `tools/ScreenOCR/`) screenshots
  the glass, OCRs it, pulls the diag file, grades assertions.
  `tools/atv_see.sh` refuses frames OCR can't read. Installs work while the
  TV sleeps; launches don't (wake = pyatv Companion, not devicectl).
- **Android TV / Fire TV**: `tools/verify_tv_focus.sh` (where does D-pad
  focus LAND — screenshots can't show reachability; `.clickable` compiles
  fine while D-pad-invisible), `tools/tv_screenshots.sh`,
  `tools/audit_fire_tv_gms.py` (with its negative control),
  `tools/audit_tv_g6.py`. Physical Test Lab devices via
  `tools/testlab-android.sh` — emulators cannot see Play Billing/Integrity.
- **Web TV**: `tools/test_tv_focus.mjs` (real engine, hand-written DOM shim —
  headless Chrome's virtual time lies), `tools/test_packaged_origin.mjs`
  (the file:// packaged-origin bug), `tools/test_tv_ua.mjs`.
- **Playback/network**: `tools/throttled_range_server.py` — ship gates run on
  Release builds at ~10 Mbps; stock `http.server` ignores Range and feeds
  players garbage. URL-override env hooks make localhost the control arm.
- **Simulator sweeps**: `tools/qa-sweep.sh` pattern — deep-link env hooks,
  crash detection by pid, durable capture paths, findings in a rounds table.

## Instrument honesty (non-negotiable)

Say when blind; never perturb the measured system; identify your own build/
config in every run; repeat trials for nondeterministic faults; when a
symptom survives three fixes, stop fixing and build the control experiment.
