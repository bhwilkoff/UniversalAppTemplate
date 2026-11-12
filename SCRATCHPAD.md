# Project Scratchpad: [APP NAME]

> Active working notes, loaded into every session, so keep it small.
> Keep only the two most recent session-log entries; roll older ones
> word for word into `docs/SESSION-LOG.md` (create it on the first roll).
>
> See `PARITY.md` for the cross-platform feature matrix (the single
> source of truth; don't duplicate rows here).
>
> The Current State block below is injected at every session start.
> If it drifts behind the code, fix it FIRST, then work. A stale
> scratchpad is worse than none.

## Current state

- **Status**: NOT STARTED. This is a fresh copy of the template.
- **Active milestone**: M0
- **Last session**: none yet
- **Next actions**:
  1. If the app is not live yet, finish `docs/path/setup.md` with the
     owner: put the web app's name on it, turn on GitHub Pages, and
     tell the owner its address so they can open it on any device.
  2. Stage 00 (`docs/path/00-why-we-build.md`): the owner says why the
     app exists and who it is for. Ask, listen, and write their words
     into AGENTS.md ("Why we build", "What this app does"); never write
     the values for them.
  3. Stage 01 (`docs/path/01-first-prototype.md`): one platform (the
     web, unless the owner's people are somewhere else), real data,
     live at its own address.
  4. Leave other platforms for stages 02 and 03, and log the platform
     set in DECISIONS.md when the owner decides it.
- **Open questions**: none yet

---

## Milestones

### M0: A first version, live at its own address

- [ ] The web app carries the app's name and is live on GitHub Pages
- [ ] AGENTS.md "Why we build" and "What this app does" hold the
      owner's own words (stage 00)
- [ ] One platform, real data from a real source, live at its address
      (stage 01)
- [ ] One person the owner knows has used it, and what they did first
      is written down

### When you go native (stage 03)

Only when the owner decides to add a platform, and logs the platform
set in DECISIONS.md. The agent does each of these; the owner never
clicks through Xcode or Android Studio.

- [ ] **Apple (universal)**: rename `AppName` and the bundle ids in
      `project.yml` (no spaces), run `xcodegen generate`, then build
      unsigned for iOS Simulator, tvOS Simulator, and macOS and run the
      Core tests, per `apple/README.md`. One target, four destinations;
      sources stay in `apple/`; `AppVersion.xcconfig` is already wired
- [ ] **Android**: `cd android && ./gradlew :app:assembleDebug`; rename
      the package from `com.example.appname` to your reverse-DNS and
      rebuild; smoke-test on a device or emulator
- [ ] **Links**: drop verification files in `/.well-known/` (with
      `.nojekyll`) once the `appID`, `package_name`, and fingerprints
      are known
- [ ] **CI / submission**: `.github/workflows/appstore-build.yml`
      (one workflow covers iOS + macOS + tvOS) with the seven signing
      secrets seeded per `docs/CLOUD-SUBMISSION.md`;
      `.github/workflows/android-build.yml` for CI builds and
      `.github/workflows/play-release.yml` to publish to Play (internal
      track first, then promote)

### M1: [First user-visible capability]

<!-- One sentence: what can a user DO after this milestone? -->

Before implementing, run the `learning-orientation-design` skill:

- [ ] Deepens understanding
- [ ] Invites participation
- [ ] Supports agency
- [ ] Clarity over cleverness

**Acceptance criteria** (observable by users, not developers):

- [ ] Web: …
- [ ] (each platform you have added: …)

**Parity check**: update PARITY.md row(s) for this capability in
the same change set. Reject the PR if PARITY.md is silent.

### M2: [Second user-visible capability]

- Learning-orientation check passed
- **Acceptance**:
  - [ ] Web: …
  - [ ] (each platform you have added: …)

---

## When to add a binding design doc

When a platform crosses ~5 views OR you find yourself making
inconsistent UI choices, create that platform's binding doc
(`tvOS-DESIGN.md`, `iOS-DESIGN.md`, `macOS-DESIGN.md`, `WEB-DESIGN.md`,
`ANDROID-DESIGN.md`), seeded from the matching per-platform template
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
     accumulate. Every question should have a path to resolution. -->

---

## Out of scope (intentionally)

Document explicitly-rejected ideas so future sessions don't
re-litigate them. "We thought about this and chose not to design it
now" is far more useful than silently re-arriving at the same answer.

When a request gets declined, write a row. Format:
`**Idea**: Why declined. Revisit when …` (revisit condition lets
the entry retire when circumstances change).

| Idea | Why declined | Revisit when |
|---|---|---|
| <!-- e.g. Web push notifications | Too-inconsistent UX across browsers; APNs/FCM cover the need on mobile | iOS + Android push ship and a real cross-platform request appears --> | | |

---

## Session log

<!-- Append-only. Format: state found → work done → state left.
     Keep entries short: one paragraph per session. -->
