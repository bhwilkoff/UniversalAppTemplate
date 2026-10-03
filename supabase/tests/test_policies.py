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
    ben = as_user("ben")
    check("a teacher can take a shown app down",
          attempt(ben, "update public.enrollments set app_public = false where user_id = %s", (people["bea"],)))
    bea = as_user("bea")
    bea.execute("update public.enrollments set app_public = true where user_id = %s", (people["bea"],))

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

    bea = as_user("bea")
    bea.execute("select public.leave_cohort(%s)", (cohort,))
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

    conn.rollback()
    conn.close()
    failed = [n for n, ok in results if not ok]
    print(f"\n{len(results) - len(failed)} of {len(results)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
