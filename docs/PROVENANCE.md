# Provenance & Coverage Map — where every lesson lives, and what was left behind

The audit record for the Universal generation: every knowledge domain the
source apps produced, where it lives in THIS template, and what was
deliberately excluded with reasons. Update this file when upstreaming new
lessons — it is how the next audit knows what "complete" means.
Last full audit: 2026-08-24, against Archive Watch (95 decisions),
Tidbits Trivia (56), Quint (27), BOBA + Bsky (frozen 2026-06-30).

## Coverage: domain → home in this template

| Domain | Lives in |
|---|---|
| Methodology (learning orientation, shipping discipline, parity, design docs, decision log) | Quint-era skills + `CLAUDE.md` (unchanged core) |
| CI fleet engineering (locks, budgets, guards, sweeper, auditor, alert hygiene) | `docs/CI-FLEET.md`, `ci-fleet-engineering` skill, `tools/` guardian cluster, guardian workflows (dormant), split-writer template, Decisions 030–031 |
| Autonomous loop discipline | `docs/AUTONOMOUS-LOOPS.md`, `autonomous-loop-cadence` skill, Decision 032 |
| Device observation harnesses (all platforms) | `docs/DEVICE-HARNESSES.md`, `device-observation-harness` skill, `tools/` harness cluster |
| tvOS (focus, ten-foot, playback surfaces, Top Shelf) | `docs/TVOS-PLAYBOOK.md`, `tvos-platform-patterns` skill, `docs/runbooks/tvos-top-shelf-setup.md`, TVOS-DESIGN template |
| Smart TV beyond Apple (Android TV / Fire TV / webOS / Tizen / Cast / AirPlay) | `docs/TV-PLATFORMS.md`, TV-DESIGN + TV-BACKLOG templates, `smart-tv-platform-expansion` → `androidtv-compose-focus` / `smarttv-web-app` skills, `tv.js`/`tv.css`/`cast/`, `tv/build-tv-packages.sh`, `docs/store/{webos,tizen}-submission.md`, Decision 028 |
| Media streaming + captions (loader invariants, AirPlay/Cast conflicts, HLS shapes, live captions, subtitle judging) | `docs/MEDIA-PLAYBACK.md` (the distillation), `resilient-media-streaming` skill (the core pattern) |
| Windows / MSIX | `docs/windows/`, WINDOWS-DESIGN template, `tools/stamp_msix_version.py`, reference workflows, Decision 029 |
| Store submission (Apple cloud default, Play CLI, screenshots, IAP) | `docs/CLOUD-SUBMISSION.md`, `cloud-appstore-submission` + `play-cli-submission` + `store-submission-playbook` skills, `tools/submit-*` + `asc_*` cluster, `docs/store/` (IAP troubleshooting + choreography, screenshot rules, Play dashboard recommendations, Play API key) |
| Sync (CloudKit query-free pattern, Drive App Data, history-vs-progress) | `per-ecosystem-sync-islands` skill, `docs/runbooks/cloudkit-setup.md`, `docs/runbooks/google-oauth-setup.md`, `docs/research/sync-architecture.md` |
| Shared data plane (SQLite delivery, CORS/Range matrix, additive evolution, forwarding addresses, marker/evidence rules) | `shared-data-plane-contract` + `web-catalog-data-layer` skills, DATA-CONTRACT template, `docs/CI-FLEET.md` §7, Decision 034 |
| Data recovery + git forensics | `docs/runbooks/data-recovery.md` |
| Design research (ten-foot benchmarks, social video specs) | `docs/research/` |
| Icon/branding pipeline | `tools/render-app-icon.py`, `branding/` |

## Deliberate exclusions (do not "rediscover" these)

- **Archive Watch's catalog pipeline** (~150 tools: discovery, enrichment,
  rights audit, TV spines, covers, subtitles sourcing) — inseparable from
  archive.org and that app's data model. The PATTERNS it proved are here
  (CI-FLEET, marker rules, additive merges); the tools are not. Worked
  examples: Archive-Watch `tools/` + `docs/decisions/`.
- **`macos-creation-studio-engine` skill** — a Mac video-editor engine for
  one app. Its two reusable AVFoundation truths (one-model-to-composition;
  the two-pass grade→overlay rule) are noted in the MACOS-DESIGN template
  lineage; build the rest per app from `docs/research/`
  video-clipping material in Archive Watch if ever needed.
- **Tidbits' game/corpus/multiplayer internals** — the generic halves
  already live in `cross-platform-multiplayer` / `-determinism` /
  `content-corpus-derivation` (Quint era).
- **App-specific binding design docs** (tvOS-DESIGN etc. of each app) —
  the template ships SEEDS in `docs/templates/`; the filled-in docs stay
  with their apps.
- **~12 duplicate framework-skill pairs** from two vendored vintages —
  kept both pending a per-pair review (see README maintenance note).
- **BOBA's uncommitted skill dump + stray store artifacts** — superseded;
  its committed lessons predate Quint and are already folded in.

## The upstreaming rule

When a session in any app repo produces a template-worthy lesson: (1) fix
it in the app, (2) upstream the GENERIC form here in the same working
session — a doc section, a skill trigger, a tool, or a seed Decision — and
(3) add or update the row above. Lessons trapped in app-local docs are the
drift this file exists to catch: Tidbits wrote 20 docs and zero skills in
its biggest month, and that gap took an audit to find.
