-- A session's event lives on its leader's own calendar
-- (research/notes/calendar-ownership-notes.md). Ben, November 4, 2026:
-- "we aren't dependent upon a single account for very much." The leader
-- presses a button, and their browser makes the events with a short-lived
-- token, so nothing of theirs is kept here. Cohorts already on meet@'s
-- calendar stay there, because moving them would change their Meet links.
-- Every session is an hour (Ben: "Let's just make everything 60 minutes").

alter table public.cohorts alter column session_minutes set default 60;
alter table public.time_polls alter column session_minutes set default 60;

alter table public.cohorts add column calendar_by text not null default 'leader' check (calendar_by in ('leader', 'meet'));
alter table public.cohorts add column calendar_owner uuid references public.profiles (id) on delete set null;
update public.cohorts set calendar_by = 'meet';

-- meet@'s script now sees only the cohorts it holds.
do $do$
declare d text; was text;
begin
  d := pg_get_functiondef('public.calendar_work(int)'::regprocedure); was := d;
  d := replace(d, $x$where c.status in ('open', 'running')$x$, $x$where c.status in ('open', 'running') and c.calendar_by = 'meet'$x$);
  d := replace(d, $x$where c.status = 'finished' and$x$, $x$where c.status = 'finished' and c.calendar_by = 'meet' and$x$);
  if d = was then raise exception 'calendar_work did not change'; end if;
  execute d;
  d := pg_get_functiondef('public.invitation_work(int)'::regprocedure); was := d;
  d := replace(d, $x$and c.status = 'open'$x$, $x$and c.status = 'open' and c.calendar_by = 'meet'$x$);
  if d = was then raise exception 'invitation_work did not change'; end if;
  execute d;
end $do$;

-- Every session whose event needs making, changing, or removing. A person
-- invited from a time poll who has not joined is a guest too: the event
-- carries the link to join, so it is their invitation.
create function private.leader_calendar_rows(c uuid)
returns table (session_id uuid, slug text, cohort_title text, number int, title text, starts_at timestamptz,
               minutes int, time_zone text, event_id text, guests text[], want text, meet_url text)
