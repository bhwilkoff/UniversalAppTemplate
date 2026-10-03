-- Alumni and mentors (DECISIONS.md, "Alumni": "the credential gives
-- access to finished cohorts (not live ones) and makes the holder
-- eligible to mentor newcomers"; /cohorts/ promises the same).
--
-- Four things change.
--
-- 1. When a cohort is marked finished, everyone still in it is marked
--    finished too (and back, if a teacher reopens it). A finished member
--    keeps reading the cohort, because every read rule asks only that a
--    person has not left.
--
-- 2. Someone who holds a credential that is not revoked (private.is_alum,
--    the same test that opens finished cohorts to them) can join an open
--    or running cohort as a mentor, through join_as_mentor. A credential
--    counts from the moment a teacher records it, before it is signed,
--    because the teacher's judgment of the work is the evidence and the
--    signature only lets others check it. A finished enrollment alone
--    does not count: finishing marks everyone who stayed, whether or not
--    their app was done.
--
-- 3. Only a cohort's teachers change someone's role. A teacher may also
--    make a student a mentor (a classmate who is ahead and wants to help),
--    and a mentor a student again. People change only their own app
--    details, and leaving is the only change they make to their own
--    status, so nobody who left can put themselves back in a cohort.
--
-- 4. Mentors are members of the cohort like students: they read what the
--    cohort reads, share, give feedback, and sit in groups. They are not
--    teachers, so everything that only teachers see stays that way (notes
--    to students, everyone's answers to checks, calendar emails, the
--    feedback queue). They do not submit an app (SubmitLib already counts
--    only students). Nothing in the rules below gives a mentor more than a
--    student has; the role is a label the cohort can see, and a promise.

-- 1. Finishing and reopening.
create function private.finish_enrollments() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'finished' and old.status <> 'finished' then
    update public.enrollments set status = 'finished'
      where cohort_id = new.id and status = 'enrolled';
  elsif old.status = 'finished' and new.status <> 'finished' then
    update public.enrollments set status = 'enrolled'
      where cohort_id = new.id and status = 'finished';
  end if;
  return new;
end;
$$;
revoke all on function private.finish_enrollments() from public, anon, authenticated;

create trigger on_cohort_finished_finish_enrollments
  after update of status on public.cohorts
  for each row execute function private.finish_enrollments();

-- 3. Who changes a role or a status. Teachers (and the database itself,
--    with no signed-in person, as in a migration) may; a member changes
--    only their own status, and only to leaving.
create function private.guard_enrollment() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null or private.teaches(new.cohort_id) then
    return new;
  end if;
  if new.role is distinct from old.role then
    raise exception 'Only the cohort''s teachers change someone''s role.';
  end if;
  if new.status is distinct from old.status and new.status <> 'left' then
    raise exception 'Joining again is done from your account page, while the cohort is open.';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_enrollment() from public, anon, authenticated;

create trigger enrollments_guard_role_and_status before update on public.enrollments
  for each row execute function private.guard_enrollment();

-- The old rule kept a member's own row a student's; the trigger now keeps
-- the role, so a mentor can edit their own app details too.
drop policy enrollments_update_own on public.enrollments;
create policy enrollments_update_own on public.enrollments for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2. Joining as a mentor.
create function public.join_as_mentor(c uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  cohort_status public.cohort_status;
  existing public.enrollments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Sign in first.';
  end if;
  if not private.not_an_agent() then
    raise exception 'Joining a cohort is done by the person, on humanshaped.org.';
  end if;
  if private.teaches(c) then
    raise exception 'You teach this cohort already.';
  end if;
  if not private.is_alum() then
    raise exception 'Mentoring is open to people who hold the credential.';
  end if;
  select status into cohort_status from public.cohorts where id = c;
  if cohort_status is null or cohort_status not in ('open', 'running') then
    raise exception 'Mentors join cohorts that are open or running.';
  end if;
  select * into existing from public.enrollments where cohort_id = c and user_id = auth.uid();
  if found and existing.status <> 'left' then
    raise exception 'You are in this cohort already.';
  end if;
  -- Someone who left earlier comes back as a mentor with a fresh row; what
  -- they shared was already removed when they left.
  delete from public.enrollments where cohort_id = c and user_id = auth.uid();
  insert into public.enrollments (cohort_id, user_id, role, status)
    values (c, auth.uid(), 'mentor', 'enrolled');
end;
$$;
revoke all on function public.join_as_mentor(uuid) from public, anon;
grant execute on function public.join_as_mentor(uuid) to authenticated;

-- Whether this person may mentor, for /account/ to ask without reading
-- anything else about their credentials.
create function public.can_mentor() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_alum();
$$;
revoke all on function public.can_mentor() from public, anon;
grant execute on function public.can_mentor() to authenticated;
