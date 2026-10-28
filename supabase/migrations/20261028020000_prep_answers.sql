-- Work learners do before a session, handed in on that session's page
-- (Ben, October 28, 2026: "Anything we ask for as prep work for week 1
-- ... should be something that the cohort members can submit on the week
-- 1 page. Let's be clear about the questions we are asking and make them
-- as simple as possible"). A session carries its own short list of
-- questions, one idea each; each learner answers them privately, and the
-- cohort's leaders read every answer before the session.

alter table public.sessions add column prep_questions jsonb
  check (prep_questions is null or (jsonb_typeof(prep_questions) = 'array' and jsonb_array_length(prep_questions) <= 6));

create table public.prep_answers (
  session_id  uuid not null references public.sessions (id) on delete cascade,
  cohort_id   uuid not null references public.cohorts (id) on delete cascade,
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  question_id text not null check (question_id ~ '^[a-z0-9-]{1,40}$'),
  body        text not null check (char_length(btrim(body)) between 1 and 4000),
  updated_at  timestamptz not null default now(),
  primary key (session_id, user_id, question_id)
);

-- The cohort a row names must be its session's.
create function private.prep_answer_cohort() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.sessions s where s.id = new.session_id and s.cohort_id = new.cohort_id) then
    raise exception 'That session is not in that cohort.';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger prep_answer_cohort before insert or update on public.prep_answers
  for each row execute function private.prep_answer_cohort();

alter table public.prep_answers enable row level security;

create policy prep_answers_read on public.prep_answers for select to authenticated
  using (user_id = auth.uid() or private.teaches(cohort_id));
create policy prep_answers_write on public.prep_answers for insert to authenticated
  with check (user_id = auth.uid() and private.in_cohort(cohort_id));
create policy prep_answers_change on public.prep_answers for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and private.in_cohort(cohort_id));
create policy prep_answers_remove on public.prep_answers for delete to authenticated
  using (user_id = auth.uid());

create policy agents_cannot_insert on public.prep_answers as restrictive for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.prep_answers as restrictive for update to authenticated using (private.not_an_agent());
create policy agents_cannot_delete on public.prep_answers as restrictive for delete to authenticated using (private.not_an_agent());

grant select, insert, update, delete on public.prep_answers to authenticated;
