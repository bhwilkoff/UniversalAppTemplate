---
name: zero-cost-hosted-backend
description: "Use when an app needs SHARED user data — accounts, public profiles, cross-user features (shared collections, moderation, matching, social rows) — the case per-ecosystem-sync-islands explicitly does not cover. Carries the three-way split (hosted Postgres for auth + user data ONLY; catalog as static published artifacts; media on a zero-egress CDN), the one-worker-per-job serverless seam (API proxy, account deletion, media upload, push dispatcher with two transports), proxy cache-key discipline, RLS role gating, the single-field username rule with the two-layer banned-words gate, and UI-ahead-of-backend shipping. Also static-first adapters on one free Worker (D1 rooms, /live 302, stateless MCP, tallies). Triggers on Supabase, hosted backend, user accounts, public profiles, shared collections, moderation, RLS, Cloudflare Worker, API proxy, account deletion, avatar upload, push dispatcher, username, banned words, \"do we need a backend\", D1, rate limit, cron sweep."
---

# Zero-cost hosted backend

How to run a multi-platform app with real shared user data on free
tiers, without a server you administer. Distilled from a production
app (BOBA Playbook) that shipped accounts, public collections,
moderation roles, and cross-platform push groundwork on exactly $0
of backend spend.

## First: do you even need this?

**`per-ecosystem-sync-islands` is the default.** If every piece of
user state is private to that user (favorites, progress, settings),
sync it on the user's OWN cloud — CloudKit for Apple platforms,
Google Drive App Data for Android/web — and run no backend at all.

Reach for THIS skill only when users must see **each other's** data:
public profiles at a URL, shared or public collections, user-to-user
matching, moderation queues, community submissions. That requires a
hosted store with access control — but not a big one, and not one
that does everything.

Record which route the app takes as a DECISIONS.md entry. The two
architectures don't mix well retroactively; choosing late means
migrating.

## The three-way split (the rule)

**Hosted Postgres holds auth + user data ONLY. The content catalog
is a static published artifact. Media lives on a zero-egress CDN.**

| Data | Home | Why |
|---|---|---|
| Auth, sessions | Hosted Postgres + its auth product (Supabase-shaped) | The only part that genuinely needs a server |
| User rows (collections, decks, prefs, profiles) | Same Postgres, RLS-protected | Small rows, low volume — free tier lasts years |
| Content catalog (the thing users browse) | Static JSON/SQLite published via Pages/CDN | Browsing must not cost a DB query; see `shared-data-plane-contract` |
| Images / media | Zero-egress object storage + CDN (R2-shaped) | Egress is what kills free tiers |
| — | **NOT the DB's storage product** | A media-heavy app exhausts DB-attached storage quota almost immediately; keep media off the database bill entirely |

The catalog stays static even after the backend exists. Users
browsing 20k items generate zero backend load; only writes (save,
designate, submit) touch Postgres.

## The serverless-worker seam

Everything a static site + a client can't do safely becomes a
**small serverless worker (Cloudflare-Workers-shaped), one worker
per job** — not one monolith function. Each worker is a page of
code with its own secrets, deploy, and failure domain. The
recurring four:

1. **Third-party API proxy.** Hides API keys the client must never
   hold, caches upstream responses, normalizes response shapes so
   all platforms parse one contract, and rate-limits so one user
   can't exhaust an upstream quota. Every external API the app
   consumes goes through one of these — clients never call a
   third party directly.
2. **Account deletion.** A store-listing requirement on both app
   stores, so build it early. Shape: verify the caller's Bearer JWT,
   then admin-delete the auth user with a service-role secret that
   exists only in the worker. Schema does the rest: user-owned
   tables `ON DELETE CASCADE`; audit/history tables `ON DELETE SET
   NULL` so the trail survives anonymously.
3. **Media upload.** Avatars and user images go through a
   size-capped worker straight into CDN object storage — never
   into Postgres, never into the DB's storage product.
4. **Push dispatcher.** ONE worker, two transports: APNs
   (HTTP/2 + JWT via Web Crypto) and FCM v1 (service-account
   token). Triggered by a DB webhook or cron over the event table;
   joins a `user_devices` table; batches per transport. The payload
   is **symmetric** — same type, same fields, and the deep link is
   the **identical string on every platform** (`appname://thing/{id}`),
   so notification handling is one code path per client, not a
   per-platform format.

