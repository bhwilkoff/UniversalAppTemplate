-- The run of show (research/notes/run-of-show-design.md, milestone R2):
-- each session's plan, prepared by its teachers on the class page and
-- run in Meet. A run of show is the session's scenes in order, each of
-- one kind, with its minutes, its title, the words the main stage shows,
-- and a little configuration that depends on the kind.
--
-- The cohort reads the scenes, so students can see the shape of the next
-- session on /cohort/. A teacher's private notes for a scene live in
-- their own table, because row-level security cannot hide one column
-- from students.
--
-- Scenes are the teachers' own plan and hold nothing about any student,
-- so they stay when the cohort finishes (unlike the live session's
-- answers and signals), and a later cohort can copy them. They go with
-- their session.

create table public.scenes (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   uuid not null references public.cohorts (id) on delete cascade,
  session_id  uuid not null references public.sessions (id) on delete cascade,
  position    int not null check (position >= 0),
  kind        text not null check (kind in ('talk', 'presenter', 'question', 'design', 'rooms', 'break', 'reflection')),
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  minutes     int not null check (minutes between 1 and 240),
  body        text check (body is null or char_length(body) <= 2000),
  config      jsonb not null default '{}'::jsonb,
  created_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now(),
  -- Checked at the end of each statement rather than row by row, so
  -- reordering a whole run of show in one statement never trips over two
  -- scenes briefly sharing a place.
  constraint scenes_one_place unique (session_id, position) deferrable initially immediate
);
create index scenes_by_session on public.scenes (session_id, position);
create index scenes_by_cohort on public.scenes (cohort_id);

