-- Running the show (research/notes/run-of-show-design.md, milestone R3;
-- DECISIONS.md, "The live classroom, after the first test call"). Ben,
-- after the first test call: "I don't like that I cannot edit things
-- within the sidebar to display on the main stage."
--
-- show_state is the one thing every view and every main stage follows
-- during a session: which scene of the run of show is happening now,
-- when its clock started, and what the main stage shows. A teacher moves
-- the show from the Meet add-on's panel or /live/, and every open panel,
-- /live/ page, and main stage in the cohort follows within a second
-- through Supabase Realtime, or by polling if Realtime cannot connect.
--
--   current_scene     The scene happening now: a scene's id (the scenes
--                     table, R2), or, for a session with no run of show
--                     of its own, the key of one of COURSE.md's six parts
--                     (CohortLib.agenda). Null before the show begins.
--   scene_started_at  When the current scene's clock started. The
--                     database sets it whenever the scene changes, and
--                     when a teacher restarts the clock, so every view
--                     counts down from the same moment; null when the
--                     teacher stops the clock.
--   stage             What the main stage shows: 'scene' follows the
--                     current scene (the default, and where moving to a
--                     new scene always returns it); 'welcome', 'answers'
--                     (a question, stage_ref a live_checks row of this
--                     session), 'presenter' (someone's work from the
--                     wings, stage_ref a live_queue row of this session),
--                     or 'blank' are the teacher pinning something else.
--
-- It holds nothing about a student beyond what the cohort already sees
-- (a pinned question, or a piece of work its owner put in the wings), and
-- it is deleted when the cohort is marked finished, with the rest of the
-- live session.

create table public.show_state (
  session_id        uuid primary key references public.sessions (id) on delete cascade,
  cohort_id         uuid not null references public.cohorts (id) on delete cascade,
  current_scene     text check (current_scene is null or char_length(current_scene) between 1 and 64),
  scene_started_at  timestamptz,
  stage             text not null default 'scene' check (stage in ('scene', 'welcome', 'answers', 'presenter', 'blank')),
  stage_ref         uuid,
  updated_by        uuid references public.profiles (id) on delete set null,
  updated_at        timestamptz not null default now(),
  -- Only a pinned question or presenter names what it pins.
  constraint show_state_ref check ((stage in ('answers', 'presenter')) = (stage_ref is not null))
);
create index show_state_by_cohort on public.show_state (cohort_id);

-- The clock comes from the database's own time, so every view agrees; a
-- show stays in its session; a pin names something of this session; and
-- who moved it last, and when, come from the database.
create function private.show_state_rules() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.session_id <> old.session_id or new.cohort_id <> old.cohort_id) then
    raise exception 'The show stays with its own session.';
  end if;
  if tg_op = 'INSERT' or new.current_scene is distinct from old.current_scene then
    new.scene_started_at := case when new.current_scene is null then null else now() end;
  elsif new.scene_started_at is distinct from old.scene_started_at and new.scene_started_at is not null then
    new.scene_started_at := now();
  end if;
  if new.stage = 'answers' and not exists (
       select 1 from public.live_checks k where k.id = new.stage_ref and k.session_id = new.session_id) then
    raise exception 'Only a question asked in this session can go on its main stage.';
  end if;
  if new.stage = 'presenter' and not exists (
       select 1 from public.live_queue q where q.id = new.stage_ref and q.session_id = new.session_id) then
    raise exception 'Only work in this session''s wings can go on its main stage.';
  end if;
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.show_state_rules() from public, anon, authenticated;

create trigger show_state_rules before insert or update on public.show_state
  for each row execute function private.show_state_rules();

alter table public.show_state enable row level security;

-- The cohort follows the show; only its teachers run it, in one of the
-- cohort's own sessions.
create policy show_state_read on public.show_state for select to authenticated
  using (private.in_cohort(cohort_id));
create policy show_state_start on public.show_state for insert to authenticated
  with check (private.teaches(cohort_id) and private.session_in_cohort(session_id, cohort_id));
create policy show_state_move on public.show_state for update to authenticated
  using (private.teaches(cohort_id)) with check (private.teaches(cohort_id));
create policy show_state_end on public.show_state for delete to authenticated
  using (private.teaches(cohort_id));

-- An agent reads, and never writes (migration 6), a teacher's included.
create policy agents_cannot_insert on public.show_state as restrictive
  for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.show_state as restrictive
  for update to authenticated using (private.not_an_agent());
create policy agents_cannot_delete on public.show_state as restrictive
  for delete to authenticated using (private.not_an_agent());

-- ---------------------------------------------------------------------
-- Keeping it only as long as the session needs it
-- ---------------------------------------------------------------------

create function private.forget_show_state() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'finished' and old.status <> 'finished' then
    delete from public.show_state where cohort_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.forget_show_state() from public, anon, authenticated;

create trigger on_cohort_finished_forget_show_state
  after update of status on public.cohorts
  for each row execute function private.forget_show_state();

-- ---------------------------------------------------------------------
-- Live updates through Supabase Realtime: a change is a nudge to read
-- again. Only on Supabase.
-- ---------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.show_state;
  end if;
end $$;
