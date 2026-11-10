-- A cohort of any shape (Ben, November 10, 2026: "let's build out the ability
-- to create arbitrary cohorts (our word for courses) with sessions (our word
-- for classes)"). A weekly cohort is the five weeks after a prep session, as
-- before. A custom cohort has the sessions its leaders set: any number, each
-- on its own date and with its own title, named "Session N", and with no
-- weekly curriculum seeded into it. A session can also carry what comes
-- before it (pre-class work, a study guide) and its readings, which an
-- imported course brings (DECISIONS.md, "A cohort of any shape").

alter table public.cohorts
  add column schedule text not null default 'weekly' check (schedule in ('weekly', 'custom'));

alter table public.sessions
  add column before text check (before is null or char_length(before) <= 20000),
  add column readings jsonb check (readings is null or (jsonb_typeof(readings) = 'array' and jsonb_array_length(readings) <= 60));

-- A custom cohort's sessions are numbered from 1; a weekly cohort keeps 0 for
-- its prep session. Numbers stay unique within a cohort, as before.

-- A session goes only while nothing of anyone's is in it: answers, prep
-- answers, posts, or recorded talk. Learners' work is never lost to tidying.
create function private.session_keeps_work() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.live_checks k join public.live_answers a on a.check_id = k.id where k.session_id = old.id)
     or exists (select 1 from public.prep_answers p where p.session_id = old.id)
     or exists (select 1 from public.shares sh where sh.session_id = old.id)
     or exists (select 1 from public.session_talk t where t.session_id = old.id) then
    raise exception 'This session has people''s work in it, so it stays.';
  end if;
  return old;
end;
$$;
create trigger sessions_keep_work before delete on public.sessions
  for each row execute function private.session_keeps_work();
