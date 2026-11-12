-- A breakout room's work outlives the room (found in a learner's real Meet
-- call, November 12, 2026: End breakouts deleted the room's group, and with
-- it, by cascade, the room's workbook answers, so the debrief and the session
-- page had nothing to show). An ended room keeps its people and its answers;
-- it loses its Meet link, so it never matches a call again, and it says when
-- it ended and which session it belonged to.

alter table public.groups add column ended_at timestamptz;
alter table public.groups add column session_id uuid references public.sessions (id) on delete set null;

create or replace function public.end_breakouts(c uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if not private.teaches(c) or not private.not_an_agent() then
    raise exception 'Only a leader of this cohort can do this.';
  end if;
  update public.groups set ended_at = now(), meet_url = null
   where cohort_id = c and breakout and ended_at is null;
  update public.breakout_rooms set cohort_id = null, leased_until = null where cohort_id = c;
end;
$$;

create or replace function public.launch_breakouts(session uuid, rooms jsonb, names jsonb default null) returns integer
language plpgsql security definer set search_path to 'public' as $$
declare
  c uuid;
  n integer := jsonb_array_length(rooms);
  i integer;
  u text;
  g uuid;
  nm text;
begin
  select s.cohort_id into c from public.sessions s where s.id = session;
  if c is null or not private.teaches(c) or not private.not_an_agent() then
    raise exception 'Only a leader of this cohort can do this.';
  end if;
  if n < 1 or n > 40 then raise exception 'Choose from 1 to 40 rooms.'; end if;
  perform public.end_breakouts(c);
  for i in 0 .. n - 1 loop
    select b.url into u from public.breakout_rooms b
     where b.leased_until is null or b.leased_until < now()
     order by b.leased_until nulls first, b.url limit 1 for update skip locked;
    if u is null then raise exception 'Only % rooms are free right now.', i; end if;
    -- A room another cohort used before keeps its work; only its link moves.
    update public.groups set ended_at = coalesce(ended_at, now()), meet_url = null where breakout and meet_url = u;
    update public.breakout_rooms set cohort_id = c, leased_until = now() + interval '4 hours' where url = u;
    nm := nullif(btrim(left(coalesce(names ->> i, ''), 60)), '');
    insert into public.groups (cohort_id, name, meet_url, breakout, session_id)
    values (c, coalesce(nm, 'Room ' || (i + 1)), u, true, session) returning id into g;
    insert into public.group_members (group_id, user_id)
    select g, m.id from (select (x)::uuid as id from jsonb_array_elements_text(rooms -> i) x) m
     where exists (select 1 from public.enrollments e where e.cohort_id = c and e.user_id = m.id and e.status <> 'left')
        or exists (select 1 from public.call_guests k where k.cohort_id = c and k.user_id = m.id);
  end loop;
  return n;
end;
$$;
