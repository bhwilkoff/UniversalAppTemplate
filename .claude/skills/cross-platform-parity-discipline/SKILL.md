---
name: cross-platform-parity-discipline
description: Use when shipping ANY user-facing feature in a multi-platform repo, when asked to "check parity", "audit features", or before a launch wave on any platform. Carries the PARITY.md workflow — same verb / native idiom, same-change-set updates, deliberate-defer cells with reasons, platform-specific affordance sections — and the periodic parity AUDIT protocol that catches missing rows and silently-false cells. Triggers on PARITY.md, feature parity, parity matrix, "ship on all platforms", "does Android have", parity audit, cross-platform feature, launch readiness, degenerate state, platform port audit.
---

# Cross-Platform Parity Discipline

The single source of truth for "what ships where" is `PARITY.md`.
This skill is the workflow that keeps it true. It was battle-tested
shipping one app on five platforms (tvOS, iOS/iPadOS, macOS, web,
Android) through simultaneous store submissions — every rule below
earns its place from a real drift incident.

## The rule

**Same verb, native idiom.** The feature (the verb: search, save,
share, browse) is identical across platforms. The expression is
whatever is native — `.searchable` on iOS, `SearchBar` on Android,
`<input type=search>` + URL params on web, the focus-driven keyboard
on tvOS, `NavigationSplitView` + AppKit on macOS (e.g. player
metadata rides the window title bar, since macOS has no
`externalMetadata`). Never let one platform own a different verb for
the same surface; never port one platform's layout to another.

The three Apple platforms (iOS/iPadOS, macOS, tvOS) share one Swift
Core, so keep their columns grouped/adjacent in the matrix. A
shared-Core change usually moves ALL THREE Apple cells at once — but
"moves" is not "verified": re-build each of the three and confirm the
feature on each idiom before flipping the cells to ✅.

## When you ship a feature

In the SAME change set (not a follow-up):

1. **Find or add the row** in PARITY.md under the right verb section.
2. **Update every platform's cell** — including the ones you didn't
   touch. A platform you can't reach right now gets ⏳ plus a Notes
   reason, never a blank. Blanks are drift.
3. **Mirror where feasible.** If the change is small on the other
   platforms, ship them together. If not, the ⏳ note says why and
   what wave it lands in.
4. **Cross-link the binding design doc section** that governs the
   feature on each platform that has one.
5. **Don't wait to be asked.** "Ship on one and see" is how a matrix
   rots.

## Cell honesty rules

- ✅ means *live and verified on that platform* — not "code merged."
  If you haven't seen it work (sim screenshot, emulator run, browser
  check), it's 🚧.
- A **deliberate defer is a healthy cell**: "⏳ Google Cast — needs
  Cast SDK + device-tested receiver, deferred to player wave" is
  good engineering. The reason in Notes is mandatory; it's what lets
  a future session pick the work up without re-deriving the blocker.
- **Owner-blocked is its own state**: when a cell waits on something
  only the human can do (an OAuth client, a store setting, a domain),
  say "OWNER:" in the note. Don't let owner-blocked items
  masquerade as engineering backlog.
- **n/a and 🚫 carry reasons.** "n/a — TV apps suspend in
  background" teaches; a bare n/a invites re-litigating.
- Platform-exclusive features go in the per-platform affordance
  sections (§9–§12), with the cross-platform equivalent named:
  "Top Shelf (tvOS) ↔ WidgetKit (iOS) ↔ Glance widgets (Android) ↔
  PWA shortcuts (web)."

## The parity audit (run before launch waves + once per milestone)

Day-to-day updates miss two failure classes that only an audit
catches. Real audits on a shipped 4-platform app found **5 missing
rows and 4 false cells** in a matrix that was being maintained
conscientiously.

**Protocol:**

1. **Inventory sweep**: walk each platform's actual surfaces (tab by
   tab, screen by screen — from the code, not from memory) and list
   every user-facing capability. Diff that list against the matrix.
   Missing rows get added. Typical finds: share buttons, media/lock-
   screen controls, result filters, tappable metadata (cast → person
   browse) — small verbs nobody recorded.
2. **Cell verification**: for every ✅, ask "have we observed this
   working on this platform, recently?" Suspicious cells get tested,
   not trusted. The canonical false cell: a "(synced)" claim where
   the sync payload never actually carried that record type — code
   existed, data never flowed.
