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
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
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
    for name in ["bhwilkoff", "bea", "cal", "dee"]:
        uid = str(uuid.uuid4())
        su.execute(
            "insert into auth.users (id, raw_user_meta_data) values (%s, %s)",
            (uid, f'{{"user_name": "{name}", "provider_id": "{abs(hash(name)) % 10**8}", "avatar_url": "https://example.org/{name}.png"}}'),
        )
        people[name] = uid
    people["ben"] = people["bhwilkoff"]

    def as_agent(name):
        """The same person, through their own AI agent's OAuth token."""
        cur = as_user(name)
        cur.execute("select set_config('request.jwt.claims', %s, false)", ('{"client_id": "claude-test"}',))
        return cur

    def as_user(name):
        cur = conn.cursor()
        cur.execute("reset role")
        cur.execute("select set_config('request.jwt.claims', '', false)")
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
    check("a profile is made from GitHub on first sign-in", [r[0] for r in su.fetchall()] == ["bea", "bhwilkoff", "cal", "dee"])
    su.execute("select count(*) from public.teachers")
    check("Ben becomes the first teacher on his first sign-in, and no one else does", su.fetchone()[0] == 1)

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

    # Showing an app in public is the student's own choice, and the public
    # reads three fields of it, never the roster (hub-privacy-notes.md).
    anon = as_user(None)
    anon.execute("select * from public.public_apps()")
    check("the public sees no cohort app until its student chooses to show it", anon.fetchall() == [])
    anon.execute("select count(*) from public.enrollments")
    check("the public still cannot read who is in a cohort", anon.fetchone()[0] == 0)
    ben = as_user("ben")
    check("a teacher cannot show a student's app in public",
          not attempt(ben, "update public.enrollments set app_public = true where user_id = %s", (people["bea"],)))
    cal = as_user("cal")
    cal.execute("update public.enrollments set app_public = true where user_id = %s", (people["bea"],))
    check("a classmate cannot show someone else's app in public", cal.rowcount == 0)
    bea = as_user("bea")
    check("a student can choose to show their app in public",
          attempt(bea, "update public.enrollments set app_public = true where user_id = %s", (people["bea"],)))
    anon = as_user(None)
    anon.execute("select * from public.public_apps()")
    rows = anon.fetchall()
    cols = [d[0] for d in anon.description]
    check("a shown app is public with only its name, repository, and address",
          cols == ["app_name", "app_repo", "app_url"] and [r[1] for r in rows] == ["bea/garden-swap"])
    # The student's "it is ready" and the teacher's hide are two switches,
    # and neither person can move the other's (migration 20261003090000).
    ben = as_user("ben")
    check("a teacher cannot turn off a student's word that their app is ready",
          not attempt(ben, "update public.enrollments set app_public = false where user_id = %s", (people["bea"],)))
    cal = as_user("cal")
    check("a classmate cannot hide someone else's app",
          not attempt(cal, "insert into public.app_hides (cohort_id, user_id, hidden_by) values (%s, %s, %s)", (cohort, people["bea"], people["cal"])))
    dee = as_user("dee")
    check("someone outside the cohort cannot hide an app in it",
          not attempt(dee, "insert into public.app_hides (cohort_id, user_id, hidden_by) values (%s, %s, %s)", (cohort, people["bea"], people["dee"])))
    bea = as_user("bea")
    check("a student cannot use the teacher's hide on their own app",
          not attempt(bea, "insert into public.app_hides (cohort_id, user_id, hidden_by) values (%s, %s, %s)", (cohort, people["bea"], people["bea"])))
    ben = as_user("ben")
    check("a teacher cannot hide an app in someone else's name",
          not attempt(ben, "insert into public.app_hides (cohort_id, user_id, hidden_by) values (%s, %s, %s)", (cohort, people["bea"], people["cal"])))
    ben_agent = as_agent("ben")
    check("a teacher's agent cannot hide an app",
          not attempt(ben_agent, "insert into public.app_hides (cohort_id, user_id, hidden_by) values (%s, %s, %s)", (cohort, people["bea"], people["ben"])))
    ben = as_user("ben")
    check("a teacher can hide an app from public view, with a reason",
          attempt(ben, "insert into public.app_hides (cohort_id, user_id, hidden_by, reason) values (%s, %s, %s, 'It names a client.')", (cohort, people["bea"], people["ben"])))
    anon = as_user(None)
    anon.execute("select count(*) from public.public_apps()")
    check("a hidden app is no longer in the public list", anon.fetchone()[0] == 0)
    anon.execute("select count(*) from public.app_hides")
    check("the public cannot read what is hidden, or why", anon.fetchone()[0] == 0)
    cal = as_user("cal")
    cal.execute("select app_repo, app_public from public.enrollments where user_id = %s", (people["bea"],))
    check("a hidden app stays on the cohort's own pages, still marked ready", cal.fetchone() == ("bea/garden-swap", True))
    cal.execute("select count(*) from public.app_hides")
    check("a classmate cannot see that an app is hidden, or why", cal.fetchone()[0] == 0)
    cal.execute("delete from public.app_hides where user_id = %s", (people["bea"],))
    check("a classmate cannot show a hidden app again", cal.rowcount == 0)
    dee = as_user("dee")
    dee.execute("select count(*) from public.app_hides")
    check("someone outside the cohort sees no hides", dee.fetchone()[0] == 0)
    bea = as_user("bea")
    bea.execute("select reason from public.app_hides where user_id = %s", (people["bea"],))
    check("the student sees that their app is hidden, and why", bea.fetchone() == ("It names a client.",))
    bea.execute("delete from public.app_hides where user_id = %s", (people["bea"],))
    check("a student cannot undo the teacher's hide", bea.rowcount == 0)
    bea.execute("update public.app_hides set reason = null where user_id = %s", (people["bea"],))
    check("a student cannot change the teacher's reason", bea.rowcount == 0)
    check("a student can still turn their own switch while the app is hidden",
          attempt(bea, "update public.enrollments set app_public = false where user_id = %s", (people["bea"],))
          and attempt(bea, "update public.enrollments set app_public = true where user_id = %s", (people["bea"],)))
    anon = as_user(None)
    anon.execute("select count(*) from public.public_apps()")
    check("turning it back on does not undo the hide", anon.fetchone()[0] == 0)
    agent = as_agent("bea")
    agent.execute("delete from public.app_hides where user_id = %s", (people["bea"],))
    check("a student's agent cannot undo the hide", agent.rowcount == 0)
    agent.execute("select count(*) from public.app_hides where user_id = %s", (people["bea"],))
    check("a student's agent can read that the student's app is hidden", agent.fetchone()[0] == 1)
    ben_agent = as_agent("ben")
    ben_agent.execute("delete from public.app_hides where user_id = %s", (people["bea"],))
    check("a teacher's agent cannot show a hidden app again", ben_agent.rowcount == 0)
    ben = as_user("ben")
    ben.execute("update public.app_hides set reason = 'It names a client, for now.' where user_id = %s", (people["bea"],))
    check("a teacher can change the reason", ben.rowcount == 1)
    ben.execute("delete from public.app_hides where user_id = %s", (people["bea"],))
    anon = as_user(None)
    anon.execute("select app_repo from public.public_apps()")
    check("a teacher can show it again, and it is back in the public list", ben.rowcount == 1 and anon.fetchall() == [("bea/garden-swap",)])

    ben = as_user("ben")
    check("a teacher can name the cohort's private repository and team",
          attempt(ben, "update public.cohorts set github_repo = 'humanshaped/cohort-fall-2026', github_team = 'cohort-fall-2026' where id = %s", (cohort,)))
    check("a cohort's repository must be in the humanshaped organization",
          not attempt(ben, "update public.cohorts set github_repo = 'someone/else' where id = %s", (cohort,)))
    bea = as_user("bea")
    bea.execute("update public.cohorts set github_team = 'mine' where id = %s", (cohort,))
    check("a student cannot change the cohort's team", bea.rowcount == 0)
    check("a student cannot mark themselves a member of the cohort's team",
          not attempt(bea, "insert into public.github_access (cohort_id, user_id, state) values (%s, %s, 'member')", (cohort, people["bea"])))
    su4 = conn.cursor(); su4.execute("reset role")
    su4.execute("insert into public.github_access (cohort_id, user_id, state) values (%s, %s, 'invited'), (%s, %s, 'member')",
                (cohort, people["bea"], cohort, people["cal"]))
    bea = as_user("bea")
    bea.execute("select user_id from public.github_access")
    check("a student sees only their own GitHub access", [str(r[0]) for r in bea.fetchall()] == [people["bea"]])
    bea.execute("update public.github_access set state = 'member' where user_id = %s", (people["bea"],))
    check("a student cannot change their own GitHub access", bea.rowcount == 0)
    ben = as_user("ben")
    ben.execute("select count(*) from public.github_access where cohort_id = %s", (cohort,))
    check("the teacher sees everyone's GitHub access", ben.fetchone()[0] == 2)
    dee = as_user("dee")
    dee.execute("select count(*) from public.github_access")
    check("someone outside the cohort sees no GitHub access", dee.fetchone()[0] == 0)

    # A student's own AI agent reads what they can read, and writes nothing.
    agent = as_agent("bea")
    agent.execute("select count(*) from public.shares where cohort_id = %s", (cohort,))
    check("a student's agent can read what the student shared with the cohort", agent.fetchone()[0] == 1)
    agent.execute("select count(*) from public.sessions where cohort_id = %s", (cohort,))
    check("a student's agent reads the cohort without error", agent.fetchone() is not None)
    check("a student's agent cannot share on their behalf",
          not attempt(agent, "insert into public.shares (cohort_id, user_id, kind, note) values (%s, %s, 'ai-review', 'from the agent')", (cohort, people["bea"])))
    check("a student's agent cannot give feedback",
          not attempt(agent, "insert into public.feedback (share_id, author_id, body) values (%s, %s, 'from the agent')", (share, people["bea"])))
    agent.execute("update public.enrollments set app_name = 'renamed by agent' where user_id = %s", (people["bea"],))
    check("a student's agent cannot change their app details", agent.rowcount == 0)
    agent.execute("update public.enrollments set app_public = false where user_id = %s", (people["bea"],))
    check("a student's agent cannot change whether their app is shown", agent.rowcount == 0)
    agent.execute("select count(*) from public.calendar_contacts where user_id = %s", (people["bea"],))
    check("a student's agent cannot read even their own calendar email", agent.fetchone()[0] == 0)
    check("a student's agent cannot leave the cohort for them",
          not attempt(agent, "select public.leave_cohort(%s)", (cohort,)))
    check("a student's agent cannot delete their account",
          not attempt(agent, "select public.delete_my_account()"))
    ben_agent = as_agent("ben")
    check("a teacher's agent cannot create a cohort",
          not attempt(ben_agent, "insert into public.cohorts (slug, title, created_by) values ('agent-made', 'Agent', %s)", (people["ben"],)))
    bea = as_user("bea")
    bea.execute("select count(*) from public.calendar_contacts where user_id = %s", (people["bea"],))
    check("signed in on the site, the student still sees their own calendar email", bea.fetchone()[0] == 1)

    ben = as_user("ben")
    ben.execute("insert into public.app_hides (cohort_id, user_id, hidden_by) values (%s, %s, %s)", (cohort, people["bea"], people["ben"]))
    bea = as_user("bea")
    bea.execute("select public.leave_cohort(%s)", (cohort,))
    su3 = conn.cursor(); su3.execute("reset role")
    su3.execute("select count(*) from public.app_hides where user_id = %s", (people["bea"],))
    check("when someone leaves, the teacher's hide on their app leaves too", su3.fetchone()[0] == 0)
    cal = as_user("cal")
    cal.execute("select count(*) from public.shares where user_id = %s", (people["bea"],))
    check("when someone leaves, what they shared leaves with them", cal.fetchone()[0] == 0)
    su3 = conn.cursor(); su3.execute("reset role")
    su3.execute("select count(*) from public.calendar_contacts where user_id = %s", (people["bea"],))
    check("when someone leaves, their calendar email leaves too", su3.fetchone()[0] == 0)
    su3.execute("select app_public from public.enrollments where user_id = %s", (people["bea"],))
    still_shown = su3.fetchone()[0]
    anon = as_user(None)
    anon.execute("select count(*) from public.public_apps()")
    check("when someone leaves, their app is no longer shown in public", anon.fetchone()[0] == 0 and still_shown is False)
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

    # Becoming a teacher: a request on the site, decided by someone who
    # can approve (only Ben at launch).
    su5 = conn.cursor(); su5.execute("reset role")
    su5.execute("select can_approve from public.teachers where user_id = %s", (people["ben"],))
    check("Ben's first sign-in lets him approve new teachers", su5.fetchone()[0] is True)

    agent = as_agent("dee")
    check("a person's agent cannot ask to teach for them",
          not attempt(agent, "insert into public.teacher_requests (user_id, why) values (%s, 'from the agent')", (people["dee"],)))
    dee = as_user("dee")
    check("someone who is not a teacher can ask to teach",
          attempt(dee, "insert into public.teacher_requests (user_id, why, brings) values (%s, 'I run a maker space.', 'A room and a projector')", (people["dee"],)))
    check("no one can ask to teach on someone else's behalf",
          not attempt(dee, "insert into public.teacher_requests (user_id, why) values (%s, 'For bea')", (people["bea"],)))
    bea = as_user("bea")
    check("no one can ask as an already approved request",
          not attempt(bea, "insert into public.teacher_requests (user_id, why, state) values (%s, 'Approve me', 'approved')", (people["bea"],)))
    check("a second person can ask to teach",
          attempt(bea, "insert into public.teacher_requests (user_id, why) values (%s, 'I teach adults to write.')", (people["bea"],)))
    bea.execute("select count(*) from public.teacher_requests")
    check("a person sees only their own request to teach", bea.fetchone()[0] == 1)
    check("no one can approve their own request",
          not attempt(bea, "update public.teacher_requests set state = 'approved' where user_id = %s", (people["bea"],)))
    check("a person can change the words of their own waiting request",
          attempt(bea, "update public.teacher_requests set why = 'I teach adults to write, at night.' where user_id = %s returning why", (people["bea"],)) and len(last_rows) == 1)
    check("a person cannot decide their own request through the decision function",
          not attempt(bea, "select public.decide_teacher_request(%s, true)", (people["bea"],)))
    anon = as_user(None)
    check("the public cannot read requests to teach",
          not attempt(anon, "select count(*) from public.teacher_requests") or last_rows[0][0] == 0)


    agent = as_agent("dee")
    agent.execute("update public.teacher_requests set why = 'rewritten by the agent' where user_id = %s", (people["dee"],))
    check("a person's agent cannot change their request", agent.rowcount == 0)
    agent.execute("delete from public.teacher_requests where user_id = %s", (people["dee"],))
    check("a person's agent cannot take their request back", agent.rowcount == 0)
    ben_agent = as_agent("ben")
    check("Ben's agent cannot approve a request",
          not attempt(ben_agent, "select public.decide_teacher_request(%s, true)", (people["dee"],)))

    ben = as_user("ben")
    ben.execute("select count(*) from public.teacher_requests")
    check("someone who can approve sees every request", ben.fetchone()[0] == 2)
    ben.execute("select count(*) from public.profiles where id in (%s, %s)", (people["dee"], people["bea"]))
    check("someone who can approve sees who is asking", ben.fetchone()[0] == 2)
    check("Ben can approve a request",
          attempt(ben, "select public.decide_teacher_request(%s, true, 'Welcome.')", (people["dee"],)))
    ben.execute("select invited_by, can_approve from public.teachers where user_id = %s", (people["dee"],))
    row = ben.fetchone()
    check("approving adds the teacher, invited by the approver, who cannot approve others", row is not None and str(row[0]) == people["ben"] and row[1] is False)
    check("a request cannot be decided twice",
          not attempt(ben, "select public.decide_teacher_request(%s, false)", (people["dee"],)))

    dee = as_user("dee")
    check("a newly approved teacher can create a cohort",
          attempt(dee, "insert into public.cohorts (slug, title, created_by) values ('dee-spring', 'Spring', %s) returning id", (people["dee"],)))
    dee.execute("select count(*) from public.teacher_requests")
    check("a teacher who cannot approve sees no one else's request", dee.fetchone()[0] == 1)
    check("a teacher who cannot approve cannot decide a request",
          not attempt(dee, "select public.decide_teacher_request(%s, true)", (people["bea"],)))
    dee.execute("update public.teachers set can_approve = true where user_id = %s", (people["dee"],))
    check("a teacher cannot give themselves the right to approve", dee.rowcount == 0)
    check("a teacher cannot add another teacher by hand",
          not attempt(dee, "insert into public.teachers (user_id, invited_by) values (%s, %s)", (people["bea"], people["dee"])))
    attempt(dee, "delete from public.teacher_requests where user_id = %s", (people["dee"],))
    check("someone who already teaches cannot ask to teach again",
          not attempt(dee, "insert into public.teacher_requests (user_id, why) values (%s, 'again')", (people["dee"],)))

    ben = as_user("ben")
    check("Ben can decline a request with an answer",
          attempt(ben, "select public.decide_teacher_request(%s, false, 'Take a cohort first.')", (people["bea"],)))
    bea = as_user("bea")
    bea.execute("select state, reply from public.teacher_requests where user_id = %s", (people["bea"],))
    check("the person sees the answer to their request", bea.fetchone() == ("declined", "Take a cohort first."))
    bea.execute("select count(*) from public.teachers where user_id = %s", (people["bea"],))
    check("declining adds no teacher", bea.fetchone()[0] == 0)
    bea.execute("update public.teacher_requests set why = 'changed after' where user_id = %s", (people["bea"],))
    check("a decided request can no longer be changed", bea.rowcount == 0)
    bea.execute("delete from public.teacher_requests where user_id = %s", (people["bea"],))
    check("a person can take their request back", bea.rowcount == 1)

    # The credential (migration 20261003070000): issued by a teacher of a
    # finished cohort, signed outside the browser, public one at a time.
    su6 = conn.cursor(); su6.execute("reset role")
    for name in ["eve", "fay"]:
        uid = str(uuid.uuid4())
        su6.execute("insert into auth.users (id, raw_user_meta_data) values (%s, %s)",
                    (uid, f'{{"user_name": "{name}", "provider_id": "{abs(hash(name)) % 10**8}"}}'))
        people[name] = uid
    ben = as_user("ben")
    attempt(ben, "insert into public.cohorts (slug, title, created_by, status) values ('cred-cohort', 'Credential cohort', %s, 'open') returning id", (people["ben"],))
    cc = last_rows[0][0]
    for name in ["eve", "fay"]:
        cur = as_user(name)
        attempt(cur, "insert into public.enrollments (cohort_id, user_id, app_name, app_repo, app_url) values (%s, %s, 'Garden Swap', %s, 'https://example.org/app')",
                (cc, people[name], f"{name}/garden-swap"))
    ben = as_user("ben")
    attempt(ben, "update public.cohorts set status = 'running' where id = %s", (cc,))
    issue = ("insert into public.credentials (user_id, cohort_id, issued_by, platforms, platform_links, evidence_repo, app_name, app_url) "
             "values (%s, %s, %s, %s, %s, %s, 'Garden Swap', 'https://example.org/app') returning id")
    def issue_args(who, by="ben", platforms=("web",), links="{}", repo=None):
        return (people[who], cc, people[by], list(platforms), links, repo or f"{who}/garden-swap")
    check("no one is credentialed while the cohort is still running",
          not attempt(ben, issue, issue_args("eve")))
    attempt(ben, "update public.cohorts set status = 'finished' where id = %s", (cc,))
    ben_agent = as_agent("ben")
    check("a teacher's agent cannot issue a credential",
          not attempt(ben_agent, issue, issue_args("eve")))
    eve = as_user("eve")
    check("a student cannot issue their own credential",
          not attempt(eve, issue, issue_args("eve", by="eve")))
    dee = as_user("dee")
    check("a teacher of another cohort cannot issue one for this cohort",
          not attempt(dee, issue, issue_args("eve", by="dee")))
    ben = as_user("ben")
    check("a credential cannot be issued to someone outside the cohort",
          not attempt(ben, issue, issue_args("dee")))
    check("every credential starts with the web",
          not attempt(ben, issue, issue_args("eve", platforms=("android", "web"), links='{"android": "https://example.org/a"}')))
    check("a platform outside the list is refused",
          not attempt(ben, issue, issue_args("eve", platforms=("web", "gameboy"), links='{"gameboy": "https://example.org/g"}')))
    check("a further platform needs an https link",
          not attempt(ben, issue, issue_args("eve", platforms=("web", "android"), links='{"android": "http://example.org/a"}')))
    check("a credential cannot be recorded as already signed",
          not attempt(ben, issue.replace("app_url)", "app_url, signed)").replace("'https://example.org/app')", "'https://example.org/app', '{}')"), issue_args("eve")))
    check("a teacher of the finished cohort can issue a credential to someone in it",
          attempt(ben, issue, issue_args("eve", platforms=("web", "android"), links='{"android": "https://play.google.com/store/apps/details?id=x"}')))
    cred = last_rows[0][0]
    check("one credential per person per cohort",
          not attempt(ben, issue, issue_args("eve")))

    anon = as_user(None)
    anon.execute("select count(*) from public.credentials")
    check("the public cannot list who holds a credential", anon.fetchone()[0] == 0)
    anon.execute("select state, signed from public.public_credential(%s)", (cred,))
    check("an unsigned credential's public page says only that it is waiting", anon.fetchone() == ("waiting", None))
    fay = as_user("fay")
    fay.execute("select count(*) from public.credentials")
    check("a classmate cannot read someone else's credential record", fay.fetchone()[0] == 0)
    eve = as_user("eve")
    eve.execute("select count(*) from public.credentials where id = %s", (cred,))
    check("the holder can read their own credential", eve.fetchone()[0] == 1)
    eve.execute("select private.is_alum()")
    check("holding a credential makes someone an alum", eve.fetchone()[0] is True)
    changed = attempt(eve, "update public.credentials set app_name = 'Renamed by the holder' where id = %s returning id", (cred,)) and len(last_rows) == 1
    check("the holder cannot change their own credential", not changed)

    ben = as_user("ben")
    check("a teacher can correct the evidence before it is signed",
          attempt(ben, "update public.credentials set app_name = 'Garden Swap!' where id = %s", (cred,)))
    check("a file for another record cannot be attached",
          not attempt(ben, """update public.credentials set signed = '{"id": "https://humanshaped.org/credential/?id=00000000-0000-0000-0000-000000000000", "issuer": {"id": "did:web:humanshaped.org"}, "proof": {"cryptosuite": "eddsa-rdfc-2022", "proofValue": "z1"}}' where id = %s""", (cred,)))
    good = ('{"id": "https://humanshaped.org/credential/?id=%s", "issuer": {"id": "did:web:humanshaped.org"}, '
            '"proof": {"cryptosuite": "eddsa-rdfc-2022", "proofValue": "z1"}}') % cred
    ben_agent = as_agent("ben")
    ben_agent.execute("update public.credentials set signed = %s where id = %s", (good, cred))
    check("a teacher's agent cannot attach the signed file", ben_agent.rowcount == 0)
    ben = as_user("ben")
    check("a teacher can attach the signed file, and the time it was signed is recorded",
          attempt(ben, "update public.credentials set signed = %s where id = %s returning signed_at is not null, credential_url", (good, cred))
          and last_rows[0][0] is True and last_rows[0][1].endswith(str(cred)))
    check("a signed credential cannot change",
          not attempt(ben, "update public.credentials set platforms = '{web}', platform_links = '{}' where id = %s", (cred,)))
    check("a teacher cannot delete a signed credential",
          attempt(ben, "delete from public.credentials where id = %s returning id", (cred,)) and last_rows == [])
    anon = as_user(None)
    anon.execute("select state, signed ->> 'id' from public.public_credential(%s)", (cred,))
    row = anon.fetchone()
    check("anyone with the link can read a signed credential", row is not None and row[0] == "signed" and row[1].endswith(str(cred)))
    agent = as_agent("eve")
    agent.execute("select count(*) from public.credentials where id = %s", (cred,))
    check("a holder's agent can read their credential", agent.fetchone()[0] == 1)
    agent.execute("delete from public.credentials where id = %s", (cred,))
    check("a holder's agent cannot delete their credential", agent.rowcount == 0)

    ben_agent = as_agent("ben")
    ben_agent.execute("update public.credentials set revoked_at = now() where id = %s", (cred,))
    check("a teacher's agent cannot revoke a credential", ben_agent.rowcount == 0)
    ben = as_user("ben")
    check("a teacher can revoke a signed credential, with a reason",
          attempt(ben, "update public.credentials set revoked_at = now(), revoked_reason = 'Replaced by a higher level.' where id = %s returning id", (cred,)) and len(last_rows) == 1)
    anon = as_user(None)
    anon.execute("select state, signed from public.public_credential(%s)", (cred,))
    check("a revoked credential's public page says so, and no longer shows the file", anon.fetchone() == ("revoked", None))
    eve = as_user("eve")
    eve.execute("select private.is_alum()")
    check("a revoked credential no longer makes someone an alum", eve.fetchone()[0] is False)
    ben = as_user("ben")
    check("a revoked credential stays revoked",
          not attempt(ben, "update public.credentials set revoked_at = null, revoked_reason = null where id = %s", (cred,)))
    check("after revoking, a new credential can be issued for the same cohort",
          attempt(ben, issue, issue_args("eve", platforms=("web", "android", "windows"),
                                         links='{"android": "https://example.org/a", "windows": "https://example.org/w"}')))
    fresh = last_rows[0][0]
    check("a teacher can remove an unsigned record made by mistake",
          attempt(ben, "delete from public.credentials where id = %s returning id", (fresh,)) and len(last_rows) == 1)
    eve = as_user("eve")
    check("the holder can remove their own credential",
          attempt(eve, "delete from public.credentials where id = %s returning id", (cred,)) and len(last_rows) == 1)

    # The live session: the "show your work" queue, and checks for
    # understanding (migration 20261003080000).
    ben = as_user("ben")
    attempt(ben, "insert into public.cohorts (slug, title, created_by, status) values ('live-test', 'Live', %s, 'open') returning id", (people["ben"],))
    live = last_rows[0][0]
    attempt(ben, "insert into public.sessions (cohort_id, number) values (%s, 1) returning id", (live,))
    s1 = last_rows[0][0]
    attempt(ben, "insert into public.sessions (cohort_id, number) values (%s, 1) returning id", (cohort,))
    other_session = last_rows[0][0]
    for name in ["bea", "eve"]:
        cur = as_user(name)
        attempt(cur, "insert into public.enrollments (cohort_id, user_id) values (%s, %s)", (live, people[name]))
    bea = as_user("bea")
    attempt(bea, "insert into public.shares (cohort_id, user_id, kind, url, note) values (%s, %s, 'bring-back', 'https://bea.github.io/garden-swap', 'Round two') returning id", (live, people["bea"]))
    bea_share = last_rows[0][0]

    check("a person in the cohort can add their app to the queue",
          attempt(bea, "insert into public.live_queue (cohort_id, session_id, user_id, kind, url, note) values (%s, %s, %s, 'app', 'https://bea.github.io/garden-swap', 'The new list') returning id", (live, s1, people["bea"])))
    item = last_rows[0][0]
    check("a person can add a share they already made",
          attempt(bea, "insert into public.live_queue (cohort_id, session_id, user_id, kind, url, share_id) values (%s, %s, %s, 'share', 'https://bea.github.io/garden-swap', %s) returning id", (live, s1, people["bea"], bea_share)))
    check("no one can add to the queue for someone else",
          not attempt(bea, "insert into public.live_queue (cohort_id, session_id, user_id, kind, url) values (%s, %s, %s, 'link', 'https://example.org')", (live, s1, people["eve"])))
    check("an item cannot be added as already shown",
          not attempt(bea, "insert into public.live_queue (cohort_id, session_id, user_id, kind, url, state) values (%s, %s, %s, 'link', 'https://example.org', 'shown')", (live, s1, people["bea"])))
    check("a queue item must link to https",
          not attempt(bea, "insert into public.live_queue (cohort_id, session_id, user_id, kind, url) values (%s, %s, %s, 'link', 'javascript:alert(1)')", (live, s1, people["bea"])))
    check("a queue item must belong to a session of its own cohort",
          not attempt(bea, "insert into public.live_queue (cohort_id, session_id, user_id, kind, url) values (%s, %s, %s, 'link', 'https://example.org')", (live, other_session, people["bea"])))
    fay = as_user("fay")
    check("someone outside the cohort cannot add to its queue",
          not attempt(fay, "insert into public.live_queue (cohort_id, session_id, user_id, kind, url) values (%s, %s, %s, 'link', 'https://example.org')", (live, s1, people["fay"])))
    fay.execute("select count(*) from public.live_queue")
    check("someone outside the cohort sees none of its queue", fay.fetchone()[0] == 0)
    eve = as_user("eve")
    eve.execute("select count(*) from public.live_queue where cohort_id = %s", (live,))
    check("a classmate sees the whole queue", eve.fetchone()[0] == 2)
    eve.execute("update public.live_queue set state = 'shown' where id = %s", (item,))
    check("a classmate cannot mark someone else's item shown", eve.rowcount == 0)
    eve.execute("delete from public.live_queue where id = %s", (item,))
    check("a classmate cannot take someone else's item off", eve.rowcount == 0)
    ben = as_user("ben")
    ben.execute("update public.live_queue set state = 'shown' where id = %s returning shown_at", (item,))
    check("the teacher can mark an item shown, and the time is kept", ben.rowcount == 1 and ben.fetchone()[0] is not None)
    bea = as_user("bea")
    check("an item's link cannot be changed once it is in the queue",
          not attempt(bea, "update public.live_queue set url = 'https://example.org/else' where id = %s", (item,)))
    bea.execute("update public.live_queue set state = 'waiting' where id = %s", (item,))
    check("the person can put their own item back in the queue", bea.rowcount == 1)

    ben = as_user("ben")
    check("the teacher can ask a question with choices",
          attempt(ben, "insert into public.live_checks (cohort_id, session_id, created_by, prompt, choices) values (%s, %s, %s, 'Which part is the parity matrix for?', array['Planning', 'Testing', 'Both']) returning id", (live, s1, people["ben"])))
    q = last_rows[0][0]
    check("the teacher can ask a question to answer in your own words",
          attempt(ben, "insert into public.live_checks (cohort_id, session_id, created_by, prompt) values (%s, %s, %s, 'What would you ask the agent next?') returning id", (live, s1, people["ben"])))
    q_words = last_rows[0][0]
    check("a question has two to six choices",
          not attempt(ben, "insert into public.live_checks (cohort_id, session_id, created_by, prompt, choices) values (%s, %s, %s, 'One?', array['Only'])", (live, s1, people["ben"])))
    bea = as_user("bea")
    check("a student cannot ask the cohort a question",
          not attempt(bea, "insert into public.live_checks (cohort_id, session_id, created_by, prompt) values (%s, %s, %s, 'Mine?')", (live, s1, people["bea"])))
    dee = as_user("dee")
    check("a teacher of another cohort cannot ask this one a question",
          not attempt(dee, "insert into public.live_checks (cohort_id, session_id, created_by, prompt) values (%s, %s, %s, 'Hello?')", (live, s1, people["dee"])))
    fay = as_user("fay")
    fay.execute("select count(*) from public.live_checks")
    check("someone outside the cohort sees none of its questions", fay.fetchone()[0] == 0)

    bea = as_user("bea")
    check("a student can answer by choosing",
          attempt(bea, "insert into public.live_answers (check_id, cohort_id, user_id, choice) values (%s, %s, %s, 3)", (q, live, people["bea"])))
    check("a student can answer in their own words",
          attempt(bea, "insert into public.live_answers (check_id, cohort_id, user_id, body) values (%s, %s, %s, 'Why it fails offline')", (q_words, live, people["bea"])))
    check("a choice must be one of the question's choices",
          not attempt(bea, "update public.live_answers set choice = 9 where check_id = %s and user_id = %s", (q, people["bea"])))
    check("a student can change their answer while the question is open",
          attempt(bea, "update public.live_answers set choice = 1 where check_id = %s and user_id = %s returning choice", (q, people["bea"])) and last_rows == [(1,)])
    eve = as_user("eve")
    check("no one can answer for someone else",
          not attempt(eve, "insert into public.live_answers (check_id, cohort_id, user_id, choice) values (%s, %s, %s, 2)", (q, live, people["bea"])))
    attempt(eve, "insert into public.live_answers (check_id, cohort_id, user_id, choice) values (%s, %s, %s, 1)", (q, live, people["eve"]))
    eve.execute("select user_id from public.live_answers")
    check("a student sees only their own answers", [str(r[0]) for r in eve.fetchall()] == [people["eve"]])
    eve.execute("select count(*) from public.check_tally(%s)", (q,))
    check("students see no tally until the teacher shows it", eve.fetchone()[0] == 0)
    ben = as_user("ben")
    ben.execute("select count(*) from public.live_answers where check_id = %s", (q,))
    check("the teacher sees everyone's answers", ben.fetchone()[0] == 2)
    ben.execute("select choice, answers from public.check_tally(%s)", (q,))
    check("the teacher always sees the tally", ben.fetchall() == [(1, 2)])
    ben.execute("update public.live_answers set choice = 2 where check_id = %s and user_id = %s", (q, people["eve"]))
    check("the teacher cannot change a student's answer", ben.rowcount == 0)
    check("a question cannot be reworded once it is asked",
          not attempt(ben, "update public.live_checks set prompt = 'Something else' where id = %s", (q,)))
    ben.execute("update public.live_checks set show_tally = true where id = %s", (q,))
    eve = as_user("eve")
    eve.execute("select choice, answers from public.check_tally(%s)", (q,))
    check("once shown, students see the anonymous tally", eve.fetchall() == [(1, 2)])
    eve.execute("select * from public.check_tally(%s)", (q,))
    check("the tally names no one", [d[0] for d in eve.description] == ["choice", "answers"])
    fay = as_user("fay")
    fay.execute("select count(*) from public.check_tally(%s)", (q,))
    check("someone outside the cohort sees no tally", fay.fetchone()[0] == 0)
    bea = as_user("bea")
    bea.execute("update public.live_checks set state = 'closed' where id = %s", (q,))
    check("a student cannot close a question", bea.rowcount == 0)
    ben = as_user("ben")
    ben.execute("update public.live_checks set state = 'closed' where id = %s returning closed_at", (q,))
    check("the teacher can close a question", ben.rowcount == 1 and ben.fetchone()[0] is not None)
    bea = as_user("bea")
    check("no one answers a closed question",
          not attempt(bea, "update public.live_answers set choice = 2 where check_id = %s and user_id = %s", (q, people["bea"])))

    # A student's agent can see what is happening in the session, and
    # cannot act in it.
    agent = as_agent("bea")
    agent.execute("select count(*) from public.live_queue where cohort_id = %s", (live,))
    check("a student's agent can read the session's queue", agent.fetchone()[0] == 2)
    agent.execute("select count(*) from public.live_answers where user_id = %s", (people["bea"],))
    check("a student's agent can read the student's own answers", agent.fetchone()[0] == 2)
    check("a student's agent cannot add to the queue",
          not attempt(agent, "insert into public.live_queue (cohort_id, session_id, user_id, kind, url) values (%s, %s, %s, 'link', 'https://example.org')", (live, s1, people["bea"])))
    agent.execute("update public.live_queue set state = 'shown' where id = %s", (item,))
    check("a student's agent cannot mark an item shown", agent.rowcount == 0)
    agent.execute("delete from public.live_queue where id = %s", (item,))
    check("a student's agent cannot take an item off", agent.rowcount == 0)
    check("a student's agent cannot answer a question",
          not attempt(agent, "insert into public.live_answers (check_id, cohort_id, user_id, body) values (%s, %s, %s, 'from the agent')", (q_words, live, people["eve"])) and
          not attempt(as_agent("eve"), "insert into public.live_answers (check_id, cohort_id, user_id, body) values (%s, %s, %s, 'from the agent')", (q_words, live, people["eve"])))
    agent = as_agent("bea")
    agent.execute("update public.live_answers set body = 'rewritten by the agent' where check_id = %s and user_id = %s", (q_words, people["bea"]))
    check("a student's agent cannot change an answer", agent.rowcount == 0)
    agent.execute("delete from public.live_answers where user_id = %s", (people["bea"],))
    check("a student's agent cannot take an answer back", agent.rowcount == 0)
    ben_agent = as_agent("ben")
    check("a teacher's agent cannot ask a question",
          not attempt(ben_agent, "insert into public.live_checks (cohort_id, session_id, created_by, prompt) values (%s, %s, %s, 'From the agent?')", (live, s1, people["ben"])))
    ben_agent.execute("update public.live_checks set state = 'open' where id = %s", (q,))
    check("a teacher's agent cannot reopen a question", ben_agent.rowcount == 0)

    # Kept only as long as the session needs it.
    eve = as_user("eve")
    attempt(eve, "insert into public.live_queue (cohort_id, session_id, user_id, kind, url) values (%s, %s, %s, 'link', 'https://example.org')", (live, s1, people["eve"]))
    eve.execute("select public.leave_cohort(%s)", (live,))
    su7 = conn.cursor(); su7.execute("reset role")
    su7.execute("select (select count(*) from public.live_queue where user_id = %s) + (select count(*) from public.live_answers where user_id = %s)", (people["eve"], people["eve"]))
    check("when someone leaves, their queue items and answers leave with them", su7.fetchone()[0] == 0)
    ben = as_user("ben")
    ben.execute("update public.cohorts set status = 'finished' where id = %s", (live,))
    su7 = conn.cursor(); su7.execute("reset role")
    su7.execute("select (select count(*) from public.live_queue where cohort_id = %s) + (select count(*) from public.live_checks where cohort_id = %s) + (select count(*) from public.live_answers where cohort_id = %s)", (live, live, live))
    check("when the cohort is finished, its queue, questions, and answers are deleted", su7.fetchone()[0] == 0)

    # The teaching tools (migration 20261003100000): a room for each group,
    # what the teacher heard, the builder's question, and ready or not yet.
    # bea and eve are partners in one group, fay is a classmate in another,
    # dee teaches elsewhere, and anon is the public.
    ben = as_user("ben")
    attempt(ben, "insert into public.cohorts (slug, title, created_by, status) values ('tools-test', 'Tools', %s, 'open') returning id", (people["ben"],))
    tc = last_rows[0][0]
    attempt(ben, "insert into public.sessions (cohort_id, number) values (%s, 1) returning id", (tc,))
    t1 = last_rows[0][0]
    for name in ["bea", "eve", "fay"]:
        cur = as_user(name)
        attempt(cur, "insert into public.enrollments (cohort_id, user_id) values (%s, %s)", (tc, people[name]))
    ben = as_user("ben")
    attempt(ben, "insert into public.groups (cohort_id, name) values (%s, 'Trio A') returning id", (tc,))
    ga = last_rows[0][0]
    attempt(ben, "insert into public.groups (cohort_id, name) values (%s, 'Trio B') returning id", (tc,))
    gb = last_rows[0][0]
    attempt(ben, "insert into public.group_members (group_id, user_id) values (%s, %s), (%s, %s), (%s, %s)",
            (ga, people["bea"], ga, people["eve"], gb, people["fay"]))

    check("a teacher can give a group its own Meet link",
          attempt(ben, "update public.groups set meet_url = 'https://meet.google.com/aaa-bbbb-ccc' where id = %s returning id", (ga,)) and len(last_rows) == 1)
    check("a group's Meet link must be https",
          not attempt(ben, "update public.groups set meet_url = 'http://meet.google.com/aaa' where id = %s", (gb,)))
    bea = as_user("bea")
    bea.execute("update public.groups set meet_url = 'https://example.org/mine' where id = %s", (ga,))
    check("a student cannot change their group's Meet link", bea.rowcount == 0)
    bea.execute("select meet_url from public.groups where id = %s", (ga,))
    check("a student reads their group's Meet link", bea.fetchone() == ("https://meet.google.com/aaa-bbbb-ccc",))
    dee = as_user("dee")
    dee.execute("select count(*) from public.groups where cohort_id = %s", (tc,))
    check("someone outside the cohort sees none of its groups or rooms", dee.fetchone()[0] == 0)
    anon = as_user(None)
    anon.execute("select count(*) from public.groups")
    check("the public sees no group rooms", anon.fetchone()[0] == 0)
    ben_agent = as_agent("ben")
    ben_agent.execute("update public.groups set meet_url = 'https://example.org/agent' where id = %s", (ga,))
    check("a teacher's agent cannot change a group's Meet link", ben_agent.rowcount == 0)

    ben = as_user("ben")
    check("a teacher can write what they heard in a session's checks",
          attempt(ben, "update public.sessions set heard = 'Most of you can name your one rule now. Next week starts with data.' where id = %s returning id", (t1,)) and len(last_rows) == 1)
    bea = as_user("bea")
    bea.execute("update public.sessions set heard = 'changed by a student' where id = %s", (t1,))
    check("a student cannot write what the teacher heard", bea.rowcount == 0)
    fay = as_user("fay")
    fay.execute("select heard from public.sessions where id = %s", (t1,))
    check("everyone in the cohort reads what the teacher heard", (fay.fetchone() or [""])[0].startswith("Most of you"))
    dee = as_user("dee")
    dee.execute("select count(*) from public.sessions where id = %s", (t1,))
    check("someone outside the cohort cannot read what the teacher heard", dee.fetchone()[0] == 0)
    ben_agent = as_agent("ben")
    ben_agent.execute("update public.sessions set heard = 'from the agent' where id = %s", (t1,))
    check("a teacher's agent cannot write what the teacher heard", ben_agent.rowcount == 0)

    bea = as_user("bea")
    check("a builder can bring something back with their question and a mark of ready",
          attempt(bea, "insert into public.shares (cohort_id, user_id, kind, url, note, want_to_know, readiness) values (%s, %s, 'bring-back', 'https://bea.github.io/garden-swap', 'Round three', 'Does the list make sense without me there?', 'ready') returning id", (tc, people["bea"])))
    bb = last_rows[0][0]
    check("not yet must say what is missing",
          not attempt(bea, "insert into public.shares (cohort_id, user_id, kind, note, readiness) values (%s, %s, 'bring-back', 'Round', 'not-yet')", (tc, people["bea"])))
    check("not yet, with what is missing, is fine",
          attempt(bea, "insert into public.shares (cohort_id, user_id, kind, note, readiness, missing) values (%s, %s, 'bring-back', 'Round', 'not-yet', 'Only one round from my phone so far.') returning id", (tc, people["bea"])))
    bb_not_yet = last_rows[0][0]
    check("only a bring-back carries a mark of ready",
          not attempt(bea, "insert into public.shares (cohort_id, user_id, kind, note, readiness) values (%s, %s, 'for-feedback', 'Help', 'ready')", (tc, people["bea"])))
    check("a mark is ready or not yet, and nothing else (never a score)",
          not attempt(bea, "insert into public.shares (cohort_id, user_id, kind, note, readiness) values (%s, %s, 'bring-back', 'Round', '4')", (tc, people["bea"])))
    eve = as_user("eve")
    eve.execute("update public.shares set readiness = 'not-yet', missing = 'says eve' where id = %s", (bb,))
    check("a partner cannot change the builder's own mark", eve.rowcount == 0)
    agent = as_agent("bea")
    agent.execute("update public.shares set want_to_know = 'from the agent' where id = %s", (bb,))
    check("a builder's agent cannot write their question or their mark", agent.rowcount == 0)

    agent = as_agent("eve")
    check("a partner's agent cannot confirm for them",
          not attempt(agent, "insert into public.share_confirmations (share_id, user_id, cohort_id) values (%s, %s, %s)", (bb, people["eve"], tc)))
    bea = as_user("bea")
    check("a builder cannot confirm their own bring-back",
          not attempt(bea, "insert into public.share_confirmations (share_id, user_id, cohort_id) values (%s, %s, %s)", (bb, people["bea"], tc)))
    fay = as_user("fay")
    check("a classmate outside the builder's group cannot confirm it",
          not attempt(fay, "insert into public.share_confirmations (share_id, user_id, cohort_id) values (%s, %s, %s)", (bb, people["fay"], tc)))
    dee = as_user("dee")
    check("someone outside the cohort cannot confirm",
          not attempt(dee, "insert into public.share_confirmations (share_id, user_id, cohort_id) values (%s, %s, %s)", (bb, people["dee"], tc)))
    eve = as_user("eve")
    check("no one confirms a bring-back its builder marked not yet",
          not attempt(eve, "insert into public.share_confirmations (share_id, user_id, cohort_id) values (%s, %s, %s)", (bb_not_yet, people["eve"], tc)))
    check("no one confirms in someone else's name",
          not attempt(eve, "insert into public.share_confirmations (share_id, user_id, cohort_id) values (%s, %s, %s)", (bb, people["fay"], tc)))
    check("a partner can confirm they saw it working on a device",
          attempt(eve, "insert into public.share_confirmations (share_id, user_id, cohort_id) values (%s, %s, %s)", (bb, people["eve"], tc)))
    ben = as_user("ben")
    check("a teacher of the cohort can confirm too",
          attempt(ben, "insert into public.share_confirmations (share_id, user_id, cohort_id) values (%s, %s, %s)", (bb, people["ben"], tc)))
    fay = as_user("fay")
    fay.execute("select count(*) from public.share_confirmations where share_id = %s", (bb,))
    check("the cohort sees who confirmed", fay.fetchone()[0] == 2)
    dee = as_user("dee")
    dee.execute("select count(*) from public.share_confirmations")
    check("someone outside the cohort sees no confirmations", dee.fetchone()[0] == 0)
    anon = as_user(None)
    anon.execute("select count(*) from public.share_confirmations")
    check("the public sees no confirmations", anon.fetchone()[0] == 0)
    bea = as_user("bea")
    bea.execute("delete from public.share_confirmations where share_id = %s and user_id = %s", (bb, people["eve"]))
    check("a builder cannot remove a partner's confirmation", bea.rowcount == 0)
    agent = as_agent("eve")
    agent.execute("delete from public.share_confirmations where share_id = %s", (bb,))
    check("a partner's agent cannot take a confirmation back", agent.rowcount == 0)
    eve = as_user("eve")
    eve.execute("delete from public.share_confirmations where share_id = %s and user_id = %s", (bb, people["eve"]))
    check("a partner can take their own confirmation back", eve.rowcount == 1)
    attempt(eve, "insert into public.share_confirmations (share_id, user_id, cohort_id) values (%s, %s, %s)", (bb, people["eve"], tc))
    bea = as_user("bea")
    check("redoing is free: a builder can change ready to not yet",
          attempt(bea, "update public.shares set readiness = 'not-yet', missing = 'It breaks offline.' where id = %s returning id", (bb,)) and len(last_rows) == 1)
    su8 = conn.cursor(); su8.execute("reset role")
    su8.execute("select count(*) from public.share_confirmations where share_id = %s", (bb,))
    check("changing the mark clears what partners confirmed, so they can look again", su8.fetchone()[0] == 0)
    bea = as_user("bea")
    attempt(bea, "update public.shares set readiness = 'ready', missing = null where id = %s", (bb,))
    eve = as_user("eve")
    attempt(eve, "insert into public.share_confirmations (share_id, user_id, cohort_id) values (%s, %s, %s)", (bb, people["eve"], tc))
    eve.execute("select public.leave_cohort(%s)", (tc,))
    su8 = conn.cursor(); su8.execute("reset role")
    su8.execute("select count(*) from public.share_confirmations where user_id = %s", (people["eve"],))
    check("when someone leaves, the confirmations they gave leave with them", su8.fetchone()[0] == 0)

    # Follow-ups (migration 20261003130000): a note a teacher sends to one
    # student, readable by that student and the cohort's teachers only.
    # bea and eve are students in it, fay is a student elsewhere, dee
    # teaches another cohort, and anon is the public.
    ben = as_user("ben")
    attempt(ben, "insert into public.cohorts (slug, title, created_by, status) values ('notes-test', 'Notes', %s, 'open') returning id", (people["ben"],))
    nc = last_rows[0][0]
    attempt(ben, "insert into public.sessions (cohort_id, number) values (%s, 1) returning id", (nc,))
    n1 = last_rows[0][0]
    for name in ["bea", "eve"]:
        cur = as_user(name)
        attempt(cur, "insert into public.enrollments (cohort_id, user_id) values (%s, %s)", (nc, people[name]))
    ben = as_user("ben")
    check("a teacher can send a follow-up note to a student in the cohort",
          attempt(ben, "insert into public.teacher_notes (cohort_id, student_id, author_id, session_id, body) values (%s, %s, %s, %s, 'Your question about sync is the right one. Bring it next week.') returning id", (nc, people["bea"], people["ben"], n1)))
    note = last_rows[0][0] if last_rows else None
    check("a note cannot be empty",
          not attempt(ben, "insert into public.teacher_notes (cohort_id, student_id, author_id, body) values (%s, %s, %s, '   ')", (nc, people["bea"], people["ben"])))
    check("a teacher cannot send a note in someone else's name",
          not attempt(ben, "insert into public.teacher_notes (cohort_id, student_id, author_id, body) values (%s, %s, %s, 'Hi')", (nc, people["bea"], people["dee"])))
    check("a teacher cannot send a note to someone who is not in the cohort",
          not attempt(ben, "insert into public.teacher_notes (cohort_id, student_id, author_id, body) values (%s, %s, %s, 'Hi')", (nc, people["fay"], people["ben"])))
    check("a note must be about a session of the same cohort",
          not attempt(ben, "insert into public.teacher_notes (cohort_id, student_id, author_id, session_id, body) values (%s, %s, %s, %s, 'Hi')", (nc, people["bea"], people["ben"], t1)))
    ben.execute("update public.teacher_notes set body = 'rewritten' where id = %s", (note,))
    check("a sent note is not rewritten", ben.rowcount == 0)
    bea = as_user("bea")
    bea.execute("select body from public.teacher_notes where cohort_id = %s", (nc,))
    check("the student reads the note sent to them", [r[0] for r in bea.fetchall()] == ["Your question about sync is the right one. Bring it next week."])
    check("a student cannot send a note",
          not attempt(bea, "insert into public.teacher_notes (cohort_id, student_id, author_id, body) values (%s, %s, %s, 'From bea')", (nc, people["eve"], people["bea"])))
    eve = as_user("eve")
    eve.execute("select count(*) from public.teacher_notes")
    check("a classmate cannot read a note sent to someone else", eve.fetchone()[0] == 0)
    eve.execute("delete from public.teacher_notes where id = %s", (note,))
    check("a classmate cannot remove a note sent to someone else", eve.rowcount == 0)
    dee = as_user("dee")
    dee.execute("select count(*) from public.teacher_notes")
    check("a teacher of another cohort cannot read the notes", dee.fetchone()[0] == 0)
    check("a teacher of another cohort cannot send a note in this one",
          not attempt(dee, "insert into public.teacher_notes (cohort_id, student_id, author_id, body) values (%s, %s, %s, 'Hi')", (nc, people["bea"], people["dee"])))
    anon = as_user(None)
    anon.execute("select count(*) from public.teacher_notes")
    check("the public sees no notes", anon.fetchone()[0] == 0)
    ben = as_user("ben")
    ben.execute("select count(*) from public.teacher_notes where cohort_id = %s", (nc,))
    check("the cohort's teachers read the notes sent in it", ben.fetchone()[0] == 1)
    ben_agent = as_agent("ben")
    check("a teacher's agent cannot send a note",
          not attempt(ben_agent, "insert into public.teacher_notes (cohort_id, student_id, author_id, body) values (%s, %s, %s, 'Written by the agent')", (nc, people["eve"], people["ben"])))
    ben_agent.execute("delete from public.teacher_notes where id = %s", (note,))
    check("a teacher's agent cannot take a note back", ben_agent.rowcount == 0)
    agent = as_agent("bea")
    agent.execute("select count(*) from public.teacher_notes where student_id = %s", (people["bea"],))
    check("a student's agent can read the notes sent to the student", agent.fetchone()[0] == 1)
    agent.execute("delete from public.teacher_notes where id = %s", (note,))
    check("a student's agent cannot remove a note", agent.rowcount == 0)
    bea = as_user("bea")
    bea.execute("delete from public.teacher_notes where id = %s", (note,))
    check("the student can remove a note sent to them", bea.rowcount == 1)
    ben = as_user("ben")
    attempt(ben, "insert into public.teacher_notes (cohort_id, student_id, author_id, body) values (%s, %s, %s, 'One for eve')", (nc, people["eve"], people["ben"]))
    attempt(ben, "insert into public.teacher_notes (cohort_id, student_id, author_id, body) values (%s, %s, %s, 'One more for bea') returning id", (nc, people["bea"], people["ben"]))
    bea_note = last_rows[0][0]
    ben.execute("delete from public.teacher_notes where id = %s", (bea_note,))
    check("the teacher who sent a note can take it back", ben.rowcount == 1)
    attempt(ben, "insert into public.teacher_notes (cohort_id, student_id, author_id, body) values (%s, %s, %s, 'Again for bea')", (nc, people["bea"], people["ben"]))
    eve = as_user("eve")
    eve.execute("select public.leave_cohort(%s)", (nc,))
    su9 = conn.cursor(); su9.execute("reset role")
    su9.execute("select count(*) from public.teacher_notes where student_id = %s", (people["eve"],))
    check("when a student leaves, the notes sent to them there leave too", su9.fetchone()[0] == 0)
    ben = as_user("ben")
    ben.execute("update public.cohorts set status = 'finished' where id = %s", (nc,))
    su9 = conn.cursor(); su9.execute("reset role")
    su9.execute("select count(*) from public.teacher_notes where cohort_id = %s", (nc,))
    check("when the cohort is finished, its notes are deleted", su9.fetchone()[0] == 0)

    # Live signals (migration 20261003140000): rooms, come back, a card,
    # who is on stage, and "recording now". Ben teaches; bea, eve, and fay are
    # in the cohort; dee teaches another cohort; anon is the public.
    ben = as_user("ben")
    attempt(ben, "insert into public.cohorts (slug, title, created_by, status) values ('signals-test', 'Signals', %s, 'open') returning id", (people["ben"],))
    sc = last_rows[0][0]
    attempt(ben, "insert into public.sessions (cohort_id, number) values (%s, 1) returning id", (sc,))
    ss1 = last_rows[0][0]
    for name in ["bea", "eve", "fay"]:
        cur = as_user(name)
        attempt(cur, "insert into public.enrollments (cohort_id, user_id) values (%s, %s)", (sc, people[name]))
    send = "insert into public.live_signals (cohort_id, session_id, created_by, kind, body, people, ends_at) values (%s, %s, %s, %s, %s, %s::uuid[], now() + %s::interval) returning id"

    def sig(who, kind, body=None, ppl=None, ends=None, session=None, by=None):
        return attempt(who, send, (sc, session or ss1, people[by or "ben"], kind, body, ppl, ends))

    ben = as_user("ben")
    check("a teacher can send everyone to their rooms with a time to come back", sig(ben, "rooms", ends="25 minutes"))
    rooms_sig = last_rows[0][0]
    check("a teacher can show a card in their own words, with a countdown",
          sig(ben, "card", body="You have 5 minutes of worktime left", ends="5 minutes"))
    card_sig = last_rows[0][0]
    check("a card must have words", not sig(ben, "card", body="   "))
    check("only a card has words", not sig(ben, "together", body="hello"))
    check("a countdown cannot end in the past", not sig(ben, "rooms", ends="-1 minute"))
    check("a countdown ends within four hours", not sig(ben, "card", body="Long", ends="5 hours"))
    check("only rooms and a card count down", not sig(ben, "recording", ends="10 minutes"))
    check("a teacher can put people from the cohort on stage",
          sig(ben, "stage", ppl="{%s,%s}" % (people["bea"], people["eve"])))
    stage_sig = last_rows[0][0]
    check("the stage names only people in the cohort",
          not sig(ben, "stage", ppl="{%s}" % people["dee"]))
    check("the stage names each person once",
          not sig(ben, "stage", ppl="{%s,%s}" % (people["bea"], people["bea"])))
    check("the stage holds at most three people",
          not sig(ben, "stage", ppl="{%s,%s,%s,%s}" % (people["bea"], people["eve"], people["ben"], people["fay"])))
    check("only the stage names people", not sig(ben, "card", body="Hi", ppl="{%s}" % people["bea"]))
    check("a teacher can say the recording is running", sig(ben, "recording"))
    rec_sig = last_rows[0][0]
    check("a teacher sends signals only in their own name", not sig(ben, "together", by="bea"))
    check("a signal belongs to one of the cohort's own sessions", not sig(ben, "together", session=other_session))

    bea = as_user("bea")
    check("a student cannot send a signal", not sig(bea, "together", by="bea"))
    dee = as_user("dee")
    check("a teacher of another cohort cannot send a signal here", not sig(dee, "together", by="dee"))
    bea = as_user("bea")
    bea.execute("select count(*) from public.live_signals where cohort_id = %s", (sc,))
    check("everyone in the cohort sees the signals", bea.fetchone()[0] == 4)
    dee = as_user("dee")
    dee.execute("select count(*) from public.live_signals where cohort_id = %s", (sc,))
    check("someone outside the cohort sees none of its signals", dee.fetchone()[0] == 0)
    anon = as_user(None)
    anon.execute("select count(*) from public.live_signals")
    check("the public sees no signals", anon.fetchone()[0] == 0)
    bea = as_user("bea")
    bea.execute("update public.live_signals set cleared_at = now() where id = %s", (rooms_sig,))
    check("a student cannot clear a signal", bea.rowcount == 0)
    bea.execute("delete from public.live_signals where id = %s", (card_sig,))
    check("a student cannot delete a signal", bea.rowcount == 0)

    ben = as_user("ben")
    check("a teacher can give the rooms five more minutes",
          attempt(ben, "update public.live_signals set ends_at = ends_at + interval '5 minutes' where id = %s returning id", (rooms_sig,)) and len(last_rows) == 1)
    check("a moved countdown still ends in the future",
          not attempt(ben, "update public.live_signals set ends_at = now() - interval '1 minute' where id = %s", (rooms_sig,)))
    check("a card's words cannot change once it is shown",
          not attempt(ben, "update public.live_signals set body = 'Something else' where id = %s", (card_sig,)))
    check("a teacher can take a card down",
          attempt(ben, "update public.live_signals set cleared_at = '2000-01-01' where id = %s returning cleared_at > '2001-01-01'", (card_sig,)) and last_rows == [(True,)])
    check("a cleared signal stays cleared",
          not attempt(ben, "update public.live_signals set cleared_at = null where id = %s", (card_sig,)))

    agent = as_agent("bea")
    agent.execute("select count(*) from public.live_signals where cohort_id = %s", (sc,))
    check("a student's agent can read the signals", agent.fetchone()[0] == 4)
    ben_agent = as_agent("ben")
    check("a teacher's agent cannot send a signal", not sig(ben_agent, "together"))
    ben_agent.execute("update public.live_signals set cleared_at = now() where id = %s", (rec_sig,))
    check("a teacher's agent cannot clear a signal", ben_agent.rowcount == 0)
    ben_agent.execute("delete from public.live_signals where id = %s", (rec_sig,))
    check("a teacher's agent cannot delete a signal", ben_agent.rowcount == 0)

    # Saved cards are the teacher's own.
    ben = as_user("ben")
    check("a teacher can save a card to reuse",
          attempt(ben, "insert into public.card_presets (user_id, body, minutes) values (%s, 'You have 5 minutes of worktime left', 5) returning id", (people["ben"],)))
    preset = last_rows[0][0]
    check("a saved card has words",
          not attempt(ben, "insert into public.card_presets (user_id, body) values (%s, ' ')", (people["ben"],)))
    bea = as_user("bea")
    check("a student cannot save cards",
          not attempt(bea, "insert into public.card_presets (user_id, body) values (%s, 'Mine')", (people["bea"],)))
    check("no one saves a card in someone else's name",
          not attempt(as_user("dee"), "insert into public.card_presets (user_id, body) values (%s, 'Yours')", (people["ben"],)))
    dee = as_user("dee")
    dee.execute("select count(*) from public.card_presets")
    check("another teacher cannot see someone's saved cards", dee.fetchone()[0] == 0)
    bea = as_user("bea")
    bea.execute("select count(*) from public.card_presets")
    check("a student cannot see a teacher's saved cards", bea.fetchone()[0] == 0)
    ben_agent = as_agent("ben")
    check("a teacher's agent cannot save a card",
          not attempt(ben_agent, "insert into public.card_presets (user_id, body) values (%s, 'From the agent')", (people["ben"],)))
    ben_agent.execute("delete from public.card_presets where id = %s", (preset,))
    check("a teacher's agent cannot remove a saved card", ben_agent.rowcount == 0)
    ben = as_user("ben")
    ben.execute("delete from public.card_presets where id = %s", (preset,))
    check("a teacher can remove a saved card", ben.rowcount == 1)

    # Kept only as long as the session needs it.
    eve = as_user("eve")
    eve.execute("select public.leave_cohort(%s)", (sc,))
    su9 = conn.cursor(); su9.execute("reset role")
    su9.execute("select count(*) from public.live_signals where id = %s", (stage_sig,))
    check("when someone leaves, a stage that names them goes", su9.fetchone()[0] == 0)
    ben = as_user("ben")
    ben.execute("update public.cohorts set status = 'finished' where id = %s", (sc,))
    su9 = conn.cursor(); su9.execute("reset role")
    su9.execute("select count(*) from public.live_signals where cohort_id = %s", (sc,))
    check("when the cohort is finished, its signals are deleted", su9.fetchone()[0] == 0)

    conn.rollback()
    conn.close()
    failed = [n for n, ok in results if not ok]
    print(f"\n{len(results) - len(failed)} of {len(results)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
