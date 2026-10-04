-- A builder outside any cohort has a place on the hub (VISION.md: "a
-- digital hub for anyone building software for people instead of
-- profit", with "many different entry points"; research/notes/
-- hub-privacy-notes.md, "Apps outside a cohort", October 4, 2026).
--
-- Until now an app reached the hub only through a cohort's enrollment or
-- through the directory's issue form. Here a signed-in person keeps one
-- app of their own, outside any cohort, and only they can say whether it
-- shows on /apps/. It is the same three things a cohort app shows (its
-- name, repository, and address), read through public_apps(), and
-- nothing about the person.
--
-- With no teacher, the hide belongs to the people who already decide who
-- teaches (teachers with can_approve, Ben first). A hide is a row of its
-- own, like app_hides, so taking an app out of public view never moves
-- the builder's own switch, and the builder always sees that it is
-- hidden, and why.

create table public.builder_apps (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  app_repo    text not null check (app_repo ~ '^[A-Za-z0-9-]+/[A-Za-z0-9._-]+$' and char_length(app_repo) <= 140),
  app_name    text check (app_name is null or char_length(app_name) between 1 and 120),
  app_url     text check (app_url is null or (app_url ~ '^https://' and char_length(app_url) <= 500)),
  public      boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.builder_apps enable row level security;

-- The builder reads and writes their own. Approvers read the ones shown
-- in public, so they can hide one; everyone else reads them only through
-- public_apps(), which leaves out who the builder is.
create policy builder_apps_read on public.builder_apps for select to authenticated
  using (user_id = auth.uid() or (public and private.can_approve_teachers()));
create policy builder_apps_add on public.builder_apps for insert to authenticated
  with check (user_id = auth.uid());
create policy builder_apps_change on public.builder_apps for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy builder_apps_remove on public.builder_apps for delete to authenticated
  using (user_id = auth.uid());

-- The database keeps the times, and the row stays its owner's.
create function private.keep_builder_app() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    if new.user_id <> old.user_id then
      raise exception 'An app stays with the person who added it.';
    end if;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.keep_builder_app() from public, anon, authenticated;
create trigger builder_apps_keep before insert or update on public.builder_apps
  for each row execute function private.keep_builder_app();

-- A person's agent reads, and never writes (migration 6).
create policy agents_cannot_insert on public.builder_apps as restrictive
  for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.builder_apps as restrictive
  for update to authenticated using (private.not_an_agent());
create policy agents_cannot_delete on public.builder_apps as restrictive
  for delete to authenticated using (private.not_an_agent());

-- ---------------------------------------------------------------------
-- The approvers' hide.
-- ---------------------------------------------------------------------

create table public.builder_app_hides (
  user_id    uuid primary key references public.builder_apps (user_id) on delete cascade,
  reason     text check (reason is null or char_length(reason) between 1 and 500),
  hidden_by  uuid references public.profiles (id) on delete set null,
  hidden_at  timestamptz not null default now()
);

alter table public.builder_app_hides enable row level security;

create policy builder_app_hides_read on public.builder_app_hides for select to authenticated
  using (user_id = auth.uid() or private.can_approve_teachers());
create policy builder_app_hides_hide on public.builder_app_hides for insert to authenticated
  with check (private.can_approve_teachers() and hidden_by = auth.uid() and user_id <> auth.uid());
create policy builder_app_hides_change on public.builder_app_hides for update to authenticated
  using (private.can_approve_teachers())
  with check (private.can_approve_teachers() and hidden_by = auth.uid() and user_id <> auth.uid());
create policy builder_app_hides_show on public.builder_app_hides for delete to authenticated
  using (private.can_approve_teachers());

create policy agents_cannot_insert on public.builder_app_hides as restrictive
  for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.builder_app_hides as restrictive
  for update to authenticated using (private.not_an_agent());
create policy agents_cannot_delete on public.builder_app_hides as restrictive
  for delete to authenticated using (private.not_an_agent());

-- ---------------------------------------------------------------------
-- The public list: cohort apps exactly as before, then builders' own,
-- each saying which it is, so /apps/ can label them honestly.
-- ---------------------------------------------------------------------

drop function public.public_apps();
create function public.public_apps()
returns table (app_name text, app_repo text, app_url text, kind text)
language sql stable security definer set search_path = '' as $$
  select app_name, app_repo, app_url, kind from (
    select e.app_name, e.app_repo, e.app_url, 'cohort'::text as kind
    from public.enrollments e
    join public.cohorts c on c.id = e.cohort_id
    where e.app_public
      and e.status <> 'left'
      and e.app_repo is not null
      and c.status <> 'draft'
      and not exists (
        select 1 from public.app_hides h
        where h.cohort_id = e.cohort_id and h.user_id = e.user_id)
    union all
    select b.app_name, b.app_repo, b.app_url, 'builder'::text
    from public.builder_apps b
    where b.public
      and not exists (select 1 from public.builder_app_hides h where h.user_id = b.user_id)
  ) apps
  order by (kind = 'builder'), lower(app_repo);
$$;

revoke all on function public.public_apps() from public;
grant execute on function public.public_apps() to anon, authenticated;
