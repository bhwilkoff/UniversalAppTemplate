-- Never "sign in again" in a new tab (JOURNEYS.md, the walk-through
-- audit). GitHub gives a person's GitHub App token for eight hours, with a
-- refresh token good for six months. Until now the eight-hour token lived
-- only in the tab that signed in, so every new tab or visit asked the
-- person to sign in again. The refresh token is now kept here, on the
-- server, where no page and no signed-in person can read it; the
-- github-token function, which only the person themselves can call (their
-- own sign-in), trades it for a fresh eight-hour token when a page has
-- none. The short token still lives only in the tab that uses it.

create table private.github_tokens (
  user_id            uuid primary key references public.profiles (id) on delete cascade,
  github_id          bigint not null,
  refresh_token      text not null check (char_length(refresh_token) <= 2000),
  refresh_expires_at timestamptz,
  access_token       text check (access_token is null or char_length(access_token) <= 2000),
  access_expires_at  timestamptz,
  updated_at         timestamptz not null default now()
);

revoke all on private.github_tokens from public, anon, authenticated;
grant select, insert, update, delete on private.github_tokens to service_role;

-- For the github-token function alone (the service role): read, keep,
-- and forget one person's tokens.
create function public.github_token_get(u uuid)
returns table (github_id bigint, refresh_token text, refresh_expires_at timestamptz, access_token text, access_expires_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select t.github_id, t.refresh_token, t.refresh_expires_at, t.access_token, t.access_expires_at
    from private.github_tokens t where t.user_id = u;
$$;

create function public.github_token_put(u uuid, gh bigint, refresh text, refresh_expires timestamptz, access text, access_expires timestamptz)
returns void
language sql security definer set search_path = '' as $$
  insert into private.github_tokens (user_id, github_id, refresh_token, refresh_expires_at, access_token, access_expires_at, updated_at)
  values (u, gh, refresh, refresh_expires, access, access_expires, now())
  on conflict (user_id) do update set github_id = excluded.github_id, refresh_token = excluded.refresh_token,
    refresh_expires_at = excluded.refresh_expires_at, access_token = excluded.access_token,
    access_expires_at = excluded.access_expires_at, updated_at = now();
$$;

create function public.github_token_drop(u uuid) returns void
language sql security definer set search_path = '' as $$
  delete from private.github_tokens where user_id = u;
$$;

revoke all on function public.github_token_get(uuid), public.github_token_put(uuid, bigint, text, timestamptz, text, timestamptz), public.github_token_drop(uuid) from public, anon, authenticated;
grant execute on function public.github_token_get(uuid), public.github_token_put(uuid, bigint, text, timestamptz, text, timestamptz), public.github_token_drop(uuid) to service_role;
