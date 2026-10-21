-- Running the hub (Ben, October 21, 2026): "We should be able to have a
-- robust admin interface that can allow for me (as the administrator) to
-- edit permissions without having to go into the database/auth system and
-- tools." Research: research/notes/navigation-and-wayfinding-notes.md,
-- "Running the hub".
--
-- A person's hub-wide rights are a few named ones, not a grid: teacher
-- (a row in public.teachers: may plan cohorts and polls), can_approve
-- (decides requests to teach), can_sign (signs credentials), and can_admin
-- (changes anyone's rights here). Only admin_set_right changes them, and
-- it writes every change to role_changes, which no one can edit. You can
-- never take away your own admin right, and the hub always keeps one
-- admin. Rights inside a cohort (its teachers, its people) stay with that
-- cohort's teachers, on its teaching page.

alter table public.teachers add column can_admin boolean not null default false;

update public.teachers set can_admin = true
  where user_id in (select id from public.profiles where lower(github_login) = 'bhwilkoff');

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.teachers where user_id = auth.uid() and can_admin);
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create table public.role_changes (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor       uuid references public.profiles (id) on delete set null,
  subject     uuid references public.profiles (id) on delete cascade,
  "right"     text not null check ("right" in ('teacher', 'can_approve', 'can_sign', 'can_admin')),
  before      boolean not null,
  after       boolean not null,
  note        text check (char_length(note) <= 500)
);
create index role_changes_subject on public.role_changes (subject, at desc);
alter table public.role_changes enable row level security;
revoke insert, update, delete on public.role_changes from public, anon, authenticated;

-- Admins read the whole log; everyone else reads only the changes to
-- their own rights.
create policy role_changes_read on public.role_changes for select to authenticated
  using (subject = auth.uid() or private.is_admin());

