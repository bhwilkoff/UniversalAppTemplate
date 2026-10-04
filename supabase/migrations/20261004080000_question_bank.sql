-- The question bank (research/notes/run-of-show-design.md, milestone R4).
-- A teacher prepares questions on the class page, keeps them in a bank,
-- and asks them in the moment from the Meet add-on's panel or /live/,
-- where each person answers in their own view and the teacher may put
-- the anonymous results on the main stage.
--
-- Six kinds of question:
--   choice  choose one of two to eight choices
--   multi   choose any of two to eight choices
--   short   answer in your own words (a sentence or a few)
--   scale   choose a point on a scale of three to ten, with words for
--           its two ends if the teacher wants them
--   words   a word or a few, shown together as a cloud
--   rank    put two to eight choices in order
--
-- The design note sketched options as jsonb. They are kept the way
-- live_checks already keeps them instead: choices as text[] (the choices
-- of choice, multi, and rank, or a scale's two ends) and points for a
-- scale's size, so a question in the bank and a question asked in the
-- moment have one shape.
--
-- questions     The bank. A question is the teacher's own (cohort_id
--               null, read by them alone) or a cohort's (read and changed
--               by that cohort's teachers). Students never read the bank:
--               they see a question when it is asked. Questions hold
--               nothing about any student, so they stay when a cohort
--               finishes, for the next cohort.
-- live_checks   gains kind, points, and question_id (the bank question
--               it was asked from, if any). What is asked is a copy, so
--               editing it in the moment never changes the bank. It can
--               be edited until the first answer; after that, close it
--               and ask another, as before, so an answer always answers
--               the question it was given.
-- live_answers  gains value, for the kinds whose answer is a list: the
--               choices picked (multi) or the choices in order (rank).
--               A scale's point goes in choice, and a few words in body.
--
-- Never graded, as before: no correct answer, no score.

-- ---------------------------------------------------------------------
-- The shape every question must have, in the bank and when asked
-- ---------------------------------------------------------------------

create function private.question_shape_ok(k text, choices text[], points smallint) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(case
    when k in ('choice', 'multi', 'rank') then
      points is null and choices is not null and cardinality(choices) between 2 and 8
      and array_position(choices, null) is null
      and not exists (select 1 from unnest(choices) c where char_length(btrim(c)) not between 1 and 120)
    when k in ('short', 'words') then choices is null and points is null
    when k = 'scale' then
      points between 3 and 10
      and (choices is null or (cardinality(choices) = 2 and array_position(choices, null) is null
           and not exists (select 1 from unnest(choices) c where char_length(btrim(c)) not between 1 and 60)))
    else false
  end, false);
$$;
grant execute on function private.question_shape_ok(text, text[], smallint) to authenticated;

-- ---------------------------------------------------------------------
-- The bank
-- ---------------------------------------------------------------------

create table public.questions (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  cohort_id   uuid references public.cohorts (id) on delete cascade,
  kind        text not null check (kind in ('choice', 'multi', 'short', 'scale', 'words', 'rank')),
  prompt      text not null check (char_length(btrim(prompt)) between 1 and 500),
  choices     text[],
  points      smallint,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint questions_shape check (private.question_shape_ok(kind, choices, points))
);
create index questions_by_owner on public.questions (owner_id);
create index questions_by_cohort on public.questions (cohort_id);

-- Who made a question comes from the database and never changes.
create function private.question_rules() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.owner_id := auth.uid();
  elsif new.owner_id <> old.owner_id then
    raise exception 'A question stays with the teacher who wrote it.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.question_rules() from public, anon, authenticated;

create trigger questions_rules before insert or update on public.questions
  for each row execute function private.question_rules();

alter table public.questions enable row level security;

-- A teacher's own questions are theirs alone; a cohort's questions are
-- its teachers'. A question moves between the two only in the hands of
-- someone who may hold it in both places.
create policy questions_read on public.questions for select to authenticated
  using (owner_id = auth.uid() or (cohort_id is not null and private.teaches(cohort_id)));
create policy questions_add on public.questions for insert to authenticated
  with check (private.is_hub_teacher() and owner_id = auth.uid()
              and (cohort_id is null or private.teaches(cohort_id)));
create policy questions_change on public.questions for update to authenticated
  using (owner_id = auth.uid() or (cohort_id is not null and private.teaches(cohort_id)))
  with check ((cohort_id is null and owner_id = auth.uid()) or (cohort_id is not null and private.teaches(cohort_id)));
create policy questions_remove on public.questions for delete to authenticated
  using (owner_id = auth.uid() or (cohort_id is not null and private.teaches(cohort_id)));

-- An agent reads, and never writes (migration 6), a teacher's included.
create policy agents_cannot_insert on public.questions as restrictive
  for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.questions as restrictive
  for update to authenticated using (private.not_an_agent());
create policy agents_cannot_delete on public.questions as restrictive
  for delete to authenticated using (private.not_an_agent());

-- The kinds themselves, on the questions asked and the answers given,
-- are in migration 20261004080100.
