-- The session's thread (research/notes/meet-classroom-design.md, Wish 6
-- and C5): the chat that should last goes into the conversation the
-- cohort already has. A teacher opens "Week N" as a discussion in the
-- cohort's private repository on GitHub, as themselves, from /live/, and
-- the session keeps its number so everyone's /live/ and add-on show the
-- same thread and post to it as themselves.
--
-- Only the number is kept here. The thread, its words, and who wrote
-- them stay on GitHub, owned by the people who wrote them.
--
-- Who sets it: sessions_write already lets only the cohort's teachers
-- change a session, and migration 6 already keeps every agent from
-- writing, so no new rule is needed. One thread belongs to one session.

alter table public.sessions add column discussion_number int
  check (discussion_number is null or discussion_number > 0);

create unique index sessions_one_thread_each on public.sessions (cohort_id, discussion_number)
  where discussion_number is not null;
