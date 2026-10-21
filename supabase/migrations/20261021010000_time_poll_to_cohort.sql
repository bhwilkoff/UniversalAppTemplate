-- A poll becomes a cohort (Ben, October 21, 2026): "I'm ready to convert a
-- Time Poll into a cohort at a particular time with the participants that
-- filled out the poll."
--
-- The teacher chooses the time and the people. time_poll_to_cohort makes a
-- new cohort meeting at that weekly time (or sets the time of the cohort
-- the poll was already for), closes the poll, and marks the chosen answers
-- `invited`. People who answered have no account, so no one is enrolled
-- for them: each invited person sees the cohort when they come back to the
-- poll's link (my_time_poll_answer reads it with their answer's secret)
-- and joins it themselves, with GitHub, like any open cohort.

alter table public.time_poll_answers add column invited boolean not null default false;

create function public.time_poll_to_cohort(
  poll uuid, slot integer, invite uuid[] default '{}',
  title text default null, slug text default null, starts_on date default null,
  weeks integer default 5, status public.cohort_status default 'open', cohort uuid default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p public.time_polls;
  made uuid;
  made_slug text;
begin
  if not private.not_an_agent() then
    raise exception 'An agent cannot make a cohort for a person.';
  end if;
  if not private.owns_time_poll(poll) then
    raise exception 'Only the poll''s teachers can make a cohort from it.';
  end if;
  select * into p from public.time_polls where id = poll;
  if slot is null or not private.time_poll_slots_ok(p, array[slot]) then
    raise exception 'That time is not in this poll.';
  end if;
  cohort := coalesce(cohort, p.cohort_id);
  if cohort is not null then
    if not private.teaches(cohort) then
      raise exception 'You do not teach that cohort.';
    end if;
    update public.cohorts c
    set session_weekday = (slot / 1440)::smallint,
        session_time = make_time((slot % 1440) / 60, (slot % 1440) % 60, 0),
        session_minutes = p.session_minutes,
        time_zone = p.time_zone,
        starts_on = coalesce(time_poll_to_cohort.starts_on, c.starts_on)
    where c.id = cohort
    returning c.id, c.slug into made, made_slug;
  else
    if not private.is_hub_teacher() then
      raise exception 'Only teachers make cohorts.';
    end if;
    if status not in ('draft', 'open') then
      raise exception 'A new cohort starts as a draft or open.';
    end if;
    insert into public.cohorts (slug, title, status, starts_on, weeks, time_zone,
                                session_weekday, session_time, session_minutes, created_by)
    values (btrim(time_poll_to_cohort.slug), coalesce(nullif(btrim(time_poll_to_cohort.title), ''), p.title),
            status, coalesce(time_poll_to_cohort.starts_on, p.starts_on), coalesce(weeks, 5)::smallint, p.time_zone,
            (slot / 1440)::smallint, make_time((slot % 1440) / 60, (slot % 1440) % 60, 0), p.session_minutes, auth.uid())
    returning id, cohorts.slug into made, made_slug;
  end if;
  update public.time_polls set cohort_id = made, open = false where id = poll;
  update public.time_poll_answers a
  set invited = (a.id = any (coalesce(invite, '{}')) and not a.host)
  where a.poll_id = poll;
  return jsonb_build_object('id', made, 'slug', made_slug);
end;
$$;
revoke all on function public.time_poll_to_cohort(uuid, integer, uuid[], text, text, date, integer, public.cohort_status, uuid) from public, anon;
grant execute on function public.time_poll_to_cohort(uuid, integer, uuid[], text, text, date, integer, public.cohort_status, uuid) to authenticated;

-- A person's own answer now carries the cohort they were invited to.
create or replace function public.my_time_poll_answer(t text, answer uuid, secret uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', a.id, 'name', a.name, 'contact', a.contact, 'comment', a.comment,
    'works', a.works, 'if_need_be', a.if_need_be, 'tally', private.time_poll_tally(p.id),
    'cohort', (select jsonb_build_object(
        'title', c.title, 'slug', c.slug, 'status', c.status, 'starts_on', c.starts_on, 'weeks', c.weeks,
        'time_zone', c.time_zone, 'session_weekday', c.session_weekday, 'session_time', c.session_time,
        'session_minutes', c.session_minutes)
      from public.cohorts c where c.id = p.cohort_id and a.invited)
  )
  from private.time_poll_by_token(t) p
  join public.time_poll_answers a on a.poll_id = p.id
  join private.time_poll_secrets k on k.answer_id = a.id
  where a.id = answer and k.secret = my_time_poll_answer.secret;
$$;
