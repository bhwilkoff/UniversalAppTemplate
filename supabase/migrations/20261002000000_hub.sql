-- humanshaped.org hub: the first schema.
--
-- What this database holds, and what it never holds (DECISIONS.md,
-- "Students own their data, on GitHub"): it keeps who is in which
-- cohort, the cohort's schedule and groups, and the things a person
-- chooses to share with their cohort. It never copies anyone's code or
-- repository, and when someone leaves a cohort, what they shared there
-- leaves with them. Every table has row-level security, because the
-- static site talks to this database directly from the browser.

-- ---------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  github_login  text not null unique,
  github_id     bigint unique,
  display_name  text,
  avatar_url    text,
  created_at    timestamptz not null default now()
);

-- Teachers can create and run cohorts. Ben is the first; others are
-- invited by adding a row here (DECISIONS.md, "Teachers").
create table public.teachers (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  invited_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);

-- A profile is created from the GitHub account the first time someone
-- signs in.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, github_login, github_id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'user_name', new.raw_user_meta_data ->> 'preferred_username', new.email),
    nullif(new.raw_user_meta_data ->> 'provider_id', '')::bigint,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Cohorts: content a teacher creates (nothing about any cohort is
-- hard-coded in the site).
-- ---------------------------------------------------------------------

create type public.cohort_status as enum ('draft', 'open', 'running', 'finished');

create table public.cohorts (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title                text not null,
  description          text,
  status               public.cohort_status not null default 'draft',
  starts_on            date,
  weeks                smallint not null default 5 check (weeks between 1 and 26),
  time_zone            text not null default 'America/Denver',
  session_weekday      smallint check (session_weekday between 0 and 6),
  session_time         time,
  session_minutes      smallint not null default 75 check (session_minutes between 15 and 240),
  capacity             smallint check (capacity > 0),
  conversations_open   boolean not null default false,
  details              jsonb not null default '{}'::jsonb,
  created_by           uuid not null references public.profiles (id),
  created_at           timestamptz not null default now()
);

