#!/usr/bin/env python3
"""Write each session guide's run-of-show tables from runs-of-show.json.

docs/teaching/runs-of-show.json is the one source a new cohort's sessions
are made from on humanshaped.org. Each guide (before.md, week-1.md to
week-5.md) shows the same plan as tables, between its "## The run of
show" heading and "**What to watch for tonight.**". This rewrites that
part from the JSON, so the guide and the sessions never disagree.

    python3 tools/teaching_tables.py          # rewrite the guides
    python3 tools/teaching_tables.py --check  # exit 1 if any guide is stale
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TEACHING = ROOT / "docs" / "teaching"
KINDS = {"talk": "Talk", "presenter": "Presenter", "question": "Question", "design": "Design stage",
         "rooms": "Rehearsal rooms", "break": "Break", "reflection": "Reflection"}
BOARDS = {"questions": "The three questions", "problem-tests": "Problem tests", "prompt": "Read one real prompt", "blank": "Blank"}
START, END = "## The run of show", "**What to watch for tonight.**"


def what(s):
    c = s.get("config") or {}
    parts = [s.get("body") or ""]
    if c.get("prompt") and s["kind"] in ("rooms", "presenter", "reflection", "question"):
        parts.append('The prompt: "' + c["prompt"] + '"')
    if c.get("template"):
        parts.append("On the board: *" + BOARDS.get(c["template"], c["template"]) + "*.")
    return " ".join(p for p in parts if p).replace("|", "\\|").replace("\n", " ")


def table(scenes, minutes):
    rows = [f"| Minutes ({minutes}) | Scene | Kind | What happens |", "|---|---|---|---|"]
    t = 0
    for s in scenes:
        rows.append(f"| {t}-{t + s['minutes']} | {s['title']} | {KINDS.get(s['kind'], s['kind'])} | {what(s)} |")
        t += s["minutes"]
    return "\n".join(rows)


def rooms_line(scenes):
    r = [s for s in scenes if s["kind"] == "rooms" and (s.get("config") or {}).get("room_scenes")]
    if not r:
        return ""
    steps = r[0]["config"]["room_scenes"]
    each = sum(x["minutes"] for x in steps)
    listed = ", ".join(f"{x['title'][0].lower() + x['title'][1:]} ({x['minutes']})" for x in steps)
    return (f"**In the rehearsal rooms,** each builder's turn runs these scenes, {each} minutes in all: "
            f"{listed}. The room's prompt is on screen the whole time.\n\n")


def section(week):
    out = [START, "", "*Written by Claude, awaiting Ben's review (the rewrite of October 23, 2026, in four parts: "
           "bring back the stage's work, one thing that unblocks the next stage, start it, and the check).* "
           "Generated from [`runs-of-show.json`](runs-of-show.json) by `tools/teaching_tables.py`; change the JSON, then run it.", "",
           table(week["scenes"], sum(s["minutes"] for s in week["scenes"])), "", rooms_line(week["scenes"]).rstrip()]
    for minutes, scenes in sorted((week.get("lengths") or {}).items()):
        out += ["", f"**At {minutes} minutes,** for a cohort of fewer than eight learners, everyone stays in the one call:", "",
                table(scenes, int(minutes))]
    out += ["", "Every scene can be changed on the session's page before it runs, and in the Meet add-on while it runs.", "", ""]
    return "\n".join(x for x in out if x is not None)


def main():
    data = json.loads((TEACHING / "runs-of-show.json").read_text())
    stale = []
    for w in data["weeks"]:
        path = TEACHING / w["guide"]
        text = path.read_text()
        i, j = text.find(START), text.find(END)
        if i < 0 or j < 0:
            sys.exit(f"{path.name} has no run-of-show section to write.")
        new = text[:i] + section(w) + text[j:]
        if new != text:
            stale.append(path.name)
            if "--check" not in sys.argv:
                path.write_text(new)
    if "--check" in sys.argv and stale:
        sys.exit("Out of date with runs-of-show.json: " + ", ".join(stale) + ". Run python3 tools/teaching_tables.py.")
    print(("Rewrote " + ", ".join(stale)) if stale and "--check" not in sys.argv else "Every guide matches runs-of-show.json.")


if __name__ == "__main__":
    main()
