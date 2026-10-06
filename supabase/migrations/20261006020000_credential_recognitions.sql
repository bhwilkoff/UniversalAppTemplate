-- Recognitions in the credential (DECISIONS.md, "Recognitions in the
-- credential"). Ben, October 6: "An in-class recognition would be great
-- to include as evidence on the final credential at the end of the
-- cohort."
--
-- Each credential row carries the recognitions its holder received in
-- that cohort (the skill, who recognized it, the week, and the moment),
-- read from public.recognitions by the database, never written by a
-- browser. Until the credential is signed, the list follows the
-- recognitions themselves: one a student removes leaves it, and one a
-- teacher gives late joins it. Once it is signed, the list is what was
-- signed, and nothing changes it. The signing request (/teach/,
-- assets/credential-lib.js) carries the list, and the signed credential
-- names each one as evidence, on its public page.
--
-- Additive only: a column, two functions, three triggers, and a second
-- function for signers beside credentials_to_sign(), whose columns stay
-- as they are.

alter table public.credentials
  add column recognitions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(recognitions) = 'array' and jsonb_array_length(recognitions) <= 30);

-- One person's recognitions in one cohort, oldest first, in the shape
-- credential-lib.js reads: { skill, by, week, moment }.
create function private.recognitions_for_credential(person uuid, cohort uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x.item order by x.given_at, x.id), '[]'::jsonb)
  from (
    select r.id, r.given_at,
           jsonb_build_object(
             'skill', r.skill,
             'by', coalesce(nullif(btrim(p.display_name), ''), p.github_login),
             'week', s.number,
             'moment', r.moment) as item
    from public.recognitions r
    left join public.profiles p on p.id = r.given_by
    left join public.sessions s on s.id = r.session_id
    where r.user_id = person and r.cohort_id = cohort
    order by r.given_at, r.id
    limit 30
  ) x;
$$;
revoke all on function private.recognitions_for_credential(uuid, uuid) from public, anon, authenticated;

-- A new credential starts with them.
create function private.credential_takes_recognitions() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.recognitions := private.recognitions_for_credential(new.user_id, new.cohort_id);
  return new;
end;
$$;
revoke all on function private.credential_takes_recognitions() from public, anon, authenticated;
create trigger credentials_recognitions before insert on public.credentials
  for each row execute function private.credential_takes_recognitions();

-- No one changes the list by hand: only the database, when a
-- recognition is given or removed.
create function private.guard_credential_recognitions() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.recognitions is distinct from old.recognitions and current_user in ('authenticated', 'anon') then
    raise exception 'The recognitions in a credential come from the recognitions themselves.';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_credential_recognitions() from public, anon, authenticated;
create trigger credentials_recognitions_guard before update on public.credentials
  for each row execute function private.guard_credential_recognitions();

-- When a recognition is given or removed, every credential for that
-- person and cohort still waiting to be signed follows.
create function private.recognitions_follow() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  r record := coalesce(new, old);
begin
  update public.credentials c
     set recognitions = private.recognitions_for_credential(r.user_id, r.cohort_id)
   where c.user_id = r.user_id and c.cohort_id = r.cohort_id
     and c.signed is null and c.revoked_at is null;
  return null;
end;
$$;
revoke all on function private.recognitions_follow() from public, anon, authenticated;
create trigger recognitions_to_credentials after insert or delete on public.recognitions
  for each row execute function private.recognitions_follow();

-- Credentials already waiting take theirs now.
update public.credentials
   set recognitions = private.recognitions_for_credential(user_id, cohort_id)
 where signed is null and revoked_at is null and cohort_id is not null;

-- What a signer needs beside credentials_to_sign(): the recognitions of
-- each credential waiting, by its id. Nothing for anyone but a signer.
create function public.credential_recognitions_to_sign()
returns table (id uuid, recognitions jsonb)
language sql stable security definer set search_path = public as $$
  select c.id, c.recognitions
  from public.credentials c
  where private.can_sign() and c.signed is null and c.revoked_at is null
  order by c.issued_at;
$$;
revoke all on function public.credential_recognitions_to_sign() from public, anon;
grant execute on function public.credential_recognitions_to_sign() to authenticated;
