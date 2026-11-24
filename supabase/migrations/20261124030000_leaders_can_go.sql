-- A leader can delete their account, and the cohort stays. Ben, November 24,
-- 2026: "A leader should be able to delete their account, but the cohort
-- should stay." Four references refused it outright (who made a cohort, issued
-- a credential, set a repository role, or invited a leader), and five more
-- would have taken the cohort's own things along: its exchanges with every
-- learner's video in them, its time poll (whose answers hold its invitations),
-- its question bank, its announcements, and the notes learners were told are
-- theirs. All of these now stay and only stop saying who.
--
-- What is the person's own still goes: polls, exchanges, and questions that
-- belong to no cohort, their times on a poll, and the feedback they wrote
-- (the privacy page's promise).
--
-- A cohort nobody else leads goes to the hub's longest-standing admin, so that
-- its learners are never left with a cohort no one can open.

-- Each reference empties instead of refusing or cascading.
do $do$
declare
  v text[];
  con record;
begin
  foreach v slice 1 in array array[
      ['cohorts', 'created_by'], ['credentials', 'issued_by'], ['repo_roles', 'set_by'], ['teachers', 'invited_by'],
      ['exchanges', 'created_by'], ['time_polls', 'created_by'], ['questions', 'owner_id'],
      ['cohort_announcements', 'author_id'], ['teacher_notes', 'author_id']] loop
    select c.conname, c.confrelid::regclass::text as parent into con
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
      where c.contype = 'f' and array_length(c.conkey, 1) = 1
        and c.conrelid = format('public.%I', v[1])::regclass and a.attname = v[2];
    if con.conname is null then raise exception 'no reference on %.%', v[1], v[2]; end if;
    execute format('alter table public.%I alter column %I drop not null', v[1], v[2]);
    execute format('alter table public.%I drop constraint %I', v[1], con.conname);
    execute format('alter table public.%I add constraint %I foreign key (%I) references %s (id) on delete set null', v[1], con.conname, v[2], con.parent);
  end loop;
end
$do$;

-- The columns a deletion may empty (20261124020000), with these added.
create or replace function private.only_forgets(was jsonb, now_is jsonb) returns boolean
language sql stable security definer set search_path = '' as $$
  with changed as (
    select o.key, o.value as old_value, now_is -> o.key as new_value
    from jsonb_each(was) o where now_is -> o.key is distinct from o.value
  )
  select exists (select 1 from changed) and not exists (
    select 1 from changed c
    where c.key not in ('created_by', 'updated_by', 'saved_by', 'presenter', 'via_guest', 'issued_by', 'set_by', 'invited_by', 'owner_id', 'author_id')
      or jsonb_typeof(c.new_value) is distinct from 'null'
      or exists (select 1 from auth.users u where u.id::text = c.old_value #>> '{}'));
$$;

do $do$
declare
  f text;
  was text;
  made text;
begin
  foreach f in array array['exchange_rules', 'time_poll_rules', 'question_rules', 'cohort_announcement_rules', 'keep_note_identity', 'guard_credential'] loop
    was := pg_get_functiondef(format('private.%I()', f)::regprocedure);
    made := regexp_replace(was, E'\nbegin\n',
      E'\nbegin\n  if tg_op = ''UPDATE'' then\n    if private.only_forgets(to_jsonb(old), to_jsonb(new)) then return new; end if;\n  end if;\n');
    if made = was then raise exception 'private.% was not changed', f; end if;
    execute made;
  end loop;

  -- What reads a maker reads on without one.
  was := pg_get_functiondef('public.exchange(text)'::regprocedure);
  made := regexp_replace(was, 'from public\.profiles mk\s+left join public\.cohorts c on c\.id = e\.cohort_id\s+where mk\.id = e\.created_by',
    'from (select 1) one left join public.profiles mk on mk.id = e.created_by left join public.cohorts c on c.id = e.cohort_id');
  if made = was then raise exception 'exchange was not changed'; end if;
  made := replace(made, 'private.person_name(mk)', $x$case when mk.id is null then 'A leader' else private.person_name(mk) end$x$);
  execute made;

  was := pg_get_functiondef((select oid from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cohort_exchanges'));
  made := replace(was, 'join public.profiles mk on mk.id = e.created_by', 'left join public.profiles mk on mk.id = e.created_by');
  if made = was then raise exception 'cohort_exchanges was not changed'; end if;
  made := replace(made, 'private.person_name(mk)', $x$case when mk.id is null then 'A leader' else private.person_name(mk) end$x$);
  execute made;

  was := pg_get_functiondef((select oid from pg_proc where pronamespace = 'private'::regnamespace and proname = 'notice_exchange_counts'));
  made := replace(was, 'f.created_by <> person', 'f.created_by is distinct from person');
  if made = was then raise exception 'notice_exchange_counts was not changed'; end if;
  execute made;

  was := pg_get_functiondef((select oid from pg_proc where pronamespace = 'public'::regnamespace and proname = 'reminder_events'));
  made := replace(was, 'mine.author_id <> x.created_by', 'mine.author_id is distinct from x.created_by');
  if made = was then raise exception 'reminder_events was not changed'; end if;
  made := replace(made, 'n.author_id <> n.student_id', 'n.author_id is distinct from n.student_id');
  execute made;

  was := pg_get_functiondef('public.time_poll(text)'::regprocedure);
  made := replace(was, 'join public.profiles pr on pr.id = p.created_by', 'left join public.profiles pr on pr.id = p.created_by');
  if made = was then raise exception 'time_poll was not changed'; end if;
  made := replace(made, 'pr.github_login)', $x$pr.github_login, 'A leader')$x$);
  execute made;
end
$do$;

create or replace function private.time_poll_host_name() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.host_name is distinct from old.host_name then
    update public.time_poll_answers a
    set name = coalesce(nullif(btrim(new.host_name), ''), (
      select coalesce(nullif(btrim(pr.display_name), ''), pr.github_login) from public.profiles pr where pr.id = new.created_by), 'A leader')
    where a.poll_id = new.id and a.host;
  end if;
  return new;
end;
$$;

-- Before an account goes: what is only theirs goes with it, and a cohort
-- nobody else leads gets a leader.
create function private.leader_goes() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  next_leader uuid;
begin
  delete from public.exchanges e where e.created_by = old.id
    and not exists (select 1 from public.cohort_teachers t where t.cohort_id = e.cohort_id and t.user_id = old.id)
    and not exists (select 1 from public.cohorts c where c.id = e.cohort_id and c.created_by = old.id);
  delete from public.time_poll_answers a using public.time_polls p where p.id = a.poll_id and p.created_by = old.id and a.host;
  delete from public.time_polls where created_by = old.id and cohort_id is null;
  update public.time_polls set host_name = null where created_by = old.id and host_name is not null;
  delete from public.questions where owner_id = old.id and cohort_id is null;

  select t.user_id into next_leader from public.teachers t
    where t.can_admin and t.user_id <> old.id order by t.created_at, t.user_id limit 1;
  if next_leader is not null then
    insert into public.cohort_teachers (cohort_id, user_id)
    select c.id, next_leader from public.cohorts c
    where (c.created_by = old.id or exists (select 1 from public.cohort_teachers t where t.cohort_id = c.id and t.user_id = old.id))
      and not exists (select 1 from public.cohort_teachers t where t.cohort_id = c.id and t.user_id <> old.id)
    on conflict do nothing;
  end if;
  return old;
end;
$$;
revoke all on function private.leader_goes() from public, anon, authenticated;

create trigger on_account_gone_leader_goes
  before delete on auth.users
  for each row execute function private.leader_goes();

-- Who made a cohort never changes by hand: a co-leader could have named
-- themselves the maker, and then removed the person who was.
create function private.cohort_keeps_maker() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.created_by is distinct from old.created_by and not private.only_forgets(to_jsonb(old), to_jsonb(new)) then
    raise exception 'A cohort keeps the person who made it.';
  end if;
  return new;
end;
$$;
revoke all on function private.cohort_keeps_maker() from public, anon, authenticated;

create trigger cohorts_keep_maker before update of created_by on public.cohorts
  for each row execute function private.cohort_keeps_maker();
