-- Notes to students are the student's to keep (DECISIONS.md, "Notes to
-- students", October 3): Ben, "Students should be able to keep notes
-- afterwards. They should be able to remove notes if they wish. And
-- notes should be editable for typos and other corrections."
--
-- So a teacher's note is no longer deleted when the cohort finishes or
-- the student leaves (the student reads it on /account/ from then on),
-- the student can still remove any note, and the person who wrote a
-- note can correct its words. An edited note records when, so the
-- student can see it changed. Feedback on a bring-back (the other way a
-- follow-up is sent) gets the same correction rule.

drop trigger if exists on_cohort_finished_forget_notes on public.cohorts;
drop trigger if exists enrollments_forget_notes on public.enrollments;
drop function if exists private.forget_teacher_notes();
drop function if exists private.forget_notes_on_leaving();

alter table public.teacher_notes add column edited_at timestamptz;
alter table public.feedback add column edited_at timestamptz;

-- Only the words change; who wrote it, to whom, and when stay as they were.
create function private.keep_note_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'teacher_notes' then
    if new.cohort_id <> old.cohort_id or new.student_id <> old.student_id or new.author_id <> old.author_id
       or new.session_id is distinct from old.session_id or new.created_at <> old.created_at then
      raise exception 'Only the words of a note can be corrected.';
    end if;
  else
    if new.share_id <> old.share_id or new.author_id <> old.author_id or new.created_at <> old.created_at then
      raise exception 'Only the words of feedback can be corrected.';
    end if;
  end if;
  if new.body is distinct from old.body then
    new.edited_at := now();
  else
    new.edited_at := old.edited_at;
  end if;
  return new;
end;
$$;
revoke all on function private.keep_note_identity() from public, anon, authenticated;

create trigger teacher_notes_keep_identity before update on public.teacher_notes
  for each row execute function private.keep_note_identity();
create trigger feedback_keep_identity before update on public.feedback
  for each row execute function private.keep_note_identity();

create policy teacher_notes_correct on public.teacher_notes for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy feedback_correct on public.feedback for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