3. **Degenerate-outcome pass**: for the marquee features, drive each
   to its tie / zero / empty / cold-quit outcome, not just the happy
   path — a game that ends in a tie, a list with zero results, a
   session killed mid-flow and relaunched. Happy-path audits miss
   whole bug classes; a real pass found the tie screen, the
   empty-history dashboard, and the resume-after-force-quit path all
   broken on platforms whose happy paths were ✅.
4. **Stale-blocker check — in BOTH directions**: for every ⏳/🚫, is
   the recorded reason still true? Blockers expire (an API ships, a
   domain gets bought, a measurement gets re-run and contradicts the
   old one). And **audit the claim against the code before building
   the "missing" feature** — a documented-backlog sweep found four ⏳
   items that were wrong docs: the features already existed and the
   matrix was stale in the pessimistic direction. Building from a
   false ⏳ duplicates shipped work.
5. **Fix in the same pass**: small gaps (a missing toggle, a missing
   row) get closed during the audit; large ones get ⏳ cells with
   reasons and land in the milestone queue ordered by size.

## Auditing a whole-platform port

When one platform is a PORT of another (a new desktop twin, a TV form
factor), organize the audit doc **by failure class, not surface by
surface**: missing entirely · present-but-wrong (logic diverges from the
source platform) · present-but-unwired (renders, does nothing) ·
degenerate-state-only bugs. Surface-by-surface walks re-find the same
class N times and miss the classes that cut across surfaces; a
failure-class organization turns each class into one fix applied
everywhere. Give the port its own per-item tracker doc
(`docs/<PLATFORM>-PARITY.md`) mirroring the main matrix's rows.

## Working the gap queue

When closing parity gaps in bulk (a "parity wave"):

- **Order by shared-logic leverage**: a feature whose logic already
  lives in shared code (a deterministic scheduler, a query verb, a
  flag baked into the data plane) ports cheapest — do those first.
- **Port the logic, rebuild the layout.** A deterministic core
  (same constants, same seeds, same query) gives identical behavior
  across platforms; the layout around it is rebuilt in each
  platform's idiom. Never screenshot-match layouts across platforms.
- **Re-verify the platforms you didn't touch.** Shared-file changes
  must re-build every consumer (the tvOS build going green after an
  iOS-motivated Core change is part of done).
- Update PARITY.md per change set within the wave, not once at the
  end — a wave that dies mid-way must leave a true matrix.

## The dead-API audit: a declaration nothing calls is an unshipped feature

A parity matrix is built from what each platform's UI *offers*. It cannot see
a capability that exists in shared code and is **wired on zero platforms** —
every cell looks consistent, because they are all consistently wrong.

Found in production: a `beginStallSuspension` on a shared SharePlay service,
public, documented, and **called by nothing on any platform**. Every player
received a playback coordinator and none of them ever suspended it, so a
buffering participant silently drifted out of sync instead of the group
waiting. The matrix had no row for it; the code review had nothing to catch,
because the method was correct.

Run this whenever you audit a shared layer:

```bash
# every public/internal method on the shared service, minus its own definition
grep -rn --include="*.swift" "func " Shared/Services/Thing.swift |
  sed -E 's/.*func ([a-zA-Z0-9_]+).*/\1/' |
  while read f; do
    n=$(grep -rn --include="*.swift" "\.$f(" . | grep -vc "Services/Thing.swift")
    [ "$n" -eq 0 ] && echo "NEVER CALLED: $f"
  done
```

Two rules follow:

- **Prefer driving cross-cutting behaviour from the shared entry point** rather
  than exposing it for each platform to remember. The stall suspension moved
  into the shared `attach(player:)`; three platforms then cannot diverge on it
  again, and there is no per-platform call site to forget.
- **A capability with no row is a capability with no owner.** If shared code
  can do something a user would notice, it earns a matrix row even when the
  answer is identical everywhere — that row is what makes "wired nowhere"
  visible.

## Verbs that deserve a row people forget

Share (and what a share URL opens on each platform) · lock-screen /
media-key controls · search-result filters · tappable secondary
metadata · account deletion (a store-review requirement, not a
feature) · error/empty/offline states for marquee surfaces ·
settings toggles that gate behavior shipped elsewhere · deep-link
routes (every emitted URL shape must be openable everywhere it
lands — including the manifest/intent-filter on Android).
