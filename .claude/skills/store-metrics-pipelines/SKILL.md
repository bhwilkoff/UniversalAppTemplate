---
name: store-metrics-pipelines
description: Read downloads, installs, active devices, ratings, reviews and crash clusters out of App Store Connect, Google Play, and the Amazon Appstore. Use when wiring store analytics into a dashboard or report, when a store API returns 403/406/invalid_scope, or when someone says a store "has no API" for the numbers they need.
---

# Getting the numbers out of the stores

Every store exposes its data differently and **none of them the way you would
guess**. Each entry below cost a debugging round; the traps matter more than the
endpoints, because most of them look exactly like a permissions problem and are
not.

The meta-rule: **when a store's numbers are missing, the question is never "is
there an API". It is "what route does this store actually offer, and what shape
does the data come in".**

---

## App Store Connect

Auth is a JWT from a `.p8` key. The client reads the key **off disk** at
`~/.appstoreconnect/private_keys/AuthKey_<KEYID>.p8` — passing the key material
as an env var looks right and reads nothing.

| Want | Endpoint | Note |
|---|---|---|
| Version state per platform | `v1/apps/{id}/appStoreVersions` | filter by `platform`; three platforms are three states |
| Every review, all territories | `v1/apps/{id}/customerReviews` | paged; `include=response` says whether you replied |
| Rating + count | `itunes.apple.com/lookup?id=` | **no auth**, works anywhere |
| Daily downloads | `v1/salesReports` | see below |
| Launch time, hangs, memory | `v1/apps/{id}/perfPowerMetrics` | empty until enough devices opt in |

### Two endpoints do not speak JSON

`salesReports` wants `Accept: application/a-gzip`; `perfPowerMetrics` wants
`Accept: application/vnd.apple.xcode-metrics+json`. Through a client that sets
`Accept: application/json` both answer **406 NOT_ACCEPTABLE**, which reads
exactly like a permission failure. It is not.

### Downloads need a SECOND key, and you cannot widen the first

`salesReports` answers `403 … The API key in use does not allow this request`
for an App Manager key. Apple puts report download under **Finance, Sales,
Admin, Account Holder**; App Manager is "pricing, App Store information, and app
development and delivery".

And the key page says a key **"can't be modified to access more services once
created"** — which its own UI confirms: Edit enables only **Revoke**. There is
no role editor.

So generate a **second** key whose only role is **Sales and Reports**, and keep
it separate from the release key. Widening the credential that ships builds so a
dashboard can read a download count is the wrong trade.

You also need the **vendor number** — App Store Connect → Payments and Financial
Reports, printed beside the legal entity. It is an account identifier, not a
secret.

Rule out first, because the forums are full of Admin keys hitting the same 403:
**agreements** (a missing or expired one produces it) and a wrong vendor number.

Filter the TSV by `Product Type Identifier` — `1`, `1T`, `1E`, `1EP`, `1EU`,
`IA1` are first-time downloads; the rest are updates and redownloads, which are
not new people.

---

## Google Play

Google's data is the richest of the three, and the good half is in no API.

### Vitals and crashes: `playdeveloperreporting`

Enable the API first (`gcloud services enable
playdeveloperreporting.googleapis.com`); a service account cannot enable it for
itself. Then:

- `vitals.crashrate` / `anrrate` — rates, plus `distinctUsers`
- `vitals.errors.issues.search` — **the crash clusters**: cause, location, first
  and last app version, API range, last seen, and a Console URL
- `vitals.errors.reports.search` with `filter='errorIssueId = "<id>"'` — the
  actual stack trace, from which you want *your own* first frame

Three traps:

1. **A metric set advertises the window it holds** — `freshnessInfo`, the
   `DAILY` entry's `latestEndTime`. Querying past it is a **400** that reads
   like a malformed request. Ask, then query to that date; never guess at
   "today".
2. **`sampleErrorReportLimit` accepts only 0 or 1.**
3. **Rates and `distinctUsers` are WITHHELD below a minimum audience.** The
   queries are accepted and return nothing. "The reader works and Play will not
   publish it yet" is a completely different sentence from "the reader is
   broken", and a dashboard must say the first.

### Installs and active devices: a Cloud Storage bucket

