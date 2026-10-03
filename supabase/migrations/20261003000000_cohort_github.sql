-- Each cohort's conversation lives in its own private repository in the
-- humanshaped organization, with Discussions on, reached through a secret
-- team of the cohort's members (research/notes/cohort-conversation-notes.md).
-- The teacher names the repository and the team; a server function (the
-- cohort-access Edge Function) adds people to the team when they join and
-- removes them when they leave, and records here where that stands.

alter table public.cohorts
  add column github_repo text check (github_repo is null or github_repo ~ '^humanshaped/[A-Za-z0-9._-]+$'),
  add column github_team text check (github_team is null or github_team ~ '^[a-z0-9-]+$');

create type public.github_access_state as enum ('invited', 'member', 'removed', 'failed');

-- Where a person's access to their cohort's conversation stands. Only the
-- server function writes it (with the service role), so nobody can mark
-- themselves a member; the person and their teachers can read it.
create table public.github_access (
  cohort_id   uuid references public.cohorts (id) on delete cascade,
  user_id     uuid references public.profiles (id) on delete cascade,
  state       public.github_access_state not null,
  detail      text check (char_length(detail) <= 500),
  updated_at  timestamptz not null default now(),
  primary key (cohort_id, user_id)
);

alter table public.github_access enable row level security;

create policy github_access_read on public.github_access for select to authenticated
  using (user_id = auth.uid() or private.teaches(cohort_id));
