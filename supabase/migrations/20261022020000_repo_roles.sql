-- What each person may do in their cohort's repository on GitHub, set on
-- humanshaped.org and carried to GitHub by the cohort-access function
-- (research/notes/cohort-repository-design.md). Ben, October 22, 2026:
-- "allow for granular controls within HumanShaped.org and have those flow
-- through to github."
--
-- The roles are GitHub's own five, less admin, which stays with the
-- organization's owners. A learner writes unless a leader of the cohort
-- chooses otherwise; a leader always maintains. Only set_repo_role writes
-- a choice, and each choice says who made it and when.

create type public.repo_role as enum ('read', 'triage', 'write', 'maintain');

create table public.repo_roles (
  cohort_id  uuid references public.cohorts (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete cascade,
  role       public.repo_role not null,
  set_by     uuid not null references public.profiles (id),
  set_at     timestamptz not null default now(),
  primary key (cohort_id, user_id)
);

alter table public.repo_roles enable row level security;

create policy repo_roles_read on public.repo_roles for select to authenticated
  using (user_id = auth.uid() or private.teaches(cohort_id));

-- What GitHub holds now, written by the cohort-access function alone.
alter table public.github_access add column repo_role public.repo_role;

create function public.set_repo_role(c uuid, u uuid, r public.repo_role)
returns public.repo_role
language plpgsql security definer set search_path = '' as $$
begin
  if not private.not_an_agent() then
    raise exception 'Changing who may do what is done by a person, on humanshaped.org.';
  end if;
  if not private.teaches(c) then
    raise exception 'Only a leader of this cohort can change what someone may do in its repository.';
  end if;
  if exists (select 1 from public.cohort_teachers where cohort_id = c and user_id = u) then
    raise exception 'A leader always maintains the repository.';
  end if;
  if not exists (select 1 from public.enrollments where cohort_id = c and user_id = u and status <> 'left') then
    raise exception 'That person is not in this cohort.';
  end if;
  insert into public.repo_roles (cohort_id, user_id, role, set_by)
    values (c, u, r, auth.uid())
    on conflict (cohort_id, user_id) do update set role = excluded.role, set_by = excluded.set_by, set_at = now();
  return r;
end;
$$;
revoke all on function public.set_repo_role(uuid, uuid, public.repo_role) from public, anon;
grant execute on function public.set_repo_role(uuid, uuid, public.repo_role) to authenticated;