Workers accept `Authorization: Bearer {jwt}` + JSON/bytes —
transport-agnostic, so adding a platform requires **zero server
changes**. Keep a per-worker table in the project docs (name, job,
consumers) once there are three or more.

## Proxy cache-key discipline

A caching proxy's cache key includes every query param. If
platforms send different values for the same logical request, they
**silently split the cache** and show different data for the same
entity at the same moment — in production this surfaced as three
platforms displaying 1, 2, and 11 listings for one item because
they sent `days=30`, `days=90`, and `days=30` against a 6-hour
cache. Rules:

- Params that don't change user-visible meaning get **fixed
  server-side defaults**; clients don't send them at all.
- If a param must vary, either normalize it out of the cache key or
  accept (and document) the divergence.
- When platforms disagree on displayed data, suspect the cache key
  before suspecting the upstream.

## Static-first Worker adapters (one free Worker, many thin routes)

The one-worker-per-job rule above is for jobs that hold SECRETS. A
different family needs no secret: routes that only translate files
the pipeline already publishes into a shape some other client
speaks. Those share ONE free Worker (plus its D1), each a small
module. Archive Watch runs six on one Worker (`index.js` counter,
`together.js` rooms, `live.js`, `xtream.js`, `mcp.js`, `tally.js`):

| Adapter | Shape | What makes it free |
|---|---|---|
| Watch-party rooms | D1 row per live room; host writes on state change, guests poll (see `cross-platform-multiplayer`) | D1 is strongly consistent; rows deleted when the room ends |
| `/live/<channel>` | 302 to the program airing now, at `?start=<computed offset>` from the published schedule | "Live TV" with no streaming server: the origin serves a file from a second |
| IPTV (Xtream / M3U / XMLTV) | Redirects + published list files | Lists are pre-built by the pipeline, one file per category |
| MCP endpoint | Stateless Streamable HTTP (JSON, no session id), reads published shards only | No storage, says nothing the apps would not show |
| Privacy tally | `day \| kind \| count`, nothing else | Counts what the server already receives to provide the feature |

Rules, each learned in production:

- **Pass lists through untouched.** `return new Response(r.body)`;
  parsing a 6 MB list per request exceeds the free plan's CPU
  allowance (10 ms). Pre-split in the pipeline (whole list,
  per-category list, 256 lookup shards) instead of filtering in
  the Worker.
- **Build-stamp cache keys.** Fetch every published file as
  `file?v=<build>` where `build` comes from a small manifest fetched
  with a short TTL. Then the edge can cache the big file for a day
  and still never serve a previous publish (a plain TTL served a
  stale full list for over an hour).
- **Rate-limit bindings on every unauthenticated route.** The free
  daily request budget is PER ACCOUNT and shared by every adapter;
  one looping script on one route takes all of them down.
  `[[ratelimits]]` bindings count per address for the window and
  store nothing. Size limits from real polling (a guest polling
  ~32/min makes 300/min a household, not a device), with a tighter
  second limiter on create routes.
- **Cron sweep for anything that promises deletion.** A row deleted
  "on the next read of that key" is never deleted if nobody reads it
  again. `[triggers] crons` + `scheduled()` sweeping stale rows is
  what makes a privacy-page promise ("deleted after six hours") true.
- **A counter never fails the request it counts** (try/catch, no
  rethrow), and never takes a new client-sent ping (the count comes
  from what the server already serves).
- **Know which host the Worker answers on.** AW's clients all
  pointed at the Pages domain and would have 404'd on every route;
  tests passed because they injected a base URL. Smoke-test against
  the deployed `*.workers.dev` origin.

Seed: `pulse/worker-example/` (counter + tallies + drop box, D1,
`schema.sql`, `wrangler.example.toml`). Add adapters as sibling
modules routed from its `fetch`; add `[triggers]` and
`[[ratelimits]]` to the toml when the first stateful or open route
lands.

## Auth conventions (per client)

- **One backend client singleton per platform** — views/composables
  never construct requests or hold tokens.
