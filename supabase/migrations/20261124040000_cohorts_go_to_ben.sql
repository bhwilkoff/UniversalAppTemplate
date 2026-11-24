-- A cohort nobody else leads goes to Ben when its leader deletes their account
-- (Ben, November 24, 2026: "if a leader deletes their account, you should make
-- me the leader of the cohort to preserve content"), found the way he is found
-- on sign-in (20261002030000). Only when the account going is his own does it
-- go to another admin.
create or replace function private.leader_goes() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  next_leader uuid;
begin
  delete from public.exchanges e where e.created_by = old.id
    and not exists (select 1 from public.cohort_teachers t where t.cohort_id = e.cohort_id and t.user_id = old.id)
    and not exists (select 1 from public.cohorts c where c.id = e.cohort_id and c.created_by = old.id);
  delete from public.time_poll_answers a using public.time_polls p where p.id = a.poll_id and p.created_by = old.id and a.host;
  delete from public.time_polls where created_by = old.id and cohort_id is null;
  update public.time_polls set host_name = null where created_by = old.id and host_name is not null;
  delete from public.questions where owner_id = old.id and cohort_id is null;

  select p.id into next_leader from public.profiles p
    where lower(p.github_login) = 'bhwilkoff' and p.id <> old.id limit 1;
  if next_leader is null then
    select t.user_id into next_leader from public.teachers t
      where t.can_admin and t.user_id <> old.id order by t.created_at, t.user_id limit 1;
  end if;
  if next_leader is not null then
    insert into public.cohort_teachers (cohort_id, user_id)
    select c.id, next_leader from public.cohorts c
    where (c.created_by = old.id or exists (select 1 from public.cohort_teachers t where t.cohort_id = c.id and t.user_id = old.id))
      and not exists (select 1 from public.cohort_teachers t where t.cohort_id = c.id and t.user_id <> old.id)
    on conflict do nothing;
  end if;
  return old;
end;
$$;
