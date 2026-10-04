-- Signing without carrying a request by hand (LOOP-PLAN.md, H2). Until
-- now a teacher of the cohort copied a signing request, got it to the
-- one person holding the key, and attached the file that came back. A
-- teacher who is not the signer could not finish their own cohort's
-- credentials, and the signer could not attach a file for a cohort they
-- do not teach.
--
-- So signing is a role of its own: a flag on the teacher's row,
-- can_sign, set the same way as can_approve (Ben's first sign-in, or a
-- change by hand), never from the browser. A signer reads every
-- credential waiting to be signed, across cohorts, through one function
-- that returns only what the signing tool needs, and attaches the signed
-- file through another. The guard from migration 20261003070000 still
-- decides what a signed file must say. A signer gains no other right:
-- they cannot record, correct, revoke, or remove a credential in a
-- cohort they do not teach, and an AI agent can do none of this.

alter table public.teachers add column can_sign boolean not null default false;

update public.teachers set can_sign = true
  where user_id in (select id from public.profiles where lower(github_login) = 'bhwilkoff');

-- Ben's first sign-in makes him a teacher who can approve and sign
-- (the same function as migration 20261003050000, with can_sign added).
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
    insert into public.teachers (user_id, can_approve, can_sign) values (new.id, true, true)
      on conflict (user_id) do update set can_approve = true, can_sign = true;
  end if;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated;

create function private.can_sign() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teachers where user_id = auth.uid() and can_sign);
$$;
grant execute on function private.can_sign() to authenticated;

-- Every credential waiting to be signed, oldest first, with what the
-- signing request is made of: the record, the holder's GitHub name and
-- display name, and the cohort's title. Nothing for anyone but a signer.
create function public.credentials_to_sign()
returns table (id uuid, issued_at timestamptz, evidence_repo text, app_name text, app_url text,
               platforms text[], platform_links jsonb, github_login text, display_name text,
               cohort_title text)
language sql stable security definer set search_path = public as $$
  select c.id, c.issued_at, c.evidence_repo, c.app_name, c.app_url, c.platforms, c.platform_links,
         p.github_login, p.display_name, h.title
  from public.credentials c
  join public.profiles p on p.id = c.user_id
  join public.cohorts h on h.id = c.cohort_id
  where private.can_sign() and c.signed is null and c.revoked_at is null
  order by c.issued_at;
$$;
revoke all on function public.credentials_to_sign() from public, anon;
grant execute on function public.credentials_to_sign() to authenticated;

-- Attaching the signed file, by a signer, to a credential still waiting.
-- The guard checks the file is a signed credential for this record.
create function public.attach_signed_credential(credential uuid, file jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not private.not_an_agent() then
    raise exception 'Signing is done by a person, on humanshaped.org.';
  end if;
  if not private.can_sign() then
    raise exception 'Only a signer can attach a signed credential here.';
  end if;
  update public.credentials set signed = file
    where id = credential and signed is null and revoked_at is null;
  if not found then
    raise exception 'That credential is not waiting to be signed.';
  end if;
end;
$$;
revoke all on function public.attach_signed_credential(uuid, jsonb) from public, anon;
grant execute on function public.attach_signed_credential(uuid, jsonb) to authenticated;
