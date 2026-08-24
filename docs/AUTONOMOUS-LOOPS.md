# Autonomous Development Loops — running Claude unattended without shipping fiction

Distilled from hundreds of loop ticks across Archive Watch (tvOS-first, the
caption/playback campaigns), BOBA Playbook (the original multi-platform loop),
and Tidbits Trivia (six platforms, store submissions mid-loop). The global
`autonomous-loop-cadence` skill carries the tick-by-tick mechanics; this doc
carries what heavy use since taught — mostly about VERIFICATION, because every
expensive loop failure was a loop that believed its own reports.

## 1. The prime rule: the agent is never the tester

The loop's output is claims. The single costliest pattern on record: **builds
890–906 of Archive Watch each "verified" a tvOS caption fix on circular
self-reports while the actual television kept failing** — the code's own logs
said the captions were correct because the code that drew them and the code
that reported them shared the assumptions that were wrong.

The standing directive that fixed it: a change ships only on **external
observation** — evidence gathered by an instrument that does not share the
app's assumptions:

- **Screenshot/OCR of the actual glass**, not the view hierarchy's claim.
- **Tap-audio metering** for sound, not the player's state flag.
- **The published artifact re-downloaded**, not the local file that was
  uploaded.
- **The store console**, not your own submission notes ("docs drift; consoles
  don't" — Tidbits).

When the target device cannot be observed directly (a TV across the room, a
device with an unreadable console), the loop's FIRST job is to build the
instrument — see `docs/DEVICE-HARNESSES.md`. Do not iterate blindly on
behavior you cannot observe; diagnostics before another attempt, always.

## 2. Trust nothing you didn't measure — including your own tooling

One session logged four distinct ways the loop's own instruments lied, all in
two days: `head -N` truncating the evidence; a log grep matching the SCRIPT
TEXT in a `##[group]Run` header instead of output; calling a push failed when
it was attempt 1 of a retry that succeeded; and a tautological check (testing
a property true by construction). Standing habits:

- **Step conclusions and exit codes over log greps.** Conclusions are
  unfakeable; text matching is not.
- **A verification run must identify its own configuration** — a "fix"
  was once validated by re-running the OLD binary after an unchecked install.
  Make tools print their version/flags; check the build number before
  diagnosing a user report (a "still broken" filed 8 minutes after an upload
  finished is a report against the previous build).
- **A nondeterministic fault needs repeated trials per arm**, not one run
  each — a ~50% race made a no-op change look like a fix.
- **When two instruments disagree, build the control experiment** that
  removes variables wholesale (serve the file from localhost; run one shape
  per process) rather than iterating on correlations. An instrument must
  never perturb what it measures, and must say when it is blind.
- **A check whose "nothing to do" arrives suspiciously fast is a claim to
  verify.** "Backlog drained" in 94 seconds was a provider-blind flag; "0
  posters to verify" was a permanent boolean. Ten of ten such clearings in
  one audit were bugs.

## 3. Loop cadence and shape

- **Diagnose → fix → verify → log is one tick.** Never stack unverified fixes;
  the second fix on top of an unverified first is how regressions compound.
- **Three strikes → change mode.** User pushback after 3+ iterations of
  "still broken" means stop fixing and start instrumenting (the
  `3d-feature-debug-loop` reset: research agents, observable evidence,
  on-screen debug overlays for what you can't attach to).
- **Wake-up pacing matches the thing awaited.** Poll external state (CI, a
  store review) at the rate it actually changes; use long fallback heartbeats
  when a notification will arrive; never busy-poll what will notify you.
- **Version-bump discipline**: bump MARKETING_VERSION + build on every
  app-source commit; pipeline/CI/docs-only commits do not bump. Commit
  messages quote the owner's request verbatim. Commit AND push each verified
  unit — an unpushed loop tick is work the next session cannot see.
- **Session logs are the loop's memory.** SCRATCHPAD.md gets a dated entry
  per session: what shipped, what was measured (numbers, not adjectives),
  what is VERIFIED vs merely FIXED, what awaits an external event (with the
  date), and what the owner must do. The verified/merely-fixed distinction is
  load-bearing — a "fixed" workflow that has not yet been observed to run is
  a different claim from a green one.
- **A long submission or migration mid-loop gets a dated RESUME doc**
  (Tidbits pattern) — a disposable, self-contained handoff written to survive
  context compaction, separate from the rolling scratchpad.
- **Archive the scratchpad and decision log before they eat the context
  window.** DECISIONS.md holds an index + recent entries in full; older
  entries move VERBATIM to `docs/decisions/` archives (never summarized —
  append-only binds in the archives too). Roll at ~120 KB.

## 3b. Research before architecture (standing rule)

No architecture change to a load-bearing subsystem ships from pattern-
matching or memory: commission a full best-practices research pass first
(current-year sources, verified-vs-inferred marked), check the decision log
for approaches already REJECTED (re-implementing one without new evidence
is the cardinal sin), and encode the findings as a skill or binding doc so
the next session inherits the conclusion, not the search. The one time this
repo skipped it, three successive caption architectures were built on a
mis-measured premise. Corollary: when the platform vendor documents a
capability, MEASURE it on the target device before building on it — the
doc's claim and the device's behavior diverged four separate times.

## 4. Sources of work, order of work

- Mine the owner's actual words first: verbatim requests in commit history,
  session logs, and research notes outrank self-generated polish.
- **Audit before polish**: a parity-matrix or feature audit pass (every
  button, every filter, on the device) before cosmetic iteration — the
  Archive Watch full audit found six shipped regressions, with a pattern
  worth checking on any multi-platform app: **CREATE paths ship without
  their inverse** (create-channel without delete; playlist-add without
  remove), and **parity lands on the new platforms without returning to the
  platform it started on**.
- An unapplied binding rule is not an open question — check the design doc
  and decision log before re-deciding anything (Tidbits D053).
- Fix data problems in the PIPELINE, never per-client: a data fix reaches
  every platform on the next publish with no app release.

## 5. The owner/agent split

Keep a standing OWNER section (in the backlog doc or scratchpad): tasks only
a human can do — store-console clicks, payments, physical-device QA, DNS,
signing authority, PIN pairing. The loop never blocks on these silently; it
surfaces them, continues elsewhere, and re-checks. Corollaries:

- Read submission state from the store console, not from your own notes.
- Never re-cut a version for platforms already in review just to align a
  number.
- Secrets never enter the tree (`Secrets.xcconfig` gitignored; keys in env
  or CI secrets; an `AuthKey_*.p8` in a repo root is an incident, not a
  convenience) — and verify CI actually RECEIVES the secrets, because a
  shipped build silently missing an API token is a green-build failure.

## 6. When the loop touches stores and real users

- Cloud submission is the default (`docs/CLOUD-SUBMISSION.md`): a beta-OS dev
  box is rejected AFTER upload; the cloud runner has the released toolchain.
- App Review is part of the loop's feedback: read rejections as data, keep
  the review-facing surfaces (account deletion, attribution, privacy
  manifest) as launch REQUIREMENTS not polish.
- Screenshot/capture tooling enforces its own rules (a capture script that
  REFUSES to run with a premium flag set beats a checklist), and captures go
  to a durable path — "a capture you cannot return to is a capture you have
  to take twice."
