#!/usr/bin/env python3
"""Copy the template's published plan into assets/curriculum-lib.js's fallback.

The hub seeds a new cohort's runs of show from the template's
docs/teaching/runs-of-show.json on main, and falls back to curriculum-lib.js's
WEEKS when that file cannot be read. The fallback is copied from the published
file, never written by hand, so the two say the same thing:

    python3 tools/sync_curriculum_fallback.py path/to/runs-of-show.json

tools/test/curriculum-lib.test.mjs checks they still agree, against the copy
kept in tools/test/fixtures-runs-of-show-main.json.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIB = ROOT / "assets" / "curriculum-lib.js"
START = "  var WEEKS = {"
HEAD = """  // Each week, as the template's docs/teaching/runs-of-show.json
  // publishes it (COURSE.md's week table and research note 06, which Ben
  // approved on October 7, 2026): the design stage's board, the rehearsal
  // rooms' prompt and the teacher's note, and the week's questions. This is
  // only the fallback for when that file cannot be read, so it is copied
  // from it by tools/sync_curriculum_fallback.py, never written by hand;
  // tools/test/curriculum-lib.test.mjs checks the two still agree. The
  // questions' first is the one the closing question scene asks; every one
  // goes into the cohort's question bank, ready to ask instead.
"""


def js(value):
    return json.dumps(value, ensure_ascii=False)


def week_block(week):
    key = "prep" if week["week"] == 0 else str(week["week"])
    design = [s for s in week["scenes"] if s["kind"] == "design"][0]
    room = [s for s in week["scenes"] if s["kind"] == "rooms"][0]
    questions = []
    for q in week.get("questions", []):
        item = {"kind": q["kind"], "prompt": q["prompt"]}
        if q.get("choices"):
            item["choices"] = q["choices"]
        if q.get("points"):
            item["points"] = q["points"]
        questions.append("        " + js(item))
    return (
        f"    {key}: {{\n"
        f"      template: {js(design.get('config', {}).get('template'))},\n"
        f"      room: {js(room['config']['prompt'])},\n"
        f"      watch: {js(room.get('note') or '')},\n"
        "      questions: [\n" + ",\n".join(questions) + "\n      ]\n    }"
    )


def main():
    plan = json.loads(Path(sys.argv[1]).read_text())
    text = LIB.read_text()
    start = text.index(START)
    end = text.index("  };", start) + len("  };")
    head_start = text.rfind("\n\n", 0, start) + 2
    body = START + "\n" + ",\n".join(week_block(w) for w in plan["weeks"]) + "\n  };"
    LIB.write_text(text[:head_start] + HEAD + body + text[end:])
    print("Updated", LIB.relative_to(ROOT))


if __name__ == "__main__":
    main()