create table public.cohort_teachers (
  cohort_id  uuid references public.cohorts (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete cascade,
  primary key (cohort_id, user_id)
);

-- The live sessions, one per week by default.
create table public.sessions (
  id            uuid primary key default gen_random_uuid(),
  cohort_id     uuid not null references public.cohorts (id) on delete cascade,
  number        smallint not null,
  starts_at     timestamptz,
  title         text,
  scope         text,          -- this week's challenge, in the teacher's words
  meet_url      text,
  recording_url text,
  unique (cohort_id, number)
);

create type public.member_role as enum ('student', 'mentor');
create type public.member_status as enum ('enrolled', 'finished', 'left');

create table public.enrollments (
  cohort_id   uuid references public.cohorts (id) on delete cascade,
  user_id     uuid references public.profiles (id) on delete cascade,
  role        public.member_role not null default 'student',
  status      public.member_status not null default 'enrolled',
  app_name    text,
  app_repo    text check (app_repo is null or app_repo ~ '^[A-Za-z0-9-]+/[A-Za-z0-9._-]+$'),
  app_url     text,
  joined_at   timestamptz not null default now(),
  primary key (cohort_id, user_id)
);

-- Pairs, trios, or small groups, easy to change and visible to the
-- people in them (DECISIONS.md, "Groups").
create table public.groups (
  id            uuid primary key default gen_random_uuid(),
  cohort_id     uuid not null references public.cohorts (id) on delete cascade,
  name          text not null,
  expectations  text
);

create table public.group_members (
  group_id  uuid references public.groups (id) on delete cascade,
  user_id   uuid references public.profiles (id) on delete cascade,
  primary key (group_id, user_id)
);

-- ---------------------------------------------------------------------
-- What people choose to share, and the feedback on it.
-- ---------------------------------------------------------------------

create type public.share_kind as enum ('bring-back', 'for-feedback', 'ai-review', 'question');

create table public.shares (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   uuid not null references public.cohorts (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  session_id  uuid references public.sessions (id) on delete set null,
  kind        public.share_kind not null,
  url         text check (url is null or url ~ '^https://'),
  note        text check (char_length(note) <= 4000),
  created_at  timestamptz not null default now()
);

create table public.feedback (
  id          uuid primary key default gen_random_uuid(),
  share_id    uuid not null references public.shares (id) on delete cascade,
  author_id   uuid not null references public.profiles (id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 8000),
  created_at  timestamptz not null default now()
);

-- The credential, issued after a cohort (DECISIONS.md, "The
-- credential"): one level for a live web app, one more per platform.
create table public.credentials (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  cohort_id       uuid references public.cohorts (id) on delete set null,
  platforms       text[] not null default '{web}',
  evidence_repo   text not null,
  credential_url  text,
  issued_by       uuid not null references public.profiles (id),
  issued_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Who may see what. Helper functions run with definer rights so that a
-- policy can ask "is this person in this cohort?" without recursing
-- through the policies on enrollments.
-- ---------------------------------------------------------------------

create function public.is_hub_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teachers where user_id = auth.uid());
$$;

create function public.teaches(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.cohort_teachers where cohort_id = c and user_id = auth.uid())
      or exists (select 1 from public.cohorts where id = c and created_by = auth.uid());
$$;

-- Whoever creates a cohort teaches it, recorded at once so the new
-- cohort is readable by its creator in the same request.
create function public.add_creator_as_teacher() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.cohort_teachers (cohort_id, user_id) values (new.id, new.created_by)
  on conflict do nothing;
  return new;
end;
$$;

create trigger on_cohort_created
  after insert on public.cohorts
  for each row execute function public.add_creator_as_teacher();

create function public.in_cohort(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.enrollments
    where cohort_id = c and user_id = auth.uid() and status <> 'left'
  ) or public.teaches(c);
$$;

-- Alumni (anyone holding the credential) may see finished cohorts, not
-- live ones (DECISIONS.md, "Alumni").
create function public.is_alum() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.credentials where user_id = auth.uid());
$$;

create function public.shares_a_cohort_with(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.enrollments mine
    join public.enrollments theirs on theirs.cohort_id = mine.cohort_id
    where mine.user_id = auth.uid() and mine.status <> 'left'
      and theirs.user_id = other and theirs.status <> 'left'
  ) or exists (
    select 1 from public.cohort_teachers t
    join public.enrollments e on e.cohort_id = t.cohort_id
    where (t.user_id = auth.uid() and e.user_id = other)
       or (t.user_id = other and e.user_id = auth.uid())
  );
$$;

alter table public.profiles        enable row level security;
alter table public.teachers        enable row level security;
alter table public.cohorts         enable row level security;
alter table public.cohort_teachers enable row level security;
alter table public.sessions        enable row level security;
alter table public.enrollments     enable row level security;
alter table public.groups          enable row level security;
alter table public.group_members   enable row level security;
alter table public.shares          enable row level security;
alter table public.feedback        enable row level security;
alter table public.credentials     enable row level security;

-- profiles: yourself, and the people you share a cohort with.
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.shares_a_cohort_with(id) or public.is_hub_teacher());
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- teachers: readable by signed-in people; changed only by hand (service role).
create policy teachers_read on public.teachers for select to authenticated using (true);

-- cohorts: anyone may read open, running, and finished cohorts (the
-- public cohort pages); drafts only by their teachers.
create policy cohorts_read on public.cohorts for select to anon, authenticated
  using (status <> 'draft' or created_by = auth.uid() or public.teaches(id));
create policy cohorts_create on public.cohorts for insert to authenticated
  with check (public.is_hub_teacher() and created_by = auth.uid());
create policy cohorts_update on public.cohorts for update to authenticated
  using (public.teaches(id)) with check (public.teaches(id));
create policy cohorts_delete on public.cohorts for delete to authenticated
  using (public.teaches(id) and status = 'draft');

-- cohort_teachers: public, so a cohort page can say who teaches it.
create policy cohort_teachers_read on public.cohort_teachers for select to anon, authenticated using (true);
-- Other teachers are added to a cohort by one of its teachers.
create policy cohort_teachers_add on public.cohort_teachers for insert to authenticated
  with check (public.teaches(cohort_id) and exists (select 1 from public.teachers t where t.user_id = cohort_teachers.user_id));

-- sessions: members, teachers, and alumni of finished cohorts.
create policy sessions_read on public.sessions for select to authenticated
  using (public.in_cohort(cohort_id) or (public.is_alum() and exists (
    select 1 from public.cohorts c where c.id = cohort_id and c.status = 'finished')));
create policy sessions_write on public.sessions for all to authenticated
  using (public.teaches(cohort_id)) with check (public.teaches(cohort_id));

-- enrollments: people in the cohort see one another; you join an open
-- cohort yourself, edit your own app details, and can leave.
create policy enrollments_read on public.enrollments for select to authenticated
  using (user_id = auth.uid() or public.in_cohort(cohort_id));
create policy enrollments_join on public.enrollments for insert to authenticated
  with check (user_id = auth.uid() and role = 'student' and status = 'enrolled' and exists (
    select 1 from public.cohorts c where c.id = cohort_id and c.status = 'open'));
create policy enrollments_update_own on public.enrollments for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and role = 'student');
create policy enrollments_teacher on public.enrollments for update to authenticated
  using (public.teaches(cohort_id)) with check (public.teaches(cohort_id));

