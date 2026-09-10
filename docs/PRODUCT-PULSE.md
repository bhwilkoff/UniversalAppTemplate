# Product Pulse — the reference

The daily dashboard that reads every channel a shipped app has. The *reasoning*
lives in the `product-pulse-dashboard` skill; this is what each piece needs and
returns.

`tools/pulse_collect.py` → `ops/pulse.json` → `pulse/` renders it.

## Adopting it

1. Fill in `tools/app_config.py`: `APPLE_APP_STORE_ID`, `ANDROID_PACKAGE`,
   `GITHUB_REPO`, `PRODUCT_NAME`, `PRODUCT_SITE`, `MENTION_STRICT`,
   `MENTION_LOOSE`, `PLAY_REPORTS_BUCKET`.
2. Fill in the six profile URLs and `SITE` at the top of `pulse/pulse.js`.
3. Add the secrets you have. Every one you skip shows on the page as a named
   step rather than a wrong number.
4. `python3 tools/pulse_collect.py` — dry run, prints `ok`/`--` per source.
5. `.github/workflows/pulse.yml` runs it daily; add `Pulse` to your deploy
   workflow's `workflow_run` or the site keeps serving yesterday.

## Sources

| Source | Route | Needs |
|---|---|---|
| `apple_stores` | ASC `appStoreVersions` | `ASC_KEY_ID` `ASC_ISSUER_ID` `ASC_KEY_P8` |
| `apple_reviews` | ASC `customerReviews`, paged | ASC |
| `apple_rating` | `itunes.apple.com/lookup` | nothing |
| `apple_downloads` | ASC `salesReports` (gzip TSV) | `ASC_VENDOR_NUMBER` + a **Sales and Reports** key |
| `apple_performance` | ASC `perfPowerMetrics` | ASC |
| `play_stores` | `androidpublisher` tracks | `PLAY_SERVICE_ACCOUNT_JSON` |
| `play_reviews` | `androidpublisher` reviews (7-day window) | Play SA |
| `play_rating` | store page | nothing (empty until Play publishes one) |
| `play_vitals` | `playdeveloperreporting` rates | Play SA + API enabled |
| `play_crashes` | `vitals.errors.issues` + one report each | Play SA + API enabled |
| `play_users` | `distinctUsers` × 7 dimensions | Play SA (withheld below an audience floor) |
| `play_reports` | GCS installs CSVs | `PLAY_REPORTS_BUCKET` + bucket grant |
| `amazon_vitals` | Amazon `vitals/apps/{pkg}/{metricSet}` | `AMAZON_CLIENT_ID`/`SECRET` + a profile MAPPED to the Reporting API |
| `manual_stores` | `ops/stores-manual.json` | you, by hand |
| `social_programme` | your posting ledger | nothing |
| `social_liveness` | per-platform "is it still up" | the platform tokens |
| `social_reach` | followers per platform | platform tokens |
| `social_replies` | Bluesky notifications | `BLUESKY_*` |
| `youtube_channel` | Data API v3 | `YOUTUBE_*` with `youtube.readonly` |
| `mentions_reddit` | `reddit.com/search.rss` | nothing |
| `mentions_hn` | Algolia | nothing |
| `mentions_lemmy` | `/api/v3/search` | nothing |
| `mentions_news` | Google News RSS | nothing |
| `mentions_bluesky` | `searchPosts` | `BLUESKY_*` |
| `mentions_mastodon` | `/api/v2/search` | `MASTODON_*` |
| `github` | `gh api` | `GH_TOKEN` (traffic needs repo admin) |
| `workflows` | your fleet auditor | `GH_TOKEN` |
| `asks` | sentences out of reviews + mentions | nothing (runs last) |

## Gotchas that are not in the code

- **Reddit's JSON search answers 403 unauthenticated; the RSS of the same
  search answers 200.** It is rate-limited hard — one query per run — and
  fuzzy: a search for a product name returned a post titled "Vintage Tissot".
  The relevance filter is what makes it usable, not the reader.
- **YouTube stats need `youtube.readonly`.** A poster's token is usually
  `youtube.upload` only, deliberately. Report that as a choice, not a fault.
- **GitHub traffic needs a token with repo admin**; the Actions token is not
  allowed it. "0 views" and "we were not permitted to ask" are different claims.
- **Amazon's `invalid_scope` is a missing MAPPING, not a denial** — attach the
  security profile at My Settings > API Access. And on Amazon, a 404 means the
  route is real with no data, while a 400 means no such route.
- **A hand-kept store row is not the same as a store with no API.** Give each
  row an `api` key saying what is machine-readable, and let the renderer believe
  it — assuming otherwise mislabelled a whole platform for five weeks.
- **`--only` merges.** A partial run must never delete what it did not collect.
- **Mentions and reviews accumulate**, deduped by identity, because a fuzzy
  search that does not repeat is not evidence that a post was deleted.

## The shape of `ops/pulse.json`

```
generatedAt, repoVersion, repoBuild
sources    { name: {ok, note, at} }      ← read this before believing a zero
stale      { section: lastGoodTimestamp }
stores[]   ratings[]  reviews[]  mentions[]  distribution{}
social     { posts[], byPlatform{}, reach{}, totalPosts, deleted, unverified }
health     { workflows[], issues[], catalog{}, playVitals{}, playCrashes[],
             playInstalls{}, playUsers{}, appleDownloads{}, applePerf{} }
github     { stars, views14d, uniques14d, openIssues }
asks[]  loves[]
history[]  ← one compact row per day, scalars only, forever
```

## Tests

| File | Covers |
|---|---|
| `tools/test_pulse_collect.py` | relevance filter, ask/praise rules, parsers, merge, history, and that every credential the collector reads is passed by the workflow |
| `tools/test_pulse_charts.mjs` | that a bar's length is proportional, a bullet clamps, a stack sums, a one-point series draws nothing |

Both were checked to fail against broken versions of each rule. Keep it that
way: a test that has never failed may be asserting nothing.
