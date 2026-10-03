-- The credential (DECISIONS.md, "The credential"): issued from cohort 1
-- onward, the evidence is the repository, a web app pushed live is enough,
-- and each further platform the app is published on adds a level. It is
-- an Open Badges 3.0 credential signed by humanshaped.org
-- (research/notes/credential-build-notes.md).
--
-- How one comes to be. A teacher of a finished cohort records it on
-- /teach/ for someone still in that cohort, after opening the repository
-- and every link. The row then waits to be signed, which happens outside
-- the browser, on the signer's own computer (tools/credential/), because
-- the private key must never reach a web page. The teacher attaches the
-- signed file on /teach/, and from then on the row cannot change, except
-- to be revoked.
--
-- Who sees what. Until now every credential row was public, which would
-- let anyone list everyone who holds one, and which cohort they were in.
-- Now the holder and the cohort's teachers read the row, and the public
-- reads one credential at a time through public_credential(id), which
-- needs the credential's id (the link the holder chooses to share) and
-- returns only the signed file, or that it is waiting or revoked.

alter table public.credentials
  add column app_name        text check (char_length(app_name) <= 120),
  add column app_url         text check (app_url ~ '^https://' and char_length(app_url) <= 500),
  add column platform_links  jsonb not null default '{}'::jsonb check (jsonb_typeof(platform_links) = 'object'),
  add column signed          jsonb,
  add column signed_at       timestamptz,
  add column revoked_at      timestamptz,
  add column revoked_reason  text check (char_length(revoked_reason) <= 500);