- **Refresh the JWT before EVERY worker / storage / edge-function
  call.** The auth SDK's auto-refresh covers only its own HTTP
  path; everything outside it gets a stale token that fails in
  confusing ways (storage errors that look like generic upload
  failures). This rule is repeated in AGENTS.md because it is the
  single most re-learned backend gotcha.
- **Tokens in the platform vault**: Keychain on Apple platforms,
  Tink-encrypted DataStore on Android — never UserDefaults /
  SharedPreferences (and EncryptedSharedPreferences is deprecated).

## Roles + moderation

- Roles live in a `user_profiles` table (`role`: user | moderator |
  admin). **Every privileged table enforces the role via RLS** — the
  server is the gate, always.
- The client fetches the role **post-auth and caches it in-memory
  for the session only**. Never persist a role client-side; a stale
  cached "admin" is a security bug and a stale "user" is a support
  ticket.
- Privileged mutations write to **correction/override tables**, not
  to the catalog itself. The catalog is a static artifact with a
  release cycle; corrections flow into the next publish. This
  decouples "a moderator fixed a record" from "we shipped a new
  bundle," and the correction tables double as the audit log.

## Usernames: one field, two-layer gate

**Username = display name = public handle. ONE field.** A separate
`display_name` inevitably drifts from the handle and confuses every
surface that shows either (the two-name UX of large chat platforms
is the cautionary tale). Derive an initial value from the email
local-part with collision suffixes (`ben` → `ben2`); OAuth users
without email get `user-{short-hash}`. Ship a debounced
availability-check RPC driving an inline status pill.

Because usernames are **public, persistent, and a harassment
vector**, gate them in two layers:

1. **Client-bundled JSON list** (a few hundred entries) — instant
   red pill while typing, zero network.
2. **Server table as the authoritative gate** inside the
   `check_username` / `set_username` RPCs — this is the real
   enforcement, and it survives client-bundle drift (an old app
   build can't bypass a newly banned term).

Reserve infrastructure terms (`admin`, `api`, `www`, route names)
in a separate reserved list — they're not slurs, but they collide
with URLs like `/u/{username}`.

## UI ahead of backend

It is legitimate to ship a settings toggle that persists to a
column **before** the pipeline consuming it exists (e.g., a
notification opt-in whose dispatcher is months away):

- Removing a toggle later is worse UX than shipping it dormant.
- The accumulated opt-in data is real signal when the backend lands.

Two conditions: track the gap explicitly (a deferred row in the
parity/backlog doc, not silence), and **never fake the feature's
output** — a dormant toggle is honest; a fabricated result is not.

## Lessons from a live cohort platform (2026-11)

A free cohort platform (humanshaped.org) ran live classes on Supabase. What
it measured:

- **Realtime change events are seconds slow.** `postgres_changes` passes the
  write log and an RLS check per subscriber: 2 to 5 seconds from one person's
  write to another's screen. For anything people watch together, send a
  **broadcast** nudge on a channel right after the write and let receivers
  reload; keep change events and a slow poll as fallbacks.
- **Supabase realtime free tier is 200 connections**, and overage restricts
  the whole organization. Public, many-person rooms belong on a separate
  service (a Cloudflare Durable Object held 1,000 sockets at 151 ms median).
- **`on delete cascade` is a data-loss decision.** A breakout room's group was
  deleted when breakouts ended, and every room's answers went with it. Rows
  people's work hangs off are marked ended, never deleted, and a policy test
  proves the work survives.
- **`signOut()` defaults to signing out everywhere.** Never sign a session out
  to get a clean test state; use a fresh profile or an anonymous sign-in.
- **Anonymous sign-ins** let anyone with a link take part as a guest; record
  guests per group and let an organizer tie a guest to a member.
- **Test RLS in an embedded Postgres** (`pgserver`, Python 3.12) on every
  migration: apply them all, then act as each role. Include negative checks
  (refused, or zero rows) and checks that a delete keeps what it must. A
  refused UPDATE returns zero rows, not an error, so assert on the rows.
- **Migrations without the dashboard**: POST SQL to the Management API
  (`/v1/projects/<ref>/database/query`) with a personal access token kept in
  a mode-600 file, then record the version in
  `supabase_migrations.schema_migrations`.
- A **SECURITY DEFINER function that changes one field** (a guest setting
  their own link) is safer than an UPDATE grant on the whole row.

## Free-tier viability

All of the above fits free tiers at hobby-to-small-community scale,
but each service has a ceiling you should know before designing:

- **Worker subrequest caps** (e.g., 50 subrequests per invocation
  on free plans) kill batch-crawl designs. Prefer **piggybacking
  one unit of background work on user-request paths**
  (`ctx.waitUntil`) over cron jobs that grind a whole dataset —
  it stays under caps by construction and scales with real usage.
  (`provenance-honest-market-data` builds a whole data asset on
  this pattern.)
- **DB free-tier storage** is fine for rows, fatal for media —
  hence the CDN rule above.
- **Zero-egress object storage** is the piece that makes image-heavy
  apps free; egress-billed buckets are the trap.
- **A Worker cannot fetch another Worker's public URL on the same
  account.** The edge returns 404 and the destination never runs, with
  no log on either side, while the same URL works from curl. Declare a
  service binding (`[[services]] binding = "X_SVC", service = "app-x"`)
  and call `env.X_SVC.fetch(new Request("https://internal/path?q"))`;
  only the path and query matter.
- **Free tiers push several projects onto one account.** Name every
  Worker, bucket, database, and KV namespace with the project's prefix
  from the first deploy; it is the only safe filter the day one project
  is torn down (`app-sunset-playbook`).

### One account is one budget (2026-11-23)

The owner: "We should not be anywhere close to the limits on any plan if
we are using them correctly." On a free plan the daily allowances (Workers
requests, Durable Object requests, duration and rows written, D1 writes,
KV writes) belong to the **account**, not the project. One app's bug took
every app down: a Durable Object alarm in one project rescheduled itself
in the past, fired, saved, and repeated for hours, and the next morning
an unrelated app's rooms threw `1101` because every object that woke and
read its storage hit "Exceeded allowed rows written in Durable Objects
free tier". So a free-tier limit being hit means a runaway somewhere, not
growth. Find it before blaming usage, and read it from the source:
`npx wrangler@latest tail <worker>` names the exact error (an old
Homebrew wrangler may not read the keyring login).

