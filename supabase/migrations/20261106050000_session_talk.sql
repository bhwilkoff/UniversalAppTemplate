-- Who was speaking, read from a session's recording (Ben, November 6, 2026:
-- "the amount of time that someone talked"). Meet marks the speaking tile in
-- the picture, so no voice is measured or kept. Breakout rooms are not
-- recorded, so they have no talk time, and that is left out rather than
-- estimated (Ben: "or just omit that possibility").
--
-- session_reads  one row a session: whether its recording has been read
-- session_talk   one row a turn; user_id is null when the name on the tile
--                was not someone in the cohort, and name then says what it read
-- Only the session-read function writes these. A leader reads a whole session,
-- and each person reads their own turns.

create table public.session_reads (
  session_id    uuid primary key references public.sessions (id) on delete cascade,
  cohort_id     uuid not null references public.cohorts (id) on delete cascade,
  recording_url text not null,
  state         text not null check (state in ('running', 'done', 'failed')),
  tries         int not null default 1,
  read_seconds  int,
  problem       text check (problem is null or char_length(problem) <= 200),
  started_at    timestamptz not null default now(),
  finished_at   timestamptz
);
alter table public.session_reads enable row level security;
grant select on public.session_reads to authenticated;
create policy session_reads_read on public.session_reads for select to authenticated
  using (private.in_cohort(cohort_id));

create table public.session_talk (
  id         bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  cohort_id  uuid not null references public.cohorts (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete cascade,
  name       text check (name is null or char_length(name) <= 80),
  started_s  int not null check (started_s >= 0),
  ended_s    int not null,
  check (ended_s > started_s)
);
create index session_talk_session on public.session_talk (session_id);
create index session_talk_person on public.session_talk (user_id);
alter table public.session_talk enable row level security;
grant select on public.session_talk to authenticated;
create policy session_talk_read on public.session_talk for select to authenticated
  using (user_id = auth.uid() or private.teaches(cohort_id)
         or user_id = private.claimed_member(cohort_id));
