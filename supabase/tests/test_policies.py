#!/usr/bin/env python3
"""Prove the hub's row-level security does what DECISIONS.md says.

Runs the migrations against a throwaway local Postgres (the `pgserver`
package, no Docker), with a small stand-in for Supabase's auth schema,
then acts as different people and checks what each can see and do.

    python3.12 -m venv .venv && .venv/bin/pip install pgserver psycopg2-binary
    .venv/bin/python supabase/tests/test_policies.py
"""
import sys
import tempfile
import uuid
from pathlib import Path

import pgserver
import psycopg2

ROOT = Path(__file__).resolve().parents[1]

AUTH_STUB = """
create role anon nologin;
create role authenticated nologin;
create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
"""

GRANTS = """
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
"""

results = []
last_rows = []


def check(name, ok):
    results.append((name, ok))
    print(("PASS " if ok else "FAIL ") + name)


def main():
    tmp = tempfile.mkdtemp()
    server = pgserver.get_server(tmp, cleanup_mode="delete")
    conn = psycopg2.connect(server.get_uri())
    conn.autocommit = True
    su = conn.cursor()
    su.execute(AUTH_STUB)
    for path in sorted((ROOT / "migrations").glob("*.sql")):
        su.execute(path.read_text())
    su.execute(GRANTS)

    people = {}
    for name in ["ben", "bea", "cal", "dee"]:
        uid = str(uuid.uuid4())
        su.execute(
            "insert into auth.users (id, raw_user_meta_data) values (%s, %s)",
            (uid, f'{{"user_name": "{name}", "provider_id": "{abs(hash(name)) % 10**8}", "avatar_url": "https://example.org/{name}.png"}}'),
        )
        people[name] = uid
    su.execute("insert into public.teachers (user_id) values (%s)", (people["ben"],))

    def as_user(name):
        cur = conn.cursor()
        cur.execute("reset role")
        if name is None:
            cur.execute("set role anon")
            cur.execute("select set_config('request.jwt.claim.sub', '', false)")
        else:
            cur.execute("set role authenticated")
            cur.execute("select set_config('request.jwt.claim.sub', %s, false)", (people[name],))
        return cur

    def attempt(cur, sql, args=()):
        try:
            cur.execute("savepoint s")
            cur.execute(sql, args)
            last_rows[:] = cur.fetchall() if cur.description else []
            cur.execute("release savepoint s")
            return True
        except psycopg2.Error as err:
            reason = (err.pgerror or str(err)).strip().splitlines()[0]
            print(f"     refused: {reason}")
            cur.execute("rollback to savepoint s")
            return False

    conn.autocommit = False

    su.execute("select github_login from public.profiles order by github_login")
    check("a profile is made from GitHub on first sign-in", [r[0] for r in su.fetchall()] == ["bea", "ben", "cal", "dee"])

    ben = as_user("ben")
    ok = attempt(ben, "insert into public.cohorts (slug, title, created_by) values ('fall-2026', 'Fall 2026', %s) returning id", (people["ben"],))
    cohort = last_rows[0][0] if ok else None
    check("a teacher can create a cohort", ok)
    ben.execute("select count(*) from public.cohort_teachers where cohort_id = %s and user_id = %s", (cohort, people["ben"]))
    check("whoever creates a cohort teaches it", ben.fetchone()[0] == 1)
    bea = as_user("bea")
    check("a student cannot make themselves a cohort's teacher",
          not attempt(bea, "insert into public.cohort_teachers (cohort_id, user_id) values (%s, %s)", (cohort, people["bea"])))

    bea = as_user("bea")
    check("someone who is not a teacher cannot create a cohort",
          not attempt(bea, "insert into public.cohorts (slug, title, created_by) values ('nope', 'Nope', %s)", (people["bea"],)))

    anon = as_user(None)
    anon.execute("select count(*) from public.cohorts")
    check("a draft cohort is hidden from the public", anon.fetchone()[0] == 0)

    bea = as_user("bea")
    check("no one can join a draft cohort",
          not attempt(bea, "insert into public.enrollments (cohort_id, user_id) values (%s, %s)", (cohort, people["bea"])))

    ben = as_user("ben")
    ben.execute("update public.cohorts set status = 'open' where id = %s", (cohort,))
    anon = as_user(None)
    anon.execute("select count(*) from public.cohorts")
    check("an open cohort is public", anon.fetchone()[0] == 1)

    bea = as_user("bea")
    check("a student can join an open cohort",
          attempt(bea, "insert into public.enrollments (cohort_id, user_id, app_repo) values (%s, %s, 'bea/garden-swap')", (cohort, people["bea"])))
    check("a student cannot join as a mentor",
          not attempt(bea, "insert into public.enrollments (cohort_id, user_id, role) values (%s, %s, 'mentor')", (cohort, people["bea"])))
    cal = as_user("cal")
    check("a second student can join",
          attempt(cal, "insert into public.enrollments (cohort_id, user_id) values (%s, %s)", (cohort, people["cal"])))
    dee = as_user("dee")
    check("no one can enroll someone else",
          not attempt(dee, "insert into public.enrollments (cohort_id, user_id) values (%s, %s)", (cohort, people["bea"])))

    bea = as_user("bea")
    check("a student can share with their cohort",
          attempt(bea, "insert into public.shares (cohort_id, user_id, kind, url, note) values (%s, %s, 'bring-back', 'https://bea.github.io/garden-swap', 'My first round') returning id", (cohort, people["bea"])))
    share = last_rows[0][0]
    check("a share must link to https",
          not attempt(bea, "insert into public.shares (cohort_id, user_id, kind, url) values (%s, %s, 'bring-back', 'javascript:alert(1)')", (cohort, people["bea"])))

    cal = as_user("cal")
    cal.execute("select count(*) from public.shares where id = %s", (share,))
    check("a classmate can see what was shared", cal.fetchone()[0] == 1)
    cal.execute("select count(*) from public.profiles where id = %s", (people["bea"],))
    check("a classmate can see a classmate's profile", cal.fetchone()[0] == 1)
    cal.execute("select app_repo from public.enrollments where user_id = %s", (people["bea"],))
    row = cal.fetchone()
    check("a classmate can see which repository a classmate is building", row is not None and row[0] == "bea/garden-swap")
    check("a classmate can give feedback",
          attempt(cal, "insert into public.feedback (share_id, author_id, body) values (%s, %s, 'The seedling list made me smile.')", (share, people["cal"])))
    cal.execute("update public.shares set note = 'changed' where id = %s", (share,))
    check("a classmate cannot change someone else's share", cal.rowcount == 0)

    dee = as_user("dee")
    dee.execute("select count(*) from public.shares")
    check("someone outside the cohort sees no shares", dee.fetchone()[0] == 0)
    dee.execute("select count(*) from public.profiles where id = %s", (people["bea"],))
    check("someone outside the cohort cannot see a member's profile", dee.fetchone()[0] == 0)
    dee.execute("select count(*) from public.enrollments")
    check("someone outside the cohort sees no roster", dee.fetchone()[0] == 0)

    bea = as_user("bea")
    check("a student can give a calendar email for invitations",
          attempt(bea, "insert into public.calendar_contacts (cohort_id, user_id, email) values (%s, %s, 'bea@example.org')", (cohort, people["bea"])))
    cal = as_user("cal")
    cal.execute("select count(*) from public.calendar_contacts where user_id = %s", (people["bea"],))
    check("a classmate never sees another student's email", cal.fetchone()[0] == 0)
    ben = as_user("ben")
    ben.execute("select count(*) from public.calendar_contacts where cohort_id = %s", (cohort,))
    check("the teacher can see the emails given for invitations", ben.fetchone()[0] == 1)

    ben = as_user("ben")
    ben.execute("select count(*) from public.shares where cohort_id = %s", (cohort,))
    check("the teacher sees the cohort's shares", ben.fetchone()[0] == 1)

    bea = as_user("bea")
    bea.execute("select public.leave_cohort(%s)", (cohort,))
    cal = as_user("cal")
    cal.execute("select count(*) from public.shares where user_id = %s", (people["bea"],))
    check("when someone leaves, what they shared leaves with them", cal.fetchone()[0] == 0)
    su3 = conn.cursor(); su3.execute("reset role")
    su3.execute("select count(*) from public.calendar_contacts where user_id = %s", (people["bea"],))
    check("when someone leaves, their calendar email leaves too", su3.fetchone()[0] == 0)
    cal = as_user("cal")  # the check above switched the session back to the superuser
    cal.execute("select count(*) from public.profiles where id = %s", (people["bea"],))
    check("after leaving, a former classmate's profile is no longer visible", cal.fetchone()[0] == 0)

    cal = as_user("cal")
    cal.execute("select public.delete_my_account()")
    su2 = conn.cursor()
    su2.execute("reset role")
    su2.execute("select count(*) from public.enrollments where user_id = %s", (people["cal"],))
    gone = su2.fetchone()[0] == 0
    su2.execute("select count(*) from auth.users where id = %s", (people["cal"],))
    check("deleting my account removes me everywhere", gone and su2.fetchone()[0] == 0)

    conn.rollback()
    conn.close()
    failed = [n for n, ok in results if not ok]
    print(f"\n{len(results) - len(failed)} of {len(results)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
