-- The five teaching tools Ben adopted from the research (DECISIONS.md,
-- "Teaching, agents, and events"; research/notes/
-- facilitation-assessment-social-learning-notes.md, Part 7). Four of
-- them need something stored; the fifth (the teachers-only "not seen
-- this week" list on /teach/) is worked out on the teacher's page from
-- what the teacher can already read, and stores nothing at all.
--
-- 1. A room for each group. groups.meet_url: the group's own Meet link,
--    pasted by the teacher (or made by tools/meet-events), because Meet
--    on Workspace for Education Fundamentals has no breakout rooms.
-- 2. Closing the loop on checks. sessions.heard: one field per session,
--    "what I heard, and what changes", written by a teacher after reading
--    that session's checks, and shown at the start of the next one.
-- 3. The trio protocol. shares.want_to_know: the builder's own question,
--    written on their bring-back before the session, which opens their
--    turn in the group.
-- 4. Ready or not yet. shares.readiness and shares.missing: the builder
--    marks their bring-back against the stage's "When you are ready to
--    move on" bar (ready, or not yet and what is missing), and
--    share_confirmations holds a partner's "I saw it working on a
--    device". It is never a score: there is no number anywhere here,
--    nothing is counted for anyone, and changing the mark is free.
--
-- What is never built (the notes' "Do not build"): points, streaks,
-- leaderboards, like counts, attendance or camera tracking, scored
-- quizzes, AI summaries or grading of students, automatic partner
-- rotation, or a second chat space.

-- ---------------------------------------------------------------------
-- 1. A room for each group
-- ---------------------------------------------------------------------

-- Readable by the cohort (groups_read), written only by its teachers
-- (groups_write), like the rest of the group.
alter table public.groups
  add column meet_url text check (meet_url is null or (meet_url ~ '^https://' and char_length(meet_url) <= 500));

-- ---------------------------------------------------------------------
-- 2. What I heard, and what changes
-- ---------------------------------------------------------------------

-- Readable by the cohort (sessions_read), written only by its teachers
-- (sessions_write). It is the teacher's own words to the cohort, never
-- a summary of anyone's answers by name.
alter table public.sessions
  add column heard text check (heard is null or char_length(heard) between 1 and 2000);

-- ---------------------------------------------------------------------
-- 3 and 4. The builder's question, and ready or not yet
-- ---------------------------------------------------------------------

-- Only the person who shared can change these (shares_update_own), and
-- only a bring-back carries them. "Not yet" always says what is missing,
-- so that it reads as the next step rather than as a verdict.
alter table public.shares
  add column want_to_know text check (want_to_know is null or char_length(btrim(want_to_know)) between 1 and 300),
  add column readiness text check (readiness is null or readiness in ('ready', 'not-yet')),
  add column missing text,
  add constraint shares_missing_says_what check (
    case when readiness = 'not-yet' then missing is not null and char_length(btrim(missing)) between 1 and 1000
         else missing is null end),
  add constraint shares_bring_back_only check (
    kind = 'bring-back' or (want_to_know is null and readiness is null));

-- A partner's "I saw it working on a device", on a bring-back its builder
-- marked ready. Its own row, because a partner can never change someone
-- else's share. Who may confirm: someone in a group with the builder in
-- this cohort, or one of the cohort's teachers, and never the builder.
create table public.share_confirmations (
  share_id    uuid not null references public.shares (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  cohort_id   uuid not null references public.cohorts (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (share_id, user_id)
);

create function private.can_confirm(s uuid, c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.shares sh
    where sh.id = s and sh.cohort_id = c
      and sh.kind = 'bring-back' and sh.readiness = 'ready'
      and sh.user_id <> auth.uid()
      and (private.teaches(c) or exists (
        select 1
        from public.group_members mine
        join public.group_members theirs on theirs.group_id = mine.group_id
        join public.groups g on g.id = mine.group_id
        where g.cohort_id = c and mine.user_id = auth.uid() and theirs.user_id = sh.user_id))
  );
$$;
grant execute on function private.can_confirm(uuid, uuid) to authenticated;

alter table public.share_confirmations enable row level security;

create policy share_confirmations_read on public.share_confirmations for select to authenticated
  using (private.in_cohort(cohort_id));
create policy share_confirmations_give on public.share_confirmations for insert to authenticated
  with check (user_id = auth.uid() and private.in_cohort(cohort_id) and private.can_confirm(share_id, cohort_id));
create policy share_confirmations_take_back on public.share_confirmations for delete to authenticated
  using (user_id = auth.uid());

-- A student's agent reads, and never writes (migration 6), and neither
-- does a teacher's.
create policy agents_cannot_insert on public.share_confirmations as restrictive
  for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.share_confirmations as restrictive
  for update to authenticated using (private.not_an_agent());
create policy agents_cannot_delete on public.share_confirmations as restrictive
  for delete to authenticated using (private.not_an_agent());

-- When the builder changes their mark or the link, what a partner saw no
-- longer describes it, so the confirmations go and the partner can look
-- again. Redoing is free, in both directions.
create function private.forget_confirmations() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.readiness is distinct from old.readiness or new.url is distinct from old.url then
    delete from public.share_confirmations where share_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.forget_confirmations() from public, anon, authenticated;

create trigger shares_forget_confirmations
  after update on public.shares
  for each row execute function private.forget_confirmations();

-- ---------------------------------------------------------------------
-- Leaving takes a person's confirmations of others' work with them, as
-- well as everything they shared (which takes others' confirmations of
-- their work with it).
-- ---------------------------------------------------------------------

create or replace function public.leave_cohort(c uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not private.not_an_agent() then
    raise exception 'Leaving a cohort is done by the person, on humanshaped.org.';
  end if;
  delete from public.shares where cohort_id = c and user_id = auth.uid();
  delete from public.share_confirmations where cohort_id = c and user_id = auth.uid();
  delete from public.live_queue where cohort_id = c and user_id = auth.uid();
  delete from public.live_answers where cohort_id = c and user_id = auth.uid();
  delete from public.group_members gm using public.groups g
    where gm.group_id = g.id and g.cohort_id = c and gm.user_id = auth.uid();
  delete from public.calendar_contacts where cohort_id = c and user_id = auth.uid();
  delete from public.app_hides where cohort_id = c and user_id = auth.uid();
  update public.enrollments set status = 'left', app_name = null, app_repo = null, app_url = null
    where cohort_id = c and user_id = auth.uid();
end;
$$;
