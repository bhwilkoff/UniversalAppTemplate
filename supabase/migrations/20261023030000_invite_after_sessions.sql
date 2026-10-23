-- An invitation goes out only once the cohort has a session to come, so
-- the email can say when the first one is (found running a test cohort
-- end to end on October 23, 2026: invitations sent before the leader made
-- the sessions said only "It meets for an hour each week").
create or replace function public.invitation_work(n int default 50)
returns table (answer_id uuid, email text, name text, cohort_title text, slug text, leader text,
               first_session timestamptz, time_zone text, minutes int, token uuid)
language sql stable security definer set search_path = '' as $$
  select a.id, lower(trim(a.contact)), a.name, c.title, c.slug,
         coalesce(nullif(trim(p.host_name), ''), 'Your leader'),
         f.first_session, c.time_zone, c.session_minutes, a.invite_token
    from public.time_poll_answers a
    join public.time_polls p on p.id = a.poll_id
    join public.cohorts c on c.id = p.cohort_id
    cross join lateral (select min(s.starts_at) as first_session from public.sessions s
                         where s.cohort_id = c.id and s.starts_at > now()) f
   where a.invited and not coalesce(a.host, false)
     and a.invite_sent_at is null and a.joined_by is null
     and trim(a.contact) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     and c.status = 'open'
     and f.first_session is not null
   order by a.created_at
   limit greatest(1, least(coalesce(n, 50), 200));
$$;
revoke all on function public.invitation_work(int) from public, anon, authenticated;
grant execute on function public.invitation_work(int) to service_role;
