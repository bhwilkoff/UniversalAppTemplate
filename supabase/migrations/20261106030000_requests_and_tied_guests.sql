-- Requests, and a tied guest who is the member (Ben, November 6, 2026): a learner
-- can ask for anything a leader can do, and a leader decides. Someone who came in
-- on the wrong Google account, once tied, is that member here too.

alter table public.show_state drop constraint if exists show_state_stage_check;
alter table public.show_state add constraint show_state_stage_check
  check (stage in ('scene', 'welcome', 'answers', 'presenter', 'blank', 'path', 'rooms', 'board'));

-- A tied guest asks to show work as the member they are.
drop policy live_queue_add on public.live_queue;
create policy live_queue_add on public.live_queue for insert to authenticated
  with check ((user_id = auth.uid() or user_id = private.claimed_member(cohort_id))
              and state = 'waiting' and shown_at is null
              and private.in_cohort(cohort_id) and private.session_in_cohort(session_id, cohort_id)
              and (share_id is null or exists (
                select 1 from public.shares s where s.id = share_id and s.user_id = auth.uid() and s.cohort_id = live_queue.cohort_id)));
drop policy live_queue_update on public.live_queue;
create policy live_queue_update on public.live_queue for update to authenticated
  using (user_id = auth.uid() or user_id = private.claimed_member(cohort_id) or private.teaches(cohort_id))
  with check (user_id = auth.uid() or user_id = private.claimed_member(cohort_id) or private.teaches(cohort_id));
drop policy live_queue_remove on public.live_queue;
create policy live_queue_remove on public.live_queue for delete to authenticated
  using (user_id = auth.uid() or user_id = private.claimed_member(cohort_id) or private.teaches(cohort_id));

create table public.live_requests (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   uuid not null references public.cohorts (id) on delete cascade,
  session_id  uuid not null references public.sessions (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('question', 'card', 'board', 'breakouts', 'other')),
  body        text check (body is null or char_length(body) <= 500),
  state       text not null default 'waiting' check (state in ('waiting', 'done', 'declined')),
  created_at  timestamptz not null default now()
);
create index live_requests_session on public.live_requests (session_id);
alter table public.live_requests enable row level security;
grant select, insert, update, delete on public.live_requests to authenticated;

create policy live_requests_read on public.live_requests for select to authenticated
  using (private.in_cohort(cohort_id));
create policy live_requests_add on public.live_requests for insert to authenticated
  with check ((user_id = auth.uid() or user_id = private.claimed_member(cohort_id))
              and state = 'waiting' and private.in_cohort(cohort_id) and private.session_in_cohort(session_id, cohort_id));
-- Only a leader decides; the person who asked can only take it back.
create policy live_requests_decide on public.live_requests for update to authenticated
  using (private.teaches(cohort_id)) with check (private.teaches(cohort_id));
create policy live_requests_remove on public.live_requests for delete to authenticated
  using (user_id = auth.uid() or user_id = private.claimed_member(cohort_id) or private.teaches(cohort_id));
create policy agents_cannot_insert on public.live_requests as restrictive for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.live_requests as restrictive for update to authenticated using (private.not_an_agent());
create policy agents_cannot_delete on public.live_requests as restrictive for delete to authenticated using (private.not_an_agent());

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.live_requests;
  end if;
end $$;
