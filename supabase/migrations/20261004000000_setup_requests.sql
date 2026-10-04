-- A teacher sets up a cohort's calls alone (LOOP-PLAN G1; VISION.md:
-- "other people should be able to become teachers within the website and
-- lead their own cohort"). The weekly event, its Meet link, the group
-- rooms, and the recordings folder belong to meet@humanshaped.org, so the
-- teacher cannot make them with their own account, and until now Ben ran
-- the Meet script for them. Now the teacher asks on /teach/, the request
-- waits here, and meet@'s script (tools/meet-events, processSetupRequests)
-- picks it up through the setup-queue function, makes everything, and
-- reports the links back, which this file then puts on the sessions and
-- groups, so the teacher's own steps check themselves off.
--
-- A request holds no email address. The script is handed the cohort's
-- invitation emails only when it claims the request, read from
-- calendar_contacts at that moment, so a person who removed theirs is
-- never invited.

create table public.setup_requests (
  id            uuid primary key default gen_random_uuid(),
  cohort_id     uuid not null references public.cohorts (id) on delete cascade,
  kind          text not null default 'meet' check (kind in ('meet')),
  payload       jsonb not null default '{}'::jsonb
                check (jsonb_typeof(payload) = 'object' and payload::text !~ '@' and octet_length(payload::text) <= 2000),
  state         text not null default 'waiting' check (state in ('waiting', 'working', 'done', 'failed')),
  detail        text check (char_length(detail) <= 1000),
  requested_by  uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  claimed_at    timestamptz,
  finished_at   timestamptz
);

-- One open request per cohort and kind: asking twice does not queue two.
create unique index setup_requests_one_open on public.setup_requests (cohort_id, kind)
  where state in ('waiting', 'working');

alter table public.setup_requests enable row level security;

-- The cohort's teachers ask, see where their request stands, and may
-- clear one that is waiting or over. Only the server moves its state.
create policy setup_requests_read on public.setup_requests for select to authenticated
  using (private.teaches(cohort_id));
create policy setup_requests_ask on public.setup_requests for insert to authenticated
  with check (private.teaches(cohort_id));
create policy setup_requests_clear on public.setup_requests for delete to authenticated
  using (private.teaches(cohort_id) and state <> 'working');

create policy agents_cannot_insert on public.setup_requests as restrictive
  for insert to authenticated with check (private.not_an_agent());
create policy agents_cannot_update on public.setup_requests as restrictive
  for update to authenticated using (private.not_an_agent());
create policy agents_cannot_delete on public.setup_requests as restrictive
  for delete to authenticated using (private.not_an_agent());

-- Whatever a teacher sends, a new request starts waiting, in their name,
-- now, with nothing claimed or finished.
create function private.new_setup_request() returns trigger
language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.requested_by := auth.uid();
    new.state := 'waiting';
    new.detail := null;
    new.created_at := now();
    new.claimed_at := null;
    new.finished_at := null;
  end if;
  return new;
end;
$$;
revoke all on function private.new_setup_request() from public, anon, authenticated;

create trigger setup_requests_new before insert on public.setup_requests
  for each row execute function private.new_setup_request();

-- ---------------------------------------------------------------------
-- For the server alone (the setup-queue function, with the service role).
-- ---------------------------------------------------------------------

-- Take up to n waiting requests (and any left working for over an hour,
-- in case a run stopped halfway), mark them working, and return what the
-- script needs: the cohort, its groups with their members' invitation
-- emails, everyone's invitation emails, and the teachers' own.
create function public.claim_setup_requests(n int default 5)
returns table (id uuid, cohort_id uuid, kind text, payload jsonb, cohort jsonb, members text[], teachers text[], groups jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  with taken as (
    update public.setup_requests r
       set state = 'working', claimed_at = now()
     where r.id in (
       select q.id from public.setup_requests q
        where q.state = 'waiting' or (q.state = 'working' and q.claimed_at < now() - interval '1 hour')
        order by q.created_at
        limit greatest(1, least(coalesce(n, 5), 20))
        for update skip locked)
    returning r.id, r.cohort_id, r.kind, r.payload
  )
  select t.id, t.cohort_id, t.kind, t.payload,
         jsonb_build_object('id', c.id, 'slug', c.slug, 'title', c.title, 'starts_on', c.starts_on,
                            'weeks', c.weeks, 'session_weekday', c.session_weekday, 'session_time', c.session_time,
                            'session_minutes', c.session_minutes, 'time_zone', c.time_zone, 'status', c.status),
         coalesce((select array_agg(cc.email order by cc.email) from public.calendar_contacts cc
                    join public.enrollments e on e.cohort_id = cc.cohort_id and e.user_id = cc.user_id and e.status <> 'left'
                   where cc.cohort_id = t.cohort_id), '{}'),
         coalesce((select array_agg(cc.email order by cc.email) from public.calendar_contacts cc
                    join public.cohort_teachers ct on ct.cohort_id = cc.cohort_id and ct.user_id = cc.user_id
                   where cc.cohort_id = t.cohort_id), '{}'),
         coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'name', g.name,
                     'emails', coalesce((select jsonb_agg(cc.email order by cc.email) from public.group_members gm
                                           join public.calendar_contacts cc on cc.cohort_id = g.cohort_id and cc.user_id = gm.user_id
                                          where gm.group_id = g.id), '[]'::jsonb)) order by g.name)
                    from public.groups g where g.cohort_id = t.cohort_id), '[]'::jsonb)
    from taken t join public.cohorts c on c.id = t.cohort_id;
end;
$$;

-- Report how a claimed request went. When it worked, the weekly Meet link
-- goes on every session of the cohort, and each group's room (found by
-- the key the script uses, the start of the group's id) on that group.
create function public.finish_setup_request(r uuid, ok boolean, detail text, meet_url text default null, rooms jsonb default null)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  c uuid;
begin
  update public.setup_requests q
     set state = case when ok then 'done' else 'failed' end,
         detail = left(finish_setup_request.detail, 1000),
         finished_at = now()
   where q.id = r and q.state = 'working'
  returning q.cohort_id into c;
  if c is null then return 'not working'; end if;
  if ok and meet_url ~ '^https://meet\.google\.com/[a-z0-9-]{3,40}$' then
    update public.sessions s set meet_url = finish_setup_request.meet_url where s.cohort_id = c;
  end if;
  if ok and jsonb_typeof(rooms) = 'object' then
    update public.groups g
       set meet_url = case when rooms -> keys.k ->> 'url' ~ '^https://meet\.google\.com/[a-z0-9-]{3,40}$' then rooms -> keys.k ->> 'url' else g.meet_url end,
           meet_space = case when rooms -> keys.k ->> 'space' ~ '^spaces/[A-Za-z0-9_-]{1,100}$' then rooms -> keys.k ->> 'space' else g.meet_space end
      from (select 'g-' || left(replace(g2.id::text, '-', ''), 8) as k, g2.id from public.groups g2 where g2.cohort_id = c) keys
     where g.id = keys.id and rooms ? keys.k;
  end if;
  return case when ok then 'done' else 'failed' end;
end;
$$;

revoke all on function public.claim_setup_requests(int), public.finish_setup_request(uuid, boolean, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.claim_setup_requests(int), public.finish_setup_request(uuid, boolean, text, text, jsonb) to service_role;