Rules that keep every app far from the limits:

- **Every alarm has a floor and a test.** `setAlarm(Math.max(at, Date.now() + 5000))`,
  and a test that fails if any path sets an alarm at or before now.
  Re-arm only when the time moves earlier; each `setAlarm` is a row.
- **Write what changed, at most so often.** Each `put()` key is a row.
  Put only the keys that changed, and throttle saves (one per few
  seconds) behind a timer; a pending timer keeps the object awake, so
  hibernation loses nothing.
- **Survive storage refusing.** An object whose state lives one session
  (a call's room) goes on from memory when `storage.get` or `put`
  throws, instead of failing every request.
- **Clients back off and rest.** Reconnect after at least 1 s, doubling
  to 60 s with jitter; forget failures only after 30 steady seconds (a
  server that answers then drops must not pull every client back at
  once); wait while the tab is hidden. Long-poll instead of polling,
  and stop polling hidden tabs.
- **One request per visit for analytics.** Count routes in memory and
  send one `sendBeacon` on `pagehide`; write them in one `DB.batch`.
  Deploy the Worker that accepts the new shape before the client.
- **Broadcast channels multiply.** On Supabase Realtime every broadcast
  is delivered to every subscriber and each delivery counts. Send WebRTC
  candidates inside the offer and answer (wait for gathering, two seconds
  at most), not one broadcast each.
- **Free projects pause.** A Supabase project with no scheduled work
  pauses after a week idle; let an always-busy project call its public
  route once a day, and trim `cron.job_run_details`, which never shrinks.

## Driving the hosted database from an agent

- **A SQL tool call is its own session.** A `CREATE TEMP TABLE` is gone
  before the next call; multi-step migrations use a regular staging
  table and drop it explicitly at the end.
- **Large literal SQL hits the tool's transport limit** (about 600 KB
  through the Supabase MCP server; a 2 MB `INSERT ... VALUES` for an
  18,000-row ID migration failed). Bulk loads go through the REST
  endpoint with the service key in batches, or are chunked to a few
  hundred rows.

When a ceiling approaches, the escape valve is per-service and
incremental — upgrade the one service, not the architecture.
