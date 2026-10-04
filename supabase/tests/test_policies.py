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
import json
import uuid
from pathlib import Path

import pgserver
import psycopg2

ROOT = Path(__file__).resolve().parents[1]

AUTH_STUB = """
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  raw_app_meta_data jsonb not null default '{}'::jsonb
);
create table auth.identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null,
  provider_id text,
  identity_data jsonb not null default '{}'::jsonb
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

# Realtime Authorization reads the channel's name through realtime.topic()
# and checks rules on realtime.messages (supabase.com/docs/guides/realtime/
# authorization). This stands in for both, so the board's Realtime rules
# are tested like every other rule.
REALTIME_STUB = """
create schema realtime;
create table realtime.messages (
  id bigserial primary key,
  topic text not null,
  extension text not null,
  event text,
  payload jsonb,
  private boolean not null default true,
  inserted_at timestamptz not null default now()
);
alter table realtime.messages enable row level security;
create function realtime.topic() returns text language sql stable as $$
  select nullif(current_setting('realtime.topic', true), '')
$$;
grant usage on schema realtime to anon, authenticated;
grant select, insert on realtime.messages to authenticated;
grant usage on sequence realtime.messages_id_seq to authenticated;
grant execute on function realtime.topic() to anon, authenticated;
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
    su.execute(REALTIME_STUB)
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
    check("a shown app is public with only its name, repository, address, and that it is from a cohort",
          cols == ["app_name", "app_repo", "app_url", "kind"] and [(r[1], r[3]) for r in rows] == [("bea/garden-swap", "cohort")])
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
    ben.execute("update public.teacher_notes set body = 'Your question about sync is the right one. Bring it next week, please.' where id = %s", (note,))
    check("the teacher who wrote a note can correct its words", ben.rowcount == 1)
    su8 = conn.cursor(); su8.execute("reset role")
    su8.execute("select edited_at is not null from public.teacher_notes where id = %s", (note,))
    check("a corrected note records that it was edited", su8.fetchone()[0] is True)
    ben = as_user("ben")
    check("a correction cannot move a note to another student",
          not attempt(ben, "update public.teacher_notes set student_id = %s where id = %s", (people["eve"], note)))
    bea = as_user("bea")
    bea.execute("update public.teacher_notes set body = 'changed by bea' where id = %s", (note,))
    check("the student cannot rewrite a note sent to them", bea.rowcount == 0)
    ben_agent = as_agent("ben")
    ben_agent.execute("update public.teacher_notes set body = 'edited by the agent' where id = %s", (note,))
    check("a teacher's agent cannot edit a note", ben_agent.rowcount == 0)
    ben = as_user("ben")
    bea = as_user("bea")
    bea.execute("select body from public.teacher_notes where cohort_id = %s", (nc,))
    check("the student reads the note sent to them", [r[0] for r in bea.fetchall()] == ["Your question about sync is the right one. Bring it next week, please."])
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
    check("when a student leaves, they keep the notes sent to them", su9.fetchone()[0] == 1)
    eve = as_user("eve")
    eve.execute("select count(*) from public.teacher_notes where student_id = %s", (people["eve"],))
    check("after leaving, the student can still read their notes", eve.fetchone()[0] == 1)
    ben = as_user("ben")
    ben.execute("update public.cohorts set status = 'finished' where id = %s", (nc,))
    su9 = conn.cursor(); su9.execute("reset role")
    su9.execute("select count(*) from public.teacher_notes where cohort_id = %s", (nc,))
    check("when the cohort is finished, its notes are kept", su9.fetchone()[0] == 2)

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



    # The board (migration 20261003150000): drawn on by the cohort, saved
    # element by element, locked and cleared only by teachers, never
    # written by an agent, and gone when the cohort finishes. bea and eve
    # are a group, fay is a classmate outside it, dee teaches elsewhere.
    import json, time
    def el(eid, version, nonce, index="a0", deleted=False, updated=None, text=None):
        e = {"id": eid, "type": "rectangle", "version": version, "versionNonce": nonce, "index": index,
             "isDeleted": deleted, "updated": updated if updated is not None else int(time.time() * 1000)}
        if text:
            e["customData"] = {"note": text}
        return e
    def ids(cur, board):
        cur.execute("select scene from public.boards where id = %s", (board,))
        row = cur.fetchone()
        return [(e["id"], e["version"]) for e in row[0]["elements"]] if row else None
    def topic_is(cur, t):
        cur.execute("select set_config('realtime.topic', %s, false)", (t,))
    def can_send(cur, t, extension="broadcast"):
        topic_is(cur, t)
        return attempt(cur, "insert into realtime.messages (topic, extension, event, payload) values (%s, %s, 'scene', '{}')", (t, extension))
    def can_listen(name, t):
        # Every cursor shares one connection, so the person is set again
        # after the stand-in message is written.
        sur = conn.cursor(); sur.execute("reset role")
        sur.execute("insert into realtime.messages (topic, extension, event, payload) values (%s, 'broadcast', 'scene', '{}')", (t,))
        cur = as_user(name)
        topic_is(cur, t)
        cur.execute("select count(*) from realtime.messages where topic = %s", (t,))
        return cur.fetchone()[0] > 0

    ben = as_user("ben")
    attempt(ben, "insert into public.cohorts (slug, title, created_by, status) values ('board-test', 'Board', %s, 'open') returning id", (people["ben"],))
    bc = last_rows[0][0]
    attempt(ben, "insert into public.sessions (cohort_id, number) values (%s, 1) returning id", (bc,))
    b1 = last_rows[0][0]
    attempt(ben, "insert into public.sessions (cohort_id, number) values (%s, 2) returning id", (bc,))
    b2 = last_rows[0][0]
    for name in ["bea", "eve", "fay"]:
        cur = as_user(name)
        attempt(cur, "insert into public.enrollments (cohort_id, user_id) values (%s, %s)", (bc, people[name]))
    ben = as_user("ben")
    attempt(ben, "insert into public.groups (cohort_id, name) values (%s, 'Board trio') returning id", (bc,))
    bg = last_rows[0][0]
    attempt(ben, "insert into public.group_members (group_id, user_id) values (%s, %s), (%s, %s)", (bg, people["bea"], bg, people["eve"]))

    dee = as_user("dee")
    dee.execute("select count(*) from public.open_board(%s, %s, null)", (bc, b1))
    check("someone outside the cohort cannot open its board", dee.fetchone()[0] == 0)
    agent = as_agent("bea")
    check("a student's agent cannot open a new board",
          attempt(agent, "select id from public.open_board(%s, %s, null)", (bc, b1)) and last_rows == [])
    bea = as_user("bea")
    check("anyone in the cohort opens the session's board, made on first arrival",
          attempt(bea, "select id, generation, locked from public.open_board(%s, %s, null)", (bc, b1)) and len(last_rows) == 1)
    board = last_rows[0][0]
    eve = as_user("eve")
    eve.execute("select id from public.open_board(%s, %s, null)", (bc, b1))
    check("the second person to arrive gets the same board", eve.fetchall() == [(board,)])
    check("a board starts empty, not someone's drawing",
          not attempt(eve, "insert into public.boards (cohort_id, session_id, created_by, scene) values (%s, %s, %s, %s)",
                      (bc, b2, people["eve"], json.dumps({"elements": [el("x", 1, 1)]}))))
    check("a board belongs to a session of its own cohort",
          not attempt(eve, "insert into public.boards (cohort_id, session_id, created_by) values (%s, %s, %s)", (bc, s1, people["eve"])))

    bea = as_user("bea")
    check("a student can save what they drew",
          attempt(bea, "select saved from public.save_board(%s, 0, %s)", (board, json.dumps([el("r1", 3, 50, "a0"), el("r2", 1, 9, "a1")]))) and last_rows == [(True,)])
    eve = as_user("eve")
    attempt(eve, "select saved from public.save_board(%s, 0, %s)", (board, json.dumps([el("r1", 2, 10, "a0"), el("c1", 1, 4, "a2")])))
    check("a save merges element by element: a classmate's older copy never erases a newer one",
          ids(eve, board) == [("r1", 3), ("r2", 1), ("c1", 1)])
    attempt(eve, "select saved from public.save_board(%s, 0, %s)", (board, json.dumps([el("r2", 4, 9, "a1")])))
    attempt(eve, "select saved from public.save_board(%s, 0, %s)", (board, json.dumps([el("r2", 4, 2, "a1", text="lower nonce")])))
    eve.execute("select e from public.boards, jsonb_array_elements(scene -> 'elements') e where id = %s and e ->> 'id' = 'r2'", (board,))
    check("two edits at the same version settle the way Excalidraw settles them (the lower versionNonce)",
          eve.fetchone()[0].get("customData", {}).get("note") == "lower nonce")
    long_ago = int(time.time() * 1000) - 2 * 86400000
    attempt(eve, "select saved from public.save_board(%s, 0, %s)", (board, json.dumps([el("c1", 2, 4, "a2", deleted=True, updated=long_ago)])))
    check("an element erased more than a day ago is dropped from the saved board", ids(eve, board) == [("r1", 3), ("r2", 4)])
    fay = as_user("fay")
    fay.execute("select count(*) from public.boards where id = %s", (board,))
    check("everyone in the cohort sees the session's board", fay.fetchone()[0] == 1)
    dee = as_user("dee")
    dee.execute("select count(*) from public.boards")
    check("someone outside the cohort sees no boards", dee.fetchone()[0] == 0)
    dee.execute("select generation, saved from public.save_board(%s, 0, %s)", (board, json.dumps([el("d1", 1, 1)])))
    check("someone outside the cohort cannot draw on it", dee.fetchall() == [(None, False)] and ids(as_user("ben"), board) == [("r1", 3), ("r2", 4)])
    anon = as_user(None)
    check("the public cannot read a board", not attempt(anon, "select count(*) from public.boards") or last_rows == [(0,)])
    check("the public cannot save a board", not attempt(anon, "select public.save_board(%s, 0, '[]')", (board,)))

    agent = as_agent("bea")
    agent.execute("select count(*) from public.boards where id = %s", (board,))
    check("a student's agent can read the board", agent.fetchone()[0] == 1)
    agent.execute("select generation, saved from public.save_board(%s, 0, %s)", (board, json.dumps([el("a1", 1, 1)])))
    check("a student's agent cannot draw on the board", agent.fetchall() == [(None, False)] and len(ids(as_user("ben"), board)) == 2)
    agent = as_agent("bea")
    agent.execute("update public.boards set scene = '{\"elements\": []}' where id = %s", (board,))
    check("a student's agent cannot write the board directly", agent.rowcount == 0)
    agent.execute("delete from public.boards where id = %s", (board,))
    check("a student's agent cannot delete a board", agent.rowcount == 0)
    ben_agent = as_agent("ben")
    ben_agent.execute("update public.boards set locked = true where id = %s", (board,))
    check("a teacher's agent cannot lock a board", ben_agent.rowcount == 0)

    bea = as_user("bea")
    check("a student cannot lock the board", not attempt(bea, "update public.boards set locked = true where id = %s", (board,)))
    check("a student cannot clear the board", not attempt(bea, "update public.boards set generation = 1, scene = '{\"elements\": []}' where id = %s", (board,)))
    check("a board cannot move to another session", not attempt(bea, "update public.boards set session_id = %s where id = %s", (b2, board)))
    ben = as_user("ben")
    check("a teacher can lock the board", attempt(ben, "update public.boards set locked = true where id = %s returning locked", (board,)) and last_rows == [(True,)])
    bea = as_user("bea")
    bea.execute("select generation, saved from public.save_board(%s, 0, %s)", (board, json.dumps([el("r1", 9, 1)])))
    check("no one but a teacher draws on a locked board", bea.fetchall() == [(None, False)] and ids(bea, board) == [("r1", 3), ("r2", 4)])
    fay = as_user("fay")
    fay.execute("select count(*) from public.boards where id = %s", (board,))
    check("a locked board can still be read, and so downloaded", fay.fetchone()[0] == 1)
    ben = as_user("ben")
    check("a teacher can still draw on a locked board",
          attempt(ben, "select saved from public.save_board(%s, 0, %s)", (board, json.dumps([el("t1", 1, 1, "a3")]))) and last_rows == [(True,)])
    check("a clear must empty the board", not attempt(ben, "update public.boards set generation = 1 where id = %s", (board,)))
    check("a clear moves one generation at a time", not attempt(ben, "update public.boards set generation = 5, scene = '{\"elements\": []}' where id = %s", (board,)))
    check("a teacher can clear the board and unlock it",
          attempt(ben, "update public.boards set generation = 1, scene = '{\"elements\": []}', locked = false where id = %s returning generation", (board,)) and last_rows == [(1,)])
    eve = as_user("eve")
    eve.execute("select generation, saved from public.save_board(%s, 0, %s)", (board, json.dumps([el("r1", 3, 50, "a0")])))
    check("a save from before the clear cannot bring the old drawing back", eve.fetchall() == [(1, False)] and ids(eve, board) == [])

    bea = as_user("bea")
    check("only a teacher makes a group's board",
          attempt(bea, "select id from public.open_board(%s, %s, %s)", (bc, b1, bg)) and last_rows == [])
    ben = as_user("ben")
    check("a teacher makes a board for a group",
          attempt(ben, "select id from public.open_board(%s, %s, %s)", (bc, b1, bg)) and len(last_rows) == 1)
    gboard = last_rows[0][0]
    check("a group's board must be for a group in the cohort",
          not attempt(ben, "insert into public.boards (cohort_id, session_id, group_id, created_by) values (%s, %s, %s, %s)", (bc, b2, ga, people["ben"])))
    bea = as_user("bea")
    bea.execute("select id from public.open_board(%s, %s, %s)", (bc, b1, bg))
    check("the group opens its board once the teacher has made it", bea.fetchall() == [(gboard,)])
    check("the group draws on its board",
          attempt(bea, "select saved from public.save_board(%s, 0, %s)", (gboard, json.dumps([el("g1", 1, 1)]))) and last_rows == [(True,)])
    fay = as_user("fay")
    fay.execute("select count(*) from public.boards where id = %s", (gboard,))
    check("a classmate outside the group cannot see the group's board", fay.fetchone()[0] == 0)
    fay.execute("select generation, saved from public.save_board(%s, 0, %s)", (gboard, json.dumps([el("f1", 1, 1)])))
    check("a classmate outside the group cannot draw on it", fay.fetchall() == [(None, False)])

    # The live strokes: Realtime's private channels, checked against
    # realtime.messages with the channel's name.
    t_main, t_group = "board:" + str(board), "board:" + str(gboard)
    check("everyone in the cohort can listen to the session's board", can_listen("fay", t_main))
    check("someone outside the cohort cannot listen to it", not can_listen("dee", t_main))
    check("the public cannot listen to it", not attempt(as_user(None), "select count(*) from realtime.messages") or last_rows == [(0,)])
    check("a classmate outside a group cannot listen to the group's board", not can_listen("fay", t_group))
    check("the group can listen to its board", can_listen("eve", t_group))
    check("a student can send strokes to the session's board", can_send(as_user("bea"), t_main))
    check("someone outside the cohort cannot send strokes", not can_send(as_user("dee"), t_main))
    check("a classmate outside a group cannot send strokes to its board", not can_send(as_user("fay"), t_group))
    check("a student's agent cannot send strokes", not can_send(as_agent("bea"), t_main))
    check("a student's agent cannot say it is here", not can_send(as_agent("bea"), t_main, "presence"))
    check("the rules name only board channels", not can_send(as_user("bea"), "live:" + str(bc)) and not can_send(as_user("bea"), "board:not-a-board"))
    ben = as_user("ben")
    ben.execute("update public.boards set locked = true where id = %s", (board,))
    check("no one but a teacher sends strokes to a locked board", not can_send(as_user("bea"), t_main) and can_send(as_user("ben"), t_main))
    check("on a locked board, people can still say they are here", can_send(as_user("bea"), t_main, "presence"))

    # The session's thread (migration 20261003170000): a teacher records
    # which GitHub discussion is this session's, and no one else does.
    bea = as_user("bea")
    bea.execute("update public.sessions set discussion_number = 7 where id = %s", (b1,))
    check("a student cannot set the session's thread", bea.rowcount == 0)
    agent = as_agent("ben")
    agent.execute("update public.sessions set discussion_number = 7 where id = %s", (b1,))
    check("a teacher's agent cannot set the session's thread", agent.rowcount == 0)
    dee = as_user("dee")
    dee.execute("update public.sessions set discussion_number = 7 where id = %s", (b1,))
    check("someone outside the cohort cannot set the session's thread", dee.rowcount == 0)
    ben = as_user("ben")
    check("a teacher sets the session's thread",
          attempt(ben, "update public.sessions set discussion_number = 7 where id = %s returning discussion_number", (b1,)) and last_rows == [(7,)])
    check("one thread belongs to one session",
          not attempt(ben, "update public.sessions set discussion_number = 7 where id = %s", (b2,)))
    check("a thread's number is a real one", not attempt(ben, "update public.sessions set discussion_number = 0 where id = %s", (b2,)))
    fay = as_user("fay")
    fay.execute("select discussion_number from public.sessions where id = %s", (b1,))
    check("everyone in the cohort reads which thread is the session's", fay.fetchall() == [(7,)])

    ben = as_user("ben")
    ben.execute("update public.cohorts set status = 'finished' where id = %s", (bc,))
    su9 = conn.cursor(); su9.execute("reset role")
    su9.execute("select count(*) from public.boards where cohort_id = %s", (bc,))
    check("when the cohort is finished, its boards are deleted", su9.fetchone()[0] == 0)

    # The room board (migration 20261003180000): each group's step, whose
    # turn it is, and "we would like the teacher", moved by the group and
    # its teachers, read by the cohort, never written by an agent, and
    # gone when the cohort finishes. bea and eve are a group, fay is in
    # another, dee teaches elsewhere.
    ben = as_user("ben")
    attempt(ben, "insert into public.cohorts (slug, title, created_by, status) values ('room-test', 'Rooms', %s, 'open') returning id", (people["ben"],))
    rc = last_rows[0][0]
    attempt(ben, "insert into public.sessions (cohort_id, number) values (%s, 1) returning id", (rc,))
    r1 = last_rows[0][0]
    for name in ["bea", "eve", "fay"]:
        cur = as_user(name)
        attempt(cur, "insert into public.enrollments (cohort_id, user_id) values (%s, %s)", (rc, people[name]))
    ben = as_user("ben")
    attempt(ben, "insert into public.groups (cohort_id, name) values (%s, 'Room trio') returning id", (rc,))
    rg = last_rows[0][0]
    attempt(ben, "insert into public.groups (cohort_id, name) values (%s, 'Other trio') returning id", (rc,))
    rg2 = last_rows[0][0]
    attempt(ben, "insert into public.group_members (group_id, user_id) values (%s, %s), (%s, %s), (%s, %s)",
            (rg, people["bea"], rg, people["eve"], rg2, people["fay"]))
    check("a teacher records a group's room in the Meet API",
          attempt(ben, "update public.groups set meet_space = 'spaces/abc-DEF_1' where id = %s returning meet_space", (rg,)) and last_rows == [("spaces/abc-DEF_1",)])
    check("a room's API name must look like one",
          not attempt(ben, "update public.groups set meet_space = 'https://meet.google.com/abc' where id = %s", (rg,)))
    bea = as_user("bea")
    check("a student cannot change their group's room",
          attempt(bea, "update public.groups set meet_space = 'spaces/mine' where id = %s returning id", (rg,)) and last_rows == [])

    move = "insert into public.live_room_state (cohort_id, session_id, group_id, step, presenter) values (%s, %s, %s, %s, %s) on conflict (session_id, group_id) do update set step = excluded.step, presenter = excluded.presenter returning step, updated_by"
    bea = as_user("bea")
    check("someone in a group moves its step",
          attempt(bea, move, (rc, r1, rg, 1, people["bea"])) and last_rows == [(1, people["bea"])])
    eve = as_user("eve")
    check("anyone else in the group moves it on",
          attempt(eve, move, (rc, r1, rg, 2, people["bea"])) and last_rows == [(2, people["eve"])])
    fay = as_user("fay")
    check("someone in another group cannot move this group's step", not attempt(fay, move, (rc, r1, rg, 3, people["bea"])))
    check("a turn belongs to someone in the group", not attempt(eve, move, (rc, r1, rg, 0, people["fay"])))
    check("a step is one of the turn's steps", not attempt(eve, move, (rc, r1, rg, 40, people["bea"])))
    check("a group's place belongs to a session of its own cohort", not attempt(eve, move, (rc, s1, rg, 0, people["bea"])))
    check("a group's place belongs to a group of its own cohort", not attempt(as_user("ben"), move, (rc, r1, bg, 0, None)))
    dee = as_user("dee")
    check("someone outside the cohort cannot move a group", not attempt(dee, move, (rc, r1, rg, 0, None)))
    agent = as_agent("eve")
    check("a student's agent cannot move their group", not attempt(agent, move, (rc, r1, rg, 3, people["bea"])))
    fay = as_user("fay")
    fay.execute("select step from public.live_room_state where group_id = %s", (rg,))
    check("everyone in the cohort sees where each group is", fay.fetchall() == [(2,)])
    dee = as_user("dee")
    dee.execute("select count(*) from public.live_room_state")
    check("someone outside the cohort sees no rooms", dee.fetchone()[0] == 0)
    check("the public cannot see the rooms",
          not attempt(as_user(None), "select count(*) from public.live_room_state") or last_rows == [(0,)])

    eve = as_user("eve")
    eve.execute("update public.live_room_state set help_at = '2000-01-01' where group_id = %s returning help_at > now() - interval '1 minute'", (rg,))
    check("asking for the teacher is stamped with the database's clock", eve.fetchall() == [(True,)])
    eve.execute("select help_at from public.live_room_state where group_id = %s", (rg,))
    asked = eve.fetchone()[0]
    bea = as_user("bea")
    bea.execute("update public.live_room_state set help_at = now() + interval '1 day' where group_id = %s returning help_at", (rg,))
    check("asking again keeps the first time", bea.fetchall() == [(asked,)])
    fay = as_user("fay")
    check("someone in another group cannot take the request back",
          attempt(fay, "update public.live_room_state set help_at = null where group_id = %s returning group_id", (rg,)) and last_rows == [])
    ben = as_user("ben")
    check("the teacher says they are there, which clears the request",
          attempt(ben, "update public.live_room_state set help_at = null where group_id = %s returning help_at, updated_by", (rg,)) and last_rows == [(None, people["ben"])])
    ben_agent = as_agent("ben")
    check("a teacher's agent cannot move a group",
          not attempt(ben_agent, "update public.live_room_state set step = 4 where group_id = %s returning step", (rg,)) or last_rows == [])
    ben = as_user("ben")
    check("a room's place cannot move to another group",
          not attempt(ben, "update public.live_room_state set group_id = %s where group_id = %s", (rg2, rg)))
    bea = as_user("bea")
    check("a student cannot delete a group's place",
          attempt(bea, "delete from public.live_room_state where group_id = %s returning group_id", (rg,)) and last_rows == [])

    ben = as_user("ben")
    ben.execute("delete from public.group_members where group_id = %s and user_id = %s", (rg, people["bea"]))
    ben.execute("select presenter from public.live_room_state where group_id = %s", (rg,))
    check("someone who leaves a group is no longer named as presenting", ben.fetchall() == [(None,)])
    ben.execute("update public.cohorts set status = 'finished' where id = %s", (rc,))
    su9 = conn.cursor(); su9.execute("reset role")
    su9.execute("select count(*) from public.live_room_state where cohort_id = %s", (rc,))
    check("when the cohort is finished, where each group was is deleted", su9.fetchone()[0] == 0)

    # The teacher's talk share (migration 20261003190000): one number per
    # session, saved by a teacher of the cohort, read by the cohort, never
    # written by an agent or a student, and gone when the cohort finishes.
    # "talk" is a signal like "recording". bea is a student, dee teaches
    # elsewhere and is not in the cohort.
    ben = as_user("ben")
    attempt(ben, "insert into public.cohorts (slug, title, created_by, status) values ('talk-test', 'Talk', %s, 'open') returning id", (people["ben"],))
    tc = last_rows[0][0]
    attempt(ben, "insert into public.sessions (cohort_id, number) values (%s, 1), (%s, 2) returning id", (tc, tc))
    t1, t2 = last_rows[0][0], last_rows[1][0]
    bea = as_user("bea")
    attempt(bea, "insert into public.enrollments (cohort_id, user_id) values (%s, %s)", (tc, people["bea"]))
    ben = as_user("ben")
    check("a teacher can tell everyone they are measuring their talk",
          attempt(ben, "insert into public.live_signals (cohort_id, session_id, created_by, kind) values (%s, %s, %s, 'talk') returning id", (tc, t1, people["ben"])))
    check("measuring talk names nobody",
          not attempt(ben, "insert into public.live_signals (cohort_id, session_id, created_by, kind, people) values (%s, %s, %s, 'talk', %s::uuid[])", (tc, t1, people["ben"], "{%s}" % people["bea"])))
    note = "insert into public.session_notes (session_id, cohort_id, teacher_talk_share) values (%s, %s, %s) returning teacher_talk_share, saved_by"
    check("a teacher saves their own talk share for a session, in their name",
          attempt(ben, note + "", (t1, tc, 0.41)) and str(last_rows[0][0]) == "0.410" and last_rows[0][1] == people["ben"])
    check("a share is between 0 and 1", not attempt(ben, note, (t2, tc, 1.2)))
    check("a session has one share", not attempt(ben, note, (t1, tc, 0.5)))
    check("a teacher can correct the share",
          attempt(ben, "update public.session_notes set teacher_talk_share = 0.38 where session_id = %s returning teacher_talk_share", (t1,)) and str(last_rows[0][0]) == "0.380")
    check("a share stays with its session",
          not attempt(ben, "update public.session_notes set session_id = %s where session_id = %s", (t2, t1)))
    bea = as_user("bea")
    bea.execute("select teacher_talk_share from public.session_notes where session_id = %s", (t1,))
    check("someone in the cohort reads the teacher's share", [str(r[0]) for r in bea.fetchall()] == ["0.380"])
    check("a student cannot save a share", not attempt(bea, note, (t2, tc, 0.1)))
    check("a student cannot change the share",
          attempt(bea, "update public.session_notes set teacher_talk_share = 0 where session_id = %s returning session_id", (t1,)) and last_rows == [])
    check("a student cannot delete the share",
          attempt(bea, "delete from public.session_notes where session_id = %s returning session_id", (t1,)) and last_rows == [])
    dee = as_user("dee")
    dee.execute("select count(*) from public.session_notes where cohort_id = %s", (tc,))
    check("someone outside the cohort cannot read the share", dee.fetchone()[0] == 0)
    check("a teacher of another cohort cannot save one here", not attempt(dee, note, (t2, tc, 0.2)))
    ben_agent = as_agent("ben")
    check("a teacher's agent cannot save a share", not attempt(ben_agent, note, (t2, tc, 0.2)))
    check("a teacher's agent cannot change a share",
          not attempt(ben_agent, "update public.session_notes set teacher_talk_share = 0.9 where session_id = %s returning session_id", (t1,)) or last_rows == [])
    ben = as_user("ben")
    check("a share must belong to a session of the cohort",
          not attempt(ben, note, (r1, tc, 0.3)))
    check("a teacher can take the share back",
          attempt(ben, "delete from public.session_notes where session_id = %s returning session_id", (t1,)) and len(last_rows) == 1)
    attempt(ben, note, (t2, tc, 0.5))
    ben.execute("update public.cohorts set status = 'finished' where id = %s", (tc,))
    su9.execute("select count(*) from public.session_notes where cohort_id = %s", (tc,))
    check("when the cohort is finished, the talk shares are deleted", su9.fetchone()[0] == 0)

    # ---- Alumni and mentors (migration 20261003200000) ------------------
    # Every cursor shares one connection, so each act starts by becoming
    # the person who does it.
    u = as_user

    def one(name, sql, args=()):
        cur = u(name)
        cur.execute(sql, args)
        return cur.fetchone()

    su10 = conn.cursor(); su10.execute("reset role")
    for name in ["gil", "hal"]:
        uid = str(uuid.uuid4())
        su10.execute("insert into auth.users (id, raw_user_meta_data) values (%s, %s)",
                     (uid, f'{{"user_name": "{name}", "provider_id": "{abs(hash(name)) % 10**8}"}}'))
        people[name] = uid
    attempt(u("ben"), "insert into public.cohorts (slug, title, created_by, status) values ('alum-from', 'Earlier', %s, 'open') returning id", (people["ben"],))
    early = last_rows[0][0]
    attempt(u("ben"), "insert into public.sessions (cohort_id, number, title) values (%s, 1, 'Week 1')", (early,))
    for name in ["gil", "hal"]:
        attempt(u(name), "insert into public.enrollments (cohort_id, user_id, app_name, app_repo, app_url) values (%s, %s, 'Seed Library', %s, 'https://example.org/seeds')",
                (early, people[name], f"{name}/seed-library"))
    attempt(u("ben"), "update public.cohorts set status = 'finished' where id = %s", (early,))
    su10 = conn.cursor(); su10.execute("reset role")
    su10.execute("select count(*) from public.enrollments where cohort_id = %s and status = 'finished'", (early,))
    check("finishing a cohort marks everyone still in it finished", su10.fetchone()[0] == 2)
    check("a finished member still reads their cohort's sessions",
          one("gil", "select count(*) from public.sessions where cohort_id = %s", (early,))[0] == 1)
    check("a finished member still sees who was in the cohort",
          one("gil", "select count(*) from public.enrollments where cohort_id = %s", (early,))[0] == 2)
    check("a finished member cannot mark themselves enrolled again",
          not attempt(u("gil"), "update public.enrollments set status = 'enrolled' where cohort_id = %s and user_id = %s", (early, people["gil"])))
    attempt(u("ben"), "update public.cohorts set status = 'running' where id = %s", (early,))
    su10 = conn.cursor(); su10.execute("reset role")
    su10.execute("select count(*) from public.enrollments where cohort_id = %s and status = 'enrolled'", (early,))
    check("reopening a finished cohort puts its members back in it", su10.fetchone()[0] == 2)
    attempt(u("ben"), "update public.cohorts set status = 'finished' where id = %s", (early,))
    attempt(u("ben"), issue.replace("'Garden Swap', 'https://example.org/app'", "'Seed Library', 'https://example.org/seeds'"),
            (people["gil"], early, people["ben"], ["web"], "{}", "gil/seed-library"))
    gil_cred = last_rows[0][0] if last_rows else None
    check("the teacher records the finished student's credential", gil_cred is not None)

    attempt(u("ben"), "insert into public.cohorts (slug, title, created_by, status) values ('alum-to', 'Later', %s, 'open') returning id", (people["ben"],))
    later = last_rows[0][0]
    attempt(u("ben"), "insert into public.cohorts (slug, title, created_by) values ('alum-draft', 'Draft', %s) returning id", (people["ben"],))
    draft = last_rows[0][0]
    attempt(u("bea"), "insert into public.enrollments (cohort_id, user_id) values (%s, %s)", (later, people["bea"]))
    check("a student cannot make themselves a mentor",
          not attempt(u("bea"), "update public.enrollments set role = 'mentor' where cohort_id = %s and user_id = %s", (later, people["bea"])))
    check("no one joins as a mentor directly (only as a student)",
          not attempt(u("gil"), "insert into public.enrollments (cohort_id, user_id, role) values (%s, %s, 'mentor')", (later, people["gil"])))
    check("someone without a credential is not offered mentoring", one("hal", "select public.can_mentor()")[0] is False)
    check("someone without a credential cannot join as a mentor",
          not attempt(u("hal"), "select public.join_as_mentor(%s)", (later,)))
    check("a credential holder is offered mentoring", one("gil", "select public.can_mentor()")[0] is True)
    check("a credential holder cannot mentor a draft cohort", not attempt(u("gil"), "select public.join_as_mentor(%s)", (draft,)))
    check("a credential holder cannot mentor a finished cohort", not attempt(u("gil"), "select public.join_as_mentor(%s)", (early,)))
    check("a credential holder's agent cannot join as a mentor",
          not attempt(as_agent("gil"), "select public.join_as_mentor(%s)", (later,)))
    check("a credential holder joins an open cohort as a mentor",
          attempt(u("gil"), "select public.join_as_mentor(%s)", (later,)))
    check("they are in it as a mentor",
          one("gil", "select role::text, status::text from public.enrollments where cohort_id = %s and user_id = %s", (later, people["gil"])) == ("mentor", "enrolled"))
    check("a mentor cannot join the same cohort twice", not attempt(u("gil"), "select public.join_as_mentor(%s)", (later,)))
    check("a mentor can edit their own app details",
          attempt(u("gil"), "update public.enrollments set app_name = 'Seed Library, again' where cohort_id = %s and user_id = %s returning app_name", (later, people["gil"])) and len(last_rows) == 1)
    check("a mentor cannot make themselves a student",
          not attempt(u("gil"), "update public.enrollments set role = 'student' where cohort_id = %s and user_id = %s", (later, people["gil"])))
    check("a teacher cannot be a mentor in their own cohort", not attempt(u("ben"), "select public.join_as_mentor(%s)", (later,)))

    attempt(u("ben"), "insert into public.teacher_notes (cohort_id, student_id, author_id, body) values (%s, %s, %s, 'For bea alone.')", (later, people["bea"], people["ben"]))
    attempt(u("bea"), "insert into public.calendar_contacts (cohort_id, user_id, email) values (%s, %s, 'bea@example.org')", (later, people["bea"]))
    check("a mentor cannot read a teacher's notes to students",
          one("gil", "select count(*) from public.teacher_notes where cohort_id = %s", (later,))[0] == 0)
    check("a mentor cannot read students' calendar emails",
          one("gil", "select count(*) from public.calendar_contacts where cohort_id = %s and user_id <> %s", (later, people["gil"]))[0] == 0)
    check("a mentor sees who is in the cohort, like any member",
          one("gil", "select count(*) from public.enrollments where cohort_id = %s", (later,))[0] == 2)

    check("a teacher can make a student a mentor",
          attempt(u("ben"), "update public.enrollments set role = 'mentor' where cohort_id = %s and user_id = %s returning role::text", (later, people["bea"])) and last_rows == [("mentor",)])
    check("and a mentor a student again",
          attempt(u("ben"), "update public.enrollments set role = 'student' where cohort_id = %s and user_id = %s returning role::text", (later, people["bea"])) and last_rows == [("student",)])
    check("a teacher of another cohort cannot change a role here",
          attempt(u("dee"), "update public.enrollments set role = 'mentor' where cohort_id = %s and user_id = %s returning role", (later, people["bea"])) and last_rows == [])

    attempt(u("gil"), "select public.leave_cohort(%s)", (later,))
    check("a mentor can leave",
          one("gil", "select status::text from public.enrollments where cohort_id = %s and user_id = %s", (later, people["gil"])) == ("left",))
    check("someone who left cannot put themselves back",
          not attempt(u("gil"), "update public.enrollments set status = 'enrolled' where cohort_id = %s and user_id = %s", (later, people["gil"])))
    check("someone who left can come back as a mentor", attempt(u("gil"), "select public.join_as_mentor(%s)", (later,)))
    check("and is a mentor again",
          one("gil", "select role::text, status::text from public.enrollments where cohort_id = %s and user_id = %s", (later, people["gil"])) == ("mentor", "enrolled"))

    attempt(u("ben"), "insert into public.cohorts (slug, title, created_by, status) values ('alum-run', 'Running', %s, 'open') returning id", (people["ben"],))
    running = last_rows[0][0]
    attempt(u("ben"), "update public.cohorts set status = 'running' where id = %s", (running,))
    check("a credential holder can mentor a running cohort", attempt(u("gil"), "select public.join_as_mentor(%s)", (running,)))
    attempt(u("ben"), "update public.credentials set revoked_at = now(), revoked_reason = 'Test.' where id = %s", (gil_cred,))
    attempt(u("ben"), "insert into public.cohorts (slug, title, created_by, status) values ('alum-after', 'After', %s, 'open') returning id", (people["ben"],))
    after = last_rows[0][0]
    check("a revoked credential no longer opens mentoring", not attempt(u("gil"), "select public.join_as_mentor(%s)", (after,)))

    # Marks on the path (G3): a person's own, read and written by them alone.
    # Cal deleted their account above, so they come back as a new person.
    su9 = conn.cursor(); su9.execute("reset role")
    people["cal"] = str(uuid.uuid4())
    su9.execute("insert into auth.users (id, raw_user_meta_data) values (%s, %s)",
                (people["cal"], '{"user_name": "cal", "provider_id": "4242", "avatar_url": "https://example.org/cal.png"}'))
    mark ="insert into public.stage_marks (user_id, stage, item, state, note) values (%s, %s, %s, %s, %s) returning stage, item, state"
    cal = as_user("cal")
    check("someone marks a step of a stage done",
          attempt(cal, mark, (people["cal"], "01", "step-2", "done", None)) and last_rows == [("01", "step-2", "done")])
    check("they mark themselves ready, or not yet",
          attempt(cal, mark, (people["cal"], "01", "ready", "not-yet", None)))
    check("they change their mind",
          attempt(cal, "update public.stage_marks set state = 'ready' where user_id = %s and stage = '01' and item = 'ready' returning state", (people["cal"],))
          and last_rows == [("ready",)])
    check("they keep a note privately",
          attempt(cal, mark, (people["cal"], "setup", "note", "kept", "The address opened on my phone.")))
    check("a mark is one of the path's stages", not attempt(cal, mark, (people["cal"], "09", "ready", "ready", None)))
    check("a step is not marked ready", not attempt(cal, mark, (people["cal"], "02", "step-1", "ready", None)))
    check("a note has words", not attempt(cal, mark, (people["cal"], "02", "note", "kept", "  ")))
    check("only a note carries words", not attempt(cal, mark, (people["cal"], "02", "ready", "ready", "hidden words")))
    check("a stage has one mark of each kind", not attempt(cal, mark, (people["cal"], "01", "step-2", "done", None)))
    check("nobody marks for someone else", not attempt(cal, mark, (people["bea"], "01", "ready", "ready", None)))
    cal.execute("select count(*) from public.stage_marks")
    check("a person reads their own marks", cal.fetchone()[0] == 3)
    ben = as_user("ben")
    ben.execute("select count(*) from public.stage_marks where user_id = %s", (people["cal"],))
    check("a teacher cannot read a person's marks", ben.fetchone()[0] == 0)
    bea = as_user("bea")
    bea.execute("select count(*) from public.stage_marks where user_id = %s", (people["cal"],))
    check("another student cannot read them", bea.fetchone()[0] == 0)
    check("another student cannot change them",
          attempt(bea, "update public.stage_marks set state = 'not-yet' where user_id = %s and item = 'ready' returning state", (people["cal"],)) and last_rows == [])
    check("another student cannot remove them",
          attempt(bea, "delete from public.stage_marks where user_id = %s returning item", (people["cal"],)) and last_rows == [])
    anon = as_user(None)
    check("no one signed out reads them", not attempt(anon, "select count(*) from public.stage_marks") or last_rows == [(0,)])
    cal_agent = as_agent("cal")
    cal_agent.execute("select count(*) from public.stage_marks")
    check("a person's own agent reads their marks", cal_agent.fetchone()[0] == 3)
    check("their agent cannot mark a step", not attempt(cal_agent, mark, (people["cal"], "03", "step-1", "done", None)))
    check("their agent cannot change a mark",
          not attempt(cal_agent, "update public.stage_marks set state = 'not-yet' where user_id = %s and item = 'ready' returning state", (people["cal"],)) or last_rows == [])
    check("their agent cannot remove a mark",
          not attempt(cal_agent, "delete from public.stage_marks where user_id = %s returning item", (people["cal"],)) or last_rows == [])
    cal = as_user("cal")
    check("a person removes their own mark",
          attempt(cal, "delete from public.stage_marks where user_id = %s and stage = '01' and item = 'step-2' returning item", (people["cal"],)) and len(last_rows) == 1)
    cal.execute("select public.delete_my_account()")
    su9.execute("select count(*) from public.stage_marks where user_id = %s", (people["cal"],))
    check("deleting the account deletes the marks", su9.fetchone()[0] == 0)

    # ---- Reaching someone off the site (migration 20261003220000) -------
    su11 = conn.cursor(); su11.execute("reset role")
    for name in ["ivy", "jon"]:
        uid = str(uuid.uuid4())
        su11.execute("insert into auth.users (id, raw_user_meta_data) values (%s, %s)",
                     (uid, f'{{"user_name": "{name}", "provider_id": "{abs(hash(name)) % 10**8}"}}'))
        people[name] = uid
    attempt(u("ben"), "insert into public.cohorts (slug, title, created_by, status) values ('reach', 'Reach', %s, 'open') returning id", (people["ben"],))
    rc = last_rows[0][0]
    for name in ["ivy", "jon"]:
        attempt(u(name), "insert into public.enrollments (cohort_id, user_id) values (%s, %s)", (rc, people[name]))

    def count_as(cur, sql, args=()):
        cur.execute(sql, args)
        return cur.fetchone()[0]

    check("nothing is on until a person chooses it",
          one("ivy", "select count(*) from public.reach_choices")[0] == 0)
    check("a person cannot allow email without giving an address",
          not attempt(u("ivy"), "insert into public.reach_choices (user_id, teachers_may_email) values (%s, true)", (people["ivy"],)))
    check("a person can let their teachers email them",
          attempt(u("ivy"), "insert into public.reach_choices (user_id, email, teachers_may_email) values (%s, 'ivy@example.org', true)", (people["ivy"],)))
    check("no one can choose for someone else",
          not attempt(u("jon"), "insert into public.reach_choices (user_id, email, teachers_may_email) values (%s, 'x@example.org', true)", (people["ivy"],)))
    check("a classmate cannot read someone's address",
          one("jon", "select count(*) from public.reach_choices where user_id = %s", (people["ivy"],))[0] == 0)
    check("a teacher cannot read the table directly either",
          one("ben", "select count(*) from public.reach_choices")[0] == 0)
    check("a person's own agent cannot read their address",
          count_as(as_agent("ivy"), "select count(*) from public.reach_choices") == 0)
    check("an agent cannot change the choice",
          attempt(as_agent("ivy"), "update public.reach_choices set teachers_may_email = false returning user_id") and last_rows == [])

    ok = attempt(u("ben"), "select user_id, may_email, email from public.reach_for(%s)", (rc,))
    got = {r[0]: (r[1], r[2]) for r in last_rows} if ok else {}
    check("a teacher sees the address of someone who chose it",
          got.get(people["ivy"]) == (True, "ivy@example.org"))
    check("and no address for someone who did not choose it",
          got.get(people["jon"]) == (False, None))
    check("a student cannot ask how to reach classmates",
          not attempt(u("jon"), "select * from public.reach_for(%s)", (rc,)))
    check("a teacher of another cohort cannot ask",
          not attempt(u("dee"), "select * from public.reach_for(%s)", (rc,)))
    check("a teacher's agent cannot ask",
          not attempt(as_agent("ben"), "select * from public.reach_for(%s)", (rc,)))

    attempt(u("ivy"), "update public.reach_choices set teachers_may_email = false where user_id = %s", (people["ivy"],))
    attempt(u("ben"), "select user_id, may_email, email from public.reach_for(%s)", (rc,))
    check("turning it off hides the address from teachers at once",
          {r[0]: r[2] for r in last_rows}.get(people["ivy"], "missing") is None)

    attempt(u("jon"), "select public.leave_cohort(%s)", (rc,))
    attempt(u("ben"), "select user_id from public.reach_for(%s)", (rc,))
    check("someone who left is not listed", people["jon"] not in [r[0] for r in last_rows])

    check("a person can ask for notices",
          attempt(u("ivy"), "update public.reach_choices set notices = true where user_id = %s returning notified_at is not null", (people["ivy"],)) and last_rows == [(True,)])
    check("a person cannot move their own notice clock",
          attempt(u("ivy"), "update public.reach_choices set notified_at = now() - interval '9 days' where user_id = %s returning notified_at > now() - interval '1 minute'", (people["ivy"],)) and last_rows == [(True,)])
    check("no one signed in can read the digest",
          not attempt(u("ben"), "select * from public.notice_digest()"))
    check("no one signed in can mark notices sent",
          not attempt(u("ivy"), "select public.mark_notified(array[%s]::uuid[])", (people["ivy"],)))

    def as_server():
        """The service role, as the notices function calls it: no one signed in."""
        cur = conn.cursor()
        cur.execute("reset role")
        cur.execute("select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claims', '', false)")
        cur.execute("set role service_role")
        return cur

    attempt(u("ben"), "insert into public.teacher_notes (cohort_id, student_id, author_id, body) values (%s, %s, %s, 'We missed you. Here is the recording.')", (rc, people["ivy"], people["ben"]))
    sv = as_server(); sv.execute("reset role")
    sv.execute("update public.reach_choices set notified_at = now() - interval '2 days' where user_id = %s", (people["ivy"],))
    sv = as_server()
    sv.execute("select user_id, email, notes, answers from public.notice_digest()")
    rows = [(str(r[0]), r[1], r[2], r[3]) for r in sv.fetchall()]
    check("the server's digest names who has something waiting, with counts and no words",
          rows == [(people["ivy"], "ivy@example.org", 1, 0)])
    sv.execute("select public.mark_notified(array[%s]::uuid[])", (people["ivy"],))
    sv.execute("select count(*) from public.notice_digest()")
    check("once sent, the same note is not sent again", sv.fetchone()[0] == 0)
    sv.execute("reset role")

    attempt(u("ivy"), "select public.delete_my_account()")
    sv = conn.cursor(); sv.execute("reset role")
    sv.execute("select count(*) from public.reach_choices where user_id = %s", (people["ivy"],))
    check("deleting the account deletes the choice", sv.fetchone()[0] == 0)

    # ---- A builder's own app, outside any cohort (migration 20261004010000)
    su12 = conn.cursor(); su12.execute("reset role")
    for name in ["kim", "lou"]:
        uid = str(uuid.uuid4())
        su12.execute("insert into auth.users (id, raw_user_meta_data) values (%s, %s)",
                     (uid, f'{{"user_name": "{name}", "provider_id": "{abs(hash(name)) % 10**8}"}}'))
        people[name] = uid

    def builder_rows():
        cur = as_user(None)
        cur.execute("select app_repo, kind from public.public_apps() where kind = 'builder'")
        return cur.fetchall()

    check("a builder outside any cohort can add their own app, kept private at first",
          attempt(u("kim"), "insert into public.builder_apps (user_id, app_repo, app_name, app_url) values (%s, 'kim/tide-log', 'Tide Log', 'https://kim.github.io/tide-log/')", (people["kim"],))
          and builder_rows() == [])
    check("no one can add an app in someone else's name",
          not attempt(u("lou"), "insert into public.builder_apps (user_id, app_repo) values (%s, 'lou/not-kims')", (people["kim"],)))
    check("a builder's own AI agent cannot add or change their app",
          not attempt(as_agent("lou"), "insert into public.builder_apps (user_id, app_repo) values (%s, 'lou/by-agent')", (people["lou"],))
          and (lambda ok: not ok or last_rows == [])(attempt(as_agent("kim"), "update public.builder_apps set public = true where user_id = %s returning user_id", (people["kim"],))))
    check("a repository must be written as owner/name",
          not attempt(u("lou"), "insert into public.builder_apps (user_id, app_repo) values (%s, 'not a repo')", (people["lou"],)))
    check("an app's address must be https",
          not attempt(u("lou"), "insert into public.builder_apps (user_id, app_repo, app_url) values (%s, 'lou/x', 'javascript:alert(1)')", (people["lou"],)))
    check("a builder can choose to show their app in public",
          attempt(u("kim"), "update public.builder_apps set public = true where user_id = %s", (people["kim"],))
          and builder_rows() == [("kim/tide-log", "builder")])
    check("a shown builder's app comes after cohort apps, and says it is a builder's own",
          (lambda c: (c.execute("select kind from public.public_apps()"), [r[0] for r in c.fetchall()])[1])(as_user(None))[-1] == "builder")
    check("another person cannot read a builder's row, only the public list",
          one("lou", "select count(*) from public.builder_apps where user_id = %s", (people["kim"],))[0] == 0)
    anon = as_user(None)
    check("the public cannot read the table of builders' apps, which names who they are",
          not attempt(anon, "select user_id from public.builder_apps") or last_rows == [])
    lou = u("lou")
    lou.execute("update public.builder_apps set public = false where user_id = %s", (people["kim"],))
    check("another person cannot hide a builder's app by changing it", lou.rowcount == 0)
    check("an app stays with the person who added it",
          not attempt(u("kim"), "update public.builder_apps set user_id = %s where user_id = %s", (people["lou"], people["kim"])))
    attempt(u("lou"), "insert into public.builder_apps (user_id, app_repo) values (%s, 'lou/quiet-one')", (people["lou"],))
    check("an approver can read shown builders' apps, so they can hide one, and not private ones",
          one("ben", "select count(*) from public.builder_apps where user_id = %s", (people["kim"],))[0] == 1
          and one("ben", "select count(*) from public.builder_apps where user_id = %s", (people["lou"],))[0] == 0)
    check("a teacher who does not approve teachers cannot hide a builder's app",
          not attempt(u("bea"), "insert into public.builder_app_hides (user_id, reason, hidden_by) values (%s, 'no', %s)", (people["kim"], people["bea"])))
    check("an approver can hide a builder's app, in their own name, with a reason",
          attempt(u("ben"), "insert into public.builder_app_hides (user_id, reason, hidden_by) values (%s, 'It asks for a password before it says what it is.', %s)", (people["kim"], people["ben"]))
          and builder_rows() == [])
    check("an approver cannot hide in someone else's name",
          not attempt(u("ben"), "update public.builder_app_hides set hidden_by = %s where user_id = %s", (people["bea"], people["kim"])))
    check("the builder sees that their app is hidden, and why",
          one("kim", "select reason from public.builder_app_hides where user_id = %s", (people["kim"],))[0].startswith("It asks for a password"))
    check("the hide never moves the builder's own switch",
          one("kim", "select public from public.builder_apps where user_id = %s", (people["kim"],))[0] is True)
    check("the builder cannot take the hide down themselves",
          not attempt(u("kim"), "delete from public.builder_app_hides where user_id = %s returning user_id", (people["kim"],)) or last_rows == [])
    check("another person cannot read why an app was hidden",
          one("lou", "select count(*) from public.builder_app_hides")[0] == 0)
    check("an approver can show it again",
          attempt(u("ben"), "delete from public.builder_app_hides where user_id = %s returning user_id", (people["kim"],)) and len(last_rows) == 1
          and builder_rows() == [("kim/tide-log", "builder")])
    check("a builder can take their app off the hub",
          attempt(u("lou"), "delete from public.builder_apps where user_id = %s returning user_id", (people["lou"],)) and len(last_rows) == 1)
    attempt(u("kim"), "select public.delete_my_account()")
    check("deleting the account deletes the builder's app, and it leaves the public list", builder_rows() == [])

    # ---- A teacher asks meet@ to set up the calls (migration 20261004000000)
    attempt(u("ben"), "insert into public.cohorts (slug, title, created_by, status, time_zone) values ('queue', 'Queue', %s, 'open', 'America/Denver') returning id", (people["ben"],))
    qc = last_rows[0][0]
    attempt(u("jon"), "insert into public.enrollments (cohort_id, user_id) values (%s, %s)", (qc, people["jon"]))
    attempt(u("jon"), "insert into public.calendar_contacts (cohort_id, user_id, email) values (%s, %s, 'jon@example.org')", (qc, people["jon"]))
    attempt(u("ben"), "insert into public.calendar_contacts (cohort_id, user_id, email) values (%s, %s, 'ben@example.org')", (qc, people["ben"]))
    attempt(u("ben"), "insert into public.sessions (cohort_id, number) values (%s, 1), (%s, 2)", (qc, qc))
    attempt(u("ben"), "insert into public.groups (cohort_id, name) values (%s, 'Trio Q') returning id", (qc,))
    qg = last_rows[0][0]
    attempt(u("ben"), "insert into public.group_members (group_id, user_id) values (%s, %s)", (qg, people["jon"]))

    check("a student cannot ask meet@ to set up the calls",
          not attempt(u("jon"), "insert into public.setup_requests (cohort_id) values (%s)", (qc,)))
    check("a teacher of another cohort cannot ask for this one",
          not attempt(u("dee"), "insert into public.setup_requests (cohort_id) values (%s)", (qc,)))
    check("a teacher's agent cannot ask",
          not attempt(as_agent("ben"), "insert into public.setup_requests (cohort_id) values (%s)", (qc,)))
    check("a request cannot carry an email address",
          not attempt(u("ben"), "insert into public.setup_requests (cohort_id, payload) values (%s, '{\"note\": \"x@example.org\"}')", (qc,)))
    check("the cohort's teacher can ask, and it starts waiting whatever they send",
          attempt(u("ben"), "insert into public.setup_requests (cohort_id, state, detail) values (%s, 'done', 'made up') returning state, detail, requested_by", (qc,))
          and last_rows == [("waiting", None, people["ben"])])
    check("asking twice does not queue two",
          not attempt(u("ben"), "insert into public.setup_requests (cohort_id) values (%s)", (qc,)))
    check("a student cannot see the request",
          one("jon", "select count(*) from public.setup_requests where cohort_id = %s", (qc,))[0] == 0)
    check("the teacher cannot mark their own request done",
          attempt(u("ben"), "update public.setup_requests set state = 'done' where cohort_id = %s returning id", (qc,)) and last_rows == [])
    check("no one signed in can claim requests",
          not attempt(u("ben"), "select * from public.claim_setup_requests(5)"))

    sv = as_server()
    sv.execute("select id, cohort ->> 'slug', members, teachers, groups from public.claim_setup_requests(5)")
    got = sv.fetchall()
    check("meet@'s script claims it with the invitation emails read at that moment",
          len(got) == 1 and got[0][1] == "queue" and list(got[0][2]) == ["jon@example.org"] and list(got[0][3]) == ["ben@example.org"]
          and got[0][4][0]["emails"] == ["jon@example.org"])
    rid = got[0][0]
    sv.execute("select count(*) from public.claim_setup_requests(5)")
    check("a claimed request is not handed out twice", sv.fetchone()[0] == 0)
    key = "g-" + str(qg).replace("-", "")[:8]
    sv.execute("select public.finish_setup_request(%s, true, 'Made.', 'https://meet.google.com/abc-defg-hij', %s::jsonb)",
               (rid, '{"%s": {"url": "https://meet.google.com/qqq-rrrr-sss", "space": "spaces/AbC_12"}}' % key))
    sv.execute("reset role")
    sv.execute("select count(*) from public.sessions where cohort_id = %s and meet_url = 'https://meet.google.com/abc-defg-hij'", (qc,))
    check("the weekly Meet link goes on every session", sv.fetchone()[0] == 2)
    sv.execute("select meet_url, meet_space from public.groups where id = %s", (qg,))
    check("and the group's room goes on its group", sv.fetchone() == ("https://meet.google.com/qqq-rrrr-sss", "spaces/AbC_12"))
    check("the teacher sees it done",
          one("ben", "select state from public.setup_requests where id = %s", (rid,))[0] == "done")
    sv = as_server()
    sv.execute("select public.finish_setup_request(%s, true, 'again', 'https://meet.google.com/zzz-zzzz-zzz', null)", (rid,))
    check("a finished request cannot be finished again", sv.fetchone()[0] == "not working")
    sv.execute("reset role")
    check("the teacher can clear a finished request and ask again",
          attempt(u("ben"), "delete from public.setup_requests where id = %s returning id", (rid,)) and len(last_rows) == 1
          and attempt(u("ben"), "insert into public.setup_requests (cohort_id) values (%s)", (qc,)))

    # ---- Co-teachers (migration 20261004020000) -------------------------
    if "kofi" not in people:
        uid = str(uuid.uuid4())
        su.execute("reset role")
        su.execute("insert into auth.users (id, raw_user_meta_data) values (%s, %s)",
                   (uid, '{"user_name": "kofi", "provider_id": "%d"}' % (abs(hash("kofi")) % 10**8)))
        people["kofi"] = uid
    su.execute("reset role")
    su.execute("insert into public.teachers (user_id) values (%s) on conflict do nothing", (people["kofi"],))
    attempt(as_user("ben"), "insert into public.cohorts (slug, title, created_by) values ('co-teach', 'Co-teach', %s) returning id", (people["ben"],))
    ct = last_rows[0][0]
    check("a teacher can add another teacher to their cohort",
          attempt(as_user("ben"), "insert into public.cohort_teachers (cohort_id, user_id) values (%s, %s)", (ct, people["kofi"])))
    check("a student cannot remove a cohort's teacher",
          attempt(as_user("bea"), "delete from public.cohort_teachers where cohort_id = %s and user_id = %s returning user_id", (ct, people["kofi"])) and last_rows == [])
    check("a teacher's agent cannot remove a co-teacher",
          attempt(as_agent("ben"), "delete from public.cohort_teachers where cohort_id = %s and user_id = %s returning user_id", (ct, people["kofi"])) and last_rows == [])
    check("a teacher of the cohort can remove a co-teacher",
          attempt(as_user("ben"), "delete from public.cohort_teachers where cohort_id = %s and user_id = %s returning user_id", (ct, people["kofi"])) and len(last_rows) == 1)
    check("the cohort's maker cannot be taken off it, even by themselves",
          not attempt(as_user("ben"), "delete from public.cohort_teachers where cohort_id = %s and user_id = %s returning user_id", (ct, people["ben"])))
    attempt(as_user("ben"), "insert into public.cohort_teachers (cohort_id, user_id) values (%s, %s)", (ct, people["kofi"]))
    check("nor by a co-teacher",
          not attempt(as_user("kofi"), "delete from public.cohort_teachers where cohort_id = %s and user_id = %s returning user_id", (ct, people["ben"])))
    check("a co-teacher can step away from the cohort",
          attempt(as_user("kofi"), "delete from public.cohort_teachers where cohort_id = %s and user_id = %s returning user_id", (ct, people["kofi"])) and len(last_rows) == 1)
    check("and then no longer teaches it",
          attempt(as_user("kofi"), "update public.cohorts set title = 'Taken' where id = %s returning id", (ct,)) and last_rows == [])
    check("deleting the cohort still takes its teachers' rows with it",
          attempt(as_user("ben"), "delete from public.cohorts where id = %s returning id", (ct,)) and len(last_rows) == 1)
    su.execute("reset role")
    su.execute("select count(*) from public.cohort_teachers where cohort_id = %s", (ct,))
    check("and leaves none behind", su.fetchone()[0] == 0)

    # ---- The week-5 showing, open to guests (migration 20261004030000) ---
    su.execute("reset role")
    su.execute("insert into public.cohorts (slug, title, created_by, status) values ('show-off', 'Show off', %s, 'running') returning id", (people["ben"],))
    sc = su.fetchone()[0]
    su.execute("insert into public.sessions (cohort_id, number, starts_at, title, meet_url) values (%s, 5, now() + interval '3 days', 'The showing', 'https://meet.google.com/abc-defg-hij') returning id", (sc,))
    s5 = su.fetchone()[0]
    su.execute("insert into public.sessions (cohort_id, number, starts_at, title, meet_url) values (%s, 4, now() - interval '4 days', 'Week four', 'https://meet.google.com/zzz-zzzz-zzz')", (sc,))
    for name in ["ola", "pim"]:
        if name not in people:
            uid = str(uuid.uuid4())
            su.execute("insert into auth.users (id, raw_user_meta_data) values (%s, %s)",
                       (uid, '{"user_name": "%s", "provider_id": "%d"}' % (name, abs(hash(name)) % 10**8)))
            people[name] = uid
    su.execute("insert into public.enrollments (cohort_id, user_id, app_name, app_repo, app_public) values (%s, %s, 'Shown app', 'ola/shown', true), (%s, %s, 'Quiet app', 'pim/quiet', false)",
               (sc, people["ola"], sc, people["pim"]))

    def showcases(name):
        cur = as_user(name)
        cur.execute("select cohort_slug, session_number, guest_link, apps from public.public_showcases() where cohort_slug = 'show-off'")
        return cur.fetchall()

    check("before a teacher marks it, no session of the cohort is a public showcase", showcases(None) == [])
    check("a student cannot mark a session as a public showcase",
          attempt(as_user("ola"), "update public.sessions set public_showcase = true where id = %s returning id", (s5,)) and last_rows == [])
    check("a teacher's agent cannot mark one either",
          attempt(as_agent("ben"), "update public.sessions set public_showcase = true where id = %s returning id", (s5,)) and last_rows == [])
    check("the cohort's teacher can mark the showing as public",
          attempt(as_user("ben"), "update public.sessions set public_showcase = true where id = %s returning id", (s5,)) and len(last_rows) == 1)
    rows = showcases(None)
    check("a guest who is not signed in sees that one session, and only that one", [(r[0], r[1]) for r in rows] == [("show-off", 5)])
    check("the Meet link stays hidden until the teacher chooses to share it", rows and rows[0][2] is None)
    check("only the apps their students chose to show appear, never a private one",
          rows and [a["app_repo"] for a in rows[0][3]] == ["ola/shown"])
    attempt(as_user("ben"), "update public.sessions set showcase_shares_link = true where id = %s", (s5,))
    rows = showcases(None)
    check("once the teacher shares it, guests see the Meet link", rows and rows[0][2] == "https://meet.google.com/abc-defg-hij")
    su.execute("reset role")
    su.execute("insert into public.app_hides (cohort_id, user_id, hidden_by) values (%s, %s, %s)", (sc, people["ola"], people["ben"]))
    rows = showcases(None)
    check("an app a teacher hid from /apps/ is hidden from the showcase too", rows and rows[0][3] == [])
    su.execute("reset role")
    su.execute("update public.cohorts set status = 'draft' where id = %s", (sc,))
    check("a draft cohort's showcase is never public", showcases(None) == [])
    su.execute("reset role")
    su.execute("update public.cohorts set status = 'running' where id = %s", (sc,))
    check("an agent can read the public showcases, like anyone", (lambda c: (c.execute("select count(*) from public.public_showcases() where cohort_slug = 'show-off'"), c.fetchone()[0])[1])(as_agent("ola")) == 1)
    check("guests still cannot read the session itself",
          attempt(as_user(None), "select id from public.sessions where id = %s", (s5,)) and last_rows == [])

    # Signers (migration 20261004040000): a signer reads every credential
    # waiting to be signed and attaches the signed file, across cohorts,
    # and gains no other right.
    su.execute("reset role")
    su.execute("select can_sign from public.teachers where user_id = %s", (people["ben"],))
    check("Ben signs, from his first sign-in", su.fetchone()[0] is True)
    attempt(as_user("kofi"), "insert into public.cohorts (slug, title, created_by, status) values ('kofi-cohort', 'Kofi''s cohort', %s, 'open') returning id", (people["kofi"],))
    kc = last_rows[0][0]
    attempt(as_user("fay"), "insert into public.enrollments (cohort_id, user_id, app_name, app_repo, app_url) values (%s, %s, 'Seed Library', 'fay/seed-library', 'https://example.org/seeds')", (kc, people["fay"]))
    attempt(as_user("kofi"), "update public.cohorts set status = 'finished' where id = %s", (kc,))
    check("a teacher who does not sign records a credential in their own cohort",
          attempt(as_user("kofi"), "insert into public.credentials (user_id, cohort_id, issued_by, platforms, platform_links, evidence_repo, app_name, app_url) "
                  "values (%s, %s, %s, '{web}', '{}', 'fay/seed-library', 'Seed Library', 'https://example.org/seeds') returning id", (people["fay"], kc, people["kofi"])))
    kcred = last_rows[0][0]
    to_sign = "select id, github_login, cohort_title from public.credentials_to_sign()"
    check("a teacher who does not sign sees nothing waiting to be signed",
          attempt(as_user("kofi"), to_sign) and last_rows == [])
    check("a student sees nothing waiting to be signed",
          attempt(as_user("bea"), to_sign) and last_rows == [])
    check("the signer sees it, in a cohort they do not teach, with what the request needs",
          attempt(as_user("ben"), to_sign) and any(r[0] == kcred and r[1] == "fay" and r[2] == "Kofi's cohort" for r in last_rows))
    kgood = ('{"id": "https://humanshaped.org/credential/?id=%s", "issuer": {"id": "did:web:humanshaped.org"}, '
             '"proof": {"cryptosuite": "eddsa-rdfc-2022", "proofValue": "z1"}}') % kcred
    attach = "select public.attach_signed_credential(%s, %s)"
    check("a teacher who does not sign cannot attach a signed file through the signer's door",
          not attempt(as_user("kofi"), attach, (kcred, kgood)))
    check("the signer's agent cannot attach one",
          not attempt(as_agent("ben"), attach, (kcred, kgood)))
    check("the signer cannot attach a file for another record",
          not attempt(as_user("ben"), attach, (kcred, kgood.replace(str(kcred), "00000000-0000-0000-0000-000000000000"))))
    check("the signer can attach the signed file",
          attempt(as_user("ben"), attach, (kcred, kgood)))
    su.execute("reset role")
    su.execute("select signed_at is not null from public.credentials where id = %s", (kcred,))
    check("and the time it was signed is recorded", su.fetchone()[0] is True)
    check("a signed credential is no longer waiting",
          attempt(as_user("ben"), to_sign) and all(r[0] != kcred for r in last_rows))
    check("nor can it be signed again",
          not attempt(as_user("ben"), attach, (kcred, kgood)))
    check("signing gives no right to revoke in a cohort the signer does not teach",
          attempt(as_user("ben"), "update public.credentials set revoked_at = now() where id = %s returning id", (kcred,)) and last_rows == [])
    check("a teacher cannot make themselves a signer",
          attempt(as_user("kofi"), "update public.teachers set can_sign = true where user_id = %s returning user_id", (people["kofi"],)) and last_rows == [])

    # The run of show (migration 20261004050000): a session's scenes,
    # written by the cohort's teachers, read by the cohort; the teacher's
    # notes for a scene read by teachers only; agents read and never
    # write; reordering and copying through two functions. bea is a
    # student here; dee is not in the cohort.
    ben = as_user("ben")
    attempt(ben, "insert into public.cohorts (slug, title, created_by, status) values ('show-test', 'Show', %s, 'open') returning id", (people["ben"],))
    sc = last_rows[0][0]
    attempt(ben, "insert into public.sessions (cohort_id, number) values (%s, 1), (%s, 2) returning id", (sc, sc))
    s1, s2 = last_rows[0][0], last_rows[1][0]
    attempt(ben, "insert into public.cohorts (slug, title, created_by, status) values ('show-other', 'Other', %s, 'open') returning id", (people["ben"],))
    oc = last_rows[0][0]
    attempt(ben, "insert into public.sessions (cohort_id, number) values (%s, 1) returning id", (oc,))
    o1 = last_rows[0][0]
    bea = as_user("bea")
    attempt(bea, "insert into public.enrollments (cohort_id, user_id) values (%s, %s)", (sc, people["bea"]))
    ben = as_user("ben")
    scene = "insert into public.scenes (cohort_id, session_id, position, kind, title, minutes, body, config) values (%s, %s, %s, %s, %s, %s, %s, %s::jsonb) returning id, created_by"
    check("a teacher adds a scene to a session's run of show, in their own name",
          attempt(ben, scene, (sc, s1, 0, "talk", "Arrive", 7, "One line each in the chat.", "{}")) and last_rows[0][1] == people["ben"])
    a1 = last_rows[0][0]
    attempt(ben, scene, (sc, s1, 1, "rooms", "Show what you brought back", 25, None,
                         '{"prompt": "Show it on the real device.", "room_scenes": [{"title": "Their question", "minutes": 2}]}'))
    a2 = last_rows[0][0]
    attempt(ben, scene, (sc, s1, 2, "question", "Check", 3, None, '{"prompt": "Which one?", "options": ["This", "That"]}'))
    a3 = last_rows[0][0]
    check("a scene's kind must be one the run of show knows",
          not attempt(ben, scene, (sc, s1, 3, "lecture", "Talk", 5, None, "{}")))
    check("the design stage is a kind of scene, with a template",
          attempt(ben, scene, (oc, o1, 0, "design", "Sketch the screen", 10, None, '{"template": "Phone screen"}')))
    check("the old name, board, is not a kind of scene",
          not attempt(ben, scene, (sc, s1, 3, "board", "Board", 5, None, "{}")))
    check("a talk scene carries no configuration",
          not attempt(ben, scene, (sc, s1, 3, "talk", "Talk", 5, None, '{"options": ["a", "b"]}')))
    check("a question's options are two to eight short words",
          not attempt(ben, scene, (sc, s1, 3, "question", "Q", 2, None, '{"options": ["only one"]}')))
    check("a room's own scenes each need a title and minutes",
          not attempt(ben, scene, (sc, s1, 3, "rooms", "R", 20, None, '{"room_scenes": [{"title": "No minutes"}]}')))
    check("two scenes cannot share a place in the run of show",
          not attempt(ben, scene, (sc, s1, 0, "break", "Break", 3, None, "{}")))
    check("a scene belongs to a session of its own cohort",
          not attempt(ben, scene, (sc, o1, 0, "talk", "Elsewhere", 5, None, "{}")))
    check("a teacher can edit a scene's words and minutes",
          attempt(ben, "update public.scenes set title = 'Arrive, and say hello', minutes = 6 where id = %s returning minutes", (a1,)) and last_rows == [(6,)])
    check("a scene cannot move to another session",
          not attempt(ben, "update public.scenes set session_id = %s where id = %s", (s2, a1)))
    note = "insert into public.scene_notes (scene_id, cohort_id, body) values (%s, %s, %s) returning updated_by"
    check("a teacher keeps a private note for a scene",
          attempt(ben, note, (a1, sc, "Remember to name last week's muddy point.")) and last_rows[0][0] == people["ben"])
    check("a note is only for a scene of the same cohort",
          not attempt(ben, note, (a2, oc, "Wrong cohort.")))
    bea = as_user("bea")
    bea.execute("select title from public.scenes where session_id = %s order by position", (s1,))
    check("someone in the cohort reads the run of show", [r[0] for r in bea.fetchall()] == ["Arrive, and say hello", "Show what you brought back", "Check"])
    bea.execute("select count(*) from public.scene_notes where cohort_id = %s", (sc,))
    check("a student cannot read the teacher's notes for a scene", bea.fetchone()[0] == 0)
    check("a student cannot add a scene", not attempt(bea, scene, (sc, s1, 5, "talk", "Mine", 5, None, "{}")))
    check("a student cannot change a scene",
          attempt(bea, "update public.scenes set title = 'Mine' where id = %s returning id", (a1,)) and last_rows == [])
    check("a student cannot remove a scene",
          attempt(bea, "delete from public.scenes where id = %s returning id", (a1,)) and last_rows == [])
    check("a student cannot reorder the run of show",
          not attempt(bea, "select public.reorder_scenes(%s, %s::uuid[])", (s1, "{%s,%s,%s}" % (a3, a2, a1))))
    dee = as_user("dee")
    dee.execute("select count(*) from public.scenes where cohort_id = %s", (sc,))
    check("someone outside the cohort cannot read its run of show", dee.fetchone()[0] == 0)
    check("someone outside the cohort cannot add a scene", not attempt(dee, scene, (sc, s1, 6, "talk", "Hi", 5, None, "{}")))
    ben_agent = as_agent("ben")
    ben_agent.execute("select count(*) from public.scenes where session_id = %s", (s1,))
    check("a teacher's agent reads the run of show", ben_agent.fetchone()[0] == 3)
    check("a teacher's agent cannot add a scene", not attempt(ben_agent, scene, (sc, s1, 7, "talk", "Agent", 5, None, "{}")))
    check("a teacher's agent cannot change a scene",
          attempt(ben_agent, "update public.scenes set title = 'Agent' where id = %s returning id", (a1,)) and last_rows == [])
    check("a teacher's agent cannot reorder the run of show",
          not attempt(ben_agent, "select public.reorder_scenes(%s, %s::uuid[])", (s1, "{%s,%s,%s}" % (a3, a2, a1))))
    check("a teacher's agent cannot write a scene note", not attempt(ben_agent, note, (a2, sc, "Agent note.")))
    ben = as_user("ben")
    check("a teacher reorders the whole run of show at once",
          attempt(ben, "select public.reorder_scenes(%s, %s::uuid[])", (s1, "{%s,%s,%s}" % (a3, a1, a2))))
    ben.execute("select id from public.scenes where session_id = %s order by position", (s1,))
    check("and the scenes are in the new order", [r[0] for r in ben.fetchall()] == [a3, a1, a2])
    check("reordering refuses a list that leaves a scene out",
          not attempt(ben, "select public.reorder_scenes(%s, %s::uuid[])", (s1, "{%s,%s}" % (a1, a2))))
    check("a teacher copies last week's run of show into an empty session",
          attempt(ben, "select public.copy_scenes(%s, %s)", (s1, s2)) and last_rows == [(3,)])
    ben.execute("select kind from public.scenes where session_id = %s order by position", (s2,))
    check("the copy keeps the order and kinds", [r[0] for r in ben.fetchall()] == ["question", "talk", "rooms"])
    ben.execute("select count(*) from public.scene_notes n join public.scenes s on s.id = n.scene_id where s.session_id = %s", (s2,))
    check("and the teacher's notes come with it", ben.fetchone()[0] == 1)
    check("copying never overwrites a run of show that is already there",
          not attempt(ben, "select public.copy_scenes(%s, %s)", (s1, s2)))
    bea = as_user("bea")
    check("a student cannot copy a run of show",
          not attempt(bea, "select public.copy_scenes(%s, %s)", (s1, o1)))
    ben = as_user("ben")
    ben.execute("update public.cohorts set status = 'finished' where id = %s", (sc,))
    ben.execute("select count(*) from public.scenes where cohort_id = %s", (sc,))
    check("the run of show stays when the cohort finishes, for a later cohort to copy", ben.fetchone()[0] == 6)
    ben.execute("delete from public.sessions where id = %s", (s2,))
    ben.execute("select count(*) from public.scenes where session_id = %s", (s2,))
    check("a session's scenes go with it", ben.fetchone()[0] == 0)

    # ---- Google sign-in beside GitHub (migration 20261004060000) -------
    # The sign-in system writes identities with no signed-in person in the
    # database session; every cursor shares one connection, so clear it.
    def as_system():
        su.execute("reset role")
        su.execute("select set_config('request.jwt.claim.sub', '', false)")
        su.execute("select set_config('request.jwt.claims', '', false)")
    as_system()
    def new_account(name, app_meta, user_meta):
        uid = str(uuid.uuid4())
        su.execute("insert into auth.users (id, raw_app_meta_data, raw_user_meta_data) values (%s, %s, %s)",
                   (uid, json.dumps(app_meta), json.dumps(user_meta)))
        people[name] = uid
        return uid
    def profile(name):
        su.execute("select github_login, github_id, display_name, avatar_url from public.profiles where id = %s", (people[name],))
        return su.fetchone()
    gail = new_account("gail", {"provider": "google", "providers": ["google"]},
                       {"name": "Gail Example", "picture": "https://example.org/gail.png",
                        "provider_id": "107691503500061507151130823", "email": "gail@example.org"})
    g = profile("gail")
    check("a Google-first sign-up gets a profile, with its name and picture", g is not None and g[2] == "Gail Example" and g[3] == "https://example.org/gail.png")
    check("and no GitHub name or number until GitHub is linked", g[0] is None and g[1] is None)
    new_account("eve", {"provider": "email", "providers": ["email"]}, {"user_name": "bhwilkoff", "provider_id": "42"})
    e = profile("eve")
    check("an email sign-up cannot claim a GitHub name by typing it", e is not None and e[0] is None and e[1] is None)
    su.execute("select count(*) from public.teachers where user_id = %s", (people["eve"],))
    check("nor become a teacher by claiming Ben's", su.fetchone()[0] == 0)
    gopen = str(uuid.uuid4())
    su.execute("insert into public.cohorts (id, slug, title, status, created_by, time_zone) values (%s, 'google-open', 'Open for Google', 'open', %s, 'America/Denver')",
               (gopen, people["ben"]))
    join = "insert into public.enrollments (cohort_id, user_id) values (%s, %s) returning user_id"
    check("someone without a linked GitHub cannot join a cohort",
          not attempt(as_user("gail"), join, (gopen, gail)))
    as_system()
    su.execute("insert into auth.identities (user_id, provider, provider_id, identity_data) values (%s, 'github', '777', %s)",
               (gail, json.dumps({"user_name": "gail-gh", "provider_id": "777", "avatar_url": "https://example.org/gh.png"})))
    g = profile("gail")
    check("linking GitHub fills in the GitHub name and number", g[0] == "gail-gh" and g[1] == 777)
    check("and keeps the picture the account already had", g[3] == "https://example.org/gail.png")
    check("then they can join a cohort", attempt(as_user("gail"), join, (gopen, gail)))
    as_system()
    su.execute("insert into auth.identities (user_id, provider, provider_id, identity_data) values (%s, 'google', '1076915035000615', %s)",
               (people["bea"], json.dumps({"name": "Bea G", "email": "bea@example.org"})))
    check("linking Google to a GitHub account leaves its GitHub name alone", profile("bea")[0] == "bea")
    su.execute("delete from auth.identities where user_id = %s and provider = 'github'", (gail,))
    g = profile("gail")
    check("unlinking GitHub takes the GitHub name off the profile", g[0] is None and g[1] is None)
    check("a person cannot write a GitHub name onto their own profile",
          not attempt(as_user("gail"), "update public.profiles set github_login = 'someone-else' where id = %s returning id", (gail,)))
    check("nor change the GitHub name their profile already has",
          not attempt(as_user("bea"), "update public.profiles set github_login = 'someone-else' where id = %s returning id", (people["bea"],)))
    check("but they can still change their display name",
          attempt(as_user("bea"), "update public.profiles set display_name = 'Bea B' where id = %s returning id", (people["bea"],)) and len(last_rows) == 1)
    as_system()


    # Running the show (migration 20261004070000): one show_state row per
    # session, which scene is happening now and what the main stage
    # shows; the cohort's teachers move it, the cohort follows it, agents
    # only read it, and it goes when the cohort finishes. bea is a
    # student here; dee is not in the cohort.
    ben = as_user("ben")
    attempt(ben, "insert into public.cohorts (slug, title, created_by, status) values ('run-test', 'Run', %s, 'open') returning id", (people["ben"],))
    rc = last_rows[0][0]
    attempt(ben, "insert into public.sessions (cohort_id, number) values (%s, 1) returning id", (rc,))
    r1 = last_rows[0][0]
    attempt(ben, "insert into public.cohorts (slug, title, created_by, status) values ('run-other', 'Other', %s, 'open') returning id", (people["ben"],))
    roc = last_rows[0][0]
    attempt(ben, "insert into public.sessions (cohort_id, number) values (%s, 1) returning id", (roc,))
    ro1 = last_rows[0][0]
    bea = as_user("bea")
    attempt(bea, "insert into public.enrollments (cohort_id, user_id) values (%s, %s)", (rc, people["bea"]))
    attempt(bea, "insert into public.live_queue (cohort_id, session_id, user_id, kind, url, note) values (%s, %s, %s, 'app', 'https://bea.github.io/garden-swap', 'The new list') returning id", (rc, r1, people["bea"]))
    rq = last_rows[0][0]
    ben = as_user("ben")
    attempt(ben, "insert into public.live_checks (cohort_id, session_id, created_by, prompt, choices) values (%s, %s, %s, 'Which one?', array['This', 'That']) returning id", (rc, r1, people["ben"]))
    rk = last_rows[0][0]
    attempt(ben, "insert into public.live_checks (cohort_id, session_id, created_by, prompt) values (%s, %s, %s, 'Elsewhere?') returning id", (roc, ro1, people["ben"]))
    rk_other = last_rows[0][0]
    start = "insert into public.show_state (session_id, cohort_id, current_scene) values (%s, %s, %s) returning current_scene, scene_started_at is not null, stage, updated_by"
    check("a teacher starts the show at a scene, and its clock starts with it",
          attempt(ben, start, (r1, rc, "arrive")) and last_rows == [("arrive", True, "scene", people["ben"])])
    check("a session has one show", not attempt(ben, start, (r1, rc, "show")))
    check("a show belongs to a session of its own cohort", not attempt(ben, start, (ro1, rc, "arrive")))
    check("a teacher moves the show to the next scene, and the clock starts again",
          attempt(ben, "update public.show_state set current_scene = 'show' where session_id = %s returning current_scene, scene_started_at is not null", (r1,))
          and last_rows == [("show", True)])
    check("a teacher stops this scene's clock",
          attempt(ben, "update public.show_state set scene_started_at = null where session_id = %s returning scene_started_at", (r1,)) and last_rows == [(None,)])
    check("and restarts it from the database's own time, not the one the page sends",
          attempt(ben, "update public.show_state set scene_started_at = '2000-01-01' where session_id = %s returning scene_started_at > '2001-01-01'", (r1,)) and last_rows == [(True,)])
    check("a teacher pins a question of this session on the main stage",
          attempt(ben, "update public.show_state set stage = 'answers', stage_ref = %s where session_id = %s returning stage", (rk, r1)) and last_rows == [("answers",)])
    check("a question from another session cannot go on this main stage",
          not attempt(ben, "update public.show_state set stage = 'answers', stage_ref = %s where session_id = %s", (rk_other, r1)))
    check("a teacher pins someone's work from the wings",
          attempt(ben, "update public.show_state set stage = 'presenter', stage_ref = %s where session_id = %s returning stage", (rq, r1)) and last_rows == [("presenter",)])
    check("a pin must name what it pins",
          not attempt(ben, "update public.show_state set stage = 'answers', stage_ref = null where session_id = %s", (r1,)))
    check("the main stage can only show what it knows how to",
          not attempt(ben, "update public.show_state set stage = 'video', stage_ref = null where session_id = %s", (r1,)))
    check("a teacher returns the main stage to following the scene",
          attempt(ben, "update public.show_state set stage = 'scene', stage_ref = null where session_id = %s returning stage", (r1,)) and last_rows == [("scene",)])
    check("a show cannot move to another session",
          not attempt(ben, "update public.show_state set session_id = %s where session_id = %s", (ro1, r1)))
    bea = as_user("bea")
    bea.execute("select current_scene, stage from public.show_state where session_id = %s", (r1,))
    check("someone in the cohort follows the show", bea.fetchall() == [("show", "scene")])
    check("a student cannot move the show",
          attempt(bea, "update public.show_state set current_scene = 'value' where session_id = %s returning session_id", (r1,)) and last_rows == [])
    check("a student cannot start a show",
          not attempt(bea, start, (ro1, roc, "arrive")))
    check("a student cannot end the show",
          attempt(bea, "delete from public.show_state where session_id = %s returning session_id", (r1,)) and last_rows == [])
    dee = as_user("dee")
    dee.execute("select count(*) from public.show_state where cohort_id = %s", (rc,))
    check("someone outside the cohort cannot see its show", dee.fetchone()[0] == 0)
    anon = as_user(None)
    anon.execute("select count(*) from public.show_state")
    check("someone signed out cannot see any show", anon.fetchone()[0] == 0)
    ben_agent = as_agent("ben")
    ben_agent.execute("select current_scene from public.show_state where session_id = %s", (r1,))
    check("a teacher's agent can see where the show is", ben_agent.fetchall() == [("show",)])
    check("a teacher's agent cannot move the show",
          attempt(ben_agent, "update public.show_state set current_scene = 'value' where session_id = %s returning session_id", (r1,)) and last_rows == [])
    check("a teacher's agent cannot start a show", not attempt(ben_agent, start, (ro1, roc, "arrive")))
    check("a teacher's agent cannot end the show",
          attempt(ben_agent, "delete from public.show_state where session_id = %s returning session_id", (r1,)) and last_rows == [])
    ben = as_user("ben")
    attempt(ben, start, (ro1, roc, "arrive"))
    ben.execute("update public.cohorts set status = 'finished' where id = %s", (rc,))
    su9 = conn.cursor(); su9.execute("reset role")
    su9.execute("select count(*) from public.show_state where cohort_id = %s", (rc,))
    check("the show goes when the cohort finishes", su9.fetchone()[0] == 0)
    su9.execute("select count(*) from public.show_state where cohort_id = %s", (roc,))
    check("and another cohort's show stays", su9.fetchone()[0] == 1)

    # The question bank (migration 20261004080000): a teacher's own
    # questions and a cohort's, six kinds asked in the moment, answers
    # that fit their kind, edits until the first answer, and results with
    # no names. bea is a student; kofi is a teacher who co-teaches; dee is
    # outside the cohort.
    def rows_as(name, sql, args=()):
        cur = as_user(name)
        cur.execute(sql, args)
        return cur.fetchall()

    if "hana" not in people:
        uid = str(uuid.uuid4())
        su.execute("reset role")
        su.execute("insert into auth.users (id, raw_user_meta_data) values (%s, %s)",
                   (uid, '{"user_name": "hana", "provider_id": "%d"}' % (abs(hash("hana")) % 10**8)))
        people["hana"] = uid
    ben = as_user("ben")
    attempt(as_user("ben"), "insert into public.cohorts (slug, title, created_by, status) values ('bank-test', 'Bank', %s, 'open') returning id", (people["ben"],))
    bc = last_rows[0][0]
    attempt(as_user("ben"), "insert into public.sessions (cohort_id, number) values (%s, 1) returning id", (bc,))
    b1 = last_rows[0][0]
    attempt(as_user("kofi"), "insert into public.cohorts (slug, title, created_by, status) values ('bank-kofi', 'Kofi', %s, 'open') returning id", (people["kofi"],))
    kc = last_rows[0][0]
    bea = as_user("bea")
    attempt(as_user("bea"), "insert into public.enrollments (cohort_id, user_id) values (%s, %s)", (bc, people["bea"]))
    attempt(as_user("hana"), "insert into public.enrollments (cohort_id, user_id) values (%s, %s)", (bc, people["hana"]))
    addq = "insert into public.questions (cohort_id, kind, prompt, choices, points, owner_id) values (%s, %s, %s, %s, %s, %s) returning id, owner_id"
    ben = as_user("ben")
    check("a teacher keeps a question of their own in the bank",
          attempt(as_user("ben"), addq, (None, "choice", "Which part is hardest?", ["Writing it down", "Proving it", "Living with it"], None, people["ben"])) and last_rows[0][1] == people["ben"])
    own_q = last_rows[0][0]
    check("and one for a cohort they teach",
          attempt(as_user("ben"), addq, (bc, "rank", "Put these in order", ["Speed", "Care", "Cost"], None, people["ben"])))
    cohort_q = last_rows[0][0]
    check("a scale question with words for its ends",
          attempt(as_user("ben"), addq, (None, "scale", "How sure are you?", ["Not at all", "Completely"], 5, people["ben"])))
    check("a words question, with no choices",
          attempt(as_user("ben"), addq, (None, "words", "One word for today", None, None, people["ben"])))
    check("a question with one choice is refused",
          not attempt(as_user("ben"), addq, (None, "choice", "Only one?", ["Only"], None, people["ben"])))
    check("a question in someone's own words has no choices",
          not attempt(as_user("ben"), addq, (None, "short", "Why?", ["A", "B"], None, people["ben"])))
    check("a scale has three to ten points",
          not attempt(as_user("ben"), addq, (None, "scale", "How sure?", None, 2, people["ben"])) and
          not attempt(as_user("ben"), addq, (None, "scale", "How sure?", None, 11, people["ben"])))
    check("nine choices is too many",
          not attempt(as_user("ben"), addq, (None, "multi", "Which?", list("abcdefghi"), None, people["ben"])))
    check("a question is only of the six kinds",
          not attempt(as_user("ben"), addq, (None, "essay", "Write", None, None, people["ben"])))
    check("a teacher cannot put a question in a cohort they do not teach",
          not attempt(as_user("ben"), addq, (kc, "short", "Hello?", None, None, people["ben"])))
    check("a question is written in the name of the person writing it",
          attempt(as_user("ben"), addq, (None, "short", "Who wrote this?", None, None, people["kofi"])) and last_rows[0][1] == people["ben"])
    check("a student cannot keep a bank",
          not attempt(as_user("bea"), addq, (None, "short", "Mine?", None, None, people["bea"])))
    check("a student never reads the bank, their cohort's included", rows_as("bea", "select count(*) from public.questions") == [(0,)])
    check("another teacher reads neither someone's own questions nor a cohort they do not teach",
          rows_as("kofi", "select count(*) from public.questions where id in (%s, %s)", (own_q, cohort_q)) == [(0,)])
    attempt(as_user("ben"), "insert into public.cohort_teachers (cohort_id, user_id) values (%s, %s)", (bc, people["kofi"]))
    check("a co-teacher reads the cohort's questions, and not the other teacher's own",
          rows_as("kofi", "select id from public.questions where id in (%s, %s)", (own_q, cohort_q)) == [(cohort_q,)])
    check("a co-teacher edits a cohort question",
          attempt(as_user("kofi"), "update public.questions set prompt = 'Put these in your order' where id = %s returning prompt", (cohort_q,)) and len(last_rows) == 1)
    check("but cannot take it into their own library, since they did not write it",
          not attempt(as_user("kofi"), "update public.questions set cohort_id = null where id = %s", (cohort_q,)))
    check("a question cannot change hands",
          not attempt(as_user("kofi"), "update public.questions set owner_id = %s where id = %s", (people["kofi"], cohort_q)))
    check("a teacher moves their own question into a cohort they teach",
          attempt(as_user("ben"), "update public.questions set cohort_id = %s where id = %s returning cohort_id", (bc, own_q)) and last_rows == [(bc,)])
    attempt(as_user("ben"), "update public.questions set cohort_id = null where id = %s", (own_q,))
    check("a teacher's agent reads their bank",
          (lambda c: (c.execute("select count(*) from public.questions where id = %s", (own_q,)), c.fetchone()[0])[1])(as_agent("ben")) == 1)
    check("and cannot add to it, change it, or delete from it",
          not attempt(as_agent("ben"), addq, (None, "short", "Agent?", None, None, people["ben"]))
          and attempt(as_agent("ben"), "update public.questions set prompt = 'x' where id = %s returning id", (own_q,)) and last_rows == []
          and attempt(as_agent("ben"), "delete from public.questions where id = %s returning id", (own_q,)) and last_rows == [])

    ask = "insert into public.live_checks (cohort_id, session_id, created_by, kind, prompt, choices, points, question_id) values (%s, %s, %s, %s, %s, %s, %s, %s) returning id, kind"
    ben = as_user("ben")
    check("a page that does not say the kind asks the old way",
          attempt(as_user("ben"), "insert into public.live_checks (cohort_id, session_id, created_by, prompt, choices) values (%s, %s, %s, 'Which?', array['A', 'B']) returning kind", (bc, b1, people["ben"])) and last_rows == [("choice",)]
          and attempt(as_user("ben"), "insert into public.live_checks (cohort_id, session_id, created_by, prompt) values (%s, %s, %s, 'Why?') returning kind", (bc, b1, people["ben"])) and last_rows == [("short",)])
    check("a teacher asks a question from the bank, as a copy",
          attempt(as_user("ben"), ask, (bc, b1, people["ben"], "rank", "Put these in order", ["Speed", "Care", "Cost"], None, cohort_q)))
    k_rank = last_rows[0][0]
    attempt(as_user("ben"), ask, (bc, b1, people["ben"], "multi", "Which did you try?", ["Tests", "Docs", "Logs"], None, None)); k_multi = last_rows[0][0]
    attempt(as_user("ben"), ask, (bc, b1, people["ben"], "scale", "How sure?", None, 5, None)); k_scale = last_rows[0][0]
    attempt(as_user("ben"), ask, (bc, b1, people["ben"], "words", "One word", None, None, None)); k_words = last_rows[0][0]
    attempt(as_user("ben"), ask, (bc, b1, people["ben"], "choice", "Pick one", ["Yes", "No"], None, None)); k_choice = last_rows[0][0]
    check("a question asked must have its kind's shape",
          not attempt(as_user("ben"), ask, (bc, b1, people["ben"], "scale", "How sure?", None, None, None)))
    check("a teacher edits a question before anyone answers",
          attempt(as_user("ben"), "update public.live_checks set prompt = 'Which did you use?', choices = array['Tests', 'Docs', 'Logs', 'Nothing'] where id = %s returning prompt", (k_multi,)) and last_rows == [("Which did you use?",)])
    check("and the bank question it came from stays as it was",
          attempt(as_user("ben"), "update public.live_checks set prompt = 'Order these' where id = %s returning id", (k_rank,))
          and rows_as("ben", "select prompt from public.questions where id = %s", (cohort_q,)) == [("Put these in your order",)])
    answer = "insert into public.live_answers (check_id, cohort_id, user_id, choice, body, value) values (%s, %s, %s, %s, %s, %s::jsonb) returning id"
    bea = as_user("bea")
    check("a student picks more than one",
          attempt(as_user("bea"), answer, (k_multi, bc, people["bea"], None, None, "[1, 4]")))
    check("but not the same choice twice, none, or one that does not exist",
          not attempt(as_user("bea"), "update public.live_answers set value = '[1, 1]' where check_id = %s returning id", (k_multi,))
          and not attempt(as_user("bea"), "update public.live_answers set value = '[]' where check_id = %s returning id", (k_multi,))
          and not attempt(as_user("bea"), "update public.live_answers set value = '[5]' where check_id = %s returning id", (k_multi,)))
    check("nor a choice number in place of a list",
          not attempt(as_user("bea"), "update public.live_answers set value = null, choice = 1 where check_id = %s returning id", (k_multi,)))
    check("a student puts every choice in their order",
          attempt(as_user("bea"), answer, (k_rank, bc, people["bea"], None, None, "[2, 1, 3]")))
    check("and must place every one",
          not attempt(as_user("bea"), "update public.live_answers set value = '[2, 1]' where check_id = %s returning id", (k_rank,)))
    check("a student picks a point on the scale",
          attempt(as_user("bea"), answer, (k_scale, bc, people["bea"], 5, None, None)))
    check("and not one past its end",
          not attempt(as_user("bea"), "update public.live_answers set choice = 6 where check_id = %s returning id", (k_scale,)))
    check("a student gives a few words",
          attempt(as_user("bea"), answer, (k_words, bc, people["bea"], None, "Calm", None)))
    check("and not a paragraph",
          not attempt(as_user("bea"), "update public.live_answers set body = %s where check_id = %s returning id", ("x" * 61, k_words)))
    check("a one-choice answer cannot carry a list besides",
          not attempt(as_user("bea"), answer, (k_choice, bc, people["bea"], 1, None, "[1]")))
    hana = as_user("hana")
    attempt(as_user("hana"), answer, (k_multi, bc, people["hana"], None, None, "[1]"))
    attempt(as_user("hana"), answer, (k_rank, bc, people["hana"], None, None, "[1, 2, 3]"))
    attempt(as_user("hana"), answer, (k_words, bc, people["hana"], None, "  CALM ", None))
    ben = as_user("ben")
    check("once someone has answered, the question cannot change",
          not attempt(as_user("ben"), "update public.live_checks set prompt = 'Something else' where id = %s", (k_multi,))
          and not attempt(as_user("ben"), "update public.live_checks set choices = array['A', 'B'] where id = %s", (k_multi,)))
    check("but it can still be closed and opened again",
          attempt(as_user("ben"), "update public.live_checks set state = 'closed' where id = %s returning state", (k_scale,)) and last_rows == [("closed",)]
          and attempt(as_user("ben"), "update public.live_checks set state = 'open' where id = %s returning state", (k_scale,)))
    check("a question stays with the bank question it was asked from",
          not attempt(as_user("ben"), "update public.live_checks set question_id = %s where id = %s", (own_q, k_multi)))
    def outcome(cur, k):
        cur.execute("select public.check_results(%s)", (k,))
        return cur.fetchone()[0]
    r = outcome(as_user("ben"), k_multi)
    check("the teacher sees how many chose each choice, with no names",
          r == {"kind": "multi", "total": 2, "counts": [2, 0, 0, 1]})
    check("each choice's average place, for an order",
          outcome(as_user("ben"), k_rank) == {"kind": "rank", "total": 2, "places": [1.5, 1.5, 3]})
    check("the words together, however they were typed",
          outcome(as_user("ben"), k_words) == {"kind": "words", "total": 2, "words": [{"word": "calm", "count": 2}]})
    check("each point on a scale",
          outcome(as_user("ben"), k_scale) == {"kind": "scale", "total": 1, "counts": [0, 0, 0, 0, 1]})
    attempt(as_user("bea"), "insert into public.live_checks (cohort_id, session_id, created_by, prompt) values (%s, %s, %s, 'x')", (bc, b1, people["bea"]))
    bea = as_user("bea")
    check("a student sees no results until the teacher shows them", outcome(as_user("bea"), k_multi) is None)
    as_user("ben").execute("update public.live_checks set show_tally = true where id = %s", (k_words,))
    check("and then the same results everyone sees", outcome(as_user("bea"), k_words)["words"] == [{"word": "calm", "count": 2}])
    attempt(as_user("ben"), "insert into public.live_checks (cohort_id, session_id, created_by, prompt, show_tally) values (%s, %s, %s, 'In your words?', true) returning id", (bc, b1, people["ben"]))
    k_short = last_rows[0][0]
    attempt(as_user("bea"), answer, (k_short, bc, people["bea"], None, "Because I could not tell", None))
    check("short answers are only ever counted, never shown",
          outcome(as_user("bea"), k_short) == {"kind": "short", "total": 1})
    check("someone outside the cohort sees no results", outcome(as_user("dee"), k_words) is None)
    scene = "insert into public.scenes (cohort_id, session_id, position, kind, title, minutes, config) values (%s, %s, %s, 'question', 'Check', 5, %s::jsonb) returning id"
    check("a question scene carries its kind, its scale, and the bank question it came from",
          attempt(as_user("ben"), scene, (bc, b1, 0, json.dumps({"prompt": "How sure?", "kind": "scale", "points": 5, "options": ["Not at all", "Completely"], "question_id": str(own_q)}))))
    check("and not a kind there is not",
          not attempt(as_user("ben"), scene, (bc, b1, 1, json.dumps({"prompt": "x", "kind": "essay"})))
          and not attempt(as_user("ben"), scene, (bc, b1, 1, json.dumps({"prompt": "x", "kind": "scale", "points": 12})))
          and not attempt(as_user("ben"), scene, (bc, b1, 1, json.dumps({"prompt": "x", "question_id": "not-an-id"}))))
    as_user("ben").execute("delete from public.questions where id = %s", (cohort_q,))
    check("deleting a bank question leaves what was asked from it",
          rows_as("ben", "select question_id, prompt from public.live_checks where id = %s", (k_rank,)) == [(None, "Order these")])
    as_user("ben").execute("update public.cohorts set status = 'finished' where id = %s", (bc,))
    su10 = conn.cursor(); su10.execute("reset role")
    su10.execute("select (select count(*) from public.live_checks where cohort_id = %s), (select count(*) from public.questions where id = %s)", (bc, own_q))
    check("the questions asked go when the cohort finishes, and the bank stays", su10.fetchone() == (0, 1))
    conn.rollback()
    conn.close()
    failed = [n for n, ok in results if not ok]
    print(f"\n{len(results) - len(failed)} of {len(results)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
