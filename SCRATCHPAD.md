# Project Scratchpad — [APP NAME]

> Active working notes. When this file exceeds ~150 lines, move
> completed milestone detail to ARCHIVE.md and keep this lean.
>
> See `PARITY.md` for the cross-platform feature matrix (single
> source of truth — don't duplicate rows here).
>
> The Current State block below is injected at every session start.
> If it drifts behind the code, fix it FIRST, then work — a stale
> scratchpad is worse than none.

## Current state

- **Status**: NOT STARTED
- **Active milestone**: M0
- **Last session**: —
- **Next actions**:
  1. Decide the platform set (all five? skip tvOS?) → DECISIONS.md
  2. Fill in CLAUDE.md project identity sections
  3. Create the universal Xcode project at repo root (no spaces in
     name; iPhone + iPad + Mac + Apple TV destinations — see
     apple/README.md)
  4. Open `android/` in Android Studio, rename `com.example.appname`
  5. Enable GitHub Pages on main branch (+ `.nojekyll` if serving
     `/.well-known/`)
  6. Drop verification files in `/.well-known/` once the
     `appID` / `package_name` / fingerprints are known
- **Open questions**: —

---

## Milestones

### M0 — Project setup

- [ ] Platform set decided + logged in DECISIONS.md
- [ ] CLAUDE.md filled in with project identity (app name, what it
      does, tech-stack specifics, design tokens)
- [ ] PARITY.md skeleton sections filled in with intended verbs
- [ ] **Web** — `index.html`, `css/styles.css`, `js/app.js` first
      render; GitHub Pages enabled
- [ ] **Apple (universal)** — Xcode project created at repo root
      (no spaces); iPhone + iPad + Mac + Apple TV destinations on ONE
      target; `apple/` files moved into the Xcode group preserving
      the Core / iOS / macOS / tvOS split; `AppVersion.xcconfig`
      referenced by both Debug + Release configs; empty shell runs on
      the iOS, macOS, and tvOS destinations
- [ ] **Android** — `android/` opened in Android Studio; package
      renamed from `com.example.appname` to your reverse-DNS;
      `:app:assembleDebug` succeeds; smoke-test on emulator
- [ ] **CI / submission** — `appstore-build.yml` cloud workflow (one
      covers iOS + macOS + tvOS) with the 7 signing secrets seeded
      (see `docs/CLOUD-SUBMISSION.md`); GH Actions `android-build.yml`
      + `tools/submit-play.sh` for Play
- [ ] First commit pushed

### M1 — [First user-visible capability]

<!-- One sentence: what can a user DO after this milestone? -->

Before implementing, run the `learning-orientation-design` skill:

- [ ] Deepens understanding
- [ ] Invites participation
- [ ] Supports agency
- [ ] Clarity over cleverness

**Acceptance criteria** (observable by users, not developers):

- [ ] Web: …
- [ ] iOS: …
- [ ] tvOS: …
- [ ] Android: …

**Parity check**: update PARITY.md row(s) for this capability in
the same change set. Reject the PR if PARITY.md is silent.

### M2 — [Second user-visible capability]

- Learning-orientation check passed
- **Acceptance**:
  - [ ] Web: …
  - [ ] iOS: …
  - [ ] tvOS: …
  - [ ] Android: …

---

## When to add a binding design doc

When a platform crosses ~5 views OR you find yourself making
inconsistent UI choices, create that platform's binding doc —
`tvOS-DESIGN.md`, `iOS-DESIGN.md`, `macOS-DESIGN.md`, `WEB-DESIGN.md`,
`ANDROID-DESIGN.md` — seeded from the matching per-platform template
in `docs/templates/` (start from `PLATFORM-DESIGN-template.md`, the
index). Invoke
`binding-design-doc-discipline` for the workflow. Treat as binding
from the moment it exists.

The sibling docs share a shape: the **principles** are identical;
the **idioms** they reference diverge per platform. Deliberate
rule inversions between platforms (tvOS auto-focuses Play; iOS
never steals focus) are stated explicitly so they don't get
"harmonized" away.

---

## Open questions

<!-- Add questions as they arise; remove when resolved. Don't
     accumulate — every question should have a path to resolution. -->

---

## Out of scope (intentionally)

Document explicitly-rejected ideas so future sessions don't
re-litigate them. "We thought about this and chose not to design it
now" is far more useful than silently re-arriving at the same answer.

When a request gets declined, write a row. Format:
`**Idea** — Why declined. Revisit when …` (revisit condition lets
the entry retire when circumstances change).

| Idea | Why declined | Revisit when |
|---|---|---|
| <!-- e.g. Web push notifications | Too-inconsistent UX across browsers; APNs/FCM cover the need on mobile | iOS + Android push ship and a real cross-platform request appears --> | | |

---

## Session log

<!-- Append-only. Format: state found → work done → state left.
     Keep entries short — one paragraph per session. -->

**2026-08-24 — Windows scaffold + Tidbits lessons ported.** Found: sixth-gen
template with docs/windows/ present but no `windows/` source scaffold, a
WINDOWS-STORE-SUBMISSION.md that was an unadapted Tidbits copy (real Store
IDs), a playbook describing a pre-ship layout, and no vendored Windows skill.
Done: committed the `windows/` scaffold (AppName.Core / .App / .HeadlessTests /
.Windows — the as-shipped Tidbits architecture with every version gotcha
pre-solved; builds clean, 11 headless tests pass, shell PNGs verified light +
dark at 1180×760 and the 900×680 floor, versions stamped from
AppVersion.xcconfig); generalized WINDOWS-STORE-SUBMISSION.md (placeholders +
§0 checklist, all 12 gotchas + IAP §7 kept); rewrote WINDOWS-PLAYBOOK.md to the
as-built flat layout (.NET 10, TFM-isolation, DPAPI, narrow-width shell
renders, network-race flag); added the `windows-production-gotchas` skill;
added a `## Windows app` CLAUDE.md section + Windows columns in both design
tables; appended DECISIONS 035–039 (anonymous-account deletion, query-not-load,
generator merge guards, randomness-outside-selection, per-store billing
shapes); README tree/step-12 + CONTRIBUTING now name the scaffold. Left: green;
Store assets (7 PNGs) intentionally not generated (per-app branding);
first-Windows-run baselines armed via `-f update_baselines=true` as documented.

**2026-08-24 (second pass) — parity + store-approval robustness.** Found: the
scaffold wave left three lesson families unported — multi-store IAP release
choreography, Play pre-launch/publish traps, and the parity-audit method
lessons. Done: new `docs/store/IAP-RELEASE-CHOREOGRAPHY.md` (financial
paperwork as owner-only critical path, one-review-submission-per-IAP-product /
ship serially, the Ready-to-Submit trap, per-platform License Agreement,
empty-success vs thrown-error, per-store query shapes, real-provisioning-only
purchase verification, the launch-order checklist); store-submission-playbook
gained the IAP section + the internal-track-has-no-pre-launch-report /
Test-Lab-yourself / refused-to-auto-submit / all-or-nothing-submit bullets;
play-cli-submission gained Rules 7–8 (Console stalls, testlab-android.sh);
cross-platform-parity-discipline gained the degenerate-outcome audit pass
(tie/zero/empty/cold-quit), the both-directions stale-⏳ check (false docs vs
false cells), and the failure-class organization for whole-platform-port
audits; tvos-platform-patterns gained the SignInWithAppleButton-in-Form
swallowed-click gotcha; CLAUDE.md table + README tree point at the new doc.
Left: green.
