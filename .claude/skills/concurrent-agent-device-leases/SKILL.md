---
name: concurrent-agent-device-leases
description: "Use when more than one agent session drives the same physical test devices — two Claude Code sessions in different repos sharing a bench of phones/TVs, or any harness that force-stops apps and resets device state. Carries the cooperative lease protocol (~/.device-lease), the hold-for-the-whole-run rule, and the diagnostic tell that you are fighting a peer rather than a bug. Triggers on: device contention, another session, app keeps closing, force-stop, shared test devices, adb/devicectl conflicts, 'the app was in the foreground and I did not put it there'."
---

# Sharing a device bench between concurrent agent sessions

Two agent sessions, two repos, one physical bench. Each session's harness
installs builds, force-stops apps to reach a clean state, and drives the UI.
Neither knows the other exists.

## The symptom, and why it is so expensive

The failure does not look like contention. It looks like **a bug in your
product**:

- Your app is not in the foreground, though you launched it.
- Your app died mid-run — "it must be crashing on launch."
- A screenshot shows *another app entirely*.
- A device that was responsive stops responding partway through a sweep.

Real cost, measured on the Archive Watch / Tidbits Trivia bench: four rounds
of fixes went into making one harness's recovery "smarter" at fighting a peer
it did not know existed. The Apple TV changed hands mid-run repeatedly. Time
was spent hardening against a phantom.

**The tell**: a device that misbehaves in ways your code cannot explain, while
a second agent session is open on the same machine. Check for a peer before
you debug.

## The protocol

No shared memory, no daemon, no coordination service. A shared filesystem and
a convention both sides agree to:

```
~/.device-lease/<device>.json   {"owner", "pid", "task", "acquired", "expires"}
```

Four rules, few enough that another tool can implement them in an hour:

1. **Take a lease before touching a device; release it after.**
2. **A lease has a TTL.** A crashed session must not hold a device forever,
   and no session should need a human to break a lock.
3. **Never steal a live lease.** Wait, or skip the device and *say the run did
   not cover it*. A skipped device reported honestly beats a contended device
   reported as a product failure.
4. **Reading a foreign lease tells you who holds it**, so the message names a
   peer instead of blaming the app.

`tools/devlease.py` is the reference implementation. Adopt it **verbatim** in
both repos — the value is that both sides speak it identically, so a
"compatible" reimplementation is worth less than a copied file.

```python
import devlease

with devlease.lease("atv", task="what you are doing", ttl=1500, wait=900):
    ...   # the device is yours for this whole block
```

## Hold the lease for the WHOLE run, in ONE process

This is the rule that was learned the expensive way. Taking a lease
per-invocation — one for install, one for launch, one for each screenshot —
leaves gaps between calls, and **the peer session took the Apple TV in exactly
one of those gaps**, mid-sweep.

```python
# WRONG — three leases, two gaps a peer can drive through
with devlease.lease("atv"): install(app)
with devlease.lease("atv"): launch(bundle)
with devlease.lease("atv"): shot = screenshot()

# RIGHT — one lease spanning the whole causal chain
with devlease.lease("atv", task="regression sweep", ttl=1500, wait=900):
    install(app); launch(bundle); shot = screenshot(); assert_on(shot)
```

Corollary: a lease's TTL must cover the **slowest realistic run**, not the
median one. An expired lease mid-run is the same gap by another route.

## Naming

Lease names are physical devices, not roles: `atv`, `ipad`, `iphone`,
`firetv`, `googletv`. Two sessions must agree on the names or the protocol
does nothing — put the table in the repo's device-testing doc so both sides
can look it up.

## What this does not solve

- **Two sessions wanting the same device at the same time** — one waits. If
  that is common, the bench is too small; say so rather than shortening TTLs
  until the protocol stops working.
- **A human picking up the device.** Nothing detects that. Screen-OCR
  assertions catch the resulting nonsense; the lease does not.
- **Cross-machine benches.** `~/.device-lease` is one filesystem.

## Checklist

- [ ] `devlease.py` copied verbatim into every repo sharing the bench
- [ ] Device-name table written down where both repos can see it
- [ ] Every harness entry point wraps its **whole** run in one lease
- [ ] TTL ≥ the slowest realistic run
- [ ] Skipped-because-leased is **reported**, never silently dropped
- [ ] Before debugging inexplicable device behaviour: check for a peer session

## See also

- `device-observation-harness` — what to do with the device once you hold it
- `docs/DEVICE-HARNESSES.md` — the per-platform harness catalog
