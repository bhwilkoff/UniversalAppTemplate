-- A leader puts a learner's app on every main stage in one press, so the
-- leader can add it to the show-your-work queue on the learner's behalf. The
-- queue's own policy only lets people add themselves. Returns the item.
create function public.queue_member_app(s uuid, member uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  c uuid;
  link text;
  found uuid;
begin
  select cohort_id into c from public.sessions where id = s;
  if c is null or not private.teaches(c) then raise exception 'Only this cohort''s leaders can do this.'; end if;
  select app_url into link from public.enrollments where cohort_id = c and user_id = member and status <> 'left';
  if link is null or link !~ '^https://' then raise exception 'This person has no app to show.'; end if;
  select id into found from public.live_queue where session_id = s and user_id = member and url = link and state = 'waiting';
  if found is not null then return found; end if;
  insert into public.live_queue (cohort_id, session_id, user_id, kind, url)
    values (c, s, member, 'app', link) returning id into found;
  return found;
end $$;
revoke all on function public.queue_member_app(uuid, uuid) from public, anon;
grant execute on function public.queue_member_app(uuid, uuid) to authenticated;
