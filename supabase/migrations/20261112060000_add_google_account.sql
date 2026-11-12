-- Any Google account a person signs in with can lead to the same Human
-- Shaped account (Ben, November 12, 2026: "any account you login with on
-- Google Meet will be able to see the cohorts you have, so long as you are
-- logged in on Github correctly").
--
-- A Google account the site has never seen makes a new, empty account when
-- it signs in. The panel then asks for GitHub: the empty account offers a
-- one-time code, the person signs in with GitHub in a small window, and
-- their GitHub account accepts the code. Its Google sign-in moves onto the
-- GitHub account, so next time that Google account opens the person's own
-- cohorts. Holding both sign-ins at once is the proof that one person owns
-- both accounts.

create table private.account_merges (
  code uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.account_merges enable row level security;

-- An account that holds nothing but Google sign-ins and no GitHub name.
create function private.google_only(uid uuid) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from auth.identities where user_id = uid)
     and not exists (select 1 from auth.identities where user_id = uid and provider <> 'google')
     and not exists (select 1 from public.profiles where id = uid and github_login is not null)
$$;

-- How many rows anywhere outside the sign-in tables belong to an account.
create function private.rows_owned(uid uuid) returns bigint
language plpgsql stable security definer set search_path = public, auth, private as $$
declare
  r record;
  n bigint;
  total bigint := 0;
begin
  for r in
    select c.conrelid::regclass as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    join pg_class t on t.oid = c.conrelid
    join pg_namespace s on s.oid = t.relnamespace
    where c.contype = 'f' and array_length(c.conkey, 1) = 1
      and c.confrelid in ('auth.users'::regclass, 'public.profiles'::regclass)
      and s.nspname not in ('auth')
      and c.conrelid not in ('public.profiles'::regclass, 'private.account_merges'::regclass)
  loop
    execute format('select count(*) from %s where %I = $1', r.tbl, r.col) into n using uid;
    total := total + n;
  end loop;
  return total;
end;
$$;

-- Called by the new Google-only account: a code good for 15 minutes.
create function public.offer_account_merge() returns uuid
language plpgsql security definer set search_path = public, auth, private as $$
declare
  me uuid := auth.uid();
  c uuid;
begin
  if me is null then raise exception 'Sign in first.'; end if;
  if not private.not_an_agent() then raise exception 'Only the person can do this, on humanshaped.org.'; end if;
  if not private.google_only(me) then raise exception 'This account already has GitHub.'; end if;
  delete from private.account_merges where from_user = me or created_at < now() - interval '1 day';
  insert into private.account_merges (from_user) values (me) returning code into c;
  return c;
end;
$$;

-- Called by the person's GitHub account with that code. Moves the Google
-- sign-ins onto this account, and removes the old account if nothing else
-- belongs to it (anything that does, such as answers given in a call,
-- stays where it is). Returns every Google address this account now has.
create function public.accept_account_merge(merge_code uuid) returns text[]
language plpgsql security definer set search_path = public, auth, private as $$
declare
  me uuid := auth.uid();
  src uuid;
  moved text[];
begin
  if me is null then raise exception 'Sign in first.'; end if;
  if not private.not_an_agent() then raise exception 'Only the person can do this, on humanshaped.org.'; end if;
  if not exists (select 1 from public.profiles where id = me and github_login is not null) then
    raise exception 'Sign in with GitHub to add a Google account.';
  end if;
  delete from private.account_merges where code = merge_code and created_at > now() - interval '15 minutes'
    returning from_user into src;
  if src is null then raise exception 'That request has expired. Sign in with Google again.'; end if;
  if src = me then return array[]::text[]; end if;
  if not private.google_only(src) then raise exception 'That account has GitHub of its own.'; end if;
  update auth.identities set user_id = me
    where user_id = src and provider = 'google';
  select array_agg(coalesce(identity_data->>'email', provider_id)) into moved
    from auth.identities where user_id = me and provider = 'google';
  if private.rows_owned(src) = 0 then
    delete from auth.users where id = src;
  end if;
  return moved;
end;
$$;

revoke all on function private.google_only(uuid), private.rows_owned(uuid) from public, anon, authenticated;
revoke all on function public.offer_account_merge(), public.accept_account_merge(uuid) from public, anon;
grant execute on function public.offer_account_merge(), public.accept_account_merge(uuid) to authenticated;
