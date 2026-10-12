-- Exchanges in the once-a-day email (Ben, October 12, 2026: "Is it
-- possible to get an email notification for a response to your exchange
-- (as the teacher)?" and then "write out the email notification for
-- exchanges"). Two more counts in notice_digest(), still counts and never
-- words or names, for people who turned the email on in /account/:
--
--   exchange_videos   videos others added since the last email to an
--                     exchange this person started
--   exchange_answers  videos others added that answer one of this
--                     person's videos, in exchanges they did not start
--                     (so no video is counted twice)
--
-- A cohort's exchange counts only while the person is still in or teaching
-- that cohort.

create function private.notice_exchange_counts(person uuid, since timestamptz)
returns table (videos int, answers int)
language sql stable security definer set search_path = '' as $$
  with fresh as (
    select p.id, p.reply_to, e.created_by
      from public.exchange_posts p
      join public.exchanges e on e.id = p.exchange_id
     where p.author_id <> person
       and p.created_at > since
       and (e.cohort_id is null
            or exists (select 1 from public.enrollments n
                        where n.cohort_id = e.cohort_id and n.user_id = person and n.status <> 'left')
            or exists (select 1 from public.cohort_teachers t
                        where t.cohort_id = e.cohort_id and t.user_id = person))
  )
  select
    (select count(*)::int from fresh where created_by = person),
    (select count(*)::int from fresh f
      where f.created_by <> person
        and exists (select 1 from public.exchange_posts mine where mine.id = f.reply_to and mine.author_id = person));
$$;
revoke all on function private.notice_exchange_counts(uuid, timestamptz) from public, anon, authenticated;

drop function public.notice_digest();
create function public.notice_digest()
returns table (user_id uuid, email text, notes int, answers int, exchange_videos int, exchange_answers int)
language sql stable security definer set search_path = '' as $$
  select * from (
    select r.user_id, r.email,
           (select count(*)::int from public.teacher_notes n
             where n.student_id = r.user_id and n.created_at > r.notified_at) as notes,
           (select count(*)::int from public.feedback f
              join public.shares s on s.id = f.share_id
             where s.user_id = r.user_id and f.author_id <> r.user_id and f.created_at > r.notified_at) as answers,
           x.videos as exchange_videos,
           x.answers as exchange_answers
      from public.reach_choices r
      cross join lateral private.notice_exchange_counts(r.user_id, r.notified_at) x
     where r.notices and r.email is not null and r.notified_at is not null
       and r.notified_at < now() - interval '20 hours'
  ) d
  where d.notes + d.answers + d.exchange_videos + d.exchange_answers > 0;
$$;
revoke all on function public.notice_digest() from public, anon, authenticated;
grant execute on function public.notice_digest() to service_role;
