-- Each session on everyone's calendar, and the people invited from a poll
-- told about it (JOURNEYS.md, Ben's decisions of October 23, 2026, 1, 2,
-- 7, and 10). Ben: "Each session should be its own calendar event that
-- has the meet link attached," and "That is how humans work with
-- calendars."
--
-- meet@humanshaped.org's Apps Script (tools/meet-events) does the Google
-- side through the setup-queue function, with the service role: it asks
-- for the sessions whose event is missing or out of date, makes or
-- changes one event per session with its own Meet link and its guests,
-- and says what it did. It asks for the invitations still to send the
-- same way. Nothing here is readable by anyone signed in except their
-- own address.

-- Where one person's calendar invitations go, for every cohort. With no
-- row, they go to the email they signed in with.
create table public.calendar_preferences (
  user_id    uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  email      text check (email is null or (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254)),
  invites    boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.calendar_preferences enable row level security;

create policy calendar_preferences_own_read on public.calendar_preferences for select to authenticated
  using (user_id = auth.uid());
create policy calendar_preferences_own_insert on public.calendar_preferences for insert to authenticated
  with check (user_id = auth.uid());
create policy calendar_preferences_own_update on public.calendar_preferences for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy calendar_preferences_own_delete on public.calendar_preferences for delete to authenticated
  using (user_id = auth.uid());

-- The address a person is invited at for one cohort, or null when they
-- turned invitations off. A choice made on /account/ wins; then an address
-- given for this cohort (on its poll, or in Your work before); then the
-- email they signed in with.
create function private.invite_address(u uuid, c uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case
    when p.invites is false then null
    else nullif(lower(trim(coalesce(p.email, cc.email, au.email))), '')
  end
  from auth.users au
  left join public.calendar_preferences p on p.user_id = au.id
  left join public.calendar_contacts cc on cc.user_id = au.id and cc.cohort_id = c
  where au.id = u;
$$;
revoke all on function private.invite_address(uuid, uuid) from public, anon, authenticated;

-- What a person may know about their own invitations for a cohort: the
-- address, whether they turned them off, and where the address came from.
create function public.my_invite_address(c uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'email', private.invite_address(auth.uid(), c),
    'invites', coalesce(p.invites, true),
    'from', case when p.email is not null then 'account'
                 when cc.email is not null then 'cohort'
                 else 'sign-in' end)
  from auth.users au
  left join public.calendar_preferences p on p.user_id = au.id
  left join public.calendar_contacts cc on cc.user_id = au.id and cc.cohort_id = c
  where au.id = auth.uid();
$$;
revoke all on function public.my_invite_address(uuid) from public, anon;
grant execute on function public.my_invite_address(uuid) to authenticated;

-- The sign-in email itself, for the account page to show as the default.
create function public.my_sign_in_email() returns text
language sql stable security definer set search_path = '' as $$
  select email from auth.users where id = auth.uid();
$$;
revoke all on function public.my_sign_in_email() from public, anon;
grant execute on function public.my_sign_in_email() to authenticated;

-- Each session's own event on meet@'s calendar, and what it last held.
alter table public.sessions
  add column calendar_event_id text check (calendar_event_id is null or char_length(calendar_event_id) <= 1024),
  add column calendar_synced   text check (calendar_synced is null or char_length(calendar_synced) <= 64),
  add column calendar_error    text check (calendar_error is null or char_length(calendar_error) <= 1000),
  add column calendar_at       timestamptz;

-- The calendar's to-do list: every session still to come in an open or
-- running cohort whose event is missing or no longer matches its time,
-- title, or guests. `want` is a fingerprint of what the event should
-- hold; the script hands it back when the event matches it.
create function public.calendar_work(n int default 30)
returns table (session_id uuid, cohort_id uuid, slug text, cohort_title text, number int, title text,
               starts_at timestamptz, minutes int, time_zone text, event_id text, guests text[], want text)
language sql stable security definer set search_path = '' as $$
  with base as (
    select s.id, s.cohort_id, c.slug, c.title as cohort_title, s.number, s.title, s.starts_at,
           c.session_minutes as minutes, c.time_zone, s.calendar_event_id, s.calendar_synced,
           coalesce((
             select array_agg(distinct x.email order by x.email)
               from (
                 select private.invite_address(e.user_id, c.id) as email
                   from public.enrollments e where e.cohort_id = c.id and e.status = 'enrolled'
                 union
                 select private.invite_address(t.user_id, c.id)
                   from public.cohort_teachers t where t.cohort_id = c.id
               ) x
              where x.email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'), '{}') as guests
      from public.sessions s
      join public.cohorts c on c.id = s.cohort_id
     where c.status in ('open', 'running')
       and s.starts_at is not null
       and s.starts_at + make_interval(mins => c.session_minutes) > now()
  )
  select b.id, b.cohort_id, b.slug, b.cohort_title, b.number, b.title, b.starts_at, b.minutes, b.time_zone,
         b.calendar_event_id, b.guests,
         md5(concat_ws('|', 'v1', b.starts_at::text, b.minutes::text, b.number::text, coalesce(b.title, ''),
                       b.cohort_title, b.slug, array_to_string(b.guests, ',')))
    from base b
   where b.calendar_synced is distinct from
         md5(concat_ws('|', 'v1', b.starts_at::text, b.minutes::text, b.number::text, coalesce(b.title, ''),
                       b.cohort_title, b.slug, array_to_string(b.guests, ',')))
   order by b.starts_at
   limit greatest(1, least(coalesce(n, 30), 100));
$$;

-- What the script did with one session: the event it made or changed,
-- the event's own Meet link, and the fingerprint it now matches; or the
-- problem, which leaves the session on the to-do list.
create function public.calendar_done(s uuid, event_id text, meet_url text, synced text, problem text default null)
returns void
language sql security definer set search_path = '' as $$
  update public.sessions x
     set calendar_event_id = coalesce(nullif(calendar_done.event_id, ''), x.calendar_event_id),
         meet_url = case when calendar_done.meet_url ~ '^https://meet\.google\.com/[a-z0-9-]{3,40}$'
                         then calendar_done.meet_url else x.meet_url end,
         calendar_synced = case when calendar_done.problem is null then left(calendar_done.synced, 64) else x.calendar_synced end,
         calendar_error = left(calendar_done.problem, 1000),
         calendar_at = now()
   where x.id = s;
$$;

revoke all on function public.calendar_work(int), public.calendar_done(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.calendar_work(int), public.calendar_done(uuid, text, text, text, text) to service_role;

-- ---------------------------------------------------------------------
-- Invitations from a poll (decision 2): meet@ emails each person the
-- leader invited when the poll became a cohort, once, with a link that
-- carries this answer's own token, so their poll address can become
-- their calendar address when they join.
-- ---------------------------------------------------------------------

alter table public.time_poll_answers
  add column invite_token   uuid not null default gen_random_uuid() unique,
  add column invite_sent_at timestamptz,
  add column joined_by      uuid references public.profiles (id) on delete set null;

-- The invitations still to send: invited, not the host, an email given,
-- not yet sent or joined, and the cohort open for joining.
create function public.invitation_work(n int default 50)
returns table (answer_id uuid, email text, name text, cohort_title text, slug text, leader text,
               first_session timestamptz, time_zone text, minutes int, token uuid)
language sql stable security definer set search_path = '' as $$
  select a.id, lower(trim(a.contact)), a.name, c.title, c.slug,
         coalesce(nullif(trim(p.host_name), ''), 'Your leader'),
         (select min(s.starts_at) from public.sessions s where s.cohort_id = c.id and s.starts_at > now()),
         c.time_zone, c.session_minutes, a.invite_token
    from public.time_poll_answers a
    join public.time_polls p on p.id = a.poll_id
    join public.cohorts c on c.id = p.cohort_id
   where a.invited and not coalesce(a.host, false)
     and a.invite_sent_at is null and a.joined_by is null
     and trim(a.contact) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     and c.status = 'open'
   order by a.created_at
   limit greatest(1, least(coalesce(n, 50), 200));
$$;

create function public.invitation_sent(ids uuid[]) returns int
language sql security definer set search_path = '' as $$
  with done as (
    update public.time_poll_answers a set invite_sent_at = now()
     where a.id = any(ids) and a.invite_sent_at is null
    returning 1)
  select count(*)::int from done;
$$;

revoke all on function public.invitation_work(int), public.invitation_sent(uuid[]) from public, anon, authenticated;
grant execute on function public.invitation_work(int), public.invitation_sent(uuid[]) to service_role;

-- Called by the person who followed the link, once they have joined the
-- cohort: the answer is marked theirs, and the address they gave on the
-- poll becomes their calendar address for this cohort, unless they have
-- already chosen one.
create function public.claim_invitation(t uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  a record;
begin
  if auth.uid() is null then return 'signed out'; end if;
  select x.id, x.contact, x.joined_by, p.cohort_id into a
    from public.time_poll_answers x join public.time_polls p on p.id = x.poll_id
   where x.invite_token = t and x.invited;
  if a.id is null or a.cohort_id is null then return 'unknown'; end if;
  if a.joined_by is not null and a.joined_by <> auth.uid() then return 'taken'; end if;
  if not exists (select 1 from public.enrollments e where e.cohort_id = a.cohort_id and e.user_id = auth.uid() and e.status = 'enrolled') then
    return 'not joined';
  end if;
  update public.time_poll_answers set joined_by = auth.uid() where id = a.id;
  if trim(a.contact) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(trim(a.contact)) <= 254 then
    insert into public.calendar_contacts (cohort_id, user_id, email)
    values (a.cohort_id, auth.uid(), lower(trim(a.contact)))
    on conflict (cohort_id, user_id) do nothing;
  end if;
  return 'claimed';
end;
$$;
revoke all on function public.claim_invitation(uuid) from public, anon;
grant execute on function public.claim_invitation(uuid) to authenticated;
