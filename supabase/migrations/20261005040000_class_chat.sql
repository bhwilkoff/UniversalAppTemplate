-- The in-class chat (R15; research/notes/active-learning-notes.md). Ben,
-- October 5: "In-class messages/chat is different than ongoing
-- discussion." Meet's own chat cannot be read or written by an add-on,
-- so the panel keeps a chat of its own whose every message is a comment
-- on a "Week N, in class" discussion in the cohort's private repository,
-- apart from the session's thread (discussion_number), posted by each
-- person as themselves. Replies are GitHub's replies and reactions are
-- GitHub's reactions, so the chat stays in GitHub after the class.
--
-- Only the number is kept here, as with the session's thread; teachers
-- set it (sessions_write), and agents never write (migration 6).

alter table public.sessions add column chat_number int
  check (chat_number is null or chat_number > 0);

create unique index sessions_one_chat_each on public.sessions (cohort_id, chat_number)
  where chat_number is not null;
