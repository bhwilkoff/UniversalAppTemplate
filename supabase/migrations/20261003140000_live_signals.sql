-- Live signals: send and recall, cards, on stage, and "recording now"
-- (research/notes/meet-classroom-design.md, milestone C1; DECISIONS.md,
-- "The classroom on Meet", wishes 1, 5, 10, 11, and 13).
--
-- Meet gives a third party no way to move people between calls, change
-- anyone else's layout, or put text on anyone else's screen, so the
-- classroom's moves are signals people see and act on, not commands Meet
-- obeys. A teacher sends a signal from /live/ (later, from the Meet
-- add-on too), and every open /live/, /card/, and add-on page in the
-- cohort shows it within a second through Supabase Realtime, or within
-- fifteen seconds by polling if Realtime cannot connect.
--
-- live_signals  One row per signal a teacher sends in a session:
--   rooms      "Go to your rooms", with an optional time to come back
--              (ends_at), which drives everyone's countdown. The end time
--              is stored rather than a duration, so someone who opens the
--              page late sees the same clock as everyone else.
--   together   "Come back to the main room."
--   card       A card with the teacher's own words (body), with an
--              optional countdown (ends_at), shown large on /live/ and on
--              /card/ for screen sharing.
--   stage      Who is on stage now (people: the presenter first, then up
--              to two people responding), so everyone knows who is
--              talking. Meet's own "pin for everyone" stays the way the
--              tiles change.
--   recording  A plain notice on every page while the teacher's recorder
--              is running.
-- A signal is over when the teacher clears it (cleared_at) or sends the
-- next one of its kind; the pages work out which one shows
-- (assets/signals-lib.js).
--
-- card_presets  Cards a teacher has saved to reuse, private to that
--               teacher, in any cohort they teach.
--
-- Nothing here is read from Meet, and nothing here is about a student:
-- a signal holds the teacher's words, times, and, for the stage, who the
-- teacher asked to present. Signals are deleted when the cohort is
-- marked finished, with the rest of the live session, and a stage that
-- names someone goes when that person leaves the cohort.

-- ---------------------------------------------------------------------
-- The signals
-- ---------------------------------------------------------------------

-- Each person on the stage once (a check constraint cannot hold a
-- subquery, so the constraint calls this).
create function private.distinct_people(p uuid[]) returns boolean
language sql immutable set search_path = '' as $$
  select cardinality(p) = (select count(distinct x) from unnest(p) x);
$$;

create table public.live_signals (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   uuid not null references public.cohorts (id) on delete cascade,
  session_id  uuid not null references public.sessions (id) on delete cascade,
  kind        text not null check (kind in ('rooms', 'together', 'card', 'stage', 'recording')),
  body        text,
  people      uuid[],
  ends_at     timestamptz,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  cleared_at  timestamptz,
  -- Only a card has words, and a card always has them.
  constraint live_signals_body check (
    case when kind = 'card' then body is not null and char_length(btrim(body)) between 1 and 200
         else body is null end),
  -- Only the stage names people: one presenter and up to two responding,
  -- each once.
  constraint live_signals_people check (
    case when kind = 'stage' then people is not null and cardinality(people) between 1 and 3
              and array_position(people, null) is null and private.distinct_people(people)
         else people is null end),
  -- Only rooms and a card count down.
  constraint live_signals_ends check (ends_at is null or kind in ('rooms', 'card'))
);
create index live_signals_session on public.live_signals (session_id, created_at);

-- What a signal can be, and what can change afterwards. A countdown
-- ends in the future, and within four hours (the longest a session can
-- be); after it is sent, a signal can only be cleared, or have its
-- countdown moved (five more minutes), and a cleared signal stays
-- cleared. Who, which cohort, which session, and the words never change:
-- a new card is a new signal.
create function private.live_signal_rules() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.cleared_at := null;
    if new.ends_at is not null and (new.ends_at <= now() or new.ends_at > now() + interval '4 hours') then
      raise exception 'A countdown ends in the future, and within four hours.';
    end if;
    return new;
  end if;
  if new.cohort_id <> old.cohort_id or new.session_id <> old.session_id or new.kind <> old.kind
     or new.body is distinct from old.body or new.people is distinct from old.people
     or new.created_by is distinct from old.created_by or new.created_at <> old.created_at then
    raise exception 'A signal can only be cleared, or have its countdown moved. Send a new one instead.';
  end if;
  if old.cleared_at is not null then
    if new.cleared_at is distinct from old.cleared_at or new.ends_at is distinct from old.ends_at then
      raise exception 'A cleared signal stays cleared. Send a new one instead.';
    end if;
    return new;
  end if;
  if new.cleared_at is not null then new.cleared_at := now(); end if;
  if new.ends_at is distinct from old.ends_at and new.cleared_at is null
     and (new.ends_at is null or new.ends_at <= now() or new.ends_at > now() + interval '4 hours') then
    raise exception 'A countdown ends in the future, and within four hours.';
  end if;
  return new;
