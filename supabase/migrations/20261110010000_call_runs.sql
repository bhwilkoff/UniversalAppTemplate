-- A leader runs any of a cohort's sessions again, in any call (Ben, November
-- 10, 2026: "sometimes a cohort member has to miss a session... I'd love to
-- be able to load up any previously built session if I am logged in
-- correctly to the add-on"; asked where, he chose any call he is signed in
-- to). A call run says: this call is running this session of this cohort,
-- for three hours or until a leader stops it. While it lasts, the call is
-- that cohort's call: is_cohort_call says yes, join_call lets members in as
-- themselves and anyone else in as a guest, and every panel in it opens that
-- session. What people do is saved with that session, beside the first run,
-- and nothing of the first run is changed (DECISIONS.md, "A session can run
-- again").

create table public.call_runs (
  code        text primary key check (code ~ '^[a-z]{3}-[a-z]{4}-[a-z]{3}$'),
  cohort_id   uuid not null references public.cohorts (id) on delete cascade,
  session_id  uuid not null references public.sessions (id) on delete cascade,
  set_by      uuid references public.profiles (id) on delete set null,
  set_at      timestamptz not null default now(),
  ends_at     timestamptz not null default now() + interval '3 hours'
);
create index call_runs_by_cohort on public.call_runs (cohort_id);
alter table public.call_runs enable row level security;

-- People in the cohort can see which session their call is running; only
-- the functions below write.
create policy call_runs_read on public.call_runs for select to authenticated
  using (private.in_cohort(cohort_id));

-- The cohort a call belongs to right now: a run first, because a leader
-- chose it, then the cohort's own links.
create function private.call_cohort(k text) returns uuid
language plpgsql stable security definer set search_path to 'public' as $$
declare
  c uuid;
begin
  select r.cohort_id into c from public.call_runs r join public.cohorts co on co.id = r.cohort_id
   where r.code = k and r.ends_at > now() and co.status in ('open', 'running');
  if c is not null then return c; end if;
  select s.cohort_id into c from public.sessions s join public.cohorts co on co.id = s.cohort_id
   where s.meet_url ilike '%' || k || '%' and co.status in ('open', 'running')
   order by s.starts_at desc nulls last limit 1;
  if c is not null then return c; end if;
  select g.cohort_id into c from public.groups g join public.cohorts co on co.id = g.cohort_id
   where g.meet_url ilike '%' || k || '%' and co.status in ('open', 'running') limit 1;
  return c;
end;
$$;
revoke all on function private.call_cohort(text) from public;

create or replace function public.is_cohort_call(code text) returns boolean
language plpgsql stable security definer set search_path to 'public' as $$
declare
  k text := lower(trim(code));
begin
  if k is null or k !~ '^[a-z]{3}-[a-z]{4}-[a-z]{3}$' then return false; end if;
  return private.call_cohort(k) is not null;
end;
$$;

create or replace function public.join_call(code text, guest_name text default null) returns uuid
language plpgsql security definer set search_path to 'public' as $$
declare
  me uuid := auth.uid();
  k text := lower(trim(code));
  c uuid;
  known text;
begin
  if me is null or k !~ '^[a-z]{3}-[a-z]{4}-[a-z]{3}$' then return null; end if;
  c := private.call_cohort(k);
  if c is null then return null; end if;
  if private.teaches(c) or exists (select 1 from public.enrollments e where e.cohort_id = c and e.user_id = me and e.status <> 'left') then
    return c;
  end if;
  select coalesce(p.display_name, p.github_login) into known from public.profiles p where p.id = me;
  insert into public.call_guests (cohort_id, user_id, name)
  values (c, me, coalesce(nullif(left(trim(guest_name), 80), ''), left(known, 80)))
  on conflict (cohort_id, user_id) do update
    set name = coalesce(nullif(left(trim(guest_name), 80), ''), public.call_guests.name);
  return c;
end;
$$;

-- A leader of the session's cohort starts a run in this call. A call that is
-- another cohort's own, or is running another cohort's session, is refused.
create function public.run_in_call(code text, session uuid) returns uuid
language plpgsql security definer set search_path to 'public' as $$
declare
  k text := lower(trim(code));
  c uuid;
  other uuid;
begin
  if auth.uid() is null or k !~ '^[a-z]{3}-[a-z]{4}-[a-z]{3}$' then raise exception 'That is not a Meet call.'; end if;
  select s.cohort_id into c from public.sessions s join public.cohorts co on co.id = s.cohort_id
   where s.id = session and co.status in ('open', 'running');
  if c is null then raise exception 'That session is not in a cohort that is open or running.'; end if;
  if not private.teaches(c) then raise exception 'Only a leader of this cohort can do this.'; end if;
  other := private.call_cohort(k);
  if other is not null and other <> c then raise exception 'This call belongs to another cohort.'; end if;
  insert into public.call_runs (code, cohort_id, session_id, set_by)
  values (k, c, session, auth.uid())
  on conflict on constraint call_runs_pkey do update
    set cohort_id = excluded.cohort_id, session_id = excluded.session_id, set_by = excluded.set_by,
        set_at = now(), ends_at = now() + interval '3 hours';
  return c;
end;
$$;

-- A leader of the run's cohort ends it; the call goes back to its schedule.
create function public.stop_call_run(code text) returns void
language plpgsql security definer set search_path to 'public' as $$
declare
  k text := lower(trim(code));
  c uuid;
begin
  select r.cohort_id into c from public.call_runs r where r.code = k;
  if c is null then return; end if;
  if not private.teaches(c) then raise exception 'Only a leader of this cohort can do this.'; end if;
  delete from public.call_runs r where r.code = k;
end;
$$;

revoke all on function public.run_in_call(text, uuid), public.stop_call_run(text) from public, anon;
grant execute on function public.run_in_call(text, uuid), public.stop_call_run(text) to authenticated;
