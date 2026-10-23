-- When a cohort finishes, the sessions it had not held yet leave everyone's
-- calendar (JOURNEYS.md, Ben's decision 9). They come back on the
-- calendar's to-do list with want = 'cancel' and no guests, meet@'s script
-- deletes each event and says so, and the session forgets its event.
create or replace function public.calendar_work(n int default 30)
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
  ), wanted as (
    select b.*, md5(concat_ws('|', 'v1', b.starts_at::text, b.minutes::text, b.number::text, coalesce(b.title, ''),
                              b.cohort_title, b.slug, array_to_string(b.guests, ','))) as want
      from base b
  )
  select * from (
    select w.id, w.cohort_id, w.slug, w.cohort_title, w.number, w.title, w.starts_at, w.minutes, w.time_zone,
           w.calendar_event_id, w.guests, w.want
      from wanted w
     where w.calendar_synced is distinct from w.want
    union all
    select s.id, s.cohort_id, c.slug, c.title, s.number, s.title, s.starts_at, c.session_minutes, c.time_zone,
           s.calendar_event_id, '{}'::text[], 'cancel'
      from public.sessions s
      join public.cohorts c on c.id = s.cohort_id
     where c.status = 'finished' and s.calendar_event_id is not null and s.starts_at > now()
  ) all_work
  order by starts_at
  limit greatest(1, least(coalesce(n, 30), 100));
$$;

-- The script deleted a finished cohort's event for a session.
create function public.calendar_cancelled(s uuid) returns void
language sql security definer set search_path = '' as $$
  update public.sessions x
     set calendar_event_id = null, meet_url = null, calendar_synced = null, calendar_error = null, calendar_at = now()
   where x.id = s;
$$;
revoke all on function public.calendar_work(int), public.calendar_cancelled(uuid) from public, anon, authenticated;
grant execute on function public.calendar_work(int), public.calendar_cancelled(uuid) to service_role;
