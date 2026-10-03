-- The teacher's own talk share, and "measuring my talk" for everyone to
-- see (research/notes/meet-classroom-design.md, Wish 4, Wish 11, Wish 13,
-- and milestone C8).
--
-- The session recorder, on the teacher's own computer, can count how
-- much the teacher talks compared with everyone else in the call, from
-- the levels of the teacher's microphone and of the call's mixed audio.
-- It never knows who else spoke, keeps no audio for this, and counts
-- nothing about any student, on purpose (DECISIONS.md, "The classroom on
-- Meet", item 13). At the end of the session the teacher sees the share
-- and chooses to save it or let it go. Saving it puts one number here,
-- the teacher's share for that session, which the cohort can read on
-- /live/ afterwards.
--
-- The recorder cannot sign in to the hub yet, so the teacher saves the
-- number themselves on /live/, and the database checks only that it is
-- a share between 0 and 1, from a teacher of the cohort.
--
-- live_signals gains one kind, "talk": a plain line on every /live/ page
-- while the teacher's recorder is counting, like "recording".

alter table public.live_signals drop constraint live_signals_kind_check;
alter table public.live_signals add constraint live_signals_kind_check
  check (kind in ('rooms', 'together', 'card', 'stage', 'recording', 'talk'));

-- ---------------------------------------------------------------------
-- The saved share, one row per session
-- ---------------------------------------------------------------------

create table public.session_notes (
  session_id          uuid primary key references public.sessions (id) on delete cascade,
  cohort_id           uuid not null references public.cohorts (id) on delete cascade,
  teacher_talk_share  numeric(4, 3) not null check (teacher_talk_share between 0 and 1),
  saved_by            uuid references public.profiles (id) on delete set null,
  saved_at            timestamptz not null default now()
);

-- Who saved it, and when, come from the database; the session and its
-- cohort never change.
create function private.session_note_rules() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and (new.session_id <> old.session_id or new.cohort_id <> old.cohort_id) then
    raise exception 'A session note stays with its session.';
  end if;
  new.saved_by := auth.uid();
  new.saved_at := now();
  return new;
end;
$$;
revoke all on function private.session_note_rules() from public, anon, authenticated;

create trigger session_notes_rules before insert or update on public.session_notes
  for each row execute function private.session_note_rules();

alter table public.session_notes enable row level security;

-- The cohort reads it; only the cohort's teachers save, change, or take
-- it back, for a session of that cohort.
create policy session_notes_read on public.session_notes for select to authenticated
  using (private.in_cohort(cohort_id));
create policy session_notes_save on public.session_notes for insert to authenticated
  with check (private.teaches(cohort_id) and private.session_in_cohort(session_id, cohort_id));
create policy session_notes_change on public.session_notes for update to authenticated
  using (private.teaches(cohort_id)) with check (private.teaches(cohort_id));
create policy session_notes_remove on public.session_notes for delete to authenticated
  using (private.teaches(cohort_id));

-- An agent reads, and never writes (migration 6), a teacher's included.
create policy agents_cannot_insert on public.session_notes as restrictive
  for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.session_notes as restrictive
  for update to authenticated using (private.not_an_agent());
create policy agents_cannot_delete on public.session_notes as restrictive
  for delete to authenticated using (private.not_an_agent());

-- ---------------------------------------------------------------------
-- Keeping it only as long as the session needs it
-- ---------------------------------------------------------------------

-- Gone when the cohort is marked finished, with the rest of the live
-- session.
create function private.forget_session_notes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'finished' and old.status <> 'finished' then
    delete from public.session_notes where cohort_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.forget_session_notes() from public, anon, authenticated;

create trigger on_cohort_finished_forget_session_notes
  after update of status on public.cohorts
  for each row execute function private.forget_session_notes();

-- ---------------------------------------------------------------------
-- Live updates through Supabase Realtime, as for the signals: a change
-- is only a nudge to read again. Only on Supabase.
-- ---------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.session_notes;
  end if;
end $$;
