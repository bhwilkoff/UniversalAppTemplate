-- What Human Shaped takes from studying another class platform (Ben,
-- November 11, 2026: "Please implement what you have learned from forum and
-- all that you have documented"). Each piece takes the move, not the
-- machinery: nothing here scores, ranks, or compares learners.
--
-- sessions.recording_started_at  when the recording began, so what the add-on
--                                kept (by the clock) lines up with the video
-- sessions.mode                  'call', or 'own' for a session with no call
--                                ("a session without a call should be possible")
-- profiles.say_like              how to say my name, in a person's own words
-- cohorts.groups                 the cohort's own groups, named once and used
--                                for breakouts week after week
-- session_marks                  "Mark this moment": private to whoever made it
-- moment_feedback                a leader's feedback on a learner's moment,
--                                a draft until shared, then private to the
--                                learner ("Feedback that is given directly to
--                                the learner should be private to them")
-- cohort_announcements           a leader's announcement, posted as an issue
--                                in the cohort repository at a chosen time

alter table public.sessions add column recording_started_at timestamptz;
alter table public.sessions add column mode text not null default 'call' check (mode in ('call', 'own'));

alter table public.profiles add column say_like text
  check (say_like is null or (say_like = btrim(say_like) and char_length(say_like) between 1 and 80));

alter table public.cohorts add column groups jsonb not null default '[]'::jsonb
  check (jsonb_typeof(groups) = 'array' and jsonb_array_length(groups) <= 40);

create table public.session_marks (
  id         bigint generated always as identity primary key,
  cohort_id  uuid not null references public.cohorts (id) on delete cascade,
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  at         timestamptz not null default now(),
  word       text check (word is null or char_length(word) between 1 and 80)
);
create index session_marks_session on public.session_marks (session_id, user_id);
alter table public.session_marks enable row level security;
grant select, insert, update, delete on public.session_marks to authenticated;
create policy session_marks_own_read on public.session_marks for select to authenticated using (user_id = auth.uid());
create policy session_marks_own_add on public.session_marks for insert to authenticated
  with check (user_id = auth.uid() and private.in_cohort(cohort_id)
              and exists (select 1 from public.sessions s where s.id = session_id and s.cohort_id = session_marks.cohort_id));
create policy session_marks_own_word on public.session_marks for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy session_marks_own_drop on public.session_marks for delete to authenticated using (user_id = auth.uid());

create table public.moment_feedback (
  id           uuid primary key default gen_random_uuid(),
  cohort_id    uuid not null references public.cohorts (id) on delete cascade,
  session_id   uuid not null references public.sessions (id) on delete cascade,
  learner_id   uuid not null references auth.users (id) on delete cascade,
  author_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  at_s         int check (at_s is null or at_s >= 0),
  outcome      text check (outcome is null or char_length(outcome) <= 200),
  body         text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at   timestamptz not null default now(),
  edited_at    timestamptz,
  shared_at    timestamptz,
  delivered_at timestamptz,
  problem      text check (problem is null or char_length(problem) <= 200)
);
create index moment_feedback_session on public.moment_feedback (session_id);
create index moment_feedback_learner on public.moment_feedback (learner_id);
create index moment_feedback_undelivered on public.moment_feedback (shared_at) where delivered_at is null;
alter table public.moment_feedback enable row level security;
grant select, insert, update, delete on public.moment_feedback to authenticated;
create policy moment_feedback_leaders on public.moment_feedback for select to authenticated using (private.teaches(cohort_id));
create policy moment_feedback_learner on public.moment_feedback for select to authenticated
  using (learner_id = auth.uid() and shared_at is not null);
-- The feedback policy asks whether its learner is in the cohort, as the
-- leader writing it; the private schema is not served, so this answers only here.
grant execute on function private.in_cohort_as(uuid, uuid) to authenticated;
create policy moment_feedback_write on public.moment_feedback for insert to authenticated
  with check (author_id = auth.uid() and private.teaches(cohort_id) and private.not_an_agent()
              and exists (select 1 from public.sessions s where s.id = session_id and s.cohort_id = moment_feedback.cohort_id)
              and private.in_cohort_as(cohort_id, learner_id));
create policy moment_feedback_edit on public.moment_feedback for update to authenticated
  using (private.teaches(cohort_id) and delivered_at is null)
  with check (private.teaches(cohort_id) and private.not_an_agent());
create policy moment_feedback_drop on public.moment_feedback for delete to authenticated
  using (private.teaches(cohort_id) and shared_at is null);

-- Only the reminders function marks feedback delivered; a leader's edit
-- cannot move it between learners or sessions, or pretend it was sent.
create or replace function private.moment_feedback_rules() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'UPDATE' then
    if new.cohort_id <> old.cohort_id or new.session_id <> old.session_id or new.learner_id <> old.learner_id or new.author_id <> old.author_id then
      raise exception 'Feedback stays with its learner and session.';
    end if;
    if old.shared_at is not null and new.shared_at is distinct from old.shared_at then
      raise exception 'Shared feedback stays shared.';
    end if;
    new.edited_at := case when new.body <> old.body then now() else old.edited_at end;
  end if;
  new.delivered_at := case when tg_op = 'UPDATE' then old.delivered_at else null end;
  new.problem := case when tg_op = 'UPDATE' then old.problem else null end;
  if new.shared_at is not null and (tg_op = 'INSERT' or old.shared_at is null) then new.shared_at := now(); end if;
  return new;
end;
$$;
create trigger moment_feedback_rules before insert or update on public.moment_feedback
  for each row execute function private.moment_feedback_rules();

create table public.cohort_announcements (
  id         uuid primary key default gen_random_uuid(),
  cohort_id  uuid not null references public.cohorts (id) on delete cascade,
  author_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title      text not null check (char_length(btrim(title)) between 1 and 120),
  body       text not null check (char_length(btrim(body)) between 1 and 8000),
  send_at    timestamptz not null default now(),
  created_at timestamptz not null default now(),
  sent_at    timestamptz,
  issue_url  text check (issue_url is null or issue_url ~ '^https://github\.com/'),
  problem    text check (problem is null or char_length(problem) <= 200)
);
create index cohort_announcements_due on public.cohort_announcements (send_at) where sent_at is null;
alter table public.cohort_announcements enable row level security;
grant select, insert, update, delete on public.cohort_announcements to authenticated;
create policy cohort_announcements_read on public.cohort_announcements for select to authenticated
  using (private.teaches(cohort_id) or (sent_at is not null and private.in_cohort(cohort_id)));
create policy cohort_announcements_add on public.cohort_announcements for insert to authenticated
  with check (author_id = auth.uid() and private.teaches(cohort_id) and private.not_an_agent());
create policy cohort_announcements_edit on public.cohort_announcements for update to authenticated
  using (private.teaches(cohort_id) and sent_at is null) with check (private.teaches(cohort_id) and private.not_an_agent());
create policy cohort_announcements_drop on public.cohort_announcements for delete to authenticated
  using (private.teaches(cohort_id) and sent_at is null);

create or replace function private.cohort_announcement_rules() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'UPDATE' and (new.cohort_id <> old.cohort_id or new.author_id <> old.author_id) then
    raise exception 'An announcement stays with its cohort.';
  end if;
  new.sent_at := null; new.issue_url := null; new.problem := null;
  return new;
end;
$$;
create trigger cohort_announcement_rules before insert or update on public.cohort_announcements
  for each row execute function private.cohort_announcement_rules();

-- Breakouts may carry the cohort's own group names; without names the rooms
-- are numbered as before.
drop function if exists public.launch_breakouts(uuid, jsonb);
create function public.launch_breakouts(session uuid, rooms jsonb, names jsonb default null) returns integer
language plpgsql security definer set search_path to 'public' as $$
declare
  c uuid;
  n integer := jsonb_array_length(rooms);
  i integer;
  u text;
  g uuid;
  nm text;
begin
  select s.cohort_id into c from public.sessions s where s.id = session;
  if c is null or not private.teaches(c) or not private.not_an_agent() then
    raise exception 'Only a leader of this cohort can do this.';
  end if;
  if n < 1 or n > 40 then raise exception 'Choose from 1 to 40 rooms.'; end if;
  perform public.end_breakouts(c);
  for i in 0 .. n - 1 loop
    select b.url into u from public.breakout_rooms b
     where b.leased_until is null or b.leased_until < now()
     order by b.leased_until nulls first, b.url limit 1 for update skip locked;
    if u is null then raise exception 'Only % rooms are free right now.', i; end if;
    delete from public.groups where breakout and meet_url = u;
    update public.breakout_rooms set cohort_id = c, leased_until = now() + interval '4 hours' where url = u;
    nm := nullif(btrim(left(coalesce(names ->> i, ''), 60)), '');
    insert into public.groups (cohort_id, name, meet_url, breakout)
    values (c, coalesce(nm, 'Room ' || (i + 1)), u, true) returning id into g;
    insert into public.group_members (group_id, user_id)
    select g, m.id from (select (x)::uuid as id from jsonb_array_elements_text(rooms -> i) x) m
     where exists (select 1 from public.enrollments e where e.cohort_id = c and e.user_id = m.id and e.status <> 'left')
        or exists (select 1 from public.call_guests k where k.cohort_id = c and k.user_id = m.id);
  end loop;
  return n;
end;
$$;
revoke all on function public.launch_breakouts(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.launch_breakouts(uuid, jsonb, jsonb) to authenticated;
