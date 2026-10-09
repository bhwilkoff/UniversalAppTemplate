-- The teacher's own name and times (Ben, October 9, 2026): "allow for the
-- teacher to add their name (from the poll setup page) and their own
-- availability. I feel like that is an important part too."
--
-- host_name is the name the poll shows as its teacher. The teacher's own
-- times are one answer row marked `host`, set through set_host_times by
-- the poll's teachers; it counts like any other answer, and anyone with
-- the link sees which times the teacher can make (a constraint, not a vote).

alter table public.time_polls add column host_name text
  check (host_name is null or char_length(btrim(host_name)) between 1 and 80);

alter table public.time_poll_answers add column host boolean not null default false;
create unique index time_poll_answers_one_host on public.time_poll_answers (poll_id) where host;

create function public.set_host_times(poll uuid, works integer[], if_need_be integer[] default '{}')
returns void
language plpgsql security definer set search_path = '' as $$
declare
  p public.time_polls;
  w integer[] := coalesce((select array_agg(distinct s order by s) from unnest(works) s), '{}');
  m integer[] := coalesce((select array_agg(distinct s order by s) from unnest(if_need_be) s where not s = any (coalesce(works, '{}'))), '{}');
  who text;
begin
  if not private.not_an_agent() then
    raise exception 'An agent cannot answer for a person.';
  end if;
  if not private.owns_time_poll(poll) then
    raise exception 'Only the poll''s teachers can set its teacher''s times.';
  end if;
  select * into p from public.time_polls where id = poll;
  if cardinality(w) + cardinality(m) > 700 or not private.time_poll_slots_ok(p, w) or not private.time_poll_slots_ok(p, m) then
    raise exception 'One of those times is not in this poll.';
  end if;
  if cardinality(w) + cardinality(m) = 0 then
    delete from public.time_poll_answers a where a.poll_id = poll and a.host;
    return;
  end if;
  select coalesce(nullif(btrim(p.host_name), ''), nullif(btrim(pr.display_name), ''), pr.github_login)
    into who from public.profiles pr where pr.id = p.created_by;
  insert into public.time_poll_answers (poll_id, name, works, if_need_be, host)
  values (poll, who, w, m, true)
  on conflict (poll_id) where host
  do update set works = excluded.works, if_need_be = excluded.if_need_be, name = excluded.name, updated_at = now();
end;
$$;
revoke all on function public.set_host_times(uuid, integer[], integer[]) from public, anon;
grant execute on function public.set_host_times(uuid, integer[], integer[]) to authenticated;

-- A renamed poll renames its teacher's answer.
create function private.time_poll_host_name() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.host_name is distinct from old.host_name then
    update public.time_poll_answers a
    set name = coalesce(nullif(btrim(new.host_name), ''), (
      select coalesce(nullif(btrim(pr.display_name), ''), pr.github_login) from public.profiles pr where pr.id = new.created_by))
    where a.poll_id = new.id and a.host;
  end if;
  return new;
end;
$$;
revoke all on function private.time_poll_host_name() from public, anon, authenticated;
create trigger time_polls_host_name after update of host_name on public.time_polls
  for each row execute function private.time_poll_host_name();

create or replace function public.time_poll(t text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'title', p.title, 'note', p.note, 'time_zone', p.time_zone, 'days', p.days,
    'first_minute', p.first_minute, 'last_minute', p.last_minute, 'step_minutes', p.step_minutes,
    'minutes', p.minutes,
    'session_minutes', p.session_minutes, 'starts_on', p.starts_on, 'open', p.open,
    'teacher', coalesce(nullif(btrim(p.host_name), ''), nullif(btrim(pr.display_name), ''), pr.github_login),
    'host_works', (select a.works from public.time_poll_answers a where a.poll_id = p.id and a.host),
    'host_if_need_be', (select a.if_need_be from public.time_poll_answers a where a.poll_id = p.id and a.host)
  )
  from private.time_poll_by_token(t) p
  join public.profiles pr on pr.id = p.created_by
  where p.id is not null;
$$;
