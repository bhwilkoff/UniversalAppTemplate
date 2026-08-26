# Provenance & Coverage Map — where every lesson lives, and what was left behind

The audit record for the Universal generation: every knowledge domain the
source apps produced, where it lives in THIS template, and what was
deliberately excluded with reasons. Update this file when upstreaming new
lessons — it is how the next audit knows what "complete" means.
Last full audit: 2026-08-24, against Archive Watch (95 decisions),
Tidbits Trivia (56), Quint (27), BOBA (frozen 2026-06-30),
Bsky Dreams (upstreamed through 2026-08-24 — the post-freeze lessons:
Share Extension, feed-ranking values pass, content extraction, iOS
resilience/image/gesture/haptics gotchas, Decisions 040–043).
**BOBA re-audit 2026-08-26**: the 2026-08-24 audit's assumption that
BOBA's lessons "predate Quint and are already folded in" was wrong for
its late cycle (2026-04 → 2026-06) — the pricing rebuild, canonical
identity, scan pipeline, trading design, hosted backend, revocation
loop, and iOS-27 gating were all missing. Upstreamed as 9 new skills,
the TRADE-DESIGN template, Decisions 044–052, and amendments across
ios/android-production-gotchas, cloud/play submission,
universal-feature-states, shared-data-plane-contract, AUTONOMOUS-LOOPS,
PARITY, and the DATA-CONTRACT + IOS-DESIGN templates.

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
| Algorithmic feeds / discovery ranking (multi-source merge, values pass, seen-dedup + bypass) | `values-based-feed-ranking` skill, Decision 043 |
| Third-party page content (CORS proxy chains, reader-mode extraction, link previews, article-language detection) | `web-content-extraction` skill, cross-ref in `web-platform-patterns` |
| iOS Share Extension (App Group handoff, responder-chain open, rejected-approach table, web Shortcut counterpart) | `ios-share-extension` skill |
| iOS production additions from Bsky Dreams (synchronized-group build gotcha, recycled-cell image loading, NetworkMonitor + SwiftData fallback wiring, UIGestureRecognizer-subclass touch capture, AVKit animation crash, haptics taxonomy) | `ios-production-gotchas` skill (amended), CLAUDE.md §Shared design system (haptics), IOS-DESIGN template §4.7–4.8, Decisions 040–042 |
| Provenance-honest market data (signal hierarchy, vanish-inference sold history, match-precision gates, audit-by-pattern, dead-affordance rule) | `provenance-honest-market-data` skill, Decisions 044 + 050 |
| Canonical entity identity (one ID/one asset, single-source composite formula, collision audits, lockstep migration, md5 byte guard) | `canonical-entity-identity` + `image-cdn-discipline` skills, Decision 046 |
| Two-tier image CDN (thumbs/full, helper-per-platform, no images in git, dev-domain-isn't-production, cache sizing) | `image-cdn-discipline` skill |
| Hosted backend split (auth+user-data DB only, static catalog, CDN media, worker fleet, RLS roles, username/handle + banned-words, account deletion, push dispatcher) | `zero-cost-hosted-backend` skill, Decision 047 (reconciles 015) |
| On-device camera recognition (fingerprint-primary/OCR-confirm, silent-wrong principle, evidence aggregation, CLI mirror + pixel parity, capture traps) | `camera-recognition-pipeline` skill, `ios-production-gotchas` §Camera + capture |
| Marketplace-adjacent features (never-touch-money, pure introduction, §1.2 minimum controls, DSA geo-block, risk-acceptance table, ToS clauses) | `marketplace-adjacent-design` skill, `docs/templates/TRADE-DESIGN-template.md`, Decision 049 |
| Third-party dependency revocation (prevention posture + the compliant removal loop, provenance backfill, frozen legacy data) | `third-party-revocation-resilience` skill, Decision 051 |
| Monetizing around IP you don't own (license-then-monetize, the own-engineering line, entitlement architecture, decision gates) | `third-party-ip-monetization` skill |
| Two-agent handoff (single-file channel, directional outboxes, ownership lists, provenance-cited deliveries) | `two-agent-handoff` skill |
| Next-OS additive adoption (dual runtime+compile gates, the SDK-conditional flag, Compat wrapper, beta-Xcode submit trap) | `cloud-appstore-submission` Rule 6 (amended), Decision 048 |
| Android release symbols + ML Kit (embed-in-AAB, zip -D, jarsigner; unbundled-vs-bundled) | `android-production-gotchas` §Release engineering, `play-cli-submission` Rule 9 |
| Display vocabulary as a render-layer contract; word-prefix search; image-first sort; two-phase catalog load | `shared-data-plane-contract` §Client consumption rules, DATA-CONTRACT template §5.5, Decision 052 |
| Teaching-surface platform asymmetry (walkthroughs iOS-only; documented rejections elsewhere) | `universal-feature-states` (amended), PARITY.md §3b |
| Autonomous-loop pre-push checklist (import sweeps, stale call sites, artifact sweeps, deprecation signatures) | `docs/AUTONOMOUS-LOOPS.md` §7 |

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
- **BOBA's uncommitted skill dump + stray store artifacts** — superseded
  as artifacts. (The 2026-08-24 claim that BOBA's committed lessons were
  "already folded in" was wrong — corrected by the 2026-08-26 re-audit
  above. What remains deliberately excluded: BOBA's card-catalog
  pipeline itself, the Radish-specific tooling, the practice-battle
  engine, and its filled-in binding design docs — app-specific; their
  generic halves now live in the skills listed above.)

## The upstreaming rule

When a session in any app repo produces a template-worthy lesson: (1) fix
it in the app, (2) upstream the GENERIC form here in the same working
session — a doc section, a skill trigger, a tool, or a seed Decision — and
(3) add or update the row above. Lessons trapped in app-local docs are the
drift this file exists to catch: Tidbits wrote 20 docs and zero skills in
its biggest month, and that gap took an audit to find.
