# [APP NAME] — Web Design (BINDING)

<!-- Seed for docs/WEB-DESIGN.md. Invoke `binding-design-doc-discipline`
     for the workflow and `web-platform-patterns` for the mechanics this
     doc does NOT restate (view system, service-worker versioning,
     IndexedDB migration, CSS gotchas, headless verification).

     The §N structure and the rules baked in below are WEB platform
     facts — the CORS/Range realities, the no-position:fixed Safari
     rule, the share-URL + 404-forwarder contract, image fallback with
     retry, SW versioning. Keep them. Replace every [BRACKET]; delete
     the <!-- FILL --> notes. Sections marked "(optional module)" apply
     only if the app has that surface. -->

**Binding.** Quote the rule number before proposing any new view, modal,
route, or data path. If no rule fits, propose a NEW rule first. Companion
to `PARITY.md`, `docs/DATA-CONTRACT.md`, and the sibling design docs —
the platforms share verbs, never idioms. When a rule below inverts a
sibling rule, that inversion is deliberate.

## §1 Principles

- **§1.1 The web feels like the web.** URL-driven state, shareable
  everything, zero install, works on a phone first. Never port
  iOS/tvOS chrome.
- **§1.2 No framework, no build step.** Vanilla HTML/CSS/JS served raw
  by [static host]. Revisit only if the app passes ~20 components.
- **§1.3 Zero backend.** Static hosting + public CORS APIs only.
  Personalization stays in this browser (IndexedDB)
  (`shared-data-plane-contract`, `per-ecosystem-sync-islands`).
- **§1.4 Mobile-first.** Every media query is `min-width`. Test 375px
  before 1280px.

## §2 Data plane (VERIFY host behavior and record the date)

- **§2.1 The primary dataset is a static, CORS-enabled file/index** on
  [host]. Handle additive schema growth by treating absent trailing
  fields as null. **Never `fetch()` an asset the host serves without
  CORS from the browser** — it fails even when a `curl` works.
- **§2.2 Per-item detail resolves at view time** through one API module
  (`js/api.js`) — never `fetch` third-party endpoints directly from view
  code. `<img>`/`<video>`/`<audio>` elements are exempt (no CORS
  needed); `fetch()`/`XHR` are not.
- **§2.3 Composed surfaces resolve through a curated map, not a live
  broad query** — a live scrape/search can bypass the app's
  visibility/policy filters and can return one identical list for every
  "popular" section.
- **§2.4 The upgrade path is chunked SQLite over the static host.**
  [Verify: many static hosts serve `206 + Access-Control-Allow-Origin:
  *` on GET.] When richer query (full-text search, joins) is needed,
  deploy a slim chunked SQLite via a CI-based deploy (no git commit) and
  query with `sql.js-httpvfs`.

<!-- VERIFIED CORS/Range matrix worth pasting once you measure your
     hosts (dates matter — this drifts):
       - Static host (Pages-style) GET: often 206 + ACAO:* → range-
         queryable IF hosted there (but committing a large DB per build
         bloats git — deploy via CI, not a commit).
       - Release-style asset: 206 but NO ACAO → fetch() fails CORS.
       - Third-party storage nodes: no ACAO on fetch() → media/img
         elements only. -->

## §3 Routing + URL state

- **§3.1 Hash routes** (`#/`, `#/…`, `#/item/{id}`, `#/about`). Filters
  live in the hash query so every filtered view is a shareable URL.
- **§3.2 Canonical share URLs are PATHS**, `/item/{id}` — the exact URLs
  the native Share buttons emit. `404.html` forwards them into the hash
  router. **Never change this shape; shipped apps depend on it.**
- **§3.3 One router.** `route()` reads the hash, `showView(name)` toggles
  `<section hidden>`. Per-view `IntersectionObserver`s are disconnected
  on every view switch.

## §4 Surfaces

- **§4.1 Home** = [composed sections]. Cross-section deduped (first
  claims the item), sections under [N] items dropped. If the home surface
  is curated visuals, admit only designed content and keep the rest
  reachable in browse/search.
- **§4.2 Browse** = scope chips + facet selects + infinite-scroll grid
  (IntersectionObserver sentinel, [N]/page). The full count is always
  shown.
- **§4.3 Search** is client-side over the dataset, debounced [180]ms,
  capped at [N] results, query mirrored to the URL.
- **§4.4 Detail** renders instantly from the list row, then hydrates the
  rest (§2.2). Errors are visible inline (never console-only). On
  iOS/Android UAs an **Open in app** action appears (the `[scheme]://`
  on Apple, an `intent://` with this page as the fallback on Android).
- **§4.5 Library / saved state** in IndexedDB. Empty states are explicit
  sentences, not blank space.
- **§4.6 Modals use `<dialog showModal>`.** **No `position: fixed`
  overlays** (Safari compositor rule, §6.3).

<!-- FILL further surfaces as sub-rules — each declares its route, its
     data source, and its empty/error state. -->

## §5 Media *(optional module — delete if no audio/video)*

- **§5.1 Native `<video controls playsinline>` / `<audio controls>`.**
  The browser's ranged GETs handle seeking; PiP/AirPlay come free.
- **§5.2 Reconnect wrapper** (the resilient-streaming analog): on
  `error`, or `waiting` > [12]s, persist position, reload `src`,
  re-seek, replay. Surface a visible retry only if the re-play fails.
- **§5.3 Progress persists every [10]s** and on close/end to IndexedDB;
  resume seeks within bounds.
- **§5.4 Media is never cached** by the service worker.

## §6 Look

- **§6.1 Brand chrome per the shared system:** primary for CTA/chrome
  only, accent for links. Any semantic category accents are reserved for
  content meaning — don't repurpose them as chrome.
- **§6.2 Density from removing chrome.** System font stack; **no
  webfonts** (no build step, no FOUT).
- **§6.3 Remote images fall back with retry.** `object-fit: cover`,
  falling back [primary → secondary source] on error, with the chain
  **retried up to twice on jittered backoff** — hosts throttle image
  bursts with transient 503s, so a one-shot fallback leaves images
  broken until a manual refresh. When nothing fetchable remains, render
  a local typographic placeholder, never a host's generic gray box.
  **Safari layout:** `body { height: 100dvh; display: flex;
  flex-direction: column; overflow: hidden; }` + `main { flex: 1;
  overflow-y: auto; min-height: 0; }`. NO `viewport-fit=cover`. NO
  `position: fixed` overlays — they break Safari's compositor at the
  Dynamic Island.

## §7 PWA + offline

- **§7.1 Installable** from `manifest.json` (scope `/`).
- **§7.2 Service worker**: shell cache-first; dataset network-first with
  last-good fallback; third-party requests pass through untouched. **Bump
  the SW cache version on every shipped change** (`web-platform-patterns`).
- **§7.3 Offline = open + browse cached data.** [Live/streamed content
  offline is out of scope.]

## §8 Values

- **§8.1 [Required attribution / legal notice]** lives on `#/about`,
  reachable from the persistent footer.
- **§8.2 No tracking, no analytics, no third-party scripts.** State never
  leaves the browser.
- **§8.3 Visibility/policy filtering is upstream** — the dataset is
  already filtered; the viewer adds no client toggle until a richer data
  layer exists (§2.4).

## §9 Parity discipline

- **§9.1** Update `PARITY.md` in the same change set as any user-facing
  feature; quote these rule numbers in proposals.
- **§9.2 Out of scope on web v1**: [features that need runtime data the
  flat dataset lacks / a sync island] — list each with the reason and the
  "arrives when" trigger.