language sql stable security definer set search_path = '' as $$
  with base as (
    select s.id, co.slug, co.title as cohort_title, s.number, s.title, s.starts_at, co.session_minutes as minutes,
           co.time_zone, s.calendar_event_id, s.calendar_synced, s.meet_url,
           coalesce((
             select array_agg(distinct x.email order by x.email)
               from (
                 select private.invite_address(e.user_id, co.id) as email
                   from public.enrollments e where e.cohort_id = co.id and e.status = 'enrolled'
                 union
                 select private.invite_address(t.user_id, co.id)
                   from public.cohort_teachers t where t.cohort_id = co.id
                 union
                 select lower(trim(a.contact))
                   from public.time_poll_answers a
                   join public.time_polls p on p.id = a.poll_id and p.cohort_id = co.id
                  where a.invited and not coalesce(a.host, false) and a.joined_by is null
               ) x
              where x.email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'), '{}') as guests
      from public.sessions s
      join public.cohorts co on co.id = s.cohort_id
     where co.id = c and co.calendar_by = 'leader' and co.status in ('open', 'running')
       and s.starts_at is not null
       and s.starts_at + make_interval(mins => co.session_minutes) > now()
  ), wanted as (
    select b.*, md5(concat_ws('|', 'v1', b.starts_at::text, b.minutes::text, b.number::text, coalesce(b.title, ''),
                              b.cohort_title, b.slug, array_to_string(b.guests, ','))) as want
      from base b
  )
  select * from (
    select w.id, w.slug, w.cohort_title, w.number::int, w.title, w.starts_at, w.minutes::int, w.time_zone,
           w.calendar_event_id, w.guests, w.want, w.meet_url
      from wanted w where w.calendar_synced is distinct from w.want
    union all
    select s.id, co.slug, co.title, s.number::int, s.title, s.starts_at, co.session_minutes::int, co.time_zone,
           s.calendar_event_id, '{}'::text[], 'cancel', s.meet_url
      from public.sessions s
      join public.cohorts co on co.id = s.cohort_id
     where co.id = c and co.calendar_by = 'leader' and co.status = 'finished'
       and s.calendar_event_id is not null and s.starts_at > now()
  ) work
  order by starts_at;
$$;
revoke all on function private.leader_calendar_rows(uuid) from public, anon, authenticated;

create function public.my_calendar_work(c uuid)
returns table (session_id uuid, slug text, cohort_title text, number int, title text, starts_at timestamptz,
               minutes int, time_zone text, event_id text, guests text[], want text, meet_url text)
language sql stable security definer set search_path = '' as $$
  select r.* from private.leader_calendar_rows(c) r
   where private.teaches(c) and private.not_an_agent()
     and exists (select 1 from public.cohorts x where x.id = c and (x.calendar_owner is null or x.calendar_owner = auth.uid()));
$$;
revoke all on function public.my_calendar_work(uuid) from public, anon;
grant execute on function public.my_calendar_work(uuid) to authenticated;

create function public.my_calendar_done(s uuid, event_id text, meet_url text, synced text, problem text default null, cancelled boolean default false)
returns void
language plpgsql security definer set search_path = '' as $$
declare c uuid;
begin
  select x.cohort_id into c from public.sessions x where x.id = s;
  if c is null or not private.teaches(c) or not private.not_an_agent() then raise exception 'Only a leader of this cohort can do that.'; end if;
  if cancelled then
    update public.sessions x set calendar_event_id = null, meet_url = null, calendar_synced = null, calendar_error = null, calendar_at = now() where x.id = s;
    return;
  end if;
  update public.sessions x
     set calendar_event_id = coalesce(nullif(my_calendar_done.event_id, ''), x.calendar_event_id),
         meet_url = case when x.meet_url is null and my_calendar_done.meet_url ~ '^https://meet\.google\.com/[a-z0-9-]{3,40}$'
                         then my_calendar_done.meet_url else x.meet_url end,
         calendar_synced = case when my_calendar_done.problem is null then left(my_calendar_done.synced, 64) else x.calendar_synced end,
         calendar_error = left(my_calendar_done.problem, 1000),
         calendar_at = now()
   where x.id = s;
  if problem is null then
    update public.cohorts x set calendar_owner = auth.uid() where x.id = c and x.calendar_owner is null;
    update public.time_poll_answers a set invite_sent_at = now()
      from public.time_polls p
     where p.id = a.poll_id and p.cohort_id = c and a.invited and a.invite_sent_at is null;
  end if;
end;
$$;
revoke all on function public.my_calendar_done(uuid, text, text, text, text, boolean) from public, anon;
grant execute on function public.my_calendar_done(uuid, text, text, text, text, boolean) to authenticated;

-- What each leader's calendar is behind on, for their reminders.
create function public.reminder_calendar_due()
returns table (cohort_id uuid, owner uuid, due int)
language sql stable security definer set search_path = '' as $$
  select co.id, co.calendar_owner, (select count(*)::int from private.leader_calendar_rows(co.id))
    from public.cohorts co where co.calendar_by = 'leader' and co.status in ('open', 'running', 'finished');
$$;
revoke all on function public.reminder_calendar_due() from public, anon, authenticated;
grant execute on function public.reminder_calendar_due() to service_role;

create or replace function public.my_open_items()
returns table (cohort_id uuid, slug text, kind text, session_number int, starts_at timestamptz, amount int, token text, label text)
language sql stable security definer set search_path = '' as $$
  select o.cohort_id, o.slug, o.kind, o.session_number, o.starts_at, o.amount, o.token, o.label
    from private.open_items(auth.uid()) o
   where auth.uid() is not null and private.not_an_agent()
  union all
  select co.id, co.slug, 'calendar', null, null, w.due, null, null
    from public.cohorts co
    join public.cohort_teachers t on t.cohort_id = co.id and t.user_id = auth.uid()
    cross join lateral (select count(*)::int as due from private.leader_calendar_rows(co.id)) w
   where w.due > 0 and private.not_an_agent() and (co.calendar_owner is null or co.calendar_owner = auth.uid());
$$;
