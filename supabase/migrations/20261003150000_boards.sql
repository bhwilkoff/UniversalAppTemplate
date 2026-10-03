-- The board (research/notes/meet-classroom-design.md, Wish 2 and C4):
-- a drawing space for a live session, made with Excalidraw (MIT) on
-- /board/, that everyone in the cohort draws on at once.
--
-- How it works. Strokes travel between people through a Supabase
-- Realtime broadcast channel named 'board:<board id>', which is private:
-- the rules at the bottom of this file let only the people who can read
-- the board listen and say they are here, and only the people who can
-- draw on it (never an agent) send strokes. What survives the session is this table: each person's
-- page saves the scene every few seconds and when they leave, through
-- save_board(), which merges element by element so that one person's
-- save never erases what someone else drew a moment before.
--
-- Who may do what.
--   The session's board: everyone in the cohort reads it and draws on
--   it, and anyone in the cohort can open it (the first to arrive makes
--   the row).
--   A group's board: the people in that group and the cohort's teachers,
--   and only a teacher makes one.
--   Teachers of the cohort can lock a board (everyone else then looks
--   and downloads but cannot draw), unlock it, clear it, and delete it.
--   A person's own AI agent can read a board they can read, and can
--   never draw, save, lock, clear, or send strokes (migration 6).
--
-- How long it is kept. A board belongs to the session, not to anyone's
-- record. Every board is deleted when the cohort is marked finished, as
-- the queue and checks are (migration 20261003080000), and anyone who
-- can read a board can download it as PNG, SVG, or an .excalidraw file
-- before then. When someone leaves the cohort, what they drew stays on
-- the shared board until the cohort finishes, the way a line on a
-- classroom whiteboard does; it carries no name, because an element
-- does not record who drew it.
--
-- Size. Images cannot be placed on the board (the page turns the tool
-- off), so a scene is shapes, lines, and text. A scene is capped at
-- 2 MB, which is thousands of strokes, and erased elements are dropped
-- a day after they were erased.

create table public.boards (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   uuid not null references public.cohorts (id) on delete cascade,
  session_id  uuid not null references public.sessions (id) on delete cascade,
  -- null for the session's board; a group's own board otherwise.
  group_id    uuid references public.groups (id) on delete cascade,
  scene       jsonb not null default '{"elements": []}'::jsonb
                check (jsonb_typeof(scene -> 'elements') = 'array' and octet_length(scene::text) <= 2000000),
  -- Clearing starts a new generation, so a save or a stroke from before
  -- the clear can never bring the old drawing back.
  generation  integer not null default 0 check (generation >= 0),
  locked      boolean not null default false,
  created_by  uuid references public.profiles (id) on delete set null,
  updated_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique nulls not distinct (session_id, group_id)
);
create index boards_cohort on public.boards (cohort_id);

-- ---------------------------------------------------------------------
-- Who can see a board, and who can draw on it
-- ---------------------------------------------------------------------

