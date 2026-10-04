#!/usr/bin/env python3
"""Build community.json for humanshaped.org.

Runs in the public humanshaped/community repository (see
tools/community/README.md in the site branch of UniversalAppTemplate).
It reads every event listing in events/*.json, checks each one, asks
GitHub for the newest threads in this repository's Discussions, and
writes community.json, which humanshaped.org reads at
https://raw.githubusercontent.com/humanshaped/community/main/community.json.

Nothing is listed automatically: an event is a file in events/, added by
a maintainer or by a pull request a maintainer merges, the way the
directory lists apps. The file carries no time stamp, so the workflow
only commits when an event or a thread actually changed.

Usage:
  python3 tools/build_community.py            # writes community.json
  python3 tools/build_community.py --check    # checks events/ only, writes nothing
"""
import json
import os
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KINDS = {"meetup", "hackathon", "showcase", "other"}
STAMP = re.compile(r"^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(T([01]\d|2[0-3]):[0-5]\d)?$")
LOGIN = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$")
SLUG = re.compile(r"^[a-z0-9-]{1,80}$")
FIELDS = ("title", "kind", "starts", "ends", "time_zone", "place", "online", "link", "host", "about", "write_up")
LIMITS = {"title": 120, "time_zone": 60, "place": 160, "about": 400}
THREADS = 10

QUERY = """query($owner:String!,$name:String!,$n:Int!){repository(owner:$owner,name:$name){
discussions(first:$n,orderBy:{field:UPDATED_AT,direction:DESC}){nodes{
title url createdAt updatedAt author{login} comments{totalCount} category{name}}}}}"""


def problems_with(slug, e):
    """Everything wrong with one listing, in plain words. Empty when it is fine."""
    out = []
    if not SLUG.match(slug):
        out.append("its file name must be lowercase letters, numbers, and hyphens")
    if not isinstance(e, dict):
        return out + ["it is not a JSON object"]
    extra = sorted(set(e) - set(FIELDS))
    if extra:
        out.append("it has fields this format does not use: " + ", ".join(extra))
    if not isinstance(e.get("title"), str) or not e["title"].strip():
        out.append("it needs a title")
    if e.get("kind") not in KINDS:
        out.append("its kind must be one of " + ", ".join(sorted(KINDS)))
    for f in ("starts", "ends"):
        v = e.get(f)
        if (f == "starts" or v is not None) and not (isinstance(v, str) and STAMP.match(v)):
            out.append(f"{f} must look like 2026-11-07 or 2026-11-07T18:30")
    if isinstance(e.get("starts"), str) and isinstance(e.get("ends"), str) and e["ends"][:10] < e["starts"][:10]:
        out.append("it ends before it starts")
    if not (isinstance(e.get("host"), str) and LOGIN.match(e["host"])):
        out.append("host must be the GitHub username of the person hosting it")
    for f in ("online", "link", "write_up"):
        v = e.get(f)
        if v is not None and not (isinstance(v, str) and v.startswith("https://")):
            out.append(f"{f} must be an https link, or null")
    for f, n in LIMITS.items():
        v = e.get(f)
        if v is not None and not isinstance(v, str):
            out.append(f"{f} must be text")
        elif isinstance(v, str) and len(v) > n:
            out.append(f"{f} is longer than {n} characters")
    if not e.get("place") and not e.get("online"):
        out.append("it needs a place, an online link, or both")
    return out


def read_events(folder):
    events, problems = [], []
    for path in sorted(folder.glob("*.json")):
        slug = path.stem
        try:
            e = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as err:
            problems.append(f"{path.name}: it is not valid JSON ({err})")
            continue
        found = problems_with(slug, e)
        if found:
            problems.extend(f"{path.name}: {p}" for p in found)
            continue
        row = {"slug": slug}
        for f in FIELDS:
            v = e.get(f)
            row[f] = v.strip() if isinstance(v, str) else v
        events.append(row)
    events.sort(key=lambda r: (r["starts"], r["slug"]))
    return events, problems


def read_threads(repo, token):
    """The newest public threads, or None when GitHub could not answer."""
    if not token:
        return None
    owner, name = repo.split("/", 1)
    body = json.dumps({"query": QUERY, "variables": {"owner": owner, "name": name, "n": THREADS}}).encode()
    req = urllib.request.Request("https://api.github.com/graphql", data=body, headers={
        "Authorization": "Bearer " + token, "Content-Type": "application/json", "User-Agent": "humanshaped-community"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.loads(r.read().decode())
    except Exception as err:  # noqa: BLE001 - any failure keeps the last published threads
        print(f"GitHub did not answer: {err}", file=sys.stderr)
        return None
    nodes = (((data.get("data") or {}).get("repository") or {}).get("discussions") or {}).get("nodes")
    if nodes is None:
        print(f"GitHub answered without discussions: {data.get('errors')}", file=sys.stderr)
        return None
    out = []
    for d in nodes:
        if not d or not str(d.get("url", "")).startswith("https://github.com/"):
            continue
        out.append({
            "title": d.get("title") or "",
            "url": d["url"],
            "category": (d.get("category") or {}).get("name") or "",
            "author": (d.get("author") or {}).get("login"),
            "comments": (d.get("comments") or {}).get("totalCount") or 0,
            "created_at": d.get("createdAt"),
            "updated_at": d.get("updatedAt"),
        })
    return out


def main(argv):
    events, problems = read_events(ROOT / "events")
    if problems:
        print("These event listings need fixing before they can be published:", file=sys.stderr)
        for p in problems:
            print("  " + p, file=sys.stderr)
        return 1
    if "--check" in argv:
        print(f"{len(events)} event listing(s) are fine.")
        return 0
    out_path = ROOT / "community.json"
    threads = read_threads(os.environ.get("GITHUB_REPOSITORY", "humanshaped/community"), os.environ.get("GITHUB_TOKEN"))
    if threads is None:
        try:
            threads = json.loads(out_path.read_text(encoding="utf-8")).get("threads", [])
        except (OSError, ValueError):
            threads = []
    out = {"events": events, "threads": threads}
    out_path.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(events)} event(s) and {len(threads)} thread(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
