-- Recognition for a skill shown in class (R16;
-- research/notes/active-learning-notes.md). Ben asked for "the ability
-- for a teacher to award specific badges or credentials for demonstrating
-- skills within the live class." The Active Learning Forum anchors every
-- piece of feedback to the moment it is about; this does the same, and
-- leaves out what would make it a score.
--
-- A teacher names one skill a student just showed (from the short list
-- in assets/recognition-lib.js, tied to the principles, or in their own
-- words) and the moment it happened. Only the student and the cohort's
-- teachers read it: no one else sees, counts, or compares anyone's
-- recognitions. It belongs to the student, so it outlasts the cohort
-- (it goes only when the student's account does), and the student can
-- remove it. It can be named in the evidence of their credential.

create table public.recognitions (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   uuid not null references public.cohorts (id) on delete cascade,
  session_id  uuid references public.sessions (id) on delete set null,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  skill       text not null check (char_length(skill) between 1 and 120),
  skill_key   text check (skill_key is null or skill_key ~ '^[a-z][a-z-]{1,39}$'),
  moment      text check (moment is null or char_length(moment) <= 300),
  given_by    uuid references public.profiles (id) on delete set null,
  given_at    timestamptz not null default now()
);
create index recognitions_by_person on public.recognitions (user_id, given_at desc);
create index recognitions_by_cohort on public.recognitions (cohort_id);

-- Who gave it, and when, come from the database; nothing about it
-- changes after it is given.
create function private.recognition_rules() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.given_by := auth.uid();
  new.given_at := now();
  return new;
end;
$$;
revoke all on function private.recognition_rules() from public, anon, authenticated;
create trigger recognitions_rules before insert on public.recognitions
  for each row execute function private.recognition_rules();

alter table public.recognitions enable row level security;

-- The student and the cohort's teachers read it. Only a teacher of the
-- cohort gives it, to someone in that cohort, for one of its sessions.
-- The student, or a teacher, can take it back. No one changes it.
create policy recognitions_read on public.recognitions for select to authenticated
  using (user_id = auth.uid() or private.teaches(cohort_id));
create policy recognitions_give on public.recognitions for insert to authenticated
  with check (private.teaches(cohort_id) and user_id <> auth.uid()
              and private.still_enrolled(cohort_id, user_id)
              and (session_id is null or private.session_in_cohort(session_id, cohort_id)));
create policy recognitions_remove on public.recognitions for delete to authenticated
  using (user_id = auth.uid() or private.teaches(cohort_id));

create policy agents_cannot_insert on public.recognitions as restrictive
  for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_delete on public.recognitions as restrictive
  for delete to authenticated using (private.not_an_agent());

grant select, insert, delete on public.recognitions to authenticated;
