-- Leaving a cohort takes a person's own workbook answers with their other
-- answers (privacy page, "When you leave a cohort"). A breakout room's
-- shared answers stay with the room, without anyone's name.
create or replace function public.leave_cohort(c uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not private.not_an_agent() then
    raise exception 'Leaving a cohort is done by the person, on humanshaped.org.';
  end if;
  delete from public.shares where cohort_id = c and user_id = auth.uid();
  delete from public.share_confirmations where cohort_id = c and user_id = auth.uid();
  delete from public.live_queue where cohort_id = c and user_id = auth.uid();
  delete from public.live_answers where cohort_id = c and user_id = auth.uid();
  delete from public.workbook_answers where cohort_id = c and user_id = auth.uid();
  update public.workbook_answers set updated_by = null where cohort_id = c and updated_by = auth.uid();
  delete from public.live_signals where cohort_id = c and kind = 'stage' and auth.uid() = any (people);
  delete from public.group_members gm using public.groups g
    where gm.group_id = g.id and g.cohort_id = c and gm.user_id = auth.uid();
  delete from public.calendar_contacts where cohort_id = c and user_id = auth.uid();
  delete from public.app_hides where cohort_id = c and user_id = auth.uid();
  update public.enrollments set status = 'left', app_name = null, app_repo = null, app_url = null
    where cohort_id = c and user_id = auth.uid();
end;
$$;
