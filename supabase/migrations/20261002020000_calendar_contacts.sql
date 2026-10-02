-- Calendar invitations for a cohort's live sessions need an email
-- address, and the hub otherwise keeps none. A student may give one, for
-- one cohort, for that purpose only. It lives apart from enrollments so
-- that classmates, who can see the roster, never see anyone's email:
-- only the student and the cohort's teachers can.

create table public.calendar_contacts (
  cohort_id  uuid references public.cohorts (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete cascade,
  email      text not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  primary key (cohort_id, user_id)
);

alter table public.calendar_contacts enable row level security;

create policy calendar_contacts_read on public.calendar_contacts for select to authenticated
  using (user_id = auth.uid() or private.teaches(cohort_id));
create policy calendar_contacts_write_own on public.calendar_contacts for insert to authenticated
  with check (user_id = auth.uid() and private.in_cohort(cohort_id));
create policy calendar_contacts_update_own on public.calendar_contacts for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy calendar_contacts_delete_own on public.calendar_contacts for delete to authenticated
  using (user_id = auth.uid());

-- Leaving a cohort takes the email with it.
create or replace function public.leave_cohort(c uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.shares where cohort_id = c and user_id = auth.uid();
  delete from public.calendar_contacts where cohort_id = c and user_id = auth.uid();
  delete from public.group_members gm using public.groups g
    where gm.group_id = g.id and g.cohort_id = c and gm.user_id = auth.uid();
  update public.enrollments set status = 'left', app_name = null, app_repo = null, app_url = null
    where cohort_id = c and user_id = auth.uid();
end;
$$;
