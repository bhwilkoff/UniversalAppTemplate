---
name: product-pulse-dashboard
description: Build a daily product-health dashboard that reads every channel a shipped app has — store submissions and reviews, downloads and installs, crashes, social posts and their engagement, mentions across the open web, CI health. Use when someone asks for "one place to see how the app is doing", a metrics or KPI page, an ops dashboard, or wants to track store performance and user feedback over time.
---

# Product Pulse: one page that knows how the product is doing

A shipped app scatters its signals: reviews in App Store Connect, installs in a
Cloud Storage bucket, crashes in Play Console, engagement in five social APIs,
mentions nowhere at all. Nobody visits six consoles daily, so nobody sees the
2★ review that says the app will not play anything.

This skill builds the page that collects them, and — more importantly — the
three rules that decide whether anyone can trust it.

## The three rules

### 1. A reader that cannot read SAYS SO. Never a zero.

This is the whole skill. Everything else is presentation.

Wrap every source. A failure is recorded **in the output** and rendered as
"could not read — no credential in this environment", never as `0`. A confident
zero from a broken reader is worse than no dashboard: it reads as good news and
nobody checks again.

There are four routes to that lie and a real dashboard hits all of them:

| Route | Symptom | Fix |
|---|---|---|
| The reader threw | "0 reviews" beside healthy panels | isolate per source; record `{ok, note}` |
| A partial run overwrote | Yesterday's mentions vanish | `--only` MERGES; it replaces only what it collected |
| A full run dropped a failed section | Four reviews become a hole | a failed reader keeps its last value, marked `stale` |
| A fuzzy search did not repeat | A real mention evaporates | mentions and reviews ACCUMULATE, deduped by identity |

And one more, from the workflow rather than the code: **a secret that exists but
is never passed to the step is indistinguishable from one that was never made.**
Assert it — read every `os.environ` name out of the collector and check the
workflow carries it. That test caught its own omission the day it was written.

### 2. Every number carries a comparison, and colour never carries quantity

Follow Few and Cleveland & McGill, in that order:

- **A bare number means nothing.** Show it against a scale, its siblings, its
  own past, or a whole. "4.4" is a fact; "4.4 of 5, target 4.5, up 0.03 since
  yesterday" is a finding.
- **Encode by accuracy**: position, then length, then area, then colour. So
  there is no pie, no donut, no bubble. Ever.
- **Colour means STATE** — live, in flight, needs you, nothing yet. A bullet
  graph's qualitative bands are one hue at three intensities so the chart
  survives colour-blindness and spends no colour on a number.
- **No gauges.** `bullet()` carries measure, scale, bands and target in 22px;
  a gauge carries one number in a quarter of the screen.
- **Zero is DRAWN; absence is WRITTEN.**

`pulse/charts.js` implements exactly this: `bullet`, `bars`, `spark`, `stack`,
`legend`, `dots`, `ratio`, `cadence`. Hand-rolled inline SVG, no library.

### 3. Every panel opens, and every number links to where it came from

A number you cannot open is a number you have to take on trust, which is the
opposite of what the page is for. Each panel gets a `detail` list and an
outbound `href`: the rating opens to the reviews, followers to the actual
profiles, a crash cluster to its Console issue with the exception, *your own*
stack frame, the build range and whether it is on the live build.

Progressive disclosure stays predictable: a chevron expands in place, a link
leaves, and nothing does both.

## The one list that asks for a decision

"Needs you" is the only actionable section, and what it contains is a judgement
worth getting right:

- **Filter by whether the USER's problem is live, not by whether you replied.**
  A first version filtered low-star reviews to unanswered ones, which put the
  app's one 2★ — *"Broken: latest update will not play any films"* — underneath
  a green "Nothing is asking for you."
- **Filter crashes by the build that is LIVE.** Twelve clusters where eleven
  were last seen two releases ago is a list nobody reads. Compare each cluster's
  `lastAppVersion` to what is actually in production.
- **A crash with a fix written but not shipped is a RELEASE task, not a fix
  task.** Record it (`ops/fixed-in.json`) and ask for the release by name,
  or the same work gets asked for twice.
- **When it is empty, say so in words.** "Nothing is asking for you" plus what
  was checked beats a blank panel, which is indistinguishable from a broken one.

## Getting it running

1. Fill in `tools/app_config.py` — App Store id, Android package, repo,
   product name, site, and the mention terms. One file.
2. `python3 tools/pulse_collect.py` — collect and print, write nothing. Each
   source prints `ok` with a note or `--` with the reason.
3. `--apply` writes `ops/pulse.json`; serve `pulse/` and open it.
4. `.github/workflows/pulse.yml` runs it daily and commits the reading.

Two things that bite in deployment:

- **The daily commit carries `[skip ci]`** — correct, or a reading sets the
  whole fleet running — which also means its push triggers **no deploy**. Add
  the collector to the deploy workflow's `workflow_run`, or the site serves
  yesterday's numbers forever.
- **A service worker registered at root scope will cache the dashboard.** Ours
  showed yesterday's panels beside today's timestamp. Exclude the ops paths, and
  assert both halves: the ops pages are never cached AND the app still is,
  because a bypass that swallows the site breaks the PWA offline.

## What "over time" needs

`history` is one compact row per day, forever, and **nothing in it may grow** —
scalars only. That series is the only part that answers "are we getting
anywhere". Text (reviews, mentions) is a capped window, newest first.

The panels fill themselves in from the second day. Say that on the page rather
than rendering an empty chart.

## The reporter rule

This workflow **never fails because something it read is unhealthy**. Findings
go to the page and to a `::warning::`. It fails only when it could not write or
push its own file — and that step carries an explicit
`# reporter-may-fail: <why>` marker that `tools/check_workflow_gates.py`
enforces.

An alert channel that cries wolf gets muted, and then a real break goes unread.

## See also

- `docs/PRODUCT-PULSE.md` — the reference: what each source needs and returns
- `store-metrics-pipelines` — how each store actually exposes its numbers, and
  the trap in each one
- `mobile-first-density-design` — the density rules the panels obey
- `architectural-decision-log` — log why a source was chosen or rejected
