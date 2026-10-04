# Events and conversations, published for the site

*Written by Claude, awaiting Ben's review.*

humanshaped.org shows the events people host on `/events/`, and the next
events and the newest discussions on `/start/`. A visitor's browser
cannot ask GitHub for Discussions without a sign-in, so a workflow does
it once a night (and whenever an event or a discussion changes) and
publishes the answer as a file anyone can read, the same way
`humanshaped/directory` publishes `directory.json`:

```
https://raw.githubusercontent.com/humanshaped/community/main/community.json
```

## Where it goes

Everything in `repo/` belongs at the root of the public
**`humanshaped/community`** repository, the one that already holds the
organization's Discussions (its categories are Announcements, General,
Ideas, Polls, Q&A, and Show and tell). Keeping it there means events,
the issue form, and the conversation all live in the one place people
are already sent to, and the workflow's own `GITHUB_TOKEN` can read
that repository's Discussions with no extra secret.

| File here | Goes to, in humanshaped/community |
|---|---|
| `repo/tools/build_community.py` | `tools/build_community.py` |
| `repo/tools/test_build_community.py` | `tools/test_build_community.py` |
| `repo/.github/workflows/publish.yml` | `.github/workflows/publish.yml` |
| `repo/.github/ISSUE_TEMPLATE/tell-us-about-your-event.yml` | `.github/ISSUE_TEMPLATE/tell-us-about-your-event.yml` |

Then make an empty `events/` folder (a `.gitkeep` is enough) and run
the workflow once from the Actions tab, which writes the first
`community.json`. Until that file exists, `/events/` says the list
could not be reached, and `/start/` simply leaves both parts out.

Copying these files into that repository is a push to another public
repository, so it waits for Ben's yes.

## An event is a file

Each event is `events/<slug>.json`, added by a maintainer from a "Tell
us about your event" issue, or by a pull request a maintainer merges.
Nothing is listed automatically. The file name is the slug (lowercase
letters, numbers, and hyphens).

```json
{
  "title": "Human-Shaped Meetup, Denver",
  "kind": "meetup",
  "starts": "2026-11-07T18:30",
  "ends": "2026-11-07T20:00",
  "time_zone": "America/Denver",
  "place": "A library meeting room",
  "online": null,
  "link": "https://example.org/rsvp",
  "host": "their-github-username",
  "about": "One or two sentences for the listing.",
  "write_up": null
}
```

- `kind` is `meetup`, `hackathon`, `showcase`, or `other`.
- `starts` and `ends` are the host's own local time, as written, with
  no conversion; `ends` may be left out. A date alone (`2026-11-07`)
  means the whole day. `time_zone` is shown beside a time.
- `place`, `online`, or both. Every link must be `https://`.
- `write_up` is added afterward: the discussion where the host posted
  what the room learned. `/events/` shows it under "Already happened".

`python3 tools/build_community.py --check` names every problem in every
listing in plain words, and the workflow runs it on each pull request.

## What community.json holds

```json
{
  "events": [ { "slug": "…", "title": "…", "kind": "…", "starts": "…", "ends": null, "time_zone": "…",
                "place": "…", "online": null, "link": null, "host": "…", "about": "…", "write_up": null } ],
  "threads": [ { "title": "…", "url": "https://github.com/…", "category": "Show and tell", "author": "…",
                 "comments": 2, "created_at": "…", "updated_at": "…" } ]
}
```

`threads` is the ten most recently active discussions, newest first.
The file has no time stamp of its own, so the workflow commits only when
an event or a thread really changed. When GitHub does not answer, the
last published threads are kept.

The site reads it in `assets/community.js`, and `assets/community-lib.js`
checks every field again before showing it, since it is text from
GitHub. `tools/test/fixtures/community.json` is a sample in this shape
for the site's tests; none of it is real.

## Each app's own conversation

`/apps/app/` shows an app's newest three issues, read live from GitHub's
REST API with no sign-in (one call, remembered for ten minutes like the
rest of that page). GitHub lists Discussions only through its GraphQL
API, which needs a sign-in, so for an app that uses Discussions the
page shows its newest three only to a visitor signed in with GitHub on
this site, and the link to join the conversation to everyone.

## Tests

- `python3 tools/community/repo/tools/test_build_community.py`
- `node --test tools/test/community-lib.test.mjs`
