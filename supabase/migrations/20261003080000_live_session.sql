-- The live session, beyond a companion page (LOOP-PLAN.md, M3).
--
-- VISION.md: "The synchronous sessions being conducted on Google Meet
-- should have features dedicated to both the student and the teacher
-- that provide more functionality than a regular Google Meet experience
-- provides." DECISIONS.md: "Checks for understanding in every live
-- session." Meet cannot be embedded, so /live/?c=<slug> is the page kept
-- open beside it, and these three tables are what it adds:
--
-- live_queue    The "show your work" queue: during a session, a person
--               adds something to show (their live app, a commit, an
--               issue or discussion, a share they already made), and the
--               cohort sees the queue in order. The person and the
--               cohort's teachers can mark an item shown or take it off.
-- live_checks   A check for understanding: a short question a teacher
--               posts during the session, answered in a person's own
--               words or by choosing one of a few choices.
-- live_answers  The answers. A person sees only their own; the cohort's
--               teachers see everyone's. Others see an anonymous count
--               per choice, and only when the teacher chooses to show it
--               (public.check_tally).
--
-- Never graded. A check has no correct answer column and an answer has
-- no score, on purpose: a check tells the teacher what to teach next,
-- and it is never a record about the person.
--
-- How long it is kept. Everything here belongs to the session, not to
-- the person's record. All of it (queue, checks, and answers) is
-- deleted when the cohort is marked finished, and a person's own queue
-- items and answers leave with them when they leave the cohort or
-- delete their account. Nothing here is copied anywhere else.

-- ---------------------------------------------------------------------
-- The "show your work" queue
-- ---------------------------------------------------------------------

create table public.live_queue (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   uuid not null references public.cohorts (id) on delete cascade,
  session_id  uuid not null references public.sessions (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('app', 'commit', 'issue', 'pull', 'discussion', 'repo', 'share', 'link')),
  url         text not null check (url ~ '^https://' and char_length(url) <= 2000),
  note        text check (char_length(note) <= 300),
  share_id    uuid references public.shares (id) on delete cascade,
  state       text not null default 'waiting' check (state in ('waiting', 'shown')),
  created_at  timestamptz not null default now(),
  shown_at    timestamptz
);
create index live_queue_session on public.live_queue (session_id, created_at);

-- ---------------------------------------------------------------------
-- Checks for understanding, and the answers to them
-- ---------------------------------------------------------------------

create table public.live_checks (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   uuid not null references public.cohorts (id) on delete cascade,
  session_id  uuid not null references public.sessions (id) on delete cascade,
  created_by  uuid references public.profiles (id) on delete set null,
  prompt      text not null check (char_length(btrim(prompt)) between 1 and 500),
  -- null means people answer in their own words; otherwise two to six choices.
  choices     text[] check (choices is null or (cardinality(choices) between 2 and 6
                and array_position(choices, null) is null)),
  state       text not null default 'open' check (state in ('open', 'closed')),
  show_tally  boolean not null default false,
  created_at  timestamptz not null default now(),
  closed_at   timestamptz
);
create index live_checks_session on public.live_checks (session_id, created_at);

