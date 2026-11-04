-- A guest who already has a name here keeps it, and a guest can read the
-- names of the people in the cohort they joined.

create or replace function private.shares_a_cohort_with(other uuid) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1
    from public.enrollments mine
    join public.enrollments theirs on theirs.cohort_id = mine.cohort_id
    where mine.user_id = auth.uid() and mine.status <> 'left'
      and theirs.user_id = other and theirs.status <> 'left'
  ) or exists (
    select 1 from public.cohort_teachers t
    join public.enrollments e on e.cohort_id = t.cohort_id
    where (t.user_id = auth.uid() and e.user_id = other)
       or (t.user_id = other and e.user_id = auth.uid())
  ) or exists (
    select 1 from public.call_guests g
    where g.user_id = auth.uid() and (
      exists (select 1 from public.enrollments e where e.cohort_id = g.cohort_id and e.user_id = other and e.status <> 'left')
      or exists (select 1 from public.cohort_teachers t where t.cohort_id = g.cohort_id and t.user_id = other))
  );
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
  select s.cohort_id into c from public.sessions s join public.cohorts co on co.id = s.cohort_id
   where s.meet_url ilike '%' || k || '%' and co.status in ('open', 'running')
   order by s.starts_at desc nulls last limit 1;
  if c is null then
    select g.cohort_id into c from public.groups g join public.cohorts co on co.id = g.cohort_id
     where g.meet_url ilike '%' || k || '%' and co.status in ('open', 'running') limit 1;
  end if;
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
