-- Ben is the hub's first teacher (DECISIONS.md, "Teachers"). Rather than
-- wait for someone to add him by hand, his GitHub account becomes a
-- teacher the moment it first signs in. Other teachers are invited by
-- adding a row to public.teachers.

create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  login text := coalesce(new.raw_user_meta_data ->> 'user_name', new.raw_user_meta_data ->> 'preferred_username', new.email);
begin
  insert into public.profiles (id, github_login, github_id, display_name, avatar_url)
  values (
    new.id,
    login,
    nullif(new.raw_user_meta_data ->> 'provider_id', '')::bigint,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  if lower(login) = 'bhwilkoff' then
    insert into public.teachers (user_id) values (new.id) on conflict do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

-- If Ben signed in before this migration ran, make him a teacher now.
insert into public.teachers (user_id)
  select id from public.profiles where lower(github_login) = 'bhwilkoff'
  on conflict do nothing;