end;
$$;
revoke all on function private.live_signal_rules() from public, anon, authenticated;

create trigger live_signals_rules before insert or update on public.live_signals
  for each row execute function private.live_signal_rules();

alter table public.live_signals enable row level security;

-- Everyone in the cohort sees the signals; only the cohort's teachers
-- send, clear, or delete them, in their own name, in one of the cohort's
-- sessions, and a stage names only people in the cohort.
create function private.all_in_cohort(p uuid[], c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p is null or not exists (
    select 1 from unnest(p) x
    where not exists (select 1 from public.enrollments e where e.cohort_id = c and e.user_id = x and e.status <> 'left')
      and not exists (select 1 from public.cohort_teachers t where t.cohort_id = c and t.user_id = x)
  );
$$;
grant execute on function private.all_in_cohort(uuid[], uuid) to authenticated;

create policy live_signals_read on public.live_signals for select to authenticated
  using (private.in_cohort(cohort_id));
create policy live_signals_send on public.live_signals for insert to authenticated
  with check (private.teaches(cohort_id) and created_by = auth.uid()
              and private.session_in_cohort(session_id, cohort_id)
              and private.all_in_cohort(people, cohort_id));
create policy live_signals_change on public.live_signals for update to authenticated
  using (private.teaches(cohort_id)) with check (private.teaches(cohort_id));
create policy live_signals_delete on public.live_signals for delete to authenticated
  using (private.teaches(cohort_id));

-- An agent reads, and never writes (migration 6), a teacher's included.
create policy agents_cannot_insert on public.live_signals as restrictive
  for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.live_signals as restrictive
  for update to authenticated using (private.not_an_agent());
create policy agents_cannot_delete on public.live_signals as restrictive
  for delete to authenticated using (private.not_an_agent());

-- ---------------------------------------------------------------------
-- Saved cards
-- ---------------------------------------------------------------------

create table public.card_presets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(btrim(body)) between 1 and 200),
  minutes     smallint check (minutes is null or minutes between 1 and 240),
  created_at  timestamptz not null default now(),
  unique (user_id, body)
);

alter table public.card_presets enable row level security;

-- A teacher's own, seen and changed by nobody else.
create policy card_presets_read on public.card_presets for select to authenticated
  using (user_id = auth.uid());
create policy card_presets_save on public.card_presets for insert to authenticated
  with check (user_id = auth.uid() and private.is_hub_teacher());
create policy card_presets_change on public.card_presets for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy card_presets_remove on public.card_presets for delete to authenticated
  using (user_id = auth.uid());

create policy agents_cannot_insert on public.card_presets as restrictive
  for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.card_presets as restrictive
  for update to authenticated using (private.not_an_agent());
create policy agents_cannot_delete on public.card_presets as restrictive
  for delete to authenticated using (private.not_an_agent());

-- ---------------------------------------------------------------------
-- Keeping it only as long as the session needs it
-- ---------------------------------------------------------------------

-- When a cohort is marked finished, its signals go with its queue,
-- checks, and answers (migration 20261003080000).
create or replace function private.forget_live_session() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'finished' and old.status <> 'finished' then
    delete from public.live_queue where cohort_id = new.id;
    delete from public.live_checks where cohort_id = new.id;  -- answers go with them
    delete from public.live_signals where cohort_id = new.id;
  end if;
  return new;
end;
$$;

-- Leaving a cohort takes away any stage that names the person.
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
  delete from public.live_signals where cohort_id = c and kind = 'stage' and auth.uid() = any (people);
  delete from public.group_members gm using public.groups g
    where gm.group_id = g.id and g.cohort_id = c and gm.user_id = auth.uid();
  delete from public.calendar_contacts where cohort_id = c and user_id = auth.uid();
  delete from public.app_hides where cohort_id = c and user_id = auth.uid();
  update public.enrollments set status = 'left', app_name = null, app_repo = null, app_url = null
    where cohort_id = c and user_id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------
-- Live updates through Supabase Realtime, as for the queue and checks:
-- each change is checked against each subscriber's read rule, and the
-- page takes it only as a nudge to read again. Only on Supabase.
-- ---------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.live_signals;
  end if;
end $$;
