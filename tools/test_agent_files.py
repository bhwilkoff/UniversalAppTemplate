#!/usr/bin/env python3
"""
Every agent reads the same instructions and finds the same skills.

AGENTS.md is the one source. CLAUDE.md imports it for Claude Code, and
GEMINI.md imports it for Gemini CLI. An earlier setup listed AGENTS.md in
.gemini/settings.json `context.fileName` instead; Gemini CLI ignores
workspace settings until a folder is trusted (and under --skip-trust), and
listing it there as well as importing it loads the file twice. This guards
the construction, and checks that every skill a doc names, and every link in
.agents/skills/, resolves to a real SKILL.md. Any .gemini/commands TOML and
.gemini/settings.json must parse.

Run: python3 tools/test_agent_files.py   (exit 0 = pass)
"""
import json
import re
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILLS = ROOT / ".claude/skills"
fails = []


def check(ok, what, detail=""):
    print(f"  {'PASS' if ok else 'FAIL'}  {what}" + (f"  ({detail})" if detail and not ok else ""))
    if not ok:
        fails.append(what)


def first_line(path):
    return path.read_text().splitlines()[0].strip() if path.exists() else ""


check(first_line(ROOT / "CLAUDE.md") == "@AGENTS.md", "CLAUDE.md opens with @AGENTS.md")
check(first_line(ROOT / "GEMINI.md") == "@./AGENTS.md", "GEMINI.md opens with @./AGENTS.md")

settings = ROOT / ".gemini/settings.json"
if settings.exists():
    try:
        data = json.loads(settings.read_text())
        check(True, ".gemini/settings.json parses")
        names = data.get("context", {}).get("fileName", [])
        names = [names] if isinstance(names, str) else names
        check("AGENTS.md" not in names, "AGENTS.md is not also in context.fileName",
              "GEMINI.md already imports it; listing it loads it twice")
    except json.JSONDecodeError as e:
        check(False, ".gemini/settings.json parses", str(e))

for toml in sorted((ROOT / ".gemini/commands").rglob("*.toml")):
    try:
        cmd = tomllib.loads(toml.read_text())
        check("prompt" in cmd, f"{toml.relative_to(ROOT)} has a prompt")
    except tomllib.TOMLDecodeError as e:
        check(False, f"{toml.relative_to(ROOT)} parses", str(e))


def skill_name(skill_md):
    m = re.search(r"^name:\s*(\S+)", skill_md.read_text(), re.M)
    return m.group(1) if m else None


agents_skills = ROOT / ".agents/skills"
for entry in sorted(agents_skills.iterdir()):
    md = entry / "SKILL.md"
    check(md.is_file(), f".agents/skills/{entry.name} resolves to a SKILL.md")
    if md.is_file():
        check(skill_name(md) == entry.name, f".agents/skills/{entry.name} name matches its folder")
    if entry.is_symlink():
        target = entry.resolve()
        check(target.parent == SKILLS.resolve(), f".agents/skills/{entry.name} links into .claude/skills/",
              str(target))

# A hyphenated name in backticks, on a line about skills or in the AGENTS.md
# skill table, is a skill name. Each must exist.
missing = set()
for doc in [ROOT / "AGENTS.md", ROOT / "GEMINI.md", *sorted((ROOT / "docs/path").glob("*.md"))]:
    text = doc.read_text()
    table = re.search(r"^## How we build\n(.*?)^## ", text, re.M | re.S)
    table_lines = set(table.group(1).splitlines()) if table and doc.name == "AGENTS.md" else set()
    lines = text.splitlines()
    for i, line in enumerate(lines):
        window = " ".join(lines[max(0, i - 1): i + 2]).lower()
        if "skill" not in window and not (line.startswith("|") and line in table_lines):
            continue
        for m in re.finditer(r"`([a-z0-9]+(?:-[a-z0-9]+)+)`", line):
            name = m.group(1)
            if not (SKILLS / name).is_dir() and not (agents_skills / name).is_dir():
                missing.add((str(doc.relative_to(ROOT)), name))
check(not missing, "every skill named in AGENTS.md, GEMINI.md, and docs/path exists",
      ", ".join(f"{d}: {n}" for d, n in sorted(missing)))

print(f"\n{'FAIL' if fails else 'PASS'}: {len(fails)} failure(s)")
sys.exit(1 if fails else 0)
