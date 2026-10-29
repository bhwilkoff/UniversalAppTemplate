-- A sample cohort (details.any_call) lets Google's Marketplace reviewer
-- run the Meet add-on in a call of their own. The people it names in
-- details.sample_leaders become its leaders the first time they sign in
-- with Google, since their accounts do not exist before that
-- (tools/meet-addon/SCREENCAST.md).
create or replace function private.handle_new_user()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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
  -- Google has verified this address; only then does it count.
  if provider = 'google' and new.email is not null
     and coalesce((new.raw_user_meta_data ->> 'email_verified')::boolean, false) then
    insert into public.cohort_teachers (cohort_id, user_id)
    select c.id, new.id from public.cohorts c
     where c.status = 'draft' and c.details -> 'sample_leaders' ? lower(new.email)
    on conflict do nothing;
  end if;
  return new;
end;
$function$;
