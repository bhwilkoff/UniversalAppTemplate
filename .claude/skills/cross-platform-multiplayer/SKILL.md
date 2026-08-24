---
name: cross-platform-multiplayer
description: Use when building any real-time multiplayer that must span native (iOS/macOS/tvOS/Android) AND the web — same-room local play over the LAN, or online play across the internet. Carries the transport-seam abstraction, the "protocol + arbiter live in Core with no networking import" rule, ship-IDs-not-payloads, the mDNS+TCP+AES-GCM serverless local path, the canonical-wire-schema + golden-parity test method, host-paced everyone-plays coordination with a friendly-game trust model, leader election, the online reality (GameKit is Apple-only, Google killed Play Games real-time multiplayer in 2020) + neutral-backend and believable-bot fallbacks. Triggers on multiplayer, peer-to-peer, matchmaking, same-room, Bonjour/mDNS, Wi-Fi Aware, GameKit, Firebase rooms, "play with a friend", online match, wire protocol, cross-platform sync of live state.
---

# Cross-Platform Multiplayer

Multiplayer that spans native + web is where "same verb, native idiom" gets
hardest: the *wire* must be identical across stacks even though every client is
written in a different language. This skill is the methodology that made it work
in production (a cross-platform "game night" + online quick-match), distilled to
be app-agnostic.

## The five load-bearing decisions

### 1. The protocol + the arbiter live in Core, with NO platform-networking import

The wire types (the frames the clients exchange) and the authoritative logic (who
wins, whose turn, when to advance) are plain data + plain functions in the shared
`Core/` layer. They do NOT `import Network` / `import GameKit` / touch a socket.

**Why:** Core with no networking import (a) compiles for *every* target including
tvOS and the web/Kotlin mirrors, and (b) is unit-testable offline — you can drive
a whole match in a test with no radio, no second device, no server. The transport
is a thin adapter *below* this layer, injected in.

### 2. Everything network rides a transport SEAM

Define one small interface — advertise / discover / connect / send-frame /
on-frame — and make every transport a conformance: Bonjour+TCP, Wi-Fi Aware, BLE,
GameKit, a WebSocket to a backend. The host/client state machines are written
ONCE against the seam and never change when you add a transport.

```
protocol PeerLink {              // Swift; mirror as an interface in Kotlin/JS
    func advertise(room: String)
    func discover(room: String)
    var onFrame: (Data, PeerID) -> Void { get set }
    func send(_ frame: Data, to: PeerID?)   // nil = broadcast
}
```

This seam is what lets "local same-room" and "online" be the SAME feature with a
different adapter underneath. Build the local path first; the online transport
drops in behind the identical seam later (see §Online).

### 3. Ship IDs, not payloads (when clients share a bundled corpus)

If both clients already bundle the same content (a question set, a card deck, a
level list), the wire carries **stable content IDs**, not the full objects — a
~100× smaller frame. Keep a **full-object fallback** in the frame shape for the
rare item a peer doesn't have (older bundle). This only works if the IDs are
stable across builds — which is the same discipline as [[shared-data-plane-contract]].

### 4. Host-paced, everyone-plays, friendly-game trust

One device is the host/arbiter. It ships the *plan* once (the shared, ordered
list of rounds/items) and paces the group ("everyone answer #3 now"). **Every
device runs its OWN copy of the deterministic engine over the identical list** and
reports its result; the host trusts self-reported scores. This "friendly-game"
trust model is correct for people in a room together and keeps the wire tiny.
(For play between *strangers*, you need a server-authoritative spine instead —
see §Online anti-cheat.) The shared play view takes an optional `live:` handle so
the single-player code path is untouched — solo and multiplayer are one view.

### 5. Determinism is a contract, proven by a golden test

Any value both stacks must agree on (the shared plan, a shuffle, a "daily" set)
is produced by ONE algorithm mirrored in each language and proven by a **golden
test that runs the REAL code on every stack and diffs the output**. Never a
seeded shuffle (RNG differs across languages); prefer an **order-independent
hash-rank** (hash a canonical string per item, take the N smallest). See
[[cross-platform-determinism]].

## The serverless LOCAL path (the default cross-platform transport)

For same-room play, **mDNS/Bonjour discovery + plain TCP + app-layer encryption**
is the only path that works across *all* of iOS/macOS/Android today. The survey:

