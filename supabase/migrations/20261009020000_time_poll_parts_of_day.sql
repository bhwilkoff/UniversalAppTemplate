-- Parts of the day (Ben, October 9, 2026): "it only has times in the
-- evening, but some cohorts might meet during the day, so we need to allow
-- for that as well." A poll can now offer any set of start times (mornings
-- and evenings without the afternoon, say), listed in `minutes`. A poll
-- without the list keeps its one window from first_minute to last_minute.

alter table public.time_polls add column minutes smallint[]
  check (minutes is null or (cardinality(minutes) between 1 and 96 and 0 <= all (minutes) and 1439 >= all (minutes)));

create or replace function private.time_poll_slots_ok(p public.time_polls, slots integer[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(bool_and(
    s >= 0 and (s / 1440)::smallint = any (p.days)
    and case when p.minutes is not null then (s % 1440)::smallint = any (p.minutes)
             else s % 1440 between p.first_minute and p.last_minute
                  and (s % 1440 - p.first_minute) % p.step_minutes = 0 end
  ), true)
  from unnest(slots) s;
$$;
revoke all on function private.time_poll_slots_ok(public.time_polls, integer[]) from public, anon, authenticated;

create or replace function public.time_poll(t text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'title', p.title, 'note', p.note, 'time_zone', p.time_zone, 'days', p.days,
    'first_minute', p.first_minute, 'last_minute', p.last_minute, 'step_minutes', p.step_minutes,
    'minutes', p.minutes,
    'session_minutes', p.session_minutes, 'starts_on', p.starts_on, 'open', p.open,
    'teacher', coalesce(nullif(btrim(pr.display_name), ''), pr.github_login)
  )
  from private.time_poll_by_token(t) p
  join public.profiles pr on pr.id = p.created_by
  where p.id is not null;
$$;
