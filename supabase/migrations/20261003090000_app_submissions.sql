-- Submitting an app, and a teacher's hide (DECISIONS.md, "Showing apps
-- in public", October 3, 2026).
--
-- Ben: "The student should opt in when they say that the app is ready.
-- But, every student must submit their app to be included by the end of
-- the cohort." And: "It will always be a part of the cohort, but there
-- are many reasons to not include an app publicly."
--
-- So two people each hold one switch, and neither can move the other's:
--
-- - The student's "it is ready" is enrollments.app_public (migration
--   20261003055000). Submitting means that switch is on, with a
--   repository and a live address. Only the student moves it, in either
--   direction, and leaving turns it off. Until now a teacher could turn
--   it off; that is what the hide is for now, so a teacher taking an app
--   out of public view never erases the student's own word that it is
--   ready (and never makes them look as if they had not submitted).
--
-- - The teacher's hide is a row in app_hides, with a short reason the
--   teacher may write. It lives in its own table rather than on
--   enrollments because classmates can read every column of one another's
--   enrollment, and why an app is kept out of public view is between the
--   student and their teachers. The student always sees that their app is
--   hidden, and why, so nothing is hidden from them. Only a teacher of
--   the cohort can hide or show an app (Ben, through the cohorts he
--   teaches, or by hand in the dashboard); the student and their
--   classmates cannot write this table at all.
--
-- A hidden app never appears in public_apps(), so it leaves /apps/ and
-- the feed, and it stays on the cohort's own pages, which read
-- enrollments and never this table.

-- ---------------------------------------------------------------------
-- The student's switch: theirs alone, both ways.
-- ---------------------------------------------------------------------

create or replace function private.guard_app_public() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'left' then
    new.app_public := false;
    return new;
  end if;
  if new.app_public is distinct from old.app_public and new.user_id is distinct from auth.uid() then
    raise exception 'Only the student can say their app is ready to show. A teacher can hide it from public view instead.';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_app_public() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- The teacher's hide.
-- ---------------------------------------------------------------------

create table public.app_hides (
  cohort_id  uuid not null,
  user_id    uuid not null,
  reason     text check (reason is null or char_length(reason) between 1 and 500),
  hidden_by  uuid references public.profiles (id) on delete set null,
  hidden_at  timestamptz not null default now(),
  primary key (cohort_id, user_id),
  foreign key (cohort_id, user_id) references public.enrollments (cohort_id, user_id) on delete cascade
);

alter table public.app_hides enable row level security;

-- The student sees their own; the cohort's teachers see the cohort's.
create policy app_hides_read on public.app_hides for select to authenticated
  using (user_id = auth.uid() or private.teaches(cohort_id));

-- A teacher of the cohort hides an app, in their own name, changes the
-- reason, or shows it again. Nobody hides their own app this way: the
-- student's way out of public view is their own switch.
create policy app_hides_hide on public.app_hides for insert to authenticated
  with check (private.teaches(cohort_id) and hidden_by = auth.uid() and user_id <> auth.uid());
create policy app_hides_change on public.app_hides for update to authenticated
  using (private.teaches(cohort_id))
  with check (private.teaches(cohort_id) and hidden_by = auth.uid() and user_id <> auth.uid());
create policy app_hides_show on public.app_hides for delete to authenticated
  using (private.teaches(cohort_id));

-- A student's agent reads, and never writes (migration 6), and neither
-- does a teacher's.
create policy agents_cannot_insert on public.app_hides as restrictive
  for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.app_hides as restrictive
  for update to authenticated using (private.not_an_agent());
create policy agents_cannot_delete on public.app_hides as restrictive
  for delete to authenticated using (private.not_an_agent());

-- ---------------------------------------------------------------------
-- The public list leaves hidden apps out.
-- ---------------------------------------------------------------------

create or replace function public.public_apps()
returns table (app_name text, app_repo text, app_url text)
language sql stable security definer set search_path = '' as $$
  select e.app_name, e.app_repo, e.app_url
  from public.enrollments e
  join public.cohorts c on c.id = e.cohort_id
  where e.app_public
    and e.status <> 'left'
    and e.app_repo is not null
    and c.status <> 'draft'
    and not exists (
      select 1 from public.app_hides h
      where h.cohort_id = e.cohort_id and h.user_id = e.user_id)
  order by lower(e.app_repo);
$$;

revoke all on function public.public_apps() from public;
grant execute on function public.public_apps() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Leaving takes the hide with it, along with the app it was about
-- (leave_cohort already clears the app's name, repository, and address).
-- ---------------------------------------------------------------------

create or replace function public.leave_cohort(c uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not private.not_an_agent() then
    raise exception 'Leaving a cohort is done by the person, on humanshaped.org.';
  end if;
  delete from public.shares where cohort_id = c and user_id = auth.uid();
  delete from public.live_queue where cohort_id = c and user_id = auth.uid();
  delete from public.live_answers where cohort_id = c and user_id = auth.uid();
  delete from public.group_members gm using public.groups g
    where gm.group_id = g.id and g.cohort_id = c and gm.user_id = auth.uid();
  delete from public.calendar_contacts where cohort_id = c and user_id = auth.uid();
  delete from public.app_hides where cohort_id = c and user_id = auth.uid();
  update public.enrollments set status = 'left', app_name = null, app_repo = null, app_url = null
    where cohort_id = c and user_id = auth.uid();
end;
$$;
