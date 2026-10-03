-- Follow-ups with each student after a session (research/notes/
-- meet-classroom-design.md, Wish 12 and C7). Ben wants to follow up with
-- individual students "based on what they contributed and what was
-- discussed", and DECISIONS.md item 13 asks that anything kept about a
-- student be readable by that student.
--
-- So the teacher writes every word, on /teach/, and the draft lives only
-- in the teacher's browser until they send it. Sending puts it where the
-- student will see it: as feedback on their bring-back (the feedback table
-- already does that), or, when they brought nothing back, as a note here,
-- which only that student and the cohort's teachers can read. This table
-- holds sent words only, never drafts, and never anything an AI wrote in
-- the teacher's name: nothing in the hub writes here but the teacher's own
-- click, and an agent's token cannot write at all.
--
-- How long it is kept. A note belongs to the cohort: it is deleted when
-- the cohort is marked finished, when the student leaves the cohort, and
-- when either person deletes their account.

create table public.teacher_notes (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   uuid not null references public.cohorts (id) on delete cascade,
  student_id  uuid not null references public.profiles (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  session_id  uuid references public.sessions (id) on delete set null,
  body        text not null check (char_length(btrim(body)) between 1 and 8000),
  created_at  timestamptz not null default now()
);
create index teacher_notes_student on public.teacher_notes (cohort_id, student_id, created_at);

-- The student is someone still in the cohort, as a student or mentor.
create function private.still_enrolled(c uuid, person uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.enrollments where cohort_id = c and user_id = person and status <> 'left');
$$;
grant execute on function private.still_enrolled(uuid, uuid) to authenticated;

alter table public.teacher_notes enable row level security;

-- Reading: the student it was sent to, and the cohort's teachers.
create policy teacher_notes_read on public.teacher_notes for select to authenticated
  using (student_id = auth.uid() or private.teaches(cohort_id));

-- Sending: a teacher of the cohort, in their own name, to someone still
-- in it who is not themselves, about a session of that cohort if any.
create policy teacher_notes_send on public.teacher_notes for insert to authenticated
  with check (author_id = auth.uid() and private.teaches(cohort_id)
              and student_id <> auth.uid() and private.still_enrolled(cohort_id, student_id)
              and (session_id is null or private.session_in_cohort(session_id, cohort_id)));

-- There is no update rule: a sent note is not rewritten. Its author may
-- take it back, and the student may remove it from their page, since
-- what is about them is theirs to keep or not.
create policy teacher_notes_take_back on public.teacher_notes for delete to authenticated
  using (author_id = auth.uid() or student_id = auth.uid());

-- A student's agent reads, and never writes (migration 6), and neither
-- does a teacher's.
create policy agents_cannot_insert on public.teacher_notes as restrictive
  for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.teacher_notes as restrictive
  for update to authenticated using (private.not_an_agent());
create policy agents_cannot_delete on public.teacher_notes as restrictive
  for delete to authenticated using (private.not_an_agent());

-- When the cohort is marked finished, its notes go.
create function private.forget_teacher_notes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'finished' and old.status <> 'finished' then
    delete from public.teacher_notes where cohort_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.forget_teacher_notes() from public, anon, authenticated;

create trigger on_cohort_finished_forget_notes
  after update of status on public.cohorts
  for each row execute function private.forget_teacher_notes();

-- When a student leaves the cohort, the notes sent to them there go too.
-- A trigger on the enrollment, rather than another copy of leave_cohort,
-- so it holds however the leaving happens.
create function private.forget_notes_on_leaving() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'left' and old.status <> 'left' then
    delete from public.teacher_notes where cohort_id = new.cohort_id and student_id = new.user_id;
  end if;
  return new;
end;
$$;
revoke all on function private.forget_notes_on_leaving() from public, anon, authenticated;

create trigger enrollments_forget_notes
  after update of status on public.enrollments
  for each row execute function private.forget_notes_on_leaving();
