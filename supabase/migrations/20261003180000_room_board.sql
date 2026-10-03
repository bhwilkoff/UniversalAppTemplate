-- Rooms and the room board (research/notes/meet-classroom-design.md,
-- Wishes 7 and 8, milestone C2; DECISIONS.md, "The classroom on Meet").
--
-- Each group shows its work in a Meet room of its own. The teacher cannot
-- listen to a room without being seen there, and should not, so the
-- teacher's view of the rooms is built from what the groups do on /live/:
-- which step of a turn each group is on and whose turn it is, and
-- whether the group has asked for the teacher. Nothing here is read from
-- Meet, timed, or counted.
--
-- groups.meet_space   The Meet REST API's name for a group's room
--                     ("spaces/abc"), when meet@ made the room through
--                     that API, so its members can be set again later.
--                     Written by the cohort's teachers (groups_write),
--                     with the room's link.
--
-- live_room_state     One row per group per session, made the first time
--                     anyone in the group (or a teacher) moves a step:
--   step       which step of the turn the group is on, by its place in
--              LiveLib.TURN (0 is the builder's question).
--   presenter  whose turn it is (someone in the group), or nobody once
--              every turn is done.
--   help_at    when someone in the group asked for the teacher; cleared
--              when the teacher says they are there, or by the group.
-- Written by the group's members and the cohort's teachers, read by
-- everyone in the cohort (so a student can see that the teacher is with
-- another group), never written by an agent, and deleted when the cohort
-- is marked finished, with the rest of the live session.

-- ---------------------------------------------------------------------
-- A group's room in the Meet REST API
-- ---------------------------------------------------------------------

alter table public.groups
  add column meet_space text check (meet_space is null or meet_space ~ '^spaces/[A-Za-z0-9_-]{1,100}$');

-- ---------------------------------------------------------------------
-- Where each group is
-- ---------------------------------------------------------------------

create table public.live_room_state (
  cohort_id   uuid not null references public.cohorts (id) on delete cascade,
  session_id  uuid not null references public.sessions (id) on delete cascade,
  group_id    uuid not null references public.groups (id) on delete cascade,
  step        smallint not null default 0 check (step between 0 and 19),
  presenter   uuid references public.profiles (id) on delete set null,
  help_at     timestamptz,
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now(),
  primary key (session_id, group_id)
);
create index live_room_state_cohort on public.live_room_state (cohort_id);

-- Someone in the group (and still in the cohort), or one of its teachers.
create function private.in_group(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members gm
    join public.groups gr on gr.id = gm.group_id
    join public.enrollments e on e.cohort_id = gr.cohort_id and e.user_id = gm.user_id
    where gm.group_id = g and gm.user_id = auth.uid() and e.status <> 'left');
$$;
grant execute on function private.in_group(uuid) to authenticated;

create function private.member_of_group(p uuid, g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p is null or exists (select 1 from public.group_members where group_id = g and user_id = p);
$$;
grant execute on function private.member_of_group(uuid, uuid) to authenticated;

-- A row stays with its cohort, session, and group; who changed it and
-- when are the database's to say; and asking for the teacher is stamped
-- with the database's own clock.
create function private.room_state_keep() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' then
    if new.cohort_id <> old.cohort_id or new.session_id <> old.session_id or new.group_id <> old.group_id then
      raise exception 'A room''s place stays with its session and group.';
    end if;
    if new.help_at is not null and old.help_at is null then new.help_at := now();
    elsif new.help_at is not null then new.help_at := old.help_at;
    end if;
  elsif new.help_at is not null then
    new.help_at := now();
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.room_state_keep() from public, anon, authenticated;

create trigger live_room_state_keep before insert or update on public.live_room_state
  for each row execute function private.room_state_keep();

alter table public.live_room_state enable row level security;

create policy live_room_state_read on public.live_room_state for select to authenticated
  using (private.in_cohort(cohort_id));
create policy live_room_state_start on public.live_room_state for insert to authenticated
  with check ((private.in_group(group_id) or private.teaches(cohort_id))
              and private.group_in_cohort(group_id, cohort_id)
              and private.session_in_cohort(session_id, cohort_id)
              and private.member_of_group(presenter, group_id));
create policy live_room_state_move on public.live_room_state for update to authenticated
  using (private.in_group(group_id) or private.teaches(cohort_id))
  with check ((private.in_group(group_id) or private.teaches(cohort_id))
              and private.member_of_group(presenter, group_id));
create policy live_room_state_delete on public.live_room_state for delete to authenticated
  using (private.teaches(cohort_id));

-- An agent reads, and never writes (migration 6), a teacher's included.
create policy agents_cannot_insert on public.live_room_state as restrictive
  for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.live_room_state as restrictive
  for update to authenticated using (private.not_an_agent());
create policy agents_cannot_delete on public.live_room_state as restrictive
  for delete to authenticated using (private.not_an_agent());

-- ---------------------------------------------------------------------
-- Keeping it only as long as the session needs it
-- ---------------------------------------------------------------------

-- Gone when the cohort is marked finished.
create function private.forget_room_state() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'finished' and old.status <> 'finished' then
    delete from public.live_room_state where cohort_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.forget_room_state() from public, anon, authenticated;

create trigger on_cohort_finished_forget_room_state
  after update of status on public.cohorts
  for each row execute function private.forget_room_state();

-- Someone who leaves a group (or the cohort, which takes them out of
-- their group) is no longer named as the one presenting there.
create function private.forget_presenter() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.live_room_state set presenter = null
    where group_id = old.group_id and presenter = old.user_id;
  return old;
end;
$$;
revoke all on function private.forget_presenter() from public, anon, authenticated;

create trigger group_members_forget_presenter
  after delete on public.group_members
  for each row execute function private.forget_presenter();

-- ---------------------------------------------------------------------
-- Live updates through Supabase Realtime, as for the signals: a change
-- is only a nudge to read again. Only on Supabase.
-- ---------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.live_room_state;
  end if;
end $$;
