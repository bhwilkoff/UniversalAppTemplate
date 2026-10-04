-- Google sign-in beside GitHub (DECISIONS.md, "Google sign-in beside
-- GitHub", October 4): inside Meet, people sign in with Google in one tap,
-- and link their GitHub account once, because cohorts, repositories, and
-- discussions all work through GitHub.
--
-- What changes here:
-- 1. A profile can exist before it has a GitHub account: github_login is
--    empty until GitHub is linked.
-- 2. A profile's GitHub fields come only from a GitHub identity, decided
--    by the provider Supabase records (raw_app_meta_data.provider, which
--    the person cannot set), never from metadata someone could type at
--    sign-up. Before this, an email sign-up could claim any GitHub name
--    nobody had used yet. Google's account number (often 21 digits) is
--    never read as a GitHub id.
-- 3. Linking GitHub later (auth.identities) fills in the GitHub fields;
--    unlinking it empties them.
-- 4. Joining a cohort needs a linked GitHub account, since cohort-access
--    adds people to the cohort's team by their GitHub name.

alter table public.profiles alter column github_login drop not null;

-- The GitHub name and number in a set of GitHub claims, or nulls. A
-- number is used only when it fits a bigint (GitHub's ids do).
create function private.github_claims(meta jsonb, out login text, out gh_id bigint)
language plpgsql immutable set search_path = '' as $$
begin
  login := nullif(coalesce(meta ->> 'user_name', meta ->> 'preferred_username'), '');
  gh_id := case when coalesce(meta ->> 'provider_id', '') ~ '^[0-9]{1,18}$' then (meta ->> 'provider_id')::bigint end;
end;
$$;
revoke all on function private.github_claims(jsonb) from public, anon, authenticated;

-- The provider a new account was made with. Supabase always records it;
-- the test database leaves it out, so an account with no recorded
-- provider and a GitHub name is treated as GitHub (as every account was
-- before this migration).
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  provider text := new.raw_app_meta_data ->> 'provider';
  is_github boolean;
  gh record;
begin
  is_github := provider = 'github' or (provider is null and new.raw_user_meta_data ? 'user_name');
  select * into gh from private.github_claims(new.raw_user_meta_data);
  insert into public.profiles (id, github_login, github_id, display_name, avatar_url)
  values (
    new.id,
    case when is_github then gh.login end,
    case when is_github then gh.gh_id end,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  if is_github and lower(gh.login) = 'bhwilkoff' then
    insert into public.teachers (user_id, can_approve, can_sign) values (new.id, true, true)
      on conflict (user_id) do update set can_approve = true, can_sign = true;
  end if;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

-- GitHub linked to an account that began with Google: its GitHub name,
-- number, and (if it had none) picture. An account keeps the GitHub it
-- already has; Supabase itself refuses one GitHub on two accounts.
create function private.on_identity_linked() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  gh record;
begin
  if new.provider <> 'github' then return new; end if;
  select * into gh from private.github_claims(new.identity_data);
  if gh.login is null then return new; end if;
  update public.profiles
     set github_login = gh.login,
         github_id = coalesce(gh.gh_id, github_id),
         avatar_url = coalesce(avatar_url, new.identity_data ->> 'avatar_url')
   where id = new.user_id and github_login is null;
  if lower(gh.login) = 'bhwilkoff' then
    insert into public.teachers (user_id, can_approve, can_sign) values (new.user_id, true, true)
      on conflict (user_id) do update set can_approve = true, can_sign = true;
  end if;
  return new;
end;
$$;
revoke all on function private.on_identity_linked() from public, anon, authenticated;

-- GitHub unlinked: the profile no longer claims that GitHub name.
create function private.on_identity_unlinked() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.provider = 'github' then
    update public.profiles set github_login = null, github_id = null where id = old.user_id;
  end if;
  return old;
end;
$$;
revoke all on function private.on_identity_unlinked() from public, anon, authenticated;

create trigger on_identity_linked after insert on auth.identities
  for each row execute function private.on_identity_linked();
create trigger on_identity_unlinked after delete on auth.identities
  for each row execute function private.on_identity_unlinked();

-- Joining a cohort, by any path (the join rule, join_as_mentor, or a
-- teacher), needs the person's GitHub, because the cohort's conversation
-- and team are on GitHub.
create function private.enrollment_needs_github() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = new.user_id and github_login is not null) then
    raise exception 'Link your GitHub account first, on your account page, to join a cohort.';
  end if;
  return new;
end;
$$;
revoke all on function private.enrollment_needs_github() from public, anon, authenticated;
create trigger enrollments_need_github before insert on public.enrollments
  for each row execute function private.enrollment_needs_github();

-- A person may still change their own display name and picture, but never
-- their GitHub name or number: those come only from a linked GitHub
-- identity, written by the sign-in system (which has no signed-in person
-- in the database session). Before this, someone could have set another
-- person's GitHub name on their own profile, and cohort-access would have
-- added that other person to the cohort's private team.
create function private.keep_github_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and (new.github_login is distinct from old.github_login or new.github_id is distinct from old.github_id) then
    raise exception 'Your GitHub name comes from the GitHub account you link, and cannot be typed in.';
  end if;
  return new;
end;
$$;
revoke all on function private.keep_github_fields() from public, anon, authenticated;
create trigger profiles_keep_github_fields before update on public.profiles
  for each row execute function private.keep_github_fields();