-- Everyone who has signed in, found by GitHub name or display name, with
-- their rights and how many cohorts they teach or are in. Admins only.
create function public.admin_people(q text default null)
returns table (id uuid, github_login text, display_name text, avatar_url text, created_at timestamptz,
               teacher boolean, can_approve boolean, can_sign boolean, can_admin boolean,
               teaching integer, enrolled integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.not_an_agent() or not private.is_admin() then
    raise exception 'Only an admin of the hub can see everyone.';
  end if;
  return query
  select p.id, p.github_login, p.display_name, p.avatar_url, p.created_at,
         t.user_id is not null, coalesce(t.can_approve, false), coalesce(t.can_sign, false), coalesce(t.can_admin, false),
         (select count(*)::integer from public.cohort_teachers ct where ct.user_id = p.id),
         (select count(*)::integer from public.enrollments e where e.user_id = p.id and e.status <> 'left')
  from public.profiles p
  left join public.teachers t on t.user_id = p.id
  where q is null or btrim(q) = ''
     or p.github_login ilike '%' || btrim(q) || '%'
     or p.display_name ilike '%' || btrim(q) || '%'
  order by coalesce(t.can_admin, false) desc, (t.user_id is not null) desc, lower(coalesce(p.display_name, p.github_login, ''))
  limit 200;
end;
$$;
revoke all on function public.admin_people(text) from public, anon;
grant execute on function public.admin_people(text) to authenticated;

-- One person: their rights, their cohorts and their role in each, a
-- waiting request to teach if they have one, and the changes to their
-- rights, newest first.
create function private.person_rights(u uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  out jsonb;
begin
  select jsonb_build_object(
    'id', p.id, 'github_login', p.github_login, 'display_name', p.display_name, 'avatar_url', p.avatar_url,
    'created_at', p.created_at,
    'teacher', t.user_id is not null, 'can_approve', coalesce(t.can_approve, false),
    'can_sign', coalesce(t.can_sign, false), 'can_admin', coalesce(t.can_admin, false),
    'cohorts', coalesce((
      select jsonb_agg(x order by x->>'title') from (
        select jsonb_build_object('id', c.id, 'slug', c.slug, 'title', c.title, 'status', c.status, 'role', 'teacher') x
          from public.cohort_teachers ct join public.cohorts c on c.id = ct.cohort_id where ct.user_id = p.id
        union all
        select jsonb_build_object('id', c.id, 'slug', c.slug, 'title', c.title, 'status', c.status, 'role', e.role::text, 'member_status', e.status::text)
          from public.enrollments e join public.cohorts c on c.id = e.cohort_id where e.user_id = p.id
      ) s), '[]'::jsonb),
    'request', (select jsonb_build_object('state', r.state, 'why', r.why, 'created_at', r.created_at)
                  from public.teacher_requests r where r.user_id = p.id),
    'changes', coalesce((
      select jsonb_agg(jsonb_build_object('at', rc.at, 'right', rc."right", 'before', rc.before, 'after', rc.after, 'note', rc.note,
               'actor', coalesce(nullif(btrim(a.display_name), ''), a.github_login)) order by rc.at desc)
        from public.role_changes rc left join public.profiles a on a.id = rc.actor where rc.subject = p.id), '[]'::jsonb)
  ) into out
  from public.profiles p left join public.teachers t on t.user_id = p.id
  where p.id = u;
  return out;
end;
$$;
revoke all on function private.person_rights(uuid) from public, anon, authenticated;

create function public.admin_person(u uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.not_an_agent() or not private.is_admin() then
    raise exception 'Only an admin of the hub can see this.';
  end if;
  return private.person_rights(u);
end;
$$;
revoke all on function public.admin_person(uuid) from public, anon;
grant execute on function public.admin_person(uuid) to authenticated;

-- The only way a hub-wide right changes. Granting approve, sign, or admin
-- to someone who does not teach makes them a teacher too; taking away
-- teacher takes the others with it. Each change is logged.
create function public.admin_set_right(u uuid, which text, value boolean, note text default null)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  t public.teachers;
  admins integer;
  was boolean;
begin
  if not private.not_an_agent() then
    raise exception 'Changing who may do what is done by a person, on humanshaped.org.';
  end if;
  if not private.is_admin() then
    raise exception 'Only an admin of the hub can change rights.';
  end if;
  if which not in ('teacher', 'can_approve', 'can_sign', 'can_admin') then
    raise exception 'There is no right called %.', which;
  end if;
  if note is not null and char_length(note) > 500 then
    raise exception 'The note is longer than 500 characters.';
  end if;
  if not exists (select 1 from public.profiles where id = u) then
    raise exception 'There is no one with that account.';
  end if;
  -- Every admin row is locked while this runs, so two admins removing
  -- each other at once cannot leave the hub with none.
  perform 1 from public.teachers where can_admin for update;
  select * into t from public.teachers where user_id = u for update;
  if u = auth.uid() and not value and which in ('teacher', 'can_admin') then
    raise exception 'You cannot take away your own admin right. Another admin can.';
  end if;
  if not value and (which = 'can_admin' or which = 'teacher') and coalesce(t.can_admin, false) then
    select count(*) into admins from public.teachers where can_admin;
    if admins <= 1 then
      raise exception 'The hub needs at least one admin, so make someone else an admin first.';
    end if;
  end if;

  if which = 'teacher' then
    was := t.user_id is not null;
    if value and not was then
      insert into public.teachers (user_id, invited_by) values (u, auth.uid());
      update public.teacher_requests set state = 'approved', decided_by = auth.uid(), decided_at = now(), updated_at = now()
        where user_id = u and state = 'waiting';
    elsif not value and was then
      if t.can_approve then insert into public.role_changes (actor, subject, "right", before, after, note) values (auth.uid(), u, 'can_approve', true, false, note); end if;
      if t.can_sign then insert into public.role_changes (actor, subject, "right", before, after, note) values (auth.uid(), u, 'can_sign', true, false, note); end if;
      if t.can_admin then insert into public.role_changes (actor, subject, "right", before, after, note) values (auth.uid(), u, 'can_admin', true, false, note); end if;
      delete from public.teachers where user_id = u;
    end if;
  else
    was := case which when 'can_approve' then coalesce(t.can_approve, false)
                      when 'can_sign' then coalesce(t.can_sign, false)
                      else coalesce(t.can_admin, false) end;
    if value and t.user_id is null then
      insert into public.teachers (user_id, invited_by) values (u, auth.uid());
      insert into public.role_changes (actor, subject, "right", before, after, note) values (auth.uid(), u, 'teacher', false, true, note);
      update public.teacher_requests set state = 'approved', decided_by = auth.uid(), decided_at = now(), updated_at = now()
        where user_id = u and state = 'waiting';
    end if;
    if was is distinct from value and (value or t.user_id is not null) then
      update public.teachers
         set can_approve = case when which = 'can_approve' then value else can_approve end,
             can_sign = case when which = 'can_sign' then value else can_sign end,
             can_admin = case when which = 'can_admin' then value else can_admin end
       where user_id = u;
    end if;
  end if;
  if was is distinct from value then
    insert into public.role_changes (actor, subject, "right", before, after, note) values (auth.uid(), u, which, was, value, nullif(btrim(note), ''));
  end if;
  return private.person_rights(u);
end;
$$;
revoke all on function public.admin_set_right(uuid, text, boolean, text) from public, anon;
grant execute on function public.admin_set_right(uuid, text, boolean, text) to authenticated;

-- The whole log, newest first, with names. Admins only.
create function public.admin_changes(lim integer default 200) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.not_an_agent() or not private.is_admin() then
    raise exception 'Only an admin of the hub can read the log.';
  end if;
  return coalesce((
    select jsonb_agg(x) from (
      select jsonb_build_object('at', rc.at, 'right', rc."right", 'before', rc.before, 'after', rc.after, 'note', rc.note,
               'subject', rc.subject, 'subject_name', coalesce(nullif(btrim(s.display_name), ''), s.github_login),
               'actor_name', coalesce(nullif(btrim(a.display_name), ''), a.github_login)) x
        from public.role_changes rc
        left join public.profiles s on s.id = rc.subject
        left join public.profiles a on a.id = rc.actor
       order by rc.at desc, rc.id desc
       limit least(greatest(coalesce(lim, 200), 1), 1000)
    ) q), '[]'::jsonb);
end;
$$;
revoke all on function public.admin_changes(integer) from public, anon;
grant execute on function public.admin_changes(integer) to authenticated;
