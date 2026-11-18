-- Google Drive's own transcript of a session recording (Ben, November 18,
-- 2026: "You have got to figure out a programatic/API way of getting the
-- transcript ... the secondary transcript from the runner (which I still want
-- as a backup)"). session-read fetches it a few minutes after the recording's
-- link is saved, by HTTPS, with no browser. It has no speakers, so only a
-- cohort's leaders read it; session_words stays the runner's, by person.
create table public.session_captions (
  id         bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  cohort_id  uuid not null references public.cohorts (id) on delete cascade,
  started_s  int not null check (started_s >= 0),
  ended_s    int not null,
  body       text not null check (char_length(body) between 1 and 8000),
  check (ended_s > started_s)
);
create index session_captions_session on public.session_captions (session_id, started_s);
alter table public.session_captions enable row level security;
grant select on public.session_captions to authenticated;
create policy session_captions_read on public.session_captions for select to authenticated
  using (private.teaches(cohort_id));

-- Whether Drive has a transcript yet: waiting (no track yet), done, or
-- private (the file is not shared by link, so Drive will not answer).
create table public.session_caption_reads (
  session_id    uuid primary key references public.sessions (id) on delete cascade,
  cohort_id     uuid not null references public.cohorts (id) on delete cascade,
  recording_url text not null,
  state         text not null check (state in ('waiting', 'done', 'private')),
  lines         int,
  first_at      timestamptz not null default now(),
  checked_at    timestamptz not null default now()
);
alter table public.session_caption_reads enable row level security;
grant select on public.session_caption_reads to authenticated;
create policy session_caption_reads_read on public.session_caption_reads for select to authenticated
  using (private.teaches(cohort_id));
