-- A leader can run a session from any cohort they lead, a draft or a finished
-- one included, by choosing it in a call (DECISIONS.md, "A session can run
-- again"). A call's own schedule still counts only for open or running cohorts.

create or replace function private.call_cohort(k text) returns uuid
language plpgsql stable security definer set search_path to 'public' as $$
declare
  c uuid;
begin
  select r.cohort_id into c from public.call_runs r
   where r.code = k and r.ends_at > now();
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

create or replace function public.run_in_call(code text, session uuid) returns uuid
language plpgsql security definer set search_path to 'public' as $$
declare
  k text := lower(trim(code));
  c uuid;
  other uuid;
begin
  if auth.uid() is null or k !~ '^[a-z]{3}-[a-z]{4}-[a-z]{3}$' then raise exception 'That is not a Meet call.'; end if;
  select s.cohort_id into c from public.sessions s where s.id = session;
  if c is null then raise exception 'That session does not exist.'; end if;
  if not private.teaches(c) then raise exception 'Only a leader of this cohort can do this.'; end if;
  -- A run this leader set earlier in the call can be replaced by any cohort they lead.
  delete from public.call_runs r where r.code = k and r.set_by = auth.uid() and r.cohort_id <> c;
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
