-- Finding a weekly time (Ben, October 9, 2026): "a page that allows for a
-- cohort teacher to create a page for the potential participants to
-- weigh in on the best time/day for such an ongoing meeting. The page
-- should be accessible and usable for people who are not logged in and
-- do not yet have an account... security by obscurity (obscure URL that
-- doesn't get listed anywhere)."
--
-- A teacher makes a poll of weekly times (days, a window of the day, a
-- step) in a time zone. A time is one integer: weekday * 1440 + minutes
-- after midnight, in the poll's own zone, so it means the same thing every
-- week. Anyone holding the poll's token (122 random bits, carried after
-- the # so it never reaches a server log) can read the poll and answer it
-- without an account; each answer has its own secret, kept by the
-- answerer's browser, so they can change or take back their answer.
--
-- Those without an account never touch the tables. They call the four
-- functions below, which check the token themselves. Only the poll's
-- teacher (and the teachers of the cohort it is for) see names and
-- addresses; anyone who has answered sees how many can make each time.

create table public.time_polls (
  id              uuid primary key default gen_random_uuid(),
  token           text not null unique default replace(gen_random_uuid()::text, '-', ''),
  created_by      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  cohort_id       uuid references public.cohorts (id) on delete set null,
  title           text not null check (char_length(title) between 1 and 120),
  note            text check (char_length(note) <= 1500),
  time_zone       text not null check (char_length(time_zone) between 1 and 64),
  days            smallint[] not null check (cardinality(days) between 1 and 7 and days <@ array[0,1,2,3,4,5,6]::smallint[]),
  first_minute    smallint not null check (first_minute between 0 and 1439),
  last_minute     smallint not null check (last_minute between 0 and 1439),
  step_minutes    smallint not null default 30 check (step_minutes in (15, 30, 60)),
  session_minutes smallint not null default 75 check (session_minutes between 15 and 240),
  starts_on       date,
  open            boolean not null default true,
  created_at      timestamptz not null default now(),
  check (last_minute >= first_minute),
  check ((last_minute - first_minute) % step_minutes = 0),
  check ((last_minute - first_minute) / step_minutes < 96)
);

create table public.time_poll_answers (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid not null references public.time_polls (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  contact     text check (char_length(contact) <= 254),
  comment     text check (char_length(comment) <= 1000),
  works       integer[] not null default '{}',
  if_need_be  integer[] not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index time_poll_answers_poll on public.time_poll_answers (poll_id);

-- Each answer's secret lives out of the API's reach, so not even the
-- poll's teacher can read it and change someone's answer as them.
create table private.time_poll_secrets (
  answer_id uuid primary key references public.time_poll_answers (id) on delete cascade,
  secret    uuid not null default gen_random_uuid()
);
revoke all on private.time_poll_secrets from public, anon, authenticated;

alter table public.time_polls enable row level security;
alter table public.time_poll_answers enable row level security;

create function private.owns_time_poll(p uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.time_polls t
    where t.id = p and (t.created_by = auth.uid() or (t.cohort_id is not null and private.teaches(t.cohort_id)))
  );
$$;
revoke all on function private.owns_time_poll(uuid) from public, anon;
grant execute on function private.owns_time_poll(uuid) to authenticated;

create policy teachers_make_polls on public.time_polls for insert to authenticated
  with check (created_by = auth.uid() and private.is_hub_teacher() and private.not_an_agent()
              and (cohort_id is null or private.teaches(cohort_id)));
create policy teachers_see_their_polls on public.time_polls for select to authenticated
  using (created_by = auth.uid() or (cohort_id is not null and private.teaches(cohort_id)));
create policy teachers_change_their_polls on public.time_polls for update to authenticated
  using ((created_by = auth.uid() or (cohort_id is not null and private.teaches(cohort_id))) and private.not_an_agent())
  with check (private.not_an_agent() and (cohort_id is null or private.teaches(cohort_id)));
create policy makers_delete_their_polls on public.time_polls for delete to authenticated
  using (created_by = auth.uid() and private.not_an_agent());

-- Names and addresses are for the poll's teachers only. No one writes an
-- answer to the table directly; answer_time_poll does.
create policy teachers_see_answers on public.time_poll_answers for select to authenticated
  using (private.owns_time_poll(poll_id));
create policy teachers_remove_answers on public.time_poll_answers for delete to authenticated
  using (private.owns_time_poll(poll_id) and private.not_an_agent());

-- The token and who made a poll never change once it exists.
create function private.time_poll_rules() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.token is distinct from old.token or new.created_by is distinct from old.created_by then
    raise exception 'A poll keeps its link and its maker.';
  end if;
  return new;
end;
$$;
revoke all on function private.time_poll_rules() from public, anon, authenticated;
create trigger time_polls_rules before update on public.time_polls
  for each row execute function private.time_poll_rules();

create function private.time_poll_by_token(t text) returns public.time_polls
language sql stable security definer set search_path = '' as $$
  select * from public.time_polls where token = t and char_length(t) = 32;
$$;
revoke all on function private.time_poll_by_token(text) from public, anon, authenticated;

-- Every time the answer names must be a time the poll offers.
create function private.time_poll_slots_ok(p public.time_polls, slots integer[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(bool_and(
    s >= 0 and (s / 1440)::smallint = any (p.days)
    and s % 1440 between p.first_minute and p.last_minute
    and (s % 1440 - p.first_minute) % p.step_minutes = 0
  ), true)
  from unnest(slots) s;
$$;
revoke all on function private.time_poll_slots_ok(public.time_polls, integer[]) from public, anon, authenticated;

create function private.time_poll_tally(p uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'answers', (select count(*) from public.time_poll_answers where poll_id = p),
    'works', coalesce((select jsonb_object_agg(s, n) from (
      select s, count(*) n from public.time_poll_answers a, unnest(a.works) s where a.poll_id = p group by s) w), '{}'::jsonb),
    'if_need_be', coalesce((select jsonb_object_agg(s, n) from (
      select s, count(*) n from public.time_poll_answers a, unnest(a.if_need_be) s where a.poll_id = p group by s) m), '{}'::jsonb)
  );
$$;
revoke all on function private.time_poll_tally(uuid) from public, anon, authenticated;

-- What anyone with the link reads: the poll itself, and the teacher's name.
create function public.time_poll(t text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'title', p.title, 'note', p.note, 'time_zone', p.time_zone, 'days', p.days,
    'first_minute', p.first_minute, 'last_minute', p.last_minute, 'step_minutes', p.step_minutes,
    'session_minutes', p.session_minutes, 'starts_on', p.starts_on, 'open', p.open,
    'teacher', coalesce(nullif(btrim(pr.display_name), ''), pr.github_login)
  )
  from private.time_poll_by_token(t) p
  join public.profiles pr on pr.id = p.created_by
  where p.id is not null;
$$;

-- A person's own answer, with the poll's counts, read back with their
-- answer's secret. Counts are shown only to someone who has answered, so
-- no one's first choice leans on everyone else's.
create function public.my_time_poll_answer(t text, answer uuid, secret uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', a.id, 'name', a.name, 'contact', a.contact, 'comment', a.comment,
    'works', a.works, 'if_need_be', a.if_need_be, 'tally', private.time_poll_tally(p.id)
  )
  from private.time_poll_by_token(t) p
  join public.time_poll_answers a on a.poll_id = p.id
  join private.time_poll_secrets k on k.answer_id = a.id
  where a.id = answer and k.secret = my_time_poll_answer.secret;
$$;

-- Answer, or change an answer (with its id and secret). Returns the id and
-- secret the browser keeps.
create function public.answer_time_poll(
  t text, name text, works integer[], if_need_be integer[] default '{}',
  contact text default null, comment text default null,
  answer uuid default null, secret uuid default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  p public.time_polls;
  saved uuid;
  kept uuid;
  w integer[] := coalesce((select array_agg(distinct s order by s) from unnest(works) s), '{}');
  m integer[] := coalesce((select array_agg(distinct s order by s) from unnest(if_need_be) s where not s = any (coalesce(works, '{}'))), '{}');
begin
  if not private.not_an_agent() then
    raise exception 'An agent cannot answer for a person.';
  end if;
  p := private.time_poll_by_token(t);
  if p.id is null then
    raise exception 'There is no poll at this link.';
  end if;
  if not p.open then
    raise exception 'This poll has closed.';
  end if;
  if char_length(btrim(coalesce(name, ''))) = 0 then
    raise exception 'Add your name, so the teacher knows who can come.';
  end if;
  if cardinality(w) + cardinality(m) > 700 or not private.time_poll_slots_ok(p, w) or not private.time_poll_slots_ok(p, m) then
    raise exception 'One of those times is not in this poll.';
  end if;
  if answer is null then
    if (select count(*) from public.time_poll_answers where poll_id = p.id) >= 300 then
      raise exception 'This poll already has as many answers as it can take.';
    end if;
    insert into public.time_poll_answers (poll_id, name, contact, comment, works, if_need_be)
    values (p.id, btrim(name), nullif(btrim(contact), ''), nullif(btrim(comment), ''), w, m)
    returning id into saved;
    insert into private.time_poll_secrets (answer_id) values (saved) returning time_poll_secrets.secret into kept;
  else
    update public.time_poll_answers a
    set name = btrim(answer_time_poll.name), contact = nullif(btrim(answer_time_poll.contact), ''),
        comment = nullif(btrim(answer_time_poll.comment), ''), works = w, if_need_be = m, updated_at = now()
    where a.id = answer and a.poll_id = p.id
      and exists (select 1 from private.time_poll_secrets k where k.answer_id = a.id and k.secret = answer_time_poll.secret)
    returning a.id into saved;
    if saved is null then
      raise exception 'That answer could not be found to change.';
    end if;
    kept := secret;
  end if;
  return jsonb_build_object('id', saved, 'secret', kept);
end;
$$;

create function public.withdraw_time_poll_answer(t text, answer uuid, secret uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  p public.time_polls;
begin
  if not private.not_an_agent() then
    raise exception 'An agent cannot answer for a person.';
  end if;
  p := private.time_poll_by_token(t);
  delete from public.time_poll_answers a
  where a.id = answer and a.poll_id = p.id
    and exists (select 1 from private.time_poll_secrets k where k.answer_id = a.id and k.secret = withdraw_time_poll_answer.secret);
  return found;
end;
$$;

revoke all on function public.time_poll(text), public.my_time_poll_answer(text, uuid, uuid),
  public.answer_time_poll(text, text, integer[], integer[], text, text, uuid, uuid),
  public.withdraw_time_poll_answer(text, uuid, uuid) from public;
grant execute on function public.time_poll(text), public.my_time_poll_answer(text, uuid, uuid),
  public.answer_time_poll(text, text, integer[], integer[], text, text, uuid, uuid),
  public.withdraw_time_poll_answer(text, uuid, uuid) to anon, authenticated;