-- Its own id, so that a deletion seen through Realtime carries nothing
-- but a random number, never who answered.
create table public.live_answers (
  id          uuid primary key default gen_random_uuid(),
  check_id    uuid not null references public.live_checks (id) on delete cascade,
  cohort_id   uuid not null references public.cohorts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  choice      smallint,
  body        text check (char_length(body) <= 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (check_id, user_id)
);

-- ---------------------------------------------------------------------
-- What can never change after the fact: whose item or answer it is,
-- which cohort and session it belongs to, and what was asked. An update
-- rule can say who may change a row, and these say what.
-- ---------------------------------------------------------------------

create function private.live_keep_identity() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'live_queue' then
    if new.cohort_id <> old.cohort_id or new.session_id <> old.session_id or new.user_id <> old.user_id
       or new.url <> old.url or new.kind <> old.kind or new.share_id is distinct from old.share_id then
      raise exception 'Only the note and whether it has been shown can change.';
    end if;
    if new.state = 'shown' and old.state <> 'shown' then new.shown_at := now(); end if;
    if new.state = 'waiting' then new.shown_at := null; end if;
  elsif tg_table_name = 'live_checks' then
    if new.cohort_id <> old.cohort_id or new.session_id <> old.session_id
       or new.prompt <> old.prompt or new.choices is distinct from old.choices
       or new.created_by is distinct from old.created_by then
      raise exception 'A question cannot change once it is asked. Close it and ask another.';
    end if;
    if new.state = 'closed' and old.state <> 'closed' then new.closed_at := now(); end if;
    if new.state = 'open' then new.closed_at := null; end if;
  elsif tg_table_name = 'live_answers' then
    if new.check_id <> old.check_id or new.cohort_id <> old.cohort_id or new.user_id <> old.user_id then
      raise exception 'An answer can only change its words or its choice.';
    end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;
revoke all on function private.live_keep_identity() from public, anon, authenticated;

create trigger live_queue_keep before update on public.live_queue
  for each row execute function private.live_keep_identity();
create trigger live_checks_keep before update on public.live_checks
  for each row execute function private.live_keep_identity();
create trigger live_answers_keep before update on public.live_answers
  for each row execute function private.live_keep_identity();

-- An answer must fit its question: a choice that exists for a question
-- with choices, words for one without. Run as a policy helper, past the
-- question's own read rule, which already lets the person read it.
create function private.answer_fits(c uuid, cohort uuid, pick smallint, words text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.live_checks k
    where k.id = c and k.cohort_id = cohort and k.state = 'open'
      and case when k.choices is null
               then pick is null and char_length(btrim(coalesce(words, ''))) between 1 and 1000
               else words is null and pick between 1 and cardinality(k.choices) end
  );
$$;
grant execute on function private.answer_fits(uuid, uuid, smallint, text) to authenticated;

create function private.session_in_cohort(s uuid, c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sessions where id = s and cohort_id = c);
$$;
grant execute on function private.session_in_cohort(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Who may see and do what
-- ---------------------------------------------------------------------

alter table public.live_queue   enable row level security;
alter table public.live_checks  enable row level security;
alter table public.live_answers enable row level security;

-- The queue: the cohort sees it; a person adds only their own items, as
-- waiting; the person and the cohort's teachers mark them shown or take
-- them off.
create policy live_queue_read on public.live_queue for select to authenticated
  using (private.in_cohort(cohort_id));
create policy live_queue_add on public.live_queue for insert to authenticated
  with check (user_id = auth.uid() and state = 'waiting' and shown_at is null
              and private.in_cohort(cohort_id) and private.session_in_cohort(session_id, cohort_id)
              and (share_id is null or exists (
                select 1 from public.shares s where s.id = share_id and s.user_id = auth.uid() and s.cohort_id = live_queue.cohort_id)));
create policy live_queue_update on public.live_queue for update to authenticated
  using (user_id = auth.uid() or private.teaches(cohort_id))
  with check (user_id = auth.uid() or private.teaches(cohort_id));
create policy live_queue_remove on public.live_queue for delete to authenticated
  using (user_id = auth.uid() or private.teaches(cohort_id));

-- Checks: the cohort sees them; only the cohort's teachers ask, close,
-- or delete them.
create policy live_checks_read on public.live_checks for select to authenticated
  using (private.in_cohort(cohort_id));
create policy live_checks_ask on public.live_checks for insert to authenticated
  with check (private.teaches(cohort_id) and created_by = auth.uid() and state = 'open'
              and private.session_in_cohort(session_id, cohort_id));
create policy live_checks_change on public.live_checks for update to authenticated
  using (private.teaches(cohort_id)) with check (private.teaches(cohort_id));
create policy live_checks_delete on public.live_checks for delete to authenticated
  using (private.teaches(cohort_id));

-- Answers: a person sees and writes only their own, while the question
-- is open; the cohort's teachers read everyone's and write none.
create policy live_answers_read on public.live_answers for select to authenticated
  using (user_id = auth.uid() or private.teaches(cohort_id));
create policy live_answers_give on public.live_answers for insert to authenticated
  with check (user_id = auth.uid() and private.in_cohort(cohort_id)
              and private.answer_fits(check_id, cohort_id, choice, body));
create policy live_answers_change on public.live_answers for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and private.answer_fits(check_id, cohort_id, choice, body));
create policy live_answers_take_back on public.live_answers for delete to authenticated
  using (user_id = auth.uid());

-- A student's agent reads, and never writes (migration 6).
do $$
declare
  t text;
begin
  foreach t in array array['live_queue', 'live_checks', 'live_answers'] loop
    execute format('create policy agents_cannot_insert on public.%I as restrictive for insert to authenticated with check (private.not_an_agent())', t);
    execute format('create policy agents_cannot_update on public.%I as restrictive for update to authenticated using (private.not_an_agent())', t);
    execute format('create policy agents_cannot_delete on public.%I as restrictive for delete to authenticated using (private.not_an_agent())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- The anonymous tally: how many chose each choice, and how many answered
-- in all, with no names. Teachers of the cohort always see it; people in
-- the cohort see it only when the teacher has chosen to show it.
-- ---------------------------------------------------------------------

create function public.check_tally(c uuid)
returns table (choice smallint, answers bigint)
language sql stable security definer set search_path = public as $$
  select a.choice, count(*)
  from public.live_answers a
  join public.live_checks k on k.id = a.check_id
  where a.check_id = c
    and (private.teaches(k.cohort_id) or (k.show_tally and private.in_cohort(k.cohort_id)))
  group by a.choice
  order by a.choice nulls last;
$$;
revoke all on function public.check_tally(uuid) from public, anon;
grant execute on function public.check_tally(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Keeping it only as long as the session needs it
-- ---------------------------------------------------------------------

-- When a cohort is marked finished, its queue, checks, and answers go.
create function private.forget_live_session() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'finished' and old.status <> 'finished' then
    delete from public.live_queue where cohort_id = new.id;
    delete from public.live_checks where cohort_id = new.id;  -- answers go with them
  end if;
  return new;
end;
$$;
revoke all on function private.forget_live_session() from public, anon, authenticated;

create trigger on_cohort_finished
  after update of status on public.cohorts
  for each row execute function private.forget_live_session();

-- Leaving a cohort takes a person's queue items and answers with them.
create or replace function public.leave_cohort(c uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not private.not_an_agent() then
    raise exception 'Leaving a cohort is done by the person, on humanshaped.org.';
  end if;
  delete from public.shares where cohort_id = c and user_id = auth.uid();
  delete from public.live_queue where cohort_id = c and user_id = auth.uid();
  delete from public.live_answers where cohort_id = c and user_id = auth.uid();
  delete from public.group_members gm using public.groups g
    where gm.group_id = g.id and g.cohort_id = c and gm.user_id = auth.uid();
  delete from public.calendar_contacts where cohort_id = c and user_id = auth.uid();
  update public.enrollments set status = 'left', app_name = null, app_repo = null, app_url = null
    where cohort_id = c and user_id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------
-- Live updates through Supabase Realtime (Postgres Changes), which
-- checks each change against each subscriber's read rules above before
-- sending it. The free plan allows 200 concurrent connections, 100
-- messages a second, and 100 channel joins a second
-- (supabase.com/docs/guides/realtime/limits, read October 3, 2026), and
-- a cohort of twenty people uses twenty connections. The page only takes
-- a change as a nudge to read again through the same rules, and falls
-- back to reading every fifteen seconds if Realtime cannot connect.
-- Only on Supabase (the local test database has no such publication).
-- ---------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.live_queue, public.live_checks, public.live_answers;
  end if;
end $$;
