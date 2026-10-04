-- The week-5 showing, open to guests (H5; COURSE.md week 5: "Shown to
-- everyone, guests welcome"; docs/teaching/week-5.md, "Tonight is the
-- final showing, open to everyone, guests welcome").
--
-- A teacher marks one session as a public showcase, and may choose to
-- share its Meet link with guests. Nothing else about the cohort becomes
-- public: guests read only what public_showcases() returns, which is the
-- cohort's title and address, when the session is, its title, the guest
-- link only when the teacher chose to share it, and the apps the students
-- themselves already chose to show on /apps/ (the same rules as
-- public_apps(), so a hidden or private app never appears here).
--
-- Who sets it: sessions_write already lets only the cohort's teachers
-- change a session, and migration 6 already keeps every agent from
-- writing, so no new rule is needed for the columns.

alter table public.sessions
  add column public_showcase boolean not null default false,
  add column showcase_shares_link boolean not null default false;

create function public.public_showcases()
returns table (
  cohort_title text,
  cohort_slug text,
  session_number smallint,
  starts_at timestamptz,
  minutes smallint,
  time_zone text,
  title text,
  guest_link text,
  apps jsonb
)
language sql stable security definer set search_path = '' as $$
  select c.title, c.slug, s.number, s.starts_at, c.session_minutes, c.time_zone, s.title,
         case when s.showcase_shares_link and s.meet_url ~ '^https://meet\.google\.com/[a-z0-9-]{3,40}$'
              then s.meet_url end,
         coalesce((
           select jsonb_agg(jsonb_build_object('app_name', e.app_name, 'app_repo', e.app_repo, 'app_url', e.app_url)
                            order by lower(e.app_repo))
           from public.enrollments e
           where e.cohort_id = c.id
             and e.app_public
             and e.status <> 'left'
             and e.app_repo is not null
             and not exists (
               select 1 from public.app_hides h
               where h.cohort_id = e.cohort_id and h.user_id = e.user_id)
         ), '[]'::jsonb)
  from public.sessions s
  join public.cohorts c on c.id = s.cohort_id
  where s.public_showcase
    and c.status <> 'draft'
  order by s.starts_at nulls last, c.slug;
$$;

revoke all on function public.public_showcases() from public;
grant execute on function public.public_showcases() to anon, authenticated;
