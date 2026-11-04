-- Reminders (research/notes/notifications-notes.md). One list of what is
-- open for each person, carried to them by GitHub: the app comments on an
-- issue in that person's own private repository, and GitHub sends the
-- email. Ben, November 4, 2026: "Ideally the notifications come from
-- Github and therefore it is Github who is sending them." On by default;
-- a person stops them on /account/.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table public.reminder_choices (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  stopped    boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.reminder_choices enable row level security;
create policy reminder_choices_own_read on public.reminder_choices for select to authenticated
  using (user_id = auth.uid() and private.not_an_agent());
create policy reminder_choices_own_insert on public.reminder_choices for insert to authenticated
  with check (user_id = auth.uid() and private.not_an_agent());
create policy reminder_choices_own_update on public.reminder_choices for update to authenticated
  using (user_id = auth.uid() and private.not_an_agent()) with check (user_id = auth.uid());

-- Written only by the reminders function, so no policy reads it.
create table public.reminder_threads (
  user_id        uuid not null references public.profiles (id) on delete cascade,
  cohort_id      uuid not null references public.cohorts (id) on delete cascade,
  repo           text not null,
  issue_number   int not null,
  last_digest_on date,
  events_seen_at timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  primary key (user_id, cohort_id)
);
alter table public.reminder_threads enable row level security;

create function private.open_items(only_person uuid default null)
returns table (user_id uuid, cohort_id uuid, slug text, kind text, session_number int, starts_at timestamptz, amount int, token text, label text)
language sql stable security definer set search_path = '' as $$
  with people as (
    select e.user_id, e.app_repo, e.app_url, c.id as cohort_id, c.slug, c.github_repo, n.id as session_id, n.number, n.starts_at,
           case when jsonb_typeof(n.prep_questions) = 'array' then n.prep_questions else '[]'::jsonb end as prep
      from public.enrollments e
      join public.cohorts c on c.id = e.cohort_id and c.status in ('open', 'running')
      left join lateral (
        select s.* from public.sessions s
         where s.cohort_id = c.id and s.starts_at > now() order by s.starts_at limit 1
      ) n on true
     where e.status <> 'left' and (only_person is null or e.user_id = only_person)
  )
  select p.user_id, p.cohort_id, p.slug, 'prep', p.number::int, p.starts_at, u.left_to_answer, null, null
    from people p
    cross join lateral (
      select count(*)::int as left_to_answer from jsonb_array_elements(p.prep) q
       where q->>'kind' is distinct from 'exchange' and q->>'id' is not null
         and not exists (select 1 from public.prep_answers a
                          where a.session_id = p.session_id and a.user_id = p.user_id and a.question_id = q->>'id')
    ) u
   where u.left_to_answer > 0
  union all
  select p.user_id, p.cohort_id, p.slug, 'exchange', p.number::int, p.starts_at, 1, x.token, x.title
    from people p
    cross join lateral jsonb_array_elements(p.prep) q
    join public.exchanges x on x.token = q->>'token'
   where q->>'kind' = 'exchange'
     and not exists (select 1 from public.exchange_posts ep where ep.exchange_id = x.id and ep.author_id = p.user_id)
  union all
  select p.user_id, p.cohort_id, p.slug, 'repo', null, null, 1, null, null
    from people p where p.app_repo is null or p.app_url is null
  union all
  select p.user_id, p.cohort_id, p.slug, 'invite', null, null, 1, null, null
    from people p
    join public.github_access g on g.cohort_id = p.cohort_id and g.user_id = p.user_id
   where g.state = 'invited';
$$;
revoke all on function private.open_items(uuid) from public, anon, authenticated;

create function public.my_open_items()
returns table (cohort_id uuid, slug text, kind text, session_number int, starts_at timestamptz, amount int, token text, label text)
language sql stable security definer set search_path = '' as $$
  select o.cohort_id, o.slug, o.kind, o.session_number, o.starts_at, o.amount, o.token, o.label
    from private.open_items(auth.uid()) o
   where auth.uid() is not null and private.not_an_agent();
$$;
revoke all on function public.my_open_items() from public, anon;
grant execute on function public.my_open_items() to authenticated;

create function public.reminder_open_items()
returns table (user_id uuid, cohort_id uuid, slug text, kind text, session_number int, starts_at timestamptz, amount int, token text, label text)
language sql stable security definer set search_path = '' as $$
  select * from private.open_items(null);
$$;
revoke all on function public.reminder_open_items() from public, anon, authenticated;
grant execute on function public.reminder_open_items() to service_role;

-- What happened to a person since a moment, as a kind and a place to go.
-- Never the words themselves, which stay where they were written.
create function public.reminder_events(since timestamptz)
returns table (user_id uuid, cohort_id uuid, kind text, at timestamptz, token text)
language sql stable security definer set search_path = '' as $$
  select n.student_id, n.cohort_id, 'note', n.created_at, null from public.teacher_notes n
   where n.created_at > since and n.author_id <> n.student_id
  union all
  select s.user_id, s.cohort_id, 'feedback', f.created_at, null
    from public.feedback f join public.shares s on s.id = f.share_id
   where f.created_at > since and f.author_id <> s.user_id
  union all
  select x.created_by, x.cohort_id, 'video', p.created_at, x.token
    from public.exchange_posts p join public.exchanges x on x.id = p.exchange_id
   where p.created_at > since and p.author_id <> x.created_by and x.cohort_id is not null
  union all
  select mine.author_id, x.cohort_id, 'reply', p.created_at, x.token
    from public.exchange_posts p
    join public.exchange_posts mine on mine.id = p.reply_to
    join public.exchanges x on x.id = p.exchange_id
   where p.created_at > since and p.author_id <> mine.author_id
     and mine.author_id <> x.created_by and x.cohort_id is not null;
$$;
revoke all on function public.reminder_events(timestamptz) from public, anon, authenticated;
grant execute on function public.reminder_events(timestamptz) to service_role;

-- Work shared for feedback that no leader of the cohort has answered.
create function public.reminder_leader_items()
returns table (cohort_id uuid, waiting int)
language sql stable security definer set search_path = '' as $$
  select s.cohort_id, count(*)::int
    from public.shares s
    join public.cohorts c on c.id = s.cohort_id and c.status in ('open', 'running')
   where s.kind in ('for-feedback', 'question')
     and not exists (select 1 from public.feedback f
                       join public.cohort_teachers t on t.user_id = f.author_id and t.cohort_id = s.cohort_id
                      where f.share_id = s.id)
   group by s.cohort_id;
$$;
revoke all on function public.reminder_leader_items() from public, anon, authenticated;
grant execute on function public.reminder_leader_items() to service_role;

-- The daily email from Apps Script is replaced, so it finds nobody.
update public.reach_choices set notices = false where notices;
