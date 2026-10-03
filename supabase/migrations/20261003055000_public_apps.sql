-- A cohort member may choose to show their app on humanshaped.org/apps/
-- (research/notes/hub-privacy-notes.md). Who is in a cohort stays private
-- to the cohort: the public never reads enrollments. It reads only the
-- name, repository, and address of apps their students chose to show,
-- through public_apps(), and nothing about the cohort or the person.

alter table public.enrollments
  add column app_public boolean not null default false;

-- Only the student can turn it on. Anyone who can already change the row
-- (a teacher of the cohort) may turn it off, and leaving turns it off.
create function private.guard_app_public() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.status = 'left' then
    new.app_public := false;
  end if;
  if new.app_public and not old.app_public and new.user_id is distinct from auth.uid() then
    raise exception 'Only the student can choose to show their app in public.';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_app_public() from public, anon, authenticated;

create trigger enrollments_guard_app_public
  before update on public.enrollments
  for each row execute function private.guard_app_public();

-- The public list: three fields, for shown apps in cohorts that are not
-- drafts, and only while the student is still in the cohort.
create function public.public_apps()
returns table (app_name text, app_repo text, app_url text)
language sql stable security definer set search_path = '' as $$
  select e.app_name, e.app_repo, e.app_url
  from public.enrollments e
  join public.cohorts c on c.id = e.cohort_id
  where e.app_public
    and e.status <> 'left'
    and e.app_repo is not null
    and c.status <> 'draft'
  order by lower(e.app_repo);
$$;

revoke all on function public.public_apps() from public;
grant execute on function public.public_apps() to anon, authenticated;
