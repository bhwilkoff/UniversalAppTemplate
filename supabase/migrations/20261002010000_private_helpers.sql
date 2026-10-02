-- Keep the access-rule helpers out of the public API. They exist only
-- so the row-level security policies can ask questions like "is this
-- person in this cohort?", and Supabase's security check rightly
-- flagged that anyone could call them through /rest/v1/rpc. Moving them
-- to a schema the API does not expose keeps the policies working
-- (policies refer to functions, not names). The two functions people
-- are meant to call, leave_cohort and delete_my_account, stay public
-- and signed-in only.

create schema if not exists private;
grant usage on schema private to anon, authenticated;

alter function public.is_hub_teacher()          set schema private;
alter function public.teaches(uuid)             set schema private;
alter function public.in_cohort(uuid)           set schema private;
alter function public.is_alum()                 set schema private;
alter function public.shares_a_cohort_with(uuid) set schema private;
alter function public.handle_new_user()         set schema private;
alter function public.add_creator_as_teacher()  set schema private;

-- Trigger functions run on their own; no one needs to call them.
revoke all on function private.handle_new_user(), private.add_creator_as_teacher() from public, anon, authenticated;

-- in_cohort calls teaches by name, so it follows it to the new schema.
create or replace function private.in_cohort(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.enrollments
    where cohort_id = c and user_id = auth.uid() and status <> 'left'
  ) or private.teaches(c);
$$;