create function private.can_see_board(c uuid, g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select private.teaches(c) or (
    case when g is null then private.in_cohort(c)
    else exists (
      select 1 from public.group_members gm
      join public.groups gr on gr.id = gm.group_id
      join public.enrollments e on e.cohort_id = gr.cohort_id and e.user_id = gm.user_id
      where gm.group_id = g and gr.cohort_id = c and gm.user_id = auth.uid() and e.status <> 'left')
    end);
$$;
grant execute on function private.can_see_board(uuid, uuid) to authenticated;

create function private.group_in_cohort(g uuid, c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.groups where id = g and cohort_id = c);
$$;
grant execute on function private.group_in_cohort(uuid, uuid) to authenticated;

-- For the Realtime rules, which know only the channel's name.
create function private.board_from_topic(t text) returns uuid
language sql immutable set search_path = '' as $$
  select case when t ~ '^board:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then substr(t, 7)::uuid end;
$$;
grant execute on function private.board_from_topic(text) to authenticated;

create function private.can_listen_to_board(t text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.boards b
    where b.id = private.board_from_topic(t) and private.can_see_board(b.cohort_id, b.group_id));
$$;
grant execute on function private.can_listen_to_board(text) to authenticated;

create function private.can_draw_on_board(t text) returns boolean
language sql stable security definer set search_path = public as $$
  select private.not_an_agent() and exists (
    select 1 from public.boards b
    where b.id = private.board_from_topic(t) and private.can_see_board(b.cohort_id, b.group_id)
      and (not b.locked or private.teaches(b.cohort_id)));
$$;
grant execute on function private.can_draw_on_board(text) to authenticated;

-- ---------------------------------------------------------------------
-- What can change, and by whom: a board never moves to another cohort,
-- session, or group; only a teacher locks, unlocks, or clears it; and a
-- clear empties the scene and moves to the next generation, one step.
-- ---------------------------------------------------------------------

create function private.board_keep() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.cohort_id <> old.cohort_id or new.session_id <> old.session_id
     or new.group_id is distinct from old.group_id or new.created_by is distinct from old.created_by
     or new.created_at <> old.created_at then
    raise exception 'A board stays with its session and group.';
  end if;
  if (new.locked <> old.locked or new.generation <> old.generation) and not private.teaches(old.cohort_id) then
    raise exception 'Only a teacher of this cohort can lock or clear the board.';
  end if;
  if new.generation <> old.generation then
    if new.generation <> old.generation + 1 or jsonb_array_length(new.scene -> 'elements') <> 0 then
      raise exception 'Clearing a board empties it and starts the next generation.';
    end if;
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
revoke all on function private.board_keep() from public, anon, authenticated;

create trigger boards_keep before update on public.boards
  for each row execute function private.board_keep();

-- ---------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------

alter table public.boards enable row level security;

create policy boards_read on public.boards for select to authenticated
  using (private.can_see_board(cohort_id, group_id));

-- Anyone in the cohort opens the session's board; only a teacher makes a
-- group's board. A board starts empty, unlocked, and at generation 0.
create policy boards_open on public.boards for insert to authenticated
  with check (created_by = auth.uid() and updated_by is null and generation = 0 and not locked
              and jsonb_array_length(scene -> 'elements') = 0
              and private.session_in_cohort(session_id, cohort_id)
              and case when group_id is null then private.in_cohort(cohort_id)
                       else private.teaches(cohort_id) and private.group_in_cohort(group_id, cohort_id) end);

-- Drawing is saving: anyone who can see the board, while it is
-- unlocked; teachers always (to unlock it, or clear it).
create policy boards_draw on public.boards for update to authenticated
  using (private.can_see_board(cohort_id, group_id) and (not locked or private.teaches(cohort_id)))
  with check (private.can_see_board(cohort_id, group_id) and (not locked or private.teaches(cohort_id)));

create policy boards_delete on public.boards for delete to authenticated
  using (private.teaches(cohort_id));

-- A person's agent reads, and never writes (migration 6).
create policy agents_cannot_insert on public.boards as restrictive
  for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.boards as restrictive
  for update to authenticated using (private.not_an_agent());
create policy agents_cannot_delete on public.boards as restrictive
  for delete to authenticated using (private.not_an_agent());

-- ---------------------------------------------------------------------
-- Opening and saving, as the person (security invoker: every rule above
-- applies to these exactly as it does to the page's own requests).
-- ---------------------------------------------------------------------

-- The board for a session (and a group), made if it does not exist yet
-- and the person may make it. Returns nothing if they may not see it.
create function public.open_board(c uuid, s uuid, g uuid default null)
returns setof public.boards
language plpgsql security invoker set search_path = public as $$
begin
  if not exists (select 1 from public.boards where session_id = s and group_id is not distinct from g) then
    begin
      insert into public.boards (cohort_id, session_id, group_id, created_by)
      values (c, s, g, auth.uid())
      on conflict do nothing;
    exception when insufficient_privilege then
      null;  -- not theirs to make (a group's board, before a teacher makes it)
    end;
  end if;
  return query select * from public.boards where session_id = s and group_id is not distinct from g and cohort_id = c;
end;
$$;
revoke all on function public.open_board(uuid, uuid, uuid) from public, anon;
grant execute on function public.open_board(uuid, uuid, uuid) to authenticated;

-- Excalidraw's own rule for two copies of one element
-- (packages/excalidraw/data/reconcile.ts): the higher version wins, and
-- for equal versions the lower versionNonce, so every copy of the page
-- and the database settle on the same element. Erased elements older
-- than a day are dropped. Ordered by Excalidraw's fractional index.
create function private.merge_board_elements(saved jsonb, incoming jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(e order by e ->> 'index' collate "C" nulls last, e ->> 'id'), '[]'::jsonb)
  from (
    select distinct on (e ->> 'id') e
    from (
      select e, 0 as src from jsonb_array_elements(coalesce(saved, '[]'::jsonb)) e
      union all
      select e, 1 from jsonb_array_elements(coalesce(incoming, '[]'::jsonb)) e
    ) x
    where jsonb_typeof(e) = 'object' and coalesce(e ->> 'id', '') <> ''
    order by e ->> 'id',
      case when e ->> 'version' ~ '^\d{1,15}$' then (e ->> 'version')::bigint end desc nulls last,
      case when e ->> 'versionNonce' ~ '^-?\d{1,15}$' then (e ->> 'versionNonce')::bigint end asc nulls last,
      src
  ) y
  where not (coalesce(e ->> 'isDeleted', 'false') = 'true'
             and e ->> 'updated' ~ '^\d{1,15}$'
             and (e ->> 'updated')::bigint < (extract(epoch from now()) * 1000)::bigint - 86400000);
$$;

-- Save what this page has, merged into what is saved. Refused (saved is
-- false) when the board is locked for this person or was cleared since
-- the page loaded it, and the page then reads the board again.
create function public.save_board(b uuid, gen integer, elements jsonb)
returns table (generation integer, saved boolean)
language plpgsql security invoker set search_path = public as $$
declare
  cur public.boards;
begin
  if jsonb_typeof(elements) <> 'array' then
    raise exception 'A board is saved as a list of elements.';
  end if;
  select * into cur from public.boards where id = b for update;
  if not found then
    return query select null::integer, false;
    return;
  end if;
  if cur.generation <> gen then
    return query select cur.generation, false;
    return;
  end if;
  update public.boards
    set scene = jsonb_build_object('elements', private.merge_board_elements(cur.scene -> 'elements', elements))
    where id = b;
  return query select cur.generation, true;
end;
$$;
revoke all on function public.save_board(uuid, integer, jsonb) from public, anon;
grant execute on function public.save_board(uuid, integer, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- Kept only as long as the cohort runs
-- ---------------------------------------------------------------------

create function private.forget_boards() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'finished' and old.status <> 'finished' then
    delete from public.boards where cohort_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.forget_boards() from public, anon, authenticated;

create trigger on_cohort_finished_forget_boards
  after update of status on public.cohorts
  for each row execute function private.forget_boards();

-- ---------------------------------------------------------------------
-- The live strokes: Realtime Authorization on private channels
-- (supabase.com/docs/guides/realtime/authorization, read October 3,
-- 2026). A channel joined with private: true is checked against these
-- rules on realtime.messages when the person joins, and the answer is
-- kept for that connection. A private channel never shares messages
-- with a public channel of the same name, so a page that joins
-- 'board:<id>' without private: true hears nothing from the board.
-- Each rule names only 'board:' channels, so it changes nothing for any
-- other channel. Only on Supabase (the local test database stands in
-- for this table in supabase/tests/test_policies.py).
-- ---------------------------------------------------------------------

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'realtime' and table_name = 'messages') then
    execute $p$
      create policy boards_listen on realtime.messages for select to authenticated
        using (extension in ('broadcast', 'presence')
               and (select realtime.topic()) like 'board:%'
               and private.can_listen_to_board((select realtime.topic())))
    $p$;
    execute $p$
      create policy boards_send on realtime.messages for insert to authenticated
        with check ((select realtime.topic()) like 'board:%'
                    and case extension
                          when 'broadcast' then private.can_draw_on_board((select realtime.topic()))
                          when 'presence' then private.not_an_agent() and private.can_listen_to_board((select realtime.topic()))
                          else false end)
    $p$;
  end if;
end $$;
