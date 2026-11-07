-- What was said in a session, written from its recording (Ben, November 7,
-- 2026: "If you can save transcripts confidentially to the cohort, that's
-- fine to keep the words"). One row a stretch of one person's words, placed by
-- which tile Meet marked as speaking. user_id is null when that tile's name
-- was no one in the cohort, and name then says what it read.
--
-- These live here and not in the cohort's repository, because every learner
-- can read that repository. Only the session-read function writes them. A
-- leader reads a whole session, and each person reads their own words.
create table public.session_words (
  id         bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  cohort_id  uuid not null references public.cohorts (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete cascade,
  name       text check (name is null or char_length(name) <= 80),
  started_s  int not null check (started_s >= 0),
  ended_s    int not null,
  body       text not null check (char_length(body) between 1 and 8000),
  check (ended_s > started_s)
);
create index session_words_session on public.session_words (session_id, started_s);
create index session_words_person on public.session_words (user_id);
alter table public.session_words enable row level security;
grant select on public.session_words to authenticated;
create policy session_words_read on public.session_words for select to authenticated
  using (user_id = auth.uid() or private.teaches(cohort_id)
         or user_id = private.claimed_member(cohort_id));

-- Saying who a name is now also gives them the words under that name.
create or replace function public.name_speaker(s uuid, label text, member uuid) returns int
language plpgsql security definer set search_path to '' as $$
#variable_conflict use_column
declare c uuid; n int;
begin
  select cohort_id into c from public.sessions where id = s;
  if c is null or not private.teaches(c) then raise exception 'Only a leader of this cohort can do this.'; end if;
  if not exists (select 1 from public.enrollments e where e.cohort_id = c and e.user_id = member)
     and not exists (select 1 from public.cohort_teachers t where t.cohort_id = c and t.user_id = member) then
    raise exception 'That person is not in this cohort.';
  end if;
  insert into public.talk_names (cohort_id, label, user_id) values (c, name_speaker.label, member)
    on conflict (cohort_id, label) do update set user_id = excluded.user_id;
  update public.session_talk t set user_id = member, name = null
    where t.cohort_id = c and t.user_id is null and t.name = name_speaker.label;
  get diagnostics n = row_count;
  update public.session_words w set user_id = member, name = null
    where w.cohort_id = c and w.user_id is null and w.name = name_speaker.label;
  return n;
end;
$$;
