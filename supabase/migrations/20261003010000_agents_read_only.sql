-- A student's own AI agent may read what the student can read, and
-- nothing more (research/notes/agent-connection-notes.md). When an agent
-- connects through the hub's OAuth server, its token carries a client_id
-- claim; a token from signing in on the site does not. These restrictive
-- policies sit on top of every existing rule: anything that writes, and
-- reading the calendar emails, now also requires a token that did not
-- come from an agent. Sharing what an agent said stays the student's own
-- act, on the site.

create function private.not_an_agent() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(auth.jwt() ->> 'client_id', '') = '';
$$;
grant execute on function private.not_an_agent() to anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles', 'teachers', 'cohorts', 'cohort_teachers', 'sessions',
    'enrollments', 'groups', 'group_members', 'shares', 'feedback',
    'credentials', 'calendar_contacts', 'github_access'
  ] loop
    execute format('create policy agents_cannot_insert on public.%I as restrictive for insert to authenticated with check (private.not_an_agent())', t);
    execute format('create policy agents_cannot_update on public.%I as restrictive for update to authenticated using (private.not_an_agent())', t);
    execute format('create policy agents_cannot_delete on public.%I as restrictive for delete to authenticated using (private.not_an_agent())', t);
  end loop;
end $$;

-- Calendar emails are only for invitations; an agent has no need of them.
create policy agents_cannot_read on public.calendar_contacts as restrictive
  for select to authenticated using (private.not_an_agent());

-- The two functions people call directly run with definer rights, past
-- row-level security, so they check for themselves.
create or replace function public.leave_cohort(c uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not private.not_an_agent() then
    raise exception 'Leaving a cohort is done by the person, on humanshaped.org.';
  end if;
  delete from public.shares where cohort_id = c and user_id = auth.uid();
  delete from public.group_members gm using public.groups g
    where gm.group_id = g.id and g.cohort_id = c and gm.user_id = auth.uid();
  delete from public.calendar_contacts where cohort_id = c and user_id = auth.uid();
  update public.enrollments set status = 'left', app_name = null, app_repo = null, app_url = null
    where cohort_id = c and user_id = auth.uid();
end;
$$;

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if not private.not_an_agent() then
    raise exception 'Deleting an account is done by the person, on humanshaped.org.';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