-- groups: visible to the cohort, arranged by the teacher.
create policy groups_read on public.groups for select to authenticated using (public.in_cohort(cohort_id));
create policy groups_write on public.groups for all to authenticated
  using (public.teaches(cohort_id)) with check (public.teaches(cohort_id));
create policy group_members_read on public.group_members for select to authenticated
  using (exists (select 1 from public.groups g where g.id = group_id and public.in_cohort(g.cohort_id)));
create policy group_members_write on public.group_members for all to authenticated
  using (exists (select 1 from public.groups g where g.id = group_id and public.teaches(g.cohort_id)))
  with check (exists (select 1 from public.groups g where g.id = group_id and public.teaches(g.cohort_id)));

-- shares: the cohort sees them; only the person who shared can change
-- or delete them.
create policy shares_read on public.shares for select to authenticated using (public.in_cohort(cohort_id));
create policy shares_create on public.shares for insert to authenticated
  with check (user_id = auth.uid() and public.in_cohort(cohort_id));
create policy shares_update_own on public.shares for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy shares_delete_own on public.shares for delete to authenticated using (user_id = auth.uid());

-- feedback: anyone in the cohort can read and give it; authors can take
-- back their own.
create policy feedback_read on public.feedback for select to authenticated
  using (exists (select 1 from public.shares s where s.id = share_id and public.in_cohort(s.cohort_id)));
create policy feedback_create on public.feedback for insert to authenticated
  with check (author_id = auth.uid() and exists (
    select 1 from public.shares s where s.id = share_id and public.in_cohort(s.cohort_id)));
create policy feedback_delete_own on public.feedback for delete to authenticated using (author_id = auth.uid());

-- credentials: public, because a credential is meant to be shown;
-- issued only by a teacher of the cohort.
create policy credentials_read on public.credentials for select to anon, authenticated using (true);
create policy credentials_issue on public.credentials for insert to authenticated
  with check (issued_by = auth.uid() and cohort_id is not null and public.teaches(cohort_id));

-- ---------------------------------------------------------------------
-- Leaving. When someone leaves a cohort, what they shared there leaves
-- with them, and they can remove their whole account themselves.
-- ---------------------------------------------------------------------

create function public.leave_cohort(c uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.shares where cohort_id = c and user_id = auth.uid();
  delete from public.group_members gm using public.groups g
    where gm.group_id = g.id and g.cohort_id = c and gm.user_id = auth.uid();
  update public.enrollments set status = 'left', app_name = null, app_repo = null, app_url = null
    where cohort_id = c and user_id = auth.uid();
end;
$$;

create function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.users where id = auth.uid();  -- cascades through every table above
end;
$$;

revoke all on function public.leave_cohort(uuid), public.delete_my_account() from public, anon;
grant execute on function public.leave_cohort(uuid), public.delete_my_account() to authenticated;
