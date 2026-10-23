-- A session keeps the Meet link it already has. Found in the live test of
-- October 23, 2026: a leader had set a session's call, opened the add-on
-- in it, and the next hourly calendar run made the session's event with a
-- new call and wrote that link over the leader's, so the add-on in the
-- call people were in no longer knew its session. The calendar's to-do
-- list now hands meet@'s script the session's link, which the new event
-- carries, and the script's link is written only where there was none.
drop function public.calendar_work(int);
create function public.calendar_work(n int default 30)
returns table (session_id uuid, cohort_id uuid, slug text, cohort_title text, number int, title text,
               starts_at timestamptz, minutes int, time_zone text, event_id text, guests text[], want text, meet_url text)
language sql stable security definer set search_path = '' as $$
  with base as (
    select s.id, s.cohort_id, c.slug, c.title as cohort_title, s.number, s.title, s.starts_at,
           c.session_minutes as minutes, c.time_zone, s.calendar_event_id, s.calendar_synced, s.meet_url,
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
           w.calendar_event_id, w.guests, w.want, w.meet_url
      from wanted w
     where w.calendar_synced is distinct from w.want
    union all
    select s.id, s.cohort_id, c.slug, c.title, s.number, s.title, s.starts_at, c.session_minutes, c.time_zone,
           s.calendar_event_id, '{}'::text[], 'cancel', s.meet_url
      from public.sessions s
      join public.cohorts c on c.id = s.cohort_id
     where c.status = 'finished' and s.calendar_event_id is not null and s.starts_at > now()
  ) all_work
  order by starts_at
  limit greatest(1, least(coalesce(n, 30), 100));
$$;


create or replace function public.calendar_done(s uuid, event_id text, meet_url text, synced text, problem text default null)
returns void
language sql security definer set search_path = '' as $$
  update public.sessions x
     set calendar_event_id = coalesce(nullif(calendar_done.event_id, ''), x.calendar_event_id),
         meet_url = case when x.meet_url is null and calendar_done.meet_url ~ '^https://meet\.google\.com/[a-z0-9-]{3,40}$'
                         then calendar_done.meet_url else x.meet_url end,
         calendar_synced = case when calendar_done.problem is null then left(calendar_done.synced, 64) else x.calendar_synced end,
         calendar_error = left(calendar_done.problem, 1000),
         calendar_at = now()
   where x.id = s;
$$;

revoke all on function public.calendar_work(int), public.calendar_done(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.calendar_work(int), public.calendar_done(uuid, text, text, text, text) to service_role;
