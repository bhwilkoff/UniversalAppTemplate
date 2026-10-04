-- Co-teachers (LOOP-PLAN H1). COURSE.md asks a new teacher to "co-lead
-- one session of someone else's cohort first", so a cohort's teachers
-- can already add another teacher (cohort_teachers_add, migration 1),
-- and this lets them take one off again.
--
-- A teacher of the cohort may remove any teacher of it, themselves
-- included, except the person who made the cohort: teaches() always
-- counts its maker (migration 1), so taking their row away would only
-- hide them from the cohort's pages while they still taught it. And
-- someone must still teach it afterwards: a cohort with no teacher has
-- nobody to answer its people. Deleting the cohort,
-- or someone deleting their own account, still takes their rows with
-- it, because those removals come through a cascade rather than a
-- person pressing Remove.
--
-- Agents are already kept from deleting here (migration 6).

create policy cohort_teachers_remove on public.cohort_teachers for delete to authenticated
  using (private.teaches(cohort_id));

create function private.keep_a_teacher() returns trigger
language plpgsql set search_path = '' as $$
begin
  -- A cascade (the cohort or the person being deleted) runs inside
  -- another trigger; only a direct removal is checked.
  if pg_trigger_depth() > 1 then
    return old;
  end if;
  -- Two teachers removing each other at once must not both succeed.
  perform 1 from public.cohorts where id = old.cohort_id for update;
  if exists (select 1 from public.cohorts where id = old.cohort_id and created_by = old.user_id) then
    raise exception 'The person who made a cohort always teaches it.';
  end if;
  if not exists (select 1 from public.cohort_teachers
                 where cohort_id = old.cohort_id and user_id <> old.user_id) then
    raise exception 'A cohort needs at least one teacher, so add another before removing this one.';
  end if;
  return old;
end;
$$;
revoke all on function private.keep_a_teacher() from public, anon, authenticated;

create trigger cohort_teachers_keep_one before delete on public.cohort_teachers
  for each row execute function private.keep_a_teacher();