-- What each kind may carry in config. Anything else is refused, so a
-- typo or a half-built feature cannot leave the main stage something it
-- does not know how to show.
--   talk, break:  nothing.
--   presenter:    prompt (what the audience does), at most 500 characters.
--   question:     prompt and, for a choice, options (2 to 8 short strings).
--   design:       template, a short name (the design stage: the shared
--                 board on the main stage).
--   rooms:        prompt, and room_scenes: the room's own scenes, each
--                 { title, minutes }, at most 12.
--   reflection:   prompt.
create function private.scene_config_ok(k text, c jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  allowed text[];
  key text;
  item jsonb;
begin
  if c is null or jsonb_typeof(c) <> 'object' then return false; end if;
  if pg_column_size(c) > 8000 then return false; end if;
  allowed := case k
    when 'talk' then array[]::text[]
    when 'break' then array[]::text[]
    when 'presenter' then array['prompt']
    when 'question' then array['prompt', 'options']
    when 'design' then array['template']
    when 'rooms' then array['prompt', 'room_scenes']
    when 'reflection' then array['prompt']
    else null end;
  if allowed is null then return false; end if;
  for key in select jsonb_object_keys(c) loop
    if not key = any (allowed) then return false; end if;
  end loop;
  if c ? 'prompt' and (jsonb_typeof(c->'prompt') <> 'string' or char_length(c->>'prompt') > 500) then return false; end if;
  if c ? 'template' and (jsonb_typeof(c->'template') <> 'string' or char_length(c->>'template') > 60) then return false; end if;
  if c ? 'options' then
    if jsonb_typeof(c->'options') <> 'array' or jsonb_array_length(c->'options') not between 2 and 8 then return false; end if;
    for item in select jsonb_array_elements(c->'options') loop
      if jsonb_typeof(item) <> 'string' or char_length(item #>> '{}') not between 1 and 120 then return false; end if;
    end loop;
  end if;
  if c ? 'room_scenes' then
    if jsonb_typeof(c->'room_scenes') <> 'array' or jsonb_array_length(c->'room_scenes') > 12 then return false; end if;
    for item in select jsonb_array_elements(c->'room_scenes') loop
      if jsonb_typeof(item) <> 'object'
         or coalesce(jsonb_typeof(item->'title'), '') <> 'string'
         or coalesce(jsonb_typeof(item->'minutes'), '') <> 'number'
         or char_length(item->>'title') not between 1 and 120
         or (item->>'minutes')::numeric not between 1 and 120
         or exists (select 1 from jsonb_object_keys(item) x where x not in ('title', 'minutes')) then
        return false;
      end if;
    end loop;
  end if;
  return true;
end;
$$;
grant execute on function private.scene_config_ok(text, jsonb) to authenticated;

alter table public.scenes add constraint scenes_config_fits check (private.scene_config_ok(kind, config));

-- A scene stays in its session and cohort; who made it and when it last
-- changed come from the database.
create function private.scene_rules() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  elsif new.session_id <> old.session_id or new.cohort_id <> old.cohort_id
        or new.created_by is distinct from old.created_by then
    raise exception 'A scene stays in its own session.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.scene_rules() from public, anon, authenticated;

create trigger scenes_rules before insert or update on public.scenes
  for each row execute function private.scene_rules();

alter table public.scenes enable row level security;

-- The cohort reads the run of show; only its teachers make, change, or
-- remove scenes, and only in a session of that cohort.
create policy scenes_read on public.scenes for select to authenticated
  using (private.in_cohort(cohort_id));
create policy scenes_add on public.scenes for insert to authenticated
  with check (private.teaches(cohort_id) and private.session_in_cohort(session_id, cohort_id));
create policy scenes_change on public.scenes for update to authenticated
  using (private.teaches(cohort_id)) with check (private.teaches(cohort_id));
create policy scenes_remove on public.scenes for delete to authenticated
  using (private.teaches(cohort_id));

-- An agent reads, and never writes (migration 6), a teacher's included.
create policy agents_cannot_insert on public.scenes as restrictive
  for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.scenes as restrictive
  for update to authenticated using (private.not_an_agent());
create policy agents_cannot_delete on public.scenes as restrictive
  for delete to authenticated using (private.not_an_agent());

-- ---------------------------------------------------------------------
-- The teacher's own notes for a scene, read by teachers only
-- ---------------------------------------------------------------------

create table public.scene_notes (
  scene_id    uuid primary key references public.scenes (id) on delete cascade,
  cohort_id   uuid not null references public.cohorts (id) on delete cascade,
  body        text not null check (char_length(body) <= 4000),
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);

create function private.scene_in_cohort(s uuid, c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.scenes where id = s and cohort_id = c);
$$;
grant execute on function private.scene_in_cohort(uuid, uuid) to authenticated;

create function private.scene_note_rules() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.scene_id <> old.scene_id or new.cohort_id <> old.cohort_id) then
    raise exception 'A note stays with its scene.';
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.scene_note_rules() from public, anon, authenticated;

create trigger scene_notes_rules before insert or update on public.scene_notes
  for each row execute function private.scene_note_rules();

alter table public.scene_notes enable row level security;

create policy scene_notes_read on public.scene_notes for select to authenticated
  using (private.teaches(cohort_id));
create policy scene_notes_write on public.scene_notes for insert to authenticated
  with check (private.teaches(cohort_id) and private.scene_in_cohort(scene_id, cohort_id));
create policy scene_notes_change on public.scene_notes for update to authenticated
  using (private.teaches(cohort_id)) with check (private.teaches(cohort_id));
create policy scene_notes_remove on public.scene_notes for delete to authenticated
  using (private.teaches(cohort_id));

create policy agents_cannot_insert on public.scene_notes as restrictive
  for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.scene_notes as restrictive
  for update to authenticated using (private.not_an_agent());
create policy agents_cannot_delete on public.scene_notes as restrictive
  for delete to authenticated using (private.not_an_agent());

-- ---------------------------------------------------------------------
-- Moving a whole run of show at once
-- ---------------------------------------------------------------------

-- Put a session's scenes in the order given. The list must be exactly
-- that session's scenes, each once; anything else is refused, so two
-- teachers editing at once cannot lose a scene.
create function public.reorder_scenes(s uuid, ids uuid[]) returns void
language plpgsql security definer set search_path = public as $$
declare
  c uuid;
begin
  if not private.not_an_agent() then raise exception 'An agent can read the run of show but not change it.'; end if;
  select cohort_id into c from public.sessions where id = s;
  if c is null or not private.teaches(c) then raise exception 'Only a teacher of this cohort can reorder its scenes.'; end if;
  if (select count(*) from unnest(ids)) <> (select count(distinct x) from unnest(ids) x)
     or (select count(*) from public.scenes where session_id = s) <> coalesce(array_length(ids, 1), 0)
     or exists (select 1 from unnest(ids) x where not exists (select 1 from public.scenes where id = x and session_id = s)) then
    raise exception 'The run of show changed while you were moving it. Read it again and try once more.';
  end if;
  update public.scenes sc set position = o.n - 1
    from unnest(ids) with ordinality as o(id, n)
    where sc.id = o.id;
end;
$$;
revoke all on function public.reorder_scenes(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_scenes(uuid, uuid[]) to authenticated;

-- Copy one session's run of show into another that has none yet, with
-- the teacher's notes. The caller must teach both sessions' cohorts, so
-- a teacher can copy last week, or a run of show from an earlier cohort
-- of their own.
create function public.copy_scenes(from_session uuid, to_session uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  from_c uuid;
  to_c uuid;
  n int;
begin
  if not private.not_an_agent() then raise exception 'An agent can read the run of show but not change it.'; end if;
  select cohort_id into from_c from public.sessions where id = from_session;
  select cohort_id into to_c from public.sessions where id = to_session;
  if from_c is null or to_c is null or not private.teaches(from_c) or not private.teaches(to_c) then
    raise exception 'Only a teacher of both sessions can copy a run of show.';
  end if;
  if from_session = to_session then raise exception 'Choose another session to copy from.'; end if;
  if exists (select 1 from public.scenes where session_id = to_session) then
    raise exception 'This session already has a run of show. Remove its scenes first to copy another.';
  end if;
  with copied as (
    insert into public.scenes (cohort_id, session_id, position, kind, title, minutes, body, config)
    select to_c, to_session, position, kind, title, minutes, body, config
      from public.scenes where session_id = from_session
    returning id, position
  ), notes as (
    insert into public.scene_notes (scene_id, cohort_id, body)
    select c.id, to_c, sn.body
      from copied c
      join public.scenes old on old.session_id = from_session and old.position = c.position
      join public.scene_notes sn on sn.scene_id = old.id
    returning 1
  )
  select count(*) into n from copied;
  return n;
end;
$$;
revoke all on function public.copy_scenes(uuid, uuid) from public, anon;
grant execute on function public.copy_scenes(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Live updates through Supabase Realtime: a change is a nudge to read
-- again, so a scene edited on the class page shows in the run of show
-- wherever it is open. Only on Supabase.
-- ---------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.scenes;
  end if;
end $$;
