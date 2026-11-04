-- Whoever has the call's link is part of the cohort (Ben, November 4, 2026:
-- "If you have access to the google meet link, you are a part of the
-- cohort."). Someone in the call who is not signed in to a member's account
-- comes in as a guest, and a leader can tie that guest to a member, after
-- which the guest's answers are that member's.

create table public.call_guests (
  cohort_id  uuid not null references public.cohorts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  name       text check (char_length(name) <= 80),
  member_id  uuid references public.profiles (id) on delete set null,
  joined_at  timestamptz not null default now(),
  primary key (cohort_id, user_id)
);
alter table public.call_guests enable row level security;
grant select on public.call_guests to authenticated;
create policy call_guests_read on public.call_guests for select to authenticated
  using (user_id = auth.uid() or private.teaches(cohort_id));

-- A guest is in the cohort, so everything a member can read in the call
-- follows from this one place.
create or replace function private.in_cohort(c uuid) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.enrollments
    where cohort_id = c and user_id = auth.uid() and status <> 'left'
  ) or exists (
    select 1 from public.call_guests where cohort_id = c and user_id = auth.uid()
  ) or private.teaches(c);
$$;

create function private.claimed_member(c uuid) returns uuid
language sql stable security definer set search_path to 'public' as $$
  select member_id from public.call_guests where cohort_id = c and user_id = auth.uid();
$$;

-- An answer carries who gave it when that was a guest tied to a member, so
-- a leader can correct a wrong match and the guest still sees their answer.
alter table public.live_answers add column via_guest uuid references public.profiles (id) on delete set null;

create function private.answer_as_member() returns trigger
language plpgsql set search_path to '' as $$
declare m uuid := private.claimed_member(new.cohort_id);
begin
  if m is not null and new.user_id = auth.uid() then
    new.via_guest := auth.uid();
    new.user_id := m;
  end if;
  return new;
end;
$$;
create trigger live_answers_as_member before insert on public.live_answers
  for each row execute function private.answer_as_member();

drop policy live_answers_read on public.live_answers;
create policy live_answers_read on public.live_answers for select
  using (user_id = auth.uid() or via_guest = auth.uid() or private.teaches(cohort_id));
drop policy live_answers_give on public.live_answers;
create policy live_answers_give on public.live_answers for insert
  with check (
    ((user_id = auth.uid() and (via_guest is null or via_guest = auth.uid()))
      or (via_guest = auth.uid() and user_id = private.claimed_member(cohort_id)))
    and private.in_cohort(cohort_id)
    and private.answer_fits(check_id, cohort_id, choice, body, value));
drop policy live_answers_change on public.live_answers;
create policy live_answers_change on public.live_answers for update
  using (user_id = auth.uid() or via_guest = auth.uid())
  with check ((user_id = auth.uid() or via_guest = auth.uid()) and private.answer_fits(check_id, cohort_id, choice, body, value));
drop policy live_answers_take_back on public.live_answers;
create policy live_answers_take_back on public.live_answers for delete
  using (user_id = auth.uid() or via_guest = auth.uid());

-- The link is the way in: the panel hands over the call's code, and a person
-- who is not yet in that call's cohort joins it as a guest.
create function public.join_call(code text, guest_name text default null) returns uuid
language plpgsql security definer set search_path to 'public' as $$
declare
  me uuid := auth.uid();
  k text := lower(trim(code));
  c uuid;
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
  insert into public.call_guests (cohort_id, user_id, name)
  values (c, me, nullif(left(trim(guest_name), 80), ''))
  on conflict (cohort_id, user_id) do update
    set name = coalesce(nullif(left(trim(excluded.name), 80), ''), public.call_guests.name);
  return c;
end;
$$;

-- A leader says who a guest is, or changes their mind (member null). The
-- guest's answers move with the match; where the member already answered a
-- question themselves, theirs stands.
create function public.tie_call_guest(c uuid, guest uuid, member uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if not private.teaches(c) then raise exception 'Only a leader of this cohort can do this.'; end if;
  if member is not null and not exists (
    select 1 from public.enrollments e where e.cohort_id = c and e.user_id = member and e.status <> 'left'
  ) then raise exception 'That person is not in this cohort.'; end if;
  update public.call_guests set member_id = member where cohort_id = c and user_id = guest;
  if not found then raise exception 'That guest is not in this cohort.'; end if;
  with moved as (
    delete from public.live_answers where cohort_id = c and (user_id = guest or via_guest = guest) returning *
  )
  insert into public.live_answers (id, check_id, cohort_id, user_id, choice, body, created_at, updated_at, value, via_guest)
  select m.id, m.check_id, m.cohort_id, coalesce(member, guest), m.choice, m.body, m.created_at, m.updated_at, m.value,
         case when member is null then null else guest end
    from moved m
   where member is null or not exists (
     select 1 from public.live_answers a where a.check_id = m.check_id and a.user_id = member and a.via_guest is distinct from guest);
end;
$$;

revoke all on function public.join_call(text, text), public.tie_call_guest(uuid, uuid, uuid) from public, anon;
grant execute on function public.join_call(text, text), public.tie_call_guest(uuid, uuid, uuid) to authenticated;

-- A guest has no account of their own to speak for: they answer in the call,
-- and nothing they do reaches anywhere public.
create function private.not_a_guest() returns boolean
language sql stable set search_path to '' as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;
create policy guests_cannot_add on public.builder_apps as restrictive for insert with check (private.not_a_guest());
create policy guests_cannot_add on public.teacher_requests as restrictive for insert with check (private.not_a_guest());
create policy guests_cannot_add on public.shares as restrictive for insert with check (private.not_a_guest());
