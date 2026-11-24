---
name: shared-canvas-editing
description: "Use when many people edit one canvas, board, or document of elements at the same time (an Excalidraw whiteboard, sticky notes, votes, a shared diagram) on a broadcast channel plus a saved copy. Carries the merge rules that cost a class its work (restoreElements with a local copy raises an older element above newer work; equal versions with different nonces are never re-sent, so screens stay apart for good; a save must mark the versions it sent, not the ones it finds afterward; two people adding in the same second take the same layer index and the same spot), one card as one element instead of a group, votes as one element per person, names that leave when an account does, running Excalidraw inside a small frame (its phone layout, keys, blocked downloads), and the suites that found each one: two people with a real mouse, twelve at once, touch, and a pencil. Triggers on Excalidraw, whiteboard, shared board, sticky notes, collaborative editing, real-time collaboration, reconcileElements, restoreElements, versionNonce, fractional index, cursors, follow, sync drift, 'resizing is broken', 'my change came back', 'screens don't match'."
---

# Shared canvas editing

What a live class board (Excalidraw 0.18.1 on a Supabase broadcast channel,
saved in Postgres) measured in November 2026. The board looked finished and
had a test. The test had stopped opening the board at all, and a leader found
out in front of an audience. Every rule here came from a failure.

## The shape that works

- **Strokes travel by broadcast; the database keeps the settled copy.** Each
  page saves every few seconds and on leaving, through one server function
  that merges element by element, so no save erases another person's work.
- **One merge rule, in both places.** The higher `version` wins, and for equal
  versions the lower `versionNonce`. Write it once for the page and once in
  SQL, and test both against the same cases.
- **Clearing starts a new generation.** A save or stroke from before the clear
  names the old generation and is refused.
- **Deleted elements are kept a while** (a day here), or a page that missed
  the deletion brings the element back.

## The merge rules that cost real work

1. **Never pass your local elements to `restoreElements` for remote ones.**
   `restoreElements(remote, local)` raises an older element's version above
   the newer local one, so re-reading the saved board undid a resize. Pass
   `null`, as Excalidraw's own collaboration does, and apply only what is newer.
2. **Equal versions are the case that never heals.** Two people change one
   element at once and both reach version 8. Each page keeps the winner by
   nonce, but a page that only re-sends what has a *higher* version than it
   last sent never sends its winning copy. Screens then differ for good. When
   your copy beats the one that just arrived, mark it unsent.
3. **A save marks what it sent.** Note the versions before the request leaves.
   Excalidraw changes a shape in place while it is drawn, so reading the
   versions when the answer returns marks work as saved that never was (a
   shape came back 0 by 0).
4. **Layer order must be unique.** Two people adding at once get the same
   fractional index; Excalidraw renumbers everyone's layers, and each
   renumbering is a new version for rule 2 to fight over. Give a new element
   an index after all others, with a part only that person can produce.
5. **The same second, the same spot.** Placement computed from the board each
   person sees puts simultaneous notes on one another. After a short wait, let
   each person's page move its *own* note to a free place.
6. **A vote is its own element**, one per person per note, with the person's id
   in the element id. A count on the note loses votes when a class votes at
   once. Keep it locked and transparent, and draw the count over the board.
7. **Any pen must be able to start anywhere.** A button drawn over the board
   swallows the first point of a stroke: let overlays take no pointer events
   while a drawing tool is on.

## One thing people touch is one element

A note made of three grouped shapes could only be stretched as a group: no
side handles, and the words grew instead of wrapping. A note is **one
rectangle with bound text**. Its name and votes are drawn over it by the page,
at the board's own scroll and zoom. Old notes upgrade when a board opens.

## Names leave when the person does

If elements carry who wrote them (`customData.by`, `name`), the account's
deletion must take that off, and a page left open will send it back: strip it
**on every save**, for any id whose account is gone, not only once at
deletion. Test that someone who opened the board and drew on it last can
delete their account at all. A guard trigger that pins `created_by`, or sets
`updated_by := auth.uid()`, refuses the very update `on delete set null`
makes, and the deletion fails with an unrelated message.

## Excalidraw in a small frame

- **Its phone layout** (no styles, zoom, or people) starts under 730 wide, or
  under 500 tall when under 1000 wide. A frame is often that small on a laptop.
  Those limits are constants in the bundle: patch them in the build, and
  **throw when the patch does not match exactly once**, so an upgrade cannot
  drop it silently.
- **Zoom to fit measures the style panel** as if it were on the left. Where it
  sits on the right, fit zooms far out on nothing.
- **A single `min-height` hides your own controls** in a short window or on a
  phone held sideways. Check both.
- **Keys go to the page with focus.** In a frame within a frame, hand the key
  to the board when nothing is being typed, or shortcuts do nothing.
- **Downloads and the clipboard may be blocked** by a frame you do not own,
  with nothing shown. See `google-meet-addon` for the window that gets out.
- **Dialogs fall back to a serif** when its interface font is not served. Set
  the font in your own stylesheet.
- A picture reaches others only once storage has it: broadcast the element
  after the upload. Give a pasted web page the sandbox you give any outside
  site, and never let a board frame your own origin.
- A library in browser storage does not follow a person between origins or
  partitioned frames. Keep it in a row only they can read.

## Testing: the suites, and what each one found

Run them against a stand-in backend with real broadcast behavior (delay,
drops, and a save that can be slow), through the real page.

| Suite | Found |
|---|---|
| Two people, a real mouse, every handle | Groups with no side handles; a resize undone by the merge |
| Two people syncing, one dropping and returning | Work lost across a reconnect |
| **Twelve at once**: everyone adds, votes, draws, and resizes together, then one joins late | Rules 2, 4, and 5. Two people never hit them |
| Touch and pencil (pressure, palm, pinch) at phone and tablet sizes | Strokes swallowed by a button; controls off the screen |
| A real phone | Nothing new, which is the point of running it |
| Every menu item, dialog, and shortcut, in a frame with downloads and choosers off | What the host frame refuses |

- **Compare screens by `[id, version, versionNonce]`,** sorted, across every
  page and the saved copy. "It looks the same" misses drift.
- **Repeat the crowd run** until several in a row are clean; a race passes once.
- **Count messages per second** against the plan's limit while all draw.
- **A test nobody runs rots.** Run the suite before trusting it, and make it
  fail when it cannot open the board.
- A browser extension that drives a page **cancels native file choosers**.
  Prove it with a control page before calling the picker broken, then have a
  person press it once.
- Then try it in the real frame. Stage size, key focus, and blocked downloads
  appeared nowhere else.

## See also

- `google-meet-addon` for a board on a Meet stage.
- `zero-cost-hosted-backend` for the channel, the database, and the limits.
- `cross-platform-multiplayer` when one device is the arbiter instead.