-- The platforms, in the same words as assets/credential-lib.js; the web
-- comes first and is always there, and each platform appears once.
create function private.credential_platforms_ok(p text[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(array_length(p, 1), 0) >= 1
     and p[1] = 'web'
     and p <@ array['web', 'iphone-ipad', 'mac', 'apple-tv', 'vision-pro', 'android',
                    'google-tv', 'fire-tv', 'roku', 'windows']::text[]
     and (select count(distinct x) from unnest(p) x) = array_length(p, 1);
$$;

-- Every platform past the web has its own https link, and no link is
-- there for a platform that was not chosen.
create function private.credential_links_ok(p text[], links jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select (select count(*) from jsonb_object_keys(links)) = coalesce(array_length(p, 1), 0) - 1
     and not exists (
       select 1 from unnest(p[2:]) x
       where links ->> x is null or (links ->> x) !~ '^https://' or char_length(links ->> x) > 500);
$$;

alter table public.credentials
  add constraint credentials_platforms_ok check (private.credential_platforms_ok(platforms)),
  add constraint credentials_links_ok check (private.credential_links_ok(platforms, platform_links)),
  add constraint credentials_repo_ok check (evidence_repo ~ '^[A-Za-z0-9-]+/[A-Za-z0-9._-]+$'),
  add constraint credentials_revoked_reason check (revoked_reason is null or revoked_at is not null);

-- One credential per person per cohort, until it is revoked (revoking an
-- old one is how a higher level replaces it).
create unique index credentials_one_per_cohort on public.credentials (user_id, cohort_id)
  where revoked_at is null;

-- What can change, and when. Before it is signed, a teacher may correct
-- the evidence. Attaching the signed file is a one-time step, and the
-- file must be a credential for this row, from this issuer. After that,
-- only revoking remains, and a revoked credential stays revoked.
create function private.guard_credential() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.user_id is distinct from old.user_id or new.cohort_id is distinct from old.cohort_id
     or new.issued_by is distinct from old.issued_by or new.issued_at is distinct from old.issued_at then
    raise exception 'Who a credential is for, its cohort, and who issued it cannot change.';
  end if;
  if old.revoked_at is not null then
    raise exception 'A revoked credential stays revoked.';
  end if;
  if old.signed is not null then
    if new.signed is distinct from old.signed or new.signed_at is distinct from old.signed_at
       or new.platforms is distinct from old.platforms or new.platform_links is distinct from old.platform_links
       or new.evidence_repo is distinct from old.evidence_repo or new.app_url is distinct from old.app_url
       or new.app_name is distinct from old.app_name or new.credential_url is distinct from old.credential_url then
      raise exception 'A signed credential cannot change. Revoke it and issue a new one instead.';
    end if;
  elsif new.signed is not null then
    if jsonb_typeof(new.signed) <> 'object'
       or new.signed ->> 'id' is distinct from 'https://humanshaped.org/credential/?id=' || new.id::text
       or new.signed -> 'issuer' ->> 'id' is distinct from 'did:web:humanshaped.org'
       or new.signed -> 'proof' ->> 'cryptosuite' is distinct from 'eddsa-rdfc-2022'
       or new.signed -> 'proof' ->> 'proofValue' is null then
      raise exception 'That is not a signed credential for this record.';
    end if;
    new.signed_at := now();
    new.credential_url := 'https://humanshaped.org/credential/?id=' || new.id::text;
  else
    new.signed_at := null;
  end if;
  if new.revoked_at is not null then
    new.revoked_at := now();
  end if;
  return new;
end;
$$;

create function private.guard_new_credential() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.signed is not null or new.signed_at is not null or new.revoked_at is not null then
    raise exception 'A new credential starts unsigned; the signed file is attached afterwards.';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_credential(), private.guard_new_credential() from public, anon, authenticated;

create trigger credentials_guard before update on public.credentials
  for each row execute function private.guard_credential();
create trigger credentials_guard_new before insert on public.credentials
  for each row execute function private.guard_new_credential();

-- Reading: the holder and the cohort's teachers.
drop policy credentials_read on public.credentials;
create policy credentials_read on public.credentials for select to authenticated
  using (user_id = auth.uid() or (cohort_id is not null and private.teaches(cohort_id)));

-- Issuing: a teacher of the cohort, once it is finished, for someone who
-- is in it and did not leave.
drop policy credentials_issue on public.credentials;
create policy credentials_issue on public.credentials for insert to authenticated
  with check (
    issued_by = auth.uid() and cohort_id is not null and private.teaches(cohort_id)
    and exists (select 1 from public.cohorts c where c.id = cohort_id and c.status = 'finished')
    and exists (select 1 from public.enrollments e
                where e.cohort_id = credentials.cohort_id and e.user_id = credentials.user_id and e.status <> 'left'));

-- Correcting, attaching the signature, and revoking: the cohort's
-- teachers (the guard above says what may change).
create policy credentials_teacher_update on public.credentials for update to authenticated
  using (cohort_id is not null and private.teaches(cohort_id))
  with check (cohort_id is not null and private.teaches(cohort_id));

-- Removing: a teacher may remove a record made by mistake before it is
-- signed; the holder may remove their own credential at any time, since
-- what is theirs stays theirs to keep or not.
create policy credentials_teacher_delete on public.credentials for delete to authenticated
  using (signed is null and cohort_id is not null and private.teaches(cohort_id));
create policy credentials_holder_delete on public.credentials for delete to authenticated
  using (user_id = auth.uid());

-- A revoked credential no longer opens finished cohorts (DECISIONS.md,
-- "Alumni").
create or replace function private.is_alum() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.credentials where user_id = auth.uid() and revoked_at is null);
$$;

-- The public page, one credential at a time. A credential still waiting
-- for its signature, or revoked, shows only that, and never who it is for.
create function public.public_credential(credential uuid)
returns table (state text, signed jsonb, issued_at timestamptz, signed_at timestamptz, revoked_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select case when c.revoked_at is not null then 'revoked'
              when c.signed is null then 'waiting'
              else 'signed' end,
         case when c.revoked_at is null then c.signed end,
         c.issued_at, c.signed_at, c.revoked_at
  from public.credentials c
  where c.id = credential;
$$;

revoke all on function public.public_credential(uuid) from public;
grant execute on function public.public_credential(uuid) to anon, authenticated;

-- The agent rules from migration 6 already cover this table: an agent
-- reads what its person can read, and writes nothing.
