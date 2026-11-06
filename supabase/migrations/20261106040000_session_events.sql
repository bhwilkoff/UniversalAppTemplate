-- What happened in a session (Ben, November 6, 2026: "I'd like to save
-- everything from reactions that were sent to the amount of time that
-- someone talked"). Answers, requests, the queue, and the board already keep
-- their own rows and times; this keeps what used to vanish when the call ended.
-- A leader reads the whole session, and each person reads only their own
-- (Ben's rule of October 2026: students can see what is kept about them).
-- Rows are facts, never a score: nothing here ranks or compares anyone.
--
-- here      this person had the add-on open (one row a minute)
-- reaction  a reaction was sent; detail is which
-- stance    a stance was taken or let go; detail is which, or null
-- stage     the leader moved the stage; written by the trigger below

create table public.session_events (
  id          bigint generated always as identity primary key,
  cohort_id   uuid not null references public.cohorts (id) on delete cascade,
  session_id  uuid not null references public.sessions (id) on delete cascade,
  user_id     uuid references public.profiles (id) on delete cascade,
  via_guest   uuid references public.profiles (id) on delete set null,
  kind        text not null check (kind in ('here', 'reaction', 'stance', 'stage')),
  detail      text check (detail is null or char_length(detail) <= 200),
  at          timestamptz not null default now()
);
create index session_events_session on public.session_events (session_id, at);
create index session_events_person on public.session_events (user_id);
alter table public.session_events enable row level security;
grant select, insert on public.session_events to authenticated;
grant usage on sequence public.session_events_id_seq to authenticated;

-- A guest tied to a member counts as that member, as answers do, and the
-- clock is the database's, so nobody can write a time of their own.
create function private.session_event_rules() returns trigger
language plpgsql set search_path to '' as $$
declare m uuid := private.claimed_member(new.cohort_id);
begin
  new.at := now();
  if m is not null and new.user_id = auth.uid() then
    new.via_guest := auth.uid();
    new.user_id := m;
  end if;
  return new;
end;
$$;
create trigger session_events_rules before insert on public.session_events
  for each row execute function private.session_event_rules();

create policy session_events_read on public.session_events for select to authenticated
  using (user_id = auth.uid() or via_guest = auth.uid() or private.teaches(cohort_id));
create policy session_events_add on public.session_events for insert to authenticated
  with check (kind in ('here', 'reaction', 'stance')
              and (user_id = auth.uid() or user_id = private.claimed_member(cohort_id))
              and private.in_cohort(cohort_id)
              and private.session_in_cohort(session_id, cohort_id));
create policy agents_cannot_insert on public.session_events as restrictive for insert to authenticated
  with check (private.not_an_agent());

-- Every stage move, from the database, so it needs no one's panel to be open.
create function private.show_state_event() returns trigger
language plpgsql security definer set search_path to '' as $$
begin
  if tg_op = 'INSERT' or new.current_scene is distinct from old.current_scene
     or new.stage is distinct from old.stage or new.stage_ref is distinct from old.stage_ref then
    insert into public.session_events (cohort_id, session_id, user_id, kind, detail)
    values (new.cohort_id, new.session_id, null, 'stage',
            left(new.stage || ':' || coalesce(new.current_scene, ''), 200));
  end if;
  return null;
end;
$$;
create trigger show_state_event after insert or update on public.show_state
  for each row execute function private.show_state_event();