There is no API. The Console writes monthly CSVs to
`gs://pubsite_prod_rev_<id>/stats/`.

- **That id is NOT the developer id in the Console URL** and cannot be derived
  from it. Play Console → Download reports → Statistics → *Copy Cloud Storage
  URI*.
- Grant the service account **"View app information and download bulk reports
  (read-only)"** in Play Console → Users and permissions. Play cascades three
  implied read-only permissions with it, and the save is behind a confirmation
  dialog that is easy to miss.
- **The grant takes HOURS to reach the bucket's ACLs.** A correctly-permitted
  service account reads 403 in the meantime. Fall back to the developer's own
  `gcloud` locally and the reader works today.
- The objects are **gzip-encoded**: `gcloud storage cp` decompresses on download
  and `cat` does **not**, so the same object arrives differently depending on
  how you fetched it — and gzipped bytes parse as a one-column CSV of mojibake
  rather than failing.
- They are **UTF-16 with a BOM and CRLF**. Assume UTF-8 and you get mojibake
  headers; leave the CRLF and `csv` reports "new-line character seen in unquoted
  field" for the whole file.
- The bucket holds **other apps'** reports. Scope every object name to the
  package.

Files per month: `overview`, `country`, `device`, `os_version`, `app_version`,
`language`, `carrier`. `overview` carries Daily Device Installs, Uninstalls,
Upgrades, **Active Device Installs**, and the user-level equivalents.

### Reviews

`androidpublisher.reviews.list` returns roughly the **last week only**. An empty
answer is normal and is not "no reviews exist" — say so.

---

## Amazon Appstore

There **is** a Reporting/Vitals API — `POST
developer.amazon.com/api/appstore/vitals/apps/{pkg}/{metricSet}:query`, the same
shape as Google's, with `crashMetricSet`, `anrMetricSet` and `lmkMetricSet`.
Scope `adx_reporting::appstore:marketer`, token from
`https://api.amazon.com/auth/o2/token` by client credentials.

### `invalid_scope` means the profile is not MAPPED — it is not a denial

This is the single most expensive trap in this file, because it reads exactly
like an account permissions problem and is not.

A security profile must be **attached to each API individually** at
**My Settings → Enterprise Security Features → API Access**
(`/apps-and-games/console/api-access/home.html`). Creating the profile and
enabling Login with Amazon is *not* enough — the page will read "No Security
Profile Attached" while every scope answers `invalid_scope`. Attaching is two
clicks and grants the scope immediately.

Do not look for `/settings/console/apiaccess` (404). The Vitals **API Explorer**
is separately at `/reporting/console/appstore/apiaccess`, and it is the fastest
way to see the exact request shape for your app.

### The 404-vs-400 route discriminator

Amazon does not document its route list, so probe it:

| Answer | Meaning |
|---|---|
| `404 NOT_FOUND` | the route is **real**; there is no data for this app |
| `400 "Unable to fetch the request scope for uri = ..."` | **no such route** |

That is how you establish the API's real surface. Probed with a valid token,
every non-vitals path — `/sales`, `/reports`, `/apps`, `/reporting/*` — answers
400. **Vitals is the whole reporting API.** Unit sales exist only in the console
(My Reports → App Analytics → Overview/Units), so hand-declare them.

### An empty answer is not a broken reader

A young app has no vitals: all metric sets answer 404 and the console's own App
Health page is equally blank. Report "authenticated; the store holds no vitals
for this app yet", never a zero and never a failure.

## The stores with no API at all

Roku, LG Content Store and Samsung Apps TV expose nothing. Keep them in a
hand-edited file (`ops/stores-manual.json`) and show them beside the
machine-read ones — a dashboard showing only the machine-readable half of the
estate quietly forgets the rest.

---

## Recording what you ruled out

Every entry above was found by an assumption that looked like a permissions
problem. When one is settled, write the trap down next to the reader — a
disproven hypothesis in a docstring is worth as much as the fix, because it
stops the next session re-walking it.

## See also

- `product-pulse-dashboard` — the page these feed
- `apple-app-store-cli-submission` — the submission side of the same APIs
- `architectural-decision-log` — log the route chosen and the ones rejected
