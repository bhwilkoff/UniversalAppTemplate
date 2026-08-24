---
name: cross-platform-determinism
description: Use whenever a value must come out IDENTICAL on every platform — a "daily" content pick, a shared shuffle, a deterministic match plan, a hash used as a key. Carries the order-independent hash-rank pattern (never a seeded shuffle), the one-algorithm-N-mirrors rule, the golden-parity test that runs the REAL code on every stack and diffs, and the concrete language gotchas (Kotlin signed-Byte, JS 53-bit ints, locale/timezone). Triggers on "daily", deterministic, seed, shuffle, hash, "same on all platforms", golden test, parity test, FNV, cross-platform selection.
---

# Cross-Platform Determinism

When web (JS), Apple (Swift), and Android (Kotlin) must independently compute the
*same* answer — the same "Daily 7", the same match order, the same key — a shared
seed is NOT enough. Each language's RNG, integer width, and sort stability differ.
This is the discipline that makes cross-platform determinism actually hold.

## Rule 1 — Order-independent hash-rank, never a seeded shuffle

A seeded `shuffle` gives different output in every language (the PRNG algorithm
differs; even `sort` stability differs). Instead:

1. For each candidate, compute a hash of a **canonical string** — e.g.
   `hash("daily:" + dateKey + ":" + itemID)`.
2. Take the N items with the **smallest** hash values.

This is **order-independent** (no dependence on input order or sort stability) and
trivially identical across languages *if* the hash function is identical. Use a
simple, spec-stable hash you can mirror exactly — **FNV-1a (64-bit)** is ideal:
tiny, no library, unambiguous.

## Rule 2 — One algorithm, N mirrors, changed in lockstep

The selection/hash lives as the same ~15 lines in each stack (`Daily.swift`,
`Daily.kt`, `daily.js`, and a Python copy if the build pipeline needs it). A change
to the algorithm lands in **all** mirrors + the golden fixtures in ONE change set.
Treat a mirror drifting as a P0 correctness bug, not a style nit.

## Rule 3 — Prove it with a golden test that runs the REAL code

Do not eyeball parity. The golden suite:

- Runs the **actual** selection code on **each** stack against a shared set of
  fixture inputs (dates, item lists) and asserts identical output.
- Runs in CI on every stack, and after ANY change to the algorithm or the corpus.
- For a wire protocol (see [[cross-platform-multiplayer]]), also encodes on one
  stack and decodes on the other — both directions — plus an id-parity check.

## The language gotchas that break parity (all cost real debugging)

- **Kotlin signed `Byte`.** `byte.toLong()` **sign-extends** bytes ≥ 0x80 (any
  non-ASCII char in the canonical string), so the hash diverges from Swift/JS.
  Mask every byte: `(b.toLong() and 0xFF)`. This is the single most common
  cross-platform hash bug.
- **JavaScript 53-bit integers.** JS `number` can't hold a full 64-bit hash
  exactly. Compute the FNV hash in **BigInt** (or split hi/lo 32-bit halves), never
  plain `number`, or the low bits — the ones you rank on — go wrong.
- **Swift `&*` / `&+`.** Use the overflow operators for the FNV multiply/xor;
  plain `*` traps on overflow.
- **Date/timezone.** The `dateKey` must be computed from ONE agreed timezone (UTC,
  or an explicit app timezone) on every platform, or two clients roll over the
  "day" at different moments. Never `new Date()` local-time formatting.
- **String encoding.** Hash the UTF-8 bytes on every stack (Swift `Array(s.utf8)`,
  Kotlin `s.toByteArray(Charsets.UTF_8)`, JS `TextEncoder`), never UTF-16 code
  units.

## See also

- [[shared-data-plane-contract]] — the stable IDs the canonical string is built from
- [[cross-platform-multiplayer]] — the wire/plan determinism this underwrites
