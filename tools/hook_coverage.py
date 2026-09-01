"""Which surfaces can this testing system actually REACH, per platform?

A harness can only assert about a screen it can open. Every gap here is a surface
that is not failing — it is unasked, which reads identically in a green report and
is strictly worse, because a gap in coverage looks like a pass.

This reads the four codebases for the launch hooks each one honours and prints the
matrix, so "everything can be driven" is a measured claim rather than a hope.

    python3 tools/hook_coverage.py
"""
import re
import pathlib
import collections

ROOT = pathlib.Path(__file__).resolve().parent.parent

# Each platform: where its hooks live, and how a hook name appears there.
SOURCES = {
    "apple":   (["AppName"], r'environment\["(APP_[A-Z_]+)"\]', {".swift"}),
    "android": (["android/app/src/main"], r'"(appname_[a-z_]+)"', {".kt"}),
    "windows": (["windows/the app.App", "windows/the app.Core"],
                r'(?:GetEnvironmentVariable|Env|Flag)\("(APP_[A-Z_]+)"\)', {".cs"}),
    "web":     (["js"], r"#/([a-z]+)", {".js"}),
}
SKIP = {"bin", "obj", "artifacts", "publish", "node_modules", ".git"}

# The canonical hook per capability, in the Apple spelling. Android/Windows names
# are derived; the web is a route, since its "hook" is the URL.
CAPABILITIES = [
    # The web's "hook" is the URL, so its column names a ROUTE. The home view is "/",
    # not a hash route — asking for a route called "home" reported a gap that was only
    # ever a flaw in this script.
    ("open a tab/section",     "APP_TAB",          "appname_tab",          "APP_TAB",       "daily"),
    ("skip the walkthrough",   "APP_SKIP_ONBOARD", "appname_skip_onboard", "APP_SKIP_ONBOARD", None),
    ("start a round",          "APP_AUTOPLAY",     "appname_autoplay",     "APP_AUTOPLAY",  "daily"),
    ("answer automatically",   "APP_AUTOPILOT",    "appname_autopilot",    "APP_AUTOPILOT", None),
    # Android hosts a night, not a Live EVENT (no cockpit/projector on a phone), so its
    # cell is "-" by design rather than a gap. Marking it NO would be a permanent red
    # for a feature the platform deliberately does not have.
    ("host the app Live",      "APP_LIVE_HOST",    None,                   "APP_LIVE_HOST", "live"),
    ("host a Trivia Night",    "APP_NIGHT_HOST",   "appname_night_host",   "APP_NIGHT_HOST", "live"),
    ("join a room by code",    "APP_LIVE_JOIN",    "appname_live_join",    "APP_LIVE_JOIN", "live"),
    ("join under a set name",  "APP_LIVE_NAME",    "appname_live_name",    "APP_LIVE_NAME", None),
    ("open Settings",          "APP_SETTINGS",     "appname_open",         "APP_SETTINGS",  "profile"),
    ("open the Club paywall",  "APP_PAYWALL",      "appname_open",         "APP_PAYWALL",   None),
    # Android spells this one `appname_club_debug`. Guessing the name from the Apple
    # spelling reported a gap that did not exist — the third false positive this script
    # produced by assuming a naming convention the platforms never agreed to. Every cell
    # here is the name the code actually uses, verified by reading it.
    ("grant Club entitlement", "APP_CLUB",         "appname_club_debug",   "APP_CLUB",      None),
    ("open Pass & Play",       "APP_PARTY",        "appname_party",        "APP_PARTY",     None),
    ("seed records",           "APP_SEED_RECORDS", "appname_seed_records", "APP_SEED_RECORDS", None),
]


# A hook can be DECLARED and never acted on. On Windows the hooks live in one
# LaunchHooks.cs, so finding the env-var string there proves only that someone wrote
# the accessor — the first version of this script reported "yes" for two hooks I had
# declared and not wired, which is the same "assertion that cannot fire" problem it
# exists to find, in the instrument itself. So the Windows column additionally
# requires the ACCESSOR to be referenced somewhere other than its own declaration.
WINDOWS_ACCESSOR = {
    "APP_TAB": "LaunchHooks.Tab",
    "APP_SKIP_ONBOARD": "APP_SKIP_ONBOARD",     # read inline, not via LaunchHooks
    "APP_LIVE_HOST": "LaunchHooks.LiveHost",
    "APP_NIGHT_HOST": "LaunchHooks.NightHost",
    "APP_LIVE_JOIN": "LaunchHooks.LiveJoin",
    "APP_LIVE_NAME": "LaunchHooks.LiveName",
    "APP_SETTINGS": "LaunchHooks.Settings",
    "APP_PAYWALL": "LaunchHooks.Paywall",
    "APP_PARTY": "LaunchHooks.Party",
    "APP_AUTOPLAY": "LaunchHooks.Autoplay",
    "APP_AUTOPILOT": "LaunchHooks.Autopilot",
    "APP_SEED_RECORDS": "LaunchHooks.SeedRecords",
    "APP_CLUB": "APP_CLUB",
}


def windows_wired(key):
    """True when the hook is referenced OUTSIDE its own declaration file."""
    accessor = WINDOWS_ACCESSOR.get(key)
    if accessor is None:
        return False
    for d in ("windows/the app.App", "windows/the app.Core"):
        base = ROOT / d
        for p in base.rglob("*.cs"):
            if SKIP & set(p.relative_to(base).parts) or p.name == "LaunchHooks.cs":
                continue
            if accessor in p.read_text(errors="ignore"):
                return True
    return False


def harvest(platform):
    dirs, pattern, exts = SOURCES[platform]
    found = collections.Counter()
    rx = re.compile(pattern)
    for d in dirs:
        base = ROOT / d
        if not base.exists():
            continue
        for p in base.rglob("*"):
            if p.suffix not in exts or not p.is_file():
                continue
            if SKIP & set(p.relative_to(base).parts):
                continue
            for m in rx.findall(p.read_text(errors="ignore")):
                found[m] += 1
    return found


def main():
    have = {p: harvest(p) for p in SOURCES}
    cols = ["apple", "android", "windows", "web"]
    print(f"{'capability':24} " + " ".join(f"{c:>8}" for c in cols))
    print("-" * 24 + " " + " ".join("-" * 8 for _ in cols))
    gaps = []
    for label, ap, an, wi, web in CAPABILITIES:
        row, keys = [], {"apple": ap, "android": an, "windows": wi, "web": web}
        for c in cols:
            k = keys[c]
            ok = bool(k) and have[c].get(k, 0) > 0
            if ok and c == "windows":
                ok = windows_wired(k)
            row.append("  yes   " if ok else ("   -    " if k is None else "   NO   "))
            if k is not None and not ok:
                gaps.append((label, c, k))
        print(f"{label:24} " + " ".join(row))
    print(f"\n{len(gaps)} surface(s) this system cannot reach:")
    for label, c, k in gaps:
        print(f"  {c:8} {label:24} (needs {k})")
    print("\n'-' = no equivalent on that platform. 'NO' = the capability exists in the "
          "app but nothing can drive it, so it is untested and reads as a pass.")


if __name__ == "__main__":
    main()
