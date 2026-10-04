#!/usr/bin/env python3
"""Tests for build_community.py. Run: python3 tools/test_build_community.py"""
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_community as b  # noqa: E402

GOOD = {
    "title": "Human-Shaped Meetup, Denver",
    "kind": "meetup",
    "starts": "2026-11-07T18:30",
    "ends": "2026-11-07T20:00",
    "time_zone": "America/Denver",
    "place": "A library meeting room",
    "online": None,
    "link": None,
    "host": "bhwilkoff",
    "about": "An evening reading the principles out loud.",
    "write_up": None,
}


class Listings(unittest.TestCase):
    def check(self, **change):
        e = dict(GOOD, **change)
        return b.problems_with("denver-meetup", e)

    def test_a_good_listing_has_no_problems(self):
        self.assertEqual(self.check(), [])

    def test_each_rule(self):
        self.assertTrue(self.check(title=" "))
        self.assertTrue(self.check(kind="party"))
        self.assertTrue(self.check(starts="Nov 7"))
        self.assertTrue(self.check(starts="2026-11-07T25:00"))
        self.assertTrue(self.check(ends="2026-11-01"))
        self.assertTrue(self.check(host="not a login"))
        self.assertTrue(self.check(online="http://example.org"))
        self.assertTrue(self.check(write_up="javascript:alert(1)"))
        self.assertTrue(self.check(place="", online=None))
        self.assertTrue(self.check(about="x" * 401))
        self.assertTrue(self.check(surprise=1))
        self.assertTrue(b.problems_with("Denver Meetup", GOOD))

    def test_read_events_sorts_and_reports(self):
        with tempfile.TemporaryDirectory() as d:
            folder = Path(d)
            (folder / "b.json").write_text(json.dumps(dict(GOOD, starts="2026-12-01", ends=None)))
            (folder / "a.json").write_text(json.dumps(GOOD))
            (folder / "broken.json").write_text("{")
            events, problems = b.read_events(folder)
            self.assertEqual([e["slug"] for e in events], ["a", "b"])
            self.assertEqual(len(problems), 1)
            self.assertIn("broken.json", problems[0])

    def test_no_token_means_no_threads_read(self):
        self.assertIsNone(b.read_threads("humanshaped/community", None))


if __name__ == "__main__":
    unittest.main()
