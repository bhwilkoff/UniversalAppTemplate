# The board: research notes

October 3, 2026, for C4 in `meet-classroom-design.md` (Wish 2: "A
collaborative drawing space, or a slideshow easily worked on
together"). Not site copy. Every claim has its source beside it; pages
were read on October 3, 2026, and what was tested here says so.

## 1. Loading Excalidraw with no build step

- **The package.** `@excalidraw/excalidraw` 0.18.1 is the latest release
  (npm `dist-tags`, published 2026-04-20), MIT, with React 17, 18, or
  19 as a peer dependency (npm registry metadata). It ships only ES
  modules with bare imports of 31 dependencies (`dist/prod/index.js`,
  502 KB, plus chunks of 1.8 MB and 439 KB; jsDelivr file listing). There
  is no UMD build in 0.18.
- **jsDelivr's `+esm` does not work.** jsDelivr rewrites the bare imports
  to its own URLs, which works for Excalidraw itself, but its
  dependencies each resolve React on their own: loading the page pulled
  in React 18.2.0, 18.3.1, 19.0.0, 19.2.5, and 19.2.7, and the page failed
  with "Cannot read properties of null (reading 'useRef')", the error of
  two Reacts on one page. **Tested** in headless Chrome. An import map
  cannot fix it, because the versions are ranges that change as React
  publishes.
- **esm.sh works** with `?deps=react@19.2.5,react-dom@19.2.5` (tested:
  loaded in 4.3 s over 160 requests), but it is one more service the
  board would depend on.
- **Chosen: vendored.** `tools/board/build.mjs` bundles React 19.2.5,
  ReactDOM, and Excalidraw with esbuild into
  `assets/vendor/excalidraw-0.18.1/`: 8.6 MB in 181 files, of which the
  first load is about 1.4 MB (17 requests, tested); the rest (other
  languages, Mermaid, math) loads only when used. This is what the
  classroom design planned, so the Meet add-on frames one origin. The
  cost is that the repository carries 8.6 MB, and every upgrade adds
  that again to its history.
- **Fonts** come from jsDelivr at the pinned version
  (`window.EXCALIDRAW_ASSET_PATH`,
  https://docs.excalidraw.com/docs/@excalidraw/excalidraw/installation:
  "set `window.EXCALIDRAW_ASSET_PATH`"); they are 13 MB in 234 files, so
  they are not copied. Excalidraw falls back to esm.sh on its own if
  that fails (read in the bundle's `ASSETS_FALLBACK_URL`).
- The container must have a real height: Excalidraw "takes 100% of width
  and height of the containing block" (installation page).

## 2. Excalidraw's collaboration API

- `updateScene({ elements, appState, collaborators, captureUpdate })`,
  `getSceneElementsIncludingDeleted()`, and `onChange(elements,
  appState, files)` (https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/props/excalidraw-api).
  `CaptureUpdateAction.NEVER` keeps remote changes out of the person's
  own undo (exported values IMMEDIATELY, NEVER, EVENTUALLY, read from
  the bundle).
- **Reconciliation**, read in the source
  (https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/data/reconcile.ts):
  the local element is kept if it is being edited, if its `version` is
  higher, or, at equal versions, if its `versionNonce` is lower or
  equal; the result is ordered by fractional index. This settles the
  secondary-source question in the design notes. The board uses this
  function in the page, and the same rule in `BoardLib.merge` and in the
  database's `merge_board_elements`.
- **How Excalidraw's own app collaborates** (excalidraw-app/collab,
  same repository): it sends only elements whose version is newer than
  what it last sent (`Portal.tsx`, `broadcastedElementVersions`), a full
  scene every 20 seconds, pointers at about 30 a second, and keeps erased
  elements for a day so erasures travel
  (`app_constants.ts`, `data/index.ts`). The board follows all of this
  except the 20-second full scene: instead it reads the saved board when
  it reconnects, which is what catches a page up.

## 3. Realtime: broadcast, not Postgres Changes

- **Limits on the free plan** (https://supabase.com/docs/guides/realtime/limits):
  200 concurrent connections, 100 messages a second, 100 channel joins a
  second, 100 channels a connection, 20 presence messages a second,
  broadcast payloads up to 256 KB, Postgres Changes payloads up to
  1,024 KB. The page has no date.
- **Why broadcast.** Postgres Changes would mean a database write for
  every stroke and a read rule checked per subscriber per change. Strokes
  go by broadcast; the database is written every five seconds.
- **Private channels** (https://supabase.com/docs/guides/realtime/authorization):
  a channel joined with `private: true` is checked against rules on
  `realtime.messages` (select to receive, insert to send), with
  `realtime.topic()` naming the channel; "client access policies are
  cached for the duration of the connection." So a lock stops strokes in
  the database at once, but a student already connected could still send
  strokes until they reconnect; their page obeys the lock, and the saved
  board refuses them.
- **Public and private stay apart.** "A public broadcast only reaches
  public channels and a private broadcast only reaches private channels"
  (https://supabase.com/docs/guides/realtime/broadcast). So the board is
  private without turning off "Allow public access", which /live/'s
  public Postgres Changes channel still needs.
- **The budget.** `BoardLib.sendInterval` spaces each page's strokes so
  that thirty people drawing at once send 40 messages a second, and
  pointers a quarter of that. A change over 200 KB is cut into several
  messages; a single element over that (a very long freehand line) is
  saved and the others are told to read it. Tested against the stand-in:
  the largest message in a full run was 922 bytes.

## 4. Keeping a board

- One `boards` row per session and per group, the scene as JSON, capped
  at 2 MB, images turned off in the page (`UIOptions.tools.image`), so
  nothing a student uploads is ever stored.
- `save_board()` merges what a page sends into what is saved, element by
  element, so saves from several people never erase one another. A
  page sends only what changed since its own last save. On leaving, a
  `fetch` with `keepalive` sends the rest as the page closes (bodies
  under 64 KB, which is why the page checks the size).
- A clear starts a new `generation`, and a save or stroke from an older
  generation is refused, so a page that was asleep cannot bring a
  cleared drawing back.
- Deleted with the cohort's other session data when it is marked
  finished, as `meet-classroom-design.md` said.

## Not verified

- Against the real Supabase project: the private channel joining, the
  Realtime rules as the Realtime server evaluates them, and the
  publishable key's access to `realtime.messages`. The policy tests use
  a stand-in for `realtime.topic()` and `realtime.messages`.
- On a phone with a finger, on an iPad with a pencil, and inside the
  Meet add-on's iframe.
- Three or more real browsers, and thirty people at once against the
  free plan's message limit.
