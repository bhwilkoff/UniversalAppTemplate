-- Breakouts from the add-on (Ben, November 4, 2026). Meet offers no way to
-- make or move people between rooms from an add-on, so a room is its own Meet
-- call. A leader presses Launch and needs nothing ready: the rooms come from
-- one shared pool of links, lent to a cohort for a few hours, and a breakout
-- is an ordinary group, so everything groups do already works in it.

alter table public.groups add column breakout boolean not null default false;

create table public.breakout_rooms (
  url          text primary key check (url ~ '^https://meet\.google\.com/[a-z]{3}-[a-z]{4}-[a-z]{3}$'),
  cohort_id    uuid references public.cohorts (id) on delete set null,
  leased_until timestamptz
);
alter table public.breakout_rooms enable row level security;

create function public.end_breakouts(c uuid) returns void
language plpgsql security definer set search_path to 'public' as $$
begin
  if not private.teaches(c) or not private.not_an_agent() then
    raise exception 'Only a leader of this cohort can do this.';
  end if;
  delete from public.groups where cohort_id = c and breakout;
  update public.breakout_rooms set cohort_id = null, leased_until = null where cohort_id = c;
end;
$$;

-- rooms: an array of arrays of user ids, one array a room. Anyone not in the
-- cohort is left out, whatever the page sent.
create function public.launch_breakouts(session uuid, rooms jsonb) returns integer
language plpgsql security definer set search_path to 'public' as $$
declare
  c uuid;
  n integer := jsonb_array_length(rooms);
  i integer;
  u text;
  g uuid;
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
    -- A lease that ran out: its old room stops pointing at this call.
    delete from public.groups where breakout and meet_url = u;
    update public.breakout_rooms set cohort_id = c, leased_until = now() + interval '4 hours' where url = u;
    insert into public.groups (cohort_id, name, meet_url, breakout)
    values (c, 'Room ' || (i + 1), u, true) returning id into g;
    insert into public.group_members (group_id, user_id)
    select g, m.id from (select (x)::uuid as id from jsonb_array_elements_text(rooms -> i) x) m
     where exists (select 1 from public.enrollments e where e.cohort_id = c and e.user_id = m.id and e.status <> 'left')
        or exists (select 1 from public.call_guests k where k.cohort_id = c and k.user_id = m.id);
  end loop;
  return n;
end;
$$;

revoke all on function public.launch_breakouts(uuid, jsonb), public.end_breakouts(uuid) from public, anon;
grant execute on function public.launch_breakouts(uuid, jsonb), public.end_breakouts(uuid) to authenticated;