| Transport | Reach | Verdict |
|---|---|---|
| **mDNS + TCP** | iOS/macOS/tvOS/Android | **DEFAULT** — the only cross-platform LAN path |
| Wi-Fi Aware (NAN) | Android; iOS 26+ | Same-vendor only; not cross-platform; radio-gated (real hardware) |
| BLE | all native | Tiny MTU; fiddly; fine for signaling, not payloads |
| Multipeer / Nearby | single-ecosystem | Apple-only / Google-only; never cross-platform |

**The encryption gotcha (cost real iteration):** TLS-PSK seems the obvious choice,
but Android's Conscrypt can't do GCM cipher suites with PSK, so an Apple↔Android
TLS-PSK handshake can't agree on a suite. **Move confidentiality up to the app
layer:** derive a key from the room code (`AES-256-GCM`, key = `SHA256("<ns>:" +
ROOMCODE)`), frame with a 4-byte length prefix. A wrong room code → the GCM tag
fails → the frame is dropped. That *is* your pairing gate: no separate auth
needed, and the crypto is identical on every stack (CryptoKit / javax.crypto /
WebCrypto all speak raw AES-256-GCM).

## The canonical wire + golden-parity test

Two independent implementations speaking one wire drift unless you pin it:

- **One normative schema, fixtures as the single source of truth.** Write the wire
  shape down (field names, casing, enum spellings) in a doc; commit fixture frames.
- **The golden suite encodes on stack A and DECODES on stack B — both directions**
  — plus an **id-parity check** that every bundled corpus has identical IDs across
  stacks. Run it after ANY wire change.
- **Encoding-drift traps:** force `encodeDefaults = true` (a field left at default
  silently vanishes from JSON otherwise); decide strict-vs-lenient decoding
  explicitly; make unknown enum `kind`s forward-compatible (a new item type from a
  newer peer must not crash an older client — decode to an "unknown, skip" case).

## Online (across the internet)

The settled reality that forces the architecture:

- **GameKit** covers Apple↔Apple online for free (matchmaking + transport). Ride it
  behind the SAME `PeerLink` seam so the host/client logic is reused unchanged.
- **Google killed Play Games real-time multiplayer in 2020.** There is NO native
  Android real-time transport. So **Android + web need a neutral backend.**
- **A neutral backend** for web/Android rooms: the cheapest that works is
  **Firebase Realtime Database** — anonymous-auth-gated ephemeral rooms, a
  transaction-claimed matchmaking queue, Security-Rules-only (no server code),
  hard-stop free tier. Alternatives when you outgrow it: a Cloudflare Durable
  Object as the authoritative per-room actor (WebSocket hibernation), or
  Supabase/Postgres for identity+presence. See [[per-ecosystem-sync-islands]].
- **Leader election:** an online "peer" match with no designated host elects the
  same leader deterministically (lowest stable participant id) who then runs the
  host role — reusing the local coordinator verbatim.
- **Anti-cheat for strangers:** the friendly-game trust model does NOT hold between
  strangers. Make the server own the clock, split the public prompt from the
  private answer key, and reject late/implausible answers. Only add this when you
  actually ship stranger-matched play — it's real work.

## Believable-bot fallback (and the non-negotiable honesty rule)

Online matchmaking is empty at launch. Fill the gap with a CPU opponent: a
clamped correct-rate that varies by category/difficulty, log-normal answer timing,
an occasional (~5%) "freeze". **NON-NEGOTIABLE: a bot is ALWAYS visibly labeled as
CPU — never presented as a human.** Passing a bot off as a person is a dark pattern
and fails [[learning-orientation-design]]. A labeled bot is a graceful bootstrap; a
disguised one is a lie.

## Build order

1. Local same-room over mDNS+TCP+AES-GCM, driven by the Core arbiter (offline
   unit-testable). Golden-test the wire.
2. The believable bot (works with zero connectivity — instant "multiplayer").
3. Online: GameKit behind the seam for Apple; a neutral backend for web/Android.
4. Stranger anti-cheat only if/when you matchmake strangers.

"Same room == remote" — one room-code mechanic, one code path, never two.

## See also

- [[shared-data-plane-contract]] — stable IDs + additive evolution the wire depends on
- [[cross-platform-determinism]] — the hash-rank + golden-parity discipline for shared plans
- [[per-ecosystem-sync-islands]] — the identity/backend layer online play sits on
- [[learning-orientation-design]] — the bot-honesty rule
- [[cross-platform-parity-discipline]] — same verb, native idiom
