-- Marks on the path (LOOP-PLAN.md, G3): a person's own marks on a
-- stage of the human-shaped path, kept with their account so they follow
-- them from one browser to the next. A mark is one of:
--
--   step-N   done:     they did step N of "Working with your agent"
--   ready    ready or not-yet: their own answer to the stage's "When you
--            are ready to move on" bar
--   note     kept:     what they would bring back, kept privately when
--            they are not in a cohort to bring it to
--
-- Nobody else reads them: not a teacher, not a classmate, and nothing
-- counts or compares them (DECISIONS.md, no points or streaks). Signed
-- out, the same marks live only in the browser (assets/path-lib.js).
-- They go when the account goes, through the cascade from profiles.

create table public.stage_marks (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  stage      text not null check (stage ~ '^(setup|0[0-8])$'),
  item       text not null check (item ~ '^(step-[1-9][0-9]?|ready|note)$'),
  state      text not null check (state in ('done', 'ready', 'not-yet', 'kept')),
  note       text check (note is null or char_length(note) <= 4000),
  updated_at timestamptz not null default now(),
  primary key (user_id, stage, item),
  -- Each kind of mark has its own states, and only a note has words.
  check (
    (item like 'step-%' and state = 'done' and note is null) or
    (item = 'ready' and state in ('ready', 'not-yet') and note is null) or
    (item = 'note' and state = 'kept' and note is not null and char_length(btrim(note)) > 0)
  )
);

alter table public.stage_marks enable row level security;

-- Only the person whose marks they are reads or writes them.
create policy stage_marks_read on public.stage_marks for select to authenticated
  using (user_id = auth.uid());
create policy stage_marks_add on public.stage_marks for insert to authenticated
  with check (user_id = auth.uid());
create policy stage_marks_change on public.stage_marks for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy stage_marks_remove on public.stage_marks for delete to authenticated
  using (user_id = auth.uid());

-- A person's own agent may read their marks, and never writes them
-- (migration 6).
create policy agents_cannot_insert on public.stage_marks as restrictive
  for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.stage_marks as restrictive
  for update to authenticated using (private.not_an_agent());
create policy agents_cannot_delete on public.stage_marks as restrictive
  for delete to authenticated using (private.not_an_agent());

-- The time is the database's, so a mark carried in from a browser with
-- a wrong clock still sorts truly.
create function private.stamp_stage_mark() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.stamp_stage_mark() from public, anon, authenticated;

create trigger stage_marks_stamp before insert or update on public.stage_marks
  for each row execute function private.stamp_stage_mark();
